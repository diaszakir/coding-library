import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { discoverNotes, projectBilingual } from '../scripts/note-files.mjs';
import { notePath } from '../lib/note-path.mjs';

test('named language files and notes suffixes form one chapter and resolve reader links', t => {
  const base = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(base, 'devlibrary-languages-'));
  t.after(() => { const target = fs.realpathSync(root); assert.ok(target.startsWith(base + path.sep + 'devlibrary-languages-')); fs.rmSync(target, { recursive: true, maxRetries: 3, retryDelay: 100 }); });
  for (const [chapter, filenames] of Object.entries({ Codex: ['Russian.md', 'English.md'], Testing: ['notes.ru.md', 'notes.en.md'], Other: ['Topic.ru.md', 'Topic.en.md'] })) {
    const directory = path.join(root, chapter, 'Notes', '01 Intro');
    fs.mkdirSync(directory, { recursive: true });
    for (const filename of filenames) fs.writeFileSync(path.join(directory, filename), '# Notes');
  }
  const notes = discoverNotes(root);
  assert.equal(notes.length, 3);
  for (const note of notes) {
    assert.deepEqual(note.files.map(file => file.language).sort(), ['en', 'ru']);
    for (const file of note.files) {
      assert.deepEqual(notePath(path.relative(root, file.file)), { source: note.source, language: file.language });
    }
  }
  assert.deepEqual(notes.map(note => note.source), ['Codex/01 Intro', 'Other/01 Intro/Topic', 'Testing/01 Intro']);
  fs.writeFileSync(path.join(root, 'Codex', 'Notes', 'README.md'), '<!-- devlibrary:index -->\n# Index');
  assert.equal(discoverNotes(root).length, 3, 'generated indexes are not lessons');
  const chapter = path.join(root, 'Other', 'Notes', '01 Intro', 'Topic');
  fs.mkdirSync(chapter);
  for (const language of ['ru', 'en']) fs.renameSync(path.join(path.dirname(chapter), `Topic.${language}.md`), path.join(chapter, `README.${language}.md`));
  assert.deepEqual(discoverNotes(root).map(note => note.source), notes.map(note => note.source), 'standard filenames preserve standalone topic identity');
});

test('chapter filenames and README files retain one identity across a Notes migration', t => {
  const base = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(base, 'devlibrary-format-'));
  t.after(() => { const target = fs.realpathSync(root); assert.ok(target.startsWith(base + path.sep + 'devlibrary-format-')); fs.rmSync(target,{recursive:true,maxRetries:3,retryDelay:100}); });
  const old = path.join(root,'Spring','Microservices','03 - REST');
  const moved = path.join(root,'Spring','Microservices','Notes','03 - REST');
  fs.mkdirSync(old,{recursive:true}); fs.mkdirSync(moved,{recursive:true});
  fs.writeFileSync(path.join(old,'README.md'),'# Old English');
  fs.writeFileSync(path.join(old,'README.ru.md'),'# Old Russian');
  fs.writeFileSync(path.join(moved,'03 - REST.ru.md'),'# Updated Russian');
  const notes = discoverNotes(root);
  assert.equal(notes.length,1);
  assert.equal(notes[0].source,'Spring/Microservices/03 - REST');
  assert.equal(notes[0].files.find(file=>file.language==='ru').file,path.join(moved,'03 - REST.ru.md'));
  assert.equal(notes[0].files.find(file=>file.language==='en').file,path.join(old,'README.md'));
  const java = path.join(root,'Java','Notes','01_Basics'); fs.mkdirSync(java,{recursive:true});
  fs.writeFileSync(path.join(java,'01_Introduction.md'),'# Standalone topic');
  assert.ok(discoverNotes(root).some(note=>note.source==='Java/01_Basics/01_Introduction'));
});

test('bilingual projection keeps complete code and selects the matching explanation', () => {
  const source = '# Введение / Introduction\n\n**RU.** Описание\n\n**EN.** Explanation\n\n```java\n// RU / EN must remain unchanged\nSystem.out.println("a / b");\n```\n\n## Разбор — RU\nРусский разбор\n\n## Walkthrough — EN\nEnglish explanation\n\n## Результат / Output\n```text\na / b\n```\n';
  const blocks = text => [...text.matchAll(/```[\s\S]*?```/g)].map(match=>match[0]);
  for (const language of ['ru','en']) {
    const result = projectBilingual(source,language);
    assert.deepEqual(blocks(result),blocks(source));
    assert.ok(result.includes(language==='ru'?'Русский разбор':'English explanation'));
    assert.ok(!result.includes(language==='ru'?'English explanation':'Русский разбор'));
  }
});
