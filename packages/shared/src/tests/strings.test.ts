import { describe, test } from 'node:test';
import assert from 'node:assert';
import { splitLine } from '../utils/strings.js';

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

  test('handles whitespace around empty elements', () => {
    assert.deepStrictEqual(splitLine('a, ,c', ','), ['a', '', 'c']);
  });

  test('handles quotes used as escape for delimiter only', () => {
    assert.deepStrictEqual(splitLine('","', ','), [',']);
  });

  test('handles quotes adjacent to characters without delimiters', () => {
    assert.deepStrictEqual(splitLine('a,"b""c",d', ','), ['a', 'bc', 'd']);
  });

  test('handles strings with no delimiters', () => {
    assert.deepStrictEqual(splitLine('abc', ','), ['abc']);
    assert.deepStrictEqual(splitLine('a b c', ','), ['a b c']);
  });

  test('handles strings with newlines', () => {
    assert.deepStrictEqual(splitLine('a,\n,c', ','), ['a', '', 'c']);
    assert.deepStrictEqual(splitLine('a,"b\nc",d', ','), ['a', 'b\nc', 'd']);
    assert.deepStrictEqual(splitLine('line1\nline2,line3', ','), ['line1\nline2', 'line3']);
  });

  test('handles quoted delimiters at the very end', () => {
    assert.deepStrictEqual(splitLine('a,b,"c,"', ','), ['a', 'b', 'c,']);
  });

  test('handles quotes in the middle of a string', () => {
    assert.deepStrictEqual(splitLine('a"b"c', ','), ['abc']);
  });


  test('handles multi-character delimiters (current behavior)', () => {
    // Current behavior uses strict character matching against the whole delimiter string instead of substrings,
    // so character by character it only splits if 'char === delimiter', which only happens for 1-char strings.
    // If we pass a multi-character delimiter, it'll never match a single character.
    assert.deepStrictEqual(splitLine('a||b||c', '||'), ['a||b||c']);
  });

});
