import type { LearningProgress } from './progress';
import type { Technology, Roadmap } from '../data/roadmaps';

type CourseProgress = { id: string; lessons: string[] };
export function isCourseStudied(course: CourseProgress, progress: LearningProgress) {
  return Boolean(progress.originalCompleted[course.id]) || (course.lessons.length > 0 && course.lessons.every(id => Boolean(progress.completed[id])));
}
export function technologyState(technology: Technology, progress: LearningProgress, courses: CourseProgress[]) {
  const automatic = technology.completionCourses.some(id => {
    const course = courses.find(item => item.id === id);
    return course ? isCourseStudied(course, progress) : false;
  });
  const manual = progress.technologies[technology.id];
  const studied = manual ?? automatic;
  const started = technology.resources.some(resource => {
    const ids = resource.lessonId ? [resource.lessonId] : courses.find(course => course.id === resource.courseId)?.lessons || [];
    return ids.some(id => progress.visited[id] || progress.completed[id]) || Boolean(progress.originalCompleted[resource.courseId]);
  });
  return { studied, automatic, manual, started: started && !studied };
}
export function roadmapProgress(roadmap: Roadmap, technologies: Technology[], progress: LearningProgress, courses: CourseProgress[]) {
  const ids = [...new Set(roadmap.stages.flatMap(stage => stage.technologies))];
  const items = ids.map(id => technologies.find(technology => technology.id === id)).filter((technology): technology is Technology => Boolean(technology));
  const studied = items.filter(technology => technologyState(technology, progress, courses).studied).length;
  const available = items.filter(technology => technology.resources.some(resource => {
    const course = courses.find(course => course.id === resource.courseId);
    return Boolean(course && (!resource.lessonId || course.lessons.includes(resource.lessonId)));
  })).length;
  return { total: items.length, studied, available, upcoming: items.length - available, percent: items.length ? Math.round(studied / items.length * 100) : 0 };
}
