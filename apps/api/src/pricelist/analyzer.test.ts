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
});
