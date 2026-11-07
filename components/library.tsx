'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock3, Code2, FolderGit2, LayoutDashboard, Map, Moon, Search, Settings2, GraduationCap, Sun, Trophy, UserRound } from 'lucide-react';
import Link from 'next/link';
import { DesignSearch } from '@/components/design-library';
import { CourseMark, Difficulty } from '@/components/course-display';
export { CourseMark, Difficulty } from '@/components/course-display';
import { Progress } from '@/components/ui/progress';
import { Toaster } from '@/components/ui/sonner';
import { legacyCourse } from '@/lib/catalog';
import { useCatalog } from '@/components/catalog-provider';
import { CourseManager } from '@/components/course-manager';
import { translator, countLabel, type Language } from '@/lib/i18n';
import { experience } from '@/lib/progress';
import { useLearning } from '@/hooks/use-learning';
import { useTheme } from '@/hooks/use-theme';
import LessonReader from '@/components/lesson-reader';
import { RoadmapsView, ProfileView } from '@/components/roadmaps';
import { Achievements, CourseCatalog, Dashboard, Projects, duration, type Destination } from '@/components/learning-workspace';
import { getLessonLearning } from '@/data/lesson-learning';

export default function Library() {
  const { catalog, getLesson, getCourse, getLessonCourse } = useCatalog();
  const [searchQuery, setSearchQuery] = useState('');
  const [navigation, setNavigation] = useState<Destination>({});
  const { progress, ready, storageError, update, savePosition } = useLearning();
  const { theme, toggleTheme } = useTheme();
  const language = progress.language; const t = translator(language);
  const lesson = getLesson(navigation.topic || '');
  const selectedCourse = lesson ? getLessonCourse(lesson.id) : getCourse(navigation.course || '');
  const view = navigation.view || 'dashboard';
  const stats = experience(progress, catalog.lessons);
  const links = [
    { id: 'dashboard', title: t('Дэшборд', 'Dashboard'), icon: LayoutDashboard },
    { id: 'catalog', title: t('Мои курсы', 'My courses'), icon: BookOpen },
    { id: 'roadmaps', title: t('Пути обучения', 'Learning paths'), icon: Map },
    { id: 'projects', title: t('Проекты', 'Projects'), icon: FolderGit2 },
    { id: 'achievements', title: t('Достижения', 'Achievements'), icon: Trophy },
    { id: 'progress', title: t('Мой прогресс', 'My progress'), icon: Clock3 },
  ];
  const title = lesson?.titles[language] || (view === 'manage' ? t('Управление курсами', 'Manage courses') : selectedCourse?.title) || links.find(link => link.id === view)?.title || t('Моя библиотека', 'My library');
  useEffect(() => {
    const read = () => { const params = new URLSearchParams(window.location.search); setNavigation({ course: params.get('course') || legacyCourse(params.get('tech') || '') || undefined, topic: params.get('topic') || undefined, view: params.get('view') || undefined, roadmap: params.get('roadmap') || undefined }); };
    read(); window.addEventListener('popstate', read); return () => window.removeEventListener('popstate', read);
  }, []);
  useEffect(() => { if (lesson && ready) update(old => ({ ...old, lastLesson: lesson.id, visited: { ...old.visited, [lesson.id]: new Date().toISOString() } })); }, [lesson, ready, update]);
  useEffect(() => { document.documentElement.lang = language; document.title = `${title} — DevLibrary`; }, [title, language]);
  useEffect(() => { if (!lesson) window.scrollTo({ top: 0, behavior: 'instant' }); }, [navigation, lesson]);
  const navigate = useCallback((next: Destination) => { const params = new URLSearchParams(); Object.entries(next).forEach(([key, value]) => { if (value) params.set(key, value); }); window.history.pushState(null, '', params.size ? `?${params}` : '/'); setNavigation(next); }, []);
  const follow = (event: MouseEvent<HTMLAnchorElement>, next: Destination) => { if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(next); };
  const openTopic = useCallback((id: string) => { if (catalog.lessons.some(lesson => lesson.id === id)) navigate({ topic: id }); }, [catalog.lessons, navigate]);
  const setLanguage = (value: Language) => update(old => ({ ...old, language: value }));
  const openSearch = () => { setSearchQuery(''); navigate({ view: 'search' }); };
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchQuery(''); navigate({ view: 'search' }); } }; window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut); }, [navigate]);
  const done = selectedCourse?.lessons.filter(id => progress.completed[id]).length || 0;
  const percent = selectedCourse?.lessons.length ? Math.round(done / selectedCourse.lessons.length * 100) : 0;
  const courseTime = progress.studySessions.filter(session => session.courseId === selectedCourse?.id).reduce((sum, session) => sum + session.seconds, 0);
  const destinationProps = { progress, onNavigate: navigate };
  return <div className="studio-app">
    <a className="skip-link" href="#main-content">{t('Перейти к содержимому', 'Skip to content')}</a>
    <aside className="studio-sidebar"><Link className="studio-brand" href="/" onClick={event => follow(event, {})}><span><Code2 size={21} /></span><div>devlibrary<small>{t('учебный журнал', 'learning journal')}</small></div></Link><span className="studio-nav-caption">{t('ПОД РУКОЙ', 'YOUR WORKSPACE')}</span><nav aria-label={t('Главная навигация', 'Main navigation')}>{links.map(link => <a href={`?view=${link.id}`} key={link.id} aria-current={(selectedCourse && view !== 'manage' ? link.id === 'catalog' : view === link.id) ? 'page' : undefined} onClick={event => follow(event, { view: link.id })}><link.icon size={19} /><span>{link.title}</span>{link.id === 'catalog' && <small>{catalog.courses.length}</small>}</a>)}</nav><div className="studio-sidebar-bottom"><section className="studio-level"><div><span><GraduationCap size={17} />{t('Уровень', 'Level')} {stats.level}</span><strong>{stats.xp} XP</strong></div><Progress value={stats.inLevel / 3} aria-label={t('Опыт до следующего уровня', 'Experience to next level')} /><p>{stats.next} XP {t('до нового уровня', 'to your next level')}</p></section><a className={view === 'manage' ? 'active' : ''} href="?view=manage" onClick={event => follow(event, { view: 'manage' })}><Settings2 size={18} />{t('Управление библиотекой', 'Manage library')}</a><Link href="/agents"><Code2 size={18}/>{t('Инструкция для ИИ', 'AI agent guide')}</Link><div className="studio-local"><i />{t('Личное пространство · локально', 'Personal space · local')}</div></div></aside>
    <div className="studio-main"><header className="studio-topbar"><div className="studio-breadcrumb"><span>{t('Мой журнал', 'My journal')}</span><ChevronRight size={13} /><strong>{title}</strong></div><div className="studio-topbar-actions"><button className="studio-top-search" onClick={openSearch} aria-label={t('Поиск', 'Search')}><Search size={17} /><span>{t('Найти в библиотеке', 'Search the library')}</span><kbd>Ctrl K</kbd></button><div className="language-switch" role="group" aria-label={t('Язык сайта', 'Site language')}>{(['ru','en'] as const).map(value => <button key={value} disabled={!ready} aria-pressed={language === value} onClick={() => setLanguage(value)}>{value.toUpperCase()}</button>)}</div><button className="theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? t('Светлая тема', 'Light theme') : t('Тёмная тема', 'Dark theme')}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button><button className="studio-avatar" onClick={() => navigate({ view: 'profile' })} aria-label={t('Мой профиль', 'My profile')}><UserRound size={18} /></button></div></header>
      <main id="main-content" className={`studio-workspace ${lesson ? 'studio-reading' : ''}`}>
        {storageError && <p className="storage-warning" role="alert">{t('Не удалось прочитать или сохранить прогресс на диске. Проверь доступ к папке библиотеки и обнови страницу.', 'Could not read or save progress on disk. Check your library folder and reload.')}</p>}
        {navigation.topic && !lesson && <p className="storage-warning" role="status">{t('Урок не найден. Выбери другой из каталога.', 'Lesson not found. Choose another from the catalog.')}</p>}
        {!ready ? <div className="studio-empty" role="status"><Clock3 size={25} /><p>{t('Загружаем твой прогресс…', 'Loading your progress…')}</p></div> : view === 'search' ? <DesignSearch {...destinationProps} query={searchQuery} onQuery={setSearchQuery} /> : view === 'manage' ? <CourseManager key={navigation.course || 'manage'} initialCourse={navigation.course} onOpen={id => navigate({ course: id })} /> : lesson && selectedCourse ? <LessonReader key={lesson.id} lesson={lesson} course={selectedCourse} progress={progress} update={update} onOpen={openTopic} onBack={() => navigate({ course: selectedCourse.id })} onLanguage={setLanguage} savePosition={savePosition} /> : selectedCourse ? <>
          <button className="studio-back" onClick={() => navigate({ view: 'catalog' })}><ArrowLeft size={16} />{t('Все курсы', 'All courses')}</button><div className="studio-course-heading"><CourseMark course={selectedCourse} /><div><span className="studio-eyebrow">{catalog.categories.find(category => category.id === selectedCourse.category)?.titles[language]}</span><h1>{selectedCourse.title}</h1></div><Difficulty value={selectedCourse.difficulty} language={language} /></div><p className="studio-course-intro">{selectedCourse.descriptions[language]}</p>
          <div className="studio-course-summary"><div><span>{t('Твой прогресс', 'Your progress')}<strong>{percent}%</strong></span><Progress value={percent} aria-label={t('Прогресс курса', 'Course progress')} /><small>{done} / {selectedCourse.lessons.length} {t('уроков', 'lessons')} · {duration(courseTime, language)} {t('обучения', 'of learning')}</small></div><button className="studio-button" onClick={() => { const id = progress.lastLesson && selectedCourse.lessons.includes(progress.lastLesson) && !progress.completed[progress.lastLesson] ? progress.lastLesson : selectedCourse.lessons.find(id => !progress.completed[id]) || selectedCourse.lessons[0]; if (id) openTopic(id); else navigate({ view: 'manage', course: selectedCourse.id }); }}>{selectedCourse.lessons.length ? t('Продолжить обучение', 'Continue learning') : t('Добавить первый урок', 'Add first lesson')}<ArrowRight size={17} /></button></div>
          <div className="studio-section-title standalone"><h2>{t('Программа курса', 'Course outline')}</h2><span>{countLabel(selectedCourse.lessons.length, language, 'lessons')}</span></div><div className="studio-lesson-list">{selectedCourse.lessons.map((id, index) => { const item = getLesson(id); if (!item) return null; const state = progress.lessonStates[id]; const completed = Boolean(progress.completed[id]); const config = getLessonLearning(id); return <a href={`?topic=${id}`} onClick={event => follow(event, { topic: id })} key={id} className={completed ? 'completed' : progress.lastLesson === id ? 'current' : ''}><span className="studio-lesson-number">{completed ? <Check size={18} /> : String(index + 1).padStart(2,'0')}</span><div><h3>{item.titles[language]}</h3><p>{config?.video && config.quiz ? t('Видео · Конспект · Тест по желанию', 'Video · Notes · Optional quiz') : t('Конспект · учебные материалы дополняются', 'Notes · learning material in preparation')}{progress.lastLesson === id && !completed && <strong>{t('Ты здесь', 'You are here')}</strong>}{progress.legacyCompleted[id] && <strong>{t('Пройдено ранее', 'Previously completed')}</strong>}</p></div><span className="studio-lesson-stage">{completed ? t('Завершён', 'Complete') : `${[state?.videoCompletedAt, state?.notesCompletedAt].filter(Boolean).length} / 2`}</span><ChevronRight size={17} /></a>; })}</div><div className="studio-course-note"><BookOpen size={19} /><p>{t('Урок завершается после отметки о просмотре видео и подтверждения чтения конспекта. Тест — по желанию: его можно пройти позже.', 'Confirm you watched the video and read the notes to complete a lesson. The quiz is optional and can be taken later.')}</p><button onClick={() => navigate({ view: 'manage', course: selectedCourse.id })}>{t('Редактировать курс', 'Edit course')}<ArrowRight size={14} /></button></div>
        </> : view === 'catalog' ? <CourseCatalog {...destinationProps} /> : view === 'projects' ? <Projects progress={progress} ready={ready} update={update} /> : view === 'achievements' ? <Achievements progress={progress} /> : view === 'roadmaps' ? <RoadmapsView roadmapId={navigation.roadmap} progress={progress} ready={ready} update={update} onNavigate={navigate} /> : view === 'profile' ? <ProfileView progress={progress} ready={ready} update={update} onNavigate={navigate} /> : <Dashboard {...destinationProps} analytics={view === 'progress'} />}
      </main><footer className="studio-footer"><span>devlibrary <i>/</i> {t('учебный журнал', 'learning journal')}</span><span>{t('В своём темпе.', 'At your own pace.')}</span></footer>
    </div><Toaster position="bottom-right" richColors />
  </div>;
}


