import { useState, type FormEvent } from "react";
import { useFamily } from "../context/FamilyContext";
import { useTasks } from "../context/TaskContext";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return "Възникна неочаквана грешка.";
}

function defaultDeadlineInput(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const { activeFamily } = useFamily();
  const { createTask } = useTasks();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [deadlineInput, setDeadlineInput] = useState(defaultDeadlineInput());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Only current members can be assigned, not former members who still
  // linger in memberNames for historical display elsewhere.
  const members = activeFamily
    ? activeFamily.members.map((uid) => [uid, activeFamily.memberNames[uid] ?? uid] as const)
    : [];

  function toggleAssignee(uid: string) {
    setAssignees((prev) => (prev.includes(uid) ? prev.filter((a) => a !== uid) : [...prev, uid]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (assignees.length === 0) {
      setError("Изберете поне един изпълнител.");
      return;
    }

    const deadline = new Date(deadlineInput).getTime();
    if (!Number.isFinite(deadline)) {
      setError("Невалиден срок.");
      return;
    }

    setSubmitting(true);
    try {
      await createTask({ title, description, assignees, deadline });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Нова задача</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700">
              Заглавие
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">
              Описание
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">Изпълнители</span>
            <div className="mt-1 space-y-1">
              {members.map(([uid, name]) => (
                <label key={uid} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={assignees.includes(uid)}
                    onChange={() => toggleAssignee(uid)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-slate-700">
              Срок
            </label>
            <input
              id="deadline"
              type="datetime-local"
              required
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Отказ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Запазване…" : "Създай"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
