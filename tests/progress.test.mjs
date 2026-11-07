import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { emptyProgress, parseProgress, finishLesson, setOriginalCourseCompleted, experience } from '../lib/progress.ts';
import { markLessonVideo, markLessonNotes, submitLessonQuiz } from '../lib/learning.ts';
const lessons = [{ id: 'one', xp: 50 }, { id: 'two', xp: 20 }];
const questions = [{ id: 'q1', prompt: 'Which value?', options: ['A', 'B'], answer: 0, explanation: 'A is correct.' }];
const complete = (progress, id) => submitLessonQuiz(markLessonNotes(markLessonVideo(progress, id), id), id, questions, [0]);
test('completion awards experience exactly once, including after reload', () => {
  const finished = complete(emptyProgress(), 'one');
  const restored = parseProgress(JSON.stringify(finished), ['one', 'two']);
  const repeated = finishLesson(restored, 'one');
  assert.equal(experience(repeated, lessons).xp, 50);
  assert.equal(repeated.completed.one, finished.completed.one);
  assert.equal(experience(complete(repeated, 'two'), lessons).xp, 70);
});
test('300 XP advances the level and keeps remainder', () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ id: `topic-${i}`, xp: 50 }));
  const p = many.reduce((state, l) => complete(state, l.id), emptyProgress());
  assert.deepEqual(experience(p, many), { xp: 350, level: 2, inLevel: 50, next: 250 });
});
test('original course completion persists independently of notes and can be undone', () => {
  const reading = { ...complete(emptyProgress(), 'one'), lastLesson: 'two', positions: { 'two:ru': 240 } };
  const marked = setOriginalCourseCompleted(reading, 'python', true, '2026-09-25T10:00:00Z');
  const restored = parseProgress(JSON.stringify(marked), ['one', 'two'], ['python']);
  assert.deepEqual(restored, marked);
  assert.equal(experience(restored, lessons).xp, 50);
  assert.deepEqual(restored.completed, reading.completed);
  assert.equal(setOriginalCourseCompleted(restored, 'python', true), restored);
  assert.deepEqual(setOriginalCourseCompleted(restored, 'python', false), reading);
});
test('old saves retain progress and invalid original-course marks are ignored', () => {
  const old = { ...emptyProgress(), completed: { one: '2026-09-25T10:00:00Z' }, language: 'en' };
  delete old.learningSchema;
  delete old.legacyCompleted;
  delete old.originalCompleted;
  assert.deepEqual(parseProgress(JSON.stringify(old), ['one'], ['python']), { ...old, learningSchema: 1, legacyCompleted: old.completed, originalCompleted: {} });
  const originalCompleted = { python: '2026-09-25T10:00:00Z', go: 'bad date', unknown: '2026-09-25T10:00:00Z', java: true };
  const restored = parseProgress(JSON.stringify({ ...old, originalCompleted }), ['one'], ['python', 'go', 'java']);
  assert.deepEqual(restored.originalCompleted, { python: originalCompleted.python });
  assert.deepEqual(restored.completed, old.completed);
});
test('restores current topic, language and independent reading positions', () => {
  const p = { ...emptyProgress(), lastLesson: 'one', language: 'en', positions: { 'one:ru': 240, 'one:en': 920 }, visited: { one: '2026-09-25T10:00:00Z' } };
  assert.deepEqual(parseProgress(JSON.stringify(p), ['one']), p);
});
test('ignores unknown topics and invalid saved values', () => {
  const p = parseProgress(JSON.stringify({ ...emptyProgress(), xp: 100000, lastLesson: 'deleted', completed: { one: 'invalid date', deleted: '2026-09-25' }, positions: { 'one:ru': -30, 'one:en': '900', 'deleted:ru': 500 } }), ['one']);
  assert.equal(experience(p, lessons).xp, 0);
  assert.equal(p.lastLesson, null);
  assert.deepEqual(p.positions, {});
});
test('malformed storage is detected rather than silently reset', () => {
  assert.throws(() => parseProgress('{bad json', ['one']));
  assert.throws(() => parseProgress('{"version":2}', ['one']));
  assert.deepEqual(parseProgress(null, ['one']), emptyProgress());
});
test('every topic has its declared languages and belongs to exactly one complete course', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../data/catalog.json', import.meta.url)));
  const assigned = catalog.courses.flatMap(t => t.lessons);
  assert.equal(new Set(assigned).size, catalog.lessons.length);
  assert.equal(assigned.length, catalog.lessons.length);
  for (const course of catalog.courses) {
    assert.equal(new Set(course.lessons).size, course.lessons.length, course.id);
    assert.ok(course.lessons.every(id => catalog.lessons.some(lesson => lesson.id === id && lesson.course === course.id)));
  }
  for (const lesson of catalog.lessons) {
    const file = JSON.parse(fs.readFileSync(new URL(`../public/content/${lesson.id}.json`, import.meta.url)));
    assert.ok(lesson.languages.length > 0, lesson.id);
    assert.deepEqual(Object.keys(file.contents).sort(), [...lesson.languages].sort());
    for (const language of lesson.languages) assert.ok(file.contents[language].length > 100, lesson.id);
    assert.equal(file.id, lesson.id);
    assert.equal(file.course, lesson.course);
    assert.ok(catalog.courses.some(t => t.id === lesson.course && t.lessons.includes(lesson.id)));
    for (const resource of file.resources) {
      assert.ok(resource.code.length > 0);
      assert.ok(!resource.code.includes('\u0000'));
      assert.ok(resource.source.startsWith(catalog.courses.find(course => course.id === lesson.course).source + '/'));
    }
  }
});
