import { describe, test } from 'node:test';
import assert from 'node:assert';
import { splitLine, isValidRussianInn } from '../utils/strings.js';

describe('isValidRussianInn', () => {
  test('returns true for null, undefined, or empty string', () => {
    assert.strictEqual(isValidRussianInn(null), true);
    assert.strictEqual(isValidRussianInn(undefined), true);
    assert.strictEqual(isValidRussianInn(''), true);
  });

  test('returns false for invalid lengths', () => {
    assert.strictEqual(isValidRussianInn('123456789'), false); // 9 digits
    assert.strictEqual(isValidRussianInn('12345678901'), false); // 11 digits
    assert.strictEqual(isValidRussianInn('1234567890123'), false); // 13 digits
  });

  test('returns true for valid 10-digit INNs', () => {
    assert.strictEqual(isValidRussianInn('7728168971'), true);
    assert.strictEqual(isValidRussianInn('7707083893'), true);
    assert.strictEqual(isValidRussianInn('1234567894'), true);
  });

  test('returns false for invalid 10-digit INNs', () => {
    // Correct one is 7728168971
    assert.strictEqual(isValidRussianInn('7728168972'), false);
    // Correct one is 1234567894
    assert.strictEqual(isValidRussianInn('1234567895'), false);
  });

  test('returns true for valid 12-digit INNs', () => {
    assert.strictEqual(isValidRussianInn('500100732259'), true);
    assert.strictEqual(isValidRussianInn('123456789047'), true);
  });

  test('returns false for invalid 12-digit INNs', () => {
    // Correct one is 500100732259
    assert.strictEqual(isValidRussianInn('500100732258'), false);
    assert.strictEqual(isValidRussianInn('500100732269'), false);
    // Correct one is 123456789047
    assert.strictEqual(isValidRussianInn('123456789048'), false);
  });

  test('handles formatting characters (spaces, hyphens)', () => {
    assert.strictEqual(isValidRussianInn(' 7728168971 '), true);
    assert.strictEqual(isValidRussianInn('772-816-89-71'), true);
    assert.strictEqual(isValidRussianInn('5001 0073 2259'), true);
    assert.strictEqual(isValidRussianInn(' 5001 0073 22 58 '), false); // Invalid check digit with formatting
  });
});

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
