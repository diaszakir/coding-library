import { createLibraryStore } from '@/lib/local-library.mjs';
import { checkLocalRequest, localJson } from '@/lib/local-request';
import { parseProgress, mergeProgress } from '@/lib/progress';
import { validateLearningEvidence } from '@/lib/progress-validation';
import { lessonLearning } from '@/data/lesson-learning';
import { technologyIds } from '@/data/roadmaps';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { checkLocalRequest(request); return Response.json(createLibraryStore().progress(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Не удалось прочитать файл прогресса' }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    checkLocalRequest(request,true); const input = await localJson(request); const store = createLibraryStore(); const catalog = store.catalog();
    const progress = parseProgress(JSON.stringify(input.progress),catalog.knownLessonIds,catalog.knownCourseIds,technologyIds);
    const base = input.base ? parseProgress(JSON.stringify(input.base),catalog.knownLessonIds,catalog.knownCourseIds,technologyIds) : undefined;
    return Response.json(store.saveProgress((saved: unknown) => {
      const disk = saved ? validateLearningEvidence(parseProgress(JSON.stringify(saved),catalog.knownLessonIds,catalog.knownCourseIds,technologyIds), lessonLearning) : null;
      // Imported legacy completion is accepted only at initialization. Once disk
      // state exists, a browser cannot turn new lessons into historical marks.
      const incoming = validateLearningEvidence({ ...progress, legacyCompleted: disk ? disk.legacyCompleted : progress.legacyCompleted }, lessonLearning);
      return validateLearningEvidence(disk ? mergeProgress(disk, incoming, base) : incoming, lessonLearning);
    },input.initialize === true));
  } catch { return Response.json({ error: 'Не удалось сохранить прогресс на диск' }, { status: 400 }); }
}
