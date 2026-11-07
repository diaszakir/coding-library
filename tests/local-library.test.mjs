import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createLibraryStore, contentHash } from '../lib/local-library.mjs';
import { checkLocalRequest } from '../lib/local-request.ts';

function fixture(t) {
  const base = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(base,'devlibrary-local-'));
  t.after(() => { const resolved = fs.realpathSync(root); assert.ok(resolved.startsWith(base + path.sep + 'devlibrary-local-')); fs.rmSync(resolved,{recursive:true,maxRetries:3,retryDelay:100}); });
  const seed = path.join(root,'seed'), source = path.join(root,'source'), data = path.join(root,'data');
  fs.mkdirSync(path.join(seed,'data'),{recursive:true}); fs.mkdirSync(path.join(source,'Notes','01 Intro'),{recursive:true});
  fs.writeFileSync(path.join(seed,'data/catalog.json'),JSON.stringify({ categories:[{id:'all',titles:{ru:'Все',en:'All'}},{id:'tools',titles:{ru:'Инструменты',en:'Tools'}}],courses:[],lessons:[] }));
  fs.writeFileSync(path.join(seed,'courses.config.json'),JSON.stringify({root:source}));
  fs.writeFileSync(path.join(source,'Notes','01 Intro','README.ru.md'),'# Введение\n\nТекст урока.\n\n[Программа](../../example.py)\n');
  fs.writeFileSync(path.join(source,'Notes','01 Intro','README.en.md'),'# Introduction\n\nEnglish text.\n');
  fs.writeFileSync(path.join(source,'example.py'),'print("hello")');
  fs.writeFileSync(path.join(source,'video.mp4'),'not a real video');
  const input = {path:source,title:'Sample',category:'tools',difficulty:'beginner',mark:'S',color:'#336633',tags:[],descriptions:{ru:'Курс',en:'Course'}};
  return {root,source,data,seed,input,store:createLibraryStore(data,seed)};
}
test('course CRUD persists across restarts, copies files, preserves IDs and restores trash', t => {
  const {store,input,source,data,seed} = fixture(t);
  assert.equal(store.preview(source).topics,1);
  const {id} = store.importCourse(input);
  const catalog = store.catalog(); const lesson = catalog.lessons[0];
  assert.equal(catalog.courses.length,1); assert.equal(lesson.sourceCodeFiles,1);
  assert.equal(fs.existsSync(path.join(data,'courses',id,'video.mp4')),false);
  assert.equal(fs.readFileSync(path.join(data,'courses',id,'example.py'),'utf8'),'print("hello")');
  store.updateCourse(id,{...input,title:'Edited'});
  assert.equal(createLibraryStore(data,seed).catalog().courses[0].title,'Edited');
  store.refreshCourse(id); assert.equal(store.catalog().lessons[0].id,lesson.id);
  store.deleteCourse(id); assert.equal(store.catalog().courses.length,0); assert.equal(store.catalog().trash.length,1);
  assert.ok(store.catalog().knownLessonIds.includes(lesson.id)); assert.ok(store.catalog().knownCourseIds.includes(id));
  assert.throws(() => store.lesson(lesson.id),/не найден/);
  store.restoreCourse(id); assert.equal(store.catalog().lessons[0].id,lesson.id);
  assert.ok(fs.existsSync(path.join(source,'Notes','01 Intro','README.ru.md')));
});

test('progress updater reads the current disk state inside the write lock', t => {
  const { store, data } = fixture(t);
  store.saveProgress({ version: 1, count: 2 });
  assert.deepEqual(store.saveProgress(current => ({ ...current, count: current.count + 3 })), { version: 1, count: 5 });
  assert.equal(store.progress().count, 5);
  assert.equal(JSON.parse(fs.readFileSync(path.join(data, 'progress.json.bak'), 'utf8')).count, 2);
  assert.throws(() => store.saveProgress(() => { throw new Error('Invalid merge'); }), /Invalid merge/);
  assert.equal(store.progress().count, 5);
});
test('note editing backs up original files, rejects stale saves and preserves original source', t => {
  const {store,input,source,data} = fixture(t); store.importCourse(input);
  const id = store.catalog().lessons[0].id; const before = store.note(id,'ru');
  const next = '# Новое название\n\nОбновлённый текст.';
  store.saveNote(id,'ru',next,contentHash(before.text));
  assert.equal(store.lesson(id).titles.ru,'Новое название'); assert.equal(store.note(id,'ru').text,next);
  assert.throws(() => store.saveNote(id,'ru','Another edit',contentHash(before.text)),/изменён/);
  assert.match(fs.readFileSync(path.join(source,'Notes','01 Intro','README.ru.md'),'utf8'),/# Введение/);
  const backups = fs.readdirSync(path.join(data,'backups')); assert.equal(backups.length,1);
  assert.equal(fs.readFileSync(path.join(data,'backups',backups[0]),'utf8'),before.text);
});
test('empty imports, duplicate translations, invalid metadata and missing IDs fail without changing catalog', t => {
  const {store,input,source,root} = fixture(t); store.catalog();
  const empty = path.join(root,'empty'); fs.mkdirSync(empty);
  assert.throws(() => store.importCourse({...input,path:empty}),/нет Markdown/);
  assert.throws(() => store.importCourse({...input,category:'unknown'}),/категорию/);
  assert.throws(() => store.deleteCourse('../escape'),/не найден/);
  fs.writeFileSync(path.join(source,'Notes','01 Intro','Russian.md'),'# Duplicate');
  assert.throws(() => store.importCourse(input),/Два конспекта/);
  assert.equal(store.catalog().courses.length,0);
});
test('links cannot import source files outside the selected course', t => {
  const {store,input,source,root} = fixture(t);
  fs.writeFileSync(path.join(root,'secret.py'),'private');
  fs.appendFileSync(path.join(source,'Notes','01 Intro','README.ru.md'),'\n[Escape](../../../secret.py)');
  store.importCourse(input);
  const lesson = store.lesson(store.catalog().lessons[0].id);
  assert.equal(lesson.resources.length,1); assert.equal(lesson.resources[0].filename,'example.py');
});
test('progress initialization is one-time and corrupt disk data is never overwritten', t => {
  const {store,data} = fixture(t);
  const initial = {version:1,completed:{one:'2026-09-27'}};
  assert.equal(store.progress(),null); assert.deepEqual(store.saveProgress(initial,true),initial);
  assert.deepEqual(store.saveProgress({version:1},true),initial);
  fs.writeFileSync(path.join(data,'progress.json'),'{broken');
  assert.throws(() => store.saveProgress({version:1}));
  assert.equal(fs.readFileSync(path.join(data,'progress.json'),'utf8'),'{broken');
});
test('filesystem mutations require a loopback host and exact same origin', () => {
  const request = (host,origin) => new Request('http://127.0.0.1:3000/api/library',{method:'POST',headers:{host,...(origin?{origin}:{}),'content-type':'application/json'},body:'{}'});
  assert.doesNotThrow(() => checkLocalRequest(request('127.0.0.1:3000','http://127.0.0.1:3000'),true));
  assert.throws(() => checkLocalRequest(request('127.0.0.1:3000','https://example.com'),true));
  assert.throws(() => checkLocalRequest(request('evil.test','http://evil.test'),true));
  assert.throws(() => checkLocalRequest(request('127.0.0.1:3000'),true));
});

test('a quoted folder or its Notes folder imports with defaults and prevents repeat imports even from trash', t => {
  const {store,source} = fixture(t);
  const preview = store.preview(`  "${path.join(source,'Notes')}"  `);
  assert.equal(preview.path, source); assert.equal(preview.title, 'source'); assert.equal(preview.topics, 1);
  const {id} = store.importCourse({path: preview.path});
  const course = store.catalog().courses[0];
  assert.equal(course.title,'source'); assert.equal(course.category,'tools');
  assert.equal(store.preview(path.join(source,'Notes')).existing.id,id);
  assert.throws(() => store.importCourse({path:source}), /уже добавлен/);
  store.deleteCourse(id);
  assert.equal(store.preview(source).existing.deleted,true);
  assert.throws(() => store.importCourse({path:source}), /корзине/);
  store.restoreCourse(id); assert.equal(store.catalog().courses.length,1);
});

test('identical copies and older files outside Notes do not block import or later editing', t => {
  const {store,source,data} = fixture(t);
  const original = path.join(source,'Notes','01 Intro','README.ru.md');
  fs.copyFileSync(original,path.join(path.dirname(original),'Russian.md'));
  fs.mkdirSync(path.join(source,'01 Intro'));
  fs.writeFileSync(path.join(source,'01 Intro','README.ru.md'),'# Old version');
  const preview = store.preview(source); assert.equal(preview.topics,1); assert.equal(preview.warnings.length,2);
  const {id} = store.importCourse({path:source});
  assert.equal(fs.existsSync(path.join(data,'courses',id,'01 Intro','README.ru.md')),false);
  assert.equal(fs.existsSync(path.join(data,'courses',id,'Notes','01 Intro','Russian.md')),false);
  const lesson = store.catalog().lessons[0]; const note = store.note(lesson.id,'ru');
  assert.match(note.text, /Введение/);
  store.saveNote(lesson.id,'ru','# Обновлено\n\nНовый текст',contentHash(note.text));
  assert.equal(store.lesson(lesson.id).titles.ru,'Обновлено');
  assert.match(fs.readFileSync(original,'utf8'), /Введение/);
});

test('creating a course and adding notes persists files, languages and lesson identities', t => {
  const {store,data,seed} = fixture(t);
  const {id} = store.createCourse({title:'Мои заметки'});
  assert.deepEqual(store.catalog().courses[0].lessons,[]);
  store.refreshCourse(id);
  const first = store.addNote(id,{title:'Первая тема',language:'ru',text:'# Старый заголовок\n\nТекст\n\n```js\nconst answer = 42;\n```'});
  const second = store.addNote(id,{title:'Первая тема',language:'en',text:'English text'});
  assert.notEqual(first.lessonId,second.lessonId);
  const lesson = store.lesson(first.lessonId); assert.deepEqual(lesson.languages,['ru']);
  assert.equal(lesson.titles.ru,'Первая тема'); assert.match(lesson.contents.ru, /const answer = 42/);
  assert.ok(!lesson.contents.ru.includes('Старый заголовок'));
  assert.equal(fs.readFileSync(store.note(first.lessonId,'ru').path,'utf8'),lesson.contents.ru);
  const before = store.catalog().courses[0].lessons;
  store.refreshCourse(id); assert.deepEqual(store.catalog().courses[0].lessons,before);
  assert.deepEqual(createLibraryStore(data,seed).catalog().courses[0].lessons,before);
  const withNote = store.createCourse({title:'Сразу с темой',note:{language:'ru',text:'# Вставленный заголовок\n\nТекст'}});
  assert.equal(store.catalog().courses.find(c=>c.id===withNote.id).lessons.length,1);
  assert.equal(store.catalog().lessons.at(-1).titles.ru,'Вставленный заголовок');
});

test('invalid notes and failed indexing leave neither catalog changes nor partially created topics', t => {
  const {store,data} = fixture(t);
  assert.throws(() => store.createCourse({title:'',note:{language:'ru',text:'Text'}}),/название/);
  assert.throws(() => store.createCourse({title:'Invalid',note:{language:'ru',text:''}}),/текст/);
  assert.equal(store.catalog().courses.length,0); assert.deepEqual(fs.readdirSync(path.join(data,'courses')),[]);
  const {id} = store.createCourse({title:'Course',note:{language:'ru',text:'Existing'}});
  assert.throws(() => store.addNote(id,{language:'xx',text:'Text'}),/язык/);
  assert.throws(() => store.addNote(id,{language:'ru',text:'a'.repeat(2_000_001)}),/2 МБ/);
  assert.throws(() => store.addNote('../escape',{language:'ru',text:'Text'}),/не найден/);
  const dir = path.join(data,'courses',id,'Notes');
  fs.writeFileSync(path.join(dir,'0001','Russian.md'),'# Conflicting translation');
  assert.throws(() => store.addNote(id,{language:'ru',text:'New topic'}),/Два конспекта/);
  assert.deepEqual(fs.readdirSync(dir),['0001']); assert.equal(store.catalog().courses[0].lessons.length,1);
});

test('tag delimiters and whitespace normalize on saving and library storage cannot be imported', t => {
  const {store,data,input} = fixture(t);
  const {id} = store.createCourse({title:'Tags',tags:[' Go',' ', 'SQL ', 'Go']});
  assert.deepEqual(store.catalog().courses[0].tags,['Go','SQL']);
  for (const source of [data,path.join(data,'courses'),path.join(data,'courses',id)]) {
    assert.throws(() => store.preview(source),/хранилище/);
    assert.throws(() => store.importCourse({...input,path:source}),/хранилище/);
  }
});
