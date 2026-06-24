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
});
