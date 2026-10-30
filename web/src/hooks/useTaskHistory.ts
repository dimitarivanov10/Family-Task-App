import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { HistoryEvent } from "../types";

export function useTaskHistory(familyId: string, taskId: string): HistoryEvent[] {
  const [history, setHistory] = useState<HistoryEvent[]>([]);

  useEffect(() => {
    const historyQuery = query(
      collection(db, "families", familyId, "tasks", taskId, "history"),
      orderBy("at", "asc"),
    );
    return onSnapshot(historyQuery, (snapshot) => {
      setHistory(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as HistoryEvent));
    });
  }, [familyId, taskId]);

  return history;
}
