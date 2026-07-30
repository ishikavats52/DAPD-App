'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
function parseModelChain() {
  const primary = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
  const rawFallbacks = process.env.GEMINI_MODEL_FALLBACKS?.trim() || 'gemini-3.5-flash,gemini-flash-latest,gemini-1.5-flash';
  const fallbacks = rawFallbacks.split(',').map((s) => s.trim()).filter(Boolean);
  const seen = new Set();
  const chain = [];
  for (const m of [primary, ...fallbacks]) {
    if (!seen.has(m)) {
      seen.add(m);
      chain.push(m);
    }
  }
  return chain;
}

function isRetryableQuotaError(err) {
  return err?.status === 429 || String(err?.message || '').includes('429 Too Many Requests');
}

async function generateMISReportFromAI(records, userQuery) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const genai = new GoogleGenerativeAI(apiKey);
  const modelChain = parseModelChain();

  const prompt = `You are a military procurement analytics assistant. You are given a list of database records for historical purchases and a query from the user.
Analyze these records and generate an MIS report comparing the Estimated Rate, Benchmark Rate, and Suggested BBQR (Broad Band Quantitative Requirements) for the items matching the query.

User Query: "${userQuery}"

Historical Purchase Records:
${records && records.length > 0 ? JSON.stringify(records, null, 2) : 'No historical records found in the local database for this query.'}

Instructions:
1. If historical records are available, calculate the "Estimated Rate" as the average of the rates in the database. Calculate the "Benchmark Rate" as the lowest recorded rate or standard market baseline. Suggest BBQR (specifications, pack size, quality, warranty) based on the most common successful procurements.
2. If NO historical records are provided, synthesize the estimated rates, benchmark rates, and suggested BBQRs based on standard defense/medical procurement benchmarks and general market rates for the queried item.
3. Keep the "suggestedBBQR" description focused on technical requirements (e.g. "Pack of 500g, minimum 95% purity, shelf life 2 years, storage at 2-8°C").

Return EXACTLY a JSON object with this schema (no markdown, no additional text, just the raw JSON):
{
  "executiveSummary": "A concise executive summary (3-4 sentences) analyzing historical prices, volume, and procurement efficiency.",
  "comparisonTable": [
    {
      "nomenclature": "Item name / nomenclature matching the query",
      "estimatedRate": "Estimated unit rate (e.g. INR 450.00)",
      "benchmarkRate": "Benchmark unit rate (e.g. INR 420.00)",
      "suggestedBBQR": "Suggested Broad Band Quantitative Requirements (specifications, pack size, quality, warranty)"
    }
  ],
  "procurementRecommendations": "Strategic recommendations for procurement (e.g., optimal bulk order size, negotiation points with vendors, suggested purchase timing)."
}`;

  let responseText = null;
  let lastErr = null;

  for (const modelName of modelChain) {
    try {
      const model = genai.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      });
      if (response && response.response) {
        responseText = response.response.text();
        break; // Success
      }
    } catch (err) {
      lastErr = err;
      console.warn(`[mis.service] Model ${modelName} failed:`, err.message);
      if (isRetryableQuotaError(err)) {
        break; // Stop trying fallbacks if quota is exceeded
      }
    }
  }

  if (!responseText) {
    throw lastErr || new Error('Failed to generate MIS report from Gemini AI');
  }

  try { 
    return JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse Gemini MIS output:', responseText);
    throw new Error('Gemini output was not valid JSON');
  }
}

module.exports = {
  generateMISReportFromAI
};
