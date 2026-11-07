import type { LearningProgress, LessonState } from './progress';
import type { QuizQuestion } from './learning';

type EvidenceDefinition = { video?: unknown; quiz?: { ru: QuizQuestion[]; en: QuizQuestion[] } };

/** Save boundaries recompute grades from authored answer keys, never client scores. */
export function validateLearningEvidence(progress: LearningProgress, definitions: Record<string, EvidenceDefinition>): LearningProgress {
  const lessonStates: Record<string, LessonState> = {};
  const completed = { ...progress.legacyCompleted };
  for (const [id, saved] of Object.entries(progress.lessonStates)) {
    const definition = definitions[id];
    const state = { ...saved };
    if (!definition?.video) delete state.videoCompletedAt;
    if (state.quiz) {
      const questions = definition?.quiz?.[state.quiz.language || 'ru'];
      if (!questions?.length || questions.length !== state.quiz.answers.length || questions.some((question, index) => !Number.isInteger(state.quiz!.answers[index]) || state.quiz!.answers[index] < 0 || state.quiz!.answers[index] >= question.options.length)) {
        delete state.quiz;
      } else {
        const correct = questions.filter((question, index) => question.answer === state.quiz!.answers[index]).length;
        state.quiz = { ...state.quiz, correct, total: questions.length, passPercent: 80, passed: correct / questions.length * 100 >= 80 };
      }
    }
    lessonStates[id] = state;
    if (state.videoCompletedAt && state.notesCompletedAt) completed[id] = progress.completed[id] || [state.videoCompletedAt, state.notesCompletedAt].sort().at(-1)!;
  }
  return { ...progress, lessonStates, completed };
}
