import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useFamily } from "../context/FamilyContext";
import { useTasks } from "../context/TaskContext";
import { useTaskHistory } from "../hooks/useTaskHistory";
import { getErrorMessage } from "../lib/errors";
import { formatDateTime, HISTORY_LABELS, STATUS_BADGE_CLASSES, STATUS_LABELS } from "../lib/format";
import type { Task } from "../types";

export default function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { user } = useAuth();
  const { activeFamily } = useFamily();
  const {
    markSeen,
    acceptTask,
    completeTask,
    declineTask,
    reopenTask,
    proposeDeadline,
    acceptDeadlineProposal,
  } = useTasks();
  const { history, loading: historyLoading, error: historyError } = useTaskHistory(
    activeFamily?.id ?? "",
    task.id,
  );

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [declining, setDeclining] = useState(false);
  const [declineReasonInput, setDeclineReasonInput] = useState("");

  const isAssignee = !!user && task.assignees.includes(user.uid);

  // "Видяна" is never a button — it's set the first time an assignee
  // opens the task. Self-limiting: once status moves past "pending" this
  // condition is false and it won't fire again.
  useEffect(() => {
    if (isAssignee && task.status === "pending") {
      void markSeen(task.id).catch((err) => setError(getErrorMessage(err)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.status, isAssignee]);

  if (!activeFamily || !user) {
    return null;
  }

  const isCreator = task.createdBy === user.uid;
  const isOpen = task.status !== "done" && task.status !== "declined";
  const assigneeNames = task.assignees.map((uid) => activeFamily.memberNames[uid] ?? uid);
  const operativeDeadline = task.effectiveDeadline ?? task.deadline;

  // Only the other party may confirm a deadline proposal — mirrors the
  // same check enforced server-side in TaskContext/firestore.rules.
  const canAcceptProposal =
    !!task.proposedBy &&
    task.proposedBy !== user.uid &&
    (task.proposedBy === task.createdBy ? isAssignee : isCreator);

  async function runAction(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function startProposeDeadline() {
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = operativeDeadline.toDate();
    setDeadlineInput(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    );
    setProposing(true);
  }

  async function handleProposeSubmit(e: FormEvent) {
    e.preventDefault();
    const deadline = new Date(deadlineInput).getTime();
    if (!Number.isFinite(deadline)) {
      setError("Невалиден срок.");
      return;
    }
    await runAction(async () => {
      await proposeDeadline(task.id, deadline);
      setProposing(false);
    });
  }

  async function handleDeclineSubmit(e: FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      await declineTask(task.id, declineReasonInput);
      setDeclining(false);
      setDeclineReasonInput("");
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{task.title}</h2>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[task.status]}`}
          >
            {STATUS_LABELS[task.status]}
          </span>
        </div>

        {task.description && <p className="mt-2 text-sm text-slate-600">{task.description}</p>}

        <p className="mt-3 text-sm text-slate-500">Изпълнители: {assigneeNames.join(", ")}</p>

        {task.status === "declined" && (
          <div className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-900">
            Отказана от {activeFamily.memberNames[task.declinedBy ?? ""] ?? task.declinedBy}
            {task.declineReason && <> — {task.declineReason}</>}
          </div>
        )}

        <div className="mt-2 text-sm text-slate-500">
          <div className="flex items-center justify-between">
            <span>Срок: {formatDateTime(operativeDeadline)}</span>
            {isOpen && (isAssignee || isCreator) && !task.proposedDeadline && !proposing && (
              <button type="button" onClick={startProposeDeadline} className="text-blue-600 hover:underline">
                Предложи нов срок
              </button>
            )}
          </div>
          {task.effectiveDeadline && (
            <p className="text-xs text-slate-400">Първоначален срок: {formatDateTime(task.deadline)}</p>
          )}
        </div>

        {task.proposedDeadline && (
          <div className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
            <p>
              Предложен нов срок: {formatDateTime(task.proposedDeadline)}
              {task.proposedBy && <> от {activeFamily.memberNames[task.proposedBy] ?? task.proposedBy}</>}
            </p>
            {canAcceptProposal ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => acceptDeadlineProposal(task.id))}
                className="mt-1 rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                Приеми новия срок
              </button>
            ) : (
              task.proposedBy === user.uid && (
                <p className="mt-1 text-xs text-amber-700">Изчаква се потвърждение от другата страна.</p>
              )
            )}
          </div>
        )}

        {proposing && (
          <form onSubmit={handleProposeSubmit} className="mt-2 flex items-center gap-2">
            <input
              type="datetime-local"
              required
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Предложи
            </button>
          </form>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {isAssignee && isOpen && (
          <div className="mt-4 flex flex-wrap gap-2">
            {task.status !== "accepted" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => acceptTask(task.id))}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Приемам
              </button>
            )}
            {task.status === "accepted" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => completeTask(task.id))}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                Завърши
              </button>
            )}
            {!declining && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeclining(true)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Откажи
              </button>
            )}
          </div>
        )}

        {declining && (
          <form onSubmit={handleDeclineSubmit} className="mt-2 space-y-2">
            <input
              type="text"
              required
              value={declineReasonInput}
              onChange={(e) => setDeclineReasonInput(e.target.value)}
              placeholder="Причина за отказа"
              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeclining(false)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Отказ
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                Потвърди отказа
              </button>
            </div>
          </form>
        )}

        {(isAssignee || isCreator) && !isOpen && (
          <div className="mt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => reopenTask(task.id))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Отвори отново
            </button>
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-slate-700">История</h3>
            {!historyError && !historyLoading && history.length > 0 && (
              <span className="text-xs text-slate-400">{history.length} събития</span>
            )}
          </div>
          {historyError && <p className="mt-2 text-xs text-red-600">{historyError}</p>}
          {!historyError && historyLoading && (
            <p className="mt-2 text-xs text-slate-400">Зареждане…</p>
          )}
          {!historyError && !historyLoading && (
            <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {history
                .slice()
                .reverse()
                .map((event) => (
                  <li key={event.id} className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{HISTORY_LABELS[event.type]}</span>
                    {" — "}
                    {activeFamily.memberNames[event.byUid] ?? event.byUid} · {formatDateTime(event.at)}
                  </li>
                ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Затвори
        </button>
      </div>
    </div>
  );
}
