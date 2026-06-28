// Vercel Serverless Function: daily cleanup of expired unapplied jobs
// Runs via Vercel Cron every day at 7:30 PM IST (14:00 UTC)
// Also archives them to archived_jobs table before deleting

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || "https://wxuroihkqxjxhxkobtzx.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

module.exports = async function handler(req, res) {
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  const hasSecret = req.query?.secret === process.env.CRON_SECRET;
  if (!isVercelCron && !hasSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });
  }

  const today = new Date().toISOString().split("T")[0];

  // 1. Fetch expired unapplied jobs
  const { data: expired, error: fetchErr } = await supabase
    .from("jobs")
    .select("*")
    .eq("applied", false)
    .lt("last_date", today)
    .not("last_date", "is", null);

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!expired || expired.length === 0) {
    return res.json({ archived: 0, message: "No expired jobs to clean up" });
  }

  // 2. Archive them
  const { error: archiveErr } = await supabase.from("archived_jobs").insert(
    expired.map((j) => ({
      original_id: j.id,
      job_name: j.job_name,
      last_date: j.last_date,
      exam_date: j.exam_date,
      apply_link: j.apply_link,
      notes: j.notes,
      tags: j.tags,
      start_date: j.start_date,
      source: j.source || "manual",
      created_at: j.created_at,
      archive_reason: "last_date_passed",
    }))
  );
  // Non-fatal if archived_jobs doesn't exist yet
  if (archiveErr) console.warn("Archive insert warn:", archiveErr.message);

  // 3. Delete from live jobs
  const { error: deleteErr } = await supabase
    .from("jobs")
    .delete()
    .in("id", expired.map((j) => j.id));

  if (deleteErr) return res.status(500).json({ error: deleteErr.message });

  return res.json({
    success: true,
    archived: expired.length,
    jobs: expired.map((j) => j.job_name),
  });
};
