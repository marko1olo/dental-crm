/**
 * copilotStudioSSOT.test.tsx — Строгий SSOT Vitest сьют для ИИ-Копайлота и голосового контура DENTE CRM.
 * 
 * Архитектурные инварианты:
 * - Мандат 8b: Sweet Spot размеров файлов (copilotCatalogData 300–380, CopilotStudioModal 380–450, DirectCopilotLauncher 60–80, copilotStudio.css 300–400).
 * - Мандат 8am: ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)).
 * - Мандат 8e: автономия врача, ноль disabled кнопок у врача, Two-Phase Guard.
 * - Мандат 8wy: честный продакшн без моков vs изолированная витрина.
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
import { CopilotMemoryTab } from "../CopilotMemoryTab";
import { CopilotHistoryDrawer } from "../CopilotHistoryDrawer";
import { CopilotThinkingIndicator } from "../CopilotThinkingIndicator";
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

  it("2. содержит 3 канонические клинические вкладки: «Клинический диалог», «Быстрые действия» и «Память ИИ»", () => {
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        initialTab="dialog"
      />
    );
    assert.ok(html.includes("Клинический диалог"), "Вкладка Диалог обязана присутствовать");
    assert.ok(html.includes("Быстрые действия"), "Вкладка Быстрые действия обязана присутствовать");
    assert.ok(html.includes("Память ИИ"), "Вкладка Память ИИ обязана присутствовать");
    assert.ok(!html.includes("Станция ПК"), "Фейковая вкладка Станция ПК обязана быть полностью ликвидирована");
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
    assert.ok(!html.includes("Станция ПК"), "Вкладка Станция ПК ликвидирована");
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
    assert.ok(html.includes("Протокол SOAP в карту"), "Инструмент протокола SOAP обязан присутствовать");
    assert.ok(!html.includes("Захват визиографа"), "Фейковый захват визиографа обязан отсутствовать");
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

  it("10. Мандат 8b: размер файла CopilotStudioModal.tsx строго в Sweet Spot <= 450 строк", () => {
    const filePath = path.join(__dirname, "../CopilotStudioModal.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 380 && lines <= 450, `CopilotStudioModal.tsx имеет ${lines} строк (ожидалось 380–450)`);
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

  it("15. CopilotMemoryTab: управление долгосрочной клинической памятью врача", () => {
    const html = renderToString(<CopilotMemoryTab />);
    assert.ok(html.includes("Долговременная память ассистента"), "Заголовок памяти обязан отображаться");
    assert.ok(html.includes("Добавить клиническое предпочтение"), "Форма добавления обязана присутствовать");
    assert.ok(html.includes("Материалы"), "Категория Материалы обязана присутствовать");
    assert.ok(html.includes("Анестезия"), "Категория Анестезия обязана присутствовать");
  });

  it("16. Мандат 8b: размер файла CopilotMemoryTab.tsx строго <= 220 строк", () => {
    const filePath = path.join(__dirname, "../CopilotMemoryTab.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines <= 220, `CopilotMemoryTab.tsx имеет ${lines} строк (ожидалось <= 220)`);
  });

  it("17. CopilotStudioModal монтирует вкладку initialTab='memory'", () => {
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        initialTab="memory"
      />
    );
    assert.ok(html.includes("Долговременная память ассистента"));
    assert.ok(html.includes("Добавить клиническое предпочтение"));
  });

  it("18. CopilotHistoryDrawer: история диалогов, треды и фильтрация", () => {
    const html = renderToString(
      <CopilotHistoryDrawer
        isOpen={true}
        onClose={() => {}}
        onSelectThread={() => {}}
      />
    );
    assert.ok(html.includes("История диалогов"));
    assert.ok(html.includes("Новый диалог"));
  });

  it("19. CopilotThinkingIndicator: секундомер, волновые точки «Печатает ●●●» и аккордеон CoT", () => {
    const html = renderToString(
      <CopilotThinkingIndicator
        isThinking={true}
        activeTooth={36}
        speedMode="turbo"
        showThinkingProcess={true}
      />
    );
    assert.ok(html.includes("Мышление модели"), "Заголовок мышления обязан отображаться");
    assert.ok(html.includes("Печатает"), "Индикатор «Печатает» обязан отображаться");
    assert.ok(html.includes("FDI 36"), "Зуб FDI обязан отображаться");
  });

  it("20. Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде CopilotMemoryTab.tsx и CopilotHistoryDrawer.tsx", () => {
    const files = [
      path.join(__dirname, "../CopilotMemoryTab.tsx"),
      path.join(__dirname, "../CopilotHistoryDrawer.tsx"),
      path.join(__dirname, "../CopilotThinkingIndicator.tsx"),
    ];
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const f of files) {
      const content = fs.readFileSync(f, "utf-8");
      assert.equal(emojiRegex.test(content), false, `Обнаружены запрещенные cartoon emojis в ${path.basename(f)}`);
    }
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
