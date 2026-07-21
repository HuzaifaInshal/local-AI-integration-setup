import os
import re
import sys
import uuid
import requests
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

# Load environment variables
load_dotenv()

# Configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = "pdf_chunks"
# Nomic v1.5 embedding dimension is 768
EMBEDDING_DIMENSION = 768

# Fetch the Embedding Server URL from environment
EMBEDDING_SERVER_URL = os.getenv("EMBEDDING_SERVER_URL", "http://localhost:8000")

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
    
    # Send PDF to remote server for parsing & embedding generation
    url = f"{EMBEDDING_SERVER_URL.rstrip('/')}/parse-pdf"
    print(f"📡 Sending PDF to remote GPU server for layout parsing and embedding generation...")
    
    chunks = []
    try:
        with open(pdf_path, 'rb') as f:
            files = {'file': (filename, f, 'application/pdf')}
            data = {'company': company_name, 'year': year}
            # Set a long timeout (600s / 10 minutes) for large files
            response = requests.post(url, files=files, data=data, timeout=600)
            response.raise_for_status()
            res_json = response.json()
            if not res_json.get("success"):
                raise ValueError(res_json.get("error_message") or "Unknown remote error")
            
            chunks = res_json.get("chunks", [])
    except Exception as e:
        print(f"❌ Remote parsing/embedding failed: {e}")
        print("Please verify that your Remote GPU Embedding Server is running and EMBEDDING_SERVER_URL is set correctly.")
        return
        
    print(f"📥 Received {len(chunks)} processed chunks from remote server.")
    if not chunks:
        return

    # Clean existing vectors for this specific document to prevent duplication (Idempotent run)
    print(f"🧹 Cleaning previous indexes for '{filename}' in Qdrant...")
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

    # Upsert to Qdrant
    print("Writing vectors to local Qdrant...")
    points = []
    for chunk in chunks:
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
                vector=chunk["embedding"],
                payload=payload
            )
        )
        
    qdrant_client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )
    print(f"✅ Successfully ingested {len(points)} vectors for {filename}.")

def main():
    # Target Storage directory relative to Backend
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
    print(f"Connecting to local Qdrant at {QDRANT_URL}...")
    try:
        qdrant_client = QdrantClient(url=QDRANT_URL)
        # Verify connection
        qdrant_client.get_collections()
    except Exception as e:
        print(f"❌ Failed to connect to Qdrant: {e}")
        print("Please verify that Qdrant is running locally.")
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
