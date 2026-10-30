import type { Timestamp } from "firebase/firestore";

export type TaskStatus = "pending" | "seen" | "accepted" | "done";

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  members: string[];
  createdBy: string;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: Timestamp;
  assignees: string[];
  deadline: Timestamp;
  status: TaskStatus;
  nextReminderAt: Timestamp | null;
  remindersSent: string[];
}

export type HistoryEventType =
  | "created"
  | "seen"
  | "accepted"
  | "status_changed"
  | "deadline_changed";

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  byUid: string;
  at: Timestamp;
  meta?: Record<string, unknown>;
}
