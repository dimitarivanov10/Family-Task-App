import { useState, type FormEvent } from "react";
import { useFamily } from "../context/FamilyContext";
import { getErrorMessage } from "../lib/errors";

const FIELD_CLASS =
  "mt-1 block w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-ink placeholder:text-ink-faint shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

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
      <div className="flex rounded-lg bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
            mode === "create" ? "bg-accent text-bg" : "text-ink-dim"
          }`}
        >
          Ново семейство
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
            mode === "join" ? "bg-accent text-bg" : "text-ink-dim"
          }`}
        >
          Присъединяване
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {mode === "create" ? (
          <div>
            <label htmlFor="familyName" className="block text-sm font-medium text-ink-dim">
              Име на семейството
            </label>
            <input
              id="familyName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="напр. Семейство Иванови"
              className={FIELD_CLASS}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="familyIdInput" className="block text-sm font-medium text-ink-dim">
              ID на семейството
            </label>
            <input
              id="familyIdInput"
              type="text"
              required
              value={familyIdInput}
              onChange={(e) => setFamilyIdInput(e.target.value.trim())}
              placeholder="Поискайте го от друг член на семейството"
              className={`${FIELD_CLASS} font-mono text-sm`}
            />
          </div>
        )}

        {error && <p className="text-sm text-rose">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-accent px-4 py-2 font-semibold text-bg shadow-sm transition hover:bg-accent-strong disabled:opacity-60"
        >
          {submitting ? "Моля, изчакайте…" : mode === "create" ? "Създай семейство" : "Присъедини се"}
        </button>
      </form>
    </div>
  );
}
