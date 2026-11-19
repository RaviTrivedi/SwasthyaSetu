'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { currentUser, sessionSnapshot, subscribeSession } from './api';

const serverSnapshot = () => undefined;
export function useSession() {
  const user = useSyncExternalStore(subscribeSession, sessionSnapshot, serverSnapshot);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (user !== undefined) return;
    let active = true;
    currentUser().catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [user, attempt]);
  return { user, error: user === undefined && error, retry: () => { setError(false); setAttempt(value => value + 1); } };
}
