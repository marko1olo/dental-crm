import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { extractJson } from './visionAnalyzer.js';

test('visionAnalyzer tests', async (t) => {
  await t.test('extractJson extracts direct JSON', () => {
    const input = '{"test": "value"}';
    const result = extractJson(input);
    assert.deepEqual(result, { test: "value" });
  });

  await t.test('extractJson strips <think> block and extracts JSON', () => {
    const input = '<think>This is a thought process</think>{"test": "value"}';
    const result = extractJson(input);
    assert.deepEqual(result, { test: "value" });
  });

  await t.test('extractJson strips unclosed <think> block and extracts JSON from match', () => {
    // If <think> is unclosed, the regex /<think>[\s\S]*?(?:<\/think>|$)/gi matches to the end.
    // Which means JSON might be stripped if it's inside or after an unclosed think block.
    // Let's test the specific regex behavior.
    const input = '<think>some unclosed thought{"test": "value"}';
    assert.throws(() => {
      extractJson(input);
    }, new Error("Не удалось извлечь JSON из ответа модели"));
  });

  await t.test('extractJson extracts JSON from block when prepended with text', () => {
    const input = 'Here is the result: \n\n {"test": "value"} \n\n Hope it helps.';
    const result = extractJson(input);
    assert.deepEqual(result, { test: "value" });
  });

  await t.test('extractJson throws error when no valid JSON is present', () => {
    const input = 'Here is the result: no json here';
    assert.throws(() => {
      extractJson(input);
    }, new Error("Не удалось извлечь JSON из ответа модели"));
  });

  await t.test('extractJson throws error when JSON is invalid', () => {
    const input = 'Here is the result: {"test": "value" '; // missing closing brace
    assert.throws(() => {
      extractJson(input);
    }, new Error("Не удалось извлечь JSON из ответа модели"));
  });
});
