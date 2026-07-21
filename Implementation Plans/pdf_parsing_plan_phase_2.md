# Phase 2: Analytics RAG Engine & Reranker Deployment

This plan covers the implementation of **Point 4 (Local LLM & Context Management)** and **Point 5 (System Workflow)** from the architecture plan. We will build the complete retrieval-augmented generation (RAG) analytics system, split the AI environment variables, implement the Reranker servers, and add the Frontend Analytics tab.

---

## 1. Environment Variable Separation

Currently, the backend uses a single `AI_SERVER_URL` key. We will split it and add the reranker:
*   [MODIFY] [Backed/.env](file:///home/huzaifai/huzaifa/projects/local%20ai%20integration%20setup/Backed/.env)
    *   `LLM_SERVER_URL`: Dedicated endpoint for the Qwen Coder server.
    *   `EMBEDDING_SERVER_URL`: Dedicated endpoint for the Nomic embedding server.
    *   `RERANKER_SERVER_URL`: Dedicated endpoint for the new Reranker server.
*   [MODIFY] [Backed/src/config/env.ts](file:///home/huzaifai/huzaifa/projects/local%20ai%20integration%20setup/Backed/src/config/env.ts): Update config schema object and validations to match these three URLs.

---

## 2. Reranker Model Server Setup

We will deploy the **`BAAI/bge-reranker-large`** model (relevance cross-encoder) to score document chunks against user queries.

### A. [NEW] [reranker_server.py](file:///home/huzaifai/huzaifa/projects/local%20ai%20integration%20setup/AI/reranker_server.py) (Modal Serverless)
*   **Model**: `BAAI/bge-reranker-large`.
*   **Weights Caching**: Pre-cached during docker image build.
*   **API Endpoint**: `POST /rerank`.
    *   **Request Schema**: `{ "query": "str", "documents": ["str", "str", ...] }`
    *   **Response Schema**: `{ "results": [ { "index": int, "score": float }, ... ] }` (sorted by relevance score).

### B. [NEW] [reranker_server_kaggle.ipynb](file:///home/huzaifai/huzaifa/projects/local%20ai%20integration%20setup/AI/reranker_server_kaggle.ipynb) (Kaggle Notebook)
*   Exact mirror of the Modal FastAPI structure, optimized for Jupyter event-loop execution using `await server.serve()`.
*   Connects to ngrok using Kaggle User Secrets.

---

## 3. Backend Implementation (Express & Node)

We will build the endpoint `/api/analytics/query` which connects Qdrant, the Reranker, and the Qwen LLM.

### A. [NEW] [analyticsService.ts](file:///home/huzaifai/huzaifa/projects/local%20ai%20integration%20setup/Backed/src/services/analyticsService.ts)
Performs the pipeline orchestration using `axios` to avoid raw package clutter:
1.  **Embed User Query**: Call `EMBEDDING_SERVER_URL/embed` with prefix `search_query: <user_query>`.
2.  **Retrieve from Qdrant**: Send a POST query to Qdrant REST API (`POST http://localhost:6333/collections/pdf_chunks/points/search`). 
    *   Pass the embedding vector.
    *   Set `limit: 20` to fetch initial candidates.
    *   Add metadata payloads: dynamic filter on `company` and/or `year` if selected.
3.  **Rerank Chunks**: Call `RERANKER_SERVER_URL/rerank` passing the user query and the retrieved text list. Keep the top 5 highest-scored chunks.
4.  **Construct Context Prompt**: Combine the text segments into a structured RAG prompt:
    ```
    Answer the query based ONLY on the provided document contexts:
    [Context 1] (Page 5): ...
    [Context 2] (Page 9): ...
    Query: <user_query>
    Answer:
    ```
5.  **Generate Response**: Send prompt to `LLM_SERVER_URL/generate`.

### B. [NEW] [analyticsController.ts](file:///home/huzaifai/huzaifa/projects/local%20ai%20integration%20setup/Backed/src/controllers/analyticsController.ts)
Exposes the `/api/analytics/query` HTTP endpoint. Returns the final answer alongside the citations (document name, page number, context snippet).

---

## 4. Frontend Integration (React & TypeScript)

We will introduce a dedicated "Analytics" tab where users can perform RAG QA on ingested PDFs.

### A. [MODIFY] [Sidebar.tsx](file:///home/huzaifai/huzaifa/projects/local%20ai%20integration%20setup/Frontend/src/components/Sidebar.tsx) & [App.tsx](file:///home/huzaifai/huzaifa/projects/local%20ai%20integration%20setup/Frontend/src/App.tsx)
*   Add a new navigation tab: `'analytics'` (e.g. represented by a chart/search icon).
*   Switch view workspace to the new Analytics panel when selected.

### B. [NEW] [AnalyticsPanel.tsx](file:///home/huzaifai/huzaifa/projects/local%20ai%20integration%20setup/Frontend/src/components/AnalyticsPanel.tsx)
A premium interface designed to match your existing styling:
*   **Configuration Header**: Dropdowns to select `Company` (e.g. FFC, Apple) and `Year` (e.g. 2023, 2024) to lock context filtering.
*   **Search Box**: Large natural language input field.
*   **Answer Display**: Displays the response with a typewriter micro-animation.
*   **Source Citations**: Rendered below the answer as cards showing the document filename, section header, and highlighted source text.

---

## Verification Plan

1.  Verify Reranker API `/rerank` returns correct scores for match/mismatch pairs.
2.  Validate Backend split environment keys by starting LLM, Embeddings, and Reranker servers.
3.  Trigger QA search from the Analytics UI and verify that Qdrant applies filters successfully (only returning chunks matching the company/year) and Qwen outputs a relevant grounded answer.
