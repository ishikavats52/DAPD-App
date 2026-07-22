'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ORGANISATION_VALUES } = require('../models/Medicine');
const { numberToWords } = require('../utils/numberToWords');

let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }

async function resizeForGemini(buffer, mimetype) {
  if (!sharp) return { buffer, mimetype };
  try {
    const resized = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    return { buffer: resized, mimetype: 'image/jpeg' };
  } catch {
    return { buffer, mimetype };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(err) {
  const details = err?.errorDetails;
  if (!Array.isArray(details)) return 2500;
  for (const d of details) {
    if (d && String(d['@type'] || '').includes('RetryInfo') && d.retryDelay != null) {
      const m = String(d.retryDelay).match(/^([\d.]+)s$/i);
      if (m) {
        const sec = parseFloat(m[1], 10);
        if (Number.isFinite(sec)) {
          return Math.ceil(sec * 1000) + Math.floor(Math.random() * 400);
        }
      }
    }
  }
  return 2500;
}

function isRetryableQuotaError(err) {
  return err?.status === 429 || String(err?.message || '').includes('429 Too Many Requests');
}

function isRetryableTransientError(err) {
  const status = err?.status;
  if (status === 503 || status === 502 || status === 500) return true;
  const msg = String(err?.message || '');
  if (/\b503\b/.test(msg) || /Service Unavailable/i.test(msg)) return true;
  if (/\b502\b/.test(msg) || /Bad Gateway/i.test(msg)) return true;
  if (/\b500\b/.test(msg) && /internal/i.test(msg)) return true;
  if (/UNAVAILABLE/i.test(msg) || /high demand/i.test(msg)) return true;
  return false;
}

function parseModelChain() {
  const primary = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
  const rawFallbacks =
    process.env.GEMINI_MODEL_FALLBACKS?.trim() ||
    'gemini-3.5-flash,gemini-flash-latest';
  const fallbacks = rawFallbacks
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
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

async function generateContentWithRetries(genai, modelName, parts) {
  const model = genai.getGenerativeModel(
    { model: modelName },
    { apiVersion: 'v1beta' }
  );

  const generationConfig = {
    responseMimeType: 'application/json',
    temperature: 0,
    maxOutputTokens: 8192
  };
  const request = {
    contents: [{ role: 'user', parts: parts.map((p) => typeof p === 'string' ? { text: p } : p) }],
    generationConfig
  };
  const maxAttempts = 5;
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await model.generateContent(request);
    } catch (e) {
      lastErr = e;
      const retryable = isRetryableQuotaError(e) || isRetryableTransientError(e);
      if (!retryable || attempt === maxAttempts - 1) throw e;
      let delay;
      if (isRetryableQuotaError(e)) {
        // We are on a free tier limit. Fail fast immediately so the user sees the error
        // instead of hanging the app and causing an AbortError.
        throw e;
      } else {
        delay = Math.min(
          15_000,
          Math.max(2000, 2500 * (attempt + 1) + Math.floor(Math.random() * 1200))
        );
      }
      await sleep(delay);
    }
  }
  throw lastErr;
}

const EXTRACTION_PROMPT = `You are processing an Indian government medicine supply or procurement document (GeM supply order, purchase order, or supply order).
The document may contain bilingual text (Hindi and English). Read both scripts.
If multiple images are provided, treat them as pages of a SINGLE continuous document.

Extract ONLY the fields below. Return exactly ONE JSON object combining all the extracted data from all images — no markdown, no explanation, no extra keys.

Fields:
- lineItems: array of objects, one per distinct medicine/item row in the order table. Each object: { "nomenclature": string (full name as printed), "unitPrice": number or null (price per single unit/item if shown), "lineTotal": number or null (that row's FINAL Tax-Inclusive Amount / line total with GST in INR if shown; otherwise null), "quantity": number or string or null (ordered quantity for that row if shown) }. When the document lists multiple items, you MUST fill every row. When there is only one item row, you may return either a single-element lineItems array OR omit lineItems and use nomenclature only.
- nomenclature: for backward compatibility, the primary or first item name (string). If lineItems is present, this MUST match the first row's nomenclature. If only one line and you omit lineItems, fill this as today.
- quantity: total number of units/items ordered in this supply order. Use the final "Ordered Quantity" or "Total Quantity" — NOT pack size, NOT unit quantity within a pack, NOT balance quantity, NOT received quantity (number, digits only). If each lineItems row has its own quantity and there is no single document total, sum the row quantities into this field.
- totalValue: total order value in INR. If both pre-tax and tax-inclusive totals are present, you MUST use the FINAL tax-inclusive amount (often labeled "Total Amount with GST", "Grand Total", or "Total Amount"). Do NOT use the pre-tax basic amount. (number, digits only, no commas or currency symbols)
- gstExclusive: amount WITHOUT GST — labeled "Amount before GST", "Basic Amount", "Pre-tax Amount", or "Taxable Value". This is the amount on which GST is calculated. Strip commas and currency symbols (number, digits only, or null)
- gstInclusive: amount WITH GST included — labeled "Amount after GST", "Total with Tax", "Tax-inclusive Amount", or "Gross Amount including GST". Strip commas and currency symbols (number, digits only, or null)
- grandTotal: the final payable grand total — labeled "Grand Total", "Net Payable", "Total Payable", or "Total Amount Payable". This is the final amount after all taxes and charges. Strip commas and currency symbols (number, digits only, or null)
- totalValueInWords: the final amount written in words — labeled "Rupees", "Amount in words", "Grand Total (in words)", or "Grand Total Cost (in words)" (string or null). Ensure you scan the entire document, especially footers, to extract this fully.
- companyName: manufacturer or brand name of the medicine. In Indian government procurement documents this may be labeled "Contractor Name", "Supplier Name", "Brand Name", or "Manufacturer Name" — always save this value as companyName (string)
- vendorName: seller or supplier company name — the entity delivering the goods (string)
- location: city or storage/delivery location (string)
- organisation: the buyer or consignee — the government hospital or unit RECEIVING the medicine (not the vendor/supplier). Return the organisation name exactly as it appears in the document (string)
- supplyOrder: contract number, supply order number, or PO number (string)
- supplyDate: contract or document date formatted as YYYY-MM-DD (string)
- uoNumber: the unit order number (string or null). STRICT RULE: The alphabet letter (e.g., 'I', 'P', 'D') will always be in the middle at exactly the 8th position, with numbers on both sides (e.g., 7 digits, 1 letter, followed by more digits, like "1234567I1234567" or "1234567P890"). OCR can make mistakes, so if you see a letter 'I', 'O', 'S', or 'Z' in a numeric position on either side, assume it is '1', '0', '5', or '2'. If you see a digit '1' or '0' in the 8th position, assume it is the letter 'I' or 'O'.
- narration: text from a "Narration", "Remarks", or "Special Instructions" section. Summarize this in max 2 sentences or extract up to 100 characters to save space. Do NOT extract the entire paragraph (string or null)

Rules:
- Use null for any field not present in the document (including quantityUnit when no unit is stated).
- When each line has its own amount, set lineTotal per row and set totalValue to the sum of those line totals (pre-tax basic amounts). When the document only shows one footer total and no per-line amounts, set every lineItems[].lineTotal to null and fill totalValue (and/or grandTotal) from the document footer as today.
- Prefer extracting quantityUnit from the same table row or line as the ordered quantity when possible.
- For supplyDate, convert month-name formats like "04-Apr-2025" → "2025-04-04".
- For totalValue, gstExclusive, gstInclusive, grandTotal: strip commas and currency symbols (₹, INR, Rs).
- Do not invent or guess values — only extract what is clearly present.`;

function stripCurrencyNumber(s) {
  return String(s).replace(/,/g, '').replace(/rs\.?\s*/gi, '').replace(/₹\s*/g, '').replace(/inr\s*/gi, '').trim();
}

function parseFlexibleDate(str) {
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const mAlpha = s.match(/^(\d{1,2})[-\/\s]([a-zA-Z]{3,})[-\/\s](\d{2,4})$/);
  if (mAlpha) {
    const d = parseInt(mAlpha[1], 10);
    const mo = MONTHS[mAlpha[2].slice(0, 3).toLowerCase()];
    let y = parseInt(mAlpha[3], 10);
    if (y < 100) y += 2000;
    if (mo && d >= 1 && d <= 31) {
      const dt = new Date(Date.UTC(y, mo - 1, d));
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    }
  }

  const mNum = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!mNum) return null;
  let d = parseInt(mNum[1], 10);
  let mo = parseInt(mNum[2], 10);
  let y = parseInt(mNum[3], 10);
  if (y < 100) y += 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

function matchOrganisation(text) {
  const lower = String(text).trim().toLowerCase();
  for (const v of ORGANISATION_VALUES) {
    if (v === 'Other') continue;
    if (lower === v.toLowerCase() || lower.includes(v.toLowerCase())) return v;
  }
  if (lower.includes('r&r') || lower.includes('r & r')) return 'R&R';
  if (lower.includes('dental')) return 'Dental Centre';
  if (lower.includes('bure')) return 'Bure Hospital';
  return '';
}

function safeParseJson(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  
  const processParsed = (parsed) => {
    if (parsed && Array.isArray(parsed)) {
      // If it's an array of objects, take the first one (or merge them, but prompt says 1 object)
      if (parsed.length > 0 && typeof parsed[0] === 'object') return parsed[0];
      return null;
    }
    return parsed && typeof parsed === 'object' ? parsed : null;
  };

  try {
    const parsed = JSON.parse(text);
    return processParsed(parsed);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const arrStart = text.indexOf('[');
    const arrEnd = text.lastIndexOf(']');
    
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        const obj = processParsed(parsed);
        if (obj) return obj;
      } catch {}
    }
    
    if (arrStart !== -1 && arrEnd > arrStart) {
      try {
        const parsed = JSON.parse(text.slice(arrStart, arrEnd + 1));
        const obj = processParsed(parsed);
        if (obj) return obj;
      } catch {}
    }
    
    return null;
  }
}

function roundMoney2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function extractCleanedLineItems(raw) {
  let items = raw.lineItems;
  if (typeof items === 'string') {
    try {
      const p = JSON.parse(items);
      items = Array.isArray(p) ? p : [];
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) items = [];

  const cleaned = [];
  for (const row of items) {
    if (!row || typeof row !== 'object') continue;
    const nom = String(row.nomenclature ?? row.name ?? '').trim();
    if (!nom || nom.toLowerCase() === 'null') continue;
    const entry = { nomenclature: nom };
    
    if (row.unitPrice != null && row.unitPrice !== '') {
      const up = parseFloat(stripCurrencyNumber(String(row.unitPrice)));
      if (Number.isFinite(up) && up >= 0) entry.unitPrice = roundMoney2(up);
    }
    
    if (row.lineTotal != null && row.lineTotal !== '') {
      const lt = parseFloat(stripCurrencyNumber(String(row.lineTotal)));
      if (Number.isFinite(lt) && lt >= 0) entry.lineTotal = roundMoney2(lt);
    }
    if (row.quantity != null && row.quantity !== '') {
      const qs = String(row.quantity).trim();
      if (qs && qs.toLowerCase() !== 'null') {
        const qn = parseFloat(stripCurrencyNumber(qs));
        if (Number.isFinite(qn) && qn >= 0) entry.quantity = String(qn);
        else entry.quantity = qs;
      }
    }
    cleaned.push(entry);
  }

  if (cleaned.length === 0 && raw.nomenclature != null) {
    const nom = String(raw.nomenclature).trim();
    if (nom && nom.toLowerCase() !== 'null') cleaned.push({ nomenclature: nom });
  }

  return cleaned;
}

function normalizeFields(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const cleanedLines = extractCleanedLineItems(raw);
  const out = {};

  for (const key of ['companyName', 'vendorName', 'location', 'supplyOrder', 'totalValueInWords']) {
    const v = raw[key];
    if (v == null) continue;
    const t = String(v).trim();
    if (t && t.toLowerCase() !== 'null') out[key] = t;
  }

  if (cleanedLines.length > 0) {
    out.nomenclature = cleanedLines[0].nomenclature;
    out.lineItems = cleanedLines;
  } else {
    const v = raw.nomenclature;
    if (v != null) {
      const t = String(v).trim();
      if (t && t.toLowerCase() !== 'null') out.nomenclature = t;
    }
  }

  for (const key of ['quantity', 'totalValue', 'gstExclusive', 'gstInclusive', 'grandTotal']) {
    const v = raw[key];
    if (v == null) continue;
    const n = parseFloat(stripCurrencyNumber(String(v)));
    if (Number.isFinite(n)) out[key] = String(n);
  }

  const allLineTotals =
    cleanedLines.length > 0 && cleanedLines.every((li) => Number.isFinite(li.lineTotal));
  if (allLineTotals) {
    const sum = cleanedLines.reduce((s, li) => s + li.lineTotal, 0);
    out.totalValue = String(roundMoney2(sum));
  } else if (cleanedLines.length > 0 && out.grandTotal != null) {
    const g = parseFloat(stripCurrencyNumber(String(out.grandTotal)));
    if (Number.isFinite(g) && g >= 0) out.totalValue = String(roundMoney2(g));
  }

  const allLineQtyNumeric =
    cleanedLines.length > 0 &&
    cleanedLines.every((li) => {
      if (li.quantity == null || li.quantity === '') return false;
      return Number.isFinite(parseFloat(stripCurrencyNumber(String(li.quantity))));
    });
  if (allLineQtyNumeric) {
    const sumQ = cleanedLines.reduce(
      (s, li) => s + parseFloat(stripCurrencyNumber(String(li.quantity))),
      0
    );
    if (Number.isFinite(sumQ) && sumQ >= 0) out.quantity = String(roundMoney2(sumQ));
  }

  if (raw.narration != null) {
    const t = String(raw.narration).trim();
    if (t && t.toLowerCase() !== 'null') out.narration = t;
  }

  if (raw.supplyDate != null) {
    const s = String(raw.supplyDate).trim();
    if (s && s.toLowerCase() !== 'null') {
      const iso = parseFlexibleDate(s);
      if (iso) out.supplyDate = iso;
    }
  }

  if (raw.organisation != null) {
    const orgRaw = String(raw.organisation).trim();
    if (orgRaw && orgRaw.toLowerCase() !== 'null') {
      if (ORGANISATION_VALUES.includes(orgRaw)) {
        out.organisation = orgRaw;
      } else {
        const matched = matchOrganisation(orgRaw);
        if (matched) {
          out.organisation = matched;
        } else {
          out.organisation = 'Other';
          out.organisationCustom = orgRaw;
        }
      }
    }
  }

  if (raw.uoNumber != null) {
    const clean = String(raw.uoNumber).replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length >= 6 && clean.length <= 15) out.uoNumber = clean;
  }

  if (!out.totalValueInWords && (out.totalValue || out.grandTotal)) {
    const amount = out.grandTotal ? parseFloat(out.grandTotal) : parseFloat(out.totalValue);
    if (Number.isFinite(amount)) {
      const words = numberToWords(amount);
      if (words) {
        out.totalValueInWords = words;
      }
    }
  }

  return out;
}

async function extractFieldsFromImage(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Image files array is empty or invalid');
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const genai = new GoogleGenerativeAI(apiKey);
  const modelChain = parseModelChain();
  
  console.log("Gemini model chain:", modelChain);

  const parts = [EXTRACTION_PROMPT];
  for (const file of files) {
    const { buffer: imgBuf, mimetype: imgMime } = await resizeForGemini(file.buffer, file.mimetype);
    parts.push({
      inlineData: {
        data: imgBuf.toString('base64'),
        mimeType: imgMime || 'image/jpeg'
      }
    });
  }

  let responseText = null;
  let lastErr = null;

  for (const modelName of modelChain) {
    try {
      const result = await generateContentWithRetries(genai, modelName, parts);
      if (result && result.response) {
        responseText = result.response.text();
        break;
      }
    } catch (err) {
      lastErr = err;
      console.warn(`[vision.service] Model ${modelName} failed:`, err.message);
      if (isRetryableQuotaError(err)) {
        break; // Stop trying fallbacks, the quota applies globally to the project.
      }
    }
  }

  if (!responseText) {
    throw lastErr || new Error('Failed to generate content from Gemini AI');
  }

  const parsed = safeParseJson(responseText);
  if (!parsed) {
    console.error('Failed to parse Gemini output:', responseText);
    throw new Error('Gemini output was not valid JSON');
  }

  return normalizeFields(parsed);
}

module.exports = {
  extractFieldsFromImage,
  normalizeFields,
  safeParseJson
};
