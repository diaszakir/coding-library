import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, mergeProgress } from '../lib/progress.ts';
import { flushProgressWrites, sameProgress } from '../lib/progress-sync.ts';

function harness(initial = emptyProgress()) {
  const value = { current: structuredClone(initial), disk: structuredClone(initial), state: { acknowledged: structuredClone(initial) }, checkpoint: null, calls: [] };
  value.options = {
    current: () => value.current,
    apply: progress => { value.current = progress; },
    checkpoint: () => { value.checkpoint = structuredClone({ checkpointVersion: 2, ...value.state }); },
    save: async write => {
      value.calls.push(structuredClone(write));
      value.disk = mergeProgress(value.disk, write.progress, write.base);
      return structuredClone(value.disk);
    },
    merge: mergeProgress,
  };
  return value;
}

test('failed save is retried before later updates without losing language or reading position', async () => {
  const value = harness();
  value.current = { ...value.current, language: 'en', positions: { 'lesson:ru': 1200 } };
  const transport = value.options.save;
  value.options.save = async () => { throw new Error('disk unavailable'); };
  await assert.rejects(flushProgressWrites(value.state, value.options), /disk unavailable/);
  assert.equal(value.state.acknowledged.language, 'ru');
  assert.equal(value.state.attempt.progress.language, 'en');
  value.current = { ...value.current, lastLesson: 'lesson' };
  value.options.save = transport;
  await flushProgressWrites(value.state, value.options);
  assert.equal(value.disk.language, 'en');
  assert.equal(value.disk.positions['lesson:ru'], 1200);
  assert.equal(value.disk.lastLesson, 'lesson');
  assert.equal(value.current.language, 'en');
  assert.equal(value.state.attempt, undefined);
  assert.ok(sameProgress(value.current, value.state.acknowledged));
});

test('response loss and a subsequent revert replay the uncertain write before saving the revert', async () => {
  const value = harness();
  value.current = { ...value.current, language: 'en' };
  const transport = value.options.save;
  value.options.save = async write => { await transport(write); throw new Error('response lost'); };
  await assert.rejects(flushProgressWrites(value.state, value.options), /response lost/);
  assert.equal(value.disk.language, 'en');
  value.current = { ...value.current, language: 'ru', positions: { 'lesson:ru': 800 } };
  value.options.save = transport;
  await flushProgressWrites(value.state, value.options);
  assert.equal(value.disk.language, 'ru');
  assert.equal(value.disk.positions['lesson:ru'], 800);
  assert.equal(value.calls[1].progress.language, 'en');
  assert.equal(value.calls[2].progress.language, 'ru');
  assert.equal(value.calls[2].base.language, 'en');
});

test('changes made while a request is in flight survive the acknowledgment', async () => {
  const value = harness();
  value.current = { ...value.current, language: 'en' };
  const transport = value.options.save;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let first = true;
  value.options.save = async write => { if (first) { first = false; await gate; } return transport(write); };
  const saving = flushProgressWrites(value.state, value.options);
  value.current = { ...value.current, language: 'ru', positions: { 'lesson:ru': 1450 } };
  release();
  await saving;
  assert.equal(value.disk.language, 'ru');
  assert.equal(value.disk.positions['lesson:ru'], 1450);
  assert.deepEqual(value.current, value.disk);
  assert.equal(value.calls.length, 2);
});

test('reload recovery restores the attempted request and preserves independent disk edits and time', async () => {
  const value = harness();
  const session = (writer, seconds) => ({ id: '2026-11-06:lesson:Go', lessonId: 'lesson', courseId: 'go', language: 'Go', date: '2026-11-06', seconds, counters: { [writer]: seconds }, legacySeconds: 0 });
  value.current = { ...value.current, language: 'en', studySessions: [session('tab-a', 15)] };
  const transport = value.options.save;
  value.options.save = async write => { await transport(write); throw new Error('closed before reply'); };
  await assert.rejects(flushProgressWrites(value.state, value.options));
  const checkpoint = JSON.parse(JSON.stringify(value.checkpoint));
  value.disk = mergeProgress(value.disk, { ...emptyProgress(), technologies: { python: true }, studySessions: [session('tab-b', 25)] });
  const fresh = harness(value.disk);
  fresh.current = { ...value.current, language: 'ru', lastLesson: 'lesson' };
  fresh.state = { acknowledged: checkpoint.acknowledged, attempt: checkpoint.attempt };
  await flushProgressWrites(fresh.state, fresh.options);
  assert.equal(fresh.disk.studySessions[0].seconds, 40);
  assert.equal(fresh.disk.technologies.python, true);
  assert.equal(fresh.disk.language, 'ru');
  assert.equal(fresh.disk.lastLesson, 'lesson');
  await flushProgressWrites(fresh.state, fresh.options);
  assert.equal(fresh.disk.studySessions[0].seconds, 40);
  assert.equal(fresh.calls.length, 2);
});

test('acknowledgment with no newer edits accepts server normalization instead of retrying rejected data', async () => {
  const value = harness();
  value.current = { ...value.current, positions: { 'removed-lesson:ru': 100 } };
  value.options.save = async () => emptyProgress();
  await flushProgressWrites(value.state, value.options);
  assert.deepEqual(value.current.positions, {});
  assert.equal(value.state.attempt, undefined);
});
