'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { addStudyTime } from '@/lib/learning';
import type { LearningProgress } from '@/lib/progress';

type TimerOptions = {
  lessonId: string;
  courseId: string;
  language: string;
  enabled: boolean;
  videoPlaying: boolean;
  update: (change: (old: LearningProgress) => LearningProgress) => void;
};

/** Counts visible engaged time. Wall-clock jumps, sleeping tabs and inactivity are excluded. */
export function useStudyTimer({ lessonId, courseId, language, enabled, videoPlaying, update }: TimerOptions) {
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const playing = useRef(videoPlaying);
  const lastActivity = useRef(0);
  useEffect(() => { playing.current = videoPlaying; }, [videoPlaying]);
  const resume = useCallback(() => { lastActivity.current = performance.now(); setPaused(false); }, []);
  useEffect(() => {
    if (!enabled || paused) return;
    let previous = performance.now();
    lastActivity.current = previous;
    let seconds = 0;
    let total = 0;
    const flush = () => {
      const amount = Math.floor(seconds);
      if (amount < 1) return;
      seconds -= amount;
      update(progress => addStudyTime(progress, { lessonId, courseId, language, seconds: amount }));
    };
    const touch = () => { lastActivity.current = performance.now(); };
    const tick = () => {
      const now = performance.now();
      const elapsed = (now - previous) / 1000;
      previous = now;
      const engaged = document.visibilityState === 'visible' && document.hasFocus() && (playing.current || now - lastActivity.current < 90_000);
      setActive(engaged);
      if (engaged && elapsed > 0 && elapsed < 3) {
        seconds += elapsed;
        total += elapsed;
        const wholeSeconds = Math.floor(total);
        total -= wholeSeconds;
        if (wholeSeconds) setSessionSeconds(value => value + wholeSeconds);
        if (seconds >= 15) flush();
      }
    };
    const visibility = () => {
      flush();
      previous = performance.now();
      if (document.visibilityState !== 'visible') setActive(false);
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(event => window.addEventListener(event, touch, { passive: true }));
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', visibility);
    window.addEventListener('pagehide', flush);
    const interval = window.setInterval(tick, 1_000);
    return () => {
      window.clearInterval(interval);
      flush();
      events.forEach(event => window.removeEventListener(event, touch));
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', visibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [lessonId, courseId, language, enabled, paused, update]);
  return { paused, active: enabled && !paused && active, sessionSeconds, pause: () => setPaused(true), resume };
}
