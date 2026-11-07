import { createLibraryStore, LibraryError, contentHash } from '@/lib/local-library.mjs';
import { checkLocalRequest, localJson } from '@/lib/local-request';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function failure(error: unknown) { return Response.json({ error: error instanceof Error ? error.message : 'Не удалось выполнить операцию' }, { status: error instanceof LibraryError ? error.status : 400 }); }
export async function GET(request: Request) {
  try {
    checkLocalRequest(request);
    const store = createLibraryStore(); const url = new URL(request.url); const action = url.searchParams.get('action');
    let result;
    if (action === 'folders') result = store.folders(url.searchParams.get('path'));
    else if (action === 'note') { const note = store.note(url.searchParams.get('id'),url.searchParams.get('language')); result = { ...note, hash: contentHash(note.text) }; }
    else if (action === 'lesson') result = store.lesson(url.searchParams.get('id'));
    else result = store.catalog();
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    checkLocalRequest(request,true); const input = await localJson(request); const store = createLibraryStore();
    let result;
    switch (input.action) {
      case 'preview': result = store.preview(input.path); break;
      case 'import': result = store.importCourse(input); break;
      case 'create': result = store.createCourse(input); break;
      case 'add-note': result = store.addNote(input.id,input.note); break;
      case 'update': result = store.updateCourse(input.id,input); break;
      case 'delete': result = store.deleteCourse(input.id); break;
      case 'restore': result = store.restoreCourse(input.id); break;
      case 'refresh': result = store.refreshCourse(input.id); break;
      case 'save-note': result = store.saveNote(input.id,input.language,input.text,input.hash); break;
      default: throw new LibraryError('Неизвестная операция');
    }
    return Response.json(result);
  } catch (error) { return failure(error); }
}
