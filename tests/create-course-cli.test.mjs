import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/create-course.mjs', import.meta.url));
function fixture(t) {
  const base = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(base, 'devlibrary-create-cli-'));
  const data = path.join(root, 'library');
  t.after(() => {
    const resolved = fs.realpathSync(root);
    assert.ok(resolved.startsWith(base + path.sep + 'devlibrary-create-cli-'));
    fs.rmSync(resolved, { recursive: true, maxRetries: 3, retryDelay: 100 });
  });
  const run = (...args) => spawnSync(process.execPath, [script, ...args], {
    cwd: root, encoding: 'utf8', env: { ...process.env, DEVLIBRARY_SEED: 'empty', DEVLIBRARY_DATA_DIR: data },
  });
  const read = (directory = data) => JSON.parse(fs.readFileSync(path.join(directory, 'library.json'), 'utf8'));
  return { root, data, run, read };
}

test('CLI help and invalid input do not initialize or write a library', t => {
  const { root, data, run } = fixture(t);
  const help = run('--help');
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /pnpm course:create/);
  for (const args of [[], ['--title', 'Course', '--language', 'xx'], ['--title', 'Course', '--path', root, '--note', 'note.md'], ['--unknown']]) {
    assert.notEqual(run(...args).status, 0);
    assert.equal(fs.existsSync(data), false);
  }
  const oversized = path.join(root, 'large.md');
  fs.writeFileSync(oversized, 'a'.repeat(2_000_001));
  const result = run('--title', 'Course', '--note', oversized);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /2 МБ/);
  assert.equal(fs.existsSync(data), false);
});

test('CLI creates empty and authored courses without altering earlier content or progress', t => {
  const { root, data, run, read } = fixture(t);
  const first = run('--title', 'My empty course');
  assert.equal(first.status, 0, first.stderr);
  const firstId = JSON.parse(first.stdout).id;
  assert.deepEqual(read().courses.find(course => course.id === firstId).lessons, []);
  const progress = '{"userActivity":"keep"}';
  fs.writeFileSync(path.join(data, 'progress.json'), progress);
  const source = path.join(root, 'lesson.md');
  fs.writeFileSync(source, '\uFEFF# First lesson\n\nSome original teaching material.');
  const second = run('--title', 'My note course', '--note', source, '--language', 'en');
  assert.equal(second.status, 0, second.stderr);
  const state = read();
  assert.equal(state.courses.length, 2);
  assert.ok(state.courses.some(course => course.id === firstId));
  const lesson = state.lessons.find(lesson => lesson.course === JSON.parse(second.stdout).id);
  assert.match(lesson.contents.en, /Some original teaching material/);
  assert.equal(lesson.titles.en, 'First lesson');
  assert.equal(fs.readFileSync(path.join(data, 'progress.json'), 'utf8'), progress);
  assert.match(fs.readFileSync(source, 'utf8'), /^\uFEFF# First lesson/);
});

test('CLI imports a folder with two translations as one lesson and protects against duplicate import', t => {
  const { root, run, read } = fixture(t);
  const source = path.join(root, 'My own course');
  const lessonRoot = path.join(source, 'Notes', '01-introduction');
  fs.mkdirSync(lessonRoot, { recursive: true });
  const russian = '# Введение\n\nСобственный конспект.';
  fs.writeFileSync(path.join(lessonRoot, 'README.ru.md'), russian);
  fs.writeFileSync(path.join(lessonRoot, 'README.en.md'), '# Introduction\n\nMy own notes.');
  const result = run('--path', source);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read().courses[0].title, 'My own course');
  assert.equal(read().lessons.length, 1);
  assert.deepEqual(new Set(read().lessons[0].languages), new Set(['ru', 'en']));
  assert.equal(fs.readFileSync(path.join(lessonRoot, 'README.ru.md'), 'utf8'), russian);
  const before = JSON.stringify(read());
  assert.notEqual(run('--path', source).status, 0);
  assert.equal(JSON.stringify(read()), before);
});

test('an explicit data directory creates a separate local library', t => {
  const { root, data, run, read } = fixture(t);
  const other = path.join(root, 'another-user-library');
  const result = run('--title', 'Separate course', '--data-dir', other);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(data), false);
  assert.equal(read(other).courses.length, 1);
  assert.equal(JSON.parse(result.stdout).storage, other);
});
