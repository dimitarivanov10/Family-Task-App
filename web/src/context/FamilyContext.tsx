import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { arrayRemove, arrayUnion, collection, doc, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { getErrorMessage } from "../lib/errors";
import type { Family } from "../types";

const ACTIVE_FAMILY_KEY = "familyTaskApp.activeFamilyId";

interface FamilyContextValue {
  families: Family[];
  activeFamily: Family | null;
  loading: boolean;
  error: string | null;
  selectFamily: (familyId: string) => void;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (familyId: string) => Promise<void>;
  leaveFamily: (familyId: string) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

// A user's profile may still have the old single `familyId` field from
// before multi-family support; fold it into the list so existing data
// keeps working.
function extractFamilyIds(data: Record<string, unknown> | undefined): string[] {
  const ids = new Set<string>();
  const list = data?.familyIds;
  if (Array.isArray(list)) {
    for (const id of list) {
      if (typeof id === "string") ids.add(id);
    }
  }
  const legacy = data?.familyId;
  if (typeof legacy === "string") ids.add(legacy);
  return Array.from(ids);
}

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // undefined = not yet read from users/{uid}.
  const [familyIds, setFamilyIds] = useState<string[] | undefined>(undefined);
  const [familiesById, setFamiliesById] = useState<Record<string, Family>>({});
  const [preferredFamilyId, setPreferredFamilyId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_FAMILY_KEY),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stage 1: find out which families (if any) this user belongs to by
  // reading their own profile doc — never by listing /families, which
  // Firestore can't validate against a get()-based membership rule (see
  // firestore.rules) and denies outright regardless of the real result.
  useEffect(() => {
    if (!user) {
      setFamilyIds([]);
      setError(null);
      return;
    }

    setError(null);
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setFamilyIds(extractFamilyIds(snap.data()));
      },
      (err) => {
        console.error("Грешка при зареждане на профила:", err);
        setError("Неуспешно зареждане на профила. Моля, презаредете страницата.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  // Stage 2: once we know the familyIds, subscribe to each known family
  // document individually (a get per id, not a list query).
  useEffect(() => {
    if (familyIds === undefined) {
      return; // stage 1 hasn't resolved yet
    }

    if (familyIds.length === 0) {
      setFamiliesById({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const ids = familyIds;
    const results: Record<string, Family> = {};
    const received = new Set<string>();

    function maybeDone() {
      if (received.size >= ids.length) {
        setLoading(false);
      }
    }

    const unsubscribes = ids.map((id) =>
      onSnapshot(
        doc(db, "families", id),
        (snap) => {
          if (snap.exists()) {
            results[id] = { id: snap.id, ...snap.data() } as Family;
          } else {
            delete results[id];
          }
          setFamiliesById({ ...results });
          received.add(id);
          maybeDone();
        },
        (err) => {
          console.error("Грешка при зареждане на семейство:", id, err);
          setError("Неуспешно зареждане на едно от семействата. Моля, презаредете страницата.");
          received.add(id);
          maybeDone();
        },
      ),
    );

    return () => unsubscribes.forEach((u) => u());
    // familyIds is compared by content, not reference, so re-subscribing
    // only happens when the actual set of ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyIds === undefined ? "" : familyIds.slice().sort().join(",")]);

  const families = Object.values(familiesById);
  const activeFamily =
    (preferredFamilyId ? familiesById[preferredFamilyId] : undefined) ?? families[0] ?? null;

  function selectFamily(familyId: string) {
    setPreferredFamilyId(familyId);
    localStorage.setItem(ACTIVE_FAMILY_KEY, familyId);
  }

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
    batch.set(doc(db, "users", user.uid), { familyIds: arrayUnion(familyRef.id) }, { merge: true });

    try {
      await batch.commit();
      selectFamily(familyRef.id);
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
    if (familyIds?.includes(trimmedId)) {
      throw new Error("Вече сте член на това семейство.");
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
    batch.set(doc(db, "users", user.uid), { familyIds: arrayUnion(trimmedId) }, { merge: true });

    try {
      await batch.commit();
      selectFamily(trimmedId);
    } catch (err) {
      throw new Error(
        "Неуспешно присъединяване — проверете ID на семейството. " + getErrorMessage(err),
      );
    }
  }

  async function leaveFamily(familyId: string) {
    if (!user) return;
    const familyRef = doc(db, "families", familyId);

    // memberNames keeps former members' names for historical task/history
    // display, so only `members` changes here — the family stays visible
    // in old records, just no longer accessible to this user.
    const batch = writeBatch(db);
    batch.update(familyRef, { members: arrayRemove(user.uid) });
    batch.set(doc(db, "users", user.uid), { familyIds: arrayRemove(familyId) }, { merge: true });

    try {
      await batch.commit();
      if (preferredFamilyId === familyId) {
        localStorage.removeItem(ACTIVE_FAMILY_KEY);
        setPreferredFamilyId(null);
      }
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }

  return (
    <FamilyContext.Provider
      value={{ families, activeFamily, loading, error, selectFamily, createFamily, joinFamily, leaveFamily }}
    >
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
