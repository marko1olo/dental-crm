/**
 * copilotStudioSSOT.test.tsx — Строгий SSOT Vitest сьют для ИИ-Копайлота и голосового контура DENTE CRM.
 * 
 * Архитектурные инварианты:
 * - Мандат 8b: Sweet Spot размеров файлов (copilotCatalogData 300–380, CopilotStudioModal 400–480, DirectCopilotLauncher 60–80, copilotStudio.css 300–400).
 * - Мандат 8am: ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)).
 * - Мандат 8e: автономия врача, ноль disabled кнопок у врача, Two-Phase Guard.
 * - Мандат 8wy: двухрежимный харнесс (Веб-ассистент Fastify API vs Станция ОС).
 * - Apple HIG: нативный Drag Handle 36x5px для Bottom Sheet drawer на смартфонах, сенсорные зоны >= 44x44px.
 * - Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotStudioModal } from "../CopilotStudioModal";
import { DirectCopilotLauncher } from "../DirectCopilotLauncher";
import { CopilotWorkstationTab } from "../CopilotWorkstationTab";
import { useCopilotStore } from "../../../store/copilotStore";
import { setRuntimeDemoMode } from "../../../lib/demoMode";
import {
  COPILOT_CATALOG_CATEGORIES,
  CRM_FASTIFY_TOOLS_REGISTRY,
  CLINICAL_QUICK_PRESETS,
  inspectSpeechEngineHealth,
} from "../copilotCatalogData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Copilot Studio SSOT & Clinical Voice Suite", () => {
  it("1. рендерит панель студии Копайлота с клинической шапкой и честным статусом речевого движка", () => {
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        activeTooth={36}
        patientName="Петров С. В."
        initialTab="dialog"
      />
    );
    assert.ok(html.includes("ДЕНТА Копайлот"), "Заголовок ДЕНТА Копайлот обязан отображаться");
    assert.ok(html.includes("Петров С. В."), "Имя пациента обязано отображаться в шапке");
    assert.ok(html.includes("Зуб 36"), "Активный зуб обязан отображаться в контексте");
    assert.ok(
      html.includes("Web Speech API") || html.includes("Нативный") || html.includes("Голосовой ввод"),
      "Должен отображаться статус речевого движка"
    );
  });

  it("2. содержит обе канонические вкладки: «Клинический диалог» и «Быстрые действия»", () => {
    const html = renderToString(
      <CopilotStudioModal
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
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        initialTab="dialog"
      />
    );
    assert.ok(html.includes('data-testid="copilot-primary-apply-cta"'), "Primary CTA кнопка обязана иметь data-testid");
    assert.ok(html.includes("Применить действие") || html.includes("Применено"), "Текст Primary CTA обязан быть клиническим действием");
    assert.ok(html.includes("copilot-primary-cta"), "Кнопка обязана использовать класс .copilot-primary-cta");
  });

  it("4. Apple HIG: нативный тактильный Drag Handle ровно 36x5px для мобильного Bottom Sheet", () => {
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("copilot-studio-drag-handle"), "Класс copilot-studio-drag-handle обязан присутствовать");
    const cssPath = path.join(__dirname, "../styles/copilotStudio.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert.ok(cssContent.includes("width: 36px"), "Drag handle обязан иметь ширину 36px в CSS");
    assert.ok(cssContent.includes("height: 5px"), "Drag handle обязан иметь высоту 5px в CSS");
  });

  it("5. Сенсорная эргономика Apple HIG: интерактивные элементы управления соблюдают сенсорный минимум >= 44x44px", () => {
    const cssPath = path.join(__dirname, "../styles/copilotStudio.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert.ok(cssContent.includes("min-height: 44px"), "CSS обязан гарантировать min-height: 44px для тач-таргетов");
    assert.ok(cssContent.includes("min-width: 44px"), "CSS обязан гарантировать min-width: 44px для кнопок управления");
  });

  it("6. Автоматическое определение среды и тихий фоновый харнесс без ручных переключателей", () => {
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(!html.includes("copilot-mode-selector-wrap"), "Ручной переключатель сред обязан отсутствовать");
    assert.ok(!html.includes("copilot-wakelock-banner"), "Клоунский баннер WakeLock обязан отсутствовать");
    assert.ok(!html.includes("Перчатки ON"), "Клоунский бейдж Перчатки ON обязан отсутствовать");
    assert.ok(html.includes("Станция ПК"), "Вкладка интеграции со станцией ПК обязана присутствовать");
  });

  it("7. Вкладка «Быстрые действия»: боевые Fastify инструменты без блокировок врача (Мандат 8e)", () => {
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        initialTab="actions"
      />
    );
    assert.ok(html.includes("Бронирование слота"), "Инструмент бронирования слота обязан присутствовать");
    assert.ok(html.includes("Зубная формула FDI"), "Инструмент одонтограммы обязан присутствовать");
    assert.ok(html.includes("Выставление счёта"), "Инструмент кассы обязан присутствовать");
    assert.ok(html.includes("Захват визиографа"), "Инструмент визиографа обязан присутствовать");
    assert.equal(html.includes("disabled"), false, "Мандат 8e: кнопки врача никогда не должны быть disabled");
  });

  it("8. Пресеты клинических фраз в 1 клик: содержат быстрые клинические алгоритмы", () => {
    assert.ok(CLINICAL_QUICK_PRESETS.length >= 6);
    const labels = CLINICAL_QUICK_PRESETS.map((p) => p.label);
    assert.ok(labels.includes("Протокол осмотра (норма)"));
    assert.ok(labels.includes("Лечение кариеса 16"));
    assert.ok(labels.includes("Удаление дистопированного 38"));
    assert.ok(labels.includes("Смета на имплантацию под ключ"));
  });

  it("9. Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде CopilotStudioModal.tsx", () => {
    const filePath = path.join(__dirname, "../CopilotStudioModal.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.equal(emojiRegex.test(content), false, "Обнаружены запрещенные cartoon emojis в CopilotStudioModal.tsx");
  });

  it("10. Мандат 8b: размер файла CopilotStudioModal.tsx строго в Sweet Spot <= 500 строк", () => {
    const filePath = path.join(__dirname, "../CopilotStudioModal.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 380 && lines <= 500, `CopilotStudioModal.tsx имеет ${lines} строк (ожидалось 380–500)`);
  });

  it("11. Мандат 8b: размер файла copilotCatalogData.ts строго в Sweet Spot 300–380 строк", () => {
    const filePath = path.join(__dirname, "../copilotCatalogData.ts");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 300 && lines <= 380, `copilotCatalogData.ts имеет ${lines} строк (ожидалось 300–380)`);
  });

  it("12. Мандат 8b: размер файла DirectCopilotLauncher.tsx строго в Sweet Spot 60–80 строк", () => {
    const filePath = path.join(__dirname, "../DirectCopilotLauncher.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 60 && lines <= 80, `DirectCopilotLauncher.tsx имеет ${lines} строк (ожидалось 60–80)`);
  });

  it("13. Мандат 8b: размер файла copilotStudio.css строго в Sweet Spot 300–400 строк", () => {
    const filePath = path.join(__dirname, "../styles/copilotStudio.css");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 300 && lines <= 400, `copilotStudio.css имеет ${lines} строк (ожидалось 300–400)`);
  });

  it("14. DirectCopilotLauncher монтируется и рендерится без падений SSR", () => {
    const html = renderToString(<DirectCopilotLauncher />);
    assert.equal(typeof html, "string");
  });

  it("15. CopilotWorkstationTab: чистое оборудование клиники, интерактивный дифф и ноль ручных переключателей", () => {
    const html = renderToString(<CopilotWorkstationTab />);
    assert.ok(html.includes("RVG-визиограф Planmeca ProSensor v2"), "Визиограф обязан отображаться");
    assert.ok(html.includes("Сетевая папка КЛКТ"), "Dropzone КЛКТ обязана отображаться");
    assert.ok(html.includes("Кассовый регистратор Атол 27Ф"), "Фискальный регистратор кассы обязан отображаться");
    assert.ok(html.includes("Дневник приёма SOAP"), "Интерактивный Diff Viewer обязан присутствовать");
    assert.ok(!html.includes("Среда исполнения ассистента"), "Ручной блок переключения сред обязан отсутствовать");
  });

  it("16. Мандат 8b: размер файла CopilotWorkstationTab.tsx строго <= 320 строк", () => {
    const filePath = path.join(__dirname, "../CopilotWorkstationTab.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines <= 320, `CopilotWorkstationTab.tsx имеет ${lines} строк (ожидалось <= 320)`);
  });

  it("17. Мандат 8wy: CopilotWorkstationTab в боевом режиме без activeDiff показывает честный Empty State и 'Не проверено'", () => {
    setRuntimeDemoMode(false);
    useCopilotStore.getState().setActiveDiff(null);
    const html = renderToString(<CopilotWorkstationTab />);
    assert.ok(html.includes("Дневник приёма SOAP: нет ожидающих изменений"), "Честный пустой статус без вымышленных правок зуба 36");
    assert.ok(html.includes("Не проверено"), "В боевом контуре до зонда статус узлов честно 'Не проверено'");
    assert.ok(!html.includes("● В сети (4ms)"), "Фальшивый зелёный статус 4ms в проде ликвидирован");
  });

  it("18. Мандат 8wy: CopilotWorkstationTab в демо-режиме отображает демонстрационный образец диффа и тестовые телеметрии", () => {
    setRuntimeDemoMode(true);
    const html = renderToString(<CopilotWorkstationTab />);
    assert.ok(html.includes("Дневник приёма SOAP: Зуб 36"), "В демо отображается демонстрационный пример");
    assert.ok(html.includes("● В сети (4ms) • Готов к экспозиции"), "В демо отображаются демонстрационные показатели визиографа");
    assert.ok(html.includes("● В сети (11ms) • Готов к чекам"), "В демо отображаются демонстрационные показатели кассы");
    setRuntimeDemoMode(null);
  });

  it("19. Мандат 8wy: при активном diff в сторе отображается реальный дифф и единственная Primary CTA кнопка", () => {
    setRuntimeDemoMode(false);
    useCopilotStore.getState().setActiveDiff({
      id: "live-diff-99",
      title: "Протокол лечения пульпита: Зуб 16",
      targetEntity: "Электронная медицинская карта",
      beforeText: "Status localis: Зуб 16 интактный",
      afterText: "Status localis: Зуб 16 эндодонтическое лечение",
    });
    const html = renderToString(<CopilotWorkstationTab />);
    assert.ok(html.includes("Протокол лечения пульпита: Зуб 16"), "Реальный активный дифф отображается в UI");
    assert.ok(html.includes("Принять диф в дневник"), "Кнопка принятия диффа присутствует");
    assert.ok(html.includes("primary-button"), "Присутствует Primary CTA кнопка");
    useCopilotStore.getState().setActiveDiff(null);
  });

  it("20. Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде CopilotWorkstationTab.tsx", () => {
    const filePath = path.join(__dirname, "../CopilotWorkstationTab.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.equal(emojiRegex.test(content), false, "Обнаружены запрещенные cartoon emojis в CopilotWorkstationTab.tsx");
  });

  it("21. Мандат 8wy: в боевом режиме (!isDemoShowcaseMode()) стартовый чат пуст ([]), рендерится честный Empty State", () => {
    setRuntimeDemoMode(false);
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        activeTooth={36}
        patientName="Сидоров А. П."
        initialTab="dialog"
      />
    );
    assert.ok(html.includes("Клинический диалог пуст"), "В боевом режиме диалог должен быть чистым без фейковых сообщений");
    assert.ok(html.includes("Задайте клинический вопрос или начните диктовку приёма"), "Отображается приглашение к вводу");
    assert.ok(!html.includes("Пациент с жалобами на боли от холодного в зубе 36"), "Фейковые стартовые сообщения запрещены в боевом приёме");
  });

  it("22. Мандат 8wy: в демо-режиме (isDemoShowcaseMode(true)) рендерятся демонстрационные сообщения", () => {
    setRuntimeDemoMode(true);
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        activeTooth={36}
        patientName="Сидоров А. П."
        initialTab="dialog"
      />
    );
    assert.ok(html.includes("Пациент с жалобами на боли от холодного в зубе 36"), "В демо режиме витринные сообщения разрешены");
    setRuntimeDemoMode(null);
  });

  it("23. Мандат 8wy: CopilotStudioModal подключает реальный Fastify эндпоинт POST /api/agent/chat", () => {
    const filePath = path.join(__dirname, "../CopilotStudioModal.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes('fetch("/api/agent/chat"'), "Обязан вызывать боевой Fastify эндпоинт /api/agent/chat");
    assert.ok(!content.includes('fetch("/api/v1/copilot/chat"'), "Выдуманный эндпоинт /api/v1/copilot/chat обязан быть удален");
  });

  it("24. Мандат 8b: размер файла CopilotStudioModal.tsx строго в Sweet Spot <= 450 строк", () => {
    const filePath = path.join(__dirname, "../CopilotStudioModal.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 380 && lines <= 450, `CopilotStudioModal.tsx имеет ${lines} строк (ожидалось 380–450)`);
  });
});
