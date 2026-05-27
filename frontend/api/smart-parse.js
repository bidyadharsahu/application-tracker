// Vercel Serverless Function: AI-powered job notification parser.
// Endpoint: POST /api/smart-parse  { text: string }
// Required env var on Vercel: GEMINI_API_KEY (get free from https://aistudio.google.com/app/apikey)

const SYSTEM_PROMPT = `You are a meticulous information extractor for Indian government and private job notifications.
Given raw text (notification, paragraph, advertisement, or extracted webpage content), extract these fields:

- job_name: short title of the job/post (e.g. "SBI PO 2026", "RRB NTPC Recruitment").
- last_date: the LAST DATE TO APPLY in ISO format YYYY-MM-DD. If only month/year is mentioned, pick the most plausible date or return null.
- exam_date: the EXAMINATION DATE in ISO format YYYY-MM-DD, or null if not present.
- apply_link: the OFFICIAL APPLY URL if present (full https URL). Else null.
- notes: a one-line short summary (max 120 chars).

Respond ONLY with a single JSON object with exactly these 5 keys. No prose, no markdown fences. Use null for missing values. If a date appears with a 2-digit year or missing year, assume the current year.`;

function extractJson(text) {
  if (!text) return null;
  // Try direct
  try {
    return JSON.parse(text);
  } catch (_) {}
  // Try fenced ```json ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch (_) {}
  }
  // Try first {...} blob
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (_) {}
  }
  return null;
}

async function callGemini(text, apiKey) {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: text.slice(0, 8000) }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const out =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return out;
}

module.exports = async function handler(req, res) {
  // CORS — allow same-origin & all origins (we are behind Vercel, low risk)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const text = (body && body.text) ? String(body.text) : "";
  if (!text || text.trim().length < 5) {
    res.status(400).json({ detail: "Text too short" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      detail:
        "AI not configured. Set GEMINI_API_KEY in Vercel project environment variables. Get a free key at https://aistudio.google.com/app/apikey",
    });
    return;
  }

  try {
    const raw = await callGemini(text, apiKey);
    const parsed = extractJson(raw) || {};
    res.status(200).json({
      job_name: parsed.job_name || null,
      last_date: parsed.last_date || null,
      exam_date: parsed.exam_date || null,
      apply_link: parsed.apply_link || null,
      notes: parsed.notes || null,
      raw_response: parsed && Object.keys(parsed).length ? null : raw,
    });
  } catch (err) {
    res.status(502).json({ detail: `AI parse failed: ${err.message}` });
  }
};
