export type Language = 'ru' | 'en';
export const translator = (language: Language) => (ru: string, en: string) => language === 'ru' ? ru : en;
export function countLabel(n: number, language: Language, kind: 'topics' | 'courses' | 'files' | 'lessons' = 'topics') {
  if (language === 'en') return `${n} ${{ topics: 'topic', courses: 'course', files: 'file', lessons: 'lesson' }[kind]}${n === 1 ? '' : 's'}`;
  const words = { topics: ['тема', 'темы', 'тем'], courses: ['курс', 'курса', 'курсов'], files: ['файл', 'файла', 'файлов'], lessons: ['урок', 'урока', 'уроков'] }[kind];
  const index = n % 100 >= 11 && n % 100 <= 14 ? 2 : n % 10 === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2;
  return `${n} ${words[index]}`;
}
export const difficultyLabel = (difficulty: string, language: Language) => ({ beginner: { ru: 'Начальный', en: 'Beginner' }, intermediate: { ru: 'Средний', en: 'Intermediate' }, advanced: { ru: 'Продвинутый', en: 'Advanced' } }[difficulty]?.[language] || difficulty);
