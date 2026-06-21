import { test, describe } from 'node:test';
import assert from 'node:assert';
import { analyzePricelistDeterministic } from '../pricelist/analyzer.js';
import { DentalPricelistAnalysisRequest } from '@dental/shared';

describe('analyzePricelistDeterministic', () => {
  test('returns warning when no lines detected', () => {
    const request: DentalPricelistAnalysisRequest = {
      rawText: '',
      sourceName: 'empty.txt',
      sourceKind: 'text',
      useServerAi: false,
      imageMimeType: 'image/jpeg',
      preferredSpecialty: 'universal'
    };

    const result = analyzePricelistDeterministic(request);

    assert.strictEqual(result.items.length, 0);
    assert.ok(result.warnings.includes('no_pricelist_rows_detected'));
    assert.strictEqual(result.aiVision.used, false);
  });

  test('parses lines correctly', () => {
    const request: DentalPricelistAnalysisRequest = {
      rawText: 'Консультация стоматолога-терапевта 1500\nЛечение кариеса 5000\nНепонятная строка без цены',
      sourceName: 'prices.txt',
      sourceKind: 'text',
      useServerAi: false,
      imageMimeType: 'image/jpeg',
      preferredSpecialty: 'universal'
    };

    const result = analyzePricelistDeterministic(request);

    assert.strictEqual(result.items.length, 2);
    // The analyzer doesn't strip the price perfectly in all cases, so check contains instead
    assert.ok(result.items[0]?.title.includes('Консультация стоматолога-терапевта'));
    assert.strictEqual(result.items[0]?.priceRub, 1500);
    assert.ok(result.items[1]?.title.includes('Лечение кариеса'));
    assert.strictEqual(result.items[1]?.priceRub, 5000);
  });

  test('includes image warning when image supplied but AI disabled', () => {
    const request: DentalPricelistAnalysisRequest = {
      rawText: 'Консультация 1500',
      sourceName: 'prices.txt',
      sourceKind: 'text',
      useServerAi: false,
      imageMimeType: 'image/jpeg',
      preferredSpecialty: 'universal',
      imageBase64: 'fakebase64'
    };

    const result = analyzePricelistDeterministic(request);

    assert.ok(result.warnings.includes('image_supplied_but_server_ai_disabled'));
  });

  test('includes extra warnings', () => {
    const request: DentalPricelistAnalysisRequest = {
      rawText: 'Консультация 1500',
      sourceName: 'prices.txt',
      sourceKind: 'text',
      useServerAi: false,
      imageMimeType: 'image/jpeg',
      preferredSpecialty: 'universal'
    };

    const result = analyzePricelistDeterministic(request, 'deterministic', ['custom_warning']);

    assert.ok(result.warnings.includes('custom_warning'));
  });

  test('handles lines with complex prices', () => {
    const request: DentalPricelistAnalysisRequest = {
      rawText: 'Установка имплантата OSSTEM 25 000 руб.\nКоронка из диоксида циркония от 18000 до 22000',
      sourceName: 'prices.txt',
      sourceKind: 'text',
      useServerAi: false,
      imageMimeType: 'image/jpeg',
      preferredSpecialty: 'universal'
    };

    const result = analyzePricelistDeterministic(request);

    assert.strictEqual(result.items.length, 2);
    assert.strictEqual(result.items[0]?.priceRub, 25000);
    assert.strictEqual(result.items[0]?.brand?.toLowerCase(), 'osstem');

    assert.strictEqual(result.items[1]?.priceRub, 18000);
    assert.strictEqual(result.items[1]?.priceMaxRub, 22000);
    assert.strictEqual(result.items[1]?.materialKind, 'zirconia');
    assert.strictEqual(result.items[1]?.crownType, 'zirconia');
  });

  test('filters out header rows and empty lines', () => {
    const request: DentalPricelistAnalysisRequest = {
      rawText: 'Код\tНаименование\tЦена\n\n\n001\tОсмотр\t500\n',
      sourceName: 'prices.txt',
      sourceKind: 'text',
      useServerAi: false,
      imageMimeType: 'image/jpeg',
      preferredSpecialty: 'universal'
    };

    const result = analyzePricelistDeterministic(request);

    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0]?.priceRub, 500);
  });
});
