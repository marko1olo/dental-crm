import { test, describe } from 'node:test';
import assert from 'node:assert';
import { repairMojibakeText, repairMojibakeDeep } from '../text/repairMojibake.js';

describe('repairMojibakeText', () => {
  test('returns normal ascii strings unchanged', () => {
    const input = "Hello world!";
    assert.strictEqual(repairMojibakeText(input), input);
  });

  test('returns normal cyrillic strings unchanged', () => {
    const input = "Привет, мир!";
    assert.strictEqual(repairMojibakeText(input), input);
  });

  test('repairs fully mangled cyrillic mojibake', () => {
    const input = "Ð\u0098Ð²Ð°Ð½"; // Иван
    const expected = "Иван";
    assert.strictEqual(repairMojibakeText(input), expected);
  });

  test('repairs token-mixed strings with mojibake', () => {
    const input = "Hello Ð\u0098Ð²Ð°Ð½";
    const expected = "Hello Иван";
    assert.strictEqual(repairMojibakeText(input), expected);
  });

  test('repairs various common mojibake strings', () => {
    assert.strictEqual(repairMojibakeText("ÐŸÑ€Ð¸Ð²ÐµÑ‚"), "Привет");
    assert.strictEqual(repairMojibakeText("Hello ÐŸÑ€Ð¸Ð²ÐµÑ‚ world"), "Hello Привет world");
    assert.strictEqual(repairMojibakeText("ÐœÐ¸Ñ€"), "Мир");
    assert.strictEqual(repairMojibakeText("Ð—Ð°Ð³Ð¾Ð»Ð¾Ð²Ð¾Ðº"), "Заголовок");
    assert.strictEqual(repairMojibakeText("ÐžÐ¿Ð¸Ñ\u0081Ð°Ð½Ð¸Ðµ"), "Описание");
  });

  test('gracefully handles likely mojibake that cannot be decoded', () => {
    const input = "?\u0300\u0301\u0302 invalid";
    assert.strictEqual(repairMojibakeText(input), input);
  });
});

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
