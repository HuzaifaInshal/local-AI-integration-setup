import os
from pydantic import BaseModel
import modal

app = modal.App("reranker-server")

# Define container image with dependencies and cached model weights
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "transformers",
        "accelerate",
        "torch",
        "fastapi",
        "pydantic",
        "hf-transfer"
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    # Pre-download the model weights during Docker build step to eliminate cold-start loading time
    .run_commands(
        "python -c 'from huggingface_hub import snapshot_download; snapshot_download(\"BAAI/bge-reranker-large\")'"
    )
)

MODEL_NAME = "BAAI/bge-reranker-large"

class RerankRequest(BaseModel):
    query: str
    documents: list[str]

class RerankResultItem(BaseModel):
    index: int
    score: float

class RerankResponse(BaseModel):
    success: bool
    results: list[RerankResultItem]
    error_message: str

@app.cls(gpu="t4", image=image, timeout=600)
class RerankerServer:
    @modal.enter()
    def load_model(self):
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        
        print("Loading tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        
        print("Loading cross-encoder model...")
        self.model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        self.model.eval()
        print("Reranker model loaded successfully.")

    def compute_scores(self, query: str, documents: list[str]) -> list[dict]:
        import torch
        
        # Cross-encoders expect input in pairs: [[query, doc1], [query, doc2], ...]
        pairs = [[query, doc] for doc in documents]
        
        features = self.tokenizer(
            pairs,
            padding=True,
            truncation=True,
            return_tensors="pt"
        ).to(self.model.device)
        
        with torch.no_grad():
            outputs = self.model(**features)
            # The score is in the logits (index 0)
            scores = outputs.logits.view(-1).float().cpu().tolist()
            
        # Map scores to indices and sort descending
        results = [
            {"index": idx, "score": float(score)}
            for idx, score in enumerate(scores)
        ]
        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    @modal.asgi_app()
    def entrypoint(self):
        from fastapi import FastAPI
        web_app = FastAPI(title="BGE Reranker API")

        @web_app.get("/")
        def root():
            return {
                "status": "running",
                "model": MODEL_NAME
            }

        @web_app.post("/rerank")
        def rerank(req: RerankRequest):
            try:
                results = self.compute_scores(req.query, req.documents)
                return RerankResponse(
                    success=True,
                    results=[RerankResultItem(**item) for item in results],
                    error_message=""
                )
            except Exception as e:
                return RerankResponse(
                    success=False,
                    results=[],
                    error_message=str(e)
                )

        return web_app
