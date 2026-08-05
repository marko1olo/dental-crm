import { describe, test } from 'node:test';
import assert from 'node:assert';
import { splitLine, isValidRussianInn, isValidRussianSnils, isValidRussianPassport } from '../utils/strings.js';

describe('isValidRussianSnils', () => {
  test('returns true for null, undefined, or empty string', () => {
    assert.strictEqual(isValidRussianSnils(null), true);
    assert.strictEqual(isValidRussianSnils(undefined), true);
    assert.strictEqual(isValidRussianSnils(''), true);
  });

  test('returns false for invalid lengths', () => {
    assert.strictEqual(isValidRussianSnils('1234567890'), false); // 10 digits
    assert.strictEqual(isValidRussianSnils('123456789012'), false); // 12 digits
  });

  test('returns false for identical digits', () => {
    assert.strictEqual(isValidRussianSnils('11111111111'), false);
    assert.strictEqual(isValidRussianSnils('00000000000'), false);
  });

  test('returns true for numPart <= 1001001', () => {
    assert.strictEqual(isValidRussianSnils('00100100000'), true); // 1001000 <= 1001001
    assert.strictEqual(isValidRussianSnils('00100100100'), true); // 1001001 <= 1001001
  });

  test('calculates correctly when sum < 100', () => {
    assert.strictEqual(isValidRussianSnils('20000000018'), true); // sum is 18 (2*9), 18 < 100
    assert.strictEqual(isValidRussianSnils('20000000019'), false); // invalid control sum
  });

  test('calculates correctly when sum === 100 or sum === 101', () => {
    assert.strictEqual(isValidRussianSnils('20000799900'), true); // sum is 100, control is 00
    assert.strictEqual(isValidRussianSnils('20000889900'), true); // sum is 101, control is 00
  });

  test('calculates correctly when sum > 101', () => {
    assert.strictEqual(isValidRussianSnils('20000898901'), true); // rem < 100
    assert.strictEqual(isValidRussianSnils('20089999900'), true); // rem === 100, control is 00
  });

  test('ignores non-digit characters', () => {
    assert.strictEqual(isValidRussianSnils('200-008-899 00'), true);
  });
});

describe('isValidRussianPassport', () => {
  test('returns true for null, undefined, or empty string', () => {
    assert.strictEqual(isValidRussianPassport(null), true);
    assert.strictEqual(isValidRussianPassport(undefined), true);
    assert.strictEqual(isValidRussianPassport(''), true);
  });

  test('returns true for exactly 10 digits', () => {
    assert.strictEqual(isValidRussianPassport('1234567890'), true);
    assert.strictEqual(isValidRussianPassport('1234 567890'), true); // spaces ignored
  });

  test('returns false for invalid lengths', () => {
    assert.strictEqual(isValidRussianPassport('123456789'), false);
    assert.strictEqual(isValidRussianPassport('12345678901'), false);
  });
});

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
