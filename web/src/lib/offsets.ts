// Mirrors functions/src/offsets.ts. Nothing currently consumes
// nextReminderAt/remindersSent — there's no server component running on
// the free Spark plan to advance them or send FCM — but the fields are
// kept so the schema is ready if a server component is added later.
export interface ReminderOffset {
  label: string;
  ms: number;
}

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
