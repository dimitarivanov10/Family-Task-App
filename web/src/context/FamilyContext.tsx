import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
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
  error: string | null;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (inviteCode: string) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // undefined = not yet read from users/{uid}; null = read, no family.
  const [familyId, setFamilyId] = useState<string | null | undefined>(undefined);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stage 1: find out which family (if any) this user belongs to by
  // reading their own profile doc — never by listing /families, which
  // Firestore can't validate against a get()-based membership rule (see
  // firestore.rules) and denies outright regardless of the real result.
  useEffect(() => {
    if (!user) {
      setFamilyId(null);
      setError(null);
      return;
    }

    setError(null);
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const data = snap.data();
        setFamilyId((data?.familyId as string | undefined) ?? null);
      },
      (err) => {
        console.error("Грешка при зареждане на профила:", err);
        setError("Неуспешно зареждане на профила. Моля, презаредете страницата.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  // Stage 2: only once we know a familyId, subscribe to that single,
  // known family document (a get, not a query — no list-validation issue).
  useEffect(() => {
    if (familyId === undefined) {
      return; // stage 1 hasn't resolved yet
    }

    if (familyId === null) {
      setFamily(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "families", familyId),
      (snap) => {
        setFamily(snap.exists() ? ({ id: snap.id, ...snap.data() } as Family) : null);
        setLoading(false);
      },
      (err) => {
        console.error("Грешка при зареждане на семейството:", err);
        setError("Неуспешно зареждане на семейството. Моля, презаредете страницата.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [familyId]);

  async function createFamily(name: string) {
    const callable = httpsCallable<{ name: string }, CreateFamilyResult>(functions, "createFamily");
    await callable({ name });
  }

  async function joinFamily(inviteCode: string) {
    const callable = httpsCallable<{ inviteCode: string }, CreateFamilyResult>(functions, "joinFamily");
    await callable({ inviteCode });
  }

  return (
    <FamilyContext.Provider value={{ family, loading, error, createFamily, joinFamily }}>
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
