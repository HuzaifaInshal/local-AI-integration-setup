import os
from pydantic import BaseModel
import modal

app = modal.App("embedding-server")

# Define container image with dependencies and pre-cached model weights
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "transformers",
        "accelerate",
        "torch",
        "fastapi",
        "pydantic",
        "hf-transfer",
        "sentencepiece",
        "einops"  # Required for Nomic models
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    # Pre-download the model weights during Docker build step to eliminate cold-start loading time
    .run_commands(
        "python -c 'from huggingface_hub import snapshot_download; snapshot_download(\"nomic-ai/nomic-embed-text-v1.5\")'"
    )
)

MODEL_NAME = "nomic-ai/nomic-embed-text-v1.5"

class EmbedRequest(BaseModel):
    texts: list[str]

class EmbedResponse(BaseModel):
    success: bool
    embeddings: list[list[float]]
    error_message: str

@app.cls(gpu="t4", image=image, timeout=600)
class EmbeddingServer:
    @modal.enter()
    def load_model(self):
        from transformers import AutoTokenizer, AutoModel
        
        print("Loading tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
        
        print("Loading model...")
        self.model = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True)
        self.model.eval()
        print("Embedding model loaded successfully.")

    def mean_pooling(self, model_output, attention_mask):
        import torch
        token_embeddings = model_output[0]
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        import torch
        import torch.nn.functional as F
        
        encoded_input = self.tokenizer(texts, padding=True, truncation=True, return_tensors='pt').to(self.model.device)
        
        with torch.no_grad():
            model_output = self.model(**encoded_input)
            
        embeddings = self.mean_pooling(model_output, encoded_input['attention_mask'])
        embeddings = F.normalize(embeddings, p=2, dim=1)
        
        return embeddings.tolist()

    @modal.asgi_app()
    def entrypoint(self):
        from fastapi import FastAPI
        web_app = FastAPI(title="Nomic Embedding API")

        @web_app.get("/")
        def root():
            return {
                "status": "running",
                "model": MODEL_NAME
            }

        @web_app.post("/embed")
        def embed(req: EmbedRequest):
            try:
                embeddings = self.get_embeddings(req.texts)
                return EmbedResponse(
                    success=True,
                    embeddings=embeddings,
                    error_message=""
                )
            except Exception as e:
                return EmbedResponse(
                    success=False,
                    embeddings=[],
                    error_message=str(e)
                )

        return web_app
