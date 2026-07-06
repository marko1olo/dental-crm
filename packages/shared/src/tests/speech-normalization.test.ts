import { test, describe } from 'node:test';
import assert from 'node:assert';
import { normalizeDentalSpeechTranscript } from '../index.js';

describe('normalizeDentalSpeechTranscript', () => {
  test('basic cleaning', () => {
    const result = normalizeDentalSpeechTranscript("  text   with   spaces  ");
    assert.strictEqual(result.normalizedText, "text with spaces");
    assert.ok(result.warnings.includes("Нормализация диктовки только чистит текст и секции, не добавляет клинические факты."));
    assert.ok(result.warnings.includes("Фокус нормализации: осмотр."));
    assert.ok(result.warnings.includes("Номер зуба не найден автоматически: врачу нужно проверить запись."));
  });

  test('tooth number normalization', () => {
    const result = normalizeDentalSpeechTranscript("один один");
    assert.strictEqual(result.normalizedText, "11");
    assert.ok(result.changedPhrases.includes("номер зуба -> 11"));
    assert.ok(!result.warnings.includes("Номер зуба не найден автоматически: врачу нужно проверить запись."));
  });

  test('terminology mapping', () => {
    const result = normalizeDentalSpeechTranscript("к л к т 12");
    assert.strictEqual(result.normalizedText, "КЛКТ 12");
  });

  test('punctuation cleaning', () => {
    const result = normalizeDentalSpeechTranscript("зуб 11 , кариес .");
    assert.strictEqual(result.normalizedText, "зуб 11, кариес.");
  });

  test('diagnosis warnings', () => {
    const result = normalizeDentalSpeechTranscript("кариес 12");
    assert.ok(result.warnings.includes("В тексте есть диагноз/код: система не подтверждает его автоматически."));
  });

  test('specialty label', () => {
    const result = normalizeDentalSpeechTranscript("текст 11", "surgeon");
    assert.ok(result.warnings.includes("Фокус нормализации: хирургия."));
  });
});
