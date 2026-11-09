import { useAuth } from "../context/AuthContext";
import CreateOrJoinFamilyForm from "../components/CreateOrJoinFamilyForm";

export default function FamilySetupScreen() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-center text-xl font-semibold text-slate-900">Семейство</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Създайте ново семейство или се присъединете с ID, споделено от друг член
        </p>

        <div className="mt-6">
          <CreateOrJoinFamilyForm />
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:underline"
        >
          Изход
        </button>
      </div>
    </div>
  );
}
