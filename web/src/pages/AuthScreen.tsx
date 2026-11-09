import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/errors";

const FIELD_CLASS =
  "mt-1 block w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-ink placeholder:text-ink-faint shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl shadow-black/20 ring-1 ring-edge/60">
        <h1 className="text-center font-display text-2xl font-semibold text-ink">Домакински задачи</h1>
        <p className="mt-1 text-center text-sm text-ink-dim">
          {mode === "signin" ? "Влезте в своя профил" : "Създайте нов профил"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-ink-dim">
                Име
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-dim">
              Имейл
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-dim">
              Парола
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          {error && <p className="text-sm text-rose">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-accent px-4 py-2 font-semibold text-bg shadow-sm transition hover:bg-accent-strong disabled:opacity-60"
          >
            {submitting ? "Моля, изчакайте…" : mode === "signin" ? "Вход" : "Регистрация"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
          className="mt-4 w-full text-center text-sm text-ink-dim hover:text-accent"
        >
          {mode === "signin" ? "Нямате профил? Регистрирайте се" : "Вече имате профил? Влезте"}
        </button>
      </div>
    </div>
  );
}
