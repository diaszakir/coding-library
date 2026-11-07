'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCatalog } from '@/components/catalog-provider';
import { technologyIds } from '@/data/roadmaps';
import { emptyProgress, parseProgress, mergeProgress, STORAGE_KEY, type LearningProgress } from '@/lib/progress';
import { flushProgressWrites, sameProgress, type ProgressCheckpoint, type ProgressSaveState, type ProgressWrite } from '@/lib/progress-sync';
const PENDING_STORAGE_KEY = `${STORAGE_KEY}.pending`;
export function useLearning() {
  const { catalog } = useCatalog();
  const ids = catalog.knownLessonIds, courseIds = catalog.knownCourseIds;
  const [progress, setProgress] = useState(emptyProgress);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const current = useRef(progress);
  const blocked = useRef(false);
  const pending = useRef(Promise.resolve());
  const saveState = useRef<ProgressSaveState>({ acknowledged: progress });
  const checkpoint = useCallback(() => {
    const snapshot = JSON.stringify(current.current);
    try {
      if (saveState.current.attempt || !sameProgress(current.current, saveState.current.acknowledged)) {
        const marker: ProgressCheckpoint = { checkpointVersion: 2, ...saveState.current };
        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(marker));
      } else localStorage.removeItem(PENDING_STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, snapshot);
    } catch { /* Disk is the primary storage; browser storage is optional. */ }
  }, []);
  const send = useCallback(async (write: ProgressWrite) => {
    const body = JSON.stringify(write);
    const response = await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type':'application/json' }, body, keepalive: new TextEncoder().encode(body).length < 60_000 });
    if (!response.ok) throw new Error('disk');
    return parseProgress(JSON.stringify(await response.json()),ids,courseIds,technologyIds);
  }, [ids,courseIds]);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        await pending.current;
        const response = await fetch('/api/progress', { cache: 'no-store' });
        if (!response.ok) throw new Error('disk');
        let value = await response.json();
        // A tab can close before its final queued timer save reaches disk. Recover
        // that explicit unsaved snapshot before replacing the browser copy.
        let unsaved: string | null = null;
        let unsavedBase: LearningProgress | undefined;
        let unsavedAttempt: ProgressWrite | undefined;
        try {
          const marker = localStorage.getItem(PENDING_STORAGE_KEY);
          if (marker) {
            unsaved = localStorage.getItem(STORAGE_KEY);
            if (marker !== 'true') {
              const data = JSON.parse(marker);
              if (data.checkpointVersion === 2) {
                unsavedBase = parseProgress(JSON.stringify(data.acknowledged),ids,courseIds,technologyIds);
                if (data.attempt) unsavedAttempt = { progress: parseProgress(JSON.stringify(data.attempt.progress),ids,courseIds,technologyIds), base: parseProgress(JSON.stringify(data.attempt.base),ids,courseIds,technologyIds) };
              } else unsavedBase = parseProgress(marker,ids,courseIds,technologyIds);
            }
          }
        } catch { /* Browser storage is optional. */ }
        if (unsaved && value !== null) {
          current.current = parseProgress(unsaved,ids,courseIds,technologyIds);
          saveState.current = { acknowledged: unsavedBase || emptyProgress(), attempt: unsavedAttempt };
          await flushProgressWrites(saveState.current, { current: () => current.current, apply: saved => { current.current = saved; }, checkpoint, save: send, merge: mergeProgress });
          value = current.current;
        }
        if (value === null) {
          let browserCopy: string | null = null;
          try { browserCopy = localStorage.getItem(STORAGE_KEY); } catch { /* Initialize disk even when browser storage is disabled. */ }
          const saved = parseProgress(browserCopy,ids,courseIds,technologyIds);
          const initial = await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ progress:saved, initialize:true }) });
          if (!initial.ok) throw new Error('disk');
          value = await initial.json();
        }
        const saved = parseProgress(JSON.stringify(value),ids,courseIds,technologyIds);
        if (!active) return;
        saveState.current = { acknowledged: saved };
        current.current = saved; setProgress(saved); blocked.current = false; setStorageError('');
        try { localStorage.setItem(STORAGE_KEY,JSON.stringify(saved)); localStorage.removeItem(PENDING_STORAGE_KEY); } catch { /* Disk is the primary storage. */ }
      } catch {
        if (!active) return;
        blocked.current = true; setStorageError('read');
        try { const saved = parseProgress(localStorage.getItem(STORAGE_KEY),ids,courseIds,technologyIds); current.current = saved; setProgress(saved); } catch { /* Preserve unreadable data. */ }
      } finally { if (active) setReady(true); }
    }
    void load();
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const saved = parseProgress(event.newValue,ids,courseIds,technologyIds);
        const base = event.oldValue ? parseProgress(event.oldValue,ids,courseIds,technologyIds) : emptyProgress();
        const merged = mergeProgress(current.current, saved, base); current.current = merged; setProgress(merged);
      } catch { setStorageError('read'); }
    };
    window.addEventListener('storage',sync);
    return () => { active = false; window.removeEventListener('storage',sync); };
  }, [ids,courseIds,checkpoint,send]);
  const update = useCallback((change: (old: LearningProgress) => LearningProgress) => {
    const base = current.current;
    const next = change(base);
    if (next === current.current) return;
    current.current = next; setProgress(next);
    checkpoint();
    if (blocked.current) return;
    pending.current = pending.current.then(async () => {
      try {
        await flushProgressWrites(saveState.current, { current: () => current.current, apply: saved => { current.current = saved; setProgress(saved); }, checkpoint, save: send, merge: mergeProgress });
        setStorageError('');
      } catch { setStorageError('write'); }
    });
  }, [checkpoint,send]);
  const savePosition = useCallback((id: string, language: string, position: number) => update(p => ({ ...p, positions: { ...p.positions, [`${id}:${language}`]: position } })), [update]);
  return { progress, ready, storageError, update, savePosition };
}
