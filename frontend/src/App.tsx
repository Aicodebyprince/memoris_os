import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Filter,
  GitBranch,
  KeyRound,
  ListChecks,
  Lock,
  LogOut,
  MessageSquareText,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  UserPlus,
  Users,
  X
} from "lucide-react";
import type { ComponentType, FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input, Textarea } from "./components/ui/input";
import {
  askMemoris,
  clearToken,
  demoCredentials,
  getDashboard,
  getTimeline,
  healthCheck,
  login,
  processMeeting,
  registerAccount,
  searchKnowledge,
  storeToken,
  toRole,
  uploadDocument,
  type AskResponse,
  type AuthProfile,
  type DashboardResponse,
  type DocumentUploadResponse,
  type ProcessMeetingResponse,
  type RegisterRequest,
  type SearchResponse,
  type TimelineResponse
} from "./lib/api";
import {
  actionItems,
  defaultTranscript,
  demoOrganizations,
  documents,
  evidence,
  initialTimeline,
  metrics,
  recentDecisions,
  recentMeetings,
  roles,
  searchResults
} from "./data/demo";
import { cn } from "./lib/utils";
import type { DemoOrganization, DemoOrganizationKey, Evidence, Role, SearchResult, TimelineEvent } from "./types/memoris";

type Tone = "moss" | "coral" | "saffron" | "iris" | "graphite";
type ConnectionState = "connecting" | "connected" | "offline";
type AuthView = "landing" | "login" | "register";
type RegisterMode = "create" | "join";
type WorkspaceSection = "dashboard" | "knowledge" | "actions" | "timeline" | "search" | "ask" | "members" | "rbac";
type ActionStatus = "Open" | "In Review" | "Done";
type ActionRecord = {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: ActionStatus;
  source: string;
  team: string;
};
type MemberRecord = {
  name: string;
  email: string;
  role: Role;
  team: string;
  status: "Active" | "Invited";
};
type RegisterFormState = {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
  organizationSlug: string;
  requestedRole: Role;
  team: string;
};

const workspaceNavItems: Array<{
  id: WorkspaceSection;
  label: string;
  icon: ComponentType<{ className?: string }>;
  helper: string;
}> = [
  { id: "dashboard", label: "Dashboard", icon: Activity, helper: "Overview" },
  { id: "knowledge", label: "Knowledge", icon: UploadCloud, helper: "Process content" },
  { id: "actions", label: "Actions", icon: ListChecks, helper: "Owner queue" },
  { id: "timeline", label: "Timeline", icon: GitBranch, helper: "Event history" },
  { id: "search", label: "Search", icon: Search, helper: "Find evidence" },
  { id: "ask", label: "Ask Memoris", icon: MessageSquareText, helper: "AI answers" },
  { id: "members", label: "Members", icon: Users, helper: "Organization" },
  { id: "rbac", label: "Access", icon: ShieldCheck, helper: "Access rules" }
];

const roleCapabilities: Record<Role, string[]> = {
  Owner: ["All organization memory", "All teams and projects", "Sensitive evidence allowed"],
  Admin: ["Organization operations", "Team-level decisions", "Member management path"],
  Manager: ["Own team meetings", "Team documents", "Assigned action items"],
  Employee: ["Own team knowledge", "Authorized search", "Personal action items"],
  Guest: ["Shared summaries", "Limited evidence", "Read-only access"]
};

const searchScopeByRole: Record<Role, string[]> = {
  Owner: ["All organization meetings", "All documents and decisions", "Sensitive timeline evidence"],
  Admin: ["Organization operations data", "Team decisions and documents", "Shared timeline evidence"],
  Manager: ["Own team meetings", "Team decisions and action items", "Project timeline evidence"],
  Employee: ["Own team meetings", "Assigned action items", "Shared documents and authorized evidence"],
  Guest: ["Shared summaries", "Public project documents", "Limited read-only evidence"]
};

const toneByType: Record<TimelineEvent["type"], Tone> = {
  "Meeting Created": "moss",
  "AI Summary Generated": "iris",
  "Decision Added": "saffron",
  "Action Items Assigned": "coral",
  "Document Uploaded": "graphite"
};

const statusTone: Record<ActionStatus, Tone> = {
  Open: "coral",
  "In Review": "saffron",
  Done: "moss"
};

const demoProcessOutputs: Record<DemoOrganizationKey, ProcessMeetingResponse> = {
  "memoris-labs": {
    meetingId: "demo-meeting-memoris-labs",
    summary:
      "The platform team aligned on a private organization memory model, permission-first answers, timeline history, and evidence cards for every important decision.",
    decisions: [
      {
        id: "demo-decision-memoris-storage",
        title: "Require evidence for important answers",
        rationale: "Answers should point back to meetings, decisions, documents, and timeline events.",
        status: "ACCEPTED"
      },
      {
        id: "demo-decision-memoris-rbac",
        title: "Filter knowledge by organization and role",
        rationale: "Users should only see information their workspace role allows.",
        status: "ACCEPTED"
      }
    ],
    actionItems: [
      {
        id: "demo-action-memoris-adr",
        title: "Publish the evidence viewer walkthrough",
        ownerName: "Asha",
        status: "OPEN",
        dueDate: null
      }
    ],
    participants: ["Prince", "Asha"],
    topics: ["Evidence", "Access control", "Timeline Intelligence", "Workspace memory"],
    timeline: ["AI Summary Generated", "Decision Added", "Action Items Assigned"]
  },
  "helio-health": {
    meetingId: "demo-meeting-helio-health",
    summary:
      "The care operations team reviewed patient handoff quality, audit trails, and protected-data filtering. The key decision was to filter healthcare knowledge before AI retrieval and record handoffs on the timeline.",
    decisions: [
      {
        id: "demo-decision-helio-rbac",
        title: "Filter care data before AI retrieval",
        rationale: "Protected health data must be authorization-filtered before context is assembled.",
        status: "ACCEPTED"
      }
    ],
    actionItems: [
      {
        id: "demo-action-helio-recording",
        title: "Record the RBAC demo for care team access",
        ownerName: "Arjun",
        status: "OPEN",
        dueDate: null
      }
    ],
    participants: ["Maya", "Arjun"],
    topics: ["Patient handoff", "Audit trails", "RBAC", "Care Ops"],
    timeline: ["AI Summary Generated", "Decision Added", "Action Items Assigned"]
  },
  "finpilot-capital": {
    meetingId: "demo-meeting-finpilot-capital",
    summary:
      "The risk team reviewed quarterly controls, approval evidence, and restricted financial discussions. Every risk decision now needs evidence cards from meetings, documents, and timeline events.",
    decisions: [
      {
        id: "demo-decision-finpilot-evidence",
        title: "Require evidence cards for risk decisions",
        rationale: "Risk decisions need an auditable trail across meetings, documents, and timeline events.",
        status: "ACCEPTED"
      }
    ],
    actionItems: [
      {
        id: "demo-action-finpilot-viewer",
        title: "Prepare the risk evidence viewer walkthrough",
        ownerName: "Sara",
        status: "OPEN",
        dueDate: null
      }
    ],
    participants: ["Nikhil", "Sara"],
    topics: ["Risk controls", "Approval evidence", "Financial access", "Evidence AI"],
    timeline: ["AI Summary Generated", "Decision Added", "Action Items Assigned"]
  }
};

const workspaceActionItems: Record<DemoOrganizationKey, ActionRecord[]> = {
  "memoris-labs": [
    {
      id: "memoris-a1",
      title: "Publish evidence viewer walkthrough",
      owner: "Asha",
      due: "Jul 22",
      status: "Open",
      source: "Architecture Review",
      team: "Platform"
    },
    {
      id: "memoris-a2",
      title: "Review workspace access policy",
      owner: "Prince",
      due: "Jul 24",
      status: "In Review",
      source: "Security Review",
      team: "Platform"
    },
    {
      id: "memoris-a3",
      title: "Record RBAC demo for interviews",
      owner: "Dev",
      due: "Jul 26",
      status: "Open",
      source: "Sprint Planning",
      team: "Platform"
    }
  ],
  "helio-health": [
    {
      id: "helio-a1",
      title: "Record care-team RBAC demo",
      owner: "Arjun",
      due: "Jul 23",
      status: "Open",
      source: "Patient Handoff Review",
      team: "Care Ops"
    },
    {
      id: "helio-a2",
      title: "Validate protected-data retrieval policy",
      owner: "Maya",
      due: "Jul 25",
      status: "In Review",
      source: "Compliance Sync",
      team: "Care Ops"
    },
    {
      id: "helio-a3",
      title: "Attach audit timeline to handoff template",
      owner: "Nora",
      due: "Jul 29",
      status: "Open",
      source: "Operations Review",
      team: "Care Ops"
    }
  ],
  "finpilot-capital": [
    {
      id: "finpilot-a1",
      title: "Prepare risk evidence viewer walkthrough",
      owner: "Sara",
      due: "Jul 23",
      status: "Open",
      source: "Risk Controls Review",
      team: "Risk"
    },
    {
      id: "finpilot-a2",
      title: "Verify executive compensation restriction",
      owner: "Nikhil",
      due: "Jul 24",
      status: "In Review",
      source: "Access Control Review",
      team: "Risk"
    },
    {
      id: "finpilot-a3",
      title: "Publish quarterly controls decision note",
      owner: "Sara",
      due: "Jul 27",
      status: "Done",
      source: "Quarterly Risk Meeting",
      team: "Risk"
    }
  ]
};

const demoMembers: Record<DemoOrganizationKey, MemberRecord[]> = {
  "memoris-labs": [
    { name: "Prince Sherathiya", email: "owner@memoris.dev", role: "Owner", team: "Platform", status: "Active" },
    { name: "Asha Rao", email: "manager@memoris.dev", role: "Manager", team: "Platform", status: "Active" },
    { name: "Dev Patel", email: "employee@memoris.dev", role: "Employee", team: "Platform", status: "Active" },
    { name: "Guest Reviewer", email: "guest@memoris.dev", role: "Guest", team: "Platform", status: "Invited" }
  ],
  "helio-health": [
    { name: "Maya Shah", email: "owner@heliohealth.dev", role: "Owner", team: "Care Ops", status: "Active" },
    { name: "Arjun Mehta", email: "manager@heliohealth.dev", role: "Manager", team: "Care Ops", status: "Active" },
    { name: "Nora Iyer", email: "employee@heliohealth.dev", role: "Employee", team: "Care Ops", status: "Active" },
    { name: "Compliance Viewer", email: "guest@heliohealth.dev", role: "Guest", team: "Care Ops", status: "Invited" }
  ],
  "finpilot-capital": [
    { name: "Nikhil Desai", email: "owner@finpilot.dev", role: "Owner", team: "Risk", status: "Active" },
    { name: "Sara Kapoor", email: "manager@finpilot.dev", role: "Manager", team: "Risk", status: "Active" },
    { name: "Ravi Shah", email: "employee@finpilot.dev", role: "Employee", team: "Risk", status: "Active" },
    { name: "Audit Viewer", email: "guest@finpilot.dev", role: "Guest", team: "Risk", status: "Invited" }
  ]
};

function App() {
  const [hasEnteredWorkspace, setHasEnteredWorkspace] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("landing");
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("dashboard");
  const [backendReady, setBackendReady] = useState(false);
  const [organizationKey, setOrganizationKey] = useState<DemoOrganizationKey>("memoris-labs");
  const [role, setRole] = useState<Role>("Owner");
  const [auth, setAuth] = useState<AuthProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [connectionMessage, setConnectionMessage] = useState("Preparing demo workspace...");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<Role | null>("Owner");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [apiTimeline, setApiTimeline] = useState<TimelineEvent[] | null>(null);
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processed, setProcessed] = useState(true);
  const [processOutput, setProcessOutput] = useState<ProcessMeetingResponse | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [documentUploadResult, setDocumentUploadResult] = useState<DocumentUploadResponse | null>(null);
  const [documentUploadError, setDocumentUploadError] = useState<string | null>(null);
  const [query, setQuery] = useState(demoOrganizations[0].defaultQuery);
  const [apiSearch, setApiSearch] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [question, setQuestion] = useState(demoOrganizations[0].defaultQuestion);
  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [localActionItems, setLocalActionItems] = useState<ActionRecord[]>(() => workspaceActionItems["memoris-labs"]);
  const [actionFilter, setActionFilter] = useState<ActionStatus | "All">("All");
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [registerMode, setRegisterMode] = useState<RegisterMode>("create");
  const [registerForm, setRegisterForm] = useState<RegisterFormState>({
    fullName: "",
    email: "",
    password: "",
    organizationName: "",
    organizationSlug: "",
    requestedRole: "Employee" as Role,
    team: "Platform"
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const currentOrganization = useMemo(
    () => demoOrganizations.find((item) => item.key === organizationKey) ?? demoOrganizations[0],
    [organizationKey]
  );
  const demoProcessOutput = useMemo(() => demoProcessOutputs[currentOrganization.key], [currentOrganization.key]);
  const displayedProcessOutput = processOutput ?? demoProcessOutput;

  const refreshWorkspace = useCallback(async (activeToken: string) => {
    const [dashboardResult, timelineResult] = await Promise.all([
      getDashboard(activeToken),
      getTimeline(activeToken)
    ]);
    setDashboard(dashboardResult);
    setApiTimeline(timelineResult.map(mapTimelineEvent));
    setLastSync(new Date().toLocaleTimeString());
  }, []);

  const loginAs = useCallback(
    async (nextRole: Role, nextOrganizationKey: DemoOrganizationKey, silent = false) => {
      setRole(nextRole);
      setConnection("connecting");
      setLoadingRole(nextRole);
      setAuthError(null);
      const selectedOrganization =
        demoOrganizations.find((item) => item.key === nextOrganizationKey) ?? demoOrganizations[0];
      setConnectionMessage(
        `${silent ? "Checking" : "Opening"} ${selectedOrganization.name} as ${nextRole}...`
      );

      try {
        const health = await healthCheck();
        setBackendReady(true);
        setConnectionMessage(`Workspace ready. Signing in as ${nextRole} at ${selectedOrganization.name}...`);
        const profile = await login(nextRole, nextOrganizationKey);
        storeToken(profile.token);
        setToken(profile.token);
        setAuth(profile);
        setRole(toRole(profile.user.role));
        setConnection("connected");
        await refreshWorkspace(profile.token);
        setConnectionMessage(`Connected as ${profile.user.fullName} (${profile.user.email})`);
        return true;
      } catch (error) {
        setBackendReady(false);
        clearToken();
        setToken(null);
        setAuth(null);
        setDashboard(null);
        setApiTimeline(null);
        setConnection("offline");
        setConnectionMessage("Workspace service is not reachable yet. Preview data is showing while the app retries.");
        setAuthError("Workspace service is not reachable. Start the app, then try demo login again.");
        if (!silent) {
          setRole(nextRole);
        }
        console.error(error);
        return false;
      } finally {
        setLoadingRole(null);
      }
    },
    [refreshWorkspace]
  );

  useEffect(() => {
    let active = true;

    async function probeBackend() {
      try {
        const health = await healthCheck();
        if (!active) return;
        setBackendReady(true);
        setConnection("offline");
        setConnectionMessage("Workspace service is ready. Demo access is available.");
      } catch (error) {
        if (!active) return;
        setBackendReady(false);
        setConnection("offline");
        setConnectionMessage("Workspace service is not reachable yet. You can still view the preview shell.");
        console.error(error);
      }
    }

    void probeBackend();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasEnteredWorkspace || connection !== "offline" || token) {
      return;
    }

    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      void loginAs(role, organizationKey, true);
      if (attempts >= 20) {
        window.clearInterval(retry);
      }
    }, 2000);

    return () => window.clearInterval(retry);
  }, [connection, hasEnteredWorkspace, loginAs, organizationKey, role, token]);

  useEffect(() => {
    if (!token || !query.trim()) {
      setApiSearch(null);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const result: SearchResponse = await searchKnowledge(token, query);
        setApiSearch(result.results.map(mapSearchResult));
      } catch (error) {
        setApiSearch(null);
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [query, token]);

  const metricCards = useMemo(() => {
    if (!dashboard) return metrics;
    return [
      { label: "Meetings", value: String(dashboard.metrics.meetings), delta: "tenant scoped", tone: "moss" as Tone },
      { label: "Decisions", value: String(dashboard.metrics.decisions), delta: "verified", tone: "iris" as Tone },
      { label: "Documents", value: String(dashboard.metrics.documents), delta: "indexed", tone: "saffron" as Tone },
      { label: "Open Actions", value: String(dashboard.metrics.actionItems), delta: "owned", tone: "coral" as Tone },
      { label: "Timeline Events", value: String(dashboard.metrics.timelineEvents), delta: "current", tone: "graphite" as Tone }
    ];
  }, [dashboard]);

  const meetingItems = dashboard?.recentMeetings.length
    ? dashboard.recentMeetings.map((item) => `${item.title} - ${item.summary ?? "No summary yet"}`)
    : recentMeetings.map((item) => `${item.title} - ${item.summary}`);

  const decisionItems = dashboard?.recentDecisions.length
    ? dashboard.recentDecisions.map((item) => `${item.title} - ${item.status}`)
    : recentDecisions.map((item) => `${item.title} - ${item.status}`);

  const documentItems = dashboard?.recentDocuments.length
    ? dashboard.recentDocuments.map((item) => `${item.title} - ${item.sourceType}`)
    : documents.map((item) => `${item.title} - ${item.kind}`);

  const pendingItems = dashboard?.pendingActionItems.length
    ? dashboard.pendingActionItems.map((item) => `${item.title} - ${item.ownerName}`)
    : actionItems.map((item) => `${item.title} - ${item.owner}`);

  const timeline = apiTimeline ?? initialTimeline;
  const visibleTimeline = useMemo(() => {
    if (apiTimeline) return apiTimeline;
    if (role === "Owner" || role === "Admin") return timeline;
    if (role === "Guest") return timeline.slice(0, 3);
    return timeline.filter((event) => event.team === currentOrganization.team);
  }, [apiTimeline, currentOrganization.team, role, timeline]);

  const localAskBlocked = question.toLowerCase().includes("salary") && role !== "Owner" && role !== "Admin";
  const answer = askResult
    ? askResult.answer
    : localAskBlocked
      ? "You do not have permission to access this information."
      : "Answers require evidence cards so every response can be verified against the original meeting, decision, document, or timeline event.";
  const answerAllowed = askResult ? askResult.allowed : !localAskBlocked;
  const askEvidence: Evidence[] = askResult
    ? askResult.evidence.map((item) => ({
        type: normalizeEvidenceType(item.type),
        title: item.title,
        excerpt: item.excerpt ?? "Evidence is available but no excerpt was generated."
      }))
    : answerAllowed
      ? evidence
      : [];

  const localSearchResults = searchResults.filter((result) =>
    `${result.title} ${result.snippet}`.toLowerCase().includes(query.toLowerCase())
  );
  const visibleSearchResults = apiSearch ?? (localSearchResults.length ? localSearchResults : searchResults);
  const canInspectAccessMatrix = role === "Owner" || role === "Admin";
  const canManageMembers = role === "Owner" || role === "Admin";
  const visibleWorkspaceNavItems = useMemo(
    () => workspaceNavItems.filter((item) => item.id !== "members" || canManageMembers),
    [canManageMembers]
  );
  const activeWorkspaceItem = visibleWorkspaceNavItems.find((item) => item.id === activeSection) ?? visibleWorkspaceNavItems[0];
  const visibleAccessRoles = canInspectAccessMatrix ? roles : [role];
  const scopedActionItems = useMemo(
    () => (role === "Guest" ? localActionItems.slice(0, 2) : localActionItems),
    [localActionItems, role]
  );
  const visibleActionItems = useMemo(
    () =>
      actionFilter === "All"
        ? scopedActionItems
        : scopedActionItems.filter((item) => item.status === actionFilter),
    [actionFilter, scopedActionItems]
  );
  const openActionCount = scopedActionItems.filter((item) => item.status !== "Done").length;
  const organizationMembers = demoMembers[currentOrganization.key];

  async function processTranscript() {
    setIsProcessing(true);
    try {
      if (token) {
        const result = await processMeeting(
          token,
          transcript,
          currentOrganization.projectName,
          currentOrganization.team
        );
        setProcessOutput(result);
        setProcessed(true);
        await refreshWorkspace(token);
        return;
      }

      setProcessOutput(demoProcessOutput);
      setApiTimeline(null);
      setProcessed(true);
    } finally {
      setIsProcessing(false);
    }
  }

  async function uploadSelectedDocument() {
    if (!selectedDocumentFile) {
      setDocumentUploadError("Choose a PDF, DOCX, TXT, MD, or CSV file first.");
      return;
    }
    if (!token) {
      setDocumentUploadError("Sign in to a workspace before uploading files.");
      return;
    }

    setIsUploadingDocument(true);
    setDocumentUploadError(null);
    try {
      const result = await uploadDocument(
        token,
        selectedDocumentFile,
        currentOrganization.projectName,
        auth?.user.team ?? currentOrganization.team
      );
      setDocumentUploadResult(result);
      setSelectedEvidence({
        type: "Document",
        title: result.title,
        excerpt: result.summary
      });
      setConnectionMessage(`${result.title} uploaded and added to the workspace timeline.`);
      await refreshWorkspace(token);
    } catch (error) {
      console.error(error);
      setDocumentUploadError(error instanceof Error ? cleanApiError(error.message) : "Document upload failed.");
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function ask() {
    if (!token) {
      setAskResult(null);
      return;
    }
    try {
      setIsAsking(true);
      setAskResult(await askMemoris(token, question));
      await refreshWorkspace(token);
    } catch (error) {
      console.error(error);
      setAskResult({
        allowed: false,
        answer: "Ask Memoris could not reach workspace services right now.",
        evidence: []
      });
    } finally {
      setIsAsking(false);
    }
  }

  async function checkApiNow() {
    try {
      setConnection("connecting");
      setConnectionMessage("Refreshing workspace access...");
      await loginAs(role, organizationKey);
    } catch {
      setConnection("offline");
    }
  }

  function updateRegisterForm<K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]) {
    setRegisterForm((current) => ({ ...current, [key]: value }));
  }

  async function enterWorkspace() {
    const success = await loginAs(role, organizationKey);
    if (success) {
      setHasEnteredWorkspace(true);
    }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRegistering(true);
    setAuthError(null);
    setConnection("connecting");
    setConnectionMessage("Creating secure organization workspace...");

    try {
      const health = await healthCheck();
      setBackendReady(true);

      const request: RegisterRequest = {
        fullName: registerForm.fullName.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        organizationName:
          registerMode === "create"
            ? registerForm.organizationName.trim()
            : registerForm.organizationName.trim() || registerForm.organizationSlug.trim(),
        organizationSlug: registerMode === "join" ? registerForm.organizationSlug.trim() : undefined,
        requestedRole:
          registerMode === "join"
            ? (registerForm.requestedRole.toUpperCase() as RegisterRequest["requestedRole"])
            : undefined,
        team: registerForm.team.trim() || "Platform"
      };

      const profile = await registerAccount(request);
      storeToken(profile.token);
      setToken(profile.token);
      setAuth(profile);
      setRole(toRole(profile.user.role));
      setConnection("connected");
      setConnectionMessage(`Registered and connected as ${profile.user.fullName} (${profile.user.email})`);
      await refreshWorkspace(profile.token);
      setHasEnteredWorkspace(true);
    } catch (error) {
      console.error(error);
      setBackendReady(false);
      setConnection("offline");
      setAuthError(error instanceof Error ? cleanApiError(error.message) : "Registration failed. Try again.");
      setConnectionMessage("Registration could not complete. Check the fields and try again.");
    } finally {
      setIsRegistering(false);
    }
  }

  function applyOrganizationDefaults(nextOrganizationKey: DemoOrganizationKey) {
    const nextOrganization =
      demoOrganizations.find((item) => item.key === nextOrganizationKey) ?? demoOrganizations[0];
    setOrganizationKey(nextOrganizationKey);
    setTranscript(nextOrganization.defaultTranscript);
    setQuery(nextOrganization.defaultQuery);
    setQuestion(nextOrganization.defaultQuestion);
    setProcessOutput(null);
    setAskResult(null);
    setApiSearch(null);
    setActionFilter("All");
    setLocalActionItems(workspaceActionItems[nextOrganizationKey]);
    setSelectedEvidence(null);
    setSelectedDocumentFile(null);
    setDocumentUploadResult(null);
    setDocumentUploadError(null);
    return nextOrganization;
  }

  function switchOrganization(nextOrganizationKey: DemoOrganizationKey) {
    applyOrganizationDefaults(nextOrganizationKey);
    if (hasEnteredWorkspace) {
      void loginAs(role, nextOrganizationKey);
    }
  }

  function navigateWorkspace(section: WorkspaceSection) {
    if (section === "members" && !canManageMembers) {
      setConnectionMessage("Members are visible only to Owner and Admin accounts.");
      return;
    }
    setActiveSection(section);
    window.requestAnimationFrame(() => {
      document.querySelector("main")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  function updateActionStatus(actionId: string, nextStatus: ActionStatus) {
    if (role === "Guest") {
      setConnectionMessage("Guests can inspect shared actions but cannot update them.");
      return;
    }

    setLocalActionItems((items) =>
      items.map((item) => (item.id === actionId ? { ...item, status: nextStatus } : item))
    );
    setConnectionMessage(`Action updated to ${nextStatus}.`);
  }

  function logout() {
    clearToken();
    setHasEnteredWorkspace(false);
    setAuthView("login");
    setActiveSection("dashboard");
    setToken(null);
    setAuth(null);
    setDashboard(null);
    setApiTimeline(null);
    setProcessOutput(null);
    setApiSearch(null);
    setAskResult(null);
    setSelectedEvidence(null);
    setActionFilter("All");
    setSelectedDocumentFile(null);
    setDocumentUploadResult(null);
    setDocumentUploadError(null);
    setConnection("offline");
    setConnectionMessage("Signed out. Choose a demo organization and role to continue.");
  }

  if (!hasEnteredWorkspace) {
    if (authView === "login") {
      return (
        <LoginPage
          authError={authError}
          backendReady={backendReady}
          connection={connection}
          connectionMessage={connectionMessage}
          currentOrganization={currentOrganization}
          loadingRole={loadingRole}
          organizationKey={organizationKey}
          role={role}
          onBack={() => {
            setAuthError(null);
            setAuthView("landing");
          }}
          onEnter={() => void enterWorkspace()}
          onOpenRegister={() => {
            setAuthError(null);
            setAuthView("register");
          }}
          onOrganizationChange={switchOrganization}
          onRoleChange={setRole}
        />
      );
    }

    if (authView === "register") {
      return (
        <RegisterPage
          authError={authError}
          backendReady={backendReady}
          form={registerForm}
          isRegistering={isRegistering}
          mode={registerMode}
          onBack={() => {
            setAuthError(null);
            setAuthView("landing");
          }}
          onFieldChange={updateRegisterForm}
          onModeChange={setRegisterMode}
          onOpenLogin={() => {
            setAuthError(null);
            setAuthView("login");
          }}
          onSubmit={submitRegistration}
        />
      );
    }

    return (
      <LandingPage
        backendReady={backendReady}
        onOpenLogin={() => {
          setAuthError(null);
          setAuthView("login");
        }}
        onOpenRegister={() => {
          setAuthError(null);
          setAuthView("register");
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-porcelain text-ink">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 self-start border-r border-graphite/10 bg-graphite text-white lg:block">
          <div className="flex h-full flex-col overflow-y-auto p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-moss text-base font-black text-white">
                M
              </div>
              <div>
                <p className="text-sm font-semibold text-white/60">Enterprise Memory</p>
                <h1 className="text-xl font-bold tracking-normal">Memoris OS</h1>
              </div>
            </div>

            <nav className="mt-10 space-y-1">
              {visibleWorkspaceNavItems.map(({ id, label, icon: Icon, helper }) => (
                <button
                  key={id}
                  onClick={() => navigateWorkspace(id)}
                  aria-current={activeSection === id ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left transition",
                    activeSection === id
                      ? "bg-white text-graphite shadow-hairline"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-black">{label}</span>
                    <span
                      className={cn(
                        "block truncate text-xs font-semibold",
                        activeSection === id ? "text-graphite/55" : "text-white/45"
                      )}
                    >
                      {helper}
                    </span>
                  </span>
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-lg border border-white/10 bg-white/6 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Building2 className="h-4 w-4 text-saffron" />
                {auth?.organization.name ?? currentOrganization.name}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/65">
                <span>Tenant</span>
                <span className="text-right text-white">{auth?.organization.slug ?? currentOrganization.slug}</span>
                <span>Role</span>
                <span className="text-right text-white">{role}</span>
                <span>Team</span>
                <span className="truncate text-right text-white">{auth?.user.team ?? currentOrganization.team}</span>
                <span>Session</span>
                <span className="text-right text-white">{connection === "connected" ? "Active" : "Preview"}</span>
                <span>User</span>
                <span className="truncate text-right text-white">{auth?.user.email ?? "not signed in"}</span>
              </div>
              <Button className="mt-4 w-full justify-center bg-white text-graphite hover:bg-cloud" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-graphite/10 bg-porcelain/88 px-4 py-3 backdrop-blur xl:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-moss">Workspace</p>
                <h2 className="truncate text-2xl font-black tracking-normal text-ink">
                  {auth?.organization.name ?? currentOrganization.name}
                </h2>
              </div>
              <div className="ml-auto flex min-w-0 items-center gap-2">
                <div className="hidden w-72 md:block">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => navigateWorkspace("search")}
                    aria-label="Search"
                  />
                </div>
                <Button variant="outline" size="icon" title="Refresh" onClick={() => token && refreshWorkspace(token)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="graphite">{auth?.organization.slug ?? currentOrganization.slug}</Badge>
              <Badge tone="iris">{role}</Badge>
              <Badge tone="saffron">{auth?.user.team ?? currentOrganization.team}</Badge>
              <Badge tone={connection === "connected" ? "moss" : connection === "connecting" ? "saffron" : "coral"}>
                <KeyRound className="mr-1 h-3.5 w-3.5" />
                {connection === "connected" ? "Secure session" : connection === "connecting" ? "Opening" : "Preview mode"}
              </Badge>
              <Button variant="outline" size="sm" onClick={checkApiNow}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <span className="max-w-full truncate text-xs font-semibold text-ink/50">
                {connection === "connected"
                  ? `Locked to ${auth?.organization.name ?? currentOrganization.name}`
                  : "Preview workspace"}
              </span>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {visibleWorkspaceNavItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => navigateWorkspace(id)}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-black ring-1 transition",
                    activeSection === id
                      ? "bg-graphite text-white ring-graphite"
                      : "bg-white text-ink ring-graphite/10"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="soft-grid px-4 py-6 xl:px-8">
            <section className="mb-5 rounded-lg border border-graphite/10 bg-white p-5 shadow-hairline">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-moss">{activeWorkspaceItem.label}</p>
                  <h3 className="mt-1 text-2xl font-black tracking-normal text-ink">{activeWorkspaceItem.helper}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="graphite">{auth?.organization.name ?? currentOrganization.name}</Badge>
                  <Badge tone="iris">{role}</Badge>
                  <Badge tone="saffron">{auth?.user.team ?? currentOrganization.team}</Badge>
                </div>
              </div>
            </section>

            <section
              id="workspace-dashboard"
              className={cn(
                "mb-5 scroll-mt-36 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]",
                activeSection !== "dashboard" && "hidden"
              )}
            >
              <StatusTile
                label="Workspace"
                value={connection === "connected" ? "Ready" : connection === "connecting" ? "Opening" : "Preview"}
                detail={connection === "connected" ? "Knowledge, timeline, and search are available" : "Open a demo account to continue"}
                tone={connection === "connected" ? "moss" : connection === "connecting" ? "saffron" : "coral"}
              />
              <StatusTile
                label="Signed In"
                value={auth ? auth.user.fullName : "No user selected"}
                detail={
                  auth
                    ? `${auth.organization.name} - ${role} - ${auth.user.team}`
                    : `${currentOrganization.industry} demo`
                }
                tone={auth ? "iris" : "graphite"}
              />
              <StatusTile
                label="Memory Freshness"
                value={lastSync ? "Synced" : "Ready"}
                detail={lastSync ? `Last refreshed ${lastSync}` : "Workspace data is prepared for review"}
                tone={connection === "connected" ? "moss" : "graphite"}
              />
            </section>

            <section className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-5", activeSection !== "dashboard" && "hidden")}>
              {metricCards.map((metric) => (
                <Card key={metric.label} className="min-h-32">
                  <CardContent className="flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink/58">{metric.label}</p>
                      <Badge tone={metric.tone as Tone}>{metric.delta}</Badge>
                    </div>
                    <p className="mt-6 text-4xl font-black tracking-normal">{metric.value}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section
              id="workspace-knowledge"
              className={cn(
                "mt-5 scroll-mt-36 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]",
                activeSection !== "knowledge" && "hidden"
              )}
            >
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Upload Knowledge</CardTitle>
                    <p className="mt-1 text-sm text-ink/58">Turn raw meeting notes into structured organization memory.</p>
                  </div>
                  <Badge tone="moss">
                    <UploadCloud className="mr-1 h-3.5 w-3.5" />
                    Ingestion
                  </Badge>
                </CardHeader>
                <CardContent>
                  <Textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} />
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button onClick={processTranscript} disabled={isProcessing} variant="accent">
                      {isProcessing ? <Clock3 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      {isProcessing ? "Processing" : "Process"}
                    </Button>
                    <Badge tone="iris">Summary</Badge>
                    <Badge tone="saffron">Decisions</Badge>
                    <Badge tone="coral">Action Items</Badge>
                    <Badge tone="graphite">{token ? "Saved to workspace" : "Preview only"}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Processing Output</CardTitle>
                  <Badge tone={processed ? "moss" : "graphite"}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    {processed ? "Structured" : "Waiting"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-ink/45">Summary</p>
                    <p className="mt-2 text-sm leading-6 text-ink/78">
                      {displayedProcessOutput.summary}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <OutputPill label="Participants" value={displayedProcessOutput.participants.join(", ")} />
                    <OutputPill label="Topics" value={displayedProcessOutput.topics.slice(0, 2).join(", ")} />
                    <OutputPill label="Decisions" value={`${displayedProcessOutput.decisions.length} captured`} />
                    <OutputPill label="Actions" value={`${displayedProcessOutput.actionItems.length} assigned`} />
                  </div>
                </CardContent>
              </Card>

              <Card className="xl:col-span-2">
                <CardHeader>
                  <div>
                    <CardTitle>Document Upload</CardTitle>
                    <p className="mt-1 text-sm text-ink/58">Upload PDFs, DOCX files, or text documents into organization memory.</p>
                  </div>
                  <Badge tone={documentUploadResult ? "moss" : "graphite"}>
                    <FileText className="mr-1 h-3.5 w-3.5" />
                    {documentUploadResult ? "Stored" : "Files"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md,.csv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedDocumentFile(file);
                      setDocumentUploadResult(null);
                      setDocumentUploadError(null);
                    }}
                  />

                  <div className="rounded-lg border border-dashed border-graphite/20 bg-porcelain p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase text-ink/45">Selected file</p>
                        <h3 className="mt-2 truncate text-lg font-black">
                          {selectedDocumentFile ? selectedDocumentFile.name : "No document selected"}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-ink/55">
                          {selectedDocumentFile
                            ? `${formatFileSize(selectedDocumentFile.size)} - ${selectedDocumentFile.type || "document"}`
                            : "Supported: PDF, DOC, DOCX, TXT, MD, CSV"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => documentInputRef.current?.click()}>
                          <UploadCloud className="h-4 w-4" />
                          Choose file
                        </Button>
                        <Button
                          onClick={() => void uploadSelectedDocument()}
                          disabled={!selectedDocumentFile || isUploadingDocument || role === "Guest"}
                        >
                          {isUploadingDocument ? <Clock3 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                          {isUploadingDocument ? "Uploading" : "Upload"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {role === "Guest" && (
                    <div className="mt-3 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-semibold text-coral">
                      Guests can view shared evidence but cannot upload documents.
                    </div>
                  )}

                  {documentUploadError && (
                    <div className="mt-3 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-semibold text-coral">
                      {documentUploadError}
                    </div>
                  )}

                  {documentUploadResult && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedEvidence({
                          type: "Document",
                          title: documentUploadResult.title,
                          excerpt: documentUploadResult.summary
                        })
                      }
                      className="mt-3 w-full rounded-md border border-moss/25 bg-moss/10 p-4 text-left transition hover:bg-moss/15"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase text-moss">Upload complete</p>
                          <h3 className="mt-1 text-sm font-black">{documentUploadResult.title}</h3>
                        </div>
                        <Badge tone="moss">{documentUploadResult.sourceType}</Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/62">{documentUploadResult.summary}</p>
                    </button>
                  )}
                </CardContent>
              </Card>
            </section>

            <section
              id="workspace-actions"
              className={cn(
                "mt-5 scroll-mt-36 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]",
                activeSection !== "actions" && "hidden"
              )}
            >
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Action Center</CardTitle>
                    <p className="mt-1 text-sm text-ink/58">Track follow-ups extracted from meetings and decisions.</p>
                  </div>
                  <Badge tone={openActionCount > 0 ? "coral" : "moss"}>{openActionCount} open</Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(["All", "Open", "In Review", "Done"] as Array<ActionStatus | "All">).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setActionFilter(status)}
                        className={cn(
                          "h-9 rounded-full px-4 text-xs font-black ring-1 transition",
                          actionFilter === status
                            ? "bg-graphite text-white ring-graphite"
                            : "bg-white text-ink/62 ring-graphite/10 hover:bg-porcelain hover:text-ink"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 space-y-3">
                    {visibleActionItems.map((item) => (
                      <div key={item.id} className="rounded-lg border border-graphite/10 bg-porcelain p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={statusTone[item.status]}>{item.status}</Badge>
                              <span className="text-xs font-bold text-ink/45">{item.due}</span>
                            </div>
                            <h3 className="mt-3 text-sm font-black">{item.title}</h3>
                            <p className="mt-1 text-sm font-semibold text-ink/58">
                              {item.owner} - {item.source} - {item.team}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(["Open", "In Review", "Done"] as ActionStatus[]).map((status) => (
                              <button
                                key={status}
                                type="button"
                                disabled={role === "Guest"}
                                onClick={() => updateActionStatus(item.id, status)}
                                className={cn(
                                  "h-8 rounded-full px-3 text-xs font-black ring-1 transition disabled:cursor-not-allowed disabled:opacity-45",
                                  item.status === status
                                    ? "bg-moss text-white ring-moss"
                                    : "bg-white text-ink/55 ring-graphite/10 hover:text-ink"
                                )}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workload Summary</CardTitle>
                  <Badge tone="iris">{auth?.user.team ?? currentOrganization.team}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["Open", "In Review", "Done"] as ActionStatus[]).map((status) => (
                    <div key={status} className="rounded-md border border-graphite/10 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black">{status}</p>
                        <Badge tone={statusTone[status]}>
                          {scopedActionItems.filter((item) => item.status === status).length}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink/58">
                        {status === "Done"
                          ? "Completed work stays linked to source evidence."
                          : "Open work remains visible in the organization timeline."}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className={cn("mt-5 grid gap-5", activeSection !== "dashboard" && activeSection !== "timeline" && "hidden")}>
              <Card className={cn(activeSection !== "dashboard" && "hidden")}>
                <CardHeader>
                  <CardTitle>Dashboard Widgets</CardTitle>
                  <Badge tone={dashboard ? "moss" : "graphite"}>{dashboard ? "Live workspace" : "Preview data"}</Badge>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <Widget title="Recent Meetings" icon={Users} items={meetingItems} />
                  <Widget title="Recent Decisions" icon={ShieldCheck} items={decisionItems} />
                  <Widget title="Recent Documents" icon={FileText} items={documentItems} />
                  <Widget title="Pending Actions" icon={Clock3} items={pendingItems} />
                </CardContent>
              </Card>

              <Card id="workspace-timeline" className={cn("scroll-mt-36", activeSection !== "timeline" && "hidden")}>
                <CardHeader>
                  <div>
                    <CardTitle>Timeline Intelligence</CardTitle>
                    <p className="mt-1 text-sm text-ink/58">Filtered by {role} permissions</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setConnectionMessage(
                        `Timeline is locked to ${role} permissions for ${auth?.organization.name ?? currentOrganization.name}.`
                      )
                    }
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="relative space-y-4 pl-7">
                    <div className="timeline-line absolute bottom-3 left-2 top-3 w-0.5 rounded-full" />
                    {visibleTimeline.map((event) => (
                      <div key={event.id} className="relative rounded-md border border-graphite/10 bg-porcelain p-4">
                        <span className="absolute -left-[29px] top-5 h-4 w-4 rounded-full border-2 border-white bg-moss shadow-hairline" />
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={toneByType[event.type]}>{event.type}</Badge>
                          <span className="text-xs font-bold text-ink/45">{event.time}</span>
                        </div>
                        <h3 className="mt-3 text-sm font-black">{event.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-ink/65">{event.detail}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink/50">
                          <span>{event.project}</span>
                          <span>{event.team}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className={cn("mt-5 grid gap-5", activeSection !== "search" && activeSection !== "ask" && "hidden")}>
              <Card id="workspace-search" className={cn("scroll-mt-36", activeSection !== "search" && "hidden")}>
                <CardHeader>
                  <CardTitle>Enterprise Search</CardTitle>
                  <Badge tone={apiSearch ? "moss" : "iris"}>
                    <Database className="mr-1 h-3.5 w-3.5" />
                    {apiSearch ? "Workspace results" : "Evidence index"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-ink/40" />
                    <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} />
                  </div>
                  <div className="mt-4 space-y-3">
                    {isSearching && <p className="text-sm font-semibold text-ink/50">Searching authorized knowledge...</p>}
                    {visibleSearchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.title}`}
                        type="button"
                        onClick={() =>
                          setSelectedEvidence({
                            type: normalizeEvidenceType(result.type),
                            title: result.title,
                            excerpt: result.snippet
                          })
                        }
                        className="w-full rounded-md border border-graphite/10 bg-porcelain p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-hairline"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Badge tone="graphite">{result.type}</Badge>
                          <span className="text-xs font-bold text-moss">{Math.round(result.score * 100)}%</span>
                        </div>
                        <h3 className="mt-3 text-sm font-black">{result.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-ink/65">{result.snippet}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card id="workspace-ask" className={cn("scroll-mt-36", activeSection !== "ask" && "hidden")}>
                <CardHeader>
                  <CardTitle>Ask Memoris</CardTitle>
                  <Badge tone={answerAllowed ? "moss" : "coral"}>
                    {answerAllowed ? (
                      <MessageSquareText className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <Lock className="mr-1 h-3.5 w-3.5" />
                    )}
                    {answerAllowed ? "Evidence-backed" : "Denied"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input value={question} onChange={(event) => setQuestion(event.target.value)} />
                    <Button variant="default" size="icon" title="Ask" onClick={ask} disabled={isAsking}>
                      {isAsking ? <Clock3 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="mt-4 rounded-lg border border-graphite/10 bg-graphite p-5 text-white">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <MessageSquareText className="h-4 w-4 text-saffron" />
                      Answer
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/78">{answer}</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {askEvidence.map((item) => (
                      <button
                        key={`${item.type}-${item.title}`}
                        type="button"
                        onClick={() => setSelectedEvidence(item)}
                        className="rounded-md border border-graphite/10 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:bg-porcelain hover:shadow-hairline"
                      >
                        <Badge tone="saffron">{item.type}</Badge>
                        <h3 className="mt-3 text-sm font-black">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-ink/62">{item.excerpt}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section
              id="workspace-members"
              className={cn(
                "mt-5 scroll-mt-36 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]",
                activeSection !== "members" && "hidden"
              )}
            >
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Organization Members</CardTitle>
                    <p className="mt-1 text-sm text-ink/58">Admin view of people, roles, teams, and invite state.</p>
                  </div>
                  <Badge tone="moss">{organizationMembers.length} members</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {organizationMembers.map((member) => (
                      <div key={member.email} className="rounded-lg border border-graphite/10 bg-porcelain p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-black">{member.name}</h3>
                            <p className="mt-1 truncate text-sm font-semibold text-ink/58">{member.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge tone={member.role === "Owner" ? "iris" : member.role === "Guest" ? "graphite" : "moss"}>
                              {member.role}
                            </Badge>
                            <Badge tone={member.status === "Active" ? "moss" : "saffron"}>{member.status}</Badge>
                          </div>
                        </div>
                        <p className="mt-3 text-xs font-bold uppercase text-ink/45">{member.team}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Invite Controls</CardTitle>
                  <Badge tone="iris">Admin</Badge>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-graphite/10 bg-porcelain p-4">
                    <p className="text-xs font-bold uppercase text-ink/45">Recommended next backend endpoint</p>
                    <h3 className="mt-2 text-lg font-black">Invite member by email</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/62">
                      The UI is ready for member invites. The production endpoint should create an invitation, assign a
                      role, and write an audit timeline event.
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Input placeholder="teammate@company.com" disabled />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={auth?.user.team ?? currentOrganization.team} disabled />
                      <Input value="Employee" disabled />
                    </div>
                    <Button className="justify-center" disabled>
                      <UserPlus className="h-4 w-4" />
                      Invite member
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section
              id="workspace-rbac"
              className={cn(
                "mt-5 scroll-mt-36 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]",
                activeSection !== "rbac" && "hidden"
              )}
            >
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>{canInspectAccessMatrix ? "Role-Based Access Control" : "Your Access Scope"}</CardTitle>
                    <p className="mt-1 text-sm text-ink/58">
                      {canInspectAccessMatrix
                        ? "Workspace administrators can review how access is segmented."
                        : "You only see the workspace knowledge available to your role and team."}
                    </p>
                  </div>
                  <Badge tone="moss">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    Enforced
                  </Badge>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleAccessRoles.map((item) => (
                    <div
                      key={item}
                      className={cn(
                        "rounded-md border p-4",
                        item === role ? "border-moss/40 bg-moss/10" : "border-graphite/10 bg-porcelain"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-black">{item}</h3>
                        {item === role && <Badge tone="moss">Current</Badge>}
                      </div>
                      <div className="mt-3 space-y-2">
                        {roleCapabilities[item].map((capability) => (
                          <div key={capability} className="flex gap-2 text-xs font-semibold leading-5 text-ink/62">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss" />
                            {capability}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="rounded-md border border-graphite/10 bg-white p-4 md:col-span-2 xl:col-span-1">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-moss" />
                      <h3 className="text-sm font-black">Search Scope</h3>
                    </div>
                    <div className="mt-3 space-y-2">
                      {searchScopeByRole[role].map((scope) => (
                        <div key={scope} className="flex gap-2 text-xs font-semibold leading-5 text-ink/62">
                          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saffron" />
                          {scope}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Locked Session</CardTitle>
                  <Badge tone="iris">{role}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-graphite/10 bg-porcelain p-4">
                    <p className="text-xs font-bold uppercase text-ink/45">Signed in account</p>
                    <h3 className="mt-2 text-lg font-black">{auth?.user.fullName ?? "Demo user"}</h3>
                    <p className="mt-1 text-sm font-semibold text-ink/60">{auth?.user.email ?? "not signed in"}</p>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm font-semibold text-ink/65">
                    <div className="flex items-center justify-between gap-3 rounded-md border border-graphite/10 bg-white p-3">
                      <span>Organization</span>
                      <span className="truncate text-right text-ink">{auth?.organization.name ?? currentOrganization.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-graphite/10 bg-white p-3">
                      <span>Team</span>
                      <span className="truncate text-right text-ink">{auth?.user.team ?? currentOrganization.team}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-graphite/10 bg-white p-3">
                      <span>Switching</span>
                      <span className="text-right text-ink">Logout required</span>
                    </div>
                  </div>
                  <Button className="mt-5 w-full justify-center" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    Logout and choose another account
                  </Button>
                </CardContent>
              </Card>
            </section>

            {selectedEvidence && (
              <EvidenceDrawer
                evidence={selectedEvidence}
                organizationName={auth?.organization.name ?? currentOrganization.name}
                role={role}
                onClose={() => setSelectedEvidence(null)}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function LandingPage({
  backendReady,
  onOpenLogin,
  onOpenRegister
}: {
  backendReady: boolean;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}) {
  return (
    <main className="min-h-screen bg-porcelain text-ink">
      <section className="relative min-h-[88vh] overflow-hidden bg-graphite text-white">
        <MemoryScene />
        <div className="absolute inset-0 bg-graphite/75" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-graphite to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-center gap-3">
            <BrandLockup tone="dark" />
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={onOpenLogin}>
                <KeyRound className="h-4 w-4" />
                Login
              </Button>
              <Button className="bg-white text-graphite hover:bg-cloud" onClick={onOpenRegister}>
                <ArrowRight className="h-4 w-4" />
                Register
              </Button>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.08fr_0.92fr]">
            <section className="max-w-3xl animate-rise">
              <Badge tone="moss">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Secure organizational memory
              </Badge>
              <h2 className="mt-6 text-5xl font-black leading-none tracking-normal sm:text-6xl lg:text-7xl">
                Memoris OS
              </h2>
              <p className="mt-5 max-w-2xl text-xl font-semibold leading-8 text-white/86 sm:text-2xl">
                A private workspace for decisions, meetings, documents, timelines, and evidence-backed AI answers.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/64">
                Memoris captures what happened, why it happened, who owns the next step, and which source proves it.
                Every answer is filtered through the signed-in user&apos;s organization and role.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="h-12 bg-white px-5 text-graphite hover:bg-cloud" onClick={onOpenLogin}>
                  <KeyRound className="h-4 w-4" />
                  Login
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-white/20 bg-white/10 px-5 text-white hover:bg-white/20"
                  onClick={onOpenRegister}
                >
                  <Building2 className="h-4 w-4" />
                  Register organization
                </Button>
              </div>
            </section>

            <section className="animate-rise-delayed rounded-lg border border-white/10 bg-white/10 p-5 shadow-premium backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase text-white/50">Workspace model</p>
                  <h3 className="mt-1 text-2xl font-black tracking-normal">From scattered context to trusted memory</h3>
                </div>
                <Badge tone={backendReady ? "moss" : "coral"}>{backendReady ? "Workspace ready" : "Preview"}</Badge>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  ["Capture", "Upload transcripts and documents into one secure workspace", UploadCloud],
                  ["Structure", "Extract summaries, decisions, action items, owners, and topics", Database],
                  ["Trace", "Turn important activity into a timeline your team can audit", GitBranch],
                  ["Answer", "Ask questions and receive authorized evidence only", MessageSquareText]
                ].map(([title, detail, Icon]) => (
                  <div key={title as string} className="rounded-lg border border-white/10 bg-graphite/45 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/10">
                        <Icon className="h-5 w-5 text-saffron" />
                      </div>
                      <div>
                        <p className="text-sm font-black">{title as string}</p>
                        <p className="mt-1 text-sm leading-6 text-white/62">{detail as string}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="border-y border-graphite/10 bg-white py-8">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            ["Problem", "Context is buried across meetings, docs, and manual decisions."],
            ["Solution", "Memoris structures knowledge and links every answer back to evidence."],
            ["Trust", "RBAC filters data before search or AI ever receives context."]
          ].map(([title, detail]) => (
            <div key={title} className="rounded-lg border border-graphite/10 bg-porcelain p-5">
              <p className="text-xs font-black uppercase text-moss">{title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink/72">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function LoginPage({
  authError,
  backendReady,
  connection,
  connectionMessage,
  currentOrganization,
  loadingRole,
  organizationKey,
  role,
  onBack,
  onEnter,
  onOpenRegister,
  onOrganizationChange,
  onRoleChange
}: {
  authError: string | null;
  backendReady: boolean;
  connection: ConnectionState;
  connectionMessage: string;
  currentOrganization: DemoOrganization;
  loadingRole: Role | null;
  organizationKey: DemoOrganizationKey;
  role: Role;
  onBack: () => void;
  onEnter: () => void;
  onOpenRegister: () => void;
  onOrganizationChange: (organizationKey: DemoOrganizationKey) => void;
  onRoleChange: (role: Role) => void;
}) {
  const entering = connection === "connecting" && loadingRole === role;
  const selectedCredentials = demoCredentials[organizationKey][role];

  return (
    <main className="min-h-screen bg-porcelain text-ink">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid w-full items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden max-w-xl animate-rise lg:block">
            <button className="text-left outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-moss" onClick={onBack}>
              <BrandLockup tone="light" />
            </button>
            <h2 className="mt-8 text-4xl font-black leading-tight tracking-normal text-ink sm:text-5xl">
              Sign in to a secure organization memory.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink/62">
              Each workspace has isolated meetings, documents, decisions, action items, timeline events, and search
              evidence. Pick a demo account to see exactly how the signed-in role changes access.
            </p>
            <div className="mt-7 grid grid-cols-3 gap-3">
              {["Tenant isolation", "RBAC first", "Evidence answers"].map((item) => (
                <div key={item} className="rounded-lg border border-graphite/10 bg-white p-4 shadow-hairline">
                  <p className="text-sm font-black leading-5">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-md animate-rise-delayed rounded-lg border border-graphite/10 bg-white p-5 shadow-premium sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <button className="text-left outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-moss lg:hidden" onClick={onBack}>
                <BrandLockup tone="light" />
              </button>
              <div className="hidden lg:block">
                <p className="text-xs font-bold uppercase text-moss">Memoris OS</p>
                <h1 className="mt-1 text-2xl font-black tracking-normal">Sign in</h1>
              </div>
              <Badge tone={backendReady ? "moss" : "coral"}>{backendReady ? "Ready" : "Preview"}</Badge>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase text-ink/50">Organization</span>
                <select
                  value={organizationKey}
                  onChange={(event) => onOrganizationChange(event.target.value as DemoOrganizationKey)}
                  className="mt-2 h-11 w-full rounded-md border border-graphite/10 bg-porcelain px-3 text-sm font-bold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
                >
                  {demoOrganizations.map((organization) => (
                    <option key={organization.key} value={organization.key}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-ink/50">Role</span>
                <select
                  value={role}
                  onChange={(event) => onRoleChange(event.target.value as Role)}
                  className="mt-2 h-11 w-full rounded-md border border-graphite/10 bg-porcelain px-3 text-sm font-bold text-ink outline-none transition focus:border-moss focus:ring-4 focus:ring-moss/10"
                >
                  {roles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-lg border border-graphite/10 bg-porcelain p-4">
                <p className="text-xs font-bold uppercase text-ink/45">Demo account</p>
                <p className="mt-2 truncate text-sm font-black">{selectedCredentials.email}</p>
                <p className="mt-1 text-xs font-semibold text-ink/52">Password: password123</p>
              </div>
            </div>

            {authError && (
              <div className="mt-4 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-semibold leading-5 text-coral">
                {authError}
              </div>
            )}

            <Button className="mt-5 h-12 w-full justify-center" variant="default" onClick={onEnter} disabled={entering}>
              {entering && <Clock3 className="h-4 w-4 animate-spin" />}
              {entering ? "Signing in" : `Sign in as ${role}`}
            </Button>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <button className="font-black text-moss transition hover:text-graphite" onClick={onOpenRegister}>
                Create account
              </button>
              <span className={cn("font-semibold", connection === "connected" ? "text-moss" : "text-ink/45")}>
                {connection === "connected" ? "Backend connected" : connectionMessage}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function RegisterPage({
  authError,
  backendReady,
  form,
  isRegistering,
  mode,
  onBack,
  onFieldChange,
  onModeChange,
  onOpenLogin,
  onSubmit
}: {
  authError: string | null;
  backendReady: boolean;
  form: RegisterFormState;
  isRegistering: boolean;
  mode: RegisterMode;
  onBack: () => void;
  onFieldChange: <K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]) => void;
  onModeChange: (mode: RegisterMode) => void;
  onOpenLogin: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="min-h-screen bg-porcelain text-ink">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid w-full items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden max-w-xl animate-rise lg:block">
            <button className="text-left outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-moss" onClick={onBack}>
              <BrandLockup tone="light" />
            </button>
            <h2 className="mt-8 text-4xl font-black leading-tight tracking-normal text-ink sm:text-5xl">
              Create a private organization memory.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink/62">
              Register a workspace for your organization, invite members later, and keep every meeting, document,
              decision, and AI answer isolated by tenant.
            </p>
            <div className="mt-7 grid grid-cols-3 gap-3">
              {["Owner setup", "Team access", "Secure history"].map((item) => (
                <div key={item} className="rounded-lg border border-graphite/10 bg-white p-4 shadow-hairline">
                  <p className="text-sm font-black leading-5">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="mx-auto w-full max-w-2xl animate-rise-delayed rounded-lg border border-graphite/10 bg-white p-5 shadow-premium sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <button className="text-left outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-moss lg:hidden" onClick={onBack} type="button">
                <BrandLockup tone="light" />
              </button>
              <div className="hidden lg:block">
                <p className="text-xs font-bold uppercase text-moss">Account setup</p>
                <h1 className="mt-1 text-2xl font-black tracking-normal">Create account</h1>
              </div>
              <Badge tone={backendReady ? "moss" : "coral"}>{backendReady ? "Ready" : "Preview"}</Badge>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg border border-graphite/10 bg-porcelain p-1">
              {[
                ["create", "Create org"],
                ["join", "Join org"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                  onClick={() => onModeChange(value as RegisterMode)}
                  className={cn(
                    "h-10 rounded-md text-sm font-black transition",
                    mode === value ? "bg-graphite text-white shadow-hairline" : "text-ink/58 hover:bg-white"
                  )}
                >
                  {label}
              </button>
            ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField label="Full name">
                <Input
                  required
                  value={form.fullName}
                  onChange={(event) => onFieldChange("fullName", event.target.value)}
                  placeholder="Prince Sherathiya"
                />
              </FormField>
              <FormField label="Work email">
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => onFieldChange("email", event.target.value)}
                  placeholder="you@company.com"
                />
              </FormField>
              <FormField label="Password">
                <Input
                  required
                  minLength={8}
                  type="password"
                  value={form.password}
                  onChange={(event) => onFieldChange("password", event.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </FormField>
              <FormField label="Team">
                <Input
                  required
                  value={form.team}
                  onChange={(event) => onFieldChange("team", event.target.value)}
                  placeholder="Platform"
                />
              </FormField>
              <FormField label={mode === "create" ? "Organization name" : "Existing organization name"}>
                <Input
                  required
                  value={form.organizationName}
                  onChange={(event) => onFieldChange("organizationName", event.target.value)}
                  placeholder={mode === "create" ? "Acme Systems" : "Memoris Labs"}
                />
              </FormField>
              {mode === "join" ? (
                <FormField label="Organization slug">
                  <Input
                    required
                    value={form.organizationSlug}
                    onChange={(event) => onFieldChange("organizationSlug", event.target.value)}
                    placeholder="memoris-labs"
                  />
                </FormField>
              ) : (
                <div className="rounded-lg border border-graphite/10 bg-porcelain p-4">
                  <p className="text-xs font-black uppercase text-ink/45">Role</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ink/62">New organization creators become Owner.</p>
                </div>
              )}
            </div>

            {mode === "join" && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase text-ink/50">Requested role</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roles
                    .filter((item) => item !== "Owner" && item !== "Admin")
                    .map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => onFieldChange("requestedRole", item)}
                        className={cn(
                          "h-9 rounded-full px-4 text-xs font-black ring-1 transition",
                          form.requestedRole === item
                            ? "bg-graphite text-white ring-graphite"
                            : "bg-porcelain text-ink/62 ring-graphite/10 hover:bg-white hover:text-ink"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {authError && (
              <div className="mt-4 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-semibold leading-5 text-coral">
                {authError}
              </div>
            )}

            <Button className="mt-5 h-12 w-full justify-center" variant="default" type="submit" disabled={isRegistering}>
              {isRegistering && <Clock3 className="h-4 w-4 animate-spin" />}
              {isRegistering ? "Creating workspace" : "Create workspace"}
            </Button>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <button className="font-black text-moss transition hover:text-graphite" onClick={onOpenLogin} type="button">
                Already have an account
              </button>
              <span className="font-semibold text-ink/45">
                {mode === "create" ? "Owner access on creation" : "Role request sent after join"}
              </span>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function BrandLockup({ tone }: { tone: "light" | "dark" }) {
  const dark = tone === "dark";

  return (
    <div className="flex items-center gap-3 text-left">
      <div>
        <p className={cn("text-xs font-bold uppercase", dark ? "text-white/50" : "text-ink/50")}>Enterprise Memory</p>
        <h1 className={cn("text-xl font-black tracking-normal", dark ? "text-white" : "text-ink")}>Memoris OS</h1>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-ink/50">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function MemoryScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111312");

    const camera = new THREE.PerspectiveCamera(44, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0.75, 9.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.domElement.className = "memory-scene-canvas";
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);

    const ambient = new THREE.AmbientLight("#ffffff", 0.66);
    const key = new THREE.DirectionalLight("#f3d58b", 2.2);
    key.position.set(4, 5, 6);
    const fill = new THREE.DirectionalLight("#7cc5b5", 1.5);
    fill.position.set(-5, -1, 4);
    scene.add(ambient, key, fill);

    const geometry = new THREE.BoxGeometry(0.82, 0.18, 0.5);
    const colors = ["#2f7d68", "#c7922b", "#d95043", "#5865d8", "#ecece6"];
    const positions: THREE.Vector3[] = [];
    const materials: THREE.Material[] = [];

    for (let i = 0; i < 34; i += 1) {
      const ring = i % 2 === 0 ? 3.4 : 4.55;
      const angle = i * 0.62;
      const y = Math.sin(i * 0.74) * 1.7;
      const position = new THREE.Vector3(Math.cos(angle) * ring, y, Math.sin(angle) * ring - 0.7);
      positions.push(position);

      const material = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        emissive: colors[i % colors.length],
        emissiveIntensity: i % 5 === 4 ? 0.08 : 0.18,
        metalness: 0.42,
        roughness: 0.36
      });
      materials.push(material);

      const block = new THREE.Mesh(geometry, material);
      block.position.copy(position);
      block.rotation.set(Math.sin(i) * 0.24, angle, Math.cos(i) * 0.18);
      root.add(block);
    }

    const lineMaterial = new THREE.LineBasicMaterial({ color: "#d7e8df", transparent: true, opacity: 0.28 });
    const lineGeometries: THREE.BufferGeometry[] = [];
    for (let i = 0; i < positions.length; i += 1) {
      const next = positions[(i + 5) % positions.length];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([positions[i], next]);
      lineGeometries.push(lineGeometry);
      root.add(new THREE.Line(lineGeometry, lineMaterial));
    }

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    mount.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", onResize);

    let frameId = 0;
    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      root.rotation.y += 0.0035;
      root.rotation.x += (pointer.y * 0.16 - root.rotation.x) * 0.035;
      root.rotation.z += (pointer.x * 0.08 - root.rotation.z) * 0.035;
      root.position.y = Math.sin(Date.now() * 0.0008) * 0.18;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      mount.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      lineGeometries.forEach((lineGeometry) => lineGeometry.dispose());
      materials.forEach((material) => material.dispose());
      lineMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}

function OutputPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-graphite/10 bg-porcelain p-3">
      <p className="text-xs font-bold uppercase text-ink/45">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function Widget({
  title,
  icon: Icon,
  items
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: string[];
}) {
  return (
    <div className="rounded-md border border-graphite/10 bg-porcelain p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-moss" />
        <h3 className="text-sm font-black">{title}</h3>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="line-clamp-2 text-sm leading-5 text-ink/62">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function StatusTile({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
}) {
  return (
    <div className="rounded-lg border border-graphite/10 bg-white p-4 shadow-hairline">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase text-ink/45">{label}</p>
        <Badge tone={tone}>{tone === "moss" ? "Live" : tone === "saffron" ? "Checking" : "Info"}</Badge>
      </div>
      <p className="mt-3 truncate text-lg font-black text-ink">{value}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink/52">{detail}</p>
    </div>
  );
}

function EvidenceDrawer({
  evidence,
  organizationName,
  role,
  onClose
}: {
  evidence: Evidence;
  organizationName: string;
  role: Role;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-graphite/30 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" aria-label="Close evidence viewer" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col rounded-lg border border-graphite/10 bg-white shadow-premium">
        <div className="flex items-start justify-between gap-3 border-b border-graphite/10 p-5">
          <div>
            <p className="text-xs font-bold uppercase text-moss">Evidence Viewer</p>
            <h2 className="mt-1 text-2xl font-black tracking-normal">{evidence.title}</h2>
          </div>
          <Button variant="outline" size="icon" title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="saffron">{evidence.type}</Badge>
            <Badge tone="iris">{role}</Badge>
            <Badge tone="graphite">{organizationName}</Badge>
          </div>
          <div className="mt-5 rounded-lg border border-graphite/10 bg-porcelain p-4">
            <p className="text-xs font-bold uppercase text-ink/45">Authorized excerpt</p>
            <p className="mt-3 text-sm leading-7 text-ink/72">{evidence.excerpt}</p>
          </div>
          <div className="mt-4 grid gap-3">
            {[
              ["Permission check", "Passed before this evidence was shown."],
              ["Tenant scope", "Only this organization context is visible."],
              ["AI safety rule", "Evidence is reviewed before it is sent to answer generation."]
            ].map(([label, detail]) => (
              <div key={label} className="rounded-md border border-graphite/10 bg-white p-4">
                <p className="text-sm font-black">{label}</p>
                <p className="mt-1 text-sm leading-6 text-ink/58">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function mapTimelineEvent(event: TimelineResponse): TimelineEvent {
  return {
    id: event.id,
    time: new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(event.occurredAt)),
    type: normalizeTimelineType(event.eventType),
    title: event.title,
    detail: event.description,
    project: event.project ?? "Enterprise Memory MVP",
    team: event.team
  };
}

function mapSearchResult(result: SearchResponse["results"][number]): SearchResult {
  return {
    type: normalizeSearchType(result.type),
    title: result.title,
    snippet: result.snippet ?? "Authorized record matched the query.",
    score: result.score
  };
}

function normalizeTimelineType(value: string): TimelineEvent["type"] {
  switch (value) {
    case "MEETING_CREATED":
      return "Meeting Created";
    case "AI_SUMMARY_GENERATED":
      return "AI Summary Generated";
    case "DECISION_ADDED":
      return "Decision Added";
    case "ACTION_ITEM_ASSIGNED":
      return "Action Items Assigned";
    case "DOCUMENT_UPLOADED":
      return "Document Uploaded";
    default:
      return "AI Summary Generated";
  }
}

function normalizeSearchType(value: string): SearchResult["type"] {
  if (value === "Timeline") return "Timeline Event";
  if (value === "Meeting" || value === "Decision" || value === "Document" || value === "Project") {
    return value;
  }
  return "Document";
}

function normalizeEvidenceType(value: string): Evidence["type"] {
  if (value === "Timeline") return "Timeline Event";
  if (value === "Meeting" || value === "Decision" || value === "Document" || value === "Timeline Event") {
    return value;
  }
  return "Document";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cleanApiError(message: string) {
  try {
    const parsed = JSON.parse(message) as { error?: string; message?: string; status?: number };
    if (parsed.message) {
      return parsed.message;
    }
    if (parsed.error) {
      return parsed.error;
    }
  } catch {
    // Keep the original service message when it is already plain text.
  }
  return message || "Request failed. Please check the workspace service and try again.";
}

export default App;
