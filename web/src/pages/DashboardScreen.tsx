import { useAuth } from "../context/AuthContext";
import { useFamily } from "../context/FamilyContext";

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const { family } = useFamily();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{family?.name}</h1>
          <p className="text-xs text-slate-500">
            Код за покана: <span className="font-mono tracking-widest">{family?.inviteCode}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-slate-500 hover:underline"
        >
          Изход
        </button>
      </header>

      <main className="px-4 py-6">
        <p className="text-sm text-slate-600">
          Добре дошъл/дошла, {user?.displayName || user?.email}. Задачите ще се появят тук.
        </p>
      </main>
    </div>
  );
}
