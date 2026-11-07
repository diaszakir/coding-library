import test from 'node:test';
import assert from 'node:assert/strict';
import { orderCourseCurriculum } from '../lib/course-curriculum.ts';

test('Python follows intro, video chapters, notebook practice, sources without mutating the catalog', () => {
  const input = { courses: [{ id: 'python', lessons: ['sources', 'notebook', 'video10', 'intro', 'video2', 'new'] }, { id: 'go', lessons: ['b', 'a'] }], lessons: [
    { id: 'sources', source: 'Python/SOURCES' }, { id: 'notebook', source: 'Python/Notebooks/01_Data_types' },
    { id: 'video10', source: 'Python/Video/10_Loops' }, { id: 'intro', source: 'Python' },
    { id: 'video2', source: 'Python/Video/02_Variables' }, { id: 'new', source: 'Python/My_note' },
  ] };
  const before = structuredClone(input);
  const result = orderCourseCurriculum(input);
  assert.deepEqual(result.courses[0].lessons, ['intro', 'video2', 'video10', 'notebook', 'new', 'sources']);
  assert.deepEqual(result.courses[1], input.courses[1]);
  assert.deepEqual(result.lessons, input.lessons);
  assert.deepEqual(input, before);
});

test('Go keeps numbered sections ordered and places review after practice, preserving unknown lessons', () => {
  const source = ['Go/SOURCES', 'Go/12. Course Roundup', 'Go/10. Concurrency - Running Tasks In Parallel', 'Go/examples', 'Go', 'Go/2. Go Essentials', 'Go/YouTube - Backend Technologies', 'Go/Custom practice'];
  const input = { courses: [{ id: 'go', lessons: source.map((_, i) => `id${i}`) }], lessons: source.map((value, i) => ({ id: `id${i}`, source: value })) };
  const result = orderCourseCurriculum(input);
  assert.deepEqual(result.courses[0].lessons, ['id4', 'id5', 'id2', 'id6', 'id3', 'id7', 'id1', 'id0']);
  assert.equal(new Set(result.courses[0].lessons).size, source.length);
  assert.deepEqual(input.courses[0].lessons, source.map((_, i) => `id${i}`));
});
