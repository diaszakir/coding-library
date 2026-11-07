'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Catalog } from '@/lib/catalog';
import { orderCourseCurriculum } from '@/lib/course-curriculum';
type Context = { catalog: Catalog; reload: () => Promise<Catalog> };
const CatalogContext = createContext<Context | null>(null);
async function fetchCatalog() {
  const response = await fetch('/api/library', { cache:'no-store' });
  const data = await response.json() as Catalog & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Не удалось загрузить библиотеку');
  return orderCourseCurriculum(data);
}
export async function libraryRequest<T = { id: string }>(input: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Не удалось выполнить операцию');
  return payload;
}
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    const data = await fetchCatalog();
    setCatalog(data); setError('');
    return data;
  }, []);
  useEffect(() => { let active = true; fetchCatalog().then(data => { if (active) setCatalog(data); }).catch(error => { if (active) setError(error.message); }); return () => { active = false; }; }, []);
  if (!catalog) return <main className="local-loading"><h1>DevLibrary</h1><p role="status">{error || 'Открываем твою локальную библиотеку…'}</p>{error && <button className="primary-button" onClick={() => reload().catch(error => setError(error.message))}>Повторить</button>}</main>;
  return <CatalogContext.Provider value={{ catalog, reload }}>{children}</CatalogContext.Provider>;
}
export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('CatalogProvider is missing');
  const getLesson = (id: string) => context.catalog.lessons.find(l => l.id === id);
  const getCourse = (id: string) => context.catalog.courses.find(c => c.id === id);
  return { ...context, getLesson, getCourse, getLessonCourse: (id: string) => getCourse(getLesson(id)?.course || '') };
}
