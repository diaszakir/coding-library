'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, ChevronRight, FolderOpen, LoaderCircle, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { libraryRequest, useCatalog } from '@/components/catalog-provider';
import type { Course } from '@/lib/catalog';

export type CourseFields = Pick<Course, 'title' | 'category' | 'difficulty' | 'mark' | 'color' | 'tags' | 'descriptions'>;
export const defaultFields: CourseFields = { title: '', category: 'tools', difficulty: 'beginner', mark: 'NEW', color: '#438823', tags: [], descriptions: { ru: '', en: '' } };
export type NoteDraft = { title: string; language: string; text: string };
export const emptyNote: NoteDraft = { title: '', language: 'ru', text: '' };
type Preview = { path: string; title: string; topics: number; files: number; warnings: string[]; lessons: { title: string; languages: string[] }[]; existing: { id: string; title: string; deleted: boolean } | null };
type Folder = { name: string; path: string };
type Folders = { path: string; parent: string; locations: Folder[]; folders: Folder[] };

export function CourseOptions({ fields, onChange }: { fields: CourseFields; onChange: (value: Partial<CourseFields>) => void }) {
  const { catalog } = useCatalog();
  return <details className="course-options">
    <summary>Категория и оформление <span>необязательно</span></summary>
    <div className="manager-grid">
      <label>Категория<select value={fields.category} onChange={e => onChange({ category: e.target.value })}>{catalog.categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.titles.ru}</option>)}</select></label>
      <label>Сложность<select value={fields.difficulty} onChange={e => onChange({ difficulty: e.target.value })}><option value="beginner">Начальный</option><option value="intermediate">Средний</option><option value="advanced">Продвинутый</option></select></label>
      <label>Короткая метка<input maxLength={5} value={fields.mark} onChange={e => onChange({ mark: e.target.value })}/></label>
      <label>Цвет<input type="color" value={fields.color} onChange={e => onChange({ color: e.target.value })}/></label>
    </div>
    <label>Теги через запятую<input value={fields.tags.join(',')} onChange={e => onChange({ tags: e.target.value.split(',') })} placeholder="Python, практика"/></label>
    <label>Описание на русском<textarea maxLength={3000} rows={3} value={fields.descriptions.ru} onChange={e => onChange({ descriptions: { ...fields.descriptions, ru: e.target.value } })}/></label>
    <label>Описание на английском<textarea maxLength={3000} rows={3} value={fields.descriptions.en} onChange={e => onChange({ descriptions: { ...fields.descriptions, en: e.target.value } })}/></label>
  </details>;
}

export function NoteInputs({ value, onChange, optional = false }: { value: NoteDraft; onChange: (value: NoteDraft) => void; optional?: boolean }) {
  const [fileError, setFileError] = useState('');
  const reading = useRef(0);
  useEffect(() => { reading.current += 1; }, [value]);
  async function readNote(file: File | undefined) {
    const attempt = ++reading.current;
    setFileError('');
    if (!file) return;
    if (!/\.(?:md|markdown|txt)$/i.test(file.name)) { setFileError('Выбери файл Markdown (.md) или обычный текст (.txt).'); return; }
    if (file.size > 2_000_000) { setFileError('Конспект превышает 2 МБ. Выбери файл меньшего размера.'); return; }
    try {
      const text = (await file.text()).replace(/^\uFEFF/, '');
      if (attempt !== reading.current) return;
      onChange({ ...value, text, title: value.title || text.match(/^#\s+(.+)$/m)?.[1] || file.name.replace(/\.(?:md|markdown|txt)$/i, '') });
    } catch { if (attempt === reading.current) setFileError('Не удалось прочитать файл. Попробуй вставить текст вручную.'); }
  }
  return <div className="note-inputs">
    <div className="manager-grid">
      <label>Название темы<input maxLength={160} value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} placeholder="Из заголовка конспекта или «Новая тема»"/></label>
      <label>Язык конспекта<select value={value.language} onChange={e => onChange({ ...value, language: e.target.value })}><option value="ru">Русский</option><option value="en">English</option></select></label>
    </div>
    <label>Вставить текст из файла<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={e => { void readNote(e.target.files?.[0]); e.target.value = ''; }}/></label>
    <p className="muted">Файл выбирается на твоём устройстве. Его текст появится в редакторе; сохранение — по кнопке ниже.</p>
    {fileError && <p className="storage-warning" role="alert">{fileError}</p>}
    <label>Текст конспекта{optional ? ' (можно добавить позже)' : ''}<textarea required={!optional} rows={10} value={value.text} onChange={e => onChange({ ...value, text: e.target.value })} placeholder="Напиши здесь или вставь готовый конспект…"/></label>
    <p className="muted">Обычный текст и Markdown: заголовки, списки, ссылки и блоки кода. После сохранения приложение само создаст Markdown-файл.</p>
  </div>;
}

function FolderPicker({ initialPath, onSelect, onClose }: { initialPath: string; onSelect: (path: string) => void; onClose: () => void }) {
  const [path, setPath] = useState(initialPath);
  const [data, setData] = useState<Folders | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/library?action=folders&path=${encodeURIComponent(path)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { const result = await response.json() as Folders & { error?: string }; if (!response.ok) throw new Error(result.error || 'Не удалось открыть папку'); return result; })
      .then(result => { if (!controller.signal.aborted) { setData(result); setLoading(false); } })
      .catch(error => { if (!controller.signal.aborted) { setError(error.message); setLoading(false); } });
    return () => controller.abort();
  }, [path, attempt]);
  function navigate(value: string) { setPath(value); setAttempt(old => old + 1); setLoading(true); setError(''); setQuery(''); }
  const visible = data?.folders.filter(folder => folder.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) || [];
  return <div className="folder-picker" aria-label="Выбор папки">
    <div className="manager-heading"><strong>Где лежит курс?</strong><button type="button" className="text-button" onClick={onClose}>Закрыть</button></div>
    {data && <div className="folder-locations">{data.locations.map(location => <button key={location.path} type="button" className="secondary-button" onClick={() => navigate(location.path)}>{location.name}</button>)}</div>}
    {data && <code>{data.path}</code>}
    {error && <p role="alert" className="storage-warning">{error}</p>}
    {loading && <p role="status">Открываем папку…</p>}
    {data && <>
      <div className="manager-actions"><button type="button" className="text-button" disabled={loading || data.parent === data.path} onClick={() => navigate(data.parent)}><ArrowLeft size={15}/>Выше</button><button type="button" className="primary-button" disabled={loading || !!error} onClick={() => onSelect(data.path)}><Check size={16}/>Выбрать эту папку</button></div>
      <label className="folder-filter">Найти папку<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Название папки"/></label>
      <ul>{visible.map(folder => <li key={folder.path}><button type="button" disabled={loading} onClick={() => navigate(folder.path)}><FolderOpen size={17}/><span>{folder.name}</span><ChevronRight size={15}/></button></li>)}</ul>
      {!visible.length && <p className="muted">{query ? 'Папок с таким названием нет.' : 'Вложенных папок нет. Можно выбрать текущую.'}</p>}
    </>}
    {!data && error && <button type="button" className="secondary-button" onClick={() => navigate('')}>Открыть входящие</button>}
  </div>;
}

export function CourseCreator({ onCreated, onCancel, onOpen }: { onCreated: (id: string) => Promise<void>; onCancel: () => void; onOpen: (id: string) => void }) {
  const { catalog } = useCatalog();
  const [mode, setMode] = useState<'folder' | 'write'>('write');
  const [fields, setFields] = useState<CourseFields>(defaultFields);
  const [note, setNote] = useState<NoteDraft>(emptyNote);
  const [path, setPath] = useState('');
  const [picker, setPicker] = useState(false);
  const [preview, setPreview] = useState<(Preview & { requestedPath: string }) | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const titleSuggestion = useRef('');
  const saving = useRef(false);
  const patch = (value: Partial<CourseFields>) => setFields(old => ({ ...old, ...value }));
  // A changed source immediately invalidates the previous preview. Aborted responses
  // cannot replace the most recently selected folder or its suggested title.
  useEffect(() => {
    if (mode !== 'folder' || !path.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      libraryRequest<Preview>({ action: 'preview', path }, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        setPreview({ ...result, requestedPath: path }); setChecking(false);
        const previousSuggestion = titleSuggestion.current;
        setFields(old => ({ ...old, title: !old.title || old.title === previousSuggestion ? result.title : old.title }));
        titleSuggestion.current = result.title;
      }).catch(error => { if (!controller.signal.aborted) { setPreviewError(error.message); setChecking(false); } });
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [path, mode, retry]);
  function selectPath(value: string) { setPath(value); setPreview(null); setPreviewError(''); setError(''); setChecking(!!value.trim()); setRetry(old => old + 1); }
  function changeMode(value: 'folder' | 'write') { if (value === mode) return; setMode(value); setError(''); setPreviewError(''); setChecking(value === 'folder' && !!path.trim()); }
  const ready = preview?.requestedPath === path && !checking && !previewError;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current || (mode === 'folder' && (!ready || preview?.existing))) return;
    saving.current = true; setBusy(true); setError('');
    try {
      const result = await libraryRequest({ ...fields, mark: fields.mark.trim() || 'NEW', action: mode === 'folder' ? 'import' : 'create', path: preview?.path, ...(mode === 'write' && (note.text.trim() || note.title.trim()) ? { note } : {}) });
      await onCreated(result.id);
    } catch (error) { setError(error instanceof Error ? error.message : 'Не удалось добавить курс'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <>
    <button type="button" className="text-button" disabled={busy} onClick={onCancel}><ArrowLeft size={16}/>К списку курсов</button>
    <form className="manager-form course-creator" onSubmit={submit} aria-busy={busy}>
      <h2>Добавить курс</h2>
      <p className="muted">Создай собственный курс или подготовь материалы с ИИ. <Link href="/agents">Инструкция и готовый запрос для ИИ-агента</Link>.</p>
      <fieldset disabled={busy}>
        <div className="creation-methods" role="group" aria-label="Способ добавления">
          <button type="button" aria-pressed={mode === 'folder'} onClick={() => changeMode('folder')}><FolderOpen size={22}/><span><strong>Из папки</strong><small>Уже есть готовые конспекты</small></span></button>
          <button type="button" aria-pressed={mode === 'write'} onClick={() => changeMode('write')}><Pencil size={22}/><span><strong>Написать на сайте</strong><small>Создать курс и добавлять свои темы</small></span></button>
        </div>
        {mode === 'folder' ? <div className="import-source">
          <p className="muted">Выбери папку на компьютере, где запущена библиотека. В Docker это путь внутри контейнера; для файла с другого устройства используй «Написать на сайте».</p>
          <div className="source-row"><label>Папка курса<input value={path} onChange={e => selectPath(e.target.value)} placeholder="Вставь путь или выбери папку"/></label><button type="button" className="secondary-button" onClick={() => setPicker(true)}><FolderOpen size={17}/>{path ? 'Другая папка' : 'Выбрать папку'}</button></div>
          {picker && <FolderPicker initialPath={preview?.path || catalog.storage.inbox} onClose={() => setPicker(false)} onSelect={value => { selectPath(value); setPicker(false); }}/ >}
          {checking && <p className="import-checking" role="status"><LoaderCircle size={17} className="spin"/>Ищем конспекты…</p>}
          {previewError && <div className="storage-warning" role="alert"><p>{previewError}</p><button type="button" className="text-button" onClick={() => selectPath(path)}>Проверить снова</button></div>}
          {ready && preview && <div className="import-preview">
            <strong><Check size={17}/>Готово к добавлению · Тем: {preview.topics}</strong>
            <p className="muted">Скопируем {preview.files} файлов. Исходная папка останется без изменений.</p>
            <details><summary>Посмотреть темы</summary><ul>{preview.lessons.map((lesson, index) => <li key={index}>{lesson.title} <span>{lesson.languages.join(' / ').toUpperCase()}</span></li>)}</ul></details>
            {!!preview.warnings.length && <details><summary>Повторяющиеся конспекты: {preview.warnings.length}</summary><ul>{preview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
            {preview.existing && <div className="storage-warning" role="status">Курс «{preview.existing.title}» уже {preview.existing.deleted ? 'в корзине. Его можно восстановить в списке курсов.' : 'в библиотеке.'}{!preview.existing.deleted && <button type="button" className="text-button" onClick={() => onOpen(preview.existing!.id)}>Открыть курс<ChevronRight size={15}/></button>}</div>}
          </div>}
          <p className="muted">Поддерживаются .md и связанные файлы кода. Видео и архивы не добавляются.</p>
        </div> : <p className="creation-hint">Дай курсу название. Первый конспект можно написать сейчас или добавить позже.</p>}
        <label>Название курса<input required maxLength={160} value={fields.title} onChange={e => patch({ title: e.target.value })} placeholder="Например, Python: мои конспекты"/></label>
        {mode === 'write' && <NoteInputs value={note} onChange={setNote} optional/>}
        <CourseOptions fields={fields} onChange={patch}/>
        {error && <p className="storage-warning" role="alert">{error}</p>}
        <div className="creation-footer"><button type="submit" className="primary-button" disabled={!fields.title.trim() || (mode === 'folder' && (!ready || !!preview?.existing))}>{busy ? <LoaderCircle size={17} className="spin"/> : <Plus size={17}/>}{busy ? 'Сохраняем…' : mode === 'folder' ? 'Добавить в библиотеку' : 'Создать курс'}</button><span className="muted">Сохраняется в твоей локальной библиотеке</span></div>
      </fieldset>
    </form>
  </>;
}

export function AddNoteForm({ courseId, onSaved, onCancel }: { courseId: string; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [note, setNote] = useState<NoteDraft>(emptyNote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try { await libraryRequest({ action: 'add-note', id: courseId, note }); setNote(emptyNote); await onSaved(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Не удалось сохранить конспект'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <form className="note-editor" onSubmit={submit}><h3>Новая тема</h3><fieldset disabled={busy}><NoteInputs value={note} onChange={setNote}/>{error && <p className="storage-warning" role="alert">{error}</p>}<div className="manager-actions"><button className="primary-button" type="submit" disabled={!note.text.trim()}>{busy ? 'Сохраняем…' : 'Добавить тему'}</button><button className="text-button" type="button" onClick={onCancel}>Отменить</button></div></fieldset></form>;
}
