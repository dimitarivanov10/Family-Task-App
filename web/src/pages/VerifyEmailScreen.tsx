import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/errors";

export default function VerifyEmailScreen() {
  const { user, signOut, resendVerificationEmail, refreshEmailVerified } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setSending(true);
    setError(null);
    try {
      await resendVerificationEmail();
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function handleCheck() {
    setChecking(true);
    setError(null);
    try {
      await refreshEmailVerified();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 text-center shadow-xl shadow-black/20 ring-1 ring-edge/60">
        <h1 className="font-display text-xl font-semibold text-ink">Потвърдете имейла си</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Изпратихме линк за потвърждение на <span className="text-ink">{user?.email}</span>. Отворете
          го, за да получите достъп до семейството и задачите.
        </p>

        {error && <p className="mt-3 text-sm text-rose">{error}</p>}
        {sent && !error && <p className="mt-3 text-sm text-mint">Изпратено отново.</p>}

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={() => void handleCheck()}
            disabled={checking}
            className="w-full rounded-full bg-accent px-4 py-2 font-semibold text-bg shadow-sm hover:bg-accent-strong disabled:opacity-60"
          >
            {checking ? "Проверка…" : "Проверих — презареди"}
          </button>
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={sending}
            className="w-full rounded-full border border-edge px-4 py-2 text-sm font-medium text-ink-dim hover:text-ink disabled:opacity-60"
          >
            {sending ? "Изпращане…" : "Изпрати отново"}
          </button>
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
