'use client';
import { useState, type MouseEvent } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, Check, Clock3, ExternalLink, Route, UserRound } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { useCatalog } from '@/components/catalog-provider';
import { roadmaps, roadmapGroups, technologies, type Technology } from '@/data/roadmaps';
import { technologyState, roadmapProgress, isCourseStudied } from '@/lib/roadmap-progress';
import { experience, setTechnologyStudied, resetTechnologyStatus, type LearningProgress } from '@/lib/progress';
import { translator } from '@/lib/i18n';

type Destination = { course?: string; topic?: string; view?: string; roadmap?: string };
type Props = {
  progress: LearningProgress;
  ready: boolean;
  update: (change: (old: LearningProgress) => LearningProgress) => void;
  onNavigate: (next: Destination) => void;
};
const roadmapDestination = (id: string): Destination => ({ view: 'roadmaps', roadmap: id });
function follow(event: MouseEvent<HTMLAnchorElement>, target: Destination, onNavigate: Props['onNavigate']) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); onNavigate(target);
}

function TechnologyCard({ technology, progress, ready, update, onNavigate }: Props & { technology: Technology }) {
  const { catalog, getCourse, getLesson } = useCatalog();
  const language = progress.language;
  const t = translator(language);
  const state = technologyState(technology, progress, catalog.courses);
  const coursesOnly = technology.resources.some(resource => !resource.lessonId);
  return <article className={`roadmap-node ${state.studied ? 'is-studied' : ''}`}>
    <div className="roadmap-node-top"><h3>{technology.title}</h3>{state.studied && <span className="study-badge"><Check size={14} />{t('Изучено', 'Studied')}</span>}</div>
    <p>{technology.description[language]}</p>
    <div className="roadmap-resources">
      {technology.resources.some(resource => getCourse(resource.courseId) && (!resource.lessonId || getLesson(resource.lessonId))) ? <>
        <span className="resource-kind"><BookOpen size={14} />{coursesOnly ? t('Курс в библиотеке', 'Course in the library') : t('Материалы в других курсах', 'Notes in other courses')}</span>
        {technology.resources.map(resource => {
          const course = getCourse(resource.courseId);
          const lesson = resource.lessonId ? getLesson(resource.lessonId) : undefined;
          if (!course || (resource.lessonId && !lesson)) return null;
          const target = lesson ? { topic: lesson.id } : { course: course.id };
          const query = new URLSearchParams(lesson ? [['topic', lesson.id]] : [['course', course.id]]);
          return <a key={resource.lessonId || resource.courseId} href={`?${query}`} onClick={event => follow(event, target, onNavigate)}>{lesson?.titles[language] || course.title}<ArrowUpRight size={15} /></a>;
        })}
      </> : <span className="coming-soon"><Clock3 size={15} />{t('Курс скоро появится', 'Course coming soon')}</span>}
    </div>
    <div className="technology-check">
      <Checkbox id={`studied-${technology.id}`} aria-label={t(`Я изучил ${technology.title}`, `I have studied ${technology.title}`)} checked={state.studied} disabled={!ready} onCheckedChange={checked => update(p => setTechnologyStudied(p, technology.id, checked === true))} />
      <label htmlFor={`studied-${technology.id}`}>{t('Я изучил эту технологию', 'I have studied this technology')}</label>
    </div>
    <div className="study-origin">
      <span>{state.manual !== undefined ? t('Твоя отметка', 'Your assessment') : state.automatic ? t('По пройденному курсу', 'From a completed course') : state.started ? t('Материалы в процессе', 'Materials in progress') : t('Можно отметить знания вне библиотеки', 'You can mark knowledge learned elsewhere')}</span>
      {state.manual !== undefined && <button onClick={() => update(p => resetTechnologyStatus(p, technology.id))}>{t('По курсам', 'Use courses')}</button>}
    </div>
  </article>;
}

export function RoadmapsView({ roadmapId, ...props }: Props & { roadmapId?: string }) {
  const { catalog } = useCatalog();
  const [group, setGroup] = useState('all');
  const { progress, onNavigate } = props;
  const language = progress.language;
  const t = translator(language);
  const selected = roadmaps.find(roadmap => roadmap.id === roadmapId);
  if (selected) {
    const summary = roadmapProgress(selected, technologies, progress, catalog.courses);
    return <section className="roadmap-detail">
      <button className="text-button back-button" onClick={() => onNavigate({ view: 'roadmaps' })}><ArrowLeft size={16} />{t('Все роадмапы', 'All roadmaps')}</button>
      <div className="roadmap-heading"><span className="roadmap-symbol"><Route size={26} /></span><div><span className="eyebrow">{t('ТВОЙ МАРШРУТ', 'YOUR LEARNING PATH')}</span><h1>{selected.title}</h1></div></div>
      <p className="roadmap-intro">{selected.description[language]}</p>
      <div className="roadmap-summary"><div><strong>{summary.studied} / {summary.total}</strong><span>{t('технологий изучено', 'technologies studied')}</span></div><div className="roadmap-summary-progress"><span>{summary.percent}%</span><Progress value={summary.percent} aria-label={t('Прогресс роадмапа', 'Roadmap progress')} /></div><span>{t('С материалами', 'With resources')}: {summary.available} · {t('Скоро', 'Coming soon')}: {summary.upcoming}</span></div>
      <p className="roadmap-help">{t('Иди по этапам сверху вниз. Галочки общие для всех роадмапов и профиля; уже знакомые технологии можно отметить сразу.', 'Follow the stages from top to bottom. Checkmarks are shared across roadmaps and your profile; mark familiar technologies right away.')}</p>
      <ol className="roadmap-stages">
        {selected.stages.map((stage, index) => {
          const items = stage.technologies.map(id => technologies.find(technology => technology.id === id)!);
          const studied = items.filter(technology => technologyState(technology, progress, catalog.courses).studied).length;
          return <li key={stage.title.en} className="roadmap-stage"><div className={`stage-number ${studied === items.length ? 'complete' : ''}`}>{studied === items.length ? <Check size={20} /> : String(index + 1).padStart(2, '0')}</div><div className="stage-body"><div className="stage-heading"><h2>{stage.title[language]}</h2><span>{studied} / {items.length}</span></div><div className="roadmap-node-grid">{items.map(technology => <TechnologyCard key={technology.id} technology={technology} {...props} />)}</div></div></li>;
        })}
      </ol>
      <div className="roadmap-practice"><BookOpen size={22} /><p>{selected.outcome[language]}</p></div>
      <div className="roadmap-sources"><h2>{t('Источники и выбор стека', 'Sources and stack choices')}</h2><p>{t('Маршрут адаптирован под библиотеку. Это один из вариантов обучения; материалы по отдельным темам не заменяют полный курс. Проверено 25.09.2026.', 'This path is adapted to the library and represents one possible learning sequence. Topic excerpts do not replace a full course. Reviewed September 25, 2026.')}</p><div>{selected.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer noopener">{source.title}<ExternalLink size={14} /></a>)}</div></div>
    </section>;
  }
  const visibleGroups = roadmapGroups.filter(item => group === 'all' || item.id === group);
  return <section>
    <div className="page-heading roadmap-page-heading"><div><span className="eyebrow">{t('ОТ ОСНОВ К ПРАКТИКЕ', 'FROM FOUNDATIONS TO PRACTICE')}</span><h1>{t('Роадмапы', 'Roadmaps')}<span>.</span></h1><p>{t('Выбери направление: что изучать, в каком порядке и где найти материалы.', 'Choose a direction: what to learn, in which order and where to find resources.')}</p></div><span className="roadmap-count">{roadmaps.length} {t('направлений', 'paths')}</span></div>
    {roadmapId && <p role="status" className="storage-warning">{t('Такой роадмап не найден. Выбери направление ниже.', 'Roadmap not found. Choose a path below.')}</p>}
    <Tabs value={group} onValueChange={setGroup} className="learning-tabs"><TabsList aria-label={t('Направления роадмапов', 'Roadmap categories')}><TabsTrigger value="all">{t('Все', 'All')}</TabsTrigger>{roadmapGroups.map(item => <TabsTrigger key={item.id} value={item.id}>{item.title}</TabsTrigger>)}</TabsList><TabsContent value={group}>
      {visibleGroups.map(item => <section className="roadmap-group" key={item.id}><div className="section-heading"><h2>{item.title}</h2><span className="muted">{roadmaps.filter(roadmap => roadmap.group === item.id).length}</span></div><div className="roadmap-grid">{roadmaps.filter(roadmap => roadmap.group === item.id).map(roadmap => {
        const summary = roadmapProgress(roadmap, technologies, progress, catalog.courses);
        return <a className="roadmap-card" key={roadmap.id} href={`?view=roadmaps&roadmap=${roadmap.id}`} onClick={event => follow(event, roadmapDestination(roadmap.id), onNavigate)}><div className="roadmap-card-top"><Route size={23} /><span>{t('Этапы', 'Stages')}: {roadmap.stages.length}</span></div><h3>{roadmap.title}</h3><p>{roadmap.description[language]}</p><div className="roadmap-card-availability"><span><BookOpen size={14} />{summary.available} {t('с материалами', 'with resources')}</span><span><Clock3 size={14} />{summary.upcoming} {t('скоро', 'coming soon')}</span></div><Progress value={summary.percent} aria-label={roadmap.title} /><div className="roadmap-card-bottom"><span>{summary.studied} / {summary.total} {t('изучено', 'studied')}</span><ArrowUpRight size={18} /></div></a>;
      })}</div></section>)}
    </TabsContent></Tabs>
  </section>;
}

export function ProfileView(props: Props) {
  const { catalog } = useCatalog();
  const [filter, setFilter] = useState('studied');
  const { progress, onNavigate } = props;
  const t = translator(progress.language);
  const stats = experience(progress, catalog.lessons);
  const studied = technologies.filter(technology => technologyState(technology, progress, catalog.courses).studied);
  const learning = technologies.filter(technology => technologyState(technology, progress, catalog.courses).started);
  const visible = filter === 'studied' ? studied : filter === 'learning' ? learning : technologies;
  const finishedCourses = catalog.courses.filter(course => isCourseStudied(course, progress));
  const activeRoadmaps = roadmaps.map(roadmap => ({ roadmap, summary: roadmapProgress(roadmap, technologies, progress, catalog.courses) })).filter(item => item.summary.studied > 0);
  return <section>
    <div className="profile-heading"><span className="profile-symbol"><UserRound size={30} /></span><div><span className="eyebrow">{t('ТВОЯ БАЗА ЗНАНИЙ', 'YOUR KNOWLEDGE BASE')}</span><h1>{t('Мой профиль', 'My profile')}</h1><p>{t('Изученные технологии и направления, в которых ты продвигаешься.', 'Technologies you have studied and paths you are progressing through.')}</p></div></div>
    <div className="profile-stats"><div><strong>{studied.length}</strong><span>{t('изучено технологий', 'technologies studied')}</span></div><div><strong>{finishedCourses.length}</strong><span>{t('пройдено курсов', 'courses completed')}</span></div><div><strong>{stats.level}</strong><span>{t('уровень', 'level')}</span></div><div><strong>{stats.xp}</strong><span>XP</span></div></div>
    <p className="roadmap-help">{t('Технологии появляются после прохождения связанного курса или по твоей отметке. Все доступные конспекты курса тоже засчитываются. Это история обучения, а не оценка владения. Данные сохраняются в этом браузере.', 'Technologies appear after completing a linked course or by your own assessment. Finishing all available course notes also counts. This is a learning history, not a proficiency rating. Data is saved in this browser.')}</p>
    <Tabs value={filter} onValueChange={setFilter} className="learning-tabs"><TabsList aria-label={t('Технологии профиля', 'Profile technologies')}><TabsTrigger value="studied">{t('Изучено', 'Studied')} · {studied.length}</TabsTrigger><TabsTrigger value="learning">{t('В процессе', 'In progress')} · {learning.length}</TabsTrigger><TabsTrigger value="all">{t('Все технологии', 'All technologies')} · {technologies.length}</TabsTrigger></TabsList><TabsContent value={filter}>
      {visible.length ? <div className="roadmap-node-grid profile-technologies">{visible.map(technology => <TechnologyCard key={technology.id} technology={technology} {...props} />)}</div> : <Empty className="empty-progress"><UserRound size={30} /><EmptyTitle>{filter === 'studied' ? t('Здесь появятся изученные технологии', 'Your studied technologies will appear here') : t('Пока нет технологий в процессе', 'No technologies in progress yet')}</EmptyTitle><EmptyDescription>{t('Открой курс или отметь то, что уже знаешь, в списке всех технологий.', 'Open a course or mark what you already know in the complete technology list.')}</EmptyDescription><button className="secondary-button" onClick={() => setFilter('all')}>{t('Выбрать технологии', 'Choose technologies')}</button></Empty>}
    </TabsContent></Tabs>
    <section className="profile-roadmaps"><div className="section-heading"><h2>{t('Прогресс по направлениям', 'Progress by path')}</h2><button className="text-button" onClick={() => onNavigate({ view: 'roadmaps' })}>{t('Все роадмапы', 'All roadmaps')}<ArrowUpRight size={16} /></button></div>{activeRoadmaps.length ? <div className="profile-paths">{activeRoadmaps.map(({ roadmap, summary }) => <a key={roadmap.id} href={`?view=roadmaps&roadmap=${roadmap.id}`} onClick={event => follow(event, roadmapDestination(roadmap.id), onNavigate)}><div><strong>{roadmap.title}</strong><span>{summary.studied} / {summary.total} · {summary.percent}%</span></div><Progress value={summary.percent} aria-label={roadmap.title} /></a>)}</div> : <p className="roadmap-help">{t('Отметь первую технологию — её прогресс отразится во всех связанных направлениях.', 'Mark your first technology to see progress in every related path.')}</p>}</section>
  </section>;
}
