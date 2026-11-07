'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FolderOpen, Plus, Pencil, Trash2, RotateCcw, ArrowLeft, BookOpen, RefreshCw } from 'lucide-react';
import { useCatalog, libraryRequest } from '@/components/catalog-provider';
import type { Course } from '@/lib/catalog';
import { AddNoteForm, CourseCreator, CourseOptions, defaultFields, type CourseFields } from '@/components/course-authoring';

type Note = { id: string; language: string; text: string; hash: string; path: string; shared: boolean };
export function CourseManager({ onOpen, initialCourse }: { onOpen: (id: string) => void; initialCourse?: string }) {
  const { catalog, reload } = useCatalog();
  const [edit, setEdit] = useState<string | null>(initialCourse || null);
  const [fields, setFields] = useState<CourseFields>(catalog.courses.find(course => course.id === initialCourse) || defaultFields);
  const [addingNote, setAddingNote] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await work(); } catch (error) { setError(error instanceof Error ? error.message : 'Не удалось выполнить операцию'); }
    finally { setBusy(false); }
  }
  function start(course?: Course) {
    setEdit(course?.id || 'new'); setFields(course || defaultFields);
    setNote(null); setAddingNote(false); setError(''); setMessage('');
  }
  async function openNote(id: string, language: string) {
    const response = await fetch(`/api/library?action=note&id=${encodeURIComponent(id)}&language=${language}`, { cache:'no-store' });
    const result = await response.json() as Note & { error?: string }; if (!response.ok) throw new Error(result.error); setNote({ ...result,id,language });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await libraryRequest({ ...fields, mark: fields.mark.trim() || 'NEW', action:'update', id:edit });
      await reload(); setMessage('Изменения курса сохранены.');
    });
  }
  const course = catalog.courses.find(course => course.id === edit);
  const patch = (value: Partial<CourseFields>) => setFields(old => ({ ...old,...value }));
  return <section className="course-manager">
    <div className="manager-heading"><div><span className="eyebrow">ЛОКАЛЬНАЯ БИБЛИОТЕКА</span><h1>Управление курсами</h1><p>Твои материалы, в твоей локальной копии приложения.</p></div>{!edit && <button className="primary-button" onClick={() => start()}><Plus size={18}/>Добавить курс</button>}</div>
    {!edit && <p className="muted">Добавляй собственные курсы и конспекты или попроси ИИ подготовить их по <Link href="/agents">инструкции для агентов</Link>.</p>}
    {!edit && <details className="storage-card storage-details"><summary><FolderOpen size={18}/>Где хранятся материалы</summary><code>{catalog.storage.root}</code><p>Конспекты сохраняются здесь автоматически. Папка для новых курсов: <code>{catalog.storage.inbox}</code></p></details>}
    {error && <p className="storage-warning" role="alert">{error}</p>}
    {message && <p className="manager-success" role="status">{message}</p>}
    {edit === 'new' ? <CourseCreator onCancel={() => setEdit(null)} onOpen={onOpen} onCreated={async id => {
      try {
        const data = await reload(); start(data.courses.find(item => item.id === id));
        setMessage('Курс добавлен. Можно открыть его или добавить следующую тему.');
      } catch { setEdit(null); setMessage('Курс сохранён. Обнови страницу, чтобы загрузить список курсов.'); }
    }}/> : edit ? <>
      <div className="manager-actions"><button disabled={busy} className="text-button" onClick={() => { setEdit(null); setNote(null); setAddingNote(false); }}><ArrowLeft size={16}/>К списку курсов</button>{course && <button className="secondary-button" onClick={() => onOpen(course.id)}><BookOpen size={16}/>Открыть курс</button>}</div>
      <form className="manager-form" onSubmit={submit}>
        <h2>Настройки курса</h2>
        <fieldset disabled={busy}>
          <label>Название курса<input required maxLength={160} value={fields.title} onChange={e => patch({ title:e.target.value })}/></label>
          <CourseOptions fields={fields} onChange={patch}/>
          <button className="primary-button" type="submit">{busy ? 'Сохраняем…' : 'Сохранить изменения'}</button>
        </fieldset>
      </form>
      {course && <section className="manager-form"><div className="manager-heading"><div><h2>Конспекты курса</h2><p className="muted">Копия курса: <code>{catalog.storage.root}/courses/{course.id}</code></p></div><button className="secondary-button" disabled={busy} onClick={() => void run(async () => { await libraryRequest({ action:'refresh',id:course.id }); await reload(); setNote(null); setMessage('Файлы перечитаны. Программа курса обновлена.'); })}><RefreshCw size={16}/>Обновить из файлов</button></div>
        <p>{course.lessons.length ? 'Добавляй новые темы или редактируй существующие конспекты.' : 'Курс создан. Добавь первый конспект, чтобы начать обучение.'}</p>
        {!addingNote && <button className="primary-button add-topic-button" disabled={busy} onClick={() => { setAddingNote(true); setNote(null); }}><Plus size={16}/>Добавить тему</button>}
        {addingNote && <AddNoteForm courseId={course.id} onCancel={() => setAddingNote(false)} onSaved={async () => { await reload(); setAddingNote(false); setMessage('Новая тема сохранена и доступна для чтения.'); }}/ >}
        <ul className="editable-lessons">{course.lessons.map(id => { const lesson = catalog.lessons.find(l => l.id === id)!; return <li key={id}><span>{lesson.titles.ru}</span><div>{lesson.languages.map(language => <button className="text-button" key={language} disabled={busy || addingNote} onClick={() => void run(() => openNote(id,language))}><Pencil size={13}/>{language.toUpperCase()}</button>)}</div></li>; })}</ul>
        {note && <div className="note-editor"><h3>Редактор конспекта</h3><code>{note.path}</code>{note.shared && <p>Это общий файл RU/EN. Изменения применяются к обоим языкам.</p>}<label>Текст Markdown<textarea spellCheck={false} value={note.text} rows={24} onChange={e => setNote({ ...note,text:e.target.value })} disabled={busy}/></label><div className="manager-actions"><button className="primary-button" disabled={busy} onClick={() => void run(async () => { await libraryRequest({ action:'save-note',...note }); await reload(); setNote(null); setMessage('Конспект сохранён. Предыдущая версия находится в backups.'); })}>Сохранить конспект</button><button className="text-button" disabled={busy} onClick={() => setNote(null)}>Отменить</button></div></div>}
      </section>}
    </> : <>
      <label className="manager-search">Найти курс<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Название или тег"/></label>
      <div className="managed-courses">{catalog.courses.filter(c => `${c.title} ${c.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())).map(course => <article key={course.id} className="managed-course"><div className="managed-course-info"><span className="tech-mark" style={{ background:course.color,color:'#fff' }}>{course.mark}</span><div><h2>{course.title}</h2><p>Тем: {course.lessons.length} · {catalog.categories.find(c => c.id === course.category)?.titles.ru}</p></div></div><div className="manager-actions"><button className="text-button" onClick={() => onOpen(course.id)}><BookOpen size={16}/>Открыть</button><button className="secondary-button" onClick={() => start(course)}><Pencil size={15}/>Редактировать</button><button className="text-button danger" aria-label={`Удалить ${course.title}`} onClick={() => setDeleting(course.id)}><Trash2 size={16}/></button></div>{deleting === course.id && <div className="delete-confirm" role="group" aria-label="Подтверждение удаления"><p>Убрать «{course.title}» из библиотеки? Файлы и прогресс сохранятся, курс можно восстановить из корзины.</p><button className="secondary-button danger" disabled={busy} onClick={() => void run(async () => { await libraryRequest({ action:'delete',id:course.id }); await reload(); setDeleting(null); setMessage('Курс перемещён в корзину.'); })}>В корзину</button><button className="text-button" onClick={() => setDeleting(null)}>Отмена</button></div>}</article>)}</div>
      {!catalog.courses.length && <p>Библиотека пуста. Добавь курс из папки или создай его здесь.</p>}
      <section className="manager-trash"><h2>Корзина <span>{catalog.trash.length}</span></h2><p>Курсы здесь хранятся вместе с файлами и прогрессом.</p>{catalog.trash.map(course => <div key={course.id}><span>{course.title}</span><button className="text-button" disabled={busy} onClick={() => void run(async () => { await libraryRequest({ action:'restore',id:course.id }); await reload(); setMessage('Курс восстановлен.'); })}><RotateCcw size={15}/>Восстановить</button></div>)}</section>
    </>}
    {busy && <p role="status" className="manager-busy">Выполняем операцию…</p>}
  </section>;
}
