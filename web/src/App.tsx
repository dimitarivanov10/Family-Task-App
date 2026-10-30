import { AuthProvider, useAuth } from "./context/AuthContext";
import { FamilyProvider, useFamily } from "./context/FamilyContext";
import { TaskProvider } from "./context/TaskContext";
import AuthScreen from "./pages/AuthScreen";
import FamilySetupScreen from "./pages/FamilySetupScreen";
import DashboardScreen from "./pages/DashboardScreen";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Зареждане…</p>
    </div>
  );
}

function AppRouter() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <FamilyProvider>
      <FamilyRouter />
    </FamilyProvider>
  );
}

function FamilyRouter() {
  const { family, loading: familyLoading } = useFamily();

  if (familyLoading) {
    return <LoadingScreen />;
  }

  if (!family) {
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
