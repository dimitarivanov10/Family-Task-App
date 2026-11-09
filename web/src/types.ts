import type { Timestamp } from "firebase/firestore";

export type TaskStatus =
  | "pending"
  | "seen"
  | "accepted"
  | "done"
  | "declined"
  | "verified"
  | "archived"
  | "cancelled";

export interface Family {
  id: string;
  name: string;
  members: string[];
  memberNames: Record<string, string>;
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
  proposedDeadline: Timestamp | null;
  proposedBy: string | null;
  effectiveDeadline: Timestamp | null;
  declineReason: string | null;
  declinedBy: string | null;
  verifiedAt: Timestamp | null;
  verifiedBy: string | null;
  archivedAt: Timestamp | null;
  cancelledAt: Timestamp | null;
  cancelReason: string | null;
  lastHistoryEventId: string;
}

export type HistoryEventType =
  | "created"
  | "seen"
  | "accepted"
  | "status_changed"
  | "declined"
  | "deadline_proposed"
  | "deadline_accepted"
  | "verified"
  | "archived"
  | "cancelled";

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  byUid: string;
  at: Timestamp;
  meta?: Record<string, unknown>;
}
