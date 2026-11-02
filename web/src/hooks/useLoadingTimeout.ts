import { useEffect, useState } from "react";

// Guards against a stuck "loading" state (e.g. a snapshot listener that
// never resolves) by flipping to true once loading has taken too long,
// so the UI can show an error instead of spinning forever.
export function useLoadingTimeout(loading: boolean, timeoutMs = 10000): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [loading, timeoutMs]);

  return timedOut;
}
