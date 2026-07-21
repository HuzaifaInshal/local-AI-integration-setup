import axios from 'axios';
import { config } from '../config/env.js';
import { callAIServer } from './aiService.js';

function logStep(message: string) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`[${timestamp}] ${message}`);
}

interface SourceCitation {
  document_name: string;
  page_number: number;
  section: string;
  text: string;
}

interface QueryAnalyticsResponse {
  answer: string;
  sources: SourceCitation[];
}

export async function queryPDFAnalytics(
  query: string,
  company?: string,
  year?: number
): Promise<QueryAnalyticsResponse> {
  // 1. Generate query embedding from embedding server
  logStep("Generating query embedding...");
  let queryEmbedding: number[];
  try {
    const embedUrl = `${config.EMBEDDING_SERVER_URL}/embed`;
    const embedRes = await axios.post(embedUrl, {
      texts: [`search_query: ${query}`]
    }, { timeout: 15000 });
    
    if (embedRes.data && embedRes.data.success && embedRes.data.embeddings?.length > 0) {
      queryEmbedding = embedRes.data.embeddings[0];
    } else {
      throw new Error(embedRes.data?.error_message || "Failed to retrieve embedding");
    }
  } catch (err: any) {
    console.error("Embedding server failed:", err.message);
    throw new Error(`Embedding server connection failed: ${err.message}`);
  }

  // 2. Query Qdrant with filters
  logStep("Searching Qdrant Vector Store...");
  const filterObject: any = { must: [] };
  if (company) {
    filterObject.must.push({
      key: 'company',
      match: { value: company }
    });
  }
  if (year) {
    filterObject.must.push({
      key: 'year',
      match: { value: parseInt(year.toString(), 10) }
    });
  }

  const searchPayload: any = {
    vector: queryEmbedding,
    limit: 20, // Retrieve top 20 candidate chunks
    with_payload: true
  };
  if (filterObject.must.length > 0) {
    searchPayload.filter = filterObject;
  }

  let candidates: any[] = [];
  try {
    const searchUrl = `${config.QDRANT_URL}/collections/pdf_chunks/points/search`;
    const searchRes = await axios.post(searchUrl, searchPayload, { timeout: 10000 });
    candidates = searchRes.data?.result || [];
  } catch (err: any) {
    console.error("Qdrant search query failed:", err.message);
    throw new Error(`Qdrant connection failed: ${err.message}`);
  }

  if (candidates.length === 0) {
    return {
      answer: "No relevant document chunks were found matching your query or selected filters in the vector database.",
      sources: []
    };
  }

  // 3. Rerank retrieved candidate chunks
  logStep(`Reranking ${candidates.length} candidates...`);
  const docTexts = candidates.map(c => c.payload.text);
  let rerankedList = candidates;
  
  try {
    const rerankUrl = `${config.RERANKER_SERVER_URL}/rerank`;
    const rerankRes = await axios.post(rerankUrl, {
      query,
      documents: docTexts
    }, { timeout: 20000 });

    if (rerankRes.data && rerankRes.data.success && rerankRes.data.results) {
      const scoresList = rerankRes.data.results as { index: number; score: number }[];
      // Keep only top 5 highest-ranked chunks
      const topScores = scoresList.slice(0, 5);
      rerankedList = topScores.map(scoreItem => candidates[scoreItem.index]);
    }
  } catch (err: any) {
    console.warn("⚠️ Reranker service failed, falling back to raw vector scores:", err.message);
    // Fall back to Qdrant's raw cosine similarity ranking (top 5)
    rerankedList = candidates.slice(0, 5);
  }

  // 4. Compile prompt context
  let contextSnippet = "";
  const sources: SourceCitation[] = [];
  
  rerankedList.forEach((chunk, index) => {
    const payload = chunk.payload;
    contextSnippet += `[Excerpt ${index + 1}] (Document: ${payload.document_name}, Page: ${payload.page_number}, Section: ${payload.section}):\n${payload.text}\n\n`;
    sources.push({
      document_name: payload.document_name,
      page_number: payload.page_number,
      section: payload.section,
      text: payload.text
    });
  });

  // 5. Query LLM (Qwen) with context
  logStep("Generating final synthesis from LLM...");
  const systemPrompt = "You are a professional financial assistant. Answer the user's analytics query based ONLY on the provided document excerpts. If the answer cannot be determined from the excerpts, reply that the information is not present in the loaded context. Always cite the Excerpt number when referencing facts.";
  const userPrompt = `Excerpts:\n${contextSnippet}\nQuestion: ${query}\n\nAnswer:`;

  try {
    const answer = await callAIServer([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    return { answer, sources };
  } catch (err: any) {
    console.error("LLM Generation failed:", err.message);
    throw new Error(`LLM synthesis failed: ${err.message}`);
  }
}
