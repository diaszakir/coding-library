import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createLibraryStore, defaultDataDirectory } from '../lib/local-library.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const help = `Создание собственного курса в локальной библиотеке.

pnpm course:create --title "Мой курс"
pnpm course:create --title "Мой курс" --note ./lesson.md --language ru
pnpm course:create --title "Мой курс" --path ./course-folder

  --title       Название курса (для --path по умолчанию имя папки)
  --path        Папка готового курса; исходники копируются без изменений
  --note        Первый конспект .md, .markdown или .txt (до 2 МБ)
  --language    Язык первого конспекта: ru или en, по умолчанию ru
  --data-dir    Папка библиотеки; иначе общая настройка DEVLIBRARY_DATA_DIR/config
  --help        Показать инструкцию без создания файлов

Создаётся отдельный курс. Существующие курсы и прогресс не меняются.
`;

export function createCourseFromArguments(args) {
  const { values } = parseArgs({ args, options: {
    title: { type: 'string' }, path: { type: 'string' }, note: { type: 'string' },
    language: { type: 'string', default: 'ru' }, 'data-dir': { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) { console.log(help); return; }
  for (const name of ['path', 'note', 'data-dir']) {
    if (values[name] !== undefined && !values[name].trim()) throw new Error(`--${name} не должен быть пустым.`);
  }
  if (values.path && values.note) throw new Error('Выбери один источник: --path или --note.');
  if (!['ru', 'en'].includes(values.language)) throw new Error('--language должен быть ru или en.');
  const source = values.path ? path.resolve(values.path) : null;
  const title = values.title?.trim() || (source ? path.basename(source) : '');
  if (!title || title.length > 160) throw new Error('Укажи --title: от 1 до 160 символов.');
  let note;
  if (values.note) {
    const filename = path.resolve(values.note);
    if (!/\.(?:md|markdown|txt)$/i.test(filename)) throw new Error('--note принимает .md, .markdown или .txt.');
    const info = fs.statSync(filename);
    if (!info.isFile() || info.size > 2_000_000) throw new Error('Конспект должен быть файлом до 2 МБ.');
    const text = fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '');
    if (!text.trim()) throw new Error('Конспект пуст. Напиши текст или создай курс без --note.');
    note = { language: values.language, text };
  }
  const dataRoot = values['data-dir'] ? path.resolve(values['data-dir']) : defaultDataDirectory(projectRoot);
  const store = createLibraryStore(dataRoot, projectRoot);
  const result = source ? store.importCourse({ path: source, title }) : store.createCourse({ title, ...(note ? { note } : {}) });
  console.log(JSON.stringify({ id: result.id, title, storage: dataRoot, open: `/?view=manage&course=${encodeURIComponent(result.id)}` }, null, 2));
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { createCourseFromArguments(process.argv.slice(2)); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Не удалось создать курс.'); process.exitCode = 1; }
}
