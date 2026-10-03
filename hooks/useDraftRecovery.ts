import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

const EMPTY_DRAFT = "__EMPTY_DRAFT__";
const DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export function useDraftRecovery<T>(key: string, value: T, enabled = true) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (!enabled) return () => undefined;
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) onStoreChange();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [enabled, key]);
  const getSnapshot = useCallback(() => readDraftSnapshot(key, enabled), [enabled, key]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const checked = enabled && snapshot !== null;
  const restoredValue = useMemo(() => {
    if (!snapshot || snapshot === EMPTY_DRAFT) return null;
    try {
      return (JSON.parse(snapshot) as { value: T }).value || null;
    } catch { return null; }
  }, [snapshot]);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const recovered = dismissedKey === key ? null : restoredValue;

  useEffect(() => {
    if (!enabled || !checked) return;
    const candidate = value as unknown as Record<string, unknown>;
    const hasMeaningfulDraft = Object.values(candidate || {}).some((item) => typeof item === "string" && item.trim());
    if (!hasMeaningfulDraft) return;
    try { window.localStorage.setItem(key, JSON.stringify({ value, savedAt: new Date().toISOString() })); } catch { /* local recovery is optional */ }
  }, [key, value, enabled, checked]);

  return {
    recovered,
    dismissRecovery: () => setDismissedKey(key),
    clearRecovery: () => { try { window.localStorage.removeItem(key); } catch { /* optional */ } setDismissedKey(key); },
  };
}

function readDraftSnapshot(key: string, enabled: boolean): string | null {
  if (!enabled || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY_DRAFT;
    const saved = JSON.parse(raw) as { value?: unknown; savedAt?: string };
    const savedAt = saved.savedAt ? new Date(saved.savedAt).getTime() : Number.NaN;
    if (!saved.value || !Number.isFinite(savedAt) || Date.now() - savedAt >= DRAFT_MAX_AGE_MS) return EMPTY_DRAFT;
    return raw;
  } catch { return EMPTY_DRAFT; }
}
