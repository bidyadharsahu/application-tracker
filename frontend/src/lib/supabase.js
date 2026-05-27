import { createClient } from "@supabase/supabase-js";

// Supabase client — uses publishable (anon) key.
// RLS policies in Supabase enforce who can write.
const SUPABASE_URL =
  process.env.REACT_APP_SUPABASE_URL ||
  "https://wxuroihkqxjxhxkobtzx.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  "sb_publishable_T7QTHw9484ymee1q1AyAGw_ZAbWfGeR";

export const ADMIN_EMAIL =
  process.env.REACT_APP_ADMIN_EMAIL || "bidyadhar.sahu.cse.2022@nist.edu";
export const ADMIN_USERNAME = "bidyadhar";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: "job_ledger_auth",
  },
});

export default supabase;
