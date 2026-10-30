import type { Timestamp } from "firebase-admin/firestore";

export type TaskStatus = "pending" | "seen" | "accepted" | "done";

export interface FamilyDoc {
  name: string;
  inviteCode: string;
  members: string[];
  createdBy: string;
  createdAt: Timestamp;
}

export interface TaskDoc {
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

export interface HistoryEventDoc {
  type: HistoryEventType;
  byUid: string;
  at: Timestamp;
  meta?: Record<string, unknown>;
}
