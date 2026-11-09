import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  doc,
  onSnapshot,
  or,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { useFamily } from "./FamilyContext";
import { nextReminder } from "../lib/offsets";
import { getErrorMessage } from "../lib/errors";
import type { HistoryEventType, Task } from "../types";

interface CreateTaskArgs {
  title: string;
  description: string;
  assignees: string[];
  deadline: number;
}

interface TaskContextValue {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  createTask: (args: CreateTaskArgs) => Promise<void>;
  markSeen: (taskId: string) => Promise<void>;
  acceptTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  declineTask: (taskId: string, reason: string) => Promise<void>;
  reopenTask: (taskId: string) => Promise<void>;
  proposeDeadline: (taskId: string, deadline: number) => Promise<void>;
  acceptDeadlineProposal: (taskId: string) => Promise<void>;
  verifyTask: (taskId: string) => Promise<void>;
  cancelTask: (taskId: string, reason: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

// A "verified" task is archived automatically — no server exists to run
// this on a schedule, so instead it's checked lazily whenever the task
// list loads, by whichever assignee/creator happens to have the app
// open (see the effect below).
const ARCHIVE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeFamily } = useFamily();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const archivingRef = useRef<Set<string>>(new Set());

  // Only tasks the current user was assigned to, or created themselves —
  // never the whole family's tasks. Firestore can't filter a list query
  // after the fact, so the rule (mirrors resource.data.assignees /
  // createdBy directly) and this query's OR-filter have to match exactly,
  // or every result would risk violating someone else's privacy and the
  // whole request would be denied.
  useEffect(() => {
    if (!activeFamily || !user) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const tasksQuery = query(
      collection(db, "families", activeFamily.id, "tasks"),
      or(where("assignees", "array-contains", user.uid), where("createdBy", "==", user.uid)),
      orderBy("deadline", "asc"),
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Task));
        setLoading(false);
      },
      (err) => {
        console.error("Грешка при зареждане на задачите:", err);
        setError("Неуспешно зареждане на задачите. Моля, презаредете страницата.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [activeFamily, user]);

  // Lazily sweep verified tasks past the archive delay into "archived".
  // Self-limiting the same way auto-seen is: once a task's status
  // actually becomes "archived", this condition no longer matches it.
  useEffect(() => {
    const due = tasks.filter(
      (t) =>
        t.status === "verified" &&
        t.verifiedAt &&
        Date.now() - t.verifiedAt.toMillis() >= ARCHIVE_AFTER_MS &&
        !archivingRef.current.has(t.id),
    );
    for (const task of due) {
      archivingRef.current.add(task.id);
      void archiveTask(task.id).catch(() => {
        archivingRef.current.delete(task.id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Every task write is paired, in the same batch, with a new history
  // entry — the rules require the task's lastHistoryEventId to point at
  // a history doc created in that same batch with a matching byUid/at,
  // so a task change can never be committed without its audit entry.
  async function writeTaskChange(
    taskId: string,
    taskUpdates: Record<string, unknown>,
    historyType: HistoryEventType,
    historyMeta?: Record<string, unknown>,
  ) {
    if (!activeFamily || !user) return;
    const taskRef = doc(db, "families", activeFamily.id, "tasks", taskId);
    const historyRef = doc(collection(taskRef, "history"));

    const batch = writeBatch(db);
    batch.update(taskRef, { ...taskUpdates, lastHistoryEventId: historyRef.id });
    batch.set(historyRef, {
      type: historyType,
      byUid: user.uid,
      at: serverTimestamp(),
      ...(historyMeta ? { meta: historyMeta } : {}),
    });

    try {
      await batch.commit();
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }

  function findTask(taskId: string): Task {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error("Задачата не е намерена.");
    }
    return task;
  }

  async function createTask({ title, description, assignees, deadline }: CreateTaskArgs) {
    if (!activeFamily || !user) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error("Заглавието не може да е празно.");
    }
    if (assignees.length === 0) {
      throw new Error("Изберете поне един изпълнител.");
    }
    if (!Number.isFinite(deadline) || deadline <= Date.now()) {
      throw new Error("Срокът трябва да е в бъдещето.");
    }

    const taskRef = doc(collection(db, "families", activeFamily.id, "tasks"));
    const historyRef = doc(collection(taskRef, "history"));
    const reminder = nextReminder(deadline, Date.now(), []);

    const batch = writeBatch(db);
    batch.set(taskRef, {
      title: trimmedTitle,
      description: description.trim(),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      assignees,
      deadline: Timestamp.fromMillis(deadline),
      status: "pending",
      nextReminderAt: reminder ? Timestamp.fromMillis(reminder.atMs) : null,
      remindersSent: [],
      proposedDeadline: null,
      proposedBy: null,
      effectiveDeadline: null,
      declineReason: null,
      declinedBy: null,
      verifiedAt: null,
      verifiedBy: null,
      archivedAt: null,
      cancelledAt: null,
      cancelReason: null,
      lastHistoryEventId: historyRef.id,
    });
    batch.set(historyRef, {
      type: "created" satisfies HistoryEventType,
      byUid: user.uid,
      at: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }

  // Not exposed as a button — called automatically the first time an
  // assignee opens a task (see TaskDetailModal). Safe to call repeatedly:
  // it's a no-op status-wise once the task has moved past "pending".
  async function markSeen(taskId: string) {
    const task = findTask(taskId);
    const updates: Record<string, unknown> = {};
    if (task.status === "pending") {
      updates.status = "seen";
    }
    await writeTaskChange(taskId, updates, "seen");
  }

  async function acceptTask(taskId: string) {
    const task = findTask(taskId);
    if (task.status === "done" || task.status === "declined") {
      throw new Error("Тази задача вече е приключена.");
    }
    const updates: Record<string, unknown> = {};
    if (task.status !== "accepted") {
      updates.status = "accepted";
    }
    await writeTaskChange(taskId, updates, "accepted");
  }

  async function completeTask(taskId: string) {
    const task = findTask(taskId);
    if (task.status !== "accepted") {
      throw new Error("Задачата трябва първо да бъде приета.");
    }
    await writeTaskChange(
      taskId,
      { status: "done", nextReminderAt: null },
      "status_changed",
      { from: task.status, to: "done" },
    );
  }

  async function declineTask(taskId: string, reason: string) {
    if (!user) return;
    const task = findTask(taskId);
    if (task.status === "done" || task.status === "declined") {
      throw new Error("Тази задача вече е приключена.");
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new Error("Моля, въведете причина за отказа.");
    }
    await writeTaskChange(
      taskId,
      { status: "declined", declineReason: trimmedReason, declinedBy: user.uid, nextReminderAt: null },
      "declined",
      { reason: trimmedReason },
    );
  }

  async function reopenTask(taskId: string) {
    const task = findTask(taskId);
    if (task.status !== "done" && task.status !== "declined") {
      throw new Error("Само завършена или отказана задача може да бъде отворена отново.");
    }
    await writeTaskChange(
      taskId,
      { status: "accepted", declineReason: null, declinedBy: null },
      "status_changed",
      { from: task.status, to: "accepted" },
    );
  }

  async function proposeDeadline(taskId: string, deadline: number) {
    if (!user) return;
    const task = findTask(taskId);
    if (task.status === "done" || task.status === "declined") {
      throw new Error("Тази задача вече е приключена.");
    }
    if (task.proposedDeadline) {
      throw new Error("Вече има предложен срок, изчакайте да бъде приет или отговорен.");
    }
    if (!Number.isFinite(deadline) || deadline <= Date.now()) {
      throw new Error("Срокът трябва да е в бъдещето.");
    }
    await writeTaskChange(
      taskId,
      { proposedDeadline: Timestamp.fromMillis(deadline), proposedBy: user.uid },
      "deadline_proposed",
    );
  }

  // Only the other party may confirm a proposal — never the person who
  // made it. If the assignee proposed, only the creator can confirm; if
  // the creator proposed, only an assignee can confirm.
  async function acceptDeadlineProposal(taskId: string) {
    if (!user) return;
    const task = findTask(taskId);
    if (!task.proposedDeadline || !task.proposedBy) {
      throw new Error("Няма предложен срок за приемане.");
    }
    if (task.proposedBy === user.uid) {
      throw new Error("Не можете да приемете собственото си предложение — трябва другата страна.");
    }
    const proposerIsCreator = task.proposedBy === task.createdBy;
    const callerIsCreator = user.uid === task.createdBy;
    const callerIsAssignee = task.assignees.includes(user.uid);
    const allowed = proposerIsCreator ? callerIsAssignee : callerIsCreator;
    if (!allowed) {
      throw new Error("Само другата страна по задачата може да приеме този срок.");
    }
    await writeTaskChange(
      taskId,
      { effectiveDeadline: task.proposedDeadline, proposedDeadline: null, proposedBy: null },
      "deadline_accepted",
    );
  }

  // The creator reviewing a done task — never the assignee who did the
  // work, enforced both here and in firestore.rules.
  async function verifyTask(taskId: string) {
    if (!user) return;
    const task = findTask(taskId);
    if (task.createdBy !== user.uid) {
      throw new Error("Само създателят на задачата може да я провери.");
    }
    if (task.status !== "done") {
      throw new Error("Задачата трябва първо да бъде завършена.");
    }
    await writeTaskChange(
      taskId,
      { status: "verified", verifiedAt: serverTimestamp(), verifiedBy: user.uid },
      "verified",
    );
  }

  // Mechanical cleanup, not a judgment call — called automatically a
  // few days after verification (see the effect above), but also usable
  // directly by either party.
  async function archiveTask(taskId: string) {
    const task = findTask(taskId);
    if (task.status !== "verified") {
      throw new Error("Само проверена задача може да бъде архивирана.");
    }
    await writeTaskChange(taskId, { status: "archived", archivedAt: serverTimestamp() }, "archived");
  }

  // Creator-only soft delete: the task and its full history stay in
  // Firestore forever, this just marks it cancelled and hides it from
  // the active board. Only makes sense before real work was done.
  async function cancelTask(taskId: string, reason: string) {
    if (!user) return;
    const task = findTask(taskId);
    if (task.createdBy !== user.uid) {
      throw new Error("Само създателят на задачата може да я отмени.");
    }
    if (!["pending", "seen", "accepted", "declined"].includes(task.status)) {
      throw new Error("Тази задача вече не може да бъде отменена.");
    }
    const trimmedReason = reason.trim();
    await writeTaskChange(
      taskId,
      {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelReason: trimmedReason || null,
      },
      "cancelled",
      trimmedReason ? { reason: trimmedReason } : undefined,
    );
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        createTask,
        markSeen,
        acceptTask,
        completeTask,
        declineTask,
        reopenTask,
        proposeDeadline,
        acceptDeadlineProposal,
        verifyTask,
        cancelTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) {
    throw new Error("useTasks трябва да се използва в TaskProvider");
  }
  return ctx;
}
