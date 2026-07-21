import os
import re
import sys
import uuid
import requests
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from docling.document_converter import DocumentConverter

# Load environment variables
load_dotenv()

# Configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = "pdf_chunks"
# Nomic v1.5 embedding dimension is 768
EMBEDDING_DIMENSION = 768

# Fetch the AI Server URL (from Modal embedding server deploy, or fall back)
AI_SERVER_URL = os.getenv("AI_SERVER_URL", "http://localhost:8000")

def get_embedding(texts: list[str]) -> list[list[float]]:
    """Calls the remote Modal embedding server to generate vector embeddings."""
    url = f"{AI_SERVER_URL.rstrip('/')}/embed"
    try:
        response = requests.post(url, json={"texts": texts}, timeout=60)
        response.raise_for_status()
        data = response.json()
        if not data.get("success"):
            raise ValueError(f"Embedding server error: {data.get('error_message')}")
        return data["embeddings"]
    except Exception as e:
        print(f"❌ Failed to get embeddings from {url}. Error: {e}")
        print("Please ensure your Modal embedding server is running and AI_SERVER_URL is set correctly.")
        sys.exit(1)

def ingest_pdf(pdf_path: str, qdrant_client: QdrantClient):
    filename = os.path.basename(pdf_path)
    print(f"\nProcessing: {filename}")
    
    # Extract Company and Year from filename (Format: Company_Year_Name.pdf)
    match = re.match(r"^([^_]+)_([0-9]{4})_(.+)\.pdf$", filename)
    if not match:
        print(f"⚠️ Skipping '{filename}': Filename does not match '<Company>_<Year>_<Name>.pdf' format.")
        return
        
    company_name = match.group(1)
    year = int(match.group(2))
    print(f"🏢 Company: {company_name} | 📅 Year: {year}")
    
    # 1. Parse PDF using Docling
    print("Parsing layout with Docling...")
    converter = DocumentConverter()
    result = converter.convert(pdf_path)
    doc = result.document
    
    # 2. Extract Chunks with provenance (page numbers & headings)
    print("Chunking document sections...")
    chunks = []
    current_chunk_parts = []
    current_chunk_length = 0
    current_page = 1
    current_page_start = 1
    current_section = "General"
    
    for item, level in doc.iterate_items():
        # Get page number from provenance
        if item.prov:
            current_page = item.prov[0].page_no
            
        item_text = ""
        item_type = type(item).__name__
        
        if item_type == "HeadingItem":
            current_section = item.text
            item_text = f"\n### {item.text}\n"
        elif item_type == "TableItem":
            try:
                # Convert table structure to Markdown
                df = item.export_to_dataframe(doc=doc)
                item_text = "\n" + df.to_markdown(index=False) + "\n"
            except Exception:
                item_text = f"\n[Table]: {item.text}\n"
        else:
            item_text = item.text
            
        if not item_text:
            continue
            
        item_len = len(item_text)
        
        # Max chunk size ~3000 chars (~750 tokens)
        if current_chunk_length + item_len > 3000 and current_chunk_parts:
            chunk_text = "\n".join(current_chunk_parts)
            chunks.append({
                "text": chunk_text,
                "page_number": current_page_start,
                "section": current_section
            })
            current_chunk_parts = [item_text]
            current_chunk_length = item_len
            current_page_start = current_page
        else:
            current_chunk_parts.append(item_text)
            current_chunk_length += item_len
            if len(current_chunk_parts) == 1:
                current_page_start = current_page
                
    if current_chunk_parts:
        chunk_text = "\n".join(current_chunk_parts)
        chunks.append({
            "text": chunk_text,
            "page_number": current_page_start,
            "section": current_section
        })
        
    print(f"Generated {len(chunks)} chunks.")
    if not chunks:
        return

    # 3. Clean existing vectors for this specific document to prevent duplication (Idempotent run)
    print(f"Cleaning previous indexes for '{filename}'...")
    qdrant_client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="document_name",
                    match=MatchValue(value=filename)
                )
            ]
        )
    )

    # 4. Generate Embeddings & Batch Upsert
    print("Generating embeddings via server...")
    texts_to_embed = [
        f"search_document: [Company: {company_name} | Year: {year}] {c['text']}"
        for c in chunks
    ]
    
    # Process in batches of 16 to avoid payload size errors
    batch_size = 16
    embeddings = []
    for i in range(0, len(texts_to_embed), batch_size):
        batch = texts_to_embed[i:i+batch_size]
        print(f"  Embedding batch {i // batch_size + 1}/{(len(texts_to_embed) - 1) // batch_size + 1}...")
        embeddings.extend(get_embedding(batch))
        
    # 5. Upsert to Qdrant
    print("Upserting vectors to Qdrant...")
    points = []
    for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        payload = {
            "text": chunk["text"],
            "company": company_name,
            "year": year,
            "page_number": chunk["page_number"],
            "section": chunk["section"],
            "document_name": filename
        }
        points.append(
            PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload=payload
            )
        )
        
    qdrant_client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )
    print(f"✅ Successfully ingested {len(points)} vectors for {filename}.")

def main():
    storage_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Storage"))
    if not os.path.exists(storage_dir):
        print(f"❌ Storage directory not found at: {storage_dir}")
        sys.exit(1)
        
    print(f"Reading PDFs from: {storage_dir}")
    pdf_files = [f for f in os.listdir(storage_dir) if f.lower().endswith(".pdf")]
    if not pdf_files:
        print("No PDF files found in Storage/ directory.")
        return

    # Initialize Qdrant client
    print(f"Connecting to Qdrant at {QDRANT_URL}...")
    try:
        qdrant_client = QdrantClient(url=QDRANT_URL)
        # Verify connection
        qdrant_client.get_collections()
    except Exception as e:
        print(f"❌ Failed to connect to Qdrant: {e}")
        print("Please verify that Qdrant is running locally via Docker.")
        sys.exit(1)

    # Initialize Qdrant collection if not exists
    collections = qdrant_client.get_collections().collections
    collection_names = [col.name for col in collections]
    
    if COLLECTION_NAME not in collection_names:
        print(f"Creating collection '{COLLECTION_NAME}'...")
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBEDDING_DIMENSION, distance=Distance.COSINE)
        )
        # Create Payload Indexes for fast meta filtering
        qdrant_client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="company",
            field_schema="keyword"
        )
        qdrant_client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="year",
            field_schema="integer"
        )
        print("Payload indexes created.")

    for pdf in pdf_files:
        pdf_path = os.path.join(storage_dir, pdf)
        try:
            ingest_pdf(pdf_path, qdrant_client)
        except Exception as e:
            print(f"❌ Failed to process {pdf}. Error: {e}")

if __name__ == "__main__":
    main()
