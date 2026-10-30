export interface ReminderOffset {
  label: string;
  ms: number;
}

// Ordered from furthest-before-deadline to closest, matching the required
// reminder schedule: 5h, 1h, 30min, 10min before the deadline.
export const REMINDER_OFFSETS: ReminderOffset[] = [
  { label: "5h", ms: 5 * 60 * 60 * 1000 },
  { label: "1h", ms: 60 * 60 * 1000 },
  { label: "30m", ms: 30 * 60 * 1000 },
  { label: "10m", ms: 10 * 60 * 1000 },
];

export function nextReminder(
  deadlineMs: number,
  nowMs: number,
  remindersSent: string[],
): { atMs: number; label: string } | null {
  for (const offset of REMINDER_OFFSETS) {
    if (remindersSent.includes(offset.label)) {
      continue;
    }
    const triggerAt = deadlineMs - offset.ms;
    if (triggerAt > nowMs) {
      return { atMs: triggerAt, label: offset.label };
    }
  }
  return null;
}
