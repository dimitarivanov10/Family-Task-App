import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { HistoryEvent } from "../types";

interface UseTaskHistoryResult {
  history: HistoryEvent[];
  loading: boolean;
  error: string | null;
}

export function useTaskHistory(familyId: string, taskId: string): UseTaskHistoryResult {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const historyQuery = query(
      collection(db, "families", familyId, "tasks", taskId, "history"),
      orderBy("at", "asc"),
    );
    return onSnapshot(
      historyQuery,
      (snapshot) => {
        setHistory(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as HistoryEvent));
        setLoading(false);
      },
      (err) => {
        console.error("Грешка при зареждане на историята:", err);
        setError("Неуспешно зареждане на историята.");
        setLoading(false);
      },
    );
  }, [familyId, taskId]);

  return { history, loading, error };
}
