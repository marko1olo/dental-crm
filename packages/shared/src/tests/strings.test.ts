import { describe, test } from 'node:test';
import assert from 'node:assert';
import { splitLine, isValidRussianSnils } from '../utils/strings.js';

describe('splitLine', () => {
  test('splits simple strings with a delimiter', () => {
    assert.deepStrictEqual(splitLine('a,b,c', ','), ['a', 'b', 'c']);
  });

  test('trims whitespace around values', () => {
    assert.deepStrictEqual(splitLine(' a , b , c ', ','), ['a', 'b', 'c']);
  });

  test('ignores delimiters within double quotes', () => {
    // The utility strips out the quotes based on the current implementation
    assert.deepStrictEqual(splitLine('a,"b,c",d', ','), ['a', 'b,c', 'd']);
  });

  test('ignores delimiters within double quotes with spaces', () => {
    assert.deepStrictEqual(splitLine(' a , "b, c" , d ', ','), ['a', 'b, c', 'd']);
  });

  test('handles empty string delimiter', () => {
    assert.deepStrictEqual(splitLine('abc', ''), ['abc']);
    assert.deepStrictEqual(splitLine('', ''), ['']);
  });

  test('handles empty string', () => {
    assert.deepStrictEqual(splitLine('', ','), ['']);
  });

  test('handles consecutive delimiters', () => {
    assert.deepStrictEqual(splitLine('a,,c', ','), ['a', '', 'c']);
  });

  test('handles leading and trailing delimiters', () => {
    assert.deepStrictEqual(splitLine(',a,b,', ','), ['', 'a', 'b', '']);
  });

  test('handles other delimiters', () => {
    assert.deepStrictEqual(splitLine('a|b|c', '|'), ['a', 'b', 'c']);
    assert.deepStrictEqual(splitLine('first\tsecond\tthird', '\t'), ['first', 'second', 'third']);
  });

  test('handles multiple quoted segments', () => {
    assert.deepStrictEqual(splitLine('a,"b",c,"d"', ','), ['a', 'b', 'c', 'd']);
    assert.deepStrictEqual(splitLine('"a,b",c,"d,e"', ','), ['a,b', 'c', 'd,e']);
  });

  test('handles empty quotes', () => {
    assert.deepStrictEqual(splitLine('a,"",c', ','), ['a', '', 'c']);
    assert.deepStrictEqual(splitLine('""', ','), ['']);
  });

  test('handles unclosed quotes', () => {
    assert.deepStrictEqual(splitLine('a,"b,c', ','), ['a', 'b,c']);
    assert.deepStrictEqual(splitLine('a,"b', ','), ['a', 'b']);
  });

  test('handles strings with only delimiters', () => {
    assert.deepStrictEqual(splitLine(',', ','), ['', '']);
    assert.deepStrictEqual(splitLine(',,', ','), ['', '', '']);
  });

  test('handles strings with only whitespaces', () => {
    assert.deepStrictEqual(splitLine('   ', ','), ['']);
  });

  test('handles strings with no delimiters', () => {
    assert.deepStrictEqual(splitLine('hello', ','), ['hello']);
    assert.deepStrictEqual(splitLine('hello world', ','), ['hello world']);
  });

  test('handles emojis and unicode characters', () => {
    assert.deepStrictEqual(splitLine('👋,🌍,🔥', ','), ['👋', '🌍', '🔥']);
    assert.deepStrictEqual(splitLine('привет,мир', ','), ['привет', 'мир']);
  });

  test('handles newlines inside quotes', () => {
    assert.deepStrictEqual(splitLine('a,"b\nc",d', ','), ['a', 'b\nc', 'd']);
  });

  test('preserves spaces inside quotes but trims outside', () => {
    assert.deepStrictEqual(splitLine('  " a b "  ,  c  ', ','), ['a b', 'c']);
  });

  test('handles whitespace around empty elements', () => {
    assert.deepStrictEqual(splitLine('a, ,c', ','), ['a', '', 'c']);
  });

  test('handles quotes used as escape for delimiter only', () => {
    assert.deepStrictEqual(splitLine('","', ','), [',']);
  });

  test('handles quotes adjacent to characters without delimiters', () => {
    assert.deepStrictEqual(splitLine('a,"b""c",d', ','), ['a', 'bc', 'd']);
  });
});

describe('isValidRussianSnils', () => {
  test('returns true for empty, null, or undefined values', () => {
    assert.strictEqual(isValidRussianSnils(null), true);
    assert.strictEqual(isValidRussianSnils(undefined), true);
    assert.strictEqual(isValidRussianSnils(''), true);
  });

  test('validates correct SNILS with sum < 100', () => {
    assert.strictEqual(isValidRussianSnils('112-233-445 95'), true);
    assert.strictEqual(isValidRussianSnils('11223344595'), true);
    assert.strictEqual(isValidRussianSnils(' 112 233 445 95 '), true);
  });

  test('validates correct SNILS with sum = 100', () => {
    assert.strictEqual(isValidRussianSnils('322-222-223 00'), true);
  });

  test('validates correct SNILS with sum = 101', () => {
    assert.strictEqual(isValidRussianSnils('322-222-224 00'), true);
  });

  test('validates correct SNILS with sum > 101 and specific remainder', () => {
    // sum = 103, remainder 2 -> control 02
    assert.strictEqual(isValidRussianSnils('322-222-226 02'), true);
  });

  test('validates correct SNILS with sum > 101 and remainder 100', () => {
    // sum = 201, remainder 100 -> control 00
    assert.strictEqual(isValidRussianSnils('644-444-455 00'), true);
  });

  test('returns true for SNILS with number part <= 1001001 regardless of checksum', () => {
    assert.strictEqual(isValidRussianSnils('001-001-001 99'), true);
    assert.strictEqual(isValidRussianSnils('000-000-001 00'), true);
  });

  test('returns false for SNILS with incorrect length', () => {
    assert.strictEqual(isValidRussianSnils('112-233-445'), false); // 9 digits
    assert.strictEqual(isValidRussianSnils('112-233-445 955'), false); // 12 digits
  });

  test('returns false for SNILS with identical repeating digits', () => {
    assert.strictEqual(isValidRussianSnils('111-111-111 11'), false);
    assert.strictEqual(isValidRussianSnils('000-000-000 00'), false);
  });

  test('returns false for SNILS with incorrect control digits', () => {
    assert.strictEqual(isValidRussianSnils('112-233-445 96'), false); // Should be 95
    assert.strictEqual(isValidRussianSnils('322-222-223 01'), false); // Should be 00
  });
});
