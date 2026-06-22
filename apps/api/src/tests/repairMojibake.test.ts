import { test, describe } from 'node:test';
import assert from 'node:assert';
import { repairMojibakeDeep } from '../text/repairMojibake.js';

describe('repairMojibakeDeep', () => {
  test('repairs deep mojibake correctly', () => {
    const input = {
      name: "Ð\u0098Ð²Ð°Ð½", // Иван
      profile: {
        address: "Ð\u009CÐ¾Ñ\u0081ÐºÐ²Ð°", // Москва
        tags: ["Ð²Ñ\u0080Ð°Ñ\u0087", "Ð¿Ð°Ñ\u0086Ð¸ÐµÐ½Ñ\u0082"], // врач, пациент
        age: 30,
        isVerified: true,
        metadata: null
      },
      status: 200,
      active: true,
      data: null,
      history: [
        {
          date: "2023-01-01",
          note: "Ð\u009EÐ±Ñ\u0081Ð»ÐµÐ´Ð¾Ð²Ð°Ð½Ð¸Ðµ", // Обследование
          details: {
            doctor: "Ð\u009FÐµÑ\u0082Ñ\u0080Ð¾Ð²" // Петров
          }
        }
      ]
    };

    const result = repairMojibakeDeep(input);

    assert.deepStrictEqual(result, {
      name: "Иван",
      profile: {
        address: "Москва",
        tags: ["врач", "пациент"],
        age: 30,
        isVerified: true,
        metadata: null
      },
      status: 200,
      active: true,
      data: null,
      history: [
        {
          date: "2023-01-01",
          note: "Обследование",
          details: {
            doctor: "Петров"
          }
        }
      ]
    });
  });

  test('does not modify non-string primitive values', () => {
    const input = {
      num: 42,
      bool: false,
      nil: null,
      undef: undefined,
      arr: [1, 2, 3]
    };

    const result = repairMojibakeDeep(input);
    assert.deepStrictEqual(result, input);
  });
});
