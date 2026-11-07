import type { LearningProgress } from './progress';

type ResumeCourse = { id: string; lessons: string[] };
type ResumeLesson = { id: string; course: string };

/** A saved stage or completed lesson is activity even when an older save has no visit. */
export function hasCourseActivity(progress: LearningProgress, course: ResumeCourse) {
  return Boolean(progress.originalCompleted[course.id]) || course.lessons.some(id => {
    const state = progress.lessonStates[id];
    return Boolean(progress.visited[id] || progress.completed[id] || state?.videoUpdatedAt || state?.videoCompletedAt || state?.notesCompletedAt || state?.quiz);
  }) || progress.studySessions.some(session => session.courseId === course.id && session.seconds > 0);
}

function lastCourseActivity(progress: LearningProgress, course: ResumeCourse) {
  const timestamp = (date: string | undefined) => date ? Date.parse(date) || 0 : 0;
  let latest = timestamp(progress.originalCompleted[course.id]);
  for (const id of course.lessons) {
    const state = progress.lessonStates[id];
    latest = Math.max(latest, ...[
      progress.visited[id], progress.completed[id], state?.videoUpdatedAt,
      state?.videoCompletedAt, state?.notesCompletedAt, state?.quiz?.submittedAt,
    ].map(timestamp));
  }
  for (const session of progress.studySessions) {
    if (session.courseId === course.id && session.seconds > 0) latest = Math.max(latest, timestamp(session.date));
  }
  return latest;
}

/** Prefer unfinished work; completed lessons are offered only as an explicit review. */
export function nextLearningLesson<T extends ResumeLesson>(lessons: T[], courses: ResumeCourse[], progress: LearningProgress, readyIds: ReadonlySet<string>) {
  const byId = new Map(lessons.map(lesson => [lesson.id, lesson]));
  const last = progress.lastLesson ? byId.get(progress.lastLesson) : undefined;
  const unfinished = (lesson: T | undefined) => Boolean(lesson && !progress.completed[lesson.id]);
  if (last && unfinished(last)) return { lesson: last, mode: 'resume' as const };

  if (last) {
    const course = courses.find(course => course.id === last.course);
    if (course) {
      const index = course.lessons.indexOf(last.id);
      const orderedIds = [...course.lessons.slice(index + 1), ...course.lessons.slice(0, index)];
      const next = orderedIds.map(id => byId.get(id)).find(unfinished);
      if (next) return { lesson: next, mode: 'resume' as const };
    }
  }

  const activeCourses = courses.filter(course => hasCourseActivity(progress, course))
    .map(course => ({ course, latest: lastCourseActivity(progress, course) }))
    .sort((a, b) => b.latest - a.latest)
    .map(({ course }) => course);
  const activeLesson = activeCourses.flatMap(course => course.lessons.map(id => byId.get(id))).find(unfinished);
  if (activeLesson) return { lesson: activeLesson, mode: 'resume' as const };

  const next = lessons.find(lesson => unfinished(lesson) && readyIds.has(lesson.id)) || lessons.find(unfinished);
  if (next) return { lesson: next, mode: 'start' as const };
  const review = last || lessons[0];
  return { lesson: review, mode: review ? 'review' as const : 'empty' as const };
}
