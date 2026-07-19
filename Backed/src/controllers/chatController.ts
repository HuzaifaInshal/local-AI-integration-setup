import { Request, Response } from 'express';
import { getDBSchemaPrompt } from '../db/schema.js';
import { query } from '../db/connection.js';
import { callAIServer, ChatCompletionMessage } from '../services/aiService.js';
import { extractSQL, isSafeQuery, enforceLimit } from '../utils/queryValidator.js';

export async function handleNl2SqlChat(req: Request, res: Response) {
  const { message, execute = true } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: "Message parameter is required." });
  }

  try {
    const schemaPrompt = await getDBSchemaPrompt();
    
    const systemPrompt = `You are a PostgreSQL expert. Your job is to return proper read-only queries that will be used to fetch data for users based on the schema description.
The user will ask you a question in natural language. Translate it to a valid PostgreSQL SELECT query.
Always encapsulate the SQL query in a code block like this:
\`\`\`sql
SELECT ...
\`\`\`
Follow these rules strictly:
1. ONLY write SELECT or WITH queries.
2. Never perform write operations (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE).
3. Do NOT explain the query, just output the response.
4. Try to add "LIMIT 50" to queries if they return multiple records.

Here is the current database schema:
${schemaPrompt}`;

    const messages: ChatCompletionMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    const rawAIResponse = await callAIServer(messages, 0.0);
    const sql = extractSQL(rawAIResponse);

    if (!sql) {
      return res.json({
        success: true,
        sql: "",
        executed: false,
        results: [],
        aiResponse: rawAIResponse
      });
    }

    if (!isSafeQuery(sql)) {
      return res.status(400).json({
        success: false,
        sql,
        error: "Security Check Failed: The generated query contains write actions or is not a SELECT statement.",
        aiResponse: rawAIResponse
      });
    }

    const limitedSql = enforceLimit(sql);
    let results: any[] = [];
    let queryError = "";

    if (execute) {
      try {
        const queryRes = await query(limitedSql);
        results = queryRes.rows;
      } catch (err: any) {
        queryError = err.message;
      }
    }

    res.json({
      success: queryError === "",
      sql: limitedSql,
      executed: execute,
      results,
      error: queryError || undefined,
      aiResponse: rawAIResponse
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGeneralChat(req: Request, res: Response) {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, error: "Messages array is required." });
  }

  try {
    const aiResponse = await callAIServer(messages, 0.7);
    res.json({ success: true, response: aiResponse });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
