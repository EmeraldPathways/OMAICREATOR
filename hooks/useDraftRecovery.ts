import { useEffect, useState } from "react";

export function useDraftRecovery<T>(key: string, value: T, enabled = true) {
  const [recovered, setRecovered] = useState<T | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as { value: T; savedAt: string };
        if (saved?.value && Date.now() - new Date(saved.savedAt).getTime() < 1000 * 60 * 60 * 24 * 14) setRecovered(saved.value);
      }
    } catch { /* local recovery is optional */ }
    setChecked(true);
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled || !checked) return;
    const candidate = value as unknown as Record<string, unknown>;
    const hasMeaningfulDraft = Object.values(candidate || {}).some((item) => typeof item === "string" && item.trim());
    if (!hasMeaningfulDraft) return;
    try { window.localStorage.setItem(key, JSON.stringify({ value, savedAt: new Date().toISOString() })); } catch { /* local recovery is optional */ }
  }, [key, value, enabled, checked]);

  return {
    recovered,
    dismissRecovery: () => setRecovered(null),
    clearRecovery: () => { try { window.localStorage.removeItem(key); } catch { /* optional */ } setRecovered(null); },
  };
}
