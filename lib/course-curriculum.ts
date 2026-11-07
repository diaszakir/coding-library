type Curriculum = { courses: { id: string; lessons: string[] }[]; lessons: { id: string; source: string }[] };

/** Present authored courses in learning order without moving files or IDs. */
export function orderCourseCurriculum<T extends Curriculum>(catalog: T): T {
  const sources = new Map(catalog.lessons.map(lesson => [lesson.id, lesson.source]));
  const rank = (id: string, course: string) => {
    const source = sources.get(id) || '';
    if (course === 'go') {
      if (source === 'Go') return 0;
      if (/^Go\/(?:[1-9]|10|11)\./.test(source)) return 1;
      if (source === 'Go/YouTube - Backend Technologies') return 2;
      if (source === 'Go/examples') return 3;
      if (source === 'Go/12. Course Roundup') return 5;
      if (source === 'Go/SOURCES') return 6;
      return 4;
    }
    if (source === 'Python') return 0;
    if (source.startsWith('Python/Video/')) return 1;
    if (source.startsWith('Python/Notebooks/')) return 2;
    if (source === 'Python/SOURCES') return 4;
    return 3;
  };
  return { ...catalog, courses: catalog.courses.map(course => ['python', 'go'].includes(course.id) ? { ...course, lessons: [...course.lessons].sort((a, b) => rank(a, course.id) - rank(b, course.id) || (sources.get(a) || '').localeCompare(sources.get(b) || '', 'en', { numeric: true })) } : course) };
}
