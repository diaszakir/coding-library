import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Bot, Check, FileCode2, Layers, ShieldCheck } from 'lucide-react';
import { AgentPrompt } from './prompt';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Инструкция для ИИ-агентов — DevLibrary',
  description: 'Как подготовить свой курс с помощью ИИ, добавить конспекты и сохранить существующие учебные данные.',
};

const courseTree = `Мой курс/
  Notes/
    01-Введение/
      README.ru.md
      README.en.md
    02-Практика/
      README.ru.md`;

const createExample = `// Выполняется в контексте своей открытой библиотеки.
async function library(input) {
  const response = await fetch('/api/library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

const course = await library({
  action: 'create',
  title: 'Основы TypeScript',
  category: 'frontend-mobile',
  difficulty: 'beginner',
  note: {
    title: 'Типы и переменные',
    language: 'ru',
    text: '# Типы и переменные\\n\\nЦель: объявить переменную с явным типом.',
  },
});

const lesson = await library({
  action: 'add-note',
  id: course.id,
  note: {
    title: 'Функции',
    language: 'ru',
    text: '# Функции\\n\\nЦель: описать типы параметров и результата.',
  },
});
// lesson.lessonId — реальный ID созданного урока.
// Тексты выше — пример вызова API, их нужно дополнить до полного урока.`;

export default function AgentsPage() {
  return <main className={styles.page}>
    <Link href="/" className={styles.back}><ArrowLeft size={16} />В библиотеку</Link>
    <header className={styles.hero}>
      <div className={styles.heroIcon}><Bot size={30} aria-hidden="true" /></div>
      <p className={styles.eyebrow}>DEVLIBRARY · ПОМОЩЬ С КУРСАМИ</p>
      <h1>Создай свой курс<br /><span>вместе с ИИ</span></h1>
      <p className={styles.lead}>Передай агенту эту страницу, тему и источники. Он подготовит материалы, а ты сможешь добавить их в свою библиотеку и учиться в удобном темпе.</p>
      <div className={styles.actions}>
        <Link href="/?view=manage" className={styles.primary}>Открыть управление курсами<ArrowRight size={17} /></Link>
        <a href="/llms.txt" className={styles.secondary}><FileCode2 size={17} />Инструкция в текстовом виде</a>
      </div>
    </header>

    <section className={styles.section} aria-labelledby="getting-started">
      <div className={styles.sectionTitle}><Layers size={21} /><h2 id="getting-started">От идеи до первого урока</h2></div>
      <ol className={styles.steps}>
        <li><span>01</span><div><h3>Определи результат</h3><p>Напиши, что хочешь уметь, с какого уровня начинаешь и какие источники разрешаешь использовать. Начни с одного законченного урока.</p></div></li>
        <li><span>02</span><div><h3>Передай ИИ инструкцию</h3><p>Скопируй запрос ниже и замени поля в квадратных скобках. Агенту с доступом к браузеру передай адрес этой страницы; агенту с файлами проекта — <code>AGENTS.md</code>.</p></div></li>
        <li><span>03</span><div><h3>Добавь материалы</h3><p>В управлении курсами выбери «Добавить курс → Написать на сайте», укажи название и вставь конспект или выбери текстовый файл на своём устройстве. Следующие уроки добавляй кнопкой «Добавить тему».</p></div></li>
      </ol>
      <p className={styles.note}>С телефона или другого компьютера можно писать и вставлять конспекты прямо на сайте. Путь к папке при импорте относится к файловой системе сервера, а не к устройству с браузером.</p>
    </section>

    <section className={styles.section} aria-labelledby="agent-prompt">
      <div className={styles.sectionTitle}><Bot size={21} /><h2 id="agent-prompt">Готовый запрос для агента</h2></div>
      <p className={styles.intro}>Замени тему, результат и источники. Затем отправь текст своему ИИ-помощнику.</p>
      <AgentPrompt />
    </section>

    <div className={styles.columns}>
      <section className={styles.card} aria-labelledby="lesson-quality">
        <BookOpen size={24} className={styles.cardIcon} aria-hidden="true" />
        <h2 id="lesson-quality">Что должно быть в уроке</h2>
        <ul className={styles.checks}>
          <li><Check size={16} />Одна цель и необходимые предварительные знания.</li>
          <li><Check size={16} />Объяснение своими словами и рабочий пример с результатом.</li>
          <li><Check size={16} />Типичная ошибка, упражнение и критерий самопроверки.</li>
          <li><Check size={16} />Реальные источники и честное описание происхождения текста.</li>
          <li><Check size={16} />При наличии: проверенное видео и 5–8 вопросов с объяснениями.</li>
        </ul>
      </section>
      <section className={styles.card} aria-labelledby="data-safety">
        <ShieldCheck size={24} className={styles.cardIcon} aria-hidden="true" />
        <h2 id="data-safety">Правила для ИИ-агента</h2>
        <ul className={styles.checks}>
          <li><Check size={16} />Работай только в собственной копии библиотеки пользователя.</li>
          <li><Check size={16} />Сохраняй ID уроков, оригиналы, прогресс и резервные копии.</li>
          <li><Check size={16} />Используй редактор или Store; не переписывай JSON пользователя.</li>
          <li><Check size={16} />Не отмечай видео, уроки и проекты пройденными за человека.</li>
          <li><Check size={16} />Не придумывай просмотренные видео, часы, XP или источники.</li>
        </ul>
      </section>
    </div>

    <section className={styles.section} aria-labelledby="agent-technical">
      <div className={styles.sectionTitle}><FileCode2 size={21} /><h2 id="agent-technical">Для агента с доступом к проекту</h2></div>
      <details className={styles.details}>
        <summary>Структура материалов и порядок работы</summary>
        <div className={styles.detailBody}>
          <p>Сначала прочитай <code>AGENTS.md</code>, <code>docs/ai-course-rules.md</code>, схему в <code>lib/catalog.ts</code> и шаблоны в <code>templates/</code>. Перед изменением кода Next.js прочитай документацию установленной версии в <code>node_modules/next/dist/docs/</code>.</p>
          <pre tabIndex={0} aria-label="Структура папки курса"><code>{courseTree}</code></pre>
          <p>Русский и английский конспекты хранятся отдельно. Добавляй английский файл только с полноценным английским содержимым. Для оглавления, которое не является уроком, используй маркер <code>{'<!-- devlibrary:index -->'}</code>.</p>
          <p>Каждый пользователь запускает свою копию приложения со своим хранилищем. Для новой пустой библиотеки используется <code>DEVLIBRARY_SEED=empty</code>. Не переноси чужие курсы, прогресс и резервные копии в переносимую версию проекта.</p>
          <p>Импорт выполняется через интерфейс или <code>createLibraryStore(...).importCourse(...)</code> с явно выбранным <code>DEVLIBRARY_DATA_DIR</code>. Для нового курса используй <code>createCourse</code>, для темы — <code>addNote</code>. Сначала прочитай каталог и реальные ID, затем связывай дополнительные материалы.</p>
          <p>Готовая папка-заготовка находится в <code>templates/course-folder/</code>, подробное руководство — в <code>docs/custom-courses.md</code>. Курс можно создать командой из папки проекта:</p>
          <pre tabIndex={0} aria-label="Создание своего курса через командную строку"><code>{'pnpm course:create --title "Мой курс" --note ./lesson.md --language ru --data-dir ./library-data\n\n# Или импорт готовой папки:\npnpm course:create --title "Мой курс" --path ./templates/course-folder --data-dir ./library-data'}</code></pre>
          <p>Относительные пути в команде считаются от текущей рабочей папки. Если создаёшь отдельную библиотеку для проверки, сначала задай <code>DEVLIBRARY_SEED=empty</code> и используй новый <code>--data-dir</code>.</p>
          <p>Направления: <code>frontend-mobile</code>, <code>backend</code>, <code>devops</code>, <code>data-science</code>, <code>nlp</code>, <code>computer-vision</code>, <code>fundamentals</code>, <code>databases</code>, <code>tools</code>. Полный список находится в <code>lib/course-sections.mjs</code>.</p>
          <p>Видео, язык программирования и тесты подключаются к реальному ID урока в <code>data/lesson-learning.ts</code>. JSON в <code>templates/</code> — образец, а не пакет автоматического импорта. Для изменения реестра нужна пересборка приложения.</p>
        </div>
      </details>
      <details className={styles.details}>
        <summary>Работа через API открытой библиотеки</summary>
        <div className={styles.detailBody}>
          <p>Используй запросы к тому же адресу своей копии сайта. Не передавай секреты в конспекты, журналы или URL. Проверь, что открыта нужная библиотека; не используй чужое хранилище.</p>
          <pre tabIndex={0} aria-label="Пример создания курса и урока"><code>{createExample}</code></pre>
          <p><code>GET /api/library</code> возвращает каталог. <code>GET /api/library?action=note&amp;id=…&amp;language=ru</code> возвращает текст и <code>hash</code>. Сохраняй изменения POST-запросом с <code>action: &apos;save-note&apos;</code>, <code>id</code>, <code>language</code>, <code>text</code> и прочитанным <code>hash</code>. При конфликте 409 заново прочитай текст и объедини правки.</p>
          <p>Не снимай проверку происхождения запросов и ограничения доступа ради автоматизации. Импорт папок может быть ограничен режимом запуска; редактор на сайте не требует доступа к файловой системе клиента.</p>
        </div>
      </details>
      <details className={styles.details}>
        <summary>Завершение уроков и проверка результата</summary>
        <div className={styles.detailBody}>
          <p>Новое завершение требует ручной отметки просмотра назначенного видео и подтверждения чтения конспекта. Тест необязателен и не блокирует завершение; 80% — проходной результат самопроверки. Если видео отсутствует, не создавай фиктивное завершение.</p>
          <p>Опубликованные вопросы и варианты ответов сохраняют порядок: прогресс хранит позиционные индексы. Между RU и EN должны совпадать ID вопросов и правильные индексы.</p>
          <p>Проверь отображение конспекта, ссылки, код и переводы. Для изменений приложения выполни:</p>
          <pre tabIndex={0} aria-label="Команды проверки"><code>{'pnpm test\npnpm typecheck\npnpm lint\npnpm build'}</code></pre>
          <p>Используй отдельную временную папку <code>DEVLIBRARY_DATA_DIR</code> для проверок. Не записывай тестовые завершения в настоящий прогресс. В отчёте укажи добавленные материалы, источники, выполненные проверки и отсутствующие данные.</p>
        </div>
      </details>
    </section>
    <footer className={styles.footer}><span>DevLibrary · материалы остаются под твоим контролем</span><Link href="/?view=manage">Создать курс<ArrowRight size={15} /></Link></footer>
  </main>;
}
