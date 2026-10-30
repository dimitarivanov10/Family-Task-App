import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { REMINDER_OFFSETS, nextReminder } from "./offsets";
import type { TaskDoc } from "./types";

const OFFSET_LABEL_TEXT: Record<string, string> = {
  "5h": "5 часа",
  "1h": "1 час",
  "30m": "30 минути",
  "10m": "10 минути",
};

function findDueLabel(deadlineMs: number, nextReminderAtMs: number, remindersSent: string[]): string | null {
  for (const offset of REMINDER_OFFSETS) {
    if (remindersSent.includes(offset.label)) {
      continue;
    }
    if (deadlineMs - offset.ms === nextReminderAtMs) {
      return offset.label;
    }
  }
  return null;
}

async function collectTokens(uids: string[]): Promise<{ token: string; uid: string; deviceId: string }[]> {
  const db = getFirestore();
  const tokens: { token: string; uid: string; deviceId: string }[] = [];
  await Promise.all(
    uids.map(async (uid) => {
      const devicesSnap = await db.collection("users").doc(uid).collection("devices").get();
      devicesSnap.forEach((doc) => {
        const fcmToken = doc.data().fcmToken as string | undefined;
        if (fcmToken) {
          tokens.push({ token: fcmToken, uid, deviceId: doc.id });
        }
      });
    }),
  );
  return tokens;
}

async function removeDeadTokens(dead: { uid: string; deviceId: string }[]) {
  const db = getFirestore();
  await Promise.all(
    dead.map((d) => db.collection("users").doc(d.uid).collection("devices").doc(d.deviceId).delete()),
  );
}

export const sendTaskReminders = onSchedule("every 1 minutes", async () => {
  const db = getFirestore();
  const now = Timestamp.now();

  const dueTasks = await db
    .collectionGroup("tasks")
    .where("status", "in", ["pending", "seen", "accepted"])
    .where("nextReminderAt", "<=", now)
    .get();

  if (dueTasks.empty) {
    return;
  }

  const messaging = getMessaging();

  for (const taskSnap of dueTasks.docs) {
    const task = taskSnap.data() as TaskDoc;
    if (!task.nextReminderAt) {
      continue;
    }

    const deadlineMs = task.deadline.toMillis();
    const nextReminderAtMs = task.nextReminderAt.toMillis();
    const remindersSent = task.remindersSent ?? [];
    const label = findDueLabel(deadlineMs, nextReminderAtMs, remindersSent);

    if (!label) {
      // Stale/inconsistent reminder pointer — clear it rather than loop forever.
      await taskSnap.ref.update({ nextReminderAt: null });
      continue;
    }

    const tokens = await collectTokens(task.assignees);
    if (tokens.length > 0) {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: {
          title: `Напомняне: ${task.title}`,
          body: `Остава ${OFFSET_LABEL_TEXT[label] ?? label} до крайния срок`,
        },
        data: {
          familyId: taskSnap.ref.parent.parent?.id ?? "",
          taskId: taskSnap.id,
        },
      });

      const dead = response.responses
        .map((r, i) => ({ r, t: tokens[i] }))
        .filter(
          ({ r }) =>
            !r.success &&
            (r.error?.code === "messaging/registration-token-not-registered" ||
              r.error?.code === "messaging/invalid-registration-token"),
        )
        .map(({ t }) => ({ uid: t.uid, deviceId: t.deviceId }));

      if (dead.length > 0) {
        await removeDeadTokens(dead);
      }
    } else {
      logger.info(`No device tokens for assignees of task ${taskSnap.id}; skipping push.`);
    }

    const updatedRemindersSent = [...remindersSent, label];
    const upcoming = nextReminder(deadlineMs, Date.now(), updatedRemindersSent);

    await taskSnap.ref.update({
      remindersSent: updatedRemindersSent,
      nextReminderAt: upcoming ? Timestamp.fromMillis(upcoming.atMs) : null,
    });
  }
});
