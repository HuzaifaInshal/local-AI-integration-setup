import os
import tempfile
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
        "einops",  # Required for Nomic models
        "docling",  # Required for layout-aware PDF parsing in the cloud
        "python-multipart",  # Required to receive files in FastAPI
        "pandas",  # Required for docling tables
        "tabulate"  # Required for docling tables markdown serialization
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    # Pre-download the nomic model weights during Docker build step to eliminate cold-start loading time
    .run_commands(
        "python -c 'from huggingface_hub import snapshot_download; snapshot_download(\"nomic-ai/nomic-embed-text-v1.5\")'"
    )
    # Pre-download the docling models during Docker build step
    .run_commands(
        "python -c 'from docling.document_converter import DocumentConverter; DocumentConverter()'"
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
        from docling.document_converter import DocumentConverter, PdfFormatOption
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.datamodel.base_models import InputFormat
        from docling.chunking import HybridChunker
        import torch
        import logging

        # Configure logging for Modal container environment
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%H:%M:%S"
        )
        logging.getLogger("docling").setLevel(logging.DEBUG)
        logging.getLogger("docling.pipeline.base_pipeline").setLevel(logging.DEBUG)
        logging.getLogger("huggingface_hub").setLevel(logging.WARNING)

        print("Loading tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
        
        print("Loading model...")
        self.model = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True)
        self.model = self.model.to("cuda" if torch.cuda.is_available() else "cpu")
        self.model.eval()
        
        print("Configuring Docling PDF Converter with GPU...")
        pipeline_options = PdfPipelineOptions()
        pipeline_options.accelerator_options.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.doc_converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        
        # Initialize standard hybrid chunker
        self.chunker = HybridChunker(max_tokens=512)
        print("Embedding model and Docling pipeline loaded successfully.")

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
        from fastapi import FastAPI, UploadFile, Form, File
        web_app = FastAPI(title="Nomic Embedding & Docling API")

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

        @web_app.post("/parse-pdf")
        async def parse_pdf(
            file: UploadFile = File(...),
            company: str = Form(...),
            year: int = Form(...)
        ):
            try:
                # Save uploaded file to a temporary file
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    content = await file.read()
                    tmp.write(content)
                    tmp_path = tmp.name

                try:
                    print(f"Parsing PDF on GPU for {company} ({year})...")
                    # 1. Parse PDF layout via Docling
                    result = self.doc_converter.convert(tmp_path)
                    doc = result.document

                    # 2. Chunking with Hybrid Chunker
                    chunk_list = list(self.chunker.chunk(dl_doc=doc))

                    chunks = []
                    for chunk in chunk_list:
                        # Get page numbers
                        pages = sorted({
                            prov.page_no 
                            for item in chunk.meta.doc_items 
                            for prov in item.prov 
                            if hasattr(prov, "page_no")
                        })
                        page_number = pages[0] if pages else 1
                        
                        # Get section path
                        section_path = " > ".join(chunk.meta.headings) if chunk.meta.headings else "General"
                        
                        # Get contextualized text
                        context_text = self.chunker.contextualize(chunk)
                        
                        chunks.append({
                            "text": context_text,
                            "page_number": page_number,
                            "section": section_path
                        })

                    if not chunks:
                        return {"success": True, "chunks": []}

                    # 3. Generate embeddings on GPU
                    print(f"Generating embeddings for {len(chunks)} chunks...")
                    texts_to_embed = [
                        f"search_document: [Company: {company} | Year: {year}] {c['text']}"
                        for c in chunks
                    ]
                    
                    # Batch calls
                    batch_size = 32
                    all_embeddings = []
                    for i in range(0, len(texts_to_embed), batch_size):
                        batch = texts_to_embed[i:i+batch_size]
                        all_embeddings.extend(self.get_embeddings(batch))

                    # 4. Combine embeddings with text payloads
                    output_chunks = []
                    for chunk, embedding in zip(chunks, all_embeddings):
                        output_chunks.append({
                            "text": chunk["text"],
                            "page_number": chunk["page_number"],
                            "section": chunk["section"],
                            "embedding": embedding
                        })

                    return {
                        "success": True,
                        "chunks": output_chunks
                    }
                finally:
                    # Clean up temporary file
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)

            except Exception as e:
                import traceback
                print(traceback.format_exc())
                return {
                    "success": False,
                    "chunks": [],
                    "error_message": str(e)
                }

        return web_app
