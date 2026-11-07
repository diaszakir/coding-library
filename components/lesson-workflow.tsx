'use client';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, CheckCheck, ChevronRight, CircleHelp, ExternalLink, Play, RotateCcw, Video } from 'lucide-react';
import { gradeQuiz, lessonChecklist, markLessonNotes, setLessonVideoWatched, submitLessonQuiz } from '@/lib/learning';
import type { LearningProgress } from '@/lib/progress';
import type { LessonLearning } from '@/data/lesson-learning';
import { translator, type Language } from '@/lib/i18n';

type Update = (change: (old: LearningProgress) => LearningProgress) => void;
type StageProps = { lessonId: string; definition?: LessonLearning; progress: LearningProgress; update: Update };

export function LessonChecklist({ lessonId, progress }: Pick<StageProps, 'lessonId' | 'progress'>) {
  const t = translator(progress.language);
  const state = lessonChecklist(progress, lessonId);
  return <div className="lesson-checklist" aria-label={t('Условия завершения урока', 'Lesson completion requirements')}>
    {[
      { label: t('Посмотреть видео', 'Watch the video'), done: state.video, icon: Video, href: '#lesson-video' },
      { label: t('Прочитать конспект', 'Read the notes'), done: state.notes, icon: BookOpen, href: '#lesson-notes' },
      { label: t('Тест · по желанию', 'Quiz · optional'), done: state.quiz, icon: CircleHelp, href: '#lesson-quiz' },
    ].map((stage, index) => <a key={stage.href} href={stage.href} className={stage.done ? 'stage-done' : ''}><span className="checklist-number">{stage.done ? <Check size={16} /> : index + 1}</span><stage.icon size={17} /><span>{stage.label}</span>{index < 2 && <ChevronRight size={16} className="checklist-arrow" />}</a>)}
  </div>;
}

export function LessonVideo({ lessonId, definition, progress, update, onPlaying }: StageProps & { onPlaying: (playing: boolean) => void }) {
  const t = translator(progress.language);
  const video = definition?.video;
  const watched = lessonChecklist(progress, lessonId).video;
  useEffect(() => () => onPlaying(false), [onPlaying]);
  return <section className="lesson-stage video-stage" id="lesson-video" aria-labelledby="video-stage-title">
    <div className="lesson-stage-heading"><span className="stage-icon"><Video size={20} /></span><div><small>{t('ШАГ 01', 'STEP 01')}</small><h2 id="video-stage-title">{t('Видео урока', 'Lesson video')}</h2></div>{watched && <span className="stage-badge"><Check size={14} />{t('Просмотрено', 'Watched')}</span>}</div>
    {!video ? <div className="stage-missing"><p>{t('Видео к этому конспекту пока не добавлено.', 'This lesson does not have a video yet.')}</p><small>{t('Читай материалы и сохраняй время обучения. Для завершения осталось добавить и посмотреть видео.', 'Read the material and track your study time. A video still needs to be added and watched to complete this lesson.')}</small></div> : video.provider === 'html5' ? <video controls preload="metadata" src={video.url} aria-label={video.title} onPlay={() => onPlaying(true)} onPause={() => onPlaying(false)} onWaiting={() => onPlaying(false)} onPlaying={() => onPlaying(true)} onEnded={() => onPlaying(false)} /> : <>
      <a className="external-video" href={video.url} target="_blank" rel="noopener noreferrer"><span className="video-play"><Play size={24} fill="currentColor" /></span><span><strong>{video.title}</strong><small>{t('Открыть исходное видео', 'Open the source video')}<ExternalLink size={13} /></small></span><ExternalLink size={20} /></a>
      <p className="stage-help">{t('Внешний плеер не сообщает о просмотре. После видео подтверди этот шаг самостоятельно. Время в другой вкладке не учитывается.', 'The external player does not report watch progress. Confirm this stage yourself after watching. Time spent in another tab is not tracked.')}</p>
    </>}
    {video && <label className="video-confirmation"><input type="checkbox" checked={watched} onChange={event => { const checked = event.target.checked; update(old => setLessonVideoWatched(old, lessonId, checked)); }} /><span>{t('Я посмотрел видео', 'I watched the video')}<small>{t('Отметь вручную. Галочку можно снять, если хочешь вернуться к уроку.', 'Mark it yourself. You can uncheck it to return to the lesson later.')}</small></span></label>}
    {definition?.sourceNote && <p className="stage-source">{definition.sourceNote[progress.language]}</p>}
  </section>;
}

export function LessonWorkflow({ lessonId, definition, progress, update, hasNotes, nextId, onOpen, onBack }: StageProps & { hasNotes: boolean; nextId?: string; onOpen: (id: string) => void; onBack: () => void }) {
  const language = progress.language;
  const t = translator(language);
  const state = lessonChecklist(progress, lessonId);
  const [reachedEnd, setReachedEnd] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasNotes || !end.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setReachedEnd(true); }, { threshold: 0.2 });
    observer.observe(end.current);
    return () => observer.disconnect();
  }, [hasNotes]);
  return <div className="lesson-workflow">
    <div ref={end} className="notes-end" aria-hidden="true" />
    <section className="lesson-stage notes-stage" id="lesson-reading-confirmation" aria-labelledby="notes-stage-title"><div className="lesson-stage-heading"><span className="stage-icon"><BookOpen size={20} /></span><div><small>{t('ШАГ 02', 'STEP 02')}</small><h2 id="notes-stage-title">{t('Конспект прочитан?', 'Finished reading?')}</h2></div>{state.notes && <span className="stage-badge"><Check size={14} />{t('Прочитано', 'Read')}</span>}</div><p className="stage-help">{t('Попробуй объяснить главную идею своими словами, затем подтверди чтение.', 'Try to explain the main idea in your own words, then confirm you have read the notes.')}</p><button className="secondary-button" disabled={state.notes || !reachedEnd || !hasNotes} onClick={() => update(old => markLessonNotes(old, lessonId))}><Check size={16} />{state.notes ? t('Чтение подтверждено', 'Reading confirmed') : t('Я прочитал конспект', 'I read the notes')}</button></section>
    <section className="lesson-stage quiz-stage" id="lesson-quiz" aria-labelledby="quiz-stage-title"><div className="lesson-stage-heading"><span className="stage-icon"><CircleHelp size={20} /></span><div><small>{t('ПО ЖЕЛАНИЮ', 'OPTIONAL')}</small><h2 id="quiz-stage-title">{t('Проверка теории', 'Theory check')}</h2></div>{state.quiz && <span className="stage-badge"><Check size={14} />{t('Пройдено', 'Passed')}</span>}</div>
      <p className="stage-help">{t('Тест помогает проверить себя и не влияет на завершение урока. Его можно пройти позже или пропустить.', 'The quiz is for self-checking and does not affect lesson completion. Take it later or skip it.')}</p>
      <details className="optional-quiz"><summary>{t('Открыть тест для самопроверки', 'Open the optional quiz')}</summary>
      {definition?.quiz?.[language]?.length ? <TheoryQuiz key={`${lessonId}-${language}`} lessonId={lessonId} questions={definition.quiz[language]} progress={progress} update={update} language={language} /> : <div className="stage-missing"><p>{t('Тест по этой теме ещё не подготовлен.', 'The quiz for this lesson has not been prepared yet.')}</p><small>{t('После добавления вопросов здесь появится необязательная самопроверка. Урок можно завершить без теста.', 'An optional knowledge check will appear here once questions are added. You can complete the lesson without a quiz.')}</small></div>}
      </details>
    </section>
    <section className={`workflow-result ${state.completed ? 'is-complete' : ''}`} aria-live="polite"><span className="stage-icon">{state.completed ? <CheckCheck size={23} /> : <BookOpen size={23} />}</span><div><h2>{state.completed ? t('Урок завершён', 'Lesson completed') : t(`${state.count} из 2 шагов выполнено`, `${state.count} of 2 stages complete`)}</h2><p>{state.legacy ? t('Сохранена отметка из прежней версии. Материалы и тест доступны для повторения.', 'Your previous completion has been preserved. Review the material and quiz whenever you like.') : state.completed ? t('Видео и конспект — готово. Тест можно пройти в любое время.', 'Video and notes are complete. You can take the quiz at any time.') : t('Отметь просмотр видео и чтение конспекта. Тест — по желанию.', 'Confirm you watched the video and read the notes. The quiz is optional.')}</p></div><button className="text-button" onClick={() => nextId ? onOpen(nextId) : onBack()}>{nextId ? t('Следующий урок', 'Next lesson') : t('К программе', 'Course outline')}<ChevronRight size={16} /></button></section>
  </div>;
}

function TheoryQuiz({ lessonId, questions, progress, update, language }: { lessonId: string; questions: NonNullable<LessonLearning['quiz']>['ru']; progress: LearningProgress; update: Update; language: Language }) {
  const t = translator(language);
  const saved = progress.lessonStates[lessonId]?.quiz;
  const validSavedAnswers = saved?.answers?.length === questions.length && saved.answers.every((answer, index) => Number.isInteger(answer) && answer >= 0 && answer < questions[index].options.length);
  const [answers, setAnswers] = useState<number[]>(() => validSavedAnswers && saved ? [...saved.answers] : questions.map(() => -1));
  const [submitted, setSubmitted] = useState(Boolean(validSavedAnswers));
  const result = submitted ? gradeQuiz(questions, answers, 80) : null;
  const submit = () => { update(old => submitLessonQuiz(old, lessonId, questions, answers, 80)); setSubmitted(true); };
  return <div className="theory-quiz"><p className="stage-help">{t(`${questions.length} вопросов · проходной результат 80% · число попыток не ограничено`, `${questions.length} questions · 80% to pass · unlimited attempts`)}</p>
    {questions.map((question, index) => <fieldset className="quiz-question" key={question.id}><legend><span>{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend><div className="quiz-options">{question.options.map((option, optionIndex) => <label key={optionIndex} className={`${answers[index] === optionIndex ? 'is-selected' : ''} ${submitted && question.answer === optionIndex ? 'is-correct' : ''} ${submitted && answers[index] === optionIndex && question.answer !== optionIndex ? 'is-incorrect' : ''}`}><input type="radio" name={`quiz-${lessonId}-${question.id}`} value={optionIndex} checked={answers[index] === optionIndex} disabled={submitted} onChange={() => setAnswers(old => old.map((value, answerIndex) => answerIndex === index ? optionIndex : value))} /><span>{option}</span>{submitted && question.answer === optionIndex && <Check size={16} />}</label>)}</div>{submitted && <p className="quiz-explanation">{question.explanation}</p>}</fieldset>)}
    {result && <div className={`quiz-score ${result.passed ? 'passed' : ''}`} role="status"><strong>{result.correct} / {result.total} · {result.percent}%</strong><span>{result.passed ? t('Тест пройден. Отличная работа!', 'Quiz passed. Well done!') : t('Пока меньше 80%. Разбери объяснения и попробуй снова.', 'Not quite 80% yet. Review the explanations and try again.')}</span></div>}
    <div className="quiz-actions">{!submitted ? <button className="primary-button" disabled={answers.some(answer => answer < 0)} onClick={submit}>{t('Проверить ответы', 'Check answers')}<ChevronRight size={16} /></button> : <button className="secondary-button" onClick={() => { setSubmitted(false); setAnswers(questions.map(() => -1)); }}><RotateCcw size={16} />{t('Пройти ещё раз', 'Try again')}</button>}<span>{saved?.attempts ? t(`Попыток: ${saved.attempts}`, `Attempts: ${saved.attempts}`) : t('Ответь на все вопросы', 'Answer all questions')}</span></div>
  </div>;
}
