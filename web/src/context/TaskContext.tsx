import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useFamily } from "./FamilyContext";
import type { Task } from "../types";

interface CreateTaskArgs {
  title: string;
  description: string;
  assignees: string[];
  deadline: number;
}

interface TaskContextValue {
  tasks: Task[];
  loading: boolean;
  createTask: (args: CreateTaskArgs) => Promise<void>;
  markSeen: (taskId: string) => Promise<void>;
  acceptTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  changeDeadline: (taskId: string, deadline: number) => Promise<void>;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { family } = useFamily();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!family) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const tasksQuery = query(
      collection(db, "families", family.id, "tasks"),
      orderBy("deadline", "asc"),
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Task));
      setLoading(false);
    });

    return unsubscribe;
  }, [family]);

  async function createTask(args: CreateTaskArgs) {
    if (!family) return;
    const callable = httpsCallable(functions, "createTask");
    await callable({ familyId: family.id, ...args });
  }

  async function markSeen(taskId: string) {
    if (!family) return;
    const callable = httpsCallable(functions, "markSeen");
    await callable({ familyId: family.id, taskId });
  }

  async function acceptTask(taskId: string) {
    if (!family) return;
    const callable = httpsCallable(functions, "acceptTask");
    await callable({ familyId: family.id, taskId });
  }

  async function completeTask(taskId: string) {
    if (!family) return;
    const callable = httpsCallable(functions, "completeTask");
    await callable({ familyId: family.id, taskId });
  }

  async function changeDeadline(taskId: string, deadline: number) {
    if (!family) return;
    const callable = httpsCallable(functions, "changeDeadline");
    await callable({ familyId: family.id, taskId, deadline });
  }

  return (
    <TaskContext.Provider
      value={{ tasks, loading, createTask, markSeen, acceptTask, completeTask, changeDeadline }}
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
