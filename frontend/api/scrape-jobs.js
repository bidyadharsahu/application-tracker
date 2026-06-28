// Vercel Serverless Function: auto-scrape FreeJobAlert + GovtJobsAlert
// Runs on schedule via Vercel Cron (see vercel.json)
// POST /api/scrape-jobs   (cron calls GET, manual trigger calls POST with ?secret=...)

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || "https://wxuroihkqxjxhxkobtzx.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ── Scrape FreeJobAlert latest-jobs page ──────────────────────────────────────
async function scrapeFreeJobAlert() {
  try {
    const res = await fetch("https://www.freejobalert.com/latest-jobs/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobTracker/1.0; +https://github.com)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const jobs = [];
    // Match table rows: <tr><td><a href="...">TITLE</a></td><td>ORG</td><td>DATE</td>...
    const rowRe = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const rows = html.match(rowRe) || [];
    for (const row of rows.slice(0, 50)) {
      const linkMatch = row.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
      const cells = [...row.matchAll(/<td[^>]*>([^<]*(?:<[^/][^>]*>[^<]*<\/[^>]*>)?[^<]*)<\/td>/gi)];
      if (!linkMatch) continue;
      const url = linkMatch[1];
      const title = linkMatch[2].replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
      const org = cells[1] ? cells[1][1].replace(/<[^>]*>/g, "").trim() : "";
      const dateStr = cells[2] ? cells[2][1].replace(/<[^>]*>/g, "").trim() : "";
      if (title && title.length > 5 && url.startsWith("http")) {
        jobs.push({ title, organization: org, last_date_text: dateStr, apply_link: url, source: "freejobalert" });
      }
    }
    return jobs.slice(0, 30);
  } catch (err) {
    console.error("FreeJobAlert scrape error:", err.message);
    return [];
  }
}

// ── Scrape GovtJobsAlert ──────────────────────────────────────────────────────
async function scrapeGovtJobsAlert() {
  try {
    const res = await fetch("https://govtjobsalert.in/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobTracker/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const jobs = [];
    // Match article/post titles with links
    const re = /<h[123][^>]*class="[^"]*(?:entry-title|post-title)[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null && jobs.length < 25) {
      const url = m[1];
      const title = m[2].replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
      if (title && title.length > 5) {
        jobs.push({ title, organization: "", last_date_text: "", apply_link: url, source: "govtjobsalert" });
      }
    }
    return jobs;
  } catch (err) {
    console.error("GovtJobsAlert scrape error:", err.message);
    return [];
  }
}

// ── Parse Indian date strings ─────────────────────────────────────────────────
function parseIndianDate(str) {
  if (!str) return null;
  str = str.trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // "31 July 2025" or "July 31, 2025"
  const d = new Date(str);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return null;
}

// ── Ask Gemini: does this job match the user's profile? ───────────────────────
async function checkJobMatch(job, profile) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { match: true, score: 60, reason: "No AI key — auto-approved for review" };

  const prompt = `You are a govt job matcher for Indian job seekers.

User profile:
- Qualifications: ${profile.qualifications || "Graduation"}
- Age: ${profile.age || 24}
- State: ${profile.state || "Odisha"}
- Interested categories: ${profile.categories || "SSC, Railway, Bank, State Govt, Central Govt"}
- Max age limit they qualify for: ${profile.max_age_limit || 32}

Job: "${job.title}" from ${job.organization || "Unknown org"}
URL: ${job.apply_link}

Reply ONLY with valid JSON (no markdown, no extra text):
{"match":true,"score":75,"reason":"Matches graduation requirement and central govt category"}

Rules: match=true only if the job is likely relevant for this user. score is 0-100.`;

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"match":false,"score":0,"reason":"AI error"}';
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { match: true, score: 50, reason: "AI unavailable — added for manual review" };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Auth: cron jobs use GET with Vercel's built-in auth; manual triggers need secret
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  const hasSecret = req.query?.secret === process.env.CRON_SECRET;
  if (!isVercelCron && !hasSecret) {
    return res.status(401).json({ error: "Unauthorized. Pass ?secret=YOUR_CRON_SECRET" });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not set in Vercel env" });
  }

  try {
    // Load user profile for matching
    const { data: profiles } = await supabase.from("user_profile").select("*").limit(1);
    const profile = profiles?.[0] || {
      qualifications: "Graduation",
      age: 24,
      state: "Odisha",
      categories: "SSC, Railway, Bank, State Govt",
      max_age_limit: 32,
    };

    // Scrape both sources in parallel
    const [fjaResult, gjaResult] = await Promise.allSettled([
      scrapeFreeJobAlert(),
      scrapeGovtJobsAlert(),
    ]);

    const allScraped = [
      ...(fjaResult.status === "fulfilled" ? fjaResult.value : []),
      ...(gjaResult.status === "fulfilled" ? gjaResult.value : []),
    ];

    // Get existing apply_links to avoid duplicates
    const { data: existing } = await supabase.from("jobs").select("apply_link");
    const existingLinks = new Set((existing || []).map((j) => j.apply_link));

    const newJobs = allScraped.filter(
      (j) => j.apply_link && !existingLinks.has(j.apply_link)
    );

    const added = [];
    const skipped = [];

    // Process up to 10 new jobs per run (protect Gemini quota)
    for (const job of newJobs.slice(0, 10)) {
      const matchResult = await checkJobMatch(job, profile);

      if (matchResult.match && matchResult.score >= 45) {
        const { error } = await supabase.from("jobs").insert({
          job_name: job.title,
          organization: job.organization || "See link",
          last_date: parseIndianDate(job.last_date_text),
          apply_link: job.apply_link,
          applied: false,
          notified: false,
          source: job.source,
          match_reason: matchResult.reason,
          match_score: matchResult.score,
          notes: `Auto-discovered from ${job.source}. AI match: ${matchResult.score}/100. ${matchResult.reason}`,
        });

        if (!error) {
          added.push({ title: job.title, score: matchResult.score, source: job.source });
        }
      } else {
        skipped.push({ title: job.title, score: matchResult.score, reason: matchResult.reason });
      }
    }

    // Send Telegram alert if configured and new jobs were added
    if (added.length > 0 && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const lines = added.map((j) => `✅ *${j.title}*\nMatch: ${j.score}%`).join("\n\n");
      const message = `🔔 *${added.length} new job${added.length > 1 ? "s" : ""} found!*\n\n${lines}\n\nOpen your Job Ledger to review.`;
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "Markdown",
          }),
        }
      );
    }

    return res.json({
      success: true,
      scraped: allScraped.length,
      new_candidates: newJobs.length,
      added: added.length,
      skipped: skipped.length,
      added_jobs: added,
    });
  } catch (err) {
    console.error("Scrape error:", err);
    return res.status(500).json({ error: err.message });
  }
};
