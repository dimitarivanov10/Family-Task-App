import { useAuth } from "../context/AuthContext";
import CreateOrJoinFamilyForm from "../components/CreateOrJoinFamilyForm";

export default function FamilySetupScreen() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl shadow-black/20 ring-1 ring-edge/60">
        <h1 className="text-center font-display text-xl font-semibold text-ink">Семейство</h1>
        <p className="mt-1 text-center text-sm text-ink-dim">
          Създайте ново семейство или се присъединете с ID, споделено от друг член
        </p>

        <div className="mt-6">
          <CreateOrJoinFamilyForm />
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 w-full text-center text-sm text-ink-dim hover:text-accent"
        >
          Изход
        </button>
      </div>
    </div>
  );
}
