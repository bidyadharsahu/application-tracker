import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fetch HTML from a URL
async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobTracker/1.0)' }
  });
  return res.text();
}

// Parse FreeJobAlert latest jobs
async function scrapeFreeJobAlert() {
  const html = await fetchPage('https://www.freejobalert.com/latest-jobs/');
  const $ = cheerio.load(html);
  const jobs = [];

  $('table.tablesorter tbody tr').each((i, row) => {
    if (i > 30) return; // Only latest 30
    const cols = $(row).find('td');
    const title = $(cols[0]).text().trim();
    const org = $(cols[1]).text().trim();
    const lastDate = $(cols[2]).text().trim();
    const link = $(cols[0]).find('a').attr('href') || '';
    if (title) jobs.push({ title, organization: org, last_date_text: lastDate, apply_link: link, source: 'freejobalert' });
  });

  return jobs;
}

// Parse GovtJobsAlert latest jobs
async function scrapeGovtJobsAlert() {
  const html = await fetchPage('https://govtjobsalert.in/');
  const $ = cheerio.load(html);
  const jobs = [];

  $('.entry-title a, h2.entry-title a, article h2 a').slice(0, 20).each((i, el) => {
    const title = $(el).text().trim();
    const link = $(el).attr('href') || '';
    if (title && title.length > 5) {
      jobs.push({ title, organization: '', last_date_text: '', apply_link: link, source: 'govtjobsalert' });
    }
  });

  return jobs;
}

// Use Gemini to check if job matches user profile
async function checkJobMatch(job, userProfile) {
  const prompt = `
You are a job matching assistant for Indian government jobs.

User Profile:
- Name: ${userProfile.name}
- Qualifications: ${userProfile.qualifications.join(', ')}
- Age: ${userProfile.age} years
- State: ${userProfile.state}
- Interested Categories: ${userProfile.categories.join(', ')}
- Max Age Limit they qualify for: ${userProfile.max_age_limit}

Job Details:
- Title: ${job.title}
- Organization: ${job.organization || 'Unknown'}
- Apply Link: ${job.apply_link}

Question: Does this job likely match this user's qualifications, age, and interests?

Reply ONLY with valid JSON (no markdown, no explanation):
{
  "match": true or false,
  "score": number from 0 to 100 (how well it matches),
  "reason": "one short sentence explaining why"
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
      })
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"match":false,"score":0,"reason":"Error"}';
  
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { match: false, score: 0, reason: 'Parse error' };
  }
}

// Parse date string like "31/07/2025" or "July 31, 2025"
function parseIndianDate(str) {
  if (!str) return null;
  const ddmmyyyy = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,'0')}-${ddmmyyyy[1].padStart(2,'0')}`;
  }
  const d = new Date(str);
  return isNaN(d) ? null : d.toISOString().split('T')[0];
}

async function sendTelegramAlert(jobs, botToken, chatId) {
  if (!jobs.length) return;
  const message = \`🔔 *New Matching Jobs Found!*\n\n\` +
    jobs.map(j => \`✅ *\${j.title}*\nMatch: \${j.score}%\n\`).join('\\n') +
    \`\nOpen your app to review.\`;

  await fetch(\`https://api.telegram.org/bot\${botToken}/sendMessage\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    })
  });
}

export default async function handler(req, res) {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET && req.method !== 'GET') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch user profile
    const { data: profiles } = await supabase.from('user_profile').select('*').limit(1);
    const userProfile = profiles?.[0];
    if (!userProfile) return res.status(400).json({ error: 'No user profile found' });

    // Scrape both sources
    const [fjaJobs, gjaJobs] = await Promise.allSettled([
      scrapeFreeJobAlert(),
      scrapeGovtJobsAlert()
    ]);

    const allScraped = [
      ...(fjaJobs.status === 'fulfilled' ? fjaJobs.value : []),
      ...(gjaJobs.status === 'fulfilled' ? gjaJobs.value : []),
    ];

    // Get existing job links to avoid duplicates
    const { data: existingJobs } = await supabase.from('jobs').select('apply_link');
    const existingLinks = new Set(existingJobs?.map(j => j.apply_link) || []);

    const newJobs = allScraped.filter(j => j.apply_link && !existingLinks.has(j.apply_link));

    const added = [];
    const skipped = [];

    for (const job of newJobs.slice(0, 15)) { // Max 15 per run to save API quota
      const matchResult = await checkJobMatch(job, userProfile);

      if (matchResult.match && matchResult.score >= 50) {
        // Wait, original schema had 'job_name' not 'title'
        const { error } = await supabase.from('jobs').insert({
          job_name: job.title,
          last_date: parseIndianDate(job.last_date_text),
          apply_link: job.apply_link,
          applied: false, // goes to pending
          source: job.source,
          match_reason: matchResult.reason,
          match_score: matchResult.score,
          notes: \`Auto-discovered from \${job.source}. Match score: \${matchResult.score}/100. \${matchResult.reason}\`
        });

        if (!error) added.push({ title: job.title, score: matchResult.score });
      } else {
        skipped.push({ title: job.title, reason: matchResult.reason });
      }
    }

    if (added.length > 0 && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await sendTelegramAlert(added, process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);
    }

    res.json({
      success: true,
      scraped: allScraped.length,
      new_found: newJobs.length,
      added: added.length,
      skipped: skipped.length,
      added_jobs: added
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
