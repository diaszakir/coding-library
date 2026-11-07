import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, finishLesson, parseProgress, experience, mergeProgress } from '../lib/progress.ts';
import { validateLearningEvidence } from '../lib/progress-validation.ts';
import { markLessonVideo, setLessonVideoWatched, markLessonNotes, submitLessonQuiz, gradeQuiz, lessonChecklist, addStudyTime, studyByLanguage, learningStats, saveProject, removeProject } from '../lib/learning.ts';

const questions = Array.from({ length: 5 }, (_, index) => ({ id: `q${index}`, prompt: `Question ${index}`, options: ['Correct', 'Incorrect'], answer: 0, explanation: 'Reason' }));
const date = '2026-11-06T10:00:00.000Z';

test('video and notes complete automatically in any order; quiz is optional', () => {
  for (const order of [[0, 1], [1, 0], [0, 1, 2], [2, 0, 1], [1, 2, 0]]) {
    const steps = [p => markLessonVideo(p, 'one', date), p => markLessonNotes(p, 'one', date), p => submitLessonQuiz(p, 'one', questions, [0, 0, 0, 0, 1], 80, date)];
    let progress = emptyProgress();
    assert.equal(finishLesson(progress, 'one'), progress);
    const taken = new Set();
    order.forEach(step => {
      progress = steps[step](progress);
      taken.add(step);
      assert.equal(Boolean(progress.completed.one), taken.has(0) && taken.has(1));
    });
    assert.deepEqual(lessonChecklist(progress, 'one'), { video: true, notes: true, quiz: taken.has(2), count: 2, completed: true, legacy: false });
    assert.deepEqual(parseProgress(JSON.stringify(progress), ['one']), progress);
  }
});

test('actual quiz answers determine score; incomplete or invalid answers cannot pass', () => {
  assert.deepEqual(gradeQuiz(questions, [0, 0, 0, 1, 1]), { correct: 3, total: 5, passed: false, percent: 60 });
  assert.throws(() => gradeQuiz(questions, [0]));
  assert.throws(() => gradeQuiz(questions, [0, 0, 0, 0, -1]));
  assert.throws(() => gradeQuiz([], []));
  let progress = markLessonNotes(markLessonVideo(emptyProgress(), 'one'), 'one');
  progress = submitLessonQuiz(progress, 'one', questions, [0, 0, 0, 1, 1]);
  assert.ok(progress.completed.one);
  progress = submitLessonQuiz(progress, 'one', questions, [0, 0, 0, 0, 1]);
  const completedAt = progress.completed.one;
  progress = submitLessonQuiz(progress, 'one', questions, [1, 1, 1, 1, 1]);
  assert.equal(progress.lessonStates.one.quiz.correct, 4);
  assert.equal(progress.lessonStates.one.quiz.attempts, 3);
  assert.equal(progress.completed.one, completedAt);
  assert.equal(experience(progress, [{ id: 'one', xp: 50 }]).xp, 50);
});

test('legacy completion survives migration while new ungated completion is discarded', () => {
  const old = { version: 1, completed: { one: date }, positions: { 'one:ru': 320 }, lastLesson: 'one' };
  const restored = parseProgress(JSON.stringify(old), ['one']);
  assert.equal(restored.completed.one, date);
  assert.equal(restored.legacyCompleted.one, date);
  assert.equal(restored.positions['one:ru'], 320);
  assert.equal(lessonChecklist(restored, 'one').legacy, true);
  assert.equal(parseProgress(JSON.stringify({ ...emptyProgress(), completed: { one: date } }), ['one']).completed.one, undefined);
});

test('study timer aggregates real seconds by day and programming language', () => {
  let progress = emptyProgress();
  progress = addStudyTime(progress, { lessonId: 'one', courseId: 'python', language: 'Python', seconds: 35, date: '2026-11-06' });
  progress = addStudyTime(progress, { lessonId: 'one', courseId: 'python', language: 'Python', seconds: 25, date: '2026-11-06' });
  progress = addStudyTime(progress, { lessonId: 'two', courseId: 'go', language: 'Go', seconds: 90, date: '2026-11-05' });
  assert.equal(progress.studySessions.length, 2);
  assert.deepEqual(studyByLanguage(progress), [{ language: 'Go', seconds: 90 }, { language: 'Python', seconds: 60 }]);
  const stats = learningStats(progress, new Date(2026, 10, 6, 12));
  assert.equal(stats.todaySeconds, 60);
  assert.equal(stats.weekSeconds, 150);
  assert.equal(stats.streak, 2);
  assert.deepEqual(parseProgress(JSON.stringify(progress), ['one', 'two'], ['python', 'go']), progress);
  assert.equal(addStudyTime(progress, { lessonId: 'one', courseId: 'python', language: 'Python', seconds: NaN }), progress);
  assert.equal(addStudyTime(progress, { lessonId: 'one', courseId: 'python', language: 'Python', seconds: 50, date: '2026-02-30' }), progress);
});

test('projects roundtrip, update in place, validate links and can be removed', () => {
  let progress = saveProject(emptyProgress(), { title: ' CLI ', description: 'Build a CLI', language: 'Go', courseId: 'go', status: 'planned', url: 'https://example.com/repo' }, date);
  const id = progress.projects[0].id;
  progress = saveProject(progress, { ...progress.projects[0], status: 'completed' });
  assert.equal(progress.projects.length, 1);
  assert.equal(progress.projects[0].title, 'CLI');
  assert.equal(learningStats(progress).completedProjects, 1);
  assert.deepEqual(parseProgress(JSON.stringify(progress), [], ['go']), progress);
  assert.throws(() => saveProject(progress, { ...progress.projects[0], url: 'javascript:alert(1)' }));
  assert.equal(removeProject(progress, id).projects.length, 0);
});

test('new fields ignore unknown lessons, malformed sessions and invalid grades', () => {
  const progress = parseProgress(JSON.stringify({ ...emptyProgress(), lessonStates: { one: { videoCompletedAt: date, quiz: { answers: [0], correct: 0, total: 1, passed: true, attempts: 1, submittedAt: date } }, unknown: { notesCompletedAt: date } }, studySessions: [{ lessonId: 'one', courseId: 'python', language: 'Python', seconds: -100, date: '2026-11-06' }] }), ['one'], ['python']);
  assert.equal(progress.lessonStates.one.quiz.passed, false);
  assert.equal(progress.lessonStates.unknown, undefined);
  assert.deepEqual(progress.studySessions, []);
});

test('independent tab counters merge without losing time or counting retries twice', () => {
  const session = (writer, seconds) => ({ id: '2026-11-06:one:Go', lessonId: 'one', courseId: 'go', language: 'Go', date: '2026-11-06', seconds, counters: { [writer]: seconds }, legacySeconds: 0 });
  const tabA = { ...markLessonVideo(emptyProgress(), 'one', date), studySessions: [session('tab-a', 15)] };
  const tabB = { ...markLessonNotes(emptyProgress(), 'one', date), studySessions: [session('tab-b', 25)] };
  const saved = mergeProgress(tabA, tabB, emptyProgress());
  assert.equal(saved.studySessions[0].seconds, 40);
  assert.equal(saved.lessonStates.one.videoCompletedAt, date);
  assert.equal(saved.lessonStates.one.notesCompletedAt, date);
  assert.equal(mergeProgress(saved, tabB, emptyProgress()).studySessions[0].seconds, 40);
  const olderA = { ...tabA, studySessions: [session('tab-a', 10)] };
  assert.equal(mergeProgress(saved, olderA).studySessions[0].seconds, 40);
  assert.deepEqual(parseProgress(JSON.stringify(saved), ['one'], ['go']).studySessions, saved.studySessions);
});

test('tab merge respects deliberate unset fields and never resurrects a deleted project', () => {
  const base = saveProject({ ...emptyProgress(), technologies: { go: true }, originalCompleted: { go: date } }, { title: 'CLI', description: '', language: 'Go', courseId: 'go', status: 'planned', url: '' }, date);
  const deleted = removeProject({ ...base, technologies: {}, originalCompleted: {} }, base.projects[0].id);
  const disk = { ...base, technologies: { go: true, python: true }, positions: { 'one:ru': 300 } };
  const merged = mergeProgress(disk, deleted, base);
  assert.deepEqual(merged.technologies, { python: true });
  assert.deepEqual(merged.originalCompleted, {});
  assert.equal(merged.projects.length, 0);
  assert.equal(mergeProgress(merged, base).projects.length, 0);
  assert.equal(merged.positions['one:ru'], 300);
});

test('save validation regrades answers using the actual registry, ignoring forged scores', () => {
  let progress = submitLessonQuiz(markLessonNotes(markLessonVideo(emptyProgress(), 'one', date), 'one', date), 'one', questions, [0, 0, 0, 0, 0], 80, date);
  progress.lessonStates.one.quiz.answers = [1, 1, 1, 1, 1];
  progress.lessonStates.one.quiz.passPercent = 1;
  const registry = { one: { video: { url: 'https://example.com' }, quiz: { ru: questions, en: questions } } };
  const valid = validateLearningEvidence(progress, registry);
  assert.equal(valid.lessonStates.one.quiz.correct, 0);
  assert.equal(valid.lessonStates.one.quiz.passed, false);
  assert.equal(valid.completed.one, date);
  const absent = validateLearningEvidence(progress, {});
  assert.equal(absent.lessonStates.one.quiz, undefined);
  assert.equal(absent.lessonStates.one.videoCompletedAt, undefined);
  const legacy = parseProgress(JSON.stringify({ version: 1, completed: { one: date } }), ['one']);
  assert.equal(validateLearningEvidence(legacy, {}).completed.one, date);
});

test('manual video checkbox can be undone, survives reload and stale retries, without duplicate XP', () => {
  const base = markLessonNotes(markLessonVideo(emptyProgress(), 'one', date), 'one', date);
  const unchecked = setLessonVideoWatched(base, 'one', false, date);
  assert.equal(unchecked.completed.one, undefined);
  assert.equal(experience(unchecked, [{ id: 'one', xp: 50 }]).xp, 0);
  const restored = parseProgress(JSON.stringify(unchecked), ['one']);
  assert.equal(restored.lessonStates.one.videoCompletedAt, undefined);
  let disk = mergeProgress(base, restored, base);
  disk = mergeProgress(disk, base); // stale tab cannot restore the checkbox
  assert.equal(disk.lessonStates.one.videoCompletedAt, undefined);
  assert.equal(disk.completed.one, undefined);
  const checked = setLessonVideoWatched(restored, 'one', true, date);
  disk = mergeProgress(disk, checked, restored);
  disk = mergeProgress(disk, unchecked, base); // retried uncheck cannot erase a newer check
  assert.ok(disk.completed.one);
  assert.equal(experience(disk, [{ id: 'one', xp: 50 }]).xp, 50);
  const legacy = parseProgress(JSON.stringify({ version: 1, completed: { one: date } }), ['one']);
  assert.equal(setLessonVideoWatched(markLessonVideo(legacy, 'one', date), 'one', false).completed.one, date);
});

test('older video-and-notes progress becomes complete with no quiz or a failed quiz', () => {
  const old = { ...emptyProgress(), lessonStates: { one: { videoCompletedAt: date, notesCompletedAt: date } } };
  const loaded = parseProgress(JSON.stringify(old), ['one']);
  assert.equal(loaded.completed.one, date);
  assert.equal(loaded.lessonStates.one.quiz, undefined);
  const checked = validateLearningEvidence(loaded, { one: { video: { url: 'https://example.com/video' } } });
  assert.equal(checked.completed.one, date);
  assert.equal(validateLearningEvidence(loaded, {}).completed.one, undefined);
});
