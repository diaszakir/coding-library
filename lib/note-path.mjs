// Shared by the importer and Markdown links in the reader.
export function notePath(value) {
  const parts = value.replaceAll('\\', '/').split('/');
  const filename = parts.pop() || '';
  const directories = parts.filter(part => part.toLowerCase() !== 'notes');
  const base = filename.replace(/(?:\.(?:ru|en))?\.md$/i, '');
  const chapterFile = /^(?:readme|notes|russian|english)$/i.test(base) || base === directories.at(-1);
  return {
    source: [...directories, ...(chapterFile ? [] : [base])].join('/'),
    language: /(?:\.ru\.md|^russian\.md)$/i.test(filename) ? 'ru' : 'en',
  };
}
