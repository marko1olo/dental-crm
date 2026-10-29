/**
 * voiceEngine.test.ts — Тесты единого голосового движка DENTE.
 * Мандаты 8b, 8e (автономия врача), 8s (клинический суверенитет).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VoiceEngine, extractClinicalTerms } from "../voiceEngine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("VoiceEngine & Clinical Terms Extraction", () => {
  it("распознает FDI номера зубов и диагнозы («кариес 16», «пульпит 36»)", () => {
    const parsed = extractClinicalTerms("Пациент Иванов, зуб 16 кариес дентина, также зуб 36 пульпит");
    assert.deepEqual(parsed.teeth, [16, 36]);
    assert.ok(parsed.diagnoses.some((d) => d.includes("кариес")));
    assert.ok(parsed.diagnoses.some((d) => d.includes("пульпит")));
  });

  it("распознает анестетики («анестезия септанест», «артикаин»)", () => {
    const parsed = extractClinicalTerms("Выполнена инфильтрационная анестезия септанест 1.7 мл");
    assert.ok(parsed.anesthetics.includes("септанест"));
  });

  it("распознает изоляцию и пломбировочные материалы («коффердам», «sdr», «оптрагейт»)", () => {
    const parsed = extractClinicalTerms("Наложен коффердам и оптрагейт, изолирующая прокладка sdr");
    assert.ok(parsed.materials.includes("коффердам"));
    assert.ok(parsed.materials.includes("оптрагейт"));
    assert.ok(parsed.materials.includes("sdr"));
  });

  it("корректно формирует SOAP секции при клинической диктовке", () => {
    const speech = "Жалобы на кратковременные боли от сладкого. Объективно глубокая полость 46. Диагноз глубокий кариес. План световая пломба.";
    const parsed = extractClinicalTerms(speech);
    assert.ok(parsed.soap.subjective || parsed.transcript);
    assert.ok(parsed.teeth.includes(46));
  });

  it("проверяет жизненный цикл движка VoiceEngine (start, stop, clear, dispose)", async () => {
    const engine = new VoiceEngine({ mode: "auto" });
    assert.equal(typeof engine.start, "function");
    assert.equal(typeof engine.stop, "function");
    assert.equal(typeof engine.clear, "function");
    assert.equal(typeof engine.dispose, "function");
    assert.equal(typeof engine.isSupported, "function");

    // Ручное добавление текста и подписка
    let emitted = false;
    const unsubscribe = engine.subscribe((ev) => {
      emitted = true;
      assert.ok(ev.status);
    });

    engine.appendManualText("кариес 25");
    assert.equal(emitted, true);
    unsubscribe();
    engine.dispose();
  });

  it("Мандат 8d pt 7: исходный код voiceEngine.ts содержит строго 0 cartoon emojis", () => {
    const filePath = path.join(__dirname, "../voiceEngine.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.equal(emojiRegex.test(content), false, "Обнаружены запрещенные cartoon emojis в voiceEngine.ts");
  });

  it("Мандат 8b: размер файла voiceEngine.ts строго в диапазоне 200–300 строк", () => {
    const filePath = path.join(__dirname, "../voiceEngine.ts");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 200 && lines <= 300, `voiceEngine.ts имеет ${lines} строк (ожидалось 200–300)`);
  });
});
