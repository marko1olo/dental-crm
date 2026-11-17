/**
 * clinicalTermsExtractor.test.ts — Тесты канонического сервиса извлечения клинических терминов DENTE.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractClinicalTerms } from "../clinicalTermsExtractor";

describe("clinicalTermsExtractor", () => {
  it("корректно извлекает номера зубов FDI и диагнозы", () => {
    const parsed = extractClinicalTerms("Пациент Иванов, зуб 16 кариес дентина, также зуб 36 пульпит");
    assert.deepEqual(parsed.teeth, [16, 36]);
    assert.ok(parsed.diagnoses.some((d) => d.includes("кариес")));
    assert.ok(parsed.diagnoses.some((d) => d.includes("пульпит")));
  });

  it("корректно извлекает анестетики", () => {
    const parsed = extractClinicalTerms("Выполнена инфильтрационная анестезия септанест 1.7 мл");
    assert.ok(parsed.anesthetics.includes("септанест"));
  });

  it("корректно извлекает материалы и изолирующие прокладки", () => {
    const parsed = extractClinicalTerms("Наложен коффердам и оптрагейт, изолирующая прокладка sdr");
    assert.ok(parsed.materials.includes("коффердам"));
    assert.ok(parsed.materials.includes("оптрагейт"));
    assert.ok(parsed.materials.includes("sdr"));
  });

  it("возвращает пустые списки для нейтрального текста", () => {
    const parsed = extractClinicalTerms("Доброе утро, начинаем рабочий день");
    assert.deepEqual(parsed.teeth, []);
    assert.deepEqual(parsed.diagnoses, []);
    assert.deepEqual(parsed.anesthetics, []);
  });
});
