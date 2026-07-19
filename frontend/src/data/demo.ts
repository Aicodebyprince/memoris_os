import type { DemoOrganization, Evidence, Role, SearchResult, TimelineEvent } from "../types/memoris";

export const roles: Role[] = ["Owner", "Admin", "Manager", "Employee", "Guest"];

export const demoOrganizations: DemoOrganization[] = [
  {
    key: "memoris-labs",
    name: "Memoris Labs",
    slug: "memoris-labs",
    industry: "SDE platform",
    projectName: "Enterprise Memory MVP",
    team: "Platform",
    defaultQuery: "CockroachDB",
    defaultQuestion: "Why did we choose PostgreSQL first?",
    defaultTranscript:
      "Prince and Asha reviewed the Memoris OS architecture. The team agreed to start with PostgreSQL for relational modeling, JWT and RBAC for secure tenant access, Timeline Intelligence for every meaningful event, and pgvector for semantic search. CockroachDB remains a future option if distributed SQL becomes necessary for enterprise scale. Action: publish ADR-001 and prepare the demo workflow."
  },
  {
    key: "helio-health",
    name: "Helio Health",
    slug: "helio-health",
    industry: "Healthcare ops",
    projectName: "Patient Ops Memory",
    team: "Care Ops",
    defaultQuery: "handoff",
    defaultQuestion: "Why do we filter care data before AI retrieval?",
    defaultTranscript:
      "Maya and Arjun reviewed patient handoff quality, audit trails, RBAC restrictions, and a policy that protected health data must be filtered before AI context is assembled. The team agreed to make Timeline Intelligence the audit trail for every important care handoff. Action: record the RBAC demo for care team access."
  },
  {
    key: "finpilot-capital",
    name: "FinPilot Capital",
    slug: "finpilot-capital",
    industry: "Finance risk",
    projectName: "Risk Intelligence Hub",
    team: "Risk",
    defaultQuery: "risk controls",
    defaultQuestion: "Why do risk decisions need evidence cards?",
    defaultTranscript:
      "Nikhil and Sara reviewed quarterly risk controls, approval evidence, financial document access, and a decision to keep executive compensation discussions restricted to owner and admin roles. The team agreed every risk decision must show meeting, document, and timeline evidence. Action: prepare the risk evidence viewer walkthrough."
  }
];

export const metrics = [
  { label: "Meetings", value: "42", delta: "+8 this week", tone: "moss" },
  { label: "Decisions", value: "128", delta: "94 verified", tone: "iris" },
  { label: "Documents", value: "312", delta: "18 processed", tone: "saffron" },
  { label: "Open Actions", value: "27", delta: "6 due soon", tone: "coral" },
  { label: "Timeline Events", value: "1,482", delta: "live graph", tone: "graphite" }
] as const;

export const recentMeetings = [
  {
    title: "Architecture Review",
    meta: "Platform - 38 min",
    summary: "PostgreSQL first, RBAC before retrieval, pgvector next."
  },
  {
    title: "Sprint Planning",
    meta: "Product - 52 min",
    summary: "Timeline filters and evidence cards moved into MVP scope."
  },
  {
    title: "Security Review",
    meta: "Platform - 31 min",
    summary: "JWT rotation and organization-scoped access checks prioritized."
  }
];

export const recentDecisions = [
  {
    title: "Start with PostgreSQL",
    rationale: "Best path for relational modeling, full-text search, and pgvector.",
    status: "Accepted"
  },
  {
    title: "RBAC before AI context",
    rationale: "Unauthorized knowledge must never enter model prompts.",
    status: "Accepted"
  },
  {
    title: "Timeline as core primitive",
    rationale: "Every meaningful event becomes explainable history.",
    status: "Accepted"
  }
];

export const documents = [
  { title: "Database Design", kind: "DOCX", team: "Platform" },
  { title: "ADR-001 Storage Direction", kind: "PDF", team: "Platform" },
  { title: "Launch Readiness", kind: "DOCX", team: "Product" }
];

export const actionItems = [
  { title: "Publish ADR-001", owner: "Asha", due: "Jul 22", status: "Open" },
  { title: "Add pgvector migration draft", owner: "Prince", due: "Jul 24", status: "Open" },
  { title: "Record RBAC demo", owner: "Dev", due: "Jul 26", status: "Review" }
];

export const initialTimeline: TimelineEvent[] = [
  {
    id: "t1",
    time: "10:10 AM",
    type: "Document Uploaded",
    title: "Database Design uploaded",
    detail: "DOCX linked to Enterprise Memory MVP.",
    project: "Enterprise Memory MVP",
    team: "Platform"
  },
  {
    id: "t2",
    time: "10:08 AM",
    type: "Action Items Assigned",
    title: "2 action items assigned",
    detail: "ADR and rollout review moved to owner queue.",
    project: "Enterprise Memory MVP",
    team: "Platform"
  },
  {
    id: "t3",
    time: "10:07 AM",
    type: "Decision Added",
    title: "Start with PostgreSQL",
    detail: "Decision linked to Architecture Review and ADR-001.",
    project: "Enterprise Memory MVP",
    team: "Platform"
  },
  {
    id: "t4",
    time: "10:05 AM",
    type: "AI Summary Generated",
    title: "Architecture Review summarized",
    detail: "Topics: PostgreSQL, RBAC, Timeline Intelligence, pgvector.",
    project: "Enterprise Memory MVP",
    team: "Platform"
  },
  {
    id: "t5",
    time: "10:00 AM",
    type: "Meeting Created",
    title: "Architecture Review",
    detail: "Transcript captured from Platform team.",
    project: "Enterprise Memory MVP",
    team: "Platform"
  }
];

export const evidence: Evidence[] = [
  {
    type: "Meeting",
    title: "Architecture Review",
    excerpt: "The team chose PostgreSQL first and kept CockroachDB as the future distributed SQL path."
  },
  {
    type: "Decision",
    title: "ADR-001 Storage Direction",
    excerpt: "PostgreSQL gives strong relational modeling and a smooth pgvector upgrade path."
  },
  {
    type: "Document",
    title: "Database Design",
    excerpt: "Tenant isolation, full-text search, and semantic retrieval are documented as storage goals."
  },
  {
    type: "Timeline Event",
    title: "Decision Added",
    excerpt: "The database direction was recorded after the Architecture Review summary."
  }
];

export const searchResults: SearchResult[] = [
  {
    type: "Meeting",
    title: "Architecture Review",
    snippet: "CockroachDB was discussed as the future distributed SQL option after PostgreSQL foundations.",
    score: 0.94
  },
  {
    type: "Decision",
    title: "ADR-001 Storage Direction",
    snippet: "PostgreSQL now, pgvector next, CockroachDB later if global scale requires it.",
    score: 0.89
  },
  {
    type: "Document",
    title: "Database Design",
    snippet: "Explains tenant tables, search indexes, and the distributed SQL migration path.",
    score: 0.82
  },
  {
    type: "Timeline Event",
    title: "Decision Added",
    snippet: "Database decision attached to meeting, document, and action item evidence.",
    score: 0.78
  }
];

export const buildPhases = [
  { name: "Foundation", items: ["Auth", "Organization", "RBAC", "Dashboard"], active: true },
  { name: "Knowledge", items: ["Meetings", "Documents", "Decisions", "Actions"], active: true },
  { name: "Intelligence", items: ["Timeline", "Search", "AI Processing", "Evidence"], active: false },
  { name: "Polish", items: ["Demo Data", "Deployment", "Docs", "Video"], active: false }
];

export const defaultTranscript =
  demoOrganizations[0].defaultTranscript;
