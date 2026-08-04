import { describe, test } from 'node:test';
import assert from 'node:assert';
import { splitLine, isValidRussianInn, isValidRussianSnils } from '../utils/strings.js';

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

  test('returns false for all identical digits', () => {
    assert.strictEqual(isValidRussianSnils('11111111111'), false);
    assert.strictEqual(isValidRussianSnils('00000000000'), false);
    assert.strictEqual(isValidRussianSnils('999-999-999 99'), false);
  });

  test('returns true for numPart <= 1001001 without checksum validation', () => {
    assert.strictEqual(isValidRussianSnils('001-001-001 99'), true);
    assert.strictEqual(isValidRussianSnils('001-001-001 00'), true);
    assert.strictEqual(isValidRussianSnils('000-000-001 12'), true);
  });

  test('validates correctly when sum < 100', () => {
    // 112 233 445 = 1*9+1*8+2*7+2*6+3*5+3*4+4*3+4*2+5*1 = 95
    assert.strictEqual(isValidRussianSnils('112-233-445 95'), true);
    assert.strictEqual(isValidRussianSnils('112-233-445 96'), false);
  });

  test('validates correctly when sum === 100', () => {
    // 001 019 989 sum is exactly 100
    assert.strictEqual(isValidRussianSnils('001-019-989 00'), true);
    assert.strictEqual(isValidRussianSnils('001-019-989 99'), false);
  });

  test('validates correctly when sum === 101', () => {
    // 001 019 998 sum is exactly 101
    assert.strictEqual(isValidRussianSnils('001-019-998 00'), true);
    assert.strictEqual(isValidRussianSnils('001-019-998 01'), false);
  });

  test('validates correctly when sum > 101', () => {
    // 001 019 999 sum is exactly 102 (rem 102 % 101 = 1)
    assert.strictEqual(isValidRussianSnils('001-019-999 01'), true);
    assert.strictEqual(isValidRussianSnils('001-019-999 00'), false);

    // Test rem === 100 or rem === 101 condition in the rem block
    // We need sum = 101 + 100 = 201 or sum = 101 + 101 = 202
    // Max sum possible: 9*9 + 9*8 + 9*7 + 9*6 + 9*5 + 9*4 + 9*3 + 9*2 + 9*1 = 9 * 45 = 405
    // Let's test a valid SNILS found in the wild or construct one
    assert.strictEqual(isValidRussianSnils('444-444-444 00'), false); // sum = 4 * 45 = 180, rem = 180%101 = 79. Control should be 79.
    assert.strictEqual(isValidRussianSnils('444-444-444 79'), true);
  });

  test('handles formatting characters (spaces, hyphens)', () => {
    assert.strictEqual(isValidRussianSnils(' 112-233-445 95 '), true);
    assert.strictEqual(isValidRussianSnils('112 233 445-95'), true);
    assert.strictEqual(isValidRussianSnils('11223344595'), true);
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
