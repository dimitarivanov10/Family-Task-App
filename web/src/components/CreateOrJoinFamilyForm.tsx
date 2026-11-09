import { useState, type FormEvent } from "react";
import { useFamily } from "../context/FamilyContext";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return "Възникна неочаквана грешка.";
}

export default function CreateOrJoinFamilyForm({ onDone }: { onDone?: () => void }) {
  const { createFamily, joinFamily } = useFamily();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [familyIdInput, setFamilyIdInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        await createFamily(name);
      } else {
        await joinFamily(familyIdInput);
      }
      setName("");
      setFamilyIdInput("");
      onDone?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
            mode === "create" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
          }`}
        >
          Ново семейство
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
            mode === "join" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
          }`}
        >
          Присъединяване
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {mode === "create" ? (
          <div>
            <label htmlFor="familyName" className="block text-sm font-medium text-slate-700">
              Име на семейството
            </label>
            <input
              id="familyName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="напр. Семейство Иванови"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="familyIdInput" className="block text-sm font-medium text-slate-700">
              ID на семейството
            </label>
            <input
              id="familyIdInput"
              type="text"
              required
              value={familyIdInput}
              onChange={(e) => setFamilyIdInput(e.target.value.trim())}
              placeholder="Поискайте го от друг член на семейството"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Моля, изчакайте…" : mode === "create" ? "Създай семейство" : "Присъедини се"}
        </button>
      </form>
    </div>
  );
}
