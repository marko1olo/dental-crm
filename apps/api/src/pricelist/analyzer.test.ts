import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeParseJsonObject } from './analyzer.js';

test('safeParseJsonObject', async (t) => {
  await t.test('handles empty or whitespace strings', () => {
    assert.deepEqual(safeParseJsonObject(''), {});
    assert.deepEqual(safeParseJsonObject('   \n  '), {});
  });

  await t.test('parses standard JSON object correctly', () => {
    const json = '{"key": "value", "num": 123}';
    assert.deepEqual(safeParseJsonObject(json), { key: 'value', num: 123 });
  });

  await t.test('parses JSON object with text before and after (fallback logic)', () => {
    const textWithJson = 'Here is the response:\n{"item": "test"}\nHope this helps.';
    assert.deepEqual(safeParseJsonObject(textWithJson), { item: 'test' });
  });

  await t.test('returns empty object if fallback regex finds no object match', () => {
    const invalidNoBraces = 'just some text without curly braces';
    // JSON.parse throws SyntaxError on the first try, then fallback returns {}
    assert.deepEqual(safeParseJsonObject(invalidNoBraces), {});
  });

  await t.test('throws when fallback extracts invalid JSON', () => {
    const textWithInvalidJson = 'Prefix text { "key": unquoted_value } Suffix text';
    assert.throws(
      () => safeParseJsonObject(textWithInvalidJson),
      SyntaxError
    );
  });
import * as assert from 'node:assert/strict';

test('safeParseJsonObject handles empty string', () => {

test('safeParseJsonObject handles whitespace string', () => {
  assert.deepEqual(safeParseJsonObject('   '), {});

test('safeParseJsonObject parses valid JSON', () => {
  assert.deepEqual(safeParseJsonObject('{"key": "value"}'), { key: 'value' });

test('safeParseJsonObject parses valid JSON with surrounding whitespace', () => {
  assert.deepEqual(safeParseJsonObject('  \n {"key": "value"} \n '), { key: 'value' });

test('safeParseJsonObject falls back to regex matching for JSON embedded in text', () => {
  const result = safeParseJsonObject('Here is the json: {"key": "value"} and some more text');
  assert.deepEqual(result, { key: 'value' });

test('safeParseJsonObject falls back to regex matching for multiline JSON embedded in text', () => {
  const result = safeParseJsonObject('Here is the json:\n{\n  "key": "value",\n  "nested": { "a": 1 }\n}\nand some more text');
  assert.deepEqual(result, { key: 'value', nested: { a: 1 } });

test('safeParseJsonObject returns empty object if no JSON structure is found in fallback', () => {
  assert.deepEqual(safeParseJsonObject('This is just some text with no JSON'), {});

test('safeParseJsonObject throws on invalid JSON even after regex match', () => {
  assert.throws(() => {
    safeParseJsonObject('Here is broken json: {"key": "value", } and some more text');
  }, SyntaxError);
});
