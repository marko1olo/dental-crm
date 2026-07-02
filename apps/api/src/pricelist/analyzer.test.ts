import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { safeParseJsonObject } from './analyzer.js';

test('safeParseJsonObject handles empty string', () => {
  assert.deepEqual(safeParseJsonObject(''), {});
});

test('safeParseJsonObject handles whitespace string', () => {
  assert.deepEqual(safeParseJsonObject('   '), {});
});

test('safeParseJsonObject parses valid JSON', () => {
  assert.deepEqual(safeParseJsonObject('{"key": "value"}'), { key: 'value' });
});

test('safeParseJsonObject parses valid JSON with surrounding whitespace', () => {
  assert.deepEqual(safeParseJsonObject('  \n {"key": "value"} \n '), { key: 'value' });
});

test('safeParseJsonObject falls back to regex matching for JSON embedded in text', () => {
  const result = safeParseJsonObject('Here is the json: {"key": "value"} and some more text');
  assert.deepEqual(result, { key: 'value' });
});

test('safeParseJsonObject falls back to regex matching for multiline JSON embedded in text', () => {
  const result = safeParseJsonObject('Here is the json:\n{\n  "key": "value",\n  "nested": { "a": 1 }\n}\nand some more text');
  assert.deepEqual(result, { key: 'value', nested: { a: 1 } });
});

test('safeParseJsonObject returns empty object if no JSON structure is found in fallback', () => {
  assert.deepEqual(safeParseJsonObject('This is just some text with no JSON'), {});
});

test('safeParseJsonObject throws on invalid JSON even after regex match', () => {
  assert.throws(() => {
    safeParseJsonObject('Here is broken json: {"key": "value", } and some more text');
  }, SyntaxError);
});
