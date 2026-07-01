import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

/* ════════════════════════════════════════════════════════════════
   i18n — English ⇄ Odia (ଓଡ଼ିଆ)
   Toggle with the lang-switch button. Every string is written as
   a complete, grammatically natural sentence in both languages.
   Odia follows standard Subject–Object–Verb order and uses
   respectful verb forms appropriate for an everyday utility app.
════════════════════════════════════════════════════════════════ */

export const LANGS = {
  en: { code: "en", label: "English", native: "English" },
  or: { code: "or", label: "Odia",    native: "ଓଡ଼ିଆ"   },
};

const dict = {
  /* ── App shell / navigation ──────────────────────────── */
  app_title:              { en: "Job Ledger",                       or: "ଚାକିରି ଖାତା" },
  nav_home:               { en: "Home",                             or: "ମୁଖ୍ୟ" },
  nav_applied:            { en: "Applied",                          or: "ଆବେଦନ" },
  nav_notices:            { en: "Notices",                          or: "ବିଜ୍ଞପ୍ତି" },
  nav_admin:              { en: "Admin",                            or: "ଆଡ଼ମିନ" },

  /* ── Greetings ───────────────────────────────────────── */
  greet_morning:          { en: "Good Morning",                     or: "ସୁପ୍ରଭାତ" },
  greet_afternoon:        { en: "Good Afternoon",                   or: "ନମସ୍କାର" },
  greet_evening:          { en: "Good Evening",                     or: "ଶୁଭ ସନ୍ଧ୍ୟା" },
  home_title:             { en: "My Applications",                  or: "ମୋର ଆବେଦନଗୁଡ଼ିକ" },

  /* ── Home cards ──────────────────────────────────────── */
  deadlines_closing:      { en: "{n} deadline closing soon",        en_plural: "{n} deadlines closing soon",
                            or: "{n}ଟି ଶେଷ ତାରିଖ ଶୀଘ୍ର ଆସୁଛି" },
  tap_review_pending:     { en: "Tap to review pending applications", or: "ବାକି ଆବେଦନ ଦେଖିବାକୁ ସ୍ପର୍ଶ କରନ୍ତୁ" },
  next_exam:              { en: "Next Exam",                        or: "ପରବର୍ତ୍ତୀ ପରୀକ୍ଷା" },
  last_applied:           { en: "Last Applied",                     or: "ଶେଷ ଆବେଦନ" },
  categories:             { en: "Categories",                       or: "ବର୍ଗଗୁଡ଼ିକ" },
  today:                  { en: "Today",                            or: "ଆଜି" },
  tomorrow:               { en: "Tomorrow",                         or: "ଆସନ୍ତାକାଲି" },
  in_n_days:              { en: "In {n} days",                      or: "{n} ଦିନ ପରେ" },

  /* ── Status labels ───────────────────────────────────── */
  status_pending:         { en: "Pending",                          or: "ବାକି ଅଛି" },
  status_applied:         { en: "Applied",                          or: "ଆବେଦନ ହୋଇଛି" },
  status_notices:         { en: "Notices",                          or: "ବିଜ୍ଞପ୍ତି" },
  status_urgent:          { en: "Urgent",                           or: "ଜରୁରୀ" },
  status_soon:            { en: "Soon",                             or: "ଶୀଘ୍ର" },

  /* ── Tab screen headers ──────────────────────────────── */
  pending_jobs:           { en: "Pending Jobs",                     or: "ବାକି ଆବେଦନ" },
  applied_jobs:           { en: "Applied Jobs",                     or: "ଆବେଦନ ହୋଇଥିବା" },
  sorted_by_exam:         { en: "Sorted by exam date",              or: "ପରୀକ୍ଷା ତାରିଖ ଅନୁସାରେ" },
  search_placeholder:     { en: "Search {label}…",                  or: "{label} ଖୋଜନ୍ତୁ…" },

  /* ── Empty / loading ─────────────────────────────────── */
  no_results:             { en: "No results found",                 or: "କିଛି ମିଳିଲା ନାହିଁ" },
  no_jobs_in_tab:         { en: "No {tab} jobs yet",                or: "{tab} ଆବେଦନ ନାହିଁ" },
  try_different_keywords: { en: "Try different search keywords",    or: "ଅନ୍ୟ ଶବ୍ଦ ଦ୍ୱାରା ଖୋଜନ୍ତୁ" },
  mark_applied_to_see:    { en: "Mark jobs as applied to see them here",
                            or: "ଆବେଦନ ହୋଇଥିବା ଚିହ୍ନ ଦେଲେ ଏଠାରେ ଦେଖାଯିବ" },
  add_from_admin:         { en: "Add new jobs from the Admin panel", or: "ଆଡ଼ମିନ ପ୍ୟାନେଲରୁ ନୂଆ ଆବେଦନ ଯୋଡ଼ନ୍ତୁ" },

  /* ── Job card ────────────────────────────────────────── */
  last_date:              { en: "Last Date",                        or: "ଶେଷ ତାରିଖ" },
  exam_date:              { en: "Exam Date",                        or: "ପରୀକ୍ଷା ତାରିଖ" },
  tba:                    { en: "TBA",                              or: "ଘୋଷଣା ବାକି" },
  days_left:              { en: "{n}d left",                        or: "{n} ଦିନ ବାକି" },
  days_left_full:         { en: "{n} days left",                    or: "{n} ଦିନ ବାକି ଅଛି" },
  overdue:                { en: "Overdue",                          or: "ସମୟ ଅତୀତ" },
  passed:                 { en: "Passed",                           or: "ସରିଗଲା" },
  days_away:              { en: "{n}d away",                        or: "{n} ଦିନ ବାକି" },
  login_label:            { en: "Login Credentials",                or: "ଲଗଇନ ବିବରଣୀ" },
  documents:              { en: "Documents",                        or: "ଡକ୍ୟୁମେଣ୍ଟ" },
  opens_on:               { en: "Opens on {date}",                  or: "{date}ରେ ଆରମ୍ଭ ହେବ" },
  applied_open_link:      { en: "Applied — Open Link",              or: "ଆବେଦନ ହୋଇଛି — ଲିଙ୍କ ଖୋଲନ୍ତୁ" },
  apply_now:              { en: "Apply Now",                        or: "ବର୍ତ୍ତମାନ ଆବେଦନ କରନ୍ତୁ" },
  mark_btn:               { en: "Mark Applied",                     or: "ଆବେଦନ ଚିହ୍ନ ଦିଅନ୍ତୁ" },
  undo_btn:               { en: "Undo",                             or: "ପୂର୍ବ ଅବସ୍ଥାକୁ ଫେରନ୍ତୁ" },
  marked_applied_toast:   { en: "Marked as Applied ✓",              or: "ଆବେଦନ ହୋଇଥିବା ଭାବେ ଚିହ୍ନ ହୋଇଗଲା ✓" },
  moved_to_pending_toast: { en: "Moved back to Pending",            or: "ପୁନର୍ବାର ବାକି ତାଲିକାକୁ ଗଲା" },
  deadline_label:         { en: "Deadline",                         or: "ଶେଷ ସମୟ" },
  no_deadline_set:        { en: "No deadline set",                  or: "ଶେଷ ତାରିଖ ଦିଆଯାଇ ନାହିଁ" },
  last_day_remaining:     { en: "Last day — {h}h remaining",        or: "ଶେଷ ଦିନ — {h} ଘଣ୍ଟା ବାକି" },
  one_day_left:           { en: "1 day left",                       or: "୧ ଦିନ ବାକି ଅଛି" },
  deadline_passed_ago:    { en: "Deadline passed {n}d ago",         or: "ଶେଷ ତାରିଖ {n} ଦିନ ପୂର୍ବରୁ ଅତୀତ ହୋଇଗଲା" },
  month_only:             { en: "(month)",                          or: "(ମାସ)" },
  exam_month_note:        { en: "Exam scheduled in {month} — exact date not confirmed",
                            or: "ପରୀକ୍ଷା {month} ମାସରେ — ସଠିକ ତାରିଖ ନିଶ୍ଚିତ ନୁହେଁ" },

  /* ── Deadline alert ──────────────────────────────────── */
  swipe_to_dismiss:       { en: "Swipe right to dismiss",           or: "ବନ୍ଦ କରିବାକୁ ଡାହାଣକୁ ଟାଣନ୍ତୁ" },
  more_jobs:              { en: "+{n} more",                        or: "+{n} ଅଧିକ" },

  /* ── Admin ───────────────────────────────────────────── */
  admin_title:            { en: "Job Manager",                      or: "ଆବେଦନ ପରିଚାଳକ" },
  admin_eyebrow:          { en: "Admin Panel",                      or: "ଆଡ଼ମିନ ପ୍ୟାନେଲ" },
  tab_all:                { en: "All",                              or: "ସମସ୍ତ" },
  new_job:                { en: "New Job",                          or: "ନୂଆ ଆବେଦନ" },
  smart_paste:            { en: "Smart Paste",                      or: "ସ୍ମାର୍ଟ ପେଷ୍ଟ" },
  no_jobs_here:           { en: "No jobs found here",               or: "ଏଠାରେ କୌଣସି ଆବେଦନ ନାହିଁ" },
  add_via_new_or_paste:   { en: "Tap New Job or Smart Paste to add one",
                            or: "ଯୋଡ଼ିବାକୁ ନୂଆ ଆବେଦନ ବା ସ୍ମାର୍ଟ ପେଷ୍ଟ ଦ୍ୱାରା ଚେଷ୍ଟା କରନ୍ତୁ" },

  /* ── Admin login ─────────────────────────────────────── */
  admin_login_title:      { en: "Admin Login",                      or: "ଆଡ଼ମିନ ଲଗଇନ" },
  admin_login_sub:        { en: "Sign in to manage your job listings",
                            or: "ଆବେଦନ ପରିଚାଳନା କରିବାକୁ ସାଇନ ଇନ କରନ୍ତୁ" },
  passcode_label:         { en: "Passcode",                         or: "ପ୍ରବେଶ କୋଡ" },
  passcode_placeholder:   { en: "Enter your passcode",              or: "ପ୍ରବେଶ କୋଡ ଲେଖନ୍ତୁ" },
  sign_in_btn:            { en: "Sign In",                          or: "ଭିତରକୁ ଯାନ୍ତୁ" },
  signing_in:             { en: "Signing in…",                      or: "ଭିତରକୁ ଯାଉଛି…" },
  wrong_passcode:         { en: "Incorrect passcode. Please try again.",
                            or: "ଭୁଲ ପ୍ରବେଶ କୋଡ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।" },
  welcome_back:           { en: "Welcome back!",                    or: "ପୁନର୍ବାର ସ୍ୱାଗତ!" },

  /* ── Job form ────────────────────────────────────────── */
  edit_job:               { en: "Edit Job",                         or: "ଆବେଦନ ସଂଶୋଧନ" },
  new_job_form_title:     { en: "New Job",                          or: "ନୂଆ ଆବେଦନ" },
  fill_details_below:     { en: "Fill in the details below",        or: "ତଳେ ବିବରଣୀ ପୂରଣ କରନ୍ତୁ" },
  job_name_label:         { en: "Job Name *",                       or: "ଆବେଦନର ନାମ *" },
  job_name_placeholder:   { en: "e.g. SBI PO 2026",                or: "ଉଦାହରଣ: SBI PO 2026" },
  start_date_label:       { en: "Start Date",                       or: "ଆରମ୍ଭ ତାରିଖ" },
  last_date_label:        { en: "Last Date *",                      or: "ଶେଷ ତାରିଖ *" },
  exam_date_label:        { en: "Exam Date",                        or: "ପରୀକ୍ଷା ତାରିଖ" },
  exam_date_hint:         { en: "DD MM YYYY  or  Month name (e.g. August 2026)",
                            or: "ଦିନ ମାସ ବର୍ଷ  ବା  ଶୁଧୁ ମାସ (ଉଦା: August 2026)" },
  tags_label:             { en: "Tags",                             or: "ଟ୍ୟାଗ" },
  apply_link_label:       { en: "Apply Link *",                     or: "ଆବେଦନ ଲିଙ୍କ *" },
  username_label:         { en: "Username",                         or: "ୟୁଜ଼ରନାମ" },
  password_label:         { en: "Password",                         or: "ପାସ୍ ୱାର୍ଡ" },
  optional_placeholder:   { en: "Optional",                         or: "ଇଚ୍ଛାଧୀନ" },
  notes_label:            { en: "Notes",                            or: "ଟିପ୍ପଣୀ" },
  notes_placeholder:      { en: "Any additional notes…",            or: "ଯେକୌଣସି ଅତିରିକ୍ତ ଟିପ୍ପଣୀ…" },
  saving:                 { en: "Saving…",                          or: "ସଂରକ୍ଷଣ ହେଉଛି…" },
  save_changes:           { en: "Save Changes",                     or: "ପରିବର୍ତ୍ତନ ସଂରକ୍ଷଣ କରନ୍ତୁ" },
  add_job_btn:            { en: "Add Job",                          or: "ଆବେଦନ ଯୋଡ଼ନ୍ତୁ" },
  cancel_btn:             { en: "Cancel",                           or: "ବାତିଲ" },
  job_name_required:      { en: "Job name is required",             or: "ଆବେଦନର ନାମ ଆବଶ୍ୟକ" },
  apply_link_required:    { en: "Apply link is required",           or: "ଆବେଦନ ଲିଙ୍କ ଆବଶ୍ୟକ" },
  enter_date_as:          { en: "Enter {field} as DD MM YYYY",      or: "{field} ଦିନ ମାସ ବର୍ଷ ଭାବେ ଲେଖନ୍ତୁ" },
  updated_toast:          { en: "Job updated successfully",         or: "ଆବେଦନ ସଫଳ ଭାବେ ଅଦ୍ୟତନ ହୋଇଛି" },
  job_added_toast:        { en: "New job added successfully",       or: "ନୂଆ ଆବେଦନ ସଫଳ ଭାବେ ଯୋଡ଼ାଗଲା" },
  save_failed:            { en: "Failed to save. Please try again.", or: "ସଂରକ୍ଷଣ ହୋଇପାରିଲା ନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।" },

  /* ── Smart paste ─────────────────────────────────────── */
  smart_paste_title:      { en: "Smart Paste",                      or: "ସ୍ମାର୍ଟ ପେଷ୍ଟ" },
  smart_paste_sub:        { en: "AI reads and extracts job details automatically",
                            or: "AI ସ୍ୱୟଂଚାଳିତ ଭାବେ ଆବେଦନ ବିବରଣୀ ପଢ଼ି ବାହାର କରେ" },
  paste_placeholder:      { en: "Paste the job notification text here…",
                            or: "ଆବେଦନ ସୂଚନା ଏଠାରେ ପେଷ୍ଟ କରନ୍ତୁ…" },
  extract_with_ai:        { en: "Extract with AI",                  or: "AI ସାହାଯ୍ୟରେ ବାହାର କରନ୍ତୁ" },
  reading:                { en: "Reading…",                         or: "ପଢ଼ୁଛି…" },
  paste_content_first:    { en: "Please paste some content first",  or: "ପ୍ରଥମେ ବିଷୟବସ୍ତୁ ପେଷ୍ଟ କରନ୍ତୁ" },
  could_not_extract:      { en: "Could not extract data from the text",
                            or: "ପାଠ୍ୟରୁ ତଥ୍ୟ ବାହାର କରିହେଲା ନାହିଁ" },
  details_extracted:      { en: "Job details extracted successfully",
                            or: "ଆବେଦନ ବିବରଣୀ ସଫଳ ଭାବେ ବାହାର ହୋଇଛି" },

  /* ── PWA install ─────────────────────────────────────── */
  install_app_title:      { en: "Install Job Ledger",               or: "ଚାକିରି ଖାତା ଇନଷ୍ଟଲ କରନ୍ତୁ" },
  install_app_sub:        { en: "Add to your home screen for quick access",
                            or: "ଦ୍ରୁତ ପ୍ରବେଶ ପାଇଁ ହୋମ ସ୍କ୍ରିନରେ ଯୋଡ଼ନ୍ତୁ" },
  install_btn:            { en: "Install",                          or: "ଇନଷ୍ଟଲ" },

  /* ── Generic ─────────────────────────────────────────── */
  loading_failed:         { en: "Failed to load. Please check your connection.",
                            or: "ଲୋଡ ହୋଇପାରିଲା ନାହିଁ। ଆପଣଙ୍କ ସଂଯୋଗ ଯାଞ୍ଚ କରନ୍ତୁ।" },
  update_failed:          { en: "Update failed. Please try again.",
                            or: "ଅଦ୍ୟତନ ହୋଇପାରିଲା ନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।" },
  delete_failed:          { en: "Delete failed. Please try again.",
                            or: "ଡିଲିଟ ହୋଇପାରିଲା ନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।" },
  deleted_toast:          { en: "Deleted successfully",             or: "ସଫଳ ଭାବେ ଡିଲିଟ ହୋଇଛି" },
  copied:                 { en: "{label} copied to clipboard",      or: "{label} କ୍ଲିପ୍ ବୋର୍ଡ଼କୁ କପି ହୋଇଛି" },
  document_saved:         { en: "{type} saved successfully",        or: "{type} ସଫଳ ଭାବେ ସଂରକ୍ଷିତ ହୋଇଛି" },
  document_deleted:       { en: "Document deleted",                 or: "ଡକ୍ୟୁମେଣ୍ଟ ଡିଲିଟ ହୋଇଛି" },
  upload_failed:          { en: "Upload failed. Please try again.", or: "ଅପଲୋଡ ହୋଇପାରିଲା ନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।" },
};

function resolve(key, lang, vars) {
  const entry = dict[key];
  if (!entry) return key;
  let str =
    vars && vars.n !== undefined && vars.n !== 1 && entry[lang + "_plural"]
      ? entry[lang + "_plural"]
      : entry[lang] || entry.en || key;
  if (vars) {
    Object.keys(vars).forEach(k => {
      str = str.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
    });
  }
  return str;
}

const STORAGE_KEY = "job_ledger_lang";
const I18nContext = createContext({ lang: "en", t: k => k, setLang: () => {}, toggleLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || "en"; } catch { return "en"; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    document.documentElement.lang = lang === "or" ? "or" : "en";
  }, [lang]);

  const setLang     = useCallback(l => setLangState(l === "or" ? "or" : "en"), []);
  const toggleLang  = useCallback(() => setLangState(l => (l === "en" ? "or" : "en")), []);
  const t           = useCallback((key, vars) => resolve(key, lang, vars), [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLang, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() { return useContext(I18nContext); }
export default I18nContext;
