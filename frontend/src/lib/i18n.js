import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

/* ════════════════════════════════════════════════════════════════
   i18n — English ⇄ Odia (ଓଡ଼ିଆ)
   Every string is written as a complete, grammatically natural
   sentence in each language — not a word-for-word machine swap.
   Odia follows standard Subject–Object–Verb order and uses the
   respectful verb forms appropriate for an everyday utility app.
════════════════════════════════════════════════════════════════ */

export const LANGS = {
  en: { code: "en", label: "English", native: "English" },
  or: { code: "or", label: "Odia", native: "ଓଡ଼ିଆ" },
};

const dict = {
  // ── App shell / navigation ──────────────────────────────────
  app_title:            { en: "Job Ledger",            or: "ଚାକିରି ଖାତା" },
  nav_home:              { en: "Home",                  or: "ମୁଖ୍ୟପୃଷ୍ଠା" },
  nav_applied:           { en: "Applied",                or: "ଆବେଦନ ହୋଇଛି" },
  nav_notices:           { en: "Notices",                or: "ବିଜ୍ଞପ୍ତି" },
  nav_admin:             { en: "Admin",                  or: "ଆଡମିନ" },

  // ── Greetings ────────────────────────────────────────────────
  greet_morning:          { en: "Good Morning",            or: "ସୁପ୍ରଭାତ" },
  greet_afternoon:        { en: "Good Afternoon",          or: "ନମସ୍କାର" },
  greet_evening:          { en: "Good Evening",            or: "ଶୁଭ ସନ୍ଧ୍ୟା" },
  home_title:             { en: "My Applications",         or: "ମୋର ଆବେଦନଗୁଡ଼ିକ" },

  // ── Home cards ───────────────────────────────────────────────
  deadlines_closing:      { en: "{n} deadline closing soon", en_plural: "{n} deadlines closing soon", or: "{n}ଟି ଶେଷ ତାରିଖ ଶୀଘ୍ର ଆସୁଛି" },
  tap_review_pending:      { en: "Tap to review pending jobs", or: "ବାକି ଥିବା ଆବେଦନ ଦେଖିବାକୁ ସ୍ପର୍ଶ କରନ୍ତୁ" },
  next_exam:               { en: "Next Exam",               or: "ପରବର୍ତ୍ତୀ ପରୀକ୍ଷା" },
  last_applied:            { en: "Last Applied",            or: "ଶେଷ ଆବେଦନ" },
  categories:              { en: "Categories",              or: "ବର୍ଗଗୁଡ଼ିକ" },
  today:                   { en: "Today",                   or: "ଆଜି" },
  tomorrow:                { en: "Tomorrow",                or: "ଆସନ୍ତାକାଲି" },
  in_n_days:               { en: "In {n} days",             or: "{n} ଦିନରେ" },

  // ── Status labels (used as pill text & category names) ────────
  status_pending:          { en: "Pending",                 or: "ବାକି ଅଛି" },
  status_applied:          { en: "Applied",                 or: "ଆବେଦନ ହୋଇଛି" },
  status_notices:          { en: "Notices",                 or: "ବିଜ୍ଞପ୍ତି" },
  status_urgent:           { en: "Urgent",                  or: "ଜରୁରୀ" },
  status_soon:             { en: "Soon",                    or: "ଶୀଘ୍ର" },

  // ── Tab screen headers ──────────────────────────────────────
  pending_jobs:            { en: "Pending Jobs",            or: "ବାକି ଥିବା ଆବେଦନ" },
  applied_jobs:            { en: "Applied Jobs",            or: "ହୋଇଥିବା ଆବେଦନ" },
  sorted_by_exam:          { en: "Sorted by exam date",     or: "ପରୀକ୍ଷା ତାରିଖ ଅନୁସାରେ ସଜାଯାଇଛି" },
  search_placeholder:      { en: "Search {label}…",         or: "{label} ଖୋଜନ୍ତୁ…" },

  // ── Empty / loading states ──────────────────────────────────
  no_results:              { en: "No results",              or: "କିଛି ମିଳିଲା ନାହିଁ" },
  no_jobs_in_tab:          { en: "No {tab} jobs",           or: "ଏଠାରେ କୌଣସି {tab} ଆବେଦନ ନାହିଁ" },
  try_different_keywords:  { en: "Try different keywords",  or: "ଅନ୍ୟ ଶବ୍ଦ ବ୍ୟବହାର କରି ଖୋଜନ୍ତୁ" },
  mark_applied_to_see:     { en: "Mark jobs applied to see them here", or: "ଆବେଦନ ହୋଇଥିବା ଭାବେ ଚିହ୍ନଟ କଲେ ଏଠାରେ ଦେଖାଯିବ" },
  add_from_admin:          { en: "Add jobs from the Admin tab", or: "ଆଡମିନ ଟ୍ୟାବରୁ ଆବେଦନ ଯୋଡ଼ନ୍ତୁ" },

  // ── Job card ─────────────────────────────────────────────────
  last_date:               { en: "Last Date",               or: "ଶେଷ ତାରିଖ" },
  exam_date:                { en: "Exam Date",               or: "ପରୀକ୍ଷା ତାରିଖ" },
  tba:                      { en: "TBA",                     or: "ଘୋଷଣା ବାକି" },
  days_left:                { en: "{n}d left",               or: "{n} ଦିନ ବାକି" },
  overdue:                  { en: "Overdue",                 or: "ସମୟ ସରିଗଲା" },
  passed:                   { en: "Passed",                  or: "ସରିଗଲା" },
  days_away:                { en: "{n}d away",               or: "{n} ଦିନ ବାକି" },
  login_label:              { en: "Login",                   or: "ଲଗଇନ" },
  documents:                { en: "Documents",                or: "ଡକ୍ୟୁମେଣ୍ଟ" },
  opens_on:                 { en: "Opens {date}",            or: "{date}ରେ ଖୋଲିବ" },
  applied_open_link:        { en: "Applied — Open Link",      or: "ଆବେଦନ ହୋଇଛି — ଲିଙ୍କ ଖୋଲନ୍ତୁ" },
  apply_now:                { en: "Apply Now",                or: "ବର୍ତ୍ତମାନ ଆବେଦନ କରନ୍ତୁ" },
  mark_btn:                 { en: "Mark",                     or: "ଚିହ୍ନଟ କରନ୍ତୁ" },
  undo_btn:                 { en: "Undo",                     or: "ପୂର୍ବାବସ୍ଥା" },
  marked_applied_toast:     { en: "Marked as Applied",         or: "ଆବେଦନ ହୋଇଥିବା ଭାବେ ଚିହ୍ନଟ ହେଲା" },
  moved_to_pending_toast:   { en: "Moved back to Pending",     or: "ପୁନର୍ବାର ବାକି ତାଲିକାକୁ ଗଲା" },
  deadline_label:           { en: "Deadline",                 or: "ଶେଷ ସମୟ" },
  no_deadline_set:          { en: "No deadline set",          or: "କୌଣସି ଶେଷ ତାରିଖ ଦିଆଯାଇନାହିଁ" },
  last_day_remaining:       { en: "Last day — {h}h left",     or: "ଶେଷ ଦିନ — {h} ଘଣ୍ଟା ବାକି" },
  one_day_left:             { en: "1 day left",               or: "୧ ଦିନ ବାକି" },
  deadline_passed_ago:      { en: "Deadline passed {n}d ago", or: "ଶେଷ ତାରିଖ {n} ଦିନ ପୂର୍ବେ ସରିଗଲା" },

  // ── Deadline alert popup ────────────────────────────────────
  deadlines_closing_soon:   { en: "deadline{s} closing soon", or: "ଶେଷ ତାରିଖ ଶୀଘ୍ର ଆସୁଛି" },
  swipe_to_dismiss:         { en: "Swipe to dismiss",         or: "ବନ୍ଦ କରିବାକୁ ଟାଣନ୍ତୁ" },
  more_jobs:                { en: "+{n} more",                or: "+{n} ଅଧିକ" },

  // ── Admin ────────────────────────────────────────────────────
  admin_title:              { en: "Job Manager",              or: "ଆବେଦନ ପରିଚାଳକ" },
  admin_eyebrow:            { en: "Admin",                    or: "ଆଡମିନ" },
  tab_all:                  { en: "All",                      or: "ସମସ୍ତ" },
  new_job:                  { en: "New Job",                  or: "ନୂତନ ଆବେଦନ" },
  smart_paste:              { en: "Smart Paste",               or: "ସ୍ମାର୍ଟ ପେଷ୍ଟ" },
  no_jobs_here:             { en: "No jobs here",              or: "ଏଠାରେ କିଛି ନାହିଁ" },
  add_via_new_or_paste:     { en: "Tap New Job or Smart Paste to add one", or: "ଯୋଡ଼ିବାକୁ ନୂତନ ଆବେଦନ କିମ୍ବା ସ୍ମାର୍ଟ ପେଷ୍ଟ ସ୍ପର୍ଶ କରନ୍ତୁ" },

  // ── Admin login ──────────────────────────────────────────────
  admin_login_title:        { en: "Admin Login",               or: "ଆଡମିନ ଲଗଇନ" },
  admin_login_sub:          { en: "Sign in to manage your jobs", or: "ଆବେଦନ ପରିଚାଳନା କରିବାକୁ ସାଇନ ଇନ କରନ୍ତୁ" },
  passcode_label:           { en: "Passcode",                  or: "ପାସକୋଡ" },
  passcode_placeholder:     { en: "Enter passcode",            or: "ପାସକୋଡ ଲେଖନ୍ତୁ" },
  sign_in_btn:              { en: "Sign In",                   or: "ସାଇନ ଇନ" },
  signing_in:               { en: "Signing in…",                or: "ସାଇନ ଇନ ହେଉଛି…" },
  wrong_passcode:           { en: "Wrong passcode",             or: "ଭୁଲ ପାସକୋଡ" },
  welcome_back:             { en: "Welcome back",               or: "ପୁନର୍ବାର ସ୍ୱାଗତ" },

  // ── Job form ─────────────────────────────────────────────────
  edit_job:                  { en: "Edit Job",                  or: "ଆବେଦନ ସମ୍ପାଦନ କରନ୍ତୁ" },
  job_name_label:            { en: "Job Name *",                or: "ଆବେଦନର ନାମ *" },
  job_name_placeholder:      { en: "e.g. SBI PO 2026",          or: "ଉଦାହରଣ: SBI PO 2026" },
  start_date_label:          { en: "Start Date",                or: "ଆରମ୍ଭ ତାରିଖ" },
  date_placeholder:          { en: "DD MM YYYY",                or: "ଦିନ ମାସ ବର୍ଷ" },
  tags_label:                { en: "Tags",                      or: "ଟ୍ୟାଗ" },
  apply_link_label:          { en: "Apply Link *",              or: "ଆବେଦନ ଲିଙ୍କ *" },
  username_label:            { en: "Username",                  or: "ୟୁଜରନେମ" },
  password_label:            { en: "Password",                  or: "ପାସୱାର୍ଡ" },
  optional_placeholder:      { en: "Optional",                  or: "ଇଚ୍ଛାଧୀନ" },
  notes_label:               { en: "Notes",                      or: "ଟିପ୍ପଣୀ" },
  notes_placeholder:         { en: "Any notes…",                  or: "କୌଣସି ଟିପ୍ପଣୀ…" },
  saving:                    { en: "Saving…",                    or: "ସେଭ ହେଉଛି…" },
  save_changes:              { en: "Save Changes",               or: "ପରିବର୍ତ୍ତନ ସେଭ କରନ୍ତୁ" },
  add_job_btn:               { en: "Add Job",                    or: "ଆବେଦନ ଯୋଡ଼ନ୍ତୁ" },
  cancel_btn:                { en: "Cancel",                     or: "ବାତିଲ କରନ୍ତୁ" },
  job_name_required:         { en: "Job name required",           or: "ଆବେଦନର ନାମ ଆବଶ୍ୟକ" },
  apply_link_required:       { en: "Apply link required",         or: "ଆବେଦନ ଲିଙ୍କ ଆବଶ୍ୟକ" },
  enter_date_as:             { en: "Enter {field} as DD MM YYYY", or: "{field} ଦିନ ମାସ ବର୍ଷ ଭାବେ ଲେଖନ୍ତୁ" },
  updated_toast:             { en: "Updated",                     or: "ଅପଡେଟ ହେଲା" },
  job_added_toast:           { en: "Job added",                   or: "ଆବେଦନ ଯୋଡ଼ାଗଲା" },
  save_failed:               { en: "Save failed",                  or: "ସେଭ ହୋଇପାରିଲା ନାହିଁ" },

  // ── Smart paste ──────────────────────────────────────────────
  smart_paste_title:         { en: "Smart Paste",                  or: "ସ୍ମାର୍ଟ ପେଷ୍ଟ" },
  smart_paste_sub:           { en: "AI reads and extracts job details", or: "AI ବିବରଣୀ ପଢ଼ି ବାହାର କରେ" },
  paste_placeholder:         { en: "Paste job notification text here…", or: "ଆବେଦନ ସୂଚନା ଏଠାରେ ପେଷ୍ଟ କରନ୍ତୁ…" },
  extract_with_ai:           { en: "Extract with AI",               or: "AI ସାହାଯ୍ୟରେ ବାହାର କରନ୍ତୁ" },
  reading:                   { en: "Reading…",                       or: "ପଢ଼ୁଛି…" },
  paste_content_first:       { en: "Paste some content first",        or: "ପ୍ରଥମେ କିଛି ବିଷୟବସ୍ତୁ ପେଷ୍ଟ କରନ୍ତୁ" },
  could_not_extract:         { en: "Could not extract data",           or: "ତଥ୍ୟ ବାହାର କରିହେଲା ନାହିଁ" },
  details_extracted:         { en: "Details extracted",                or: "ବିବରଣୀ ବାହାର ହେଲା" },

  // ── PWA install banner ───────────────────────────────────────
  install_app_title:         { en: "Install Job Ledger",            or: "ଚାକିରି ଖାତା ଇନଷ୍ଟଲ କରନ୍ତୁ" },
  install_app_sub:           { en: "Add to home screen",             or: "ହୋମ ସ୍କ୍ରିନରେ ଯୋଡ଼ନ୍ତୁ" },
  install_btn:               { en: "Install",                        or: "ଇନଷ୍ଟଲ" },

  // ── Generic ──────────────────────────────────────────────────
  loading_failed:            { en: "Failed to load",                or: "ଲୋଡ ହୋଇପାରିଲା ନାହିଁ" },
  update_failed:             { en: "Update failed",                  or: "ଅପଡେଟ ହୋଇପାରିଲା ନାହିଁ" },
  delete_failed:             { en: "Delete failed",                  or: "ଡିଲିଟ ହୋଇପାରିଲା ନାହିଁ" },
  deleted_toast:             { en: "Deleted",                        or: "ଡିଲିଟ ହେଲା" },
  copied:                    { en: "{label} copied",                 or: "{label} କପି ହେଲା" },
  document_saved:            { en: "{type} saved",                   or: "{type} ସେଭ ହେଲା" },
  document_deleted:          { en: "Document deleted",                or: "ଡକ୍ୟୁମେଣ୍ଟ ଡିଲିଟ ହେଲା" },
  upload_failed:             { en: "Upload failed",                   or: "ଅପଲୋଡ ହୋଇପାରିଲା ନାହିଁ" },
};

/* Resolve a key with optional {placeholder} substitution and a simple
   plural variant (`_plural`) selected when `vars.n !== 1`. */
function resolve(key, lang, vars) {
  const entry = dict[key];
  if (!entry) return key;
  let str =
    vars && vars.n !== undefined && vars.n !== 1 && entry[`${lang}_plural`]
      ? entry[`${lang}_plural`]
      : entry[lang] || entry.en || key;
  if (vars) {
    Object.keys(vars).forEach(k => {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
    });
  }
  return str;
}

const STORAGE_KEY = "job_ledger_lang";
const I18nContext = createContext({ lang: "en", t: (k) => k, setLang: () => {}, toggleLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || "en"; } catch { return "en"; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l) => setLangState(l === "or" ? "or" : "en"), []);
  const toggleLang = useCallback(() => setLangState(l => (l === "en" ? "or" : "en")), []);
  const t = useCallback((key, vars) => resolve(key, lang, vars), [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLang, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export default I18nContext;
