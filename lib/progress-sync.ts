import type { LearningProgress } from './progress';

export type ProgressWrite = { progress: LearningProgress; base: LearningProgress };
export type ProgressSaveState = { acknowledged: LearningProgress; attempt?: ProgressWrite };
export type ProgressCheckpoint = ProgressSaveState & { checkpointVersion: 2 };

export function sameProgress(left: LearningProgress, right: LearningProgress) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * A rejected request may have reached disk before its response was lost. Keep
 * that exact attempt until acknowledged, then apply any edits made since it.
 * The server merge is idempotent, including its per-writer time counters.
 */
export async function flushProgressWrites(state: ProgressSaveState, options: {
  current: () => LearningProgress;
  apply: (progress: LearningProgress) => void;
  checkpoint: () => void;
  save: (write: ProgressWrite) => Promise<LearningProgress>;
  merge: (saved: LearningProgress, current: LearningProgress, sent: LearningProgress) => LearningProgress;
}) {
  while (state.attempt || !sameProgress(state.acknowledged, options.current())) {
    const attempt = state.attempt || { progress: options.current(), base: state.acknowledged };
    state.attempt = attempt;
    options.checkpoint();
    // On failure, retain both the known baseline and the unacknowledged attempt.
    const saved = await options.save(attempt);
    const latest = options.current();
    state.acknowledged = saved;
    state.attempt = undefined;
    options.apply(sameProgress(latest, attempt.progress) ? saved : options.merge(saved, latest, attempt.progress));
    options.checkpoint();
  }
}
