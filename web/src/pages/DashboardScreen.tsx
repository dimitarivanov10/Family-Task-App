import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useFamily } from "../context/FamilyContext";
import { useTasks } from "../context/TaskContext";
import TaskCard from "../components/TaskCard";
import CreateTaskModal from "../components/CreateTaskModal";
import TaskDetailModal from "../components/TaskDetailModal";
import NotificationsBanner from "../components/NotificationsBanner";

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const { family } = useFamily();
  const { tasks, loading } = useTasks();
  const [creating, setCreating] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  return (
    <div className="min-h-screen bg-slate-50">
      <NotificationsBanner />

      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{family?.name}</h1>
          <p className="text-xs text-slate-500">
            Код за покана: <span className="font-mono tracking-widest">{family?.inviteCode}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-slate-500 hover:underline"
        >
          Изход
        </button>
      </header>

      <main className="px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">
            Здравей, {user?.displayName || user?.email}
          </h2>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Нова задача
          </button>
        </div>

        {loading && <p className="text-sm text-slate-500">Зареждане на задачите…</p>}
        {!loading && tasks.length === 0 && (
          <p className="text-sm text-slate-500">Няма задачи все още.</p>
        )}

        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assigneeNames={task.assignees.map((uid) => family?.memberNames[uid] ?? uid)}
              onOpen={() => setSelectedTaskId(task.id)}
            />
          ))}
        </div>
      </main>

      {creating && <CreateTaskModal onClose={() => setCreating(false)} />}
      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />}
    </div>
  );
}
