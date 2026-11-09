import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface AuthContextValue {
  user: User | null;
  emailVerified: boolean;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshEmailVerified: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setEmailVerified(nextUser?.emailVerified ?? false);
        setLoading(false);
      },
      (err) => {
        console.error("Грешка при проверка на профила:", err);
        setError("Неуспешна връзка с профила. Моля, презаредете страницата.");
        setLoading(false);
      },
    );
  }, []);

  // Real-account requirement: an account only gets real family/task
  // access (see firestore.rules' isVerified()) once this link is
  // clicked, which proves the email address actually exists and is
  // reachable, not just typed in.
  async function signUp(email: string, password: string, displayName: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    await setDoc(doc(db, "users", credential.user.uid), {
      displayName,
      email,
      createdAt: serverTimestamp(),
    });
    await sendEmailVerification(credential.user);
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resendVerificationEmail() {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }

  // Firebase doesn't push emailVerified changes to the local User object
  // automatically — it only updates after an explicit reload(). Just as
  // important: firestore.rules reads email_verified off the cached ID
  // token's claims, not live account state, so Firestore writes would
  // still be denied after reload() alone until a fresh token is minted —
  // forcing getIdToken(true) is what actually makes isVerified() in the
  // rules see the change.
  async function refreshEmailVerified() {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    setEmailVerified(auth.currentUser.emailVerified);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        emailVerified,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        resendVerificationEmail,
        refreshEmailVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth трябва да се използва в AuthProvider");
  }
  return ctx;
}
