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

async function generateMISReportFromAI(records, userQuery, unit, quantity, purpose) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const genai = new GoogleGenerativeAI(apiKey);
  const modelChain = parseModelChain();

  const prompt = `You are a military procurement analytics assistant. You are given a list of database records for historical purchases and a query from the user.
Analyze these records and generate an Estimate Report.

User Query: "${userQuery}"
Requesting Unit: "${unit || 'Not specified'}"
Requested Quantity: "${quantity || 'Not specified'}"
Purpose: "${purpose || 'Not specified'}"

Historical Purchase Records:
${records && records.length > 0 ? JSON.stringify(records, null, 2) : 'No historical records found in the local database for this query.'}

Instructions:
1. Formulate the "Based on data" text starting with "Based on the available data on DAPD, this item is required to..."
2. Calculate the "High Rate" (highest unit rate from the historical records) and calculate the "High Item Total" by multiplying by the requested quantity.
3. Calculate the "Medium Rate" (average unit rate) and the "Medium Item Total" (Medium Rate * quantity). Add "(Incl. GST)" to the medium total if applicable.
4. Select up to 4 historical purchase records to populate the "Reference Documents" table (Date of SO, Description/Brand/Supplier, Quantity, Rate, Amount).
5. Provide a strategic "Recommended" vendor, rate, or procurement action.
6. Provide an "Open Market" assessment (rate, availability).

Return EXACTLY a JSON object with this schema (no markdown, no additional text, just the raw JSON):
{
  "basedOnDataText": "Based on the available data on DAPD, this item is required to _____ and based on the uploaded BBQR (Qualitative specifications) for the estimate rates are as follows:",
  "highRate": "INR 450.00",
  "highItemTotal": "INR 45000.00",
  "mediumRate": "INR 400.00",
  "mediumItemTotal": "INR 40000.00 (Incl. GST)",
  "recommended": "Recommended to procure from Vendor X at INR 400.00",
  "referenceDocuments": [
    {
      "dateOfSO": "12/05/2025",
      "description": "Item Description / Brand / Vendor",
      "qty": "100",
      "rate": "420.00",
      "amount": "42000.00"
    }
  ],
  "openMarket": "Open market rate is approx INR 410.00"
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
