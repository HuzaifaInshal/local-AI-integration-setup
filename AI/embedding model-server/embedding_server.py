import os
import tempfile
import uuid
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

# In-memory storage for asynchronous PDF parsing tasks
tasks_store = {}

def process_pdf_in_background(task_id: str, tmp_path: str, company: str, year: int, server_instance):
    try:
        print(f"[{task_id}] Starting background parsing on GPU...")
        # 1. Parse PDF layout via Docling
        result = server_instance.doc_converter.convert(tmp_path)
        doc = result.document

        # 2. Chunking with Hybrid Chunker
        chunk_list = list(server_instance.chunker.chunk(dl_doc=doc))

        chunks = []
        for chunk in chunk_list:
            pages = sorted({
                prov.page_no 
                for item in chunk.meta.doc_items 
                for prov in item.prov 
                if hasattr(prov, "page_no")
            })
            page_number = pages[0] if pages else 1
            section_path = " > ".join(chunk.meta.headings) if chunk.meta.headings else "General"
            context_text = server_instance.chunker.contextualize(chunk)
            
            chunks.append({
                "text": context_text,
                "page_number": page_number,
                "section": section_path
            })

        if not chunks:
            tasks_store[task_id] = {"status": "completed", "chunks": []}
            return

        # 3. Generate embeddings on GPU
        print(f"[{task_id}] Generating embeddings for {len(chunks)} chunks...")
        texts_to_embed = [
            f"search_document: [Company: {company} | Year: {year}] {c['text']}"
            for c in chunks
        ]
        
        batch_size = 32
        all_embeddings = []
        for i in range(0, len(texts_to_embed), batch_size):
            batch = texts_to_embed[i:i+batch_size]
            all_embeddings.extend(server_instance.get_embeddings(batch))

        # 4. Combine embeddings with text payloads
        output_chunks = []
        for chunk, embedding in zip(chunks, all_embeddings):
            output_chunks.append({
                "text": chunk["text"],
                "page_number": chunk["page_number"],
                "section": chunk["section"],
                "embedding": embedding
            })

        tasks_store[task_id] = {
            "status": "completed",
            "chunks": output_chunks
        }
        print(f"[{task_id}] Background parsing completed successfully.")
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        print(f"[{task_id}] Error in background task:\n{err_msg}")
        tasks_store[task_id] = {
            "status": "failed",
            "error_message": str(e)
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

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
        from docling.datamodel.pipeline_options import PdfPipelineOptions, RapidOcrOptions
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
        
        # Explicitly configure RapidOCR to use the Torch backend so it utilizes the CUDA GPU
        pipeline_options.ocr_options = RapidOcrOptions(backend="torch")
        
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
        from fastapi import FastAPI, UploadFile, Form, File, BackgroundTasks
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

        @web_app.post("/parse-pdf-async")
        async def parse_pdf_async(
            background_tasks: BackgroundTasks,
            file: UploadFile = File(...),
            company: str = Form(...),
            year: int = Form(...)
        ):
            try:
                task_id = str(uuid.uuid4())
                tasks_store[task_id] = {"status": "processing"}
                
                # Save uploaded file to a temporary file
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    content = await file.read()
                    tmp.write(content)
                    tmp_path = tmp.name

                # Dispatch background execution
                background_tasks.add_task(
                    process_pdf_in_background,
                    task_id,
                    tmp_path,
                    company,
                    year,
                    self
                )
                
                return {
                    "success": True,
                    "task_id": task_id
                }
            except Exception as e:
                return {
                    "success": False,
                    "task_id": "",
                    "error_message": str(e)
                }

        @web_app.get("/parse-status/{task_id}")
        def get_parse_status(task_id: str):
            status = tasks_store.get(task_id)
            if not status:
                return {"status": "not_found"}
            return status

        return web_app
