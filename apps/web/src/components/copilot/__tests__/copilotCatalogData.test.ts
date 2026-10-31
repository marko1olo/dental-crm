/**
 * copilotCatalogData.test.ts — Тесты для канонического SSOT-каталога команд и навыков Копайлота.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  COPILOT_CATALOG_CATEGORIES,
  CRM_FASTIFY_TOOLS_REGISTRY,
  CLINICAL_QUICK_PRESETS,
  getCatalogItemsByMode,
  findCatalogItemById,
  inspectSpeechEngineHealth,
} from "../copilotCatalogData";
import { DEFAULT_SUGGESTION_CATEGORIES } from "../suggestions/copilotSuggestionPresets";

describe("Copilot Catalog Data & SSOT Architecture", () => {
  it("размер copilotCatalogData.ts строго в Sweet Spot (280–350 строк, Мандат 8b)", () => {
    const filePath = path.resolve(process.cwd(), "apps/web/src/components/copilot/copilotCatalogData.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    const lineCount = content.split("\n").length;
    assert.ok(
      lineCount >= 280 && lineCount <= 350,
      `Размер copilotCatalogData.ts равен ${lineCount} строк (ожидается 280–350 строк)`
    );
  });

  it("содержит обязательные категории: приём у кресла, финансы, рабочая станция, расписание, протоколы", () => {
    const ids = COPILOT_CATALOG_CATEGORIES.map((c) => c.id);
    assert.ok(ids.includes("chairside"), "Должна присутствовать категория chairside");
    assert.ok(ids.includes("billing"), "Должна присутствовать категория billing");
    assert.ok(ids.includes("workstation"), "Должна присутствовать категория workstation");
    assert.ok(ids.includes("schedule"), "Должна присутствовать категория schedule");
    assert.ok(ids.includes("knowledge"), "Должна присутствовать категория knowledge");
  });

  it("не содержит сырых номеров советских приказов в пользовательских текстах (Мандат 8x)", () => {
    for (const cat of COPILOT_CATALOG_CATEGORIES) {
      assert.doesNotMatch(cat.title, /043\/у|804н|54-ФЗ/i, `Категория ${cat.id} содержит запрещенный канцелярит`);
      for (const item of cat.items) {
        assert.doesNotMatch(item.label, /043\/у|804н|54-ФЗ/i, `Элемент ${item.id} содержит запрещенный канцелярит в label`);
        assert.doesNotMatch(item.prompt, /043\/у|804н|54-ФЗ/i, `Элемент ${item.id} содержит запрещенный канцелярит в prompt`);
        assert.doesNotMatch(item.description, /043\/у|804н|54-ФЗ/i, `Элемент ${item.id} содержит запрещенный канцелярит в description`);
      }
    }
  });

  it("поддерживает двухрежимную фильтрацию по режимам web_browser и desktop_native (Мандат 8wy)", () => {
    const webItems = getCatalogItemsByMode("web_browser");
    const desktopItems = getCatalogItemsByMode("desktop_native");

    assert.ok(webItems.length > 0, "Должны быть элементы веб-режима");
    assert.ok(desktopItems.length > 0, "Должны быть элементы рабочего места ПК");

    const rvgItem = desktopItems.find((it) => it.id === "workstation-rvg-capture");
    assert.ok(rvgItem, "Режим рабочей станции обязан содержать инструмент оптического захвата RVG");
    assert.equal(rvgItem?.mode, "desktop_native");

    const diaryItem = webItems.find((it) => it.id === "chairside-diary");
    assert.ok(diaryItem, "Веб-режим обязан содержать заполнение дневника приёма");
  });

  it("находит элемент по идентификатору через findCatalogItemById", () => {
    const item = findCatalogItemById("billing-estimate-3-tiers");
    assert.ok(item, "Должен найти элемент расчета 3 тарифов сметы");
    assert.equal(item?.label, "Рассчитать 3 тарифа сметы");
    assert.equal(item?.requiresConfirmation, false, "Расчет сметы безопасен и не требует подтверждения");
  });

  it("содержит реестр боевых тулов и пресеты клинических фраз (Мандат 8e)", () => {
    assert.ok(CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus.includes("updateToothState"));
    assert.ok(CRM_FASTIFY_TOOLS_REGISTRY.createAppointmentSlot.includes("createAppointment"));
    assert.ok(CRM_FASTIFY_TOOLS_REGISTRY.generateSoapDiary.includes("saveVisitDiary"));
    assert.ok(CRM_FASTIFY_TOOLS_REGISTRY.calcInvoiceKopecks.includes("calculateTreatmentEstimate"));

    assert.ok(CLINICAL_QUICK_PRESETS.length >= 6);
    const cariesPreset = CLINICAL_QUICK_PRESETS.find((p) => p.label === "Кариес 16");
    assert.ok(cariesPreset);
    assert.equal(cariesPreset?.actionBadge, "Одонтограмма");
  });

  it("проверяет честный статус речевых движков через inspectSpeechEngineHealth", () => {
    const reportOffline = inspectSpeechEngineHealth();
    assert.ok(["webspeech", "unsupported"].includes(reportOffline.engine));

    const cloudReport = inspectSpeechEngineHealth({
      health: {
        "gemini:key1": { consecutiveFailures: 0, cooldownUntil: 0 },
      },
    });
    assert.equal(cloudReport.engine, "gemini_cloud");
    assert.equal(cloudReport.status, "operational");
    assert.ok(cloudReport.label.includes("Gemini"));
  });

  it("корректно связывает DEFAULT_SUGGESTION_CATEGORIES с единым каталогом", () => {
    assert.ok(DEFAULT_SUGGESTION_CATEGORIES.length >= 4, "Должно быть не менее 4 категорий предложений");
    const firstCategory = DEFAULT_SUGGESTION_CATEGORIES[0];
    assert.equal(firstCategory.category, "Клинический приём у кресла");
    assert.ok(firstCategory.items.length >= 3, "Первая категория содержит клинические действия");
  });
});
