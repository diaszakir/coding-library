import type { CSSProperties } from 'react';
import type { Course } from '@/lib/catalog';
import { difficultyLabel, type Language } from '@/lib/i18n';

export function CourseMark({ course }: { course: Course }) {
  return <span className="tech-mark" style={{ '--course-color': course.color } as CSSProperties}>{course.mark}</span>;
}
export function Difficulty({ value, language }: { value: string; language: Language }) {
  const n = value === 'beginner' ? 1 : value === 'intermediate' ? 2 : 3;
  return <span className={`difficulty difficulty-${n}`}><span className="difficulty-bars" aria-hidden="true">{[1, 2, 3].map(i => <i key={i} className={i <= n ? 'filled' : ''} />)}</span>{difficultyLabel(value, language)}</span>;
}
