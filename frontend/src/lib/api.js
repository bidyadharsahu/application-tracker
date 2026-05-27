// Supabase-backed API layer.
// Preserves the same surface area the rest of the UI consumes.
import { supabase, ADMIN_EMAIL, ADMIN_USERNAME } from "./supabase";

// ---------- Session helpers (kept for backward compat with components) ----------
export const getToken = () => {
  // Supabase manages its own session. Return a truthy marker if signed in.
  try {
    const raw = localStorage.getItem("job_ledger_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || (parsed?.currentSession?.access_token ?? null);
  } catch {
    return null;
  }
};
export const setToken = () => {}; // no-op (handled by supabase)
export const clearToken = () => {
  try { supabase.auth.signOut(); } catch {}
};

// Sync helper for route guard. Components also call api.me() async to verify.
export const isAuthed = () => !!getToken();

// ---------- Helpers ----------
function usernameToEmail(username) {
  const u = (username || "").trim();
  if (!u) return "";
  if (u.includes("@")) return u.toLowerCase();
  // The admin uses the simple username `bidyadhar`.
  if (u.toLowerCase() === ADMIN_USERNAME) return ADMIN_EMAIL;
  return `${u.toLowerCase()}@joblegder.app`;
}

function nowIso() {
  return new Date().toISOString();
}

// Map a Supabase row to the shape components expect.
function normalizeJob(row) {
  if (!row) return row;
  return {
    id: row.id,
    job_name: row.job_name,
    last_date: row.last_date,
    exam_date: row.exam_date,
    start_date: row.start_date,
    tags: row.tags,
    apply_link: row.apply_link,
    app_username: row.app_username,
    app_password: row.app_password,
    notes: row.notes,
    notified: !!row.notified,
    applied: !!row.applied,
    applied_at: row.applied_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------- Auth ----------
async function login(username, password) {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const e = new Error("Invalid credentials");
    e.response = { data: { detail: error.message || "Invalid credentials" } };
    throw e;
  }
  return { username: username, token: data?.session?.access_token };
}

async function me() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    const e = new Error("Not signed in");
    e.response = { status: 401, data: { detail: "Not signed in" } };
    throw e;
  }
  return { username: data.user.email === ADMIN_EMAIL ? ADMIN_USERNAME : data.user.email };
}

// ---------- Jobs ----------
async function listJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("last_date", { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeJob);
}

async function createJob(payload) {
  const insert = {
    job_name: payload.job_name,
    last_date: payload.last_date,
    start_date: payload.start_date || null,
    exam_date: payload.exam_date || null,
    tags: payload.tags || null,
    apply_link: payload.apply_link,
    app_username: payload.app_username || null,
    app_password: payload.app_password || null,
    notes: payload.notes || null,
    applied: false,
  };
  const { data, error } = await supabase.from("jobs").insert(insert).select().single();
  if (error) throwApi(error);
  return normalizeJob(data);
}

async function updateJob(id, payload) {
  const update = { ...payload, updated_at: nowIso() };
  if ("applied" in update) {
    update.applied_at = update.applied ? nowIso() : null;
  }
  const { data, error } = await supabase
    .from("jobs")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) throwApi(error);
  return normalizeJob(data);
}

async function toggleApplied(id) {
  // Need current state to flip
  const { data: current, error: getErr } = await supabase
    .from("jobs")
    .select("applied")
    .eq("id", id)
    .single();
  if (getErr) throwApi(getErr);
  const newApplied = !current?.applied;
  const { data, error } = await supabase
    .from("jobs")
    .update({
      applied: newApplied,
      applied_at: newApplied ? nowIso() : null,
      updated_at: nowIso(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throwApi(error);
  return normalizeJob(data);
}

async function markNotified(id) {
  const { data, error } = await supabase
    .from("jobs")
    .update({ notified: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throwApi(error);
  return normalizeJob(data);
}

async function deleteJob(id) {
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throwApi(error);
  return { ok: true };
}

async function stats() {
  const all = await listJobs();
  const today = new Date().toISOString().split("T")[0];
  const applied = all.filter((j) => j.applied).length;
  const upcoming = all.filter((j) => !j.applied && j.last_date >= today).length;
  const overdue = all.filter((j) => !j.applied && j.last_date < today).length;
  return {
    total: all.length,
    applied,
    pending: all.length - applied,
    upcoming,
    overdue,
  };
}

// ---------- AI Smart Parse (calls Vercel serverless function) ----------
async function smartParse(text) {
  // The Vercel serverless function lives at /api/smart-parse.
  // In local dev (CRA), this is hit via the same host; if a separate base is configured
  // via REACT_APP_AI_ENDPOINT, that wins.
  const endpoint =
    process.env.REACT_APP_AI_ENDPOINT || "/api/smart-parse";
  const { data: { session } = {} } = await supabase.auth.getSession();
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    let detail = `Smart parse failed (${res.status})`;
    try {
      const j = await res.json();
      detail = j?.detail || j?.error || detail;
    } catch {}
    const e = new Error(detail);
    e.response = { data: { detail } };
    throw e;
  }
  return await res.json();
}

// ---------- Error mapping ----------
function throwApi(error) {
  const detail = error?.message || "Request failed";
  const status = error?.status || error?.code || 500;
  const e = new Error(detail);
  e.response = { status, data: { detail } };
  throw e;
}

export const api = {
  login,
  me,
  listJobs,
  createJob,
  updateJob,
  markNotified,
  toggleApplied,
  deleteJob,
  stats,
  smartParse,
};

export default api;
