import { useState } from "react";
import { useFamily } from "../context/FamilyContext";
import CreateOrJoinFamilyForm from "./CreateOrJoinFamilyForm";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return "Възникна неочаквана грешка.";
}

export default function FamilyManagerModal({ onClose }: { onClose: () => void }) {
  const { families, activeFamily, selectFamily, leaveFamily } = useFamily();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleLeave(familyId: string, name: string) {
    if (!window.confirm(`Напускане на „${name}“? Това действие не може да бъде отменено.`)) {
      return;
    }
    setError(null);
    setBusyId(familyId);
    try {
      await leaveFamily(familyId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Моите семейства</h2>

        <ul className="mt-4 space-y-2">
          {families.map((f) => (
            <li
              key={f.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                f.id === activeFamily?.id ? "border-blue-400 bg-blue-50" : "border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => selectFamily(f.id)}
                className="flex-1 text-left"
              >
                <p className="text-sm font-medium text-slate-900">{f.name}</p>
                <p className="text-xs text-slate-500">{Object.keys(f.memberNames).length} члена</p>
              </button>
              <button
                type="button"
                disabled={busyId === f.id}
                onClick={() => handleLeave(f.id, f.name)}
                className="ml-2 shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Напусни
              </button>
            </li>
          ))}
        </ul>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-medium text-slate-700">Добави друго семейство</h3>
          <div className="mt-2">
            <CreateOrJoinFamilyForm onDone={onClose} />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Затвори
        </button>
      </div>
    </div>
  );
}
