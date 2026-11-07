'use client';
import { Children, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Check, Clock3, ExternalLink, BookOpen, RotateCcw, Copy, Code2, Pause, Play } from 'lucide-react';
import { type Course, type Lesson } from '@/lib/catalog';
import { useCatalog } from '@/components/catalog-provider';
import { notePath } from '@/lib/note-path.mjs';
import { translator, countLabel, type Language } from '@/lib/i18n';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { LearningProgress } from '@/lib/progress';
import { formatStudyTime } from '@/lib/learning';
import { courseProgrammingLanguage, getLessonLearning } from '@/data/lesson-learning';
import { useStudyTimer } from '@/hooks/use-study-timer';
import { LessonChecklist, LessonVideo, LessonWorkflow } from '@/components/lesson-workflow';

type Props = { lesson: Lesson; course: Course; progress: LearningProgress; onOpen: (id: string) => void; onBack: () => void; update: (change: (old: LearningProgress) => LearningProgress) => void; onLanguage: (lang: Language) => void; savePosition: (id: string, lang: string, y: number) => void };
type Resource = { id: string; filename: string; source: string; language: string; code: string };
type Content = { contents: Partial<Record<Language, string>>; sourcePaths?: Partial<Record<Language,string>>; sourceFiles?: Partial<Record<Language,string>>; resources?: Resource[] };
function nodeText(children: ReactNode): string {
  return Children.toArray(children).map(child => isValidElement<{children?:ReactNode}>(child) ? nodeText(child.props.children) : String(child)).join('');
}
const slug = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,'').trim().replace(/\s+/g,'-');
function indexHeadings(content: string) {
  const headings: { line: number; depth: number; title: string; id: string }[] = [];
  const counts = new Map<string,number>();
  let anchor = ''; let fenced = false;
  content.split(/\r?\n/).forEach((line,index) => {
    if (/^\s*```/.test(line)) { fenced = !fenced; return; }
    if (fenced) return;
    const explicit = line.match(/^\s*<a\s+(?:id|name)=["']([^"']+)["']\s*>\s*<\/a>/);
    if (explicit) { anchor = explicit[1]; return; }
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      const title = heading[2].replace(/[`*]/g,'').trim();
      const base = slug(title); const n = counts.get(base) || 0; counts.set(base,n+1);
      headings.push({line:index+1,depth:heading[1].length,title,id:anchor || `${base}${n ? '-'+n : ''}`});
      anchor = '';
    } else if (line.trim()) anchor = '';
  });
  return headings;
}
function CodeBlock({ code, codeLanguage, language }: { code: string; codeLanguage?: string; language: Language }) {
  const t = translator(language);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1800); }
    catch { toast.error(t('Не удалось скопировать. Выдели код и скопируй его вручную.', 'Could not copy. Select the code and copy it manually.')); }
  };
  return <div className="code-block"><div className="code-toolbar"><span>{codeLanguage || t('Код','Code')}</span><button onClick={copy} aria-label={t('Скопировать код','Copy code')}>{copied ? <Check size={14}/> : <Copy size={14}/>}{copied ? t('Скопировано','Copied') : t('Копировать','Copy')}</button></div><pre tabIndex={0}><code>{code}</code></pre></div>;
}
export default function LessonReader({ lesson, course, progress, onOpen, onBack, update, onLanguage, savePosition }: Props) {
  const { catalog } = useCatalog();
  const [data, setData] = useState<Content | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [readingPercent, setReadingPercent] = useState(0);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const [videoPlaying, setVideoPlaying] = useState(false);
  const initialPosition = useRef({ ...progress.positions });
  const language = progress.language;
  const t = translator(language);
  const complete = Boolean(progress.completed[lesson.id]);
  const nextId = course.lessons[course.lessons.indexOf(lesson.id) + 1];
  const content = data?.contents[language] || data?.contents.ru || data?.contents.en || '';
  const headings = useMemo(() => indexHeadings(content), [content]);
  const resources = data?.resources || [];
  const definition = getLessonLearning(lesson.id);
  const programmingLanguage = definition?.programmingLanguage || courseProgrammingLanguage(course);
  const timer = useStudyTimer({ lessonId: lesson.id, courseId: course.id, language: programmingLanguage, enabled: Boolean(content) && !error, videoPlaying, update });
  const wasComplete = useRef(complete);
  useEffect(() => {
    if (complete && !wasComplete.current) toast.success(t('Урок завершён', 'Lesson completed'), { description: `+${lesson.xp} XP` });
    wasComplete.current = complete;
  }, [complete, lesson.xp, t]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/library?action=lesson&id=${encodeURIComponent(lesson.id)}`, {signal:controller.signal, cache:'no-store'}).then(async r => {
      if (!r.ok) throw new Error('Content unavailable');
      const payload = await r.json() as Content;
      if (!payload.contents || !Object.values(payload.contents).every(value => typeof value === 'string')) throw new Error('Invalid content');
      return payload;
    }).then(setData).catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [lesson.id, attempt]);
  useEffect(() => {
    if (!content) return;
    const positions = initialPosition.current;
    let timer: ReturnType<typeof setTimeout>; let initialized = false;
    const flush = () => { if (initialized) savePosition(lesson.id, language, window.scrollY); };
    const onScroll = () => {
      const height = Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
      setReadingPercent(Math.min(100,Math.round(window.scrollY/height*100)));
      if (!initialized) return;
      clearTimeout(timer); timer = setTimeout(flush,250);
    };
    const frame = requestAnimationFrame(() => { window.scrollTo({top:positions[`${lesson.id}:${language}`] || 0,behavior:'instant'}); initialized=true; onScroll(); });
    window.addEventListener('scroll',onScroll,{passive:true}); window.addEventListener('pagehide',flush);
    return () => { positions[`${lesson.id}:${language}`]=window.scrollY; cancelAnimationFrame(frame); clearTimeout(timer); flush(); window.removeEventListener('scroll',onScroll); window.removeEventListener('pagehide',flush); };
  }, [content,lesson.id,language,savePosition]);
  function resolveLink(href: string | undefined): { href: string; external?: boolean; lesson?: string; language?: Language; resource?: string } | null {
    if (!href) return null;
    if (/^https?:\/\//i.test(href)) return {external:true,href};
    if (href.startsWith('#')) return {href};
    if (/^(?:[a-z]+:|\/\/)/i.test(href)) return null;
    try {
      const file = data?.sourceFiles?.[language] || `${data?.sourcePaths?.[language] || lesson.source}/README.md`;
      const resolved = new URL(href.replaceAll('\\','/'),`https://content.invalid/${file}`);
      const physical = decodeURIComponent(resolved.pathname).replace(/^\//,'');
      const resource = resources.find(item => item.source === physical);
      if (resource) return {href:`#code-${resource.id}`,resource:resource.id};
      const note = notePath(physical.replace(/\/$/, ''));
      const target = catalog.lessons.find(item => item.source === note.source);
      if (target) return {href:`?topic=${target.id}`,lesson:target.id,language:/\.md$/i.test(physical) ? note.language as Language : undefined};
    } catch { /* Missing local resource is rendered as annotated text. */ }
    return null;
  }
  const openResource = (id: string) => {
    setExpanded(old => ({...old,[id]:true}));
    requestAnimationFrame(() => document.getElementById(`code-${id}`)?.scrollIntoView({behavior:'smooth',block:'start'}));
  };
  return <div className="reader-layout"><section className="reader-column"><div className="reader-toolbar"><button className="text-button" onClick={onBack}><ArrowLeft size={16}/>{course.title}</button><Tabs value={language} onValueChange={value => onLanguage(value as Language)}><TabsList aria-label={t('Язык конспекта','Notes language')}><TabsTrigger value="ru">Русский</TabsTrigger><TabsTrigger value="en">English</TabsTrigger></TabsList></Tabs></div>
    <div className="reader-meta"><span><BookOpen size={14}/>{lesson.overview?t('Обзор курса','Course overview'):t('Конспект','Notes')}</span><span><Clock3 size={14}/>~{lesson.minutes} {t('мин чтения','min read')}</span><span>{complete?t('Тема завершена','Topic completed'):`+${lesson.xp} XP`}</span>{lesson.codeBlocks>0 && <span><Code2 size={14}/>{lesson.codeBlocks} {t('блоков кода','code blocks')}</span>}</div>
    <div className="journal-reader-heading"><span className="journal-section-index">{t('УРОК', 'LESSON')} {String(course.lessons.indexOf(lesson.id) + 1).padStart(2, '0')} / {course.lessons.length}</span><h1 className="lesson-title">{lesson.titles[language]}</h1><p className="source-caption">{course.title}</p></div>
    <LessonChecklist lessonId={lesson.id} progress={progress} />
    <div className="journal-reading-guide"><BookOpen size={16} /><span>{t('Подтверждение чтения находится в конце конспекта.', 'Confirm your reading at the end of the notes.')}</span><a href="#lesson-reading-confirmation">{t('К отметке о чтении', 'Reading confirmation')}<Check size={14} /></a></div>
    <div className="study-timer" aria-label={t('Таймер обучения', 'Study timer')}><span className={`timer-dot ${timer.active ? 'active' : ''}`} /><Clock3 size={16} /><strong>{formatStudyTime(timer.sessionSeconds, language)}</strong><span>{programmingLanguage === 'Other' ? t('Другие технологии', 'Other technologies') : programmingLanguage} · {timer.paused ? t('на паузе', 'paused') : timer.active ? t('активное время', 'active time') : t('ожидает активности', 'waiting for activity')}</span><button onClick={timer.paused ? timer.resume : timer.pause}>{timer.paused ? <Play size={14} /> : <Pause size={14} />}{timer.paused ? t('Продолжить', 'Resume') : t('Пауза', 'Pause')}</button></div>
    <p className="timer-help">{t('Таймер работает в активном окне. Скрытая вкладка и 90 секунд без действий ставят учёт на паузу.', 'The timer runs in the active window. Hidden tabs and 90 seconds without interaction pause tracking.')}</p>
    <LessonVideo lessonId={lesson.id} definition={definition} progress={progress} update={update} onPlaying={setVideoPlaying} />
    {error ? <Empty className="reader-error"><EmptyTitle>{t('Не удалось загрузить конспект','Could not load the notes')}</EmptyTitle><EmptyDescription>{t('Проверь подключение и попробуй ещё раз. Прогресс сохранён.','Check your connection and try again. Your progress is saved.')}</EmptyDescription><button className="secondary-button" onClick={() => { setError(false); setAttempt(a=>a+1); }}><RotateCcw size={16}/>{t('Повторить','Retry')}</button></Empty> : !data ? <div aria-label={t('Загрузка конспекта','Loading notes')} className="reader-loading"><Skeleton className="h-8 w-3/4"/><Skeleton className="h-48 w-full"/><Skeleton className="h-24 w-full"/></div> : <>
      <article className="markdown" id="lesson-notes"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
        h1: () => null,
        h2: ({children,node}) => <h2 id={headings.find(h=>h.line===node?.position?.start.line)?.id || slug(nodeText(children))}>{children}</h2>,
        h3: ({children,node}) => <h3 id={headings.find(h=>h.line===node?.position?.start.line)?.id || slug(nodeText(children))}>{children}</h3>,
        h4: ({children,node}) => <h4 id={headings.find(h=>h.line===node?.position?.start.line)?.id || slug(nodeText(children))}>{children}</h4>,
        pre: ({children}) => { const child=Children.toArray(children)[0]; const codeLanguage=isValidElement<{className?:string}>(child)?child.props.className?.replace('language-',''):undefined; return <CodeBlock code={nodeText(children).replace(/\n$/,'')} codeLanguage={codeLanguage} language={language}/>; },
        a: ({href,children}) => { const link=resolveLink(href); if (!link) return <span className="unavailable-source" title={t('Этот файл не импортирован. Он может находиться в исходной папке курса.','This file was not imported. It may be in the original course folder.')}>{children} <small>({t('локальный материал','local material')})</small></span>; return <a href={link.href} target={link.external?'_blank':undefined} rel={link.external?'noreferrer noopener':undefined} onClick={link.lesson || link.resource ? event=> { if (event.metaKey||event.ctrlKey||event.shiftKey||event.altKey) return; event.preventDefault(); if(link.resource)openResource(link.resource); else { if(link.language)onLanguage(link.language); onOpen(link.lesson!); } } : undefined}>{children}{link.external&&<ExternalLink size={11} className="inline-icon"/>}</a>; },
        table: ({children}) => <div className="table-scroll"><table>{children}</table></div>,
        img: ({alt}) => <span className="unavailable-source">{alt||t('Иллюстрация из исходных материалов','Illustration in the source materials')}</span>,
      }}>{content}</ReactMarkdown></article>
      {!!resources.length && <section className="source-examples" aria-label={t('Полные программы','Complete programs')}><div className="section-heading"><h2>{t('Полные программы','Complete programs')}</h2><span className="muted">{countLabel(resources.length,language,'files')}</span></div><p>{t('Исходный код из материалов этой темы. Скопируй программу и запусти её в своей среде.','Source code linked from this topic. Copy a program and run it in your own environment.')}</p>{resources.map(resource=><details id={`code-${resource.id}`} key={resource.id} open={!!expanded[resource.id]} onToggle={event=>{const open=event.currentTarget.open;setExpanded(old=>old[resource.id]===open?old:{...old,[resource.id]:open});}}><summary><Code2 size={17}/>{resource.filename}<span>{resource.language}</span></summary><CodeBlock code={resource.code} codeLanguage={resource.language} language={language}/></details>)}</section>}
      <LessonWorkflow lessonId={lesson.id} definition={definition} progress={progress} update={update} hasNotes={Boolean(content)} nextId={nextId} onOpen={onOpen} onBack={onBack} />
    </>}
    </section><aside className="reading-aside"><div className="reading-sticky"><span className="eyebrow">{t('В ЭТОМ КОНСПЕКТЕ','IN THESE NOTES')}</span><nav aria-label={t('Оглавление конспекта','Notes outline')}>{headings.filter(h=>h.depth===2).map(h=><a key={h.id} href={`#${h.id}`}>{h.title}</a>)}{!!resources.length&&<a href="#source-programs" onClick={event=>{event.preventDefault();openResource(resources[0].id);}}>{t('Полные программы','Complete programs')}</a>}</nav><a className="journal-reading-confirm-link" href="#lesson-reading-confirmation"><Check size={15} />{t('Отметить чтение', 'Confirm reading')}</a><div className="reading-progress"><span>{t('Позиция чтения','Reading position')} <strong>{readingPercent}%</strong></span><Progress value={readingPercent} aria-label={t('Позиция чтения','Reading position')}/><small>{t('Место сохраняется автоматически','Your place is saved automatically')}</small></div><button className="secondary-button" onClick={onBack}>{t('Вернуться к программе','Back to course outline')}</button></div></aside></div>;
}
