import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  splitLine,
  isValidRussianSnils,
  isValidRussianInn,
  isValidRussianPassport,
} from '../utils/strings.js';

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

  test('handles strings with multiple delimiters at the end', () => {
    assert.deepStrictEqual(splitLine('a,b,,,', ','), ['a', 'b', '', '', '']);
  });

  test('handles missing quotes gracefully (odd number of quotes)', () => {
    // an odd number of quotes leaves inQuotes = true at the end
    assert.deepStrictEqual(splitLine('a,b"c,d', ','), ['a', 'bc,d']);
    assert.deepStrictEqual(splitLine('"a,b,c', ','), ['a,b,c']);
  });

  test('handles delimiters inside quotes with surrounding spaces', () => {
    assert.deepStrictEqual(splitLine('  "a,b"  , c', ','), ['a,b', 'c']);
  });

});

describe('isValidRussianSnils', () => {
  test('returns true for null/undefined/empty string', () => {
    assert.strictEqual(isValidRussianSnils(null), true);
    assert.strictEqual(isValidRussianSnils(undefined), true);
    assert.strictEqual(isValidRussianSnils(''), true);
  });

  test('returns false for length !== 11', () => {
    assert.strictEqual(isValidRussianSnils('1234567890'), false);
    assert.strictEqual(isValidRussianSnils('123456789012'), false);
  });

  test('returns false if all digits are the same', () => {
    assert.strictEqual(isValidRussianSnils('11111111111'), false);
    assert.strictEqual(isValidRussianSnils('22222222222'), false);
  });

  test('returns true for valid SNILS with numPart <= 1001001', () => {
    assert.strictEqual(isValidRussianSnils('001-001-001 01'), true);
  });

  test('validates control checksum correctly', () => {
    // 112-233-445 95 (is a valid common example SNILS)
    assert.strictEqual(isValidRussianSnils('112-233-445 95'), true);
    // Invalid checksum
    assert.strictEqual(isValidRussianSnils('112-233-445 96'), false);
  });
});

describe('isValidRussianInn', () => {
  test('returns true for null/undefined/empty string', () => {
    assert.strictEqual(isValidRussianInn(null), true);
    assert.strictEqual(isValidRussianInn(undefined), true);
    assert.strictEqual(isValidRussianInn(''), true);
  });

  test('returns false for length !== 10 and length !== 12', () => {
    assert.strictEqual(isValidRussianInn('123456789'), false);
    assert.strictEqual(isValidRussianInn('12345678901'), false);
  });

  test('validates 10-digit INN', () => {
    // 7707083893 is Sberbank INN
    assert.strictEqual(isValidRussianInn('7707083893'), true);
    assert.strictEqual(isValidRussianInn('7707083894'), false);
  });

  test('validates 12-digit INN', () => {
    // Example 12-digit INN (individual)
    // 500100732259
    assert.strictEqual(isValidRussianInn('500100732259'), true);
    assert.strictEqual(isValidRussianInn('500100732258'), false);
  });
});

describe('isValidRussianPassport', () => {
  test('returns true for null/undefined/empty string', () => {
    assert.strictEqual(isValidRussianPassport(null), true);
    assert.strictEqual(isValidRussianPassport(undefined), true);
    assert.strictEqual(isValidRussianPassport(''), true);
  });

  test('returns true for 10 digits', () => {
    assert.strictEqual(isValidRussianPassport('12 34 567890'), true);
    assert.strictEqual(isValidRussianPassport('1234567890'), true);
  });

  test('returns false for !== 10 digits', () => {
    assert.strictEqual(isValidRussianPassport('12 34 56789'), false);
    assert.strictEqual(isValidRussianPassport('12345678901'), false);
  });
});
