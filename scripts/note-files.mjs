import fs from 'node:fs';
import path from 'node:path';
import { notePath } from '../lib/note-path.mjs';
export const normalizeNotePath = value => value.replaceAll('\\', '/').split('/').filter(part => part.toLowerCase() !== 'notes').join('/');

// README pairs, chapter-named pairs, and standalone topic files share one index.
export function discoverNotes(root, preferredDirectory = 'Notes') {
  const groups = new Map();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ['node_modules', 'vendor', 'target', 'build'].includes(entry.name) || entry.isSymbolicLink()) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      if (!/\.md$/i.test(entry.name)) continue;
      const base = entry.name.replace(/(?:\.(?:ru|en))?\.md$/i, '');
      const physical = path.relative(root, dir).replaceAll('\\', '/');
      const isNotes = physical.split('/').some(part => part.toLowerCase() === preferredDirectory.toLowerCase());
      // Outside Notes only authored course README files are imported.
      if (!isNotes && base.toLowerCase() !== 'readme') continue;
      if (fs.readFileSync(file, 'utf8').startsWith('<!-- devlibrary:index -->')) continue;
      const { source, language } = notePath(`${physical}/${entry.name}`);
      if (!source) continue;
      const group = groups.get(source) || { source, files: [] };
      group.files.push({ file, language, preferred: isNotes });
      groups.set(source, group);
    }
  }
  walk(root);
  return [...groups.values()].sort((a, b) => a.source.localeCompare(b.source, 'en', { numeric: true })).map(group => ({ ...group, files: group.files.sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.file.localeCompare(b.file)) }));
}

// Project the explicitly bilingual Java notes; fenced code is copied byte-for-byte.
export function projectBilingual(markdown, language) {
  const wanted = language.toUpperCase();
  let fence = false;
  let sectionLanguage = null;
  return markdown.split('\n').filter(line => {
    if (/^\s*```/.test(line)) fence = !fence;
    if (fence || /^\s*```/.test(line)) return !sectionLanguage || sectionLanguage === wanted;
    if (/^#{1,2} /.test(line)) sectionLanguage = line.match(/(?:—|–|-)\s*(RU|EN)\s*$/)?.[1] || null;
    if (sectionLanguage && sectionLanguage !== wanted) return false;
    const paragraphLanguage = line.match(/^\*\*(RU|EN)\.\*\*/)?.[1];
    return !paragraphLanguage || paragraphLanguage === wanted;
  }).map(line => {
    if (/^\s*```/.test(line)) fence = !fence;
    if (fence || /^\s*```/.test(line)) return line;
    line = line.replace(/^\*\*(?:RU|EN)\.\*\*\s*/, '').replace(/(#{1,2} .+?)\s*[—–-]\s*(?:RU|EN)\s*$/, '$1');
    line = line.replace(/\[([^\]\n]+) \/ ([^\]\n]+)\]/g, (_, ru, en) => `[${language === 'ru' ? ru : en}]`);
    if (/^#{1,6} /.test(line) && line.includes(' / ')) {
      const prefix = line.match(/^#+ /)[0];
      const parts = line.slice(prefix.length).split(' / ');
      return prefix + parts[language === 'ru' ? 0 : parts.length - 1];
    }
    if (line.startsWith('|')) return line.replace(/([^|]+) \/ ([^|]+)/g, (_, ru, en) => language === 'ru' ? ru : en);
    if (line.includes(' / ') && /[А-Яа-яЁё]/.test(line)) {
      return line.split(' / ')[language === 'ru' ? 0 : 1];
    }
    return line;
  }).join('\n');
}
