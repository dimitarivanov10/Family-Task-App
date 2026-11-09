import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useFamily } from "../context/FamilyContext";
import { useTasks } from "../context/TaskContext";
import TaskCard from "../components/TaskCard";
import CreateTaskModal from "../components/CreateTaskModal";
import TaskDetailModal from "../components/TaskDetailModal";
import NotificationsBanner from "../components/NotificationsBanner";
import FamilyManagerModal from "../components/FamilyManagerModal";
import TaskHistoryModal from "../components/TaskHistoryModal";
import type { Task } from "../types";

// Active board only — "archived" and "cancelled" tasks have no group
// here at all, they're only reachable through the История view, which
// shows every task regardless of status as a personal record.
const TASK_GROUPS: { key: string; label: string; match: (t: Task) => boolean }[] = [
  { key: "new", label: "Нови", match: (t) => t.status === "pending" },
  { key: "soon", label: "Изтичащи скоро", match: (t) => t.status === "seen" || t.status === "accepted" },
  { key: "done", label: "Завършени", match: (t) => t.status === "done" || t.status === "verified" },
  { key: "declined", label: "Отказани", match: (t) => t.status === "declined" },
];

function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M7 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM13.5 9A2 2 0 1 0 13.5 5a2 2 0 0 0 0 4ZM2.5 16c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5M11.75 11.75c1.9.2 3.25 1.9 3.25 4.25"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <rect x="7" y="7" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M10 5.5V10l3 2M17 10a7 7 0 1 1-2.05-4.95M17 3v4h-4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const { families, activeFamily, selectFamily } = useFamily();
  const { tasks, loading, error } = useTasks();
  const [creating, setCreating] = useState(false);
  const [managingFamilies, setManagingFamilies] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  async function copyFamilyId() {
    if (!activeFamily) return;
    await navigator.clipboard.writeText(activeFamily.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen">
      <NotificationsBanner />

      <header className="relative px-4 pt-6 pb-8 text-center">
        <button
          type="button"
          onClick={() => void signOut()}
          className="absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-medium text-ink-faint transition hover:bg-surface hover:text-ink"
        >
          Изход
        </button>

        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink-faint">
          Домакинство
        </p>

        {families.length > 1 ? (
          <select
            value={activeFamily?.id ?? ""}
            onChange={(e) => selectFamily(e.target.value)}
            className="mt-1 appearance-none bg-transparent text-center font-display text-3xl font-semibold text-ink focus:outline-none"
          >
            {families.map((f) => (
              <option key={f.id} value={f.id} className="bg-surface text-ink">
                {f.name}
              </option>
            ))}
          </select>
        ) : (
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{activeFamily?.name}</h1>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void copyFamilyId()}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-dim ring-1 ring-edge transition hover:text-ink"
            title="Копирай ID на семейството за покана на друг член"
          >
            <CopyIcon />
            <span className="font-mono">{activeFamily?.id}</span>
            {copied && <span className="text-accent">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => setManagingFamilies(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-bg shadow-sm transition hover:bg-accent-strong"
          >
            <UsersIcon />
            Управление на семейства
          </button>
          <button
            type="button"
            onClick={() => setViewingHistory(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-dim ring-1 ring-edge transition hover:text-ink"
          >
            <HistoryIcon />
            История
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm text-ink-dim">
            Здравей, <span className="text-ink">{user?.displayName || user?.email}</span>
          </h2>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-sm transition hover:bg-accent-strong"
          >
            + Нова задача
          </button>
        </div>

        {error && <p className="text-sm text-rose">{error}</p>}
        {!error && loading && <p className="text-sm text-ink-dim">Зареждане на задачите…</p>}
        {!error && !loading && tasks.length === 0 && (
          <p className="text-sm text-ink-dim">Няма задачи все още.</p>
        )}

        {!error &&
          !loading &&
          TASK_GROUPS.map(({ key, label, match }) => {
            const groupTasks = tasks.filter(match);
            if (groupTasks.length === 0) return null;
            return (
              <section key={key} className="mb-8">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {label} <span className="text-ink-faint/70">({groupTasks.length})</span>
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groupTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      assigneeNames={task.assignees.map((uid) => activeFamily?.memberNames[uid] ?? uid)}
                      onOpen={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
      </main>

      {creating && <CreateTaskModal onClose={() => setCreating(false)} />}
      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />}
      {managingFamilies && <FamilyManagerModal onClose={() => setManagingFamilies(false)} />}
      {viewingHistory && (
        <TaskHistoryModal
          tasks={tasks}
          onClose={() => setViewingHistory(false)}
          onOpenTask={(taskId) => {
            setViewingHistory(false);
            setSelectedTaskId(taskId);
          }}
        />
      )}
    </div>
  );
}
