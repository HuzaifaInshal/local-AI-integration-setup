import os
from pydantic import BaseModel
import modal

# Create Modal App
app = modal.App("qwen-coder-7b-server")

# Define container image with dependencies and pre-cached model weights
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "transformers",
        "accelerate",
        "bitsandbytes",
        "torch",
        "sentencepiece",
        "fastapi",
        "pydantic",
        "hf-transfer"
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    # Pre-download the model weights during Docker build step to eliminate cold-start loading time
    .run_commands(
        "python -c 'from huggingface_hub import snapshot_download; snapshot_download(\"Qwen/Qwen2.5-Coder-7B-Instruct\")'"
    )
)

MODEL_NAME = "Qwen/Qwen2.5-Coder-7B-Instruct"

# Input/Output Schema Definition
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    messages: list[ChatMessage]
    temperature: float = 0.0
    max_new_tokens: int = 512

class ChatCompletionResponse(BaseModel):
    success: bool
    response: str
    error_message: str


@app.cls(gpu="t4", image=image, timeout=600)
class ModelServer:
    @modal.enter()
    def load_model(self):
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
        
        print("Loading tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        
        print("Loading model in 4-bit...")
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )
        self.model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME,
            device_map="auto",
            quantization_config=bnb_config,
        )
        self.model.eval()
        print("Model loaded successfully.")

    def generate_chat_internal(self, messages, temperature=0.0, max_new_tokens=512):
        import torch
        
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        inputs = self.tokenizer(
            text,
            return_tensors="pt"
        ).to(self.model.device)
        
        do_sample = temperature > 0.0
        gen_kwargs = {
            "max_new_tokens": max_new_tokens,
        }
        if do_sample:
            gen_kwargs["do_sample"] = True
            gen_kwargs["temperature"] = temperature
        else:
            gen_kwargs["do_sample"] = False
            
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                **gen_kwargs
            )
            
        response = self.tokenizer.decode(
            outputs[0][inputs.input_ids.shape[1]:],
            skip_special_tokens=True
        )
        return response

    @modal.asgi_app()
    def entrypoint(self):
        from fastapi import FastAPI
        web_app = FastAPI(title="Qwen Coder 7B API")

        @web_app.get("/")
        def root():
            return {
                "status": "running",
                "model": MODEL_NAME
            }

        @web_app.post("/generate")
        def generate(req: ChatCompletionRequest):
            try:
                result = self.generate_chat_internal(
                    messages=[{"role": m.role, "content": m.content} for m in req.messages],
                    temperature=req.temperature,
                    max_new_tokens=req.max_new_tokens
                )
                return ChatCompletionResponse(
                    success=True,
                    response=result,
                    error_message=""
                )
            except Exception as e:
                return ChatCompletionResponse(
                    success=False,
                    response="",
                    error_message=str(e)
                )

        return web_app
