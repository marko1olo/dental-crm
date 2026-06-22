import { test, describe } from 'node:test';
import assert from 'node:assert';
import { repairMojibakeDeep } from './repairMojibake.js';

describe('repairMojibakeDeep', () => {
  test('returns primitives as-is', () => {
    assert.strictEqual(repairMojibakeDeep(null), null);
    assert.strictEqual(repairMojibakeDeep(undefined), undefined);
    assert.strictEqual(repairMojibakeDeep(42), 42);
    assert.strictEqual(repairMojibakeDeep(true), true);
    assert.strictEqual(repairMojibakeDeep(false), false);
  });

  test('repairs string values', () => {
    // Standard string
    assert.strictEqual(repairMojibakeDeep('Hello world'), 'Hello world');
    // Mojibake string
    assert.strictEqual(repairMojibakeDeep('ÐŸÑ€Ð¸Ð²ÐµÑ‚'), 'Привет');
  });

  test('repairs arrays deeply', () => {
    const input = [1, 'ÐŸÑ€Ð¸Ð²ÐµÑ‚', [null, 'ÐœÐ¸Ñ€']];
    const expected = [1, 'Привет', [null, 'Мир']];
    assert.deepStrictEqual(repairMojibakeDeep(input), expected);
  });

  test('repairs objects deeply', () => {
    const input = {
      id: 123,
      name: 'ÐŸÑ€Ð¸Ð²ÐµÑ‚',
      nested: {
        value: 'ÐœÐ¸Ñ€',
        flag: true
      }
    };
    const expected = {
      id: 123,
      name: 'Привет',
      nested: {
        value: 'Мир',
        flag: true
      }
    };
    assert.deepStrictEqual(repairMojibakeDeep(input), expected);
  });

  test('repairs complex nested structures', () => {
    const input = {
      data: [
        { title: 'Ð—Ð°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº', count: 1 },
        { title: 'Test', count: 2 }
      ],
      meta: 'ÐžÐ¿Ð¸ÑÐ°Ð½Ð¸Ðµ'
    };
    const expected = {
      data: [
        { title: 'Заголовок', count: 1 },
        { title: 'Test', count: 2 }
      ],
      meta: 'Описание'
    };
    assert.deepStrictEqual(repairMojibakeDeep(input), expected);
  });
});
