import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { nextReminder } from "./offsets";
import type { FamilyDoc, HistoryEventDoc, HistoryEventType, TaskDoc, TaskStatus } from "./types";

const db = () => getFirestore();

async function requireFamilyMembership(familyId: string, uid: string): Promise<FamilyDoc> {
  const familyRef = db().collection("families").doc(familyId);
  const familySnap = await familyRef.get();
  if (!familySnap.exists) {
    throw new HttpsError("not-found", "Семейството не е намерено.");
  }
  const family = familySnap.data() as FamilyDoc;
  if (!family.members.includes(uid)) {
    throw new HttpsError("permission-denied", "Не сте член на това семейство.");
  }
  return family;
}

async function requireTask(
  familyId: string,
  taskId: string,
): Promise<{ ref: FirebaseFirestore.DocumentReference; task: TaskDoc }> {
  const ref = db().collection("families").doc(familyId).collection("tasks").doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Задачата не е намерена.");
  }
  return { ref, task: snap.data() as TaskDoc };
}

function logHistory(
  taskRef: FirebaseFirestore.DocumentReference,
  type: HistoryEventType,
  byUid: string,
  meta?: Record<string, unknown>,
) {
  const event: HistoryEventDoc = {
    type,
    byUid,
    at: FieldValue.serverTimestamp() as unknown as Timestamp,
    ...(meta ? { meta } : {}),
  };
  return taskRef.collection("history").doc().set(event);
}

interface CreateTaskInput {
  familyId: string;
  title: string;
  description: string;
  assignees: string[];
  deadline: number; // epoch millis
}

export const createTask = onCall<CreateTaskInput>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Трябва да сте влезли в профила си.");
  }

  const { familyId, assignees, deadline } = request.data ?? {};
  const title = request.data?.title?.trim();
  const description = request.data?.description?.trim() ?? "";

  if (!familyId) {
    throw new HttpsError("invalid-argument", "Липсва семейство.");
  }
  if (!title || title.length > 200) {
    throw new HttpsError("invalid-argument", "Заглавието трябва да е между 1 и 200 символа.");
  }
  if (!Array.isArray(assignees) || assignees.length === 0) {
    throw new HttpsError("invalid-argument", "Изберете поне един член на семейството.");
  }
  if (typeof deadline !== "number" || !Number.isFinite(deadline)) {
    throw new HttpsError("invalid-argument", "Невалиден срок.");
  }

  const nowMs = Date.now();
  if (deadline <= nowMs) {
    throw new HttpsError("invalid-argument", "Срокът трябва да е в бъдещето.");
  }

  const family = await requireFamilyMembership(familyId, uid);
  const unknownAssignees = assignees.filter((a) => !family.members.includes(a));
  if (unknownAssignees.length > 0) {
    throw new HttpsError("invalid-argument", "Всички изпълнители трябва да са членове на семейството.");
  }

  const reminder = nextReminder(deadline, nowMs, []);

  const taskRef = db().collection("families").doc(familyId).collection("tasks").doc();
  const task: TaskDoc = {
    title,
    description,
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp() as unknown as Timestamp,
    assignees,
    deadline: Timestamp.fromMillis(deadline),
    status: "pending",
    nextReminderAt: reminder ? Timestamp.fromMillis(reminder.atMs) : null,
    remindersSent: [],
  };

  await taskRef.set(task);
  await logHistory(taskRef, "created", uid);

  return { taskId: taskRef.id };
});

export const markSeen = onCall<{ familyId: string; taskId: string }>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Трябва да сте влезли в профила си.");
  }
  const { familyId, taskId } = request.data ?? {};
  if (!familyId || !taskId) {
    throw new HttpsError("invalid-argument", "Липсват данни.");
  }

  await requireFamilyMembership(familyId, uid);
  const { ref, task } = await requireTask(familyId, taskId);

  if (!task.assignees.includes(uid)) {
    throw new HttpsError("permission-denied", "Само изпълнител може да отбележи задачата като видяна.");
  }

  if (task.status === "pending") {
    await ref.update({ status: "seen" satisfies TaskStatus });
  }
  await logHistory(ref, "seen", uid);

  return { ok: true };
});

export const acceptTask = onCall<{ familyId: string; taskId: string }>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Трябва да сте влезли в профила си.");
  }
  const { familyId, taskId } = request.data ?? {};
  if (!familyId || !taskId) {
    throw new HttpsError("invalid-argument", "Липсват данни.");
  }

  await requireFamilyMembership(familyId, uid);
  const { ref, task } = await requireTask(familyId, taskId);

  if (!task.assignees.includes(uid)) {
    throw new HttpsError("permission-denied", "Само изпълнител може да приеме задачата.");
  }
  if (task.status === "done") {
    throw new HttpsError("failed-precondition", "Задачата вече е завършена.");
  }

  if (task.status !== "accepted") {
    await ref.update({ status: "accepted" satisfies TaskStatus });
  }
  await logHistory(ref, "accepted", uid);

  return { ok: true };
});

export const completeTask = onCall<{ familyId: string; taskId: string }>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Трябва да сте влезли в профила си.");
  }
  const { familyId, taskId } = request.data ?? {};
  if (!familyId || !taskId) {
    throw new HttpsError("invalid-argument", "Липсват данни.");
  }

  await requireFamilyMembership(familyId, uid);
  const { ref, task } = await requireTask(familyId, taskId);

  if (!task.assignees.includes(uid)) {
    throw new HttpsError("permission-denied", "Само изпълнител може да завърши задачата.");
  }
  if (task.status !== "accepted") {
    throw new HttpsError("failed-precondition", "Задачата трябва първо да бъде приета.");
  }

  await ref.update({ status: "done" satisfies TaskStatus, nextReminderAt: null });
  await logHistory(ref, "status_changed", uid, { from: task.status, to: "done" });

  return { ok: true };
});

export const changeDeadline = onCall<{ familyId: string; taskId: string; deadline: number }>(
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Трябва да сте влезли в профила си.");
    }
    const { familyId, taskId, deadline } = request.data ?? {};
    if (!familyId || !taskId) {
      throw new HttpsError("invalid-argument", "Липсват данни.");
    }
    if (typeof deadline !== "number" || !Number.isFinite(deadline)) {
      throw new HttpsError("invalid-argument", "Невалиден срок.");
    }

    const nowMs = Date.now();
    if (deadline <= nowMs) {
      throw new HttpsError("invalid-argument", "Срокът трябва да е в бъдещето.");
    }

    const family = await requireFamilyMembership(familyId, uid);
    const { ref, task } = await requireTask(familyId, taskId);

    if (task.createdBy !== uid && !task.assignees.includes(uid)) {
      throw new HttpsError("permission-denied", "Нямате право да променяте тази задача.");
    }
    if (!family.members.includes(uid)) {
      throw new HttpsError("permission-denied", "Не сте член на това семейство.");
    }
    if (task.status === "done") {
      throw new HttpsError("failed-precondition", "Задачата вече е завършена.");
    }

    const oldDeadlineMs = task.deadline.toMillis();
    const reminder = nextReminder(deadline, nowMs, []);

    await ref.update({
      deadline: Timestamp.fromMillis(deadline),
      remindersSent: [],
      nextReminderAt: reminder ? Timestamp.fromMillis(reminder.atMs) : null,
    });
    await logHistory(ref, "deadline_changed", uid, { oldDeadlineMs, newDeadlineMs: deadline });

    return { ok: true };
  },
);
