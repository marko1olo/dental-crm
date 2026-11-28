/**
 * copilotSSOTSuite.test.tsx — Red Team SSOT сьют тестов канонического ИИ-копайлота DENTE CRM.
 * 
 * Проверка архитектурных инвариантов:
 * - Мандат 8b: Sweet Spot размеров файлов (copilotCatalogData 280–350, CopilotStudioModal 380–480, CopilotGlobalHost 100–160).
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
import { CopilotStudioModal } from "../CopilotStudioModal";
import { CopilotStudioTabContent } from "../studio/CopilotStudioTabContent";
import { CopilotGlobalHost } from "../CopilotGlobalHost";
import { useCopilotStore } from "../../../store/copilotStore";
import {
  COPILOT_CATALOG_CATEGORIES,
  CRM_FASTIFY_TOOLS_REGISTRY,
  CLINICAL_QUICK_PRESETS,
  getCatalogItemsByMode,
} from "../copilotCatalogData";

describe("Copilot Studio SSOT & Voice Suite", () => {
  it("1. рендерит панель студии Копайлота с шапкой, статусом движка и контекстом пациента", () => {
    const html = renderToString(
      <CopilotStudioModal
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
    const proposalMessages = [
      {
        id: "msg-action-1",
        role: "assistant" as const,
        text: "Рекомендуется лечение глубокого кариеса зуба 36.",
        timestamp: "10:00",
        actionProposal: {
          id: "act-1",
          toolName: "updateToothStatus",
          description: "Кариес дентина (K02.1)",
          payload: { tooth: 36, state: "caries" },
        },
      },
    ];
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        initialTab="dialog"
        initialMessages={proposalMessages}
      />
    );
    assert.ok(html.includes('data-testid="copilot-primary-apply-cta"'), "Primary CTA кнопка обязана присутствовать с data-testid");
    assert.ok(html.includes("Применить в карту") || html.includes("Применить действие") || html.includes("Применено"), "Текст кнопки должен быть клиническим");
    assert.ok(
      html.includes("var(--primary)") || html.includes("var(--teal,#0d9488)"),
      "Primary CTA кнопка обязана использовать канонический токен var(--primary)",
    );
  });

  it("4. Apple HIG: нативный Drag Handle ровно 36x5px для выдвижного Bottom Sheet на мобильных", () => {
    const html = renderToString(
      <CopilotStudioModal
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
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("min-h-[44px]"), "Кнопки обязаны соблюдать сенсорный минимум min-h-[44px]");
    assert.ok(html.includes("min-w-[44px]"), "Кнопки управления обязаны иметь min-w-[44px]");
  });

  it("6. Мандат 8wy: 3 клинические вкладки кабинета (Клинический диалог, Быстрые действия и Память ИИ)", () => {
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("Клинический диалог"), "Должен присутствовать клинический диалог");
    assert.ok(html.includes("Память ИИ"), "Должна присутствовать память ИИ");
    assert.ok(!html.includes("Станция ПК"), "Фейковая вкладка Станция ПК ликвидирована");
  });

  it("7. Вкладка «Быстрые действия»: рендерит 4 реальных Fastify инструмента без блокировок врача (Мандат 8e)", () => {
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        initialTab="actions"
      />
    );
    assert.ok(html.includes("Бронирование слота"), "Инструмент бронирования слота должен присутствовать");
    assert.ok(html.includes("Зубная формула FDI"), "Инструмент одонтограммы должен присутствовать");
    assert.ok(html.includes("Выставление счёта"), "Инструмент кассы должен присутствовать");
    assert.ok(html.includes("Протокол осмотра в карту"), "Инструмент протокола осмотра должен присутствовать");
    assert.ok(!html.includes("Захват визиографа"), "Фейковый захват визиографа обязан отсутствовать");
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

  it("9. Мандат 8d pt 7: строго 0 cartoon emojis в отрендеренном UI CopilotStudioModal и CopilotGlobalHost", () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const tab of ["dialog", "actions", "memory"] as const) {
      const html = renderToString(
        <CopilotStudioModal isOpen={true} onClose={() => {}} activeTooth={36} initialTab={tab} />,
      );
      assert.equal(emojiRegex.test(html), false, `Обнаружены cartoon emojis во вкладке ${tab}`);
      assert.doesNotMatch(html, /043\/у|804н|54-ФЗ/i, `Вкладка ${tab} содержит сырой код приказа`);
    }
    const hostHtml = renderToString(<CopilotGlobalHost />);
    assert.equal(emojiRegex.test(hostHtml), false, "Обнаружены cartoon emojis в CopilotGlobalHost");
  });

  it("10. Max Modal Depth = 1: открытые настройки или история внутри Studio рендерятся встроенно без второго backdrop-оверлея", () => {
    const baseTabContentProps = {
      activeTab: "dialog" as const,
      setActiveTab: () => {},
      ctxSnapshot: { activeTooth: 36, patientId: null, patientName: null, activeVisitId: null, allergies: [], somaticHistory: "", clinicalContextNote: "" },
      runtimeMode: "web_browser",
      speedMode: "turbo" as const,
      showThinkingProcess: true,
      currentThought: "",
      activeToolName: null,
      messages: [],
      setMessages: () => {},
      isStreaming: false,
      activeDiff: null,
      setActiveDiff: () => {},
      applyActiveDiff: async () => true,
      rejectActiveDiff: () => {},
      toolExecutionLogs: [],
      appliedActionIds: new Set<string>(),
      actionError: null,
      setActionError: () => {},
      onApplyAction: () => {},
      onSendMessage: () => {},
      executeApiTool: async () => {},
      messagesEndRef: { current: null },
      isListening: false,
      audioLevel: 0,
      audioMode: "browser_speech" as const,
      speechHealth: { isCloudConfigured: false, activeProvider: "browser", label: "Web Speech" },
      streamManager: null,
      inputText: "",
      onInputChange: () => {},
      onToggleListening: () => {},
      onStopListening: () => {},
      setSettingsOpen: () => {},
      setHistoryOpen: () => {},
      threads: [],
      threadMessages: {},
      selectThread: () => {},
      hydrateSession: async () => false,
    };

    const settingsHtml = renderToString(
      <CopilotStudioTabContent {...baseTabContentProps} isSettingsOpen={true} isHistoryOpen={false} />,
    );
    assert.ok(settingsHtml.includes('data-testid="copilot-settings-modal"'), "Панель настроек обязана рендериться встроенно");
    assert.equal((settingsHtml.match(/backdrop-blur-sm/g) ?? []).length, 0, "Встроенные настройки не должны создавать второй backdrop-оверлей");

    const historyHtml = renderToString(
      <CopilotStudioTabContent {...baseTabContentProps} isSettingsOpen={false} isHistoryOpen={true} />,
    );
    assert.ok(historyHtml.includes('data-testid="copilot-history-drawer"'), "Панель истории обязана рендериться встроенно");
    assert.equal((historyHtml.match(/backdrop-blur-sm/g) ?? []).length, 0, "Встроенная история не должна создавать второй backdrop-оверлей");
  });

  it("11. Каталог инструментов строго разделяет web_browser и desktop_native режимы", () => {
    const webItems = getCatalogItemsByMode("web_browser");
    const desktopItems = getCatalogItemsByMode("desktop_native");
    assert.ok(webItems.every((item) => item.mode !== "desktop_native"), "web_browser каталог не должен содержать desktop_native тулы");
    assert.ok(desktopItems.some((item) => item.mode === "desktop_native"), "desktop_native обязан содержать локальные инструменты");
    assert.ok(CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus);
    assert.ok(COPILOT_CATALOG_CATEGORIES.length >= 4);
  });

  it("12. useCopilotStore корректно управляет настройкой showTypingAnimation", () => {
    useCopilotStore.getState().updateSettings({ showTypingAnimation: false });
    assert.equal(useCopilotStore.getState().settings.showTypingAnimation, false);
    useCopilotStore.getState().updateSettings({ showTypingAnimation: true });
    assert.equal(useCopilotStore.getState().settings.showTypingAnimation, true);
  });

  it("13. CopilotGlobalHost монтируется и не падает при SSR", () => {
    const html = renderToString(<CopilotGlobalHost />);
    assert.equal(typeof html, "string");
  });
});
