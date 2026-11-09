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
    verifyTask,
    cancelTask,
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
  const [cancelling, setCancelling] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState("");

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
  const isOpen = !["done", "declined", "verified", "archived", "cancelled"].includes(task.status);
  const canReopen = task.status === "done" || task.status === "declined";
  const canVerify = isCreator && task.status === "done";
  const canCancel = isCreator && ["pending", "seen", "accepted", "declined"].includes(task.status);
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

  async function handleCancelSubmit(e: FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      await cancelTask(task.id, cancelReasonInput);
      setCancelling(false);
      setCancelReasonInput("");
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl shadow-black/30 ring-1 ring-edge/60">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">{task.title}</h2>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[task.status]}`}
          >
            {STATUS_LABELS[task.status]}
          </span>
        </div>

        {task.description && <p className="mt-2 text-sm text-ink-dim">{task.description}</p>}

        <p className="mt-3 text-sm text-ink-dim">Изпълнители: {assigneeNames.join(", ")}</p>

        {task.status === "declined" && (
          <div className="mt-2 rounded-lg bg-rose-soft p-2 text-sm text-rose">
            Отказана от {activeFamily.memberNames[task.declinedBy ?? ""] ?? task.declinedBy}
            {task.declineReason && <> — {task.declineReason}</>}
          </div>
        )}

        {(task.status === "verified" || task.status === "archived") && (
          <div className="mt-2 rounded-lg bg-mint-soft p-2 text-sm text-mint">
            Проверена от {activeFamily.memberNames[task.verifiedBy ?? ""] ?? task.verifiedBy}
            {task.verifiedAt && <> на {formatDateTime(task.verifiedAt)}</>}
            {task.status === "archived" && <> · Архивирана{task.archivedAt && <> на {formatDateTime(task.archivedAt)}</>}</>}
          </div>
        )}

        {task.status === "cancelled" && (
          <div className="mt-2 rounded-lg bg-surface-2 p-2 text-sm text-ink-faint">
            Отменена от създателя
            {task.cancelledAt && <> на {formatDateTime(task.cancelledAt)}</>}
            {task.cancelReason && <> — {task.cancelReason}</>}
          </div>
        )}

        <div className="mt-2 text-sm text-ink-dim">
          <div className="flex items-center justify-between">
            <span>Срок: {formatDateTime(operativeDeadline)}</span>
            {isOpen && (isAssignee || isCreator) && !task.proposedDeadline && !proposing && (
              <button type="button" onClick={startProposeDeadline} className="text-accent hover:underline">
                Предложи нов срок
              </button>
            )}
          </div>
          {task.effectiveDeadline && (
            <p className="text-xs text-ink-faint">Първоначален срок: {formatDateTime(task.deadline)}</p>
          )}
        </div>

        {task.proposedDeadline && (
          <div className="mt-2 rounded-lg bg-accent-soft p-2 text-sm text-accent">
            <p>
              Предложен нов срок: {formatDateTime(task.proposedDeadline)}
              {task.proposedBy && <> от {activeFamily.memberNames[task.proposedBy] ?? task.proposedBy}</>}
            </p>
            {canAcceptProposal ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => acceptDeadlineProposal(task.id))}
                className="mt-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-bg hover:bg-accent-strong disabled:opacity-60"
              >
                Приеми новия срок
              </button>
            ) : (
              task.proposedBy === user.uid && (
                <p className="mt-1 text-xs text-accent/80">Изчаква се потвърждение от другата страна.</p>
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
              className="flex-1 rounded-lg border border-edge bg-surface-2 px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-bg hover:bg-accent-strong disabled:opacity-60"
            >
              Предложи
            </button>
          </form>
        )}

        {error && <p className="mt-2 text-sm text-rose">{error}</p>}

        {isAssignee && isOpen && (
          <div className="mt-4 flex flex-wrap gap-2">
            {task.status !== "accepted" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => acceptTask(task.id))}
                className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-bg hover:bg-accent-strong disabled:opacity-60"
              >
                Приемам
              </button>
            )}
            {task.status === "accepted" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => completeTask(task.id))}
                className="rounded-full bg-mint px-3 py-1.5 text-sm font-semibold text-bg hover:brightness-95 disabled:opacity-60"
              >
                Завърши
              </button>
            )}
            {!declining && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeclining(true)}
                className="rounded-full border border-rose/40 px-3 py-1.5 text-sm font-medium text-rose hover:bg-rose-soft disabled:opacity-60"
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
              className="w-full rounded-lg border border-edge bg-surface-2 px-2 py-1 text-sm text-ink placeholder:text-ink-faint focus:border-rose focus:outline-none focus:ring-1 focus:ring-rose"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeclining(false)}
                className="flex-1 rounded-full border border-edge px-3 py-1 text-sm font-medium text-ink-dim hover:text-ink"
              >
                Отказ
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-full bg-rose px-3 py-1 text-sm font-semibold text-bg hover:brightness-95 disabled:opacity-60"
              >
                Потвърди отказа
              </button>
            </div>
          </form>
        )}

        {(canVerify || ((isAssignee || isCreator) && canReopen)) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {canVerify && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => verifyTask(task.id))}
                className="rounded-full bg-mint px-3 py-1.5 text-sm font-semibold text-bg hover:brightness-95 disabled:opacity-60"
              >
                Провери
              </button>
            )}
            {(isAssignee || isCreator) && canReopen && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => reopenTask(task.id))}
                className="rounded-full border border-edge px-3 py-1.5 text-sm font-medium text-ink-dim hover:text-ink disabled:opacity-60"
              >
                Отвори отново
              </button>
            )}
          </div>
        )}

        {canCancel && !cancelling && (
          <div className="mt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => setCancelling(true)}
              className="rounded-full border border-edge px-3 py-1.5 text-sm font-medium text-ink-faint hover:text-rose disabled:opacity-60"
            >
              Отмени задачата
            </button>
          </div>
        )}

        {cancelling && (
          <form onSubmit={handleCancelSubmit} className="mt-4 space-y-2">
            <input
              type="text"
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              placeholder="Причина за отмяната (незадължително)"
              className="w-full rounded-lg border border-edge bg-surface-2 px-2 py-1 text-sm text-ink placeholder:text-ink-faint focus:border-rose focus:outline-none focus:ring-1 focus:ring-rose"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancelling(false)}
                className="flex-1 rounded-full border border-edge px-3 py-1 text-sm font-medium text-ink-dim hover:text-ink"
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-full bg-rose px-3 py-1 text-sm font-semibold text-bg hover:brightness-95 disabled:opacity-60"
              >
                Потвърди отмяната
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 border-t border-edge pt-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-ink-dim">История</h3>
            {!historyError && !historyLoading && history.length > 0 && (
              <span className="text-xs text-ink-faint">{history.length} събития</span>
            )}
          </div>
          {historyError && <p className="mt-2 text-xs text-rose">{historyError}</p>}
          {!historyError && historyLoading && (
            <p className="mt-2 text-xs text-ink-faint">Зареждане…</p>
          )}
          {!historyError && !historyLoading && (
            <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {history
                .slice()
                .reverse()
                .map((event) => (
                  <li key={event.id} className="text-xs text-ink-dim">
                    <span className="font-medium text-ink">{HISTORY_LABELS[event.type]}</span>
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
          className="mt-5 w-full rounded-full border border-edge px-4 py-2 text-sm font-medium text-ink-dim hover:text-ink"
        >
          Затвори
        </button>
      </div>
    </div>
  );
}
