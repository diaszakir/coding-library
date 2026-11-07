import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { notePath } from './note-path.mjs';
import { projectBilingual } from '../scripts/note-files.mjs';
import { normalizeSections, courseSections } from './course-sections.mjs';

export class LibraryError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
const slash = value => value.replaceAll('\\', '/');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const codeExtensions = new Set(['.java','.go','.py','.js','.ts','.tsx','.jsx','.rs','.c','.cpp','.h','.cs','.kt','.sql','.sh','.ps1','.xml','.yaml','.yml']);
const ignored = new Set(['node_modules', 'vendor', 'target', 'build', 'dist', 'out', '__pycache__']);
function inside(root, relative) {
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) throw new LibraryError('Недопустимый путь файла');
  let existing = target;
  while (!fs.existsSync(existing)) existing = path.dirname(existing);
  const actual = fs.realpathSync(existing);
  if (actual !== root && !actual.startsWith(root + path.sep)) throw new LibraryError('Ссылки за пределы папки не поддерживаются');
  return target;
}
function folder(value) {
  if (typeof value === 'string') value = value.trim().replace(/^"(.*)"$/, '$1');
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.startsWith('\\\\')) throw new LibraryError('Укажи полный путь к локальной папке');
  if (!fs.existsSync(value) || !fs.statSync(value).isDirectory()) throw new LibraryError('Папка не найдена');
  return fs.realpathSync(value);
}
function atomic(file, value) {
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2));
  try { fs.renameSync(temporary, file); } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function metadata(input, categories) {
  const text = (value, max, required = false) => {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new LibraryError('Проверь название и описание курса');
    return value.trim();
  };
  if (!categories.some(c => c.id !== 'all' && c.id === input.category)) throw new LibraryError('Выбери категорию');
  if (!['beginner', 'intermediate', 'advanced'].includes(input.difficulty)) throw new LibraryError('Выбери сложность');
  if (!/^#[a-f\d]{6}$/i.test(input.color)) throw new LibraryError('Некорректный цвет');
  if (!Array.isArray(input.tags) || input.tags.length > 12) throw new LibraryError('Допустимо до 12 тегов');
  return { title: text(input.title, 160, true), category: input.category, difficulty: input.difficulty,
    mark: text(input.mark, 5, true), color: input.color, tags: [...new Set(input.tags.map(tag => text(tag, 40)).filter(Boolean))],
    descriptions: { ru: text(input.descriptions?.ru, 3000), en: text(input.descriptions?.en, 3000) } };
}
function newMetadata(input, categories, title = '') {
  return metadata({ title, category: 'tools', difficulty: 'beginner', mark: 'NEW', color: '#438823', tags: [], descriptions: { ru: '', en: '' }, ...input }, categories);
}
function authoredNote(input) {
  if (!input || typeof input.text !== 'string' || !input.text.trim()) throw new LibraryError('Напиши или вставь текст конспекта');
  if (!['ru', 'en'].includes(input.language)) throw new LibraryError('Выбери язык конспекта');
  if (input.title !== undefined && typeof input.title !== 'string') throw new LibraryError('Проверь название темы');
  const body = input.text.trim();
  const title = input.title?.trim() || body.match(/^#\s+(.+)$/m)?.[1] || 'Новая тема';
  if (typeof title !== 'string' || title.length > 160 || /[\r\n]/.test(title)) throw new LibraryError('Название темы должно быть не длиннее 160 символов');
  const text = `# ${title}\n\n${body.replace(/^#\s+[^\n]+(?:\r?\n|$)/, '').trim()}\n`;
  if (Buffer.byteLength(text) > 2_000_000) throw new LibraryError('Конспект превышает 2 МБ');
  return { language: input.language, text };
}

// All imported paths are relative to a course-owned directory. Original folders are read-only.
function scan(root, course, previous = [], allowEmpty = false) {
  const groups = new Map();
  const copies = new Map();
  const warnings = [];
  let count = 0, totalBytes = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ignored.has(entry.name) || entry.isSymbolicLink()) continue;
      const file = path.join(dir, entry.name);
      if (++count > 30000) throw new LibraryError('Слишком много файлов. Выбери папку с конспектами');
      if (entry.isDirectory()) { walk(file); continue; }
      if (!/\.md$/i.test(entry.name) || !entry.isFile()) continue;
      if (fs.statSync(file).size > 2_000_000) throw new LibraryError(`Конспект слишком большой: ${entry.name}`);
      totalBytes += fs.statSync(file).size;
      if (totalBytes > 100_000_000) throw new LibraryError('Конспекты превышают 100 МБ. Раздели материалы на несколько курсов');
      const body = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      const relative = slash(path.relative(root, file));
      copies.set(relative, file);
      if (body.startsWith('<!-- devlibrary:index -->')) continue;
      const parsed = notePath(`${course.source}/${relative}`);
      const group = groups.get(parsed.source) || { source: parsed.source, files: {} };
      const existing = group.files[parsed.language];
      if (existing) {
        const inNotes = name => slash(name).split('/').slice(0, -1).some(part => part.toLowerCase() === 'notes');
        if (existing.body === body || inNotes(existing.relative) !== inNotes(relative)) {
          const keepExisting = existing.body === body || inNotes(existing.relative);
          warnings.push(`Повтор темы: используем ${keepExisting ? existing.relative : relative}.`);
          copies.delete(keepExisting ? relative : existing.relative);
          if (keepExisting) continue;
        } else throw new LibraryError(`Два конспекта одного языка с разным текстом: ${existing.relative} и ${relative}. Переименуй один из них, чтобы добавить отдельной темой`);
      }
      group.files[parsed.language] = { file, relative, body };
      groups.set(parsed.source, group);
    }
  }
  walk(root);
  if (!groups.size && !allowEmpty) throw new LibraryError('В папке нет Markdown-конспектов. Выбери папку с .md файлами или создай курс на сайте');
  const lessons = [];
  for (const group of groups.values()) {
    const contents = {}, sourceFiles = {}, resources = new Map();
    for (const [language, item] of Object.entries(group.files)) {
      contents[language] = item.body;
      sourceFiles[language] = `${course.source}/${item.relative}`;
      copies.set(item.relative, item.file);
      for (const match of item.body.matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g)) {
        const href = match[1] || match[2];
        if (/^(?:[a-z]+:|#|\/)/i.test(href)) continue;
        let linked;
        try { linked = inside(root, path.relative(root, path.resolve(path.dirname(item.file), decodeURIComponent(href.split('#')[0])))); } catch { continue; }
        if (!codeExtensions.has(path.extname(linked).toLowerCase()) || !fs.existsSync(linked) || !fs.statSync(linked).isFile() || fs.statSync(linked).size > 1_000_000) continue;
        const relative = slash(path.relative(root, linked));
        const source = `${course.source}/${relative}`;
        copies.set(relative, linked);
        resources.set(source, { id: hash(source), source, filename: path.basename(linked), language: path.extname(linked).slice(1), code: fs.readFileSync(linked, 'utf8').replace(/^\uFEFF/, '') });
      }
    }
    if (!contents.ru && /\*\*RU\.\*\*[\s\S]*\*\*EN\.\*\*/.test(contents.en || '')) {
      const bilingual = contents.en;
      contents.ru = projectBilingual(bilingual, 'ru'); contents.en = projectBilingual(bilingual, 'en'); sourceFiles.ru = sourceFiles.en;
    }
    const old = previous.find(item => item.source === group.source);
    const overview = group.source === course.source;
    const titles = Object.fromEntries(['ru','en'].map(language => [language, (contents[language] || contents.ru || contents.en).match(/^#\s+(.+)$/m)?.[1].replace(/^\d+[.\s—-]+/, '') || path.basename(group.source)]));
    const content = contents.ru || contents.en;
    lessons.push({ id: old?.id || `${course.id}-${hash(group.source)}`, course: course.id, source: group.source,
      title: titles.ru, titles, languages: Object.keys(contents), overview, xp: old?.xp ?? (overview ? 20 : 50),
      minutes: Math.max(3, Math.round(content.replace(/```[\s\S]*?```/g, '').split(/\s+/).length / 180)),
      codeBlocks: Math.max(...Object.values(contents).map(value => Math.floor([...value.matchAll(/^\s*```/gm)].length / 2))),
      sourceCodeFiles: resources.size, contents, sourceFiles,
      sourcePaths: Object.fromEntries(Object.entries(sourceFiles).map(([lang,file]) => [lang,path.posix.dirname(file)])), resources: [...resources.values()] });
  }
  lessons.sort((a,b) => Number(b.overview) - Number(a.overview) || a.source.localeCompare(b.source, 'en', { numeric: true }));
  return { lessons, copies, warnings };
}

export function defaultDataDirectory(root = process.cwd()) {
  if (process.env.DEVLIBRARY_DATA_DIR) return path.resolve(root, process.env.DEVLIBRARY_DATA_DIR);
  const configFile = path.join(root, 'courses.config.json');
  const config = fs.existsSync(configFile) ? read(configFile) : {};
  return path.resolve(root, config.dataDirectory || './library-data');
}

export function createLibraryStore(dataRoot = defaultDataDirectory(), seedRoot = process.cwd(), options = {}) {
  fs.mkdirSync(dataRoot, { recursive: true });
  dataRoot = fs.realpathSync(dataRoot);
  const stateFile = path.join(dataRoot, 'library.json');
  const progressFile = path.join(dataRoot, 'progress.json');
  const coursesRoot = path.join(dataRoot, 'courses');
  const inbox = path.join(dataRoot, 'inbox');
  for (const dir of [coursesRoot, inbox]) fs.mkdirSync(dir, { recursive: true });
  function lock(work) {
    const file = path.join(dataRoot, 'write.lock');
    let fd;
    try { fd = fs.openSync(file, 'wx'); } catch { throw new LibraryError('Библиотека занята. Повтори через несколько секунд', 409); }
    try { return work(); } finally { fs.closeSync(fd); fs.unlinkSync(file); }
  }
  function save(state) {
    if (fs.existsSync(stateFile)) fs.copyFileSync(stateFile, `${stateFile}.bak`);
    atomic(stateFile, state);
  }
  function initialize() {
    if (fs.existsSync(stateFile)) return;
    lock(() => {
      if (fs.existsSync(stateFile)) return;
      if ((options.seed || process.env.DEVLIBRARY_SEED) === 'empty') {
        save({ version: 1, sectionsVersion: 1, categories: courseSections, courses: [], lessons: [], deleted: {}, knownLessonIds: [], knownCourseIds: [] });
        return;
      }
      const catalog = read(path.join(seedRoot, 'data/catalog.json'));
      const config = read(path.join(seedRoot, 'courses.config.json'));
      const lessons = catalog.lessons.map(lesson => read(path.join(seedRoot, 'public/content', `${lesson.id}.json`)));
      for (const course of catalog.courses) {
        const target = path.join(coursesRoot, course.id);
        fs.mkdirSync(target, { recursive: true });
        const copies = new Map();
        for (const lesson of lessons.filter(item => item.course === course.id)) {
          for (const [language, source] of Object.entries(lesson.sourceFiles)) {
            const relative = source.slice(course.source.length + 1);
            const original = path.join(config.root, source);
            copies.set(relative, fs.existsSync(original) ? fs.readFileSync(original) : Buffer.from(lesson.contents[language]));
          }
          for (const resource of lesson.resources) copies.set(resource.source.slice(course.source.length + 1), Buffer.from(resource.code));
        }
        for (const [relative, bytes] of copies) {
          const file = inside(target, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
        }
      }
      save({ version: 1, categories: catalog.categories, courses: catalog.courses, lessons, deleted: {}, knownLessonIds: lessons.map(l => l.id), knownCourseIds: catalog.courses.map(c => c.id) });
    });
  }
  function state() { initialize(); const result = read(stateFile); if (result.version !== 1) throw new LibraryError('Неподдерживаемый формат библиотеки', 500); return normalizeSections(result); }
  function courseById(state, id, includeDeleted = false) {
    const course = state.courses.find(item => item.id === id);
    if (!course || (!includeDeleted && state.deleted[id])) throw new LibraryError('Курс не найден', 404);
    return course;
  }
  function courseDir(course) { return inside(coursesRoot, course.id); }
  function sourceFile(course, source) {
    if (!source.startsWith(course.source + '/')) throw new LibraryError('Файл не принадлежит курсу');
    return inside(courseDir(course), source.slice(course.source.length + 1));
  }
  function catalog() {
    const data = state();
    const courses = data.courses.filter(course => !data.deleted[course.id]);
    const lessons = data.lessons.filter(lesson => !data.deleted[lesson.course]).map(({ contents, resources, sourceFiles, sourcePaths, ...lesson }) => { void contents; void resources; void sourceFiles; void sourcePaths; return lesson; });
    return { categories: data.categories, courses, lessons, knownLessonIds: data.knownLessonIds, knownCourseIds: data.knownCourseIds,
      importedFiles: data.lessons.filter(l => !data.deleted[l.course]).reduce((n,l) => n + new Set(Object.values(l.sourceFiles)).size, 0),
      sourceCodeFiles: lessons.reduce((n,l) => n + l.sourceCodeFiles, 0),
      storage: { root: dataRoot, inbox }, trash: data.courses.filter(course => data.deleted[course.id]).map(course => ({ id: course.id, title: course.title, deletedAt: data.deleted[course.id] })) };
  }
  function reindex(data, course) {
    const result = scan(courseDir(course), course, data.lessons.filter(l => l.course === course.id), course.lessons.length === 0);
    data.lessons = [...data.lessons.filter(l => l.course !== course.id), ...result.lessons];
    course.lessons = result.lessons.map(l => l.id);
    data.knownLessonIds = [...new Set([...data.knownLessonIds, ...course.lessons])];
    return result;
  }
  function importRoot(value) {
    let root = folder(value);
    // A selected Notes folder and its parent represent the same course.
    if (path.basename(root).toLowerCase() === 'notes') root = folder(path.dirname(root));
    if (root === dataRoot || dataRoot.startsWith(root + path.sep) || root === coursesRoot || root.startsWith(coursesRoot + path.sep)) throw new LibraryError('Выбери папку нового курса, а не хранилище библиотеки');
    return root;
  }
  function existingImport(data, root) {
    const key = value => process.platform === 'win32' ? value.toLowerCase() : value;
    return data.courses.find(course => course.importedFrom && key(course.importedFrom) === key(root));
  }
  function saveNewCourse(data, course, writeFiles) {
    const target = path.join(coursesRoot, course.id);
    fs.mkdirSync(target);
    try {
      writeFiles(target);
      data.courses.push(course); data.knownCourseIds.push(course.id);
      if (fs.readdirSync(target).length) reindex(data, course);
      save(data);
      return { id: course.id };
    } catch (error) {
      // Only remove the newly allocated directory, never the selected source.
      const owned = inside(coursesRoot, course.id);
      fs.rmSync(owned, { recursive: true, force: true });
      throw error;
    }
  }
  return {
    catalog,
    lesson(id) { const data = state(); const lesson = data.lessons.find(l => l.id === id && !data.deleted[l.course]); if (!lesson) throw new LibraryError('Конспект не найден', 404); return lesson; },
    folders(value) {
      const dir = folder(value || inbox);
      const home = os.homedir();
      const locations = [
        { name: 'Входящие', path: inbox }, { name: 'Рабочий стол', path: path.join(home, 'Desktop') },
        { name: 'Загрузки', path: path.join(home, 'Downloads') }, { name: 'Документы', path: path.join(home, 'Documents') },
        { name: 'Домашняя папка', path: home },
        ...(process.platform === 'win32' ? Array.from({ length: 26 }, (_, i) => { const drive = `${String.fromCharCode(65 + i)}:\\`; return { name: drive, path: drive }; }) : [{ name: '/', path: '/' }]),
      ].filter(item => fs.existsSync(item.path));
      return { path: dir, parent: path.dirname(dir), locations, folders: fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory() && !e.isSymbolicLink() && !e.name.startsWith('.') && !ignored.has(e.name)).map(e => ({ name: e.name, path: path.join(dir, e.name) })).sort((a, b) => a.name.localeCompare(b.name, 'ru', { numeric: true })) };
    },
    preview(value) {
      const root = importRoot(value); const data = state(); const existing = existingImport(data, root);
      const result = scan(root, { id: 'preview', source: 'preview' });
      return { path: root, title: path.basename(root), topics: result.lessons.length, files: result.copies.size, warnings: result.warnings,
        existing: existing ? { id: existing.id, title: existing.title, deleted: Boolean(data.deleted[existing.id]) } : null,
        lessons: result.lessons.map(l => ({ title: l.title, languages: l.languages })) };
    },
    importCourse(input) {
      initialize(); return lock(() => {
        const data = state(); const root = importRoot(input.path); const meta = newMetadata(input, data.categories, path.basename(root));
        const existing = existingImport(data, root);
        if (existing) throw new LibraryError(`Курс «${existing.title}» уже добавлен${data.deleted[existing.id] ? ' и находится в корзине. Восстанови его' : '. Открой его в библиотеке'}`, 409);
        const id = `course-${crypto.randomUUID().slice(0, 8)}`;
        const course = { ...meta, id, source: id, importedFrom: root, lessons: [] };
        const result = scan(root, course);
        return saveNewCourse(data, course, target => {
          for (const [relative, original] of result.copies) { const file = inside(target, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.copyFileSync(original, file); }
        });
      });
    },
    createCourse(input) {
      const note = input.note ? authoredNote(input.note) : null;
      initialize(); return lock(() => {
        const data = state(); const meta = newMetadata(input, data.categories); const id = `course-${crypto.randomUUID().slice(0, 8)}`;
        return saveNewCourse(data, { ...meta, id, source: id, lessons: [] }, target => {
          if (note) { const dir = path.join(target, 'Notes', '0001'); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, `README.${note.language}.md`), note.text); }
        });
      });
    },
    addNote(id, input) {
      const note = authoredNote(input);
      initialize(); return lock(() => {
        const data = state(); const course = courseById(data, id); const root = courseDir(course);
        const previous = new Set(course.lessons); let sequence = course.lessons.length + 1;
        let relative;
        do { relative = `Notes/${String(sequence++).padStart(4, '0')}`; }
        while (fs.existsSync(inside(root, relative)) || data.lessons.some(l => l.course === id && l.source === `${course.source}/${relative.slice(6)}`));
        const target = inside(root, relative); fs.mkdirSync(target, { recursive: true });
        try {
          fs.writeFileSync(path.join(target, `README.${note.language}.md`), note.text);
          reindex(data, course); save(data);
          return { id, lessonId: course.lessons.find(value => !previous.has(value)) };
        } catch (error) { fs.rmSync(inside(root, relative), { recursive: true, force: true }); throw error; }
      });
    },
    updateCourse(id, input) { initialize(); return lock(() => { const data = state(); const course = courseById(data, id); Object.assign(course, metadata(input, data.categories)); save(data); return { id }; }); },
    deleteCourse(id) { initialize(); return lock(() => { const data = state(); courseById(data, id); data.deleted[id] = new Date().toISOString(); save(data); return { id }; }); },
    restoreCourse(id) { initialize(); return lock(() => { const data = state(); courseById(data, id, true); delete data.deleted[id]; save(data); return { id }; }); },
    refreshCourse(id) { initialize(); return lock(() => { const data = state(); const course = courseById(data,id); reindex(data,course); save(data); return { id }; }); },
    note(id, language) {
      const data = state(); const lesson = data.lessons.find(l => l.id === id); if (!lesson) throw new LibraryError('Конспект не найден',404);
      const course = courseById(data,lesson.course); const source = lesson.sourceFiles[language]; if (!source) throw new LibraryError('Нет файла для этого языка',404);
      const file = sourceFile(course, source); return { text: fs.readFileSync(file,'utf8'), path: file, shared: lesson.sourceFiles.ru === lesson.sourceFiles.en };
    },
    saveNote(id, language, text, expectedHash) {
      if (typeof text !== 'string' || !text.trim() || Buffer.byteLength(text) > 2_000_000) throw new LibraryError('Конспект пустой или превышает 2 МБ');
      initialize(); return lock(() => {
        const data = state(); const lesson = data.lessons.find(l => l.id === id); if (!lesson) throw new LibraryError('Конспект не найден',404);
        const course = courseById(data,lesson.course); const source = lesson.sourceFiles[language]; if (!source) throw new LibraryError('Файл не найден',404);
        const file = sourceFile(course,source); const original = fs.readFileSync(file,'utf8');
        if (hash(original) !== expectedHash) throw new LibraryError('Файл изменён. Открой его заново перед сохранением',409);
        const backup = path.join(dataRoot,'backups',`${Date.now()}-${crypto.randomUUID()}.md`); fs.mkdirSync(path.dirname(backup),{recursive:true}); fs.copyFileSync(file,backup);
        fs.writeFileSync(file,text);
        try { reindex(data,course); save(data); } catch (error) { fs.writeFileSync(file,original); throw error; }
        return { id };
      });
    },
    progress() { return fs.existsSync(progressFile) ? read(progressFile) : null; },
    saveProgress(progress, initializeOnly = false) {
      return lock(() => {
        if (initializeOnly && fs.existsSync(progressFile)) return read(progressFile);
        const next = typeof progress === 'function' ? progress(fs.existsSync(progressFile) ? read(progressFile) : null) : progress;
        if (fs.existsSync(progressFile)) { read(progressFile); fs.copyFileSync(progressFile, `${progressFile}.bak`); }
        atomic(progressFile,next); return next;
      });
    },
  };
}
export { hash as contentHash };
