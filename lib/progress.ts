export const STORAGE_KEY = 'devlibrary.progress.v1';
export type QuizResult = { answers: number[]; correct: number; total: number; passed: boolean; passPercent: number; attempts: number; submittedAt: string; language?: 'ru' | 'en' };
export type LessonState = { videoCompletedAt?: string; videoUpdatedAt?: string; notesCompletedAt?: string; quiz?: QuizResult };
export type StudySession = { id: string; lessonId: string; courseId: string; language: string; seconds: number; date: string; counters?: Record<string, number>; legacySeconds?: number };
export type PersonalProject = { id: string; title: string; description: string; language: string; courseId: string | null; status: 'planned' | 'active' | 'completed'; url: string; createdAt: string; updatedAt: string };
export type LearningProgress = {
  version: 1;
  learningSchema: 1;
  legacyCompleted: Record<string, string>;
  lessonStates: Record<string, LessonState>;
  studySessions: StudySession[];
  projects: PersonalProject[];
  deletedProjects: Record<string, string>;
  completed: Record<string, string>;
  originalCompleted: Record<string, string>;
  technologies: Record<string, boolean>;
  visited: Record<string, string>;
  positions: Record<string, number>;
  lastLesson: string | null;
  language: 'ru' | 'en';
};
export function emptyProgress(): LearningProgress {
  return { version: 1, learningSchema: 1, legacyCompleted: {}, lessonStates: {}, studySessions: [], projects: [], deletedProjects: {}, completed: {}, originalCompleted: {}, technologies: {}, visited: {}, positions: {}, lastLesson: null, language: 'ru' };
}
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const validDate = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
const boundedText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const safeId = (id: string) => id !== '__proto__' && id !== 'constructor' && id !== 'prototype';
export function lessonRequirementsMet(state: LessonState | undefined) {
  return Boolean(state?.videoCompletedAt && state?.notesCompletedAt);
}
export function parseProgress(raw: string | null, lessonIds: string[], courseIds: string[] = [], technologyIds: string[] = []): LearningProgress {
  if (!raw) return emptyProgress();
  const data = JSON.parse(raw);
  if (!data || data.version !== 1 || typeof data !== 'object') throw new Error('Неподдерживаемый формат прогресса');
  const valid = new Set(lessonIds.filter(safeId));
  const result = emptyProgress();
  const validTechnologies = new Set(technologyIds.filter(safeId));
  if (data.technologies && typeof data.technologies === 'object' && !Array.isArray(data.technologies)) {
    for (const [id, studied] of Object.entries(data.technologies)) {
      if (validTechnologies.has(id) && typeof studied === 'boolean') result.technologies[id] = studied;
    }
  }
  const validCourses = new Set(courseIds.filter(safeId));
  if (data.originalCompleted && typeof data.originalCompleted === 'object' && !Array.isArray(data.originalCompleted)) {
    for (const [id, date] of Object.entries(data.originalCompleted)) {
      if (validCourses.has(id) && typeof date === 'string' && Number.isFinite(Date.parse(date))) result.originalCompleted[id] = date;
    }
  }
  for (const field of ['completed', 'visited'] as const) {
    if (!data[field] || typeof data[field] !== 'object' || Array.isArray(data[field])) continue;
    for (const [id, date] of Object.entries(data[field])) {
      if (valid.has(id) && typeof date === 'string' && Number.isFinite(Date.parse(date))) result[field][id] = date;
    }
  }
  // Existing completion dates are historical facts, not newly earned gated completions.
  const legacy = data.learningSchema === 1 ? data.legacyCompleted : result.completed;
  if (record(legacy)) for (const [id, date] of Object.entries(legacy)) {
    if (valid.has(id) && validDate(date)) result.legacyCompleted[id] = date;
  }
  if (record(data.lessonStates)) for (const [id, value] of Object.entries(data.lessonStates)) {
    if (!valid.has(id) || !record(value)) continue;
    const state: LessonState = {};
    if (validDate(value.videoCompletedAt)) state.videoCompletedAt = value.videoCompletedAt;
    if (validDate(value.videoUpdatedAt)) state.videoUpdatedAt = value.videoUpdatedAt;
    if (validDate(value.notesCompletedAt)) state.notesCompletedAt = value.notesCompletedAt;
    const quiz = value.quiz;
    if (record(quiz) && Array.isArray(quiz.answers) && quiz.answers.length > 0 && quiz.answers.length <= 100 && quiz.answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer < 100) && Number.isInteger(quiz.correct) && Number.isInteger(quiz.total) && quiz.total === quiz.answers.length && (quiz.correct as number) >= 0 && (quiz.correct as number) <= (quiz.total as number) && validDate(quiz.submittedAt)) {
      const passPercent = typeof quiz.passPercent === 'number' && Number.isFinite(quiz.passPercent) ? Math.max(1, Math.min(100, quiz.passPercent)) : 80;
      state.quiz = { answers: quiz.answers, correct: quiz.correct as number, total: quiz.total as number, passed: (quiz.correct as number) / (quiz.total as number) * 100 >= passPercent, passPercent, attempts: typeof quiz.attempts === 'number' && Number.isFinite(quiz.attempts) ? Math.max(1, Math.min(1_000_000, Math.floor(quiz.attempts))) : 1, submittedAt: quiz.submittedAt };
      if (quiz.language === 'ru' || quiz.language === 'en') state.quiz.language = quiz.language;
    }
    result.lessonStates[id] = state;
  }
  for (const id of Object.keys(result.completed)) {
    if (!result.legacyCompleted[id] && !lessonRequirementsMet(result.lessonStates[id])) delete result.completed[id];
  }
  for (const [id, date] of Object.entries(result.legacyCompleted)) result.completed[id] = date;
  for (const [id, state] of Object.entries(result.lessonStates)) {
    if (lessonRequirementsMet(state) && !result.completed[id]) result.completed[id] = [state.videoCompletedAt!, state.notesCompletedAt!].sort().at(-1)!;
  }
  if (Array.isArray(data.studySessions)) {
    const sessions = new Map<string, StudySession>();
    for (const value of data.studySessions.slice(-20_000)) {
      if (!record(value) || typeof value.lessonId !== 'string' || !valid.has(value.lessonId) || typeof value.courseId !== 'string' || !validCourses.has(value.courseId) || typeof value.seconds !== 'number' || !Number.isFinite(value.seconds) || value.seconds <= 0 || typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !validDate(value.date) || new Date(value.date).toISOString().slice(0, 10) !== value.date) continue;
      const language = boundedText(value.language, 60);
      if (!language || !safeId(language)) continue;
      const id = `${value.date}:${value.lessonId}:${language}`;
      const previous = sessions.get(id);
      const session: StudySession = { id, lessonId: value.lessonId, courseId: value.courseId, language, seconds: Math.min(86_400, Math.floor(value.seconds)), date: value.date };
      if (record(value.counters)) {
        session.counters = {};
        for (const [writer, amount] of Object.entries(value.counters).slice(0, 1_000)) if (/^[a-zA-Z0-9-]{1,100}$/.test(writer) && safeId(writer) && typeof amount === 'number' && Number.isFinite(amount) && amount >= 0) session.counters[writer] = Math.min(86_400, Math.floor(amount));
        session.legacySeconds = typeof value.legacySeconds === 'number' && Number.isFinite(value.legacySeconds) ? Math.max(0, Math.min(86_400, Math.floor(value.legacySeconds))) : 0;
        session.seconds = Math.min(86_400, session.legacySeconds + Object.values(session.counters).reduce((sum, amount) => sum + amount, 0));
      }
      sessions.set(id, previous ? mergeStudySession(previous, session) : session);
    }
    result.studySessions = [...sessions.values()];
  }
  if (Array.isArray(data.projects)) {
    const ids = new Set<string>();
    for (const value of data.projects.slice(0, 500)) {
      if (!record(value)) continue;
      const id = boundedText(value.id, 100), title = boundedText(value.title, 120);
      if (!id || !safeId(id) || ids.has(id) || !title || !validDate(value.createdAt) || !validDate(value.updatedAt)) continue;
      ids.add(id);
      const url = boundedText(value.url, 2_000);
      result.projects.push({ id, title, description: boundedText(value.description, 4_000), language: boundedText(value.language, 60), courseId: typeof value.courseId === 'string' && validCourses.has(value.courseId) ? value.courseId : null, status: value.status === 'completed' || value.status === 'active' ? value.status : 'planned', url: /^https?:\/\/[^\s]+$/i.test(url) ? url : '', createdAt: value.createdAt, updatedAt: value.updatedAt });
    }
  }
  if (record(data.deletedProjects)) for (const [id, date] of Object.entries(data.deletedProjects)) if (safeId(id) && id.length <= 100 && validDate(date)) result.deletedProjects[id] = date;
  result.projects = result.projects.filter(project => !result.deletedProjects[project.id]);
  if (data.positions && typeof data.positions === 'object') {
    for (const [key, position] of Object.entries(data.positions)) {
      const id = key.slice(0, -3);
      if (valid.has(id) && /:(ru|en)$/.test(key) && typeof position === 'number' && Number.isFinite(position) && position >= 0) result.positions[key] = Math.min(position, 10_000_000);
    }
  }
  result.lastLesson = valid.has(data.lastLesson) ? data.lastLesson : null;
  result.language = data.language === 'en' ? 'en' : 'ru';
  return result;
}
export function finishLesson(progress: LearningProgress, id: string, date = new Date().toISOString()): LearningProgress {
  if (progress.completed[id] || !lessonRequirementsMet(progress.lessonStates[id])) return progress;
  return { ...progress, completed: { ...progress.completed, [id]: date } };
}
export function setOriginalCourseCompleted(progress: LearningProgress, id: string, completed: boolean, date = new Date().toISOString()): LearningProgress {
  if (Boolean(progress.originalCompleted[id]) === completed) return progress;
  const originalCompleted = { ...progress.originalCompleted };
  if (completed) originalCompleted[id] = date;
  else delete originalCompleted[id];
  return { ...progress, originalCompleted };
}
export function experience(progress: LearningProgress, lessons: { id: string; xp: number }[]) {
  const xp = lessons.reduce((sum, l) => sum + (progress.completed[l.id] ? l.xp : 0), 0);
  return { xp, level: Math.floor(xp / 300) + 1, inLevel: xp % 300, next: 300 - xp % 300 };
}
export function setTechnologyStudied(progress: LearningProgress, id: string, studied: boolean): LearningProgress {
  return { ...progress, technologies: { ...progress.technologies, [id]: studied } };
}
export function resetTechnologyStatus(progress: LearningProgress, id: string): LearningProgress {
  const technologies = { ...progress.technologies };
  delete technologies[id];
  return { ...progress, technologies };
}

export function mergeStudySession(left: StudySession, right: StudySession): StudySession {
  if (!left.counters && !right.counters) return left.seconds >= right.seconds ? left : right;
  const counters = { ...left.counters };
  for (const [writer, amount] of Object.entries(right.counters || {})) counters[writer] = Math.max(counters[writer] || 0, amount);
  const legacySeconds = Math.max(left.counters ? left.legacySeconds || 0 : left.seconds, right.counters ? right.legacySeconds || 0 : right.seconds);
  return { ...left, counters, legacySeconds, seconds: Math.min(86_400, legacySeconds + Object.values(counters).reduce((sum, amount) => sum + amount, 0)) };
}

/** Merge independent tabs without replaying timer increments or resurrecting deleted projects. */
export function mergeProgress(disk: LearningProgress, incoming: LearningProgress, base = emptyProgress()): LearningProgress {
  function changedMap<T>(current: Record<string, T>, next: Record<string, T>, previous: Record<string, T>) {
    const merged = { ...current };
    for (const key of new Set([...Object.keys(next), ...Object.keys(previous)])) {
      if (JSON.stringify(next[key]) === JSON.stringify(previous[key])) continue;
      if (Object.hasOwn(next, key)) merged[key] = next[key]; else delete merged[key];
    }
    return merged;
  }
  const result: LearningProgress = { ...disk,
    originalCompleted: changedMap(disk.originalCompleted, incoming.originalCompleted, base.originalCompleted),
    technologies: changedMap(disk.technologies, incoming.technologies, base.technologies),
    positions: changedMap(disk.positions, incoming.positions, base.positions),
    visited: { ...disk.visited }, lessonStates: { ...disk.lessonStates }, completed: { ...disk.completed },
    lastLesson: incoming.lastLesson !== base.lastLesson ? incoming.lastLesson : disk.lastLesson,
    language: incoming.language !== base.language ? incoming.language : disk.language,
    deletedProjects: { ...disk.deletedProjects },
  };
  for (const [id, date] of Object.entries(incoming.visited)) if (!result.visited[id] || result.visited[id] < date) result.visited[id] = date;
  for (const [id, next] of Object.entries(incoming.lessonStates)) {
    const old = disk.lessonStates[id] || {};
    let quiz = old.quiz;
    if (next.quiz) {
      const best = !quiz || Number(next.quiz.passed) > Number(quiz.passed) || next.quiz.correct / next.quiz.total >= quiz.correct / quiz.total ? next.quiz : quiz;
      quiz = { ...best, attempts: Math.max(quiz?.attempts || 0, next.quiz.attempts) };
    }
    // Timestamped manual checkboxes preserve an explicit uncheck across retries
    // and stale tabs, while older records remain compatible without a migration.
    const oldVideoTime = Date.parse(old.videoUpdatedAt || old.videoCompletedAt || '') || 0;
    const nextVideoTime = Date.parse(next.videoUpdatedAt || next.videoCompletedAt || '') || 0;
    const video = nextVideoTime > oldVideoTime || nextVideoTime === oldVideoTime && !next.videoCompletedAt ? next : old;
    result.lessonStates[id] = { ...old, ...next, videoCompletedAt: video.videoCompletedAt, videoUpdatedAt: video.videoUpdatedAt, notesCompletedAt: old.notesCompletedAt || next.notesCompletedAt, ...(quiz ? { quiz } : {}) };
    if (lessonRequirementsMet(result.lessonStates[id]) && !result.completed[id]) result.completed[id] = incoming.completed[id] || new Date().toISOString();
    if (!lessonRequirementsMet(result.lessonStates[id]) && !result.legacyCompleted[id]) delete result.completed[id];
  }
  const sessions = new Map(disk.studySessions.map(session => [session.id, session]));
  for (const session of incoming.studySessions) sessions.set(session.id, sessions.has(session.id) ? mergeStudySession(sessions.get(session.id)!, session) : session);
  result.studySessions = [...sessions.values()];
  for (const [id, date] of Object.entries(incoming.deletedProjects)) if (!result.deletedProjects[id] || result.deletedProjects[id] < date) result.deletedProjects[id] = date;
  const projects = new Map(disk.projects.map(project => [project.id, project]));
  for (const project of incoming.projects) if (!projects.has(project.id) || projects.get(project.id)!.updatedAt <= project.updatedAt) projects.set(project.id, project);
  result.projects = [...projects.values()].filter(project => !result.deletedProjects[project.id]);
  return result;
}
