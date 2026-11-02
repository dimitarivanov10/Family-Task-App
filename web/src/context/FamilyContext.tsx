import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { arrayUnion, collection, doc, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import type { Family } from "../types";

interface FamilyContextValue {
  family: Family | null;
  loading: boolean;
  error: string | null;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (familyId: string) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return "Възникна неочаквана грешка.";
}

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
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Името на семейството не може да е празно.");
    }

    const familyRef = doc(collection(db, "families"));
    const displayName = user.displayName || user.email || "Член на семейството";

    const batch = writeBatch(db);
    batch.set(familyRef, {
      name: trimmed,
      members: [user.uid],
      memberNames: { [user.uid]: displayName },
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, "users", user.uid), { familyId: familyRef.id }, { merge: true });

    try {
      await batch.commit();
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }

  async function joinFamily(familyId: string) {
    if (!user) return;
    const trimmedId = familyId.trim();
    if (!trimmedId) {
      throw new Error("Въведете ID на семейството.");
    }

    const familyRef = doc(db, "families", trimmedId);
    const displayName = user.displayName || user.email || "Член на семейството";

    // No preview read: the join rule validates against Firestore's own
    // current server-side state regardless of whether the client could
    // read the doc first, and a non-member can't read it anyway.
    const batch = writeBatch(db);
    batch.update(familyRef, {
      members: arrayUnion(user.uid),
      [`memberNames.${user.uid}`]: displayName,
    });
    batch.set(doc(db, "users", user.uid), { familyId: trimmedId }, { merge: true });

    try {
      await batch.commit();
    } catch (err) {
      throw new Error(
        "Неуспешно присъединяване — проверете ID на семейството. " + getErrorMessage(err),
      );
    }
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
