import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "job_ledger_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const isAuthed = () => !!getToken();

const client = axios.create({ baseURL: API });

client.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const api = {
  login: (username, password) =>
    client.post("/auth/login", { username, password }).then((r) => r.data),
  me: () => client.get("/auth/me").then((r) => r.data),
  listJobs: () => client.get("/jobs").then((r) => r.data),
  createJob: (payload) => client.post("/jobs", payload).then((r) => r.data),
  updateJob: (id, payload) => client.put(`/jobs/${id}`, payload).then((r) => r.data),
  toggleApplied: (id) => client.patch(`/jobs/${id}/toggle-applied`).then((r) => r.data),
  deleteJob: (id) => client.delete(`/jobs/${id}`).then((r) => r.data),
  smartParse: (text) => client.post("/jobs/smart-parse", { text }).then((r) => r.data),
  stats: () => client.get("/stats").then((r) => r.data),
};

export default api;
