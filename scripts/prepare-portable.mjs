import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { courseSections } from '../lib/course-sections.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const emptyCatalog = { categories: courseSections, courses: [], lessons: [], importedFiles: 0, sourceCodeFiles: 0 };
const registryFiles = ['python-notebooks.json', 'python-video-basics.json', 'python-video-advanced.json', 'go-foundations.json', 'go-projects.json'];
const rootFiles = ['.dockerignore', '.env.example', '.gitignore', '.npmrc', 'AGENTS.md', 'README.md', 'components.json', 'eslint.config.mjs', 'next.config.ts', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'postcss.config.mjs', 'tsconfig.json', 'compose.yaml'];
const safeScripts = ['launch.mjs', 'create-course.mjs', 'import-courses.mjs', 'note-files.mjs', 'course-paths.mjs', 'prepare-portable.mjs'];
const safeDocs = ['ai-course-rules.md', 'agent-guide.md', 'custom-courses.md'];
const safeTests = ['local-library.test.mjs', 'note-formats.test.mjs', 'course-paths.test.mjs', 'course-curriculum.test.mjs', 'learning.test.mjs', 'learning-resume.test.mjs', 'progress.test.mjs', 'progress-sync.test.mjs', 'create-course-cli.test.mjs', 'portable.test.mjs', 'runtime.test.mjs'];

function write(root, relative, text) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}
function json(root, relative, value) { write(root, relative, JSON.stringify(value, null, 2) + '\n'); }

// Only call in an isolated build context, never in the user's live checkout.
export function preparePortable(root) {
  json(root, 'data/catalog.json', emptyCatalog);
  json(root, 'courses.config.json', { root: './course-sources', dataDirectory: './library-data' });
  for (const filename of registryFiles) json(root, `data/${filename}`, {});
  // Ignore settings cannot remove files already copied into a build context.
  // Refuse them so private content cannot accidentally enter an image/export.
  for (const relative of ['public/content', 'library-data', 'reports', '.git', '.openai']) {
    if (fs.existsSync(path.join(root, relative))) throw new Error(`Private/source-only path present: ${relative}. Use an isolated portable export or Docker .dockerignore.`);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const key of ['update:python', 'update:go', 'db:generate', 'install:ci']) delete manifest.scripts[key];
  json(root, 'package.json', manifest);
}

export function exportPortable(output, source = projectRoot) {
  source = fs.realpathSync(source);
  const target = path.resolve(output);
  if (target === source || source.startsWith(target + path.sep) || target.startsWith(source + path.sep)) throw new Error('Choose a new directory outside the source checkout');
  if (fs.existsSync(target) && fs.readdirSync(target).length) throw new Error('Output directory must be empty; existing files will not be overwritten');
  fs.mkdirSync(target, { recursive: true });
  function copy(relative) {
    const original = path.join(source, relative);
    if (!fs.existsSync(original)) return;
    const stat = fs.lstatSync(original);
    if (stat.isSymbolicLink()) throw new Error(`Symlinks are not exported: ${relative}`);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(original)) copy(path.join(relative, entry));
    } else {
      if (/(^|[\\/])\.env(?!\.example$)/.test(relative)) return;
      fs.mkdirSync(path.dirname(path.join(target, relative)), { recursive: true });
      fs.copyFileSync(original, path.join(target, relative));
    }
  }
  for (const filename of rootFiles) copy(filename);
  for (const directory of ['app', 'components', 'hooks', 'lib', 'templates']) copy(directory);
  for (const filename of ['lesson-learning.ts', 'roadmaps.ts']) copy(`data/${filename}`);
  for (const filename of safeScripts) copy(`scripts/${filename}`);
  for (const filename of safeDocs) copy(`docs/${filename}`);
  for (const filename of safeTests) copy(`tests/${filename}`);
  for (const filename of ['favicon.svg', 'llms.txt']) copy(`public/${filename}`);
  copy('vendor/shadcn-tailwind-4.13.0.css');
  copy('vendor/shadcn-tailwind-4.13.0.LICENSE.md');
  copy('Dockerfile');
  preparePortable(target);
  write(target, 'CLAUDE.md', 'Read AGENTS.md and docs/agent-guide.md before editing this local project.\n');
  return target;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === '--in-place' && process.argv.length === 3) {
      // .git is an additional guard against modifying a real checkout.
      if (fs.existsSync(path.join(projectRoot, '.git'))) throw new Error('--in-place is only for isolated Docker build contexts');
      preparePortable(projectRoot);
      console.log('Prepared an empty portable library for this build.');
    } else if (process.argv[2] === '--output' && process.argv[3] && process.argv.length === 4) {
      console.log(`Portable source: ${exportPortable(process.argv[3])}`);
    } else throw new Error('Usage: node scripts/prepare-portable.mjs --output ../devlibrary-portable');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
