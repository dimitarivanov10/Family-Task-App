import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import type { Family } from "../types";

interface CreateFamilyResult {
  familyId: string;
  inviteCode: string;
  name: string;
}

interface FamilyContextValue {
  family: Family | null;
  loading: boolean;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (inviteCode: string) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFamily(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const familiesQuery = query(
      collection(db, "families"),
      where("members", "array-contains", user.uid),
    );

    const unsubscribe = onSnapshot(familiesQuery, (snapshot) => {
      const first = snapshot.docs[0];
      setFamily(first ? ({ id: first.id, ...first.data() } as Family) : null);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  async function createFamily(name: string) {
    const callable = httpsCallable<{ name: string }, CreateFamilyResult>(functions, "createFamily");
    await callable({ name });
  }

  async function joinFamily(inviteCode: string) {
    const callable = httpsCallable<{ inviteCode: string }, CreateFamilyResult>(functions, "joinFamily");
    await callable({ inviteCode });
  }

  return (
    <FamilyContext.Provider value={{ family, loading, createFamily, joinFamily }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error("useFamily трябва да се използва в FamilyProvider");
  }
  return ctx;
}
