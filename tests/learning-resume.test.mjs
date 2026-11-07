import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress } from '../lib/progress.ts';
import { hasCourseActivity, nextLearningLesson } from '../lib/learning-resume.ts';

const date = '2026-11-06T10:00:00.000Z';
const lessons = [{ id:'p1',course:'python' },{ id:'p2',course:'python' },{ id:'g1',course:'go' }];
const courses = [{ id:'python',lessons:['p1','p2'] },{ id:'go',lessons:['g1'] }];
const ready = new Set(['p1','p2']);

test('a completed pilot with no last lesson leads to unfinished material', () => {
  const progress = { ...emptyProgress(), completed:{p1:date} };
  assert.equal(nextLearningLesson(lessons,courses,progress,ready).lesson.id,'p2');
});

test('a course that is exhausted leads to another unfinished course, never a completed pilot', () => {
  const progress = { ...emptyProgress(), lastLesson:'p2',completed:{p1:date,p2:date} };
  assert.equal(nextLearningLesson(lessons,courses,progress,ready).lesson.id,'g1');
});

test('last unfinished lesson wins and finishing it advances in its course', () => {
  const progress = { ...emptyProgress(), lastLesson:'p1', visited:{g1:date} };
  assert.deepEqual(nextLearningLesson(lessons,courses,progress,ready),{lesson:lessons[0],mode:'resume'});
  assert.deepEqual(nextLearningLesson(lessons,courses,{...progress,completed:{p1:date}},ready),{lesson:lessons[1],mode:'resume'});
});

test('finishing a course resumes the most recently active course, not catalog order', () => {
  const orderedLessons = [
    { id:'finished',course:'finished-course' },
    { id:'older',course:'older-course' },
    { id:'recent1',course:'recent-course' },
    { id:'recent2',course:'recent-course' },
  ];
  const orderedCourses = [
    { id:'finished-course',lessons:['finished'] },
    { id:'older-course',lessons:['older'] },
    { id:'recent-course',lessons:['recent1','recent2'] },
  ];
  const older = '2026-11-01T10:00:00.000Z';
  const variants = [
    ['visit', { visited:{recent1:date, recent2:older} }],
    ['completion', { completed:{recent1:date} }],
    ['original course completion', { originalCompleted:{'recent-course':date} }],
    ['video unchecked', { lessonStates:{recent1:{videoUpdatedAt:date}} }],
    ['video watched', { lessonStates:{recent1:{videoCompletedAt:date}} }],
    ['notes read', { lessonStates:{recent1:{notesCompletedAt:date}} }],
    ['quiz submitted', { lessonStates:{recent1:{quiz:{answers:[0],correct:0,total:1,passed:false,passPercent:80,attempts:1,submittedAt:date}}} }],
    ['study session', { studySessions:[{id:'recent',courseId:'recent-course',lessonId:'recent1',language:'Go',seconds:60,date:'2026-11-06'}] }],
  ];
  for (const [activity, patch] of variants) {
    const progress = {
      ...emptyProgress(), ...patch, lastLesson:'finished',
      visited:{older, ...patch.visited},
      completed:{finished:'2026-11-07T10:00:00.000Z', ...patch.completed},
    };
    const result = nextLearningLesson(orderedLessons,orderedCourses,progress,new Set());
    assert.equal(result.lesson.id, activity === 'completion' ? 'recent2' : 'recent1', activity);
    assert.equal(result.mode,'resume',activity);
  }
  assert.deepEqual(orderedCourses.map(course => course.id),['finished-course','older-course','recent-course']);
});

test('all completed offers an explicit review and an empty library has no lesson', () => {
  const progress = { ...emptyProgress(),lastLesson:'g1',completed:{p1:date,p2:date,g1:date} };
  assert.deepEqual(nextLearningLesson(lessons,courses,progress,ready),{lesson:lessons[2],mode:'review'});
  assert.deepEqual(nextLearningLesson([],[],emptyProgress(),new Set()),{lesson:undefined,mode:'empty'});
});

test('saved stages, time, completion and visits each count as course activity', () => {
  const course = courses[1];
  assert.equal(hasCourseActivity(emptyProgress(),course),false);
  assert.equal(hasCourseActivity({...emptyProgress(),lessonStates:{g1:{}}},course),false);
  for (const patch of [{visited:{g1:date}},{completed:{g1:date}},{lessonStates:{g1:{notesCompletedAt:date}}},{studySessions:[{id:'s',courseId:'go',lessonId:'g1',language:'Go',seconds:20,date:'2026-11-06'}]}]) {
    const progress = {...emptyProgress(),...patch};
    assert.equal(hasCourseActivity(progress,course),true);
    if (!progress.completed.g1) assert.equal(nextLearningLesson(lessons,courses,progress,ready).lesson.id,'g1');
  }
});
