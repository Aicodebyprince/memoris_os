import {
  Activity,
  ArrowRight,
  Bell,
  Brain,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Filter,
  GitBranch,
  KeyRound,
  Lock,
  MessageSquareText,
  PanelLeft,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users
} from "lucide-react";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input, Textarea } from "./components/ui/input";
import {
  askMemoris,
  clearToken,
  getDashboard,
  getTimeline,
  healthCheck,
  login,
  processMeeting,
  searchKnowledge,
  storeToken,
  toRole,
  type AskResponse,
  type AuthProfile,
  type DashboardResponse,
  type ProcessMeetingResponse,
  type SearchResponse,
  type TimelineResponse
} from "./lib/api";
import {
  actionItems,
  buildPhases,
  defaultTranscript,
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
import type { Evidence, Role, SearchResult, TimelineEvent } from "./types/memoris";

type Tone = "moss" | "coral" | "saffron" | "iris" | "graphite";
type ConnectionState = "connecting" | "connected" | "offline";

const toneByType: Record<TimelineEvent["type"], Tone> = {
  "Meeting Created": "moss",
  "AI Summary Generated": "iris",
  "Decision Added": "saffron",
  "Action Items Assigned": "coral",
  "Document Uploaded": "graphite"
};

function App() {
  const [role, setRole] = useState<Role>("Owner");
  const [auth, setAuth] = useState<AuthProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [connectionMessage, setConnectionMessage] = useState("Trying demo backend login...");
  const [aiProvider, setAiProvider] = useState("local");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<Role | null>("Owner");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [apiTimeline, setApiTimeline] = useState<TimelineEvent[] | null>(null);
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processed, setProcessed] = useState(true);
  const [processOutput, setProcessOutput] = useState<ProcessMeetingResponse | null>(null);
  const [query, setQuery] = useState("CockroachDB");
  const [apiSearch, setApiSearch] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [question, setQuestion] = useState("Why did we choose CockroachDB?");
  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);

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
    async (nextRole: Role, silent = false) => {
      setRole(nextRole);
      setConnection("connecting");
      setLoadingRole(nextRole);
      setConnectionMessage(`${silent ? "Checking" : "Clicked"} ${nextRole}. Testing backend health...`);

      try {
        const health = await healthCheck();
        setAiProvider(health.aiProvider ?? "local");
        setConnectionMessage(`Backend OK. Logging in as ${nextRole}...`);
        const profile = await login(nextRole);
        storeToken(profile.token);
        setToken(profile.token);
        setAuth(profile);
        setRole(toRole(profile.user.role));
        setConnection("connected");
        await refreshWorkspace(profile.token);
        setConnectionMessage(`Connected as ${profile.user.fullName} (${profile.user.email})`);
      } catch (error) {
        clearToken();
        setToken(null);
        setAuth(null);
        setDashboard(null);
        setApiTimeline(null);
        setAiProvider("local");
        setConnection("offline");
        setConnectionMessage("Backend is not reachable yet. Demo data is showing while the UI retries.");
        if (!silent) {
          setRole(nextRole);
        }
        console.error(error);
      } finally {
        setLoadingRole(null);
      }
    },
    [refreshWorkspace]
  );

  useEffect(() => {
    void loginAs("Owner", true);
  }, [loginAs]);

  useEffect(() => {
    if (connection !== "offline" || token) {
      return;
    }

    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      void loginAs(role, true);
      if (attempts >= 20) {
        window.clearInterval(retry);
      }
    }, 2000);

    return () => window.clearInterval(retry);
  }, [connection, loginAs, role, token]);

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
      { label: "Timeline Events", value: String(dashboard.metrics.timelineEvents), delta: "live API", tone: "graphite" as Tone }
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
    return timeline.filter((event) => event.team === "Platform");
  }, [apiTimeline, role, timeline]);

  const localAskBlocked = question.toLowerCase().includes("salary") && role !== "Owner" && role !== "Admin";
  const answer = askResult
    ? askResult.answer
    : localAskBlocked
      ? "You do not have permission to access this information."
      : "We chose PostgreSQL first because it proves strong relational design, supports full-text search, and creates a clean path toward pgvector. CockroachDB stays as the future distributed SQL option when global scale demands it.";
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

  async function processTranscript() {
    setIsProcessing(true);
    try {
      if (token) {
        const result = await processMeeting(token, transcript);
        setProcessOutput(result);
        setProcessed(true);
        await refreshWorkspace(token);
        return;
      }

      setProcessOutput({
        meetingId: crypto.randomUUID(),
        summary: "The team aligned on PostgreSQL, RBAC-first retrieval, Timeline Intelligence, and a future pgvector semantic search path.",
        decisions: [
          {
            id: crypto.randomUUID(),
            title: "RBAC before AI context",
            rationale: "Permission filtering is required before model retrieval.",
            status: "ACCEPTED"
          }
        ],
        actionItems: [
          {
            id: crypto.randomUUID(),
            title: "Publish architecture decision record",
            ownerName: "Platform Lead",
            status: "OPEN",
            dueDate: null
          }
        ],
        participants: ["Prince", "Asha"],
        topics: ["PostgreSQL", "RBAC", "Timeline Intelligence"],
        timeline: ["AI Summary Generated", "Decision Added", "Action Items Assigned"]
      });
      setApiTimeline(null);
      setProcessed(true);
    } finally {
      setIsProcessing(false);
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
        answer: "Ask Memoris could not reach the backend right now.",
        evidence: []
      });
    } finally {
      setIsAsking(false);
    }
  }

  async function checkApiNow() {
    try {
      setConnection("connecting");
      setConnectionMessage("Checking backend health and logging in again...");
      await loginAs(role);
    } catch {
      setConnection("offline");
    }
  }

  return (
    <main className="min-h-screen bg-porcelain text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-graphite/10 bg-graphite text-white lg:block">
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-moss text-white">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/60">Enterprise Memory</p>
                <h1 className="text-xl font-bold tracking-normal">Memoris OS</h1>
              </div>
            </div>

            <nav className="mt-10 space-y-1">
              {[
                ["Dashboard", Activity],
                ["Knowledge", UploadCloud],
                ["Timeline", GitBranch],
                ["Search", Search],
                ["Ask Memoris", Sparkles],
                ["RBAC", ShieldCheck]
              ].map(([label, Icon]) => (
                <button
                  key={label as string}
                  className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-white/72 transition hover:bg-white/8 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                  {label as string}
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-lg border border-white/10 bg-white/6 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Building2 className="h-4 w-4 text-saffron" />
                {auth?.organization.name ?? "Memoris Labs"}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/65">
                <span>Tenant</span>
                <span className="text-right text-white">{auth?.organization.slug ?? "memoris-labs"}</span>
                <span>Backend</span>
                <span className="text-right text-white">{connection === "connected" ? "Live" : "Demo"}</span>
                <span>User</span>
                <span className="truncate text-right text-white">{auth?.user.email ?? "not signed in"}</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-graphite/10 bg-porcelain/88 px-4 py-3 backdrop-blur xl:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" title="Menu">
                <PanelLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-moss">Command Center</p>
                <h2 className="truncate text-2xl font-black tracking-normal text-ink">Memoris OS Workspace</h2>
              </div>
              <div className="ml-auto flex min-w-0 items-center gap-2">
                <div className="hidden w-72 md:block">
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search" />
                </div>
                <Button variant="outline" size="icon" title="Refresh" onClick={() => token && refreshWorkspace(token)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" title="Notifications">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {roles.map((item) => (
                <button
                  key={item}
                  onClick={() => void loginAs(item)}
                  disabled={loadingRole === item}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs font-bold ring-1 transition disabled:cursor-wait disabled:opacity-70",
                    role === item
                      ? "bg-graphite text-white ring-graphite"
                      : "bg-white text-ink ring-graphite/10 hover:ring-moss/35"
                  )}
                >
                  {loadingRole === item ? "..." : item}
                </button>
              ))}
              <Badge tone={connection === "connected" ? "moss" : connection === "connecting" ? "saffron" : "coral"}>
                <KeyRound className="mr-1 h-3.5 w-3.5" />
                {connection === "connected" ? `${role} API` : connection === "connecting" ? "Connecting" : "Demo mode"}
              </Badge>
              <Button variant="outline" size="sm" onClick={checkApiNow}>
                <RefreshCw className="h-4 w-4" />
                Check API
              </Button>
              <span className="max-w-full truncate text-xs font-semibold text-ink/50">{connectionMessage}</span>
            </div>
          </header>

          <div className="soft-grid px-4 py-6 xl:px-8">
            <section className="mb-5 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
              <StatusTile
                label="Backend"
                value={connection === "connected" ? "Connected" : connection === "connecting" ? "Checking" : "Demo fallback"}
                detail={connection === "connected" ? "Spring Boot API + JWT active" : "Click Check API after backend starts"}
                tone={connection === "connected" ? "moss" : connection === "connecting" ? "saffron" : "coral"}
              />
              <StatusTile
                label="Signed In"
                value={auth ? auth.user.fullName : "No API user"}
                detail={auth ? `${auth.user.role} - ${auth.user.team} - ${auth.user.email}` : "Using local demo cards"}
                tone={auth ? "iris" : "graphite"}
              />
              <StatusTile
                label="AI Provider"
                value={connection === "connected" ? displayProvider(aiProvider) : "Local fallback"}
                detail={lastSync ? `Last API sync ${lastSync}` : "Gemini turns on when GEMINI_API_KEY is set"}
                tone={aiProvider === "gemini" && connection === "connected" ? "moss" : "graphite"}
              />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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

            <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Upload Knowledge</CardTitle>
                    <p className="mt-1 text-sm text-ink/58">Meeting transcript - API connected when backend is running</p>
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
                    <Badge tone="graphite">{token ? "Stored via API" : "Demo fallback"}</Badge>
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
                      {processOutput?.summary ??
                        "The team aligned on PostgreSQL, RBAC-first retrieval, Timeline Intelligence, and a future pgvector semantic search path."}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <OutputPill label="Participants" value={processOutput?.participants.join(", ") ?? "Prince, Asha"} />
                    <OutputPill label="Topics" value={processOutput?.topics.join(", ") ?? "PostgreSQL, RBAC"} />
                    <OutputPill label="Decisions" value={`${processOutput?.decisions.length ?? 2} captured`} />
                    <OutputPill label="Actions" value={`${processOutput?.actionItems.length ?? 3} assigned`} />
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard Widgets</CardTitle>
                  <Badge tone={dashboard ? "moss" : "graphite"}>{dashboard ? "API data" : "Demo data"}</Badge>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <Widget title="Recent Meetings" icon={Users} items={meetingItems} />
                  <Widget title="Recent Decisions" icon={ShieldCheck} items={decisionItems} />
                  <Widget title="Recent Documents" icon={FileText} items={documentItems} />
                  <Widget title="Pending Actions" icon={Clock3} items={pendingItems} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Timeline Intelligence</CardTitle>
                    <p className="mt-1 text-sm text-ink/58">Filtered by {role} permissions</p>
                  </div>
                  <Button variant="outline" size="sm">
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

            <section className="mt-5 grid gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise Search</CardTitle>
                  <Badge tone={apiSearch ? "moss" : "iris"}>
                    <Database className="mr-1 h-3.5 w-3.5" />
                    {apiSearch ? "API search" : "PostgreSQL FTS path"}
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
                      <div key={`${result.type}-${result.title}`} className="rounded-md border border-graphite/10 bg-porcelain p-4">
                        <div className="flex items-center justify-between gap-3">
                          <Badge tone="graphite">{result.type}</Badge>
                          <span className="text-xs font-bold text-moss">{Math.round(result.score * 100)}%</span>
                        </div>
                        <h3 className="mt-3 text-sm font-black">{result.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-ink/65">{result.snippet}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ask Memoris</CardTitle>
                  <Badge tone={answerAllowed ? "moss" : "coral"}>
                    {answerAllowed ? <Sparkles className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}
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
                      <div key={`${item.type}-${item.title}`} className="rounded-md border border-graphite/10 bg-white p-4">
                        <Badge tone="saffron">{item.type}</Badge>
                        <h3 className="mt-3 text-sm font-black">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-ink/62">{item.excerpt}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-4">
              {buildPhases.map((phase) => (
                <Card key={phase.name} className={phase.active ? "border-moss/30" : ""}>
                  <CardContent>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black">{phase.name}</h3>
                      <Badge tone={phase.active ? "moss" : "graphite"}>{phase.active ? "Now" : "Next"}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {phase.items.map((item) => (
                        <span key={item} className="rounded-full bg-graphite/6 px-3 py-1 text-xs font-semibold text-ink/64">
                          {item}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
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

function displayProvider(value: string) {
  if (value.toLowerCase() === "gemini") {
    return "Gemini";
  }
  return "Local AI";
}

export default App;
