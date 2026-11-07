// Stable section IDs are shared by the catalog, editor and AI authoring templates.
export const courseSections = [
  { id: 'all', titles: { ru: 'Все направления', en: 'All tracks' } },
  { id: 'frontend-mobile', titles: { ru: 'Frontend / Mobile', en: 'Frontend / Mobile' } },
  { id: 'backend', titles: { ru: 'Backend', en: 'Backend' } },
  { id: 'devops', titles: { ru: 'DevOps', en: 'DevOps' } },
  { id: 'data-science', titles: { ru: 'Data Science', en: 'Data Science' } },
  { id: 'nlp', titles: { ru: 'NLP', en: 'NLP' } },
  { id: 'computer-vision', titles: { ru: 'Computer Vision', en: 'Computer Vision' } },
  { id: 'fundamentals', titles: { ru: 'Основы и алгоритмы', en: 'Fundamentals' } },
  { id: 'databases', titles: { ru: 'Базы данных', en: 'Databases' } },
  { id: 'tools', titles: { ru: 'Инструменты и AI', en: 'Tools & AI' } },
];

export function courseSection(course) {
  if (['frontend-mobile','backend','devops','data-science','nlp','computer-vision','fundamentals','databases'].includes(course.category)) return course.category;
  const text = `${course.id} ${course.title} ${(course.tags || []).join(' ')}`.toLowerCase();
  if (/\b(docker|kubernetes|terraform|ansible|git|linux|devops)\b/.test(text)) return 'devops';
  if (/\b(fyne|react|vue|angular|flutter|swift|android|frontend|mobile)\b/.test(text)) return 'frontend-mobile';
  if (/\b(nlp|linguistics|transformers)\b/.test(text)) return 'nlp';
  if (/computer vision|opencv|image recognition/.test(text)) return 'computer-vision';
  if (/data science|pandas|numpy|machine learning/.test(text)) return 'data-science';
  if (/\b(spring|gin|backend|microservices|testing|networking)\b/.test(text)) return 'backend';
  if (course.category === 'languages') return 'fundamentals';
  if (course.category === 'frameworks' || course.category === 'networking') return 'backend';
  return course.category || 'tools';
}

export function normalizeSections(data) {
  const legacy = new Set(['languages', 'frameworks', 'networking']);
  const known = new Set(courseSections.map(section => section.id));
  return { ...data, sectionsVersion: 1, categories: [...courseSections, ...data.categories.filter(section => !known.has(section.id) && !legacy.has(section.id))], courses: data.courses.map(course => ({ ...course, category: data.sectionsVersion === 1 ? course.category : courseSection(course) })) };
}
