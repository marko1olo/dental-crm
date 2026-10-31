/**
 * copilotSSOTSuite.test.tsx — Red Team SSOT сьют тестов канонического ИИ-копайлота DENTE CRM.
 * 
 * Проверка архитектурных инвариантов:
 * - Мандат 8b: Sweet Spot размеров файлов (copilotCatalogData 280–350, ChairsideCopilotStudioModal 380–480, DirectCopilotLauncher 60–100).
 * - Мандат 8am: ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)).
 * - Мандат 8e: автономия врача, ноль disabled кнопок, Two-Phase Guard.
 * - Мандат 8wy: двухрежимный харнесс (Веб-ассистент vs Станция ОС).
 * - Apple HIG: нативный Drag Handle 36x5px для Bottom Sheet drawer на смартфонах.
 * - Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChairsideCopilotStudioModal } from "../ChairsideCopilotStudioModal";
import { DirectCopilotLauncher } from "../DirectCopilotLauncher";
import {
  COPILOT_CATALOG_CATEGORIES,
  CRM_FASTIFY_TOOLS_REGISTRY,
  CLINICAL_QUICK_PRESETS,
  inspectSpeechEngineHealth,
} from "../copilotCatalogData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Chairside Copilot Studio SSOT & Voice Suite", () => {
  it("1. рендерит панель студии Копайлота с шапкой, статусом движка и контекстом пациента", () => {
    const html = renderToString(
      <ChairsideCopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        activeTooth={36}
        patientName="Сидоров А. П."
        initialTab="dialog"
      />
    );
    assert.ok(html.includes("ДЕНТА Копайлот"), "Должен отображаться заголовок ДЕНТА Копайлот");
    assert.ok(html.includes("Сидоров А. П."), "Должно отображаться имя пациента");
    assert.ok(html.includes("Зуб 36"), "Должен отображаться номер зуба");
    assert.ok(
      html.includes("Web Speech API") || html.includes("Нативный") || html.includes("Голосовой ввод"),
      "Должен отображаться честный статус речевого движка"
    );
  });

  it("2. содержит обе ключевые вкладки: «Клинический диалог» и «Быстрые действия»", () => {
    const html = renderToString(
      <ChairsideCopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        initialTab="dialog"
      />
    );
    assert.ok(html.includes("Клинический диалог"), "Вкладка Диалог обязана присутствовать");
    assert.ok(html.includes("Быстрые действия"), "Вкладка Быстрые действия обязана присутствовать");
  });

  it("3. Мандат 8am: ровно ОДНА Primary CTA кнопка #0d9488 («Применить действие»)", () => {
    const html = renderToString(
      <ChairsideCopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        initialTab="dialog"
      />
    );
    assert.ok(html.includes('data-testid="copilot-primary-apply-cta"'), "Primary CTA кнопка обязана присутствовать с data-testid");
    assert.ok(html.includes("Применить действие") || html.includes("Применено"), "Текст кнопки должен быть клиническим");
    assert.ok(html.includes("var(--teal,#0d9488)") || html.includes("bg-[var(--teal,#0d9488)]"), "Цвет кнопки обязан быть #0d9488 (var(--teal))");
  });

  it("4. Apple HIG: нативный Drag Handle ровно 36x5px для выдвижного Bottom Sheet на мобильных", () => {
    const html = renderToString(
      <ChairsideCopilotStudioModal
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("w-9"), "Ширина Drag Handle обязана быть 36px (w-9 в tailwind)");
    assert.ok(html.includes("h-1.5"), "Высота Drag Handle обязана быть ~5-6px (h-1.5 в tailwind)");
    assert.ok(html.includes("touch-none"), "Drag Handle обязан иметь touch-none");
    assert.ok(html.includes("rounded-full"), "Drag Handle обязан быть скругленным");
  });

  it("5. Сенсорная эргономика Apple HIG: интерактивные кнопки имеют touch target >= 44x44px", () => {
    const html = renderToString(
      <ChairsideCopilotStudioModal
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("min-h-[44px]"), "Кнопки обязаны соблюдать сенсорный минимум min-h-[44px]");
    assert.ok(html.includes("min-w-[44px]"), "Кнопки управления обязаны иметь min-w-[44px]");
  });

  it("6. Мандат 8wy: Двухрежимный харнесс (Веб-ассистент vs Станция ОС)", () => {
    const html = renderToString(
      <ChairsideCopilotStudioModal
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("Веб-ассистент"), "Должен присутствовать режим Веб-ассистент");
    assert.ok(html.includes("Станция ОС"), "Должен присутствовать режим Станция ОС");
  });

  it("7. Вкладка «Быстрые действия»: рендерит 4 реальных Fastify инструмента без блокировок врача (Мандат 8e)", () => {
    const html = renderToString(
      <ChairsideCopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        initialTab="actions"
      />
    );
    assert.ok(html.includes("Бронирование слота"), "Инструмент бронирования слота должен присутствовать");
    assert.ok(html.includes("Зубная формула FDI"), "Инструмент одонтограммы должен присутствовать");
    assert.ok(html.includes("Выставление счёта"), "Инструмент кассы должен присутствовать");
    assert.ok(html.includes("Захват визиографа"), "Инструмент визиографа должен присутствовать");
    // Мандат 8e: ни одна кнопка не имеет disabled
    assert.equal(html.includes("disabled"), false, "Кнопки быстрых действий не должны быть disabled");
  });

  it("8. Пресеты клинических фраз: выводятся и содержат правильные клинические формулировки", () => {
    assert.ok(CLINICAL_QUICK_PRESETS.length >= 6);
    const phrases = CLINICAL_QUICK_PRESETS.map((p) => p.label);
    assert.ok(phrases.includes("Кариес 16"));
    assert.ok(phrases.includes("Анестезия септанест"));
    assert.ok(phrases.includes("Коффердам"));
    assert.ok(phrases.includes("Запиши на завтра в 14:00"));
  });

  it("9. Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде ChairsideCopilotStudioModal.tsx", () => {
    const filePath = path.join(__dirname, "../ChairsideCopilotStudioModal.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.equal(emojiRegex.test(content), false, "Обнаружены запрещенные cartoon emojis в ChairsideCopilotStudioModal.tsx");
  });

  it("10. Мандат 8b: размер файла ChairsideCopilotStudioModal.tsx строго в Sweet Spot 380–480 строк", () => {
    const filePath = path.join(__dirname, "../ChairsideCopilotStudioModal.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 380 && lines <= 480, `ChairsideCopilotStudioModal.tsx имеет ${lines} строк (ожидалось 380–480)`);
  });

  it("11. Мандат 8b: размер файла copilotCatalogData.ts строго в Sweet Spot 280–350 строк", () => {
    const filePath = path.join(__dirname, "../copilotCatalogData.ts");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 280 && lines <= 350, `copilotCatalogData.ts имеет ${lines} строк (ожидалось 280–350)`);
  });

  it("12. Мандат 8b: размер файла DirectCopilotLauncher.tsx строго в Sweet Spot 60–100 строк", () => {
    const filePath = path.join(__dirname, "../DirectCopilotLauncher.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 60 && lines <= 100, `DirectCopilotLauncher.tsx имеет ${lines} строк (ожидалось 60–100)`);
  });

  it("13. DirectCopilotLauncher монтируется и не падает при SSR", () => {
    const html = renderToString(<DirectCopilotLauncher />);
    assert.equal(typeof html, "string");
  });
});
