import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFallbackQuestions } from '../controllers/skillQuestion.controller.js';

test('buildFallbackQuestions returns easy/medium/hard arrays with question and answer objects', () => {
  const questions = buildFallbackQuestions(['React', 'Node.js', 'MongoDB']);

  assert.ok(questions.easy);
  assert.ok(questions.medium);
  assert.ok(questions.hard);
  assert.equal(questions.easy.length, 5);
  assert.equal(questions.medium.length, 5);
  assert.equal(questions.hard.length, 5);
  assert.ok(questions.easy[0].question.includes('React'));
  assert.ok(questions.easy[0].answer.includes('React'));
});
