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
    defaultQuery: "evidence",
    defaultQuestion: "Why do answers need evidence cards?",
    defaultTranscript:
      "Prince and Asha reviewed the Memoris OS workspace experience. The team agreed that every important answer should include evidence cards, every meaningful action should appear on the timeline, and every search result should respect organization and role permissions. Action: publish the evidence viewer walkthrough and prepare the demo workflow."
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
    summary: "Evidence cards, timeline history, and role-filtered answers moved into the demo."
  },
  {
    title: "Sprint Planning",
    meta: "Product - 52 min",
    summary: "Timeline filters and evidence cards moved into MVP scope."
  },
  {
    title: "Security Review",
    meta: "Platform - 31 min",
    summary: "Organization-scoped access checks prioritized."
  }
];

export const recentDecisions = [
  {
    title: "Require evidence cards",
    rationale: "Every AI answer should include source records users can verify.",
    status: "Accepted"
  },
  {
    title: "Permission checks before answers",
    rationale: "Unauthorized knowledge must never appear in results.",
    status: "Accepted"
  },
  {
    title: "Timeline as core primitive",
    rationale: "Every meaningful event becomes explainable history.",
    status: "Accepted"
  }
];

export const documents = [
  { title: "Evidence Viewer Design", kind: "DOCX", team: "Platform" },
  { title: "Workspace Access Policy", kind: "PDF", team: "Platform" },
  { title: "Launch Readiness", kind: "DOCX", team: "Product" }
];

export const actionItems = [
  { title: "Publish evidence viewer walkthrough", owner: "Asha", due: "Jul 22", status: "Open" },
  { title: "Review workspace access policy", owner: "Prince", due: "Jul 24", status: "Open" },
  { title: "Record RBAC demo", owner: "Dev", due: "Jul 26", status: "Review" }
];

export const initialTimeline: TimelineEvent[] = [
  {
    id: "t1",
    time: "10:10 AM",
    type: "Document Uploaded",
    title: "Evidence Viewer Design uploaded",
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
    title: "Require evidence cards",
    detail: "Decision linked to Architecture Review and evidence viewer design.",
    project: "Enterprise Memory MVP",
    team: "Platform"
  },
  {
    id: "t4",
    time: "10:05 AM",
    type: "AI Summary Generated",
    title: "Architecture Review summarized",
    detail: "Topics: Evidence, access control, Timeline Intelligence, workspace memory.",
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
    excerpt: "The team agreed every important answer should include source evidence."
  },
  {
    type: "Decision",
    title: "Evidence Viewer Direction",
    excerpt: "Answers must cite the meeting, decision, document, or timeline event used."
  },
  {
    type: "Document",
    title: "Workspace Access Policy",
    excerpt: "Organization and role permissions are documented as the first filter."
  },
  {
    type: "Timeline Event",
    title: "Decision Added",
    excerpt: "The evidence requirement was recorded after the Architecture Review summary."
  }
];

export const searchResults: SearchResult[] = [
  {
    type: "Meeting",
    title: "Architecture Review",
    snippet: "Evidence cards were selected so teams can verify every answer.",
    score: 0.94
  },
  {
    type: "Decision",
    title: "Evidence Viewer Direction",
    snippet: "Every answer must cite authorized source records.",
    score: 0.89
  },
  {
    type: "Document",
    title: "Workspace Access Policy",
    snippet: "Explains organization isolation, role checks, and evidence visibility.",
    score: 0.82
  },
  {
    type: "Timeline Event",
    title: "Decision Added",
    snippet: "Evidence requirement attached to meeting, document, and action item records.",
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
