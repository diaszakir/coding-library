'use client';
import { useState, type MouseEvent } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { useCatalog } from '@/components/catalog-provider';
import { Progress } from '@/components/ui/progress';
import { CourseMark, Difficulty } from '@/components/course-display';
import { roadmaps } from '@/data/roadmaps';
import { translator, countLabel } from '@/lib/i18n';
import type { LearningProgress } from '@/lib/progress';
import type { Lesson } from '@/lib/catalog';

type Destination = { course?: string; topic?: string; view?: string; roadmap?: string };
type Props = {
  progress: LearningProgress;
  onNavigate: (next: Destination) => void;
  onSearch: (query?: string) => void;
  catalogOnly?: boolean;
};
function follow(event: MouseEvent<HTMLAnchorElement>, target: Destination, navigate: Props['onNavigate']) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); navigate(target);
}
export function MaterialRow({ lesson, progress, onNavigate }: Pick<Props, 'progress' | 'onNavigate'> & { lesson: Lesson }) {
  const { getLessonCourse } = useCatalog();
  const t = translator(progress.language);
  const course = getLessonCourse(lesson.id);
  return <a className="design-material" href={`?topic=${lesson.id}`} onClick={e => follow(e, { topic: lesson.id }, onNavigate)}>
    <span className="design-type">{t('Конспект', 'Notes')}</span>
    <span className="design-material-copy"><strong>{lesson.titles[progress.language]}</strong><small>{course?.title} · {lesson.minutes} {t('мин', 'min')}</small></span>
    {course && <Difficulty value={course.difficulty} language={progress.language} />}
    <ArrowRight size={16} aria-hidden="true" />
  </a>;
}
export function DesignLibrary({ progress, onNavigate, onSearch, catalogOnly = false }: Props) {
  const { catalog, getLesson, getLessonCourse } = useCatalog();
  const language = progress.language;
  const t = translator(language);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const courses = catalog.courses.filter(course => (category === 'all' || category === course.category) && `${course.title} ${course.tags.join(' ')} ${course.descriptions[language]}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
  const lastLesson = getLesson(progress.lastLesson || '');
  const nextLesson = lastLesson || catalog.lessons.find(lesson => !progress.completed[lesson.id]) || catalog.lessons[0];
  const currentCourse = nextLesson ? getLessonCourse(nextLesson.id) : undefined;
  const completed = currentCourse?.lessons.filter(id => progress.completed[id]).length || 0;
  const percentage = currentCourse?.lessons.length ? Math.round(completed / currentCourse.lessons.length * 100) : 0;
  const featuredPaths = [roadmaps.find(path => path.id === 'python-backend'), roadmaps.find(path => path.id === 'javascript-fullstack'), roadmaps.find(path => path.group === 'devops')].filter(path => !!path);
  return <div className="design-library">
    {!catalogOnly && <section className="design-hero">
      <div className="design-hero-copy">
        <div className="design-eyebrow">~/library · {catalog.lessons.length} {t('материалов', 'materials')} · {catalog.courses.length} {t('курсов', 'courses')}</div>
        <h1>{t('Документация, гайды и шпаргалки в одном месте', 'Docs, guides and cheatsheets in one place')}</h1>
        <p>{t('От первых шагов до продакшена. Читайте по порядку или ищите конкретный ответ в своей библиотеке.', 'From first steps to production. Follow a path or find a specific answer in your library.')}</p>
        <form className="design-hero-search" onSubmit={e => { e.preventDefault(); onSearch(query); }}>
          <Search size={20} aria-hidden="true" /><input aria-label={t('Поиск материалов', 'Search materials')} placeholder={t('например, «docker compose volumes»', 'e.g. “docker compose volumes”')} value={query} onChange={e => setQuery(e.target.value)} /><button type="submit">{t('Найти', 'Search')}</button>
        </form>
        <div className="design-popular"><span>{t('Часто ищут:', 'Popular:')}</span>{['Docker', 'Python', 'Git'].map(term => <button key={term} onClick={() => onSearch(term)}>{term}</button>)}</div>
      </div>
      <section className="design-continue" aria-label={t('Продолжить изучение', 'Continue learning')}>
        <div className="design-continue-label"><span>{lastLesson ? t('Продолжить изучение', 'Continue learning') : t('Начать изучение', 'Start learning')}</span><span>{completed} / {currentCourse?.lessons.length || 0}</span></div>
        {currentCourse ? <>
          <div className="design-continue-title"><CourseMark course={currentCourse} /><div><h2>{currentCourse.title}</h2><p>{nextLesson?.titles[language]}</p></div></div>
          <Progress value={percentage} aria-label={t('Прогресс курса', 'Course progress')} />
          <div className="design-terminal"><div><span>$ </span>learn <b>{currentCourse.title.toLowerCase().replaceAll(' ', '-')}</b></div><div><span>› </span>{t('читать → пробовать → понимать', 'read → try → understand')}</div></div>
          <button onClick={() => onNavigate({ topic: nextLesson?.id })}>{lastLesson ? t('Продолжить', 'Continue') : t('Начать обучение', 'Start learning')}<ArrowRight size={17} /></button>
        </> : <p>{t('Добавьте первый курс, чтобы начать обучение.', 'Add your first course to start learning.')}<button onClick={() => onNavigate({ view: 'manage' })}>{t('Добавить курс', 'Add course')}<ArrowRight size={17} /></button></p>}
      </section>
    </section>}
    <section className="design-catalog" id="catalog">
      <div className="design-section-heading"><div>{catalogOnly ? <h1>{t('Каталог курсов', 'Course catalog')}</h1> : <h2>{t('Технологии', 'Technologies')}</h2>}{catalogOnly && <p>{courses.length} {t('курсов', 'courses')} · {catalog.lessons.length} {t('материалов', 'materials')}</p>}</div>
        {catalogOnly && <input className="design-filter" aria-label={t('Фильтр по названию', 'Filter by name')} placeholder={t('Фильтр по названию', 'Filter by name')} value={query} onChange={e => setQuery(e.target.value)} />}
        <div className="design-categories" aria-label={t('Категории курсов', 'Course categories')}>{catalog.categories.map(cat => <button key={cat.id} aria-pressed={category === cat.id} onClick={() => setCategory(cat.id)}>{cat.id === 'all' ? t('Все', 'All') : cat.titles[language]}</button>)}</div>
      </div>
      <div className="design-tech-grid">{(catalogOnly ? courses : courses.slice(0, 8)).map(course => {
        const done = course.lessons.filter(id => progress.completed[id]).length;
        const percent = course.lessons.length ? Math.round(done / course.lessons.length * 100) : 0;
        return <a key={course.id} className="design-tech-card" href={`?course=${course.id}`} onClick={e => follow(e, { course: course.id }, onNavigate)}>
          <div className="design-tech-top"><CourseMark course={course} /><span>{catalog.categories.find(cat => cat.id === course.category)?.titles[language]}</span></div>
          <div><h3>{course.title}</h3><p>{course.descriptions[language]}</p></div>
          <div className="design-tech-bottom"><span>{countLabel(course.lessons.length, language)}</span><span className={percent ? 'has-progress' : ''}>{percent ? `${percent}%` : t('Не начато', 'Not started')}</span></div>
        </a>;
      })}</div>
      {!courses.length && <div className="design-empty">{t('Ничего не найдено', 'Nothing found')}<button onClick={() => { setQuery(''); setCategory('all'); }}>{t('Сбросить фильтры', 'Reset filters')}</button></div>}
      {!catalogOnly && <button className="design-text-link" onClick={() => onNavigate({ view: 'catalog' })}>{t('Все курсы', 'All courses')}<ArrowRight size={16} /></button>}
    </section>
    {!catalogOnly && <div className="design-two-col">
      <section><h2>{t('Материалы библиотеки', 'Library materials')}</h2><div className="design-materials">{catalog.lessons.filter(lesson => !lesson.overview).slice(0, 6).map(lesson => <MaterialRow key={lesson.id} lesson={lesson} progress={progress} onNavigate={onNavigate} />)}</div></section>
      <section><h2>{t('Пути обучения', 'Learning paths')}</h2><div className="design-paths">{featuredPaths.map((path, index) => <a key={path.id} className={`design-path design-path-${index}`} href={`?view=roadmaps&roadmap=${path.id}`} onClick={e => follow(e, { view: 'roadmaps', roadmap: path.id }, onNavigate)}><small>{path.group.toUpperCase()} · {path.stages.length} {t('этапов', 'stages')}</small><h3>{path.title}</h3><p>{path.stages.slice(0, 3).map(stage => stage.title[language]).join(' → ')}</p></a>)}</div></section>
    </div>}
  </div>;
}
export function DesignSearch({ progress, onNavigate, query, onQuery }: Pick<Props, 'progress' | 'onNavigate'> & { query: string; onQuery: (value: string) => void }) {
  const { catalog, getLessonCourse } = useCatalog();
  const t = translator(progress.language);
  const [level, setLevel] = useState('all');
  const [kind, setKind] = useState('all');
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = (value: string) => terms.every(term => value.toLocaleLowerCase().includes(term));
  const courses = kind === 'notes' ? [] : catalog.courses.filter(course => (level === 'all' || course.difficulty === level) && matches(`${course.title} ${course.tags.join(' ')} ${course.descriptions.ru} ${course.descriptions.en}`));
  const lessons = kind === 'courses' ? [] : catalog.lessons.filter(lesson => {
    const course = getLessonCourse(lesson.id);
    return (level === 'all' || course?.difficulty === level) && matches(`${lesson.titles.ru} ${lesson.titles.en} ${course?.title} ${course?.tags.join(' ')}`);
  });
  return <section className="design-search-page"><h1>{t('Поиск материалов', 'Search materials')}</h1>
    <div className="design-search-field"><Search size={22} /><input autoFocus aria-label={t('Поисковый запрос', 'Search query')} value={query} onChange={e => onQuery(e.target.value)} placeholder={t('Технология, команда или вопрос', 'Technology, command or question')} />{query && <button aria-label={t('Очистить', 'Clear')} onClick={() => onQuery('')}><X size={18} /></button>}</div>
    <div className="design-categories search-type-tabs">{[['all', t('Все', 'All')], ['courses', t('Курсы', 'Courses')], ['notes', t('Конспекты', 'Notes')]].map(([id, label]) => <button key={id} onClick={() => setKind(id)} aria-pressed={kind === id}>{label}</button>)}</div>
    <div className="design-search-layout"><aside><h3>{t('Уровень', 'Level')}</h3>{[['all', t('Любой уровень', 'Any level')], ['beginner', t('Основы', 'Basics')], ['intermediate', t('Средний', 'Intermediate')], ['advanced', t('Продвинутый', 'Advanced')]].map(([id, label]) => <label key={id}><input type="radio" name="search-level" checked={level === id} onChange={() => setLevel(id)} />{label}</label>)}</aside>
      <div><p className="design-results-count" role="status">{t('Результатов', 'Results')}: {courses.length + lessons.length}</p>
        {courses.map(course => <a className="design-search-course" key={course.id} href={`?course=${course.id}`} onClick={e => follow(e, { course: course.id }, onNavigate)}><CourseMark course={course} /><div><strong>{course.title}</strong><p>{course.descriptions[progress.language]}</p></div><span className="design-type">{t('Курс', 'Course')}</span><ArrowRight size={17} /></a>)}
        <div className="design-materials">{lessons.map(lesson => <MaterialRow key={lesson.id} lesson={lesson} progress={progress} onNavigate={onNavigate} />)}</div>
        {!courses.length && !lessons.length && <div className="design-empty"><Search size={30} /><h2>{t('Ничего не найдено', 'Nothing found')}</h2><p>{t('Попробуйте другой запрос или сбросьте фильтры.', 'Try a different query or reset the filters.')}</p><button onClick={() => { onQuery(''); setKind('all'); setLevel('all'); }}>{t('Сбросить фильтры', 'Reset filters')}</button></div>}
      </div>
    </div>
  </section>;
}
