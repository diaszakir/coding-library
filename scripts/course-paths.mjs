import fs from 'node:fs';
import path from 'node:path';

// The storage container is not part of a topic's identity. During a gradual
// move, group old and new paths and prefer the copy inside Notes per language.
export function discoverCourseDirectories(root, preferredDirectory = 'Notes') {
  const groups = new Map();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ['node_modules', 'vendor'].includes(entry.name)) continue;
      const source = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(source);
      else if (entry.name === 'README.md' || entry.name === 'README.ru.md') {
        const physicalRelative = path.relative(root, dir).replaceAll('\\', '/');
        const parts = physicalRelative.split('/');
        const preferred = parts.some(part => part.toLowerCase() === preferredDirectory.toLowerCase());
        const relative = parts.filter(part => part.toLowerCase() !== preferredDirectory.toLowerCase()).join('/');
        if (!relative) continue;
        const group = groups.get(relative) || { relative, paths: [] };
        if (!group.paths.some(item => item.path === dir)) group.paths.push({ path: dir, preferred });
        groups.set(relative, group);
      }
    }
  }
  walk(root);
  return [...groups.values()].sort((a, b) => a.relative.localeCompare(b.relative, 'en', { numeric: true })).map(group => ({ ...group, paths: group.paths.sort((a, b) => Number(b.preferred) - Number(a.preferred)).map(item => item.path) }));
}

export function findTranslation(group, filename) {
  return group.paths.map(dir => path.join(dir, filename)).find(file => fs.existsSync(file));
}
