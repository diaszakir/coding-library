'use client';

import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import styles from './page.module.css';

const prompt = `Помоги создать мой курс в DevLibrary.

Прочитай страницу /agents этого сайта или AGENTS.md и docs/ai-course-rules.md в проекте. Работай только в моей собственной копии библиотеки.

Курс: [название].
Мой уровень: [что уже знаю].
Результат: [что хочу уметь].
Первый урок: [одна конкретная тема].
Источники: [ссылки или доступные материалы].
Язык конспектов: [русский / английский / оба].

Предложи последовательную программу и подготовь один полный урок: цель, объяснение, рабочий пример с ожидаемым результатом, типичная ошибка, упражнение и самопроверка. Укажи реальные источники и происхождение текста. Видео добавляй только по проверенной ссылке. Если источник недоступен, честно сообщи об этом. Для теории можно подготовить 5–8 вопросов с ответами и объяснениями.

Если у тебя есть доступ к моему приложению, создай курс и тему через редактор или существующий API моей копии сайта. Если доступа нет, выдай Markdown, который я вставлю через «Добавить курс → Написать на сайте».

Сохрани ID, оригиналы, прогресс и резервные копии существующих материалов. Не переписывай library.json или progress.json вручную. Не отмечай за меня видео, уроки и проекты пройденными и не добавляй выдуманные часы или XP. Видео и тесты подключай к реальным ID уроков через принятый в проекте механизм; шаблон JSON сам по себе не импортируется.

В конце сообщи, что добавлено, что проверено и каких материалов пока не хватает.`;

export function AgentPrompt() {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setStatus('Запрос скопирован.');
    } catch {
      textarea.current?.focus();
      textarea.current?.select();
      setCopied(false);
      setStatus('Текст выделен. Скопируй его через меню браузера или Ctrl+C.');
    }
  }

  return <div className={styles.prompt}>
    <div className={styles.promptBar}><label htmlFor="course-agent-prompt">Твой запрос</label><button type="button" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Скопировано' : 'Скопировать'}</button></div>
    <textarea id="course-agent-prompt" ref={textarea} readOnly value={prompt} rows={15} spellCheck={false} />
    <p role="status" className={styles.copyStatus}>{status || 'Текст можно выделить и скопировать вручную.'}</p>
  </div>;
}
