# Phase 1: Detailed Document Ingestion & Local Vector Storage (Qdrant & Docling)

This document outlines the low-level implementation details for setting up the local document parsing and vector indexing pipeline.

---

## 1. Local Infrastructure Setup

### A. Qdrant Vector Database
We will run Qdrant locally in a lightweight Docker container.
*   **Docker Command**:
    ```bash
    docker run -d -p 6333:6333 -p 6334:6334 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant
    ```
*   **Storage Location**: A persistent directory `qdrant_storage/` in the root workspace directory.

### B. Python Requirements
The ingestion script will run inside the workspace's `.venv`. Required libraries:
*   `docling` (IBM layout-aware PDF parser)
*   `qdrant-client` (native Qdrant SDK)
*   `requests` (to call our serverless embedding API)
*   `python-dotenv` (to load configuration environment variables)

---

## 2. Ingestion Pipeline Specification

We will create a local python execution script `Backed/src/db/ingest.py`.

### A. Directory Structure
*   PDF files to process will be placed in a new `/Storage` folder at the project root.
*   **Filename Naming Convention**: PDF files must be named using the pattern `<Company>_<Year>_<Name>.pdf` (e.g., `Apple_2025_Annual_Report.pdf`).
*   The script will use Python regex to extract:
    *   `company`: `Apple`
    *   `year`: `2025`
    *   `document_name`: `Apple_2025_Annual_Report.pdf`

### B. PDF Parsing & Chunking (Docling)
We will initialize Docling's converter to parse layout structures.
*   **Docling Flow**:
    ```python
    from docling.document_converter import DocumentConverter
    converter = DocumentConverter()
    result = converter.convert("Storage/Apple_2025_Annual_Report.pdf")
    ```
*   **Chunking Strategy**:
    *   Instead of flat character cutting, we will parse the document into sections using Docling's hierarchy tree.
    *   Tables will be kept intact in their markdown format (e.g. `| Col1 | Col2 |`) to preserve structural relationships.
    *   We target chunks of ~500–1000 tokens.

### C. Context Injection & Embedding Call
For every chunk generated:
1.  **Format Context**: We prefix the chunk text with metadata to improve embedding search:
    ```python
    enriched_text = f"[Company: {company} | Year: {year}] {chunk_text}"
    ```
2.  **Vector API Call**: Batch chunks (e.g. size 16) and send them via HTTP POST to your Modal Embedding Server endpoint (`POST /embed`):
    ```python
    response = requests.post(EMBEDDING_SERVER_URL + "/embed", json={"texts": batch})
    vectors = response.json()["embeddings"]
    ```

### D. Qdrant Payload Schema
We will upsert vectors into a Qdrant collection named `pdf_chunks`.
Each vector will have the following payload schema:
```json
{
  "text": "chunk text contents...",
  "company": "Apple",
  "year": 2025,
  "page_number": 12,
  "section": "Financial Performance",
  "document_name": "Apple_2025_Annual_Report.pdf"
}
```
*   **Payload Indexing**: We will explicitly create payload indexes in Qdrant for `company` (keyword) and `year` (integer). This allows fast, exact meta-filtering during query retrieval.

---

## 3. Integration & Commands

### A. Backend CLI Integration
We will add a script command inside [Backed/package.json](file:///home/huzaifai/huzaifa/projects/local%20ai%20integration%20setup/Backed/package.json):
```json
"scripts": {
  "ingest": "../.venv/bin/python src/db/ingest.py"
}
```
This enables running `pnpm ingest` from the `Backed/` directory to trigger the ingestion pipeline.

---

## 4. Verification & Validation Plan

### Automated Steps
1. Run `pnpm ingest` to process a test PDF (e.g. `Storage/Apple_2025_Financial_Report.pdf`).
2. Verify via curl request to Qdrant REST API (`GET http://localhost:6333/collections/pdf_chunks`) that the collection is created with correct dimensions.
3. Validate that payload indexes (`company`, `year`) are correctly created.
