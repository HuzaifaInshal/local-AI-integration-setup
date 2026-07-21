import { Request, Response } from 'express';
import { queryPDFAnalytics } from '../services/analyticsService.js';

export async function handleQueryAnalytics(req: Request, res: Response) {
  const { query, company, year } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      success: false,
      error: "Query parameter is required and must be a string."
    });
  }

  try {
    const result = await queryPDFAnalytics(
      query,
      company || undefined,
      year ? parseInt(year.toString(), 10) : undefined
    );
    return res.json({
      success: true,
      answer: result.answer,
      sources: result.sources
    });
  } catch (error: any) {
    console.error("Analytics query endpoint failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process RAG analytics request."
    });
  }
}
