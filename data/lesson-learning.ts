import type { QuizQuestion } from '../lib/learning';
import pythonNotebooks from './python-notebooks.json';
import pythonBasics from './python-video-basics.json';
import pythonAdvanced from './python-video-advanced.json';
import goFoundations from './go-foundations.json';
import goProjects from './go-projects.json';

/** Authored material only. Video and notes are required; the theory quiz is optional. */
export type LessonLearning = {
  programmingLanguage: string;
  video?: { url: string; title: string; provider: 'external' | 'html5' };
  quiz?: { ru: QuizQuestion[]; en: QuizQuestion[] };
  sourceNote?: { ru: string; en: string };
};

export const lessonLearning: Record<string, LessonLearning> = { ...pythonNotebooks, ...pythonBasics, ...pythonAdvanced, ...goFoundations, ...goProjects } as Record<string, LessonLearning>;

export function getLessonLearning(lessonId: string): LessonLearning | undefined {
  return lessonLearning[lessonId];
}

export function courseProgrammingLanguage(course: { title: string; tags: string[] }): string {
  const text = `${course.title} ${course.tags.join(' ')}`;
  const languages: [RegExp, string][] = [
    [/\bpython\b|питон/i, 'Python'], [/\bgolang\b|\bgo\b|\bfyne\b/i, 'Go'],
    [/\btypescript\b/i, 'TypeScript'], [/\bjavascript\b|\breact\b|\bvue\b|\bnode\.?js\b/i, 'JavaScript'],
    [/\bkotlin\b/i, 'Kotlin'], [/\bswift\b/i, 'Swift'], [/\bdart\b|\bflutter\b/i, 'Dart'],
    [/\bjava\b|\bspring\b/i, 'Java'], [/\brust\b/i, 'Rust'], [/\bc\+\+/i, 'C++'],
    [/\bc#|\b\.net\b/i, 'C#'], [/\bsql\b|\bpostgres/i, 'SQL'],
  ];
  return languages.find(([pattern]) => pattern.test(text))?.[1] || 'Other';
}
