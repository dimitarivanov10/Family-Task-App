import { AuthProvider, useAuth } from "./context/AuthContext";
import { FamilyProvider, useFamily } from "./context/FamilyContext";
import { TaskProvider } from "./context/TaskContext";
import { useLoadingTimeout } from "./hooks/useLoadingTimeout";
import AuthScreen from "./pages/AuthScreen";
import VerifyEmailScreen from "./pages/VerifyEmailScreen";
import FamilySetupScreen from "./pages/FamilySetupScreen";
import DashboardScreen from "./pages/DashboardScreen";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-ink-dim">Зареждане…</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <p className="text-sm text-rose">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-sm hover:bg-accent-strong"
        >
          Презареди
        </button>
      </div>
    </div>
  );
}

function AppRouter() {
  const { user, emailVerified, loading: authLoading, error: authError } = useAuth();
  const authTimedOut = useLoadingTimeout(authLoading);

  if (authError) {
    return <ErrorScreen message={authError} />;
  }

  if (authLoading) {
    return authTimedOut ? (
      <ErrorScreen message="Зареждането отне твърде дълго. Проверете връзката си с интернет." />
    ) : (
      <LoadingScreen />
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Family/task access requires a verified email (see firestore.rules'
  // isVerified()) — this screen is the only thing an unverified account
  // can reach beyond their own profile.
  if (!emailVerified) {
    return <VerifyEmailScreen />;
  }

  return (
    <FamilyProvider>
      <FamilyRouter />
    </FamilyProvider>
  );
}

function FamilyRouter() {
  const { families, loading: familyLoading, error: familyError } = useFamily();
  const familyTimedOut = useLoadingTimeout(familyLoading);

  if (familyError) {
    return <ErrorScreen message={familyError} />;
  }

  if (familyLoading) {
    return familyTimedOut ? (
      <ErrorScreen message="Зареждането на семейството отне твърде дълго. Проверете връзката си с интернет." />
    ) : (
      <LoadingScreen />
    );
  }

  if (families.length === 0) {
    return <FamilySetupScreen />;
  }

  return (
    <TaskProvider>
      <DashboardScreen />
    </TaskProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
