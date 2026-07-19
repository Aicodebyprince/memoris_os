export type Role = "Owner" | "Admin" | "Manager" | "Employee" | "Guest";

export type TimelineEventType =
  | "Meeting Created"
  | "AI Summary Generated"
  | "Decision Added"
  | "Action Items Assigned"
  | "Document Uploaded";

export interface TimelineEvent {
  id: string;
  time: string;
  type: TimelineEventType;
  title: string;
  detail: string;
  project: string;
  team: string;
}

export interface Evidence {
  type: "Meeting" | "Decision" | "Document" | "Timeline Event";
  title: string;
  excerpt: string;
}

export interface SearchResult {
  type: "Meeting" | "Decision" | "Document" | "Timeline Event" | "Project";
  title: string;
  snippet: string;
  score: number;
}
