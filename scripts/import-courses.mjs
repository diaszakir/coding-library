import path from 'node:path';
import { createLibraryStore } from '../lib/local-library.mjs';
const store = createLibraryStore();
if (process.argv[2]) {
  const directory = path.resolve(process.argv[2]);
  const result = store.importCourse({ path: directory, title:path.basename(directory), category:'tools', difficulty:'beginner', mark:'NEW',color:'#438823',tags:[],descriptions:{ru:'',en:''} });
  console.log(`Курс добавлен: ${result.id}. Название и категорию можно изменить в разделе «Управление курсами».`);
} else {
  const courses = store.catalog().courses;
  for (const course of courses) store.refreshCourse(course.id);
  console.log(`Обновлено курсов: ${courses.length}. Конспекты прочитаны из library-data/courses.`);
}
const catalog = store.catalog();
console.log(JSON.stringify({courses:catalog.courses.length,topics:catalog.lessons.length,storage:catalog.storage},null,2));
