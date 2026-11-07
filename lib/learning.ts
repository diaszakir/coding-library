import type { LearningProgress, LessonState, PersonalProject, StudySession } from './progress';

export type QuizQuestion = { id: string; prompt: string; options: string[]; answer: number; explanation: string };
export type ProjectInput = Pick<PersonalProject, 'title' | 'description' | 'language' | 'courseId' | 'status' | 'url'> & { id?: string };
// Each open runtime owns one grow-only timer counter. Taking the maximum for
// each writer makes queued/retried saves idempotent across browser tabs.
const studyWriter = crypto.randomUUID();

export function lessonChecklist(progress: LearningProgress, id: string) {
  const state = progress.lessonStates[id];
  const video = Boolean(state?.videoCompletedAt), notes = Boolean(state?.notesCompletedAt), quiz = Boolean(state?.quiz?.passed);
  return { video, notes, quiz, count: Number(video) + Number(notes), completed: Boolean(progress.completed[id]), legacy: Boolean(progress.legacyCompleted[id]) };
}

function updateLesson(progress: LearningProgress, id: string, state: LessonState, date: string): LearningProgress {
  if (!id || ['__proto__', 'constructor', 'prototype'].includes(id)) return progress;
  const complete = state.videoCompletedAt && state.notesCompletedAt;
  const completed = { ...progress.completed };
  if (complete && !completed[id]) completed[id] = date;
  if (!complete && !progress.legacyCompleted[id]) delete completed[id];
  return { ...progress, lessonStates: { ...progress.lessonStates, [id]: state }, completed };
}

export function markLessonVideo(progress: LearningProgress, id: string, date = new Date().toISOString()) {
  return setLessonVideoWatched(progress, id, true, date);
}

export function setLessonVideoWatched(progress: LearningProgress, id: string, watched: boolean, date = new Date().toISOString()) {
  const state = progress.lessonStates[id] || {};
  if (Boolean(state.videoCompletedAt) === watched) return progress;
  const previousTime = Date.parse(state.videoUpdatedAt || state.videoCompletedAt || '') || 0;
  const updatedAt = new Date(Math.max(Date.parse(date), previousTime + 1)).toISOString();
  return updateLesson(progress, id, { ...state, videoCompletedAt: watched ? updatedAt : undefined, videoUpdatedAt: updatedAt }, updatedAt);
}

export function markLessonNotes(progress: LearningProgress, id: string, date = new Date().toISOString()) {
  const state = progress.lessonStates[id] || {};
  return state.notesCompletedAt ? progress : updateLesson(progress, id, { ...state, notesCompletedAt: date }, date);
}

export function gradeQuiz(questions: QuizQuestion[], answers: number[], passPercent = 80) {
  if (!questions.length || questions.length > 100 || answers.length !== questions.length || !Number.isFinite(passPercent) || passPercent < 1 || passPercent > 100 || new Set(questions.map(question => question.id)).size !== questions.length) throw new Error('Некорректный тест');
  questions.forEach((question, index) => {
    if (!question.id || question.options.length < 2 || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length || !Number.isInteger(answers[index]) || answers[index] < 0 || answers[index] >= question.options.length) throw new Error('Ответь на все вопросы теста');
  });
  const correct = questions.filter((question, index) => question.answer === answers[index]).length;
  const percent = correct / questions.length * 100;
  return { correct, total: questions.length, passed: percent >= passPercent, percent };
}

export function submitLessonQuiz(progress: LearningProgress, id: string, questions: QuizQuestion[], answers: number[], passPercent = 80, date = new Date().toISOString()) {
  const result = gradeQuiz(questions, answers, passPercent);
  const state = progress.lessonStates[id] || {};
  const previous = state.quiz;
  const keepBest = previous && (previous.passed && !result.passed || previous.correct / previous.total > result.correct / result.total);
  const quiz = keepBest ? { ...previous, attempts: previous.attempts + 1, submittedAt: date } : { answers: [...answers], correct: result.correct, total: result.total, passed: result.passed, passPercent, attempts: (previous?.attempts || 0) + 1, submittedAt: date, language: progress.language };
  return updateLesson(progress, id, { ...state, quiz }, date);
}

export function localStudyDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Sessions are aggregated by local day, lesson and programming language, avoiding an unbounded row per timer tick.
export function addStudyTime(progress: LearningProgress, input: Pick<StudySession, 'lessonId' | 'courseId' | 'language' | 'seconds'> & { date?: string }) {
  if (!input.lessonId || !input.courseId || !input.language.trim() || !Number.isFinite(input.seconds) || input.seconds <= 0) return progress;
  const date = input.date || localStudyDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return progress;
  const language = input.language.trim().slice(0, 60), seconds = Math.min(120, Math.floor(input.seconds));
  if (!seconds || ['__proto__', 'constructor', 'prototype'].includes(language)) return progress;
  const id = `${date}:${input.lessonId}:${language}`;
  const previous = progress.studySessions.find(session => session.id === id);
  const legacySeconds = previous?.counters ? previous.legacySeconds || 0 : previous?.seconds || 0;
  const counters = { ...previous?.counters, [studyWriter]: (previous?.counters?.[studyWriter] || 0) + seconds };
  const session: StudySession = { id, lessonId: input.lessonId, courseId: input.courseId, language, counters, legacySeconds, seconds: Math.min(86_400, legacySeconds + Object.values(counters).reduce((sum, amount) => sum + amount, 0)), date };
  const studySessions = previous ? progress.studySessions.map(item => item.id === id ? session : item) : [...progress.studySessions, session];
  return { ...progress, studySessions };
}

export function studyByLanguage(progress: LearningProgress) {
  const totals = new Map<string, number>();
  for (const session of progress.studySessions) totals.set(session.language, (totals.get(session.language) || 0) + session.seconds);
  return [...totals].map(([language, seconds]) => ({ language, seconds })).sort((a, b) => b.seconds - a.seconds || a.language.localeCompare(b.language));
}

export function learningStats(progress: LearningProgress, now = new Date()) {
  const today = localStudyDate(now);
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6);
  const firstDay = localStudyDate(weekStart);
  const activeDates = new Set(progress.studySessions.filter(session => session.seconds > 0).map(session => session.date));
  const cursor = new Date(now);
  if (!activeDates.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activeDates.has(localStudyDate(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  const totalSeconds = progress.studySessions.reduce((sum, session) => sum + session.seconds, 0);
  return { seconds: totalSeconds, totalSeconds, todaySeconds: progress.studySessions.filter(session => session.date === today).reduce((sum, session) => sum + session.seconds, 0), weekSeconds: progress.studySessions.filter(session => session.date >= firstDay && session.date <= today).reduce((sum, session) => sum + session.seconds, 0), activeDays: activeDates.size, streak, completedLessons: Object.keys(progress.completed).length, completedProjects: progress.projects.filter(project => project.status === 'completed').length };
}

export function saveProject(progress: LearningProgress, input: ProjectInput, date = new Date().toISOString()) {
  const title = input.title.trim().slice(0, 120), url = input.url.trim();
  if (!title) throw new Error('Введи название проекта');
  if (url && !/^https?:\/\/[^\s]+$/i.test(url)) throw new Error('Ссылка должна начинаться с https:// или http://');
  const existing = input.id ? progress.projects.find(project => project.id === input.id) : undefined;
  if (!existing && progress.projects.length >= 500) throw new Error('Достигнут лимит: 500 проектов');
  const project: PersonalProject = { id: existing?.id || crypto.randomUUID(), title, description: input.description.trim().slice(0, 4_000), language: input.language.trim().slice(0, 60), courseId: input.courseId || null, status: input.status === 'active' || input.status === 'completed' ? input.status : 'planned', url: url.slice(0, 2_000), createdAt: existing?.createdAt || date, updatedAt: date };
  return { ...progress, projects: existing ? progress.projects.map(item => item.id === existing.id ? project : item) : [...progress.projects, project] };
}

export function removeProject(progress: LearningProgress, id: string) {
  return { ...progress, projects: progress.projects.filter(project => project.id !== id), deletedProjects: { ...progress.deletedProjects, [id]: new Date().toISOString() } };
}

export function formatStudyTime(seconds: number, language: 'ru' | 'en' = 'ru') {
  if (seconds < 60) return language === 'ru' ? `${Math.floor(seconds)} сек` : `${Math.floor(seconds)} sec`;
  const minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60);
  return hours ? language === 'ru' ? `${hours} ч ${minutes % 60} мин` : `${hours}h ${minutes % 60}m` : language === 'ru' ? `${minutes} мин` : `${minutes} min`;
}
