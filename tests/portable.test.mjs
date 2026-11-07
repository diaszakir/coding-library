import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exportPortable } from '../scripts/prepare-portable.mjs';
import { createLibraryStore, defaultDataDirectory } from '../lib/local-library.mjs';
import { checkLocalRequest } from '../lib/local-request.ts';

function fixture(t) {
  const base = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(base, 'devlibrary-portable-'));
  t.after(() => {
    const resolved = fs.realpathSync(root);
    assert.ok(resolved.startsWith(base + path.sep + 'devlibrary-portable-'));
    fs.rmSync(resolved, { recursive: true, maxRetries: 3, retryDelay: 100 });
  });
  return root;
}

test('portable export contains no personal lessons, history, runtime data or private documents', t => {
  const root = fixture(t);
  const output = exportPortable(path.join(root, 'source'));
  const catalog = JSON.parse(fs.readFileSync(path.join(output, 'data/catalog.json')));
  const previousDataDir = process.env.DEVLIBRARY_DATA_DIR;
  delete process.env.DEVLIBRARY_DATA_DIR;
  try { assert.equal(defaultDataDirectory(output), path.join(output, 'library-data')); }
  finally { if (previousDataDir !== undefined) process.env.DEVLIBRARY_DATA_DIR = previousDataDir; }
  assert.deepEqual(catalog.courses, []);
  assert.deepEqual(catalog.lessons, []);
  for (const relative of ['public/content', '.git', '.openai', 'reports', 'library-data', 'outputs', 'node_modules', 'data/python-course-notes.json', 'docs/pilot-sources.md']) assert.equal(fs.existsSync(path.join(output, relative)), false, relative);
  for (const file of ['python-notebooks.json', 'python-video-basics.json', 'python-video-advanced.json', 'go-foundations.json', 'go-projects.json']) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, 'data', file))), {});
  const store = createLibraryStore(path.join(root, 'library'), output);
  assert.equal(store.catalog().courses.length, 0);
  const { id } = store.createCourse({ title: 'My course', note: { language: 'ru', text: '# Моя первая тема\n\nТекст.' } });
  assert.equal(store.catalog().courses[0].id, id);
  assert.equal(createLibraryStore(path.join(root, 'library'), output).catalog().lessons.length, 1);
  assert.throws(() => exportPortable(output), /empty/);
});

test('empty initialization needs no seed files and never resets an existing library', t => {
  const root = fixture(t);
  const data = path.join(root, 'library');
  const missingSeed = path.join(root, 'missing');
  const store = createLibraryStore(data, missingSeed, { seed: 'empty' });
  assert.equal(store.catalog().courses.length, 0);
  const { id } = store.createCourse({ title: 'Keep this course' });
  store.saveProgress({ custom: 'preserve' });
  const reopened = createLibraryStore(data, missingSeed, { seed: 'empty' });
  assert.equal(reopened.catalog().courses[0].id, id);
  assert.deepEqual(reopened.progress(), { custom: 'preserve' });
});

test('IPv6 loopback works and LAN access remains opt-in with exact same-origin writes', t => {
  const old = process.env.DEVLIBRARY_ALLOW_NETWORK;
  t.after(() => { if (old === undefined) delete process.env.DEVLIBRARY_ALLOW_NETWORK; else process.env.DEVLIBRARY_ALLOW_NETWORK = old; });
  const request = (host, origin) => new Request('http://localhost/api/library', { method: 'POST', headers: { host, origin, 'content-type': 'application/json' }, body: '{}' });
  delete process.env.DEVLIBRARY_ALLOW_NETWORK;
  assert.doesNotThrow(() => checkLocalRequest(request('[::1]:3000', 'http://[::1]:3000'), true));
  assert.throws(() => checkLocalRequest(request('192.168.1.5:3000', 'http://192.168.1.5:3000'), true));
  process.env.DEVLIBRARY_ALLOW_NETWORK = 'true';
  assert.doesNotThrow(() => checkLocalRequest(request('192.168.1.5:3000', 'http://192.168.1.5:3000'), true));
  for (const host of ['evil.test', '8.8.8.8:3000', '192.168.1.999:3000', '192.168.1.5:3000']) assert.throws(() => checkLocalRequest(request(host, 'https://evil.test'), true));
});
