'use client';

import { useState, type FormEvent, type MouseEvent } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, Clock3, Code2, Flame, FolderGit2, GraduationCap, Layers3, LockKeyhole, Play, Plus, Search, Target, Trophy, X, Pencil, ExternalLink } from 'lucide-react';
import { useCatalog } from '@/components/catalog-provider';
import { CourseMark, Difficulty } from '@/components/course-display';
import { Progress } from '@/components/ui/progress';
import { experience, type LearningProgress } from '@/lib/progress';
import { saveProject, removeProject } from '@/lib/learning';
import { getLessonLearning } from '@/data/lesson-learning';
import { translator, countLabel } from '@/lib/i18n';
import { hasCourseActivity, nextLearningLesson } from '@/lib/learning-resume';
import type { Course } from '@/lib/catalog';

export type Destination = { course?: string; topic?: string; view?: string; roadmap?: string };
export type WorkspaceProps = { progress: LearningProgress; onNavigate: (next: Destination) => void };
export const duration = (seconds: number, language = 'ru') => seconds < 60 ? `${Math.floor(seconds)} ${language === 'ru' ? 'с' : 's'}` : seconds < 3600 ? `${Math.floor(seconds / 60)} ${language === 'ru' ? 'мин' : 'min'}` : `${Math.floor(seconds / 3600)} ${language === 'ru' ? 'ч' : 'h'} ${Math.floor(seconds % 3600 / 60)} ${language === 'ru' ? 'мин' : 'min'}`;
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function follow(event: MouseEvent<HTMLAnchorElement>, next: Destination, navigate: WorkspaceProps['onNavigate']) { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(next); }
function totals(progress: LearningProgress) {
  const byLanguage: Record<string, number> = {};
  for (const session of progress.studySessions) byLanguage[session.language] = (byLanguage[session.language] || 0) + session.seconds;
  return Object.entries(byLanguage).sort((a, b) => b[1] - a[1]);
}
export function PageTitle({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  return <div className="studio-page-title"><div><span className="studio-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}
export function CourseTile({ course, progress, onNavigate }: WorkspaceProps & { course: Course }) {
  const t = translator(progress.language);
  const { catalog } = useCatalog();
  const done = course.lessons.filter(id => progress.completed[id]).length;
  const percentage = course.lessons.length ? Math.round(done / course.lessons.length * 100) : 0;
  const visited = hasCourseActivity(progress, course);
  const seconds = progress.studySessions.filter(session => session.courseId === course.id).reduce((sum, session) => sum + session.seconds, 0);
  return <a className="studio-course" href={`?course=${course.id}`} onClick={event => follow(event, { course: course.id }, onNavigate)}>
    <div className="studio-course-top"><CourseMark course={course} /><Difficulty value={course.difficulty} language={progress.language} /></div>
    <span className="studio-course-section">{catalog.categories.find(section => section.id === course.category)?.titles[progress.language]}</span>
    <h3>{course.title}</h3><p>{course.descriptions[progress.language] || t('Твой следующий шаг в изучении технологии.', 'Your next step in learning this technology.')}</p>
    <div className="studio-course-meta"><span><BookOpen size={14} />{countLabel(course.lessons.length, progress.language, 'lessons')}</span><span><Clock3 size={14} />{duration(seconds, progress.language)}</span></div>
    <Progress value={percentage} aria-label={`${course.title}: ${percentage}%`} /><div className="studio-course-bottom"><span>{done} / {course.lessons.length}</span><strong>{done === course.lessons.length && done ? t('Повторить', 'Review') : visited ? t('Продолжить', 'Continue') : t('Начать', 'Start')}<ArrowUpRight size={15} /></strong></div>
  </a>;
}
export function CourseCatalog({ progress, onNavigate }: WorkspaceProps) {
  const { catalog } = useCatalog(); const t = translator(progress.language);
  const [section, setSection] = useState('all'); const [query, setQuery] = useState(''); const [status, setStatus] = useState('all');
  const courses = catalog.courses.filter(course => (section === 'all' || section === course.category) && `${course.title} ${course.tags.join(' ')} ${course.descriptions[progress.language]}`.toLowerCase().includes(query.trim().toLowerCase()) && (status !== 'active' || hasCourseActivity(progress, course) && course.lessons.some(id => !progress.completed[id])) && (status !== 'completed' || course.lessons.length > 0 && course.lessons.every(id => progress.completed[id])));
  return <><PageTitle eyebrow={t('БИБЛИОТЕКА', 'LIBRARY')} title={t('Мои курсы.', 'My courses.')} description={t('Здесь можно начать новое или вернуться к знакомой теме.', 'Start something new, or return to a familiar topic.')}><button className="studio-button secondary" onClick={() => onNavigate({ view: 'manage' })}><Plus size={17} />{t('Добавить курс', 'Add course')}</button></PageTitle>
    <div className="studio-tracks" aria-label={t('Направления курсов', 'Course tracks')}>{catalog.categories.map(category => <button key={category.id} aria-pressed={section === category.id} onClick={() => setSection(category.id)}>{category.titles[progress.language]}<span>{category.id === 'all' ? catalog.courses.length : catalog.courses.filter(course => course.category === category.id).length}</span></button>)}</div>
    <div className="studio-filter-row"><label className="studio-search"><Search size={17} /><input aria-label={t('Поиск курсов', 'Search courses')} value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Найти курс или технологию…', 'Find a course or technology…')} /></label><select aria-label={t('Статус курса', 'Course status')} value={status} onChange={event => setStatus(event.target.value)}><option value="all">{t('Все статусы', 'All statuses')}</option><option value="active">{t('В процессе', 'In progress')}</option><option value="completed">{t('Завершены', 'Completed')}</option></select><span>{countLabel(courses.length, progress.language, 'courses')}</span></div>
    {courses.length ? <div className="studio-course-grid">{courses.map(course => <CourseTile key={course.id} course={course} progress={progress} onNavigate={onNavigate} />)}</div> : <div className="studio-empty"><Layers3 size={32} /><h2>{t('Здесь пока нет курсов', 'No courses here yet')}</h2><p>{catalog.courses.length ? t('Добавь материалы в это направление или выбери другой фильтр.', 'Add material to this track or choose another filter.') : t('Создай свой первый курс или подготовь материалы с ИИ по инструкции.', 'Create your first course or prepare material with the AI guide.')}</p>{catalog.courses.length ? <button className="studio-button secondary" onClick={() => { setQuery(''); setSection('all'); setStatus('all'); }}>{t('Показать все курсы', 'Show all courses')}</button> : <button className="studio-button" onClick={() => onNavigate({ view: 'manage' })}>{t('Создать курс', 'Create course')}</button>}</div>}
  </>;
}
export function LanguageTime({ progress }: Pick<WorkspaceProps, 'progress'>) {
  const t = translator(progress.language); const languages = totals(progress); const total = languages.reduce((sum, [, value]) => sum + value, 0);
  return <section className="studio-panel studio-language-time"><div className="studio-section-title"><h2>{t('Во что вложено время', 'Where your time goes')}</h2><Code2 size={18} /></div><p className="studio-caption">{t('Активное время в уроках, по языкам', 'Active lesson time, by language')}</p>{languages.length ? <div className="studio-language-list">{languages.map(([language, seconds], index) => <div key={language}><div><span><i style={{ background: ['#3559a2','#b16b4d','#7b8970','#a68c51'][index % 4] }} />{language}</span><strong>{duration(seconds, progress.language)}</strong></div><Progress value={seconds / total * 100} aria-label={`${language}: ${duration(seconds, progress.language)}`} /></div>)}</div> : <div className="studio-time-empty"><span>00<span>:00</span></span><p>{t('Первые минуты появятся, когда начнёшь урок.', 'Your first minutes will appear when you start a lesson.')}</p></div>}<p className="studio-footnote">{t('Учитывается только время в открытом уроке. Перерывы и другие вкладки не считаются.', 'Only time in an open lesson counts. Breaks and other tabs are excluded.')}</p></section>;
}
function WeekActivity({ progress }: Pick<WorkspaceProps, 'progress'>) {
  const t = translator(progress.language); const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - 6 + index); const key = dateKey(date); const seconds = progress.studySessions.filter(session => session.date === key).reduce((sum, session) => sum + session.seconds, 0); return { key, date, seconds }; });
  const maximum = Math.max(1800, ...days.map(day => day.seconds));
  return <section className="studio-panel studio-week-panel"><div className="studio-section-title"><h2>{t('Эта неделя', 'This week')}</h2><span className="studio-pill">{duration(days.reduce((sum, day) => sum + day.seconds, 0), progress.language)}</span></div><p className="studio-caption">{t('Последние семь дней твоих занятий', 'Your last seven days of learning')}</p><div className="studio-week" aria-label={t('Время за последние семь дней', 'Study time over the last seven days')}>{days.map((day, index) => <div key={day.key} className={index === 6 ? 'today' : ''} title={`${day.date.toLocaleDateString(progress.language)}: ${duration(day.seconds, progress.language)}`}><span>{day.seconds ? duration(day.seconds, progress.language) : '—'}</span><div><i style={{ height: `${day.seconds ? Math.max(4, day.seconds / maximum * 100) : 0}%` }} /></div><small>{day.date.toLocaleDateString(progress.language, { weekday: 'short' })}</small></div>)}</div><p className="studio-week-note">{days.some(day => day.seconds) ? t('Каждая отметка — время, которое ты уже уделил учёбе.', 'Each mark is time you have already given to learning.') : t('Здесь будут твои занятия. Начать можно с одного урока.', 'Your sessions will appear here. One lesson is enough to begin.')}</p></section>;
}
export function Dashboard({ progress, onNavigate, analytics = false }: WorkspaceProps & { analytics?: boolean }) {
  const { catalog, getLesson, getLessonCourse } = useCatalog();
  const t = translator(progress.language);
  const stats = experience(progress, catalog.lessons);
  const done = catalog.lessons.filter(lesson => progress.completed[lesson.id]).length;
  const seconds = progress.studySessions.reduce((sum, session) => sum + session.seconds, 0);
  const readyLessons = new Set(catalog.lessons.filter(lesson => getLessonLearning(lesson.id)?.video).map(lesson => lesson.id));
  const { lesson: next, mode } = nextLearningLesson(catalog.lessons, catalog.courses, progress, readyLessons);
  const course = next ? getLessonCourse(next.id) : undefined;
  const state = next ? progress.lessonStates[next.id] : undefined;
  const steps = [Boolean(state?.videoCompletedAt), Boolean(state?.notesCompletedAt), Boolean(state?.quiz?.passed)];
  const lastActivity = (item: Course) => Math.max(0, ...item.lessons.flatMap(id => {
    const saved = progress.lessonStates[id];
    return [progress.visited[id], progress.completed[id], saved?.videoUpdatedAt, saved?.videoCompletedAt, saved?.notesCompletedAt, saved?.quiz?.submittedAt].map(date => date ? Date.parse(date) || 0 : 0);
  }), ...progress.studySessions.filter(session => session.courseId === item.id).map(session => Date.parse(session.date) || 0));
  const active = catalog.courses.filter(item => hasCourseActivity(progress, item) && item.lessons.some(id => !progress.completed[id])).sort((a, b) => Number(b.id === course?.id) - Number(a.id === course?.id) || lastActivity(b) - lastActivity(a));
  const featured = active.length ? active.slice(0, 3) : [...catalog.courses].sort((a, b) => Number(b.lessons.some(id => getLessonLearning(id)?.quiz)) - Number(a.lessons.some(id => getLessonLearning(id)?.quiz))).slice(0, 3);
  const courseDone = course?.lessons.filter(id => progress.completed[id]).length || 0;
  const lessonNumber = course && next ? course.lessons.indexOf(next.id) + 1 : 0;
  const resumeAction = mode === 'review' ? t('Повторить урок', 'Review lesson') : mode === 'resume' ? t('Продолжить урок', 'Continue lesson') : mode === 'empty' ? t('Добавить курс', 'Add course') : t('Начать урок', 'Start lesson');
  const resumeTitle = mode === 'review' ? t('МОЖНО ПОВТОРИТЬ', 'READY TO REVIEW') : mode === 'resume' ? t('ТВОЁ МЕСТО СОХРАНЕНО', 'YOUR PLACE IS SAVED') : t('СЛЕДУЮЩАЯ СТРАНИЦА', 'YOUR NEXT PAGE');
  const quizzes = Object.values(progress.lessonStates).filter(state => state.quiz?.passed).length;
  const milestones = [
    { title: t('Первый шаг', 'First step'), value: done, target: 1, remaining: t('Осталось завершить уроков:', 'Lessons remaining:'), unit: '' },
    { title: t('Вошёл в ритм', 'Finding your rhythm'), value: done, target: 10, remaining: t('Осталось завершить уроков:', 'Lessons remaining:'), unit: '' },
    { title: t('Час для себя', 'An hour for yourself'), value: Math.floor(seconds / 60), target: 60, remaining: t('До часа активного обучения:', 'To one hour of active learning:'), unit: t('мин', 'min') },
    { title: t('Теория на практике', 'Theory into practice'), value: quizzes, target: 5, remaining: t('Осталось пройти тестов:', 'Quizzes remaining:'), unit: '' },
    { title: t('Привычка учиться', 'Learning habit'), value: new Set(progress.studySessions.filter(session => session.seconds > 0).map(session => session.date)).size, target: 7, remaining: t('Осталось дней с занятиями:', 'More study days needed:'), unit: '' },
    { title: t('До последнего урока', 'All the way through'), value: catalog.courses.filter(item => item.lessons.length && item.lessons.every(id => progress.completed[id])).length, target: 1, remaining: t('Осталось завершить курсов:', 'Courses remaining:'), unit: '' },
    { title: t('Сделано своими руками', 'Built by you'), value: progress.projects.filter(item => item.status === 'completed').length, target: 1, remaining: t('Осталось завершить проектов:', 'Projects remaining:'), unit: '' },
    { title: t('Новые горизонты', 'New horizons'), value: totals(progress).filter(([, amount]) => amount >= 1800).length, target: 3, remaining: t('Ещё технологий с 30 минутами занятий:', 'More technologies with 30 minutes of study:'), unit: '' },
  ];
  const milestone = milestones.filter(item => item.value < item.target).sort((a, b) => b.value / b.target - a.value / a.target)[0];
  const project = progress.projects.find(item => item.status === 'active') || progress.projects.find(item => item.status === 'planned');
  return <>
    <PageTitle eyebrow={t('УЧЕБНЫЙ ЖУРНАЛ', 'LEARNING JOURNAL')} title={analytics ? t('Твой пройденный путь.', 'The ground you have covered.') : t('Продолжим с твоего места.', 'Pick up where you left off.')} description={analytics ? t('Время, темы и результаты, которые уже накопились.', 'The time, topics and results you have built up.') : t('Текущий урок, время занятий и то, что уже получилось.', 'Your current lesson, study time and progress so far.')}>
      <span className="studio-date"><span>{new Date().toLocaleDateString(progress.language, { day: '2-digit' })}</span><span>{new Date().toLocaleDateString(progress.language, { month: 'long' })} · {new Date().toLocaleDateString(progress.language, { weekday: 'short' })}</span></span>
    </PageTitle>
    {!analytics && <div className="journal-focus-grid">
      <section className="journal-resume">
        <div className="journal-resume-top"><span>{resumeTitle}</span><span>{course?.title || 'DevLibrary'}</span></div>
        <div className="journal-resume-content">
          <span className="journal-lesson-number">{next && course ? t(`Урок ${String(lessonNumber).padStart(2, '0')} / ${course.lessons.length}`, `Lesson ${String(lessonNumber).padStart(2, '0')} / ${course.lessons.length}`) : t('Твоя библиотека', 'Your library')}</span>
          <h2>{next?.titles[progress.language] || t('Начни с интересной темы.', 'Start with something that interests you.')}</h2>
          <p>{next ? mode === 'review' ? t('Можно вернуться к примерам или проверить себя ещё раз.', 'Revisit the examples or check your understanding again.') : t('Посмотри видео, разберись в конспекте. Тест — когда захочешь проверить себя.', 'Watch the video and work through the notes. Take the quiz whenever you want to check yourself.') : t('Добавь курс, который давно хотел пройти.', 'Add a course you have been meaning to take.')}</p>
          <button className="studio-button" onClick={() => onNavigate(next ? { topic: next.id } : { view: 'manage' })}>{resumeAction}<ArrowRight size={18} /></button>
        </div>
        {next && <div className="journal-resume-footer"><div className="journal-stages">{[t('Видео', 'Video'), t('Конспект', 'Notes'), t('Тест по желанию', 'Optional quiz')].map((label, index) => <span key={label} className={steps[index] ? 'done' : ''}>{steps[index] ? <Check size={13} /> : <span className="journal-step-dot" />}{label}</span>)}</div><small>{courseDone} / {course?.lessons.length} {t('уроков пройдено', 'lessons complete')}</small></div>}
      </section>
      <WeekActivity progress={progress} />
    </div>}
    <div className="studio-stat-grid">{[
      { value: String(done), label: t('уроков позади', 'lessons behind you'), detail: t('завершённые шаги', 'completed steps') },
      { value: duration(seconds, progress.language), label: t('уделено учёбе', 'given to learning'), detail: t('активное время в уроках', 'active time in lessons') },
      { value: String(active.length), label: t('курсов в процессе', 'courses in progress'), detail: t('можно продолжить в любой момент', 'ready whenever you are') },
      { value: String(stats.level), label: t('текущий уровень', 'current level'), detail: `${stats.xp} XP · ${stats.next} ${t('до следующего', 'to the next')}` },
    ].map(item => <div className="studio-stat" key={item.label}><strong>{item.value}</strong><span>{item.label}</span><small>{item.detail}</small></div>)}</div>
    {!analytics && milestone && <section className="journal-milestone"><span className="journal-milestone-icon"><Target size={21} /></span><div><small>{t('БЛИЖАЙШАЯ ОТМЕТКА', 'NEXT MILESTONE')}</small><h2>{milestone.title}</h2></div><div className="journal-milestone-progress"><p>{milestone.remaining} <strong>{milestone.target - milestone.value} {milestone.unit}</strong></p><Progress value={milestone.value / milestone.target * 100} aria-label={milestone.title} /></div><button className="text-button" onClick={() => onNavigate({ view: 'achievements' })}>{t('Достижения', 'Achievements')}<ArrowUpRight size={16} /></button></section>}
    {analytics ? <div className="studio-main-grid"><WeekActivity progress={progress} /><LanguageTime progress={progress} /></div> : <>
      <div className="studio-section-title standalone"><div><span className="journal-section-index">01 / {t('УЧИТЬСЯ', 'LEARN')}</span><h2>{active.length ? t('Открытые главы', 'Open chapters') : t('С чего начнём', 'Where to begin')}</h2></div><button onClick={() => onNavigate({ view: 'catalog' })}>{t('Вся библиотека', 'Full library')}<ArrowRight size={16} /></button></div>
      <div className="studio-course-grid">{featured.map(course => <CourseTile key={course.id} course={course} progress={progress} onNavigate={onNavigate} />)}</div>
      <div className="studio-bottom-grid"><LanguageTime progress={progress} /><section className="studio-project-callout"><span className="journal-section-index">02 / {t('ПРИМЕНЯТЬ', 'BUILD')}</span><h2>{project?.title || t('Место для твоей практики.', 'A place for your practice.')}</h2><p>{project ? project.description || t('Вернись к своему проекту и выбери небольшую задачу на сегодня.', 'Return to your project and choose a small task for today.') : t('Небольшая программа по теме урока — уже хороший проект. Сохрани идею, чтобы вернуться к ней.', 'A small program based on a lesson makes a good first project. Save an idea to return to.')}</p><button onClick={() => onNavigate({ view: 'projects' })}>{project ? t('К моим проектам', 'Open my projects') : t('Записать идею', 'Save an idea')}<ArrowUpRight size={18} /></button><span className="journal-project-count">{progress.projects.filter(item => item.status === 'completed').length} {t('проектов завершено', 'projects completed')}</span></section></div>
    </>}
    {analytics && <><div className="studio-section-title standalone"><h2>{t('История занятий', 'Study history')}</h2></div><div className="studio-history">{progress.studySessions.length ? [...progress.studySessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(session => <div key={session.id}><Clock3 size={17} /><div><strong>{getLesson(session.lessonId)?.titles[progress.language] || session.language}</strong><span>{getLessonCourse(session.lessonId)?.title || session.language} · {new Date(session.date + 'T12:00:00').toLocaleDateString(progress.language)}</span></div><b>{duration(session.seconds, progress.language)}</b></div>) : <p className="studio-empty-text">{t('История появится после первого занятия.', 'Your history starts with your first study session.')}</p>}</div></>}
  </>;
}

export function Achievements({ progress }: Pick<WorkspaceProps, 'progress'>) {
  const { catalog } = useCatalog(); const t = translator(progress.language);
  const done = catalog.lessons.filter(lesson => progress.completed[lesson.id]).length;
  const time = progress.studySessions.reduce((sum, session) => sum + session.seconds, 0);
  const quizzes = Object.values(progress.lessonStates).filter(state => state.quiz?.passed).length;
  const days = new Set(progress.studySessions.filter(session => session.seconds > 0).map(session => session.date)).size;
  const badges = [
    { icon: Play, title: t('Первый шаг', 'First step'), desc: t('Заверши первый урок', 'Complete your first lesson'), value: done, target: 1 },
    { icon: BookOpen, title: t('Вошёл в ритм', 'Finding your rhythm'), desc: t('Заверши 10 уроков', 'Complete 10 lessons'), value: done, target: 10 },
    { icon: Target, title: t('Теория на практике', 'Theory into practice'), desc: t('Успешно реши 5 тестов', 'Pass 5 theory quizzes'), value: quizzes, target: 5 },
    { icon: Clock3, title: t('Час для себя', 'An hour for yourself'), desc: t('Накопи час активного обучения', 'Log one hour of active learning'), value: Math.floor(time / 60), target: 60, unit: t('мин', 'min') },
    { icon: Flame, title: t('Привычка учиться', 'Learning habit'), desc: t('Занимайся в 7 разных дней', 'Study on 7 different days'), value: days, target: 7 },
    { icon: GraduationCap, title: t('До последнего урока', 'All the way through'), desc: t('Полностью заверши один курс', 'Finish a complete course'), value: catalog.courses.filter(course => course.lessons.length && course.lessons.every(id => progress.completed[id])).length, target: 1 },
    { icon: FolderGit2, title: t('Сделано своими руками', 'Built by you'), desc: t('Заверши свой первый проект', 'Finish your first project'), value: progress.projects.filter(project => project.status === 'completed').length, target: 1 },
    { icon: Code2, title: t('Новые горизонты', 'New horizons'), desc: t('Удели 30 минут каждой из 3 технологий', 'Spend 30 minutes on each of 3 technologies'), value: totals(progress).filter(([, seconds]) => seconds >= 1800).length, target: 3 },
  ];
  const unlocked = badges.filter(badge => badge.value >= badge.target).length;
  return <><PageTitle eyebrow={t('ОТМЕТКИ НА ПУТИ', 'MILESTONES')} title={t('Твои достижения', 'Your achievements')} description={t('То, что ты уже сделал, и ближайшие ориентиры.', 'What you have already done, and what comes next.')} /><div className="studio-achievement-banner"><span><Trophy size={28} /></span><div><h2>{unlocked} / {badges.length} {t('достижений открыто', 'achievements unlocked')}</h2><p>{t('Достижения открываются автоматически по твоему прогрессу.', 'Achievements unlock automatically as you progress.')}</p></div><Progress value={unlocked / badges.length * 100} aria-label={t('Открытые достижения', 'Unlocked achievements')} /></div><div className="studio-badges">{badges.map(badge => { const earned = badge.value >= badge.target; return <article key={badge.title} className={`studio-badge ${earned ? 'earned' : ''}`}><span className="studio-badge-status">{earned ? <CheckCircle2 size={16} /> : <LockKeyhole size={15} />}{earned ? t('Открыто', 'Unlocked') : t('Впереди', 'Ahead')}</span><div className="studio-badge-icon"><badge.icon size={32} strokeWidth={1.5} /></div><h2>{badge.title}</h2><p>{badge.desc}</p><Progress value={Math.min(100, badge.value / badge.target * 100)} aria-label={badge.title} /><small>{Math.min(badge.value, badge.target)} / {badge.target} {badge.unit || ''}</small></article>; })}</div></>;
}
export function Projects({ progress, ready, update }: Pick<WorkspaceProps, 'progress'> & { ready: boolean; update: (change: (old: LearningProgress) => LearningProgress) => void }) {
  const { catalog } = useCatalog(); const t = translator(progress.language);
  const [editing, setEditing] = useState<string | null>(null); const [open, setOpen] = useState(false); const [filter, setFilter] = useState('all'); const [error, setError] = useState(''); const [deleteId, setDeleteId] = useState<string | null>(null);
  const blank = { title: '', description: '', language: 'Go', courseId: '', status: 'planned' as 'planned' | 'active' | 'completed', url: '' };
  const [draft, setDraft] = useState(blank);
  const statuses = { planned: t('Идея', 'Idea'), active: t('В работе', 'In progress'), completed: t('Завершён', 'Completed') };
  const save = (event: FormEvent) => { event.preventDefault(); setError(''); if (!draft.title.trim()) { setError(t('Добавь название проекта.', 'Enter a project title.')); return; } if (draft.url && !/^https?:\/\/[^\s]+$/i.test(draft.url)) { setError(t('Укажи полную ссылку с https:// или http://.', 'Enter a full https:// or http:// URL.')); return; } try { update(old => saveProject(old, { ...draft, title: draft.title.trim(), description: draft.description.trim(), language: draft.language.trim() || 'Other', courseId: draft.courseId || null, id: editing || undefined })); setOpen(false); } catch (cause) { setError(cause instanceof Error ? cause.message : t('Не удалось сохранить проект.', 'Could not save the project.')); } };
  const projects = progress.projects.filter(project => filter === 'all' || filter === project.status);
  return <><PageTitle eyebrow={t('ПРАКТИКА', 'PRACTICE')} title={t('Мастерская проектов', 'Your project workshop')} description={t('Место, где изученное становится чем-то настоящим.', 'Where what you learn becomes something real.')}><button className="studio-button" disabled={!ready} onClick={() => { setEditing(null); setDraft(blank); setError(''); setOpen(true); }}><Plus size={17} />{t('Новый проект', 'New project')}</button></PageTitle><div className="studio-tracks">{[['all', t('Все проекты', 'All projects')], ...Object.entries(statuses)].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{progress.projects.filter(project => value === 'all' || value === project.status).length}</span></button>)}</div>
    {open && <form className="studio-project-form studio-panel" onSubmit={save}><div className="studio-section-title"><h2>{editing ? t('Редактировать проект', 'Edit project') : t('Новая идея', 'A new idea')}</h2><button type="button" aria-label={t('Закрыть форму', 'Close form')} onClick={() => setOpen(false)}><X size={20} /></button></div><label>{t('Название', 'Title')}<input autoFocus required maxLength={120} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder={t('Например, трекер привычек на Go', 'e.g. A habit tracker in Go')} /></label><label>{t('Что хочешь создать?', 'What would you like to build?')}<textarea rows={3} maxLength={3000} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label><div className="studio-form-columns"><label>{t('Язык / технология', 'Language / technology')}<input maxLength={60} required value={draft.language} onChange={event => setDraft({ ...draft, language: event.target.value })} /></label><label>{t('Связанный курс', 'Related course')}<select value={draft.courseId} onChange={event => setDraft({ ...draft, courseId: event.target.value })}><option value="">{t('Без курса', 'No course')}</option>{catalog.courses.map(course => <option value={course.id} key={course.id}>{course.title}</option>)}</select></label><label>{t('Статус', 'Status')}<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as typeof draft.status })}>{Object.entries(statuses).map(([key, title]) => <option value={key} key={key}>{title}</option>)}</select></label></div><label>{t('Ссылка на код или результат', 'Code or demo URL')}<input type="url" maxLength={2000} value={draft.url} onChange={event => setDraft({ ...draft, url: event.target.value })} placeholder="https://github.com/…" /></label>{error && <p role="alert">{error}</p>}<div className="studio-form-actions"><button type="submit" disabled={!ready} className="studio-button"><Check size={17} />{t('Сохранить проект', 'Save project')}</button><button type="button" className="studio-button secondary" onClick={() => setOpen(false)}>{t('Отмена', 'Cancel')}</button></div></form>}
    {projects.length ? <div className="studio-project-grid">{projects.map(project => <article key={project.id} className="studio-project-card"><div className="studio-section-title"><span className="studio-project-symbol"><FolderGit2 size={24} /></span><span className={`studio-status ${project.status}`}>{statuses[project.status]}</span></div><h2>{project.title}</h2><p>{project.description || t('Добавь цель и описание проекта.', 'Add a goal and description.')}</p><div className="studio-tags"><span>{project.language}</span>{project.courseId && <span>{catalog.courses.find(course => course.id === project.courseId)?.title || t('Курс в архиве', 'Archived course')}</span>}</div><label className="studio-project-status-label">{t('Статус', 'Status')}<select aria-label={`${t('Статус', 'Status')}: ${project.title}`} disabled={!ready} value={project.status} onChange={event => update(old => saveProject(old, { ...project, status: event.target.value as typeof project.status }))}>{Object.entries(statuses).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label><div className="studio-project-actions">{project.url && <a href={project.url} target="_blank" rel="noreferrer">{t('Открыть', 'Open')}<ExternalLink size={14} /></a>}<button disabled={!ready} onClick={() => { setEditing(project.id); setDraft({ ...project, courseId: project.courseId || '' }); setError(''); setOpen(true); }}><Pencil size={14} />{t('Изменить', 'Edit')}</button><button disabled={!ready} onClick={() => setDeleteId(project.id)}>{t('Удалить', 'Delete')}</button></div>{deleteId === project.id && <div className="studio-delete-confirm"><p>{t('Удалить запись проекта?', 'Delete this project entry?')}</p><button disabled={!ready} onClick={() => { update(old => removeProject(old, project.id)); setDeleteId(null); }}>{t('Удалить', 'Delete')}</button><button onClick={() => setDeleteId(null)}>{t('Отмена', 'Cancel')}</button></div>}</article>)}</div> : !open && <div className="studio-empty projects-empty"><FolderGit2 size={42} strokeWidth={1.5} /><h2>{t('Следующий проект начинается с идеи', 'Your next project starts with an idea')}</h2><p>{t('Запиши, что хочешь построить, свяжи с курсом и следи за результатом.', 'Write down what you want to build, link a course and track the result.')}</p><button className="studio-button" disabled={!ready} onClick={() => { setEditing(null); setDraft(blank); setOpen(true); }}><Plus size={17} />{t('Добавить проект', 'Add project')}</button></div>}
  </>;
}

