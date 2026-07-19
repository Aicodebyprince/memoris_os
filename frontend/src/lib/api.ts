import type { Role } from "../types/memoris";

const TOKEN_KEY = "memoris.token";
const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export interface AuthProfile {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: BackendRole;
    team: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export type BackendRole = "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "GUEST";

export interface DashboardResponse {
  metrics: {
    meetings: number;
    decisions: number;
    documents: number;
    actionItems: number;
    timelineEvents: number;
  };
  recentMeetings: Array<{ id: string; title: string; summary: string | null; team: string }>;
  recentDecisions: Array<{ id: string; title: string; rationale: string; status: string; team: string }>;
  recentDocuments: Array<{ id: string; title: string; sourceType: string; summary: string; team: string }>;
  pendingActionItems: Array<{
    id: string;
    title: string;
    ownerName: string;
    status: string;
    dueDate: string | null;
    team: string;
  }>;
}

export interface ProcessMeetingResponse {
  meetingId: string;
  summary: string;
  decisions: Array<{ id: string; title: string; rationale: string; status: string }>;
  actionItems: Array<{ id: string; title: string; ownerName: string; status: string; dueDate: string | null }>;
  participants: string[];
  topics: string[];
  timeline: string[];
}

export interface TimelineResponse {
  id: string;
  eventType: string;
  title: string;
  description: string;
  entityType: string;
  entityId: string | null;
  project: string | null;
  team: string;
  occurredAt: string;
}

export interface SearchResponse {
  query: string;
  results: Array<{
    type: string;
    id: string;
    title: string;
    snippet: string | null;
    team: string;
    score: number;
  }>;
}

export interface AskResponse {
  answer: string;
  allowed: boolean;
  evidence: Array<{
    type: string;
    id: string;
    title: string;
    excerpt: string | null;
  }>;
}

export interface HealthResponse {
  status: string;
  aiProvider?: string;
  timestamp: string;
}

export const demoCredentials: Record<Role, { email: string; password: string }> = {
  Owner: { email: "owner@memoris.dev", password: "password123" },
  Admin: { email: "admin@memoris.dev", password: "password123" },
  Manager: { email: "manager@memoris.dev", password: "password123" },
  Employee: { email: "employee@memoris.dev", password: "password123" },
  Guest: { email: "guest@memoris.dev", password: "password123" }
};

export function toRole(role: BackendRole): Role {
  const normalized = role.toLowerCase();
  return (normalized.charAt(0).toUpperCase() + normalized.slice(1)) as Role;
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function login(role: Role) {
  const credentials = demoCredentials[role];
  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
  return requestJson<AuthProfile>(response);
}

export async function healthCheck() {
  const response = await fetch(apiUrl("/api/health"), {
    cache: "no-store"
  });
  return requestJson<HealthResponse>(response);
}

export async function getDashboard(token: string) {
  return apiGet<DashboardResponse>("/api/dashboard", token);
}

export async function getTimeline(token: string) {
  return apiGet<TimelineResponse[]>("/api/timeline", token);
}

export async function searchKnowledge(token: string, query: string) {
  return apiGet<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`, token);
}

export async function processMeeting(token: string, transcript: string) {
  const response = await fetch(apiUrl("/api/knowledge/meetings/process"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: "Sprint Planning Meeting",
      projectName: "Enterprise Memory MVP",
      team: "Platform",
      transcript
    })
  });
  return requestJson<ProcessMeetingResponse>(response);
}

export async function askMemoris(token: string, question: string) {
  const response = await fetch(apiUrl("/api/ask"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ question })
  });
  return requestJson<AskResponse>(response);
}

async function apiGet<T>(url: string, token: string) {
  const response = await fetch(apiUrl(url), {
    headers: { Authorization: `Bearer ${token}` }
  });
  return requestJson<T>(response);
}

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function normalizeApiBaseUrl(value: string | undefined) {
  if (!value) {
    return "";
  }
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function requestJson<T>(response: Response) {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}
