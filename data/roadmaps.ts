export type Localized = { ru: string; en: string };
export type StudyResource = { courseId: string; lessonId?: string };
export type Technology = {
  id: string;
  title: string;
  description: Localized;
  resources: StudyResource[];
  completionCourses: string[];
};
export type Roadmap = {
  id: string;
  group: 'backend' | 'fullstack' | 'frontend' | 'mobile' | 'ai' | 'devops';
  title: string;
  description: Localized;
  outcome: Localized;
  stages: { title: Localized; technologies: string[] }[];
  sources: { title: string; url: string }[];
};
const text = (ru: string, en: string): Localized => ({ ru, en });
const course = (courseId: string): StudyResource => ({ courseId });
const topic = (courseId: string, lessonId: string): StudyResource => ({ courseId, lessonId });
const tech = (id: string, title: string, ru: string, en: string, resources: StudyResource[] = [], completionCourses: string[] = []): Technology => ({ id, title, description: text(ru, en), resources, completionCourses });

// Explicit mappings: a mention in a course tag never awards a technology.
// Topic excerpts are useful resources, but require a learner's own completion mark.
export const technologies: Technology[] = [
  tech('git', 'Git & GitHub', 'Коммиты, ветки, pull request и совместная работа.', 'Commits, branches, pull requests and collaboration.', [course('git')], ['git']),
  tech('linux', 'Linux & Bash', 'Файлы, права, процессы, SSH и скрипты оболочки.', 'Files, permissions, processes, SSH and shell scripts.'),
  tech('networking', 'HTTPS & Networking', 'DNS, TCP/IP, HTTPS и путь запроса от клиента к серверу.', 'DNS, TCP/IP, HTTPS and the path from client to server.', [course('networking')], ['networking']),
  tech('python', 'Python', 'Синтаксис, коллекции, функции, ООП и автоматизация.', 'Syntax, collections, functions, OOP and automation.', [course('python')], ['python']),
  tech('java', 'Java', 'Типы, ООП, коллекции, исключения и многопоточность.', 'Types, OOP, collections, exceptions and threads.', [course('java')], ['java']),
  tech('go', 'Go', 'Пакеты, интерфейсы, ошибки и конкурентность.', 'Packages, interfaces, errors and concurrency.', [course('go')], ['go']),
  tech('algorithms', 'Algorithms & Data Structures', 'Структуры данных, сложность и выбор алгоритмов.', 'Data structures, complexity and algorithm selection.', [course('algorithms')], ['algorithms']),
  tech('html-css', 'HTML & CSS', 'Семантическая разметка, адаптивная вёрстка и доступность.', 'Semantic markup, responsive layouts and accessibility.'),
  tech('javascript', 'JavaScript', 'DOM, события, модули, promises и запросы к API.', 'DOM, events, modules, promises and API requests.'),
  tech('react', 'React', 'Компоненты, состояние, формы и работа с сервером.', 'Components, state, forms and server integration.'),
  tech('django', 'Django', 'Модели, ORM, маршруты, шаблоны и аутентификация.', 'Models, ORM, routes, templates and authentication.'),
  tech('postgresql', 'SQL & PostgreSQL', 'Связи, JOIN, индексы, транзакции и миграции.', 'Relations, JOINs, indexes, transactions and migrations.'),
  tech('redis', 'Redis', 'Кеширование, время жизни данных и инвалидация.', 'Caching, expiry and invalidation.'),
  tech('mongodb', 'MongoDB', 'Документы, запросы, индексы и агрегации.', 'Documents, queries, indexes and aggregation.', [course('mongodb')], ['mongodb']),
  tech('spring-boot', 'Spring Boot', 'REST-приложения, внедрение зависимостей, JPA и безопасность.', 'REST applications, dependency injection, JPA and security.', [course('spring-basics')], ['spring-basics']),
  tech('spring-cloud', 'Spring Cloud', 'Конфигурация и взаимодействие распределённых сервисов.', 'Configuration and communication across distributed services.', [course('spring-microservices')], ['spring-microservices']),
  tech('java-build', 'Maven & Gradle', 'Зависимости, сборка и жизненный цикл Java-проекта.', 'Dependencies, builds and the Java project lifecycle.', [topic('spring-microservices', 'build-tools-061d5c5dcb9f'), topic('spring-microservices', 'build-tools-8d9b192237bb')]),
  tech('java-testing', 'JUnit & Mockito', 'Модульные тесты, проверки поведения и моки.', 'Unit tests, behavior assertions and mocks.', [course('java-testing'), topic('spring-microservices', 'testing-2eda9c08293d'), topic('spring-microservices', 'testing-65ca6b7c2f12')], ['java-testing']),
  tech('python-testing', 'pytest', 'Тесты, фикстуры и проверка API на Python.', 'Tests, fixtures and Python API checks.'),
  tech('go-testing', 'Go Testing', 'Табличные тесты, тестирование HTTP и детектор гонок.', 'Table-driven tests, HTTP testing and the race detector.'),
  tech('rest-api', 'REST API', 'Маршруты, ошибки, валидация, пагинация и контракты.', 'Routes, errors, validation, pagination and contracts.', [course('go-backend')]),
  tech('security', 'Web Security', 'Аутентификация, права доступа, секреты и защита входных данных.', 'Authentication, authorization, secrets and input protection.'),
  tech('gin', 'Gin', 'HTTP-сервисы на Go, middleware и обработка запросов.', 'Go HTTP services, middleware and request handling.', [course('gin')], ['gin']),
  tech('grpc', 'gRPC', 'Контракты protobuf и взаимодействие между сервисами.', 'Protobuf contracts and service-to-service communication.', [topic('go-microservices', 'grpc-145e5604d4d8')]),
  tech('docker', 'Docker', 'Образы, контейнеры, сети, тома и Compose.', 'Images, containers, networks, volumes and Compose.', [topic('spring-microservices', 'docker-d713fad6c51e')]),
  tech('kubernetes', 'Kubernetes', 'Pods, deployments, services и конфигурация приложений.', 'Pods, deployments, services and application configuration.', [topic('go-microservices', 'kubernetes-3ede53947ef0'), topic('spring-microservices', 'kubernetes-ce1a37767a60')]),
  tech('ci-cd', 'CI/CD', 'Автоматические проверки, сборка и доставка изменений.', 'Automated checks, builds and software delivery.'),
  tech('aws', 'Cloud / AWS', 'Вычисления, сети, IAM, хранилища и контроль расходов.', 'Compute, networking, IAM, storage and cost control.'),
  tech('terraform', 'Terraform', 'Инфраструктура как код, состояние и воспроизводимые окружения.', 'Infrastructure as code, state and reproducible environments.'),
  tech('ansible', 'Ansible', 'Инвентари, playbooks и настройка серверов.', 'Inventories, playbooks and server configuration.'),
  tech('observability', 'Observability', 'Логи, метрики, трассировки и оповещения.', 'Logs, metrics, traces and alerts.', [topic('go-microservices', 'observability-1064a182fd93')]),
  tech('fyne', 'Fyne', 'Окна, виджеты и desktop-приложения на Go.', 'Windows, widgets and Go desktop applications.', [course('fyne')], ['fyne']),
  tech('typescript', 'TypeScript', 'Типы, интерфейсы, generics и типизация приложения.', 'Types, interfaces, generics and application typing.'),
  tech('php', 'PHP', 'Синтаксис, ООП, Composer и работа с запросами.', 'Syntax, OOP, Composer and request handling.'),
  tech('laravel', 'Laravel', 'Маршруты, Eloquent, очереди и авторизация.', 'Routes, Eloquent, queues and authorization.'),
  tech('php-testing', 'PHPUnit / Pest', 'Модульные и интеграционные тесты PHP-приложения.', 'Unit and integration tests for PHP applications.'),
  tech('nodejs', 'Node.js', 'Event loop, асинхронный ввод-вывод, npm и сервер.', 'Event loop, asynchronous I/O, npm and servers.'),
  tech('nestjs', 'NestJS', 'Модули, контроллеры, провайдеры и валидация API.', 'Modules, controllers, providers and API validation.'),
  tech('js-testing', 'JavaScript Testing', 'Vitest или Jest, тесты компонентов и Playwright.', 'Vitest or Jest, component tests and Playwright.'),
  tech('fastapi', 'FastAPI', 'Python API, схемы данных, зависимости и асинхронность.', 'Python APIs, data schemas, dependencies and async code.'),
  tech('web-performance', 'Web Performance & Accessibility', 'Клавиатура, семантика, загрузка ресурсов и профилирование.', 'Keyboard access, semantics, resource loading and profiling.'),
  tech('react-native', 'React Native', 'Мобильные компоненты, навигация и управление состоянием.', 'Mobile components, navigation and state management.'),
  tech('mobile-platform', 'Mobile Platform APIs', 'Разрешения, камера, offline-хранение и уведомления.', 'Permissions, camera, offline storage and notifications.'),
  tech('mobile-release', 'Mobile Testing & Release', 'Проверки на устройствах, подпись сборок и выпуск в магазины.', 'Device testing, build signing and app store releases.'),
  tech('math-stats', 'Math & Statistics', 'Линейная алгебра, вероятность, статистика и градиенты.', 'Linear algebra, probability, statistics and gradients.'),
  tech('numpy-pandas', 'NumPy & pandas', 'Массивы, таблицы, очистка и исследование данных.', 'Arrays, tables, cleaning and data exploration.'),
  tech('scikit-learn', 'scikit-learn', 'Регрессия, классификация, признаки и pipelines.', 'Regression, classification, features and pipelines.'),
  tech('pytorch', 'PyTorch', 'Тензоры, autograd, нейросети и цикл обучения.', 'Tensors, autograd, neural networks and training loops.'),
  tech('model-evaluation', 'Model Evaluation', 'Разделение данных, метрики, валидация и утечки данных.', 'Data splits, metrics, validation and data leakage.'),
  tech('mlops', 'MLOps', 'Эксперименты, версии данных, serving и мониторинг моделей.', 'Experiments, data versions, serving and model monitoring.'),
  tech('llm-api', 'LLM APIs & Prompting', 'Структурированные ответы, контекст, стоимость и ограничения моделей.', 'Structured outputs, context, cost and model limitations.'),
  tech('rag', 'Embeddings & RAG', 'Поиск по документам, векторные представления и grounding.', 'Document retrieval, vector representations and grounding.'),
  tech('ai-evaluation', 'AI Evaluation & Safety', 'Наборы проверок, качество ответов и защита от prompt injection.', 'Evaluation datasets, answer quality and prompt injection defenses.'),
  tech('ai-agents', 'AI Agents', 'Вызов инструментов, ограничения действий и контроль ошибок.', 'Tool calling, action boundaries and error handling.'),
  tech('opencv', 'OpenCV', 'Изображения, геометрические преобразования и обработка видео.', 'Images, geometric transforms and video processing.'),
  tech('vision-models', 'Vision Models', 'Классификация, CNN, transfer learning и аугментации.', 'Classification, CNNs, transfer learning and augmentation.'),
  tech('detection-segmentation', 'Detection & Segmentation', 'Локализация объектов, маски и оценка предсказаний.', 'Object localization, masks and prediction evaluation.'),
  tech('text-processing', 'Text Processing', 'Нормализация текста, токенизация, словари и корпуса.', 'Text normalization, tokenization, vocabularies and corpora.'),
  tech('transformers', 'Transformers', 'Attention, предобученные модели и библиотека Hugging Face.', 'Attention, pretrained models and the Hugging Face library.'),
  tech('nlp-training', 'NLP Fine-tuning', 'Адаптация моделей к классификации, NER и другим задачам текста.', 'Adapting models for classification, NER and other text tasks.'),
];
const stage = (ru: string, en: string, ...ids: string[]) => ({ title: text(ru, en), technologies: ids });
export const roadmapGroups = [
  { id: 'backend', title: 'Backend' }, { id: 'fullstack', title: 'Fullstack' },
  { id: 'frontend', title: 'Frontend' }, { id: 'mobile', title: 'Mobile' },
  { id: 'ai', title: 'AI / ML / CV / NLP' }, { id: 'devops', title: 'DevOps' },
];
const source = (title: string, url: string) => ({ title, url });
const stacks = [
  { id: 'python', title: 'Python', language: ['python'], framework: ['fastapi'], testing: 'python-testing', source: source('FastAPI · Tutorial', 'https://fastapi.tiangolo.com/tutorial/') },
  { id: 'go', title: 'Go', language: ['go'], framework: ['gin'], testing: 'go-testing', source: source('roadmap.sh · Go', 'https://roadmap.sh/golang') },
  { id: 'java', title: 'Java', language: ['java'], framework: ['java-build', 'spring-boot'], testing: 'java-testing', source: source('roadmap.sh · Java', 'https://roadmap.sh/java') },
  { id: 'php', title: 'PHP', language: ['php'], framework: ['laravel'], testing: 'php-testing', source: source('Laravel · Documentation', 'https://laravel.com/framework/docs/13.x') },
  { id: 'javascript', title: 'JavaScript / TypeScript', language: ['javascript', 'typescript'], framework: ['nodejs', 'nestjs'], testing: 'js-testing', source: source('roadmap.sh · Node.js', 'https://roadmap.sh/nodejs') },
];
export const roadmaps: Roadmap[] = [
  ...stacks.filter(stack => !['go', 'java'].includes(stack.id)).map(stack => ({
    id: stack.id + '-backend', group: 'backend' as const, title: 'Backend ' + stack.title,
    description: text('Серверная разработка на ' + stack.title + ': API, данные, тестирование и эксплуатация.', 'Server development with ' + stack.title + ': APIs, data, testing and operations.'),
    outcome: text('Практика: API с базой данных, авторизацией, тестами и контейнерной сборкой.', 'Practice: an API with a database, authorization, tests and a container build.'),
    stages: [stage('Язык и инструменты', 'Language and tools', ...stack.language, 'git', 'algorithms'), stage('Сервер и данные', 'Server and data', 'networking', 'postgresql', ...stack.framework), stage('Качество и безопасность', 'Quality and security', stack.testing, 'security'), stage('Доставка приложения', 'Application delivery', 'docker', 'ci-cd'), stage('Следующий уровень', 'Next level', 'redis', 'observability')],
    sources: [source('roadmap.sh · Backend', 'https://roadmap.sh/backend'), stack.source],
  })),
  ...stacks.filter(stack => stack.id !== 'python').map(stack => ({
    id: stack.id + '-fullstack', group: 'fullstack' as const, title: 'Fullstack ' + stack.title,
    description: text('Интерфейс на React и сервер на ' + stack.title + ': полный путь от страницы до приложения.', 'A React interface and a ' + stack.title + ' server: from a page to a complete app.'),
    outcome: text('Практика: приложение с личным кабинетом, API, базой данных и тестами основных сценариев.', 'Practice: an app with an account area, API, database and tests for the main flows.'),
    stages: [stage('Основа веба', 'Web foundations', 'git', 'networking', 'html-css', 'javascript'), stage('Интерфейс приложения', 'Application interface', 'typescript', 'react', 'web-performance'), stage('Сервер и данные', 'Server and data', ...stack.language.filter(id => !['javascript', 'typescript'].includes(id)), ...stack.framework, 'postgresql'), stage('Надёжность', 'Reliability', 'security', ...new Set([stack.testing, 'js-testing'])), stage('Доставка приложения', 'Application delivery', 'docker', 'ci-cd')],
    sources: [source('roadmap.sh · Full Stack', 'https://roadmap.sh/full-stack'), source('roadmap.sh · Frontend', 'https://roadmap.sh/frontend'), stack.source],
  })),
  {
    id: 'frontend', group: 'frontend', title: 'Frontend',
    description: text('Доступные и быстрые интерфейсы: HTML, CSS, JavaScript, TypeScript и React.', 'Accessible, fast interfaces with HTML, CSS, JavaScript, TypeScript and React.'),
    outcome: text('Практика: адаптивное приложение с API, формами, тестами и поддержкой клавиатуры.', 'Practice: a responsive app with APIs, forms, tests and keyboard support.'),
    stages: [stage('Основа веба', 'Web foundations', 'networking', 'git', 'html-css'), stage('Программирование в браузере', 'Browser programming', 'javascript', 'typescript'), stage('Приложение', 'Application', 'react'), stage('Качество интерфейса', 'Interface quality', 'js-testing', 'web-performance', 'security'), stage('Доставка', 'Delivery', 'ci-cd')],
    sources: [source('roadmap.sh · Frontend', 'https://roadmap.sh/frontend')],
  },
  {
    id: 'mobile', group: 'mobile', title: 'Mobile',
    description: text('Маршрут для Android и iOS через React Native: интерфейс, устройство и выпуск приложения.', 'An Android and iOS path using React Native: interface, device capabilities and release.'),
    outcome: text('Практика: мобильное приложение с навигацией, API, offline-режимом и сборкой на устройстве.', 'Practice: a mobile app with navigation, APIs, offline support and a build on a device.'),
    stages: [stage('Основа разработчика', 'Developer foundations', 'javascript', 'typescript', 'git'), stage('Мобильный интерфейс', 'Mobile interface', 'react', 'react-native'), stage('Данные и устройство', 'Data and device', 'networking', 'mobile-platform', 'security'), stage('Проверка и выпуск', 'Testing and release', 'js-testing', 'mobile-release', 'ci-cd')],
    sources: [source('roadmap.sh · React Native', 'https://roadmap.sh/react-native')],
  },
  {
    id: 'ai', group: 'ai', title: 'AI Engineering',
    description: text('Приложения с готовыми моделями: LLM API, поиск по данным, инструменты и оценка качества.', 'Applications with existing models: LLM APIs, retrieval, tools and evaluation.'),
    outcome: text('Практика: помощник по документам с источниками ответов, проверками качества и ограничениями действий.', 'Practice: a document assistant with answer sources, evaluations and action boundaries.'),
    stages: [stage('Основа', 'Foundations', 'python', 'git', 'networking'), stage('Работа с моделями', 'Working with models', 'llm-api', 'rag'), stage('Инструменты и качество', 'Tools and quality', 'ai-agents', 'ai-evaluation', 'security'), stage('Приложение', 'Application', 'fastapi', 'docker', 'observability')],
    sources: [source('roadmap.sh · AI Engineer', 'https://roadmap.sh/ai-engineer')],
  },
  {
    id: 'ml', group: 'ai', title: 'Machine Learning',
    description: text('От подготовки данных и статистики до обучения, оценки и эксплуатации моделей.', 'From data and statistics to model training, evaluation and operations.'),
    outcome: text('Практика: ML-проект с baseline, независимой тестовой выборкой и API предсказаний.', 'Practice: an ML project with a baseline, held-out test set and prediction API.'),
    stages: [stage('Основа', 'Foundations', 'python', 'git', 'math-stats'), stage('Данные и классический ML', 'Data and classical ML', 'numpy-pandas', 'scikit-learn'), stage('Оценка и нейросети', 'Evaluation and neural networks', 'model-evaluation', 'pytorch'), stage('Эксплуатация', 'Operations', 'fastapi', 'docker', 'mlops')],
    sources: [source('roadmap.sh · AI & Data Scientist', 'https://roadmap.sh/ai-data-scientist')],
  },
  {
    id: 'cv', group: 'ai', title: 'Computer Vision',
    description: text('Изображения и видео: обработка, классификация, поиск объектов и сегментация.', 'Images and video: processing, classification, detection and segmentation.'),
    outcome: text('Практика: модель для изображений с контролем качества разметки и проверкой на новых данных.', 'Practice: an image model with label quality checks and evaluation on unseen data.'),
    stages: [stage('Основа', 'Foundations', 'python', 'git', 'math-stats', 'numpy-pandas'), stage('Изображения и нейросети', 'Images and neural networks', 'opencv', 'pytorch'), stage('Задачи зрения', 'Vision tasks', 'vision-models', 'detection-segmentation', 'model-evaluation'), stage('Применение модели', 'Model delivery', 'fastapi', 'docker', 'mlops')],
    sources: [source('PyTorch · Image Classifier', 'https://docs.pytorch.org/tutorials/beginner/blitz/cifar10_tutorial.html'), source('roadmap.sh · AI & Data Scientist', 'https://roadmap.sh/ai-data-scientist')],
  },
  {
    id: 'nlp', group: 'ai', title: 'Natural Language Processing',
    description: text('Текстовые данные: токенизация, языковые модели и адаптация под прикладные задачи.', 'Text data: tokenization, language models and adaptation to practical tasks.'),
    outcome: text('Практика: классификация или извлечение сущностей с валидацией, анализом ошибок и API.', 'Practice: classification or entity extraction with validation, error analysis and an API.'),
    stages: [stage('Основа', 'Foundations', 'python', 'git', 'math-stats', 'numpy-pandas'), stage('Текст и модели', 'Text and models', 'text-processing', 'pytorch', 'transformers'), stage('Адаптация и оценка', 'Adaptation and evaluation', 'nlp-training', 'model-evaluation'), stage('Применение', 'Delivery', 'fastapi', 'docker', 'mlops')],
    sources: [source('Hugging Face · LLM Course', 'https://huggingface.co/learn/llm-course/chapter1/1')],
  },
  {
    id: 'devops', group: 'devops', title: 'DevOps',
    description: text('От терминала и сетей до автоматизации инфраструктуры и надёжной доставки приложений.', 'From the terminal and networking to infrastructure automation and reliable software delivery.'),
    outcome: text('Практика: разверни сервис с CI/CD, инфраструктурой как кодом и мониторингом.', 'Practice: deploy a service with CI/CD, infrastructure as code and monitoring.'),
    stages: [stage('Система и сети', 'Systems and networking', 'linux', 'networking', 'git'), stage('Автоматизация', 'Automation', 'python'), stage('Контейнеры и доставка', 'Containers and delivery', 'docker', 'ci-cd'), stage('Облако и инфраструктура', 'Cloud and infrastructure', 'aws', 'terraform', 'ansible'), stage('Оркестрация и эксплуатация', 'Orchestration and operations', 'kubernetes', 'observability', 'security')],
    sources: [{ title: 'roadmap.sh · DevOps', url: 'https://roadmap.sh/devops' }],
  },
  {
    id: 'java-backend', group: 'backend', title: 'Backend Java',
    description: text('Java и Spring: от основ языка до API, баз данных и распределённых сервисов.', 'Java and Spring: from language fundamentals to APIs, databases and distributed services.'),
    outcome: text('Практика: создай API с PostgreSQL, авторизацией, тестами и контейнерной сборкой.', 'Practice: build an API with PostgreSQL, authorization, tests and a container build.'),
    stages: [stage('Основа разработчика', 'Developer foundations', 'java', 'git', 'algorithms'), stage('Данные и инструменты', 'Data and tools', 'java-build', 'networking', 'postgresql'), stage('Приложение на Spring', 'A Spring application', 'spring-boot', 'java-testing', 'security'), stage('Доставка приложения', 'Application delivery', 'docker', 'ci-cd'), stage('Следующий уровень', 'Next level', 'redis', 'spring-cloud', 'observability')],
    sources: [{ title: 'roadmap.sh · Java', url: 'https://roadmap.sh/java' }, { title: 'roadmap.sh · Spring Boot', url: 'https://roadmap.sh/spring-boot' }],
  },
  {
    id: 'python-fullstack', group: 'fullstack', title: 'Fullstack Python',
    description: text('Веб-приложение целиком: браузерный интерфейс, Python-сервер и хранение данных.', 'A complete web application: browser interface, Python server and data storage.'),
    outcome: text('Практика: собери приложение с Django, базой данных и React-интерфейсом, покрой основные сценарии тестами.', 'Practice: build an app with Django, a database and a React interface, then test its main flows.'),
    stages: [stage('Язык и инструменты', 'Language and tools', 'python', 'git', 'networking'), stage('Основа интерфейса', 'Interface foundations', 'html-css', 'javascript'), stage('Сервер и данные', 'Server and data', 'django', 'postgresql', 'security'), stage('Интерактивный интерфейс', 'Interactive interface', 'typescript', 'react', 'web-performance'), stage('Проверка и доставка', 'Testing and delivery', 'python-testing', 'js-testing', 'docker', 'ci-cd')],
    sources: [{ title: 'roadmap.sh · Full Stack', url: 'https://roadmap.sh/full-stack' }, { title: 'roadmap.sh · Python', url: 'https://roadmap.sh/python' }, { title: 'Django · Overview', url: 'https://docs.djangoproject.com/en/5.2/intro/overview/' }],
  },
  {
    id: 'go-backend', group: 'backend', title: 'Backend Go',
    description: text('Сервисы на Go: от языка и HTTP до gRPC, контейнеров и наблюдаемости.', 'Go services: from the language and HTTP to gRPC, containers and observability.'),
    outcome: text('Практика: создай сервис на Go с API, базой данных, тестами и метриками.', 'Practice: create a Go service with an API, database, tests and metrics.'),
    stages: [stage('Основа разработчика', 'Developer foundations', 'go', 'git', 'networking'), stage('API и хранение данных', 'APIs and data storage', 'rest-api', 'gin', 'postgresql'), stage('Качество и безопасность', 'Quality and security', 'go-testing', 'security'), stage('Доставка приложения', 'Application delivery', 'docker', 'ci-cd'), stage('Распределённые системы', 'Distributed systems', 'grpc', 'mongodb', 'kubernetes', 'observability')],
    sources: [{ title: 'roadmap.sh · Go', url: 'https://roadmap.sh/golang' }, { title: 'roadmap.sh · Backend', url: 'https://roadmap.sh/backend' }],
  },
];
roadmaps.sort((a, b) => {
  const groupOrder = roadmapGroups.findIndex(group => group.id === a.group) - roadmapGroups.findIndex(group => group.id === b.group);
  if (groupOrder || !['backend', 'fullstack'].includes(a.group)) return groupOrder;
  return stacks.findIndex(stack => a.id.startsWith(stack.id + '-')) - stacks.findIndex(stack => b.id.startsWith(stack.id + '-'));
});
export const technologyIds = technologies.map(technology => technology.id);
