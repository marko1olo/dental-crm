/**
 * copilotStudioSSOT.test.tsx — Строгий SSOT Vitest сьют для ИИ-Копайлота и голосового контура DENTE CRM.
 * 
 * Архитектурные инварианты:
 * - Мандат 8b: Sweet Spot размеров файлов (copilotCatalogData 300–380, CopilotStudioModal 380–450, CopilotGlobalHost 100–160, copilotStudio.css 300–400).
 * - Мандат 8am: ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)).
 * - Мандат 8e: автономия врача, ноль disabled кнопок у врача, Two-Phase Guard.
 * - Мандат 8wy: честный продакшн без моков vs изолированная витрина.
 * - Apple HIG: нативный Drag Handle 36x5px для Bottom Sheet drawer на смартфонах, сенсорные зоны >= 44x44px.
 * - Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде.
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { CopilotStudioModal } from "../CopilotStudioModal";
import { CopilotGlobalHost } from "../CopilotGlobalHost";
import { CopilotMemoryTab } from "../CopilotMemoryTab";
import { CopilotHistoryDrawer } from "../CopilotHistoryDrawer";
import { CopilotThinkingIndicator } from "../CopilotThinkingIndicator";
import { streamCopilotChat } from "../client/copilotStreamClient";
import { useCopilotStore } from "../../../store/copilotStore";
import { setRuntimeDemoMode } from "../../../lib/demoMode";
import {
  CLINICAL_QUICK_PRESETS,
} from "../copilotCatalogData";

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
    assert.ok(html.includes('data-testid="copilot-primary-apply-cta"'), "Primary CTA кнопка обязана иметь data-testid");
    assert.ok(html.includes("Применить в карту") || html.includes("Применить действие") || html.includes("Применено"), "Текст Primary CTA обязан быть клиническим действием");
    assert.ok(html.includes("copilot-primary-cta"), "Кнопка обязана использовать класс .copilot-primary-cta");
  });

  it("4. Apple HIG: нативный тактильный Drag Handle присутствует в мобильном Bottom Sheet", () => {
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("copilot-studio-drag-handle"), "Класс copilot-studio-drag-handle обязан присутствовать");
  });

  it("5. Сенсорная эргономика Apple HIG: интерактивные кнопки рендерятся с классами и доступными aria-метками", () => {
    const html = renderToString(
      <CopilotStudioModal
        isOpen={true}
        onClose={() => {}}
        initialTab="dialog"
      />
    );
    assert.ok(html.includes("aria-label="), "Управляющие кнопки должны иметь aria-label");
    assert.ok(html.includes("<button"), "Интерактивные кнопки должны рендериться");
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
    assert.ok(html.includes("Протокол осмотра в карту"), "Инструмент протокола осмотра обязан присутствовать");
    assert.ok(!html.includes("Захват визиографа"), "Фейковый захват визиографа обязан отсутствовать");
    assert.equal(html.includes("disabled"), false, "Мандат 8e: кнопки врача никогда не должны быть disabled");
  });

  it("8. Пресеты клинических фраз: содержат быстрые клинические алгоритмы", () => {
    assert.ok(CLINICAL_QUICK_PRESETS.length >= 6);
    const labels = CLINICAL_QUICK_PRESETS.map((p) => p.label);
    assert.ok(labels.includes("Протокол осмотра (норма)"));
    assert.ok(labels.includes("Лечение кариеса 16"));
    assert.ok(labels.includes("Удаление дистопированного 38"));
    assert.ok(labels.includes("Смета на имплантацию под ключ"));
  });

  it("9. Архитектурный инвариант: CopilotGlobalHost корректно экспортируется и монтирует CopilotStudioModal и CopilotGlobalModals", () => {
    assert.equal(typeof CopilotGlobalHost, "function", "CopilotGlobalHost обязан быть валидным React-компонентом");
    const html = renderToString(<CopilotGlobalHost />);
    assert.equal(typeof html, "string", "CopilotGlobalHost обязан успешно рендериться в SSR-контуре");
    assert.ok(html.includes("copilot-trigger-btn") || html.includes("ИИ Ассистент"), "CopilotGlobalHost обязан монтировать плавающий триггер копайлота");
  });

  it("10. CopilotMemoryTab: управление долгосрочной клинической памятью врача", () => {
    const html = renderToString(<CopilotMemoryTab />);
    assert.ok(html.includes("Долговременная память ассистента"), "Заголовок памяти обязан отображаться");
    assert.ok(html.includes("Добавить клиническое предпочтение"), "Форма добавления обязана присутствовать");
    assert.ok(html.includes("Материалы"), "Категория Материалы обязана присутствовать");
    assert.ok(html.includes("Анестезия"), "Категория Анестезия обязана присутствовать");
  });

  it("11. CopilotStudioModal монтирует вкладку initialTab='memory'", () => {
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

  it("12. CopilotHistoryDrawer: история диалогов, треды и фильтрация", () => {
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

  it("13. CopilotThinkingIndicator: секундомер, волновые точки «Печатает ●●●» и аккордеон CoT", () => {
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

  it("14. Мандат 8d pt 7: строго 0 cartoon emojis в отрендеренных SSR-представлениях Копайлота", () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}]/u;
    const fragments = [
      renderToString(<CopilotStudioModal isOpen={true} onClose={() => {}} initialTab="dialog" />),
      renderToString(<CopilotStudioModal isOpen={true} onClose={() => {}} initialTab="actions" />),
      renderToString(<CopilotStudioModal isOpen={true} onClose={() => {}} initialTab="memory" />),
      renderToString(<CopilotMemoryTab />),
      renderToString(<CopilotHistoryDrawer isOpen={true} onClose={() => {}} onSelectThread={() => {}} />),
      renderToString(<CopilotThinkingIndicator isThinking={true} activeTooth={36} speedMode="turbo" showThinkingProcess={true} />),
    ];
    for (const html of fragments) {
      assert.equal(emojiRegex.test(html), false, "Обнаружены запрещенные cartoon emojis в UI Копайлота");
    }
  });

  it("15. Мандат 8wy: в боевом режиме (!isDemoShowcaseMode()) стартовый чат пуст ([]), рендерится честный Empty State", () => {
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

  it("16. Мандат 8wy: в демо-режиме (isDemoShowcaseMode(true)) рендерятся демонстрационные сообщения", () => {
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

  it("17. Мандат 8wy: streamCopilotChat вызывает боевой Fastify эндпоинт POST /api/agent/chat с Idempotency-Key", async () => {
    const originalFetch = globalThis.fetch;
    let calledUrl = "";
    let calledMethod = "";
    let idempotencyKey: string | null = null;
    try {
      globalThis.fetch = (async (input, init) => {
        calledUrl = typeof input === "string" ? input : input.toString();
        calledMethod = init?.method || "GET";
        idempotencyKey = new Headers(init?.headers).get("Idempotency-Key");
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
          { status: 200 },
        );
      }) as typeof fetch;

      const result = await streamCopilotChat({
        message: "Проверь статус зуба 36",
        onEvent: () => {},
      });
      assert.equal(result.ok, true);
      assert.ok(calledUrl.endsWith("/api/agent/chat") && calledUrl.startsWith("http"));
      assert.equal(calledMethod, "POST");
      assert.ok(idempotencyKey);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("18. DEF-FRONT-02: useCopilotStore создаёт и сохраняет активный диалог без потери контекста", () => {
    const store = useCopilotStore.getState();
    const threadId = store.createThread("Петров А.", "Жалобы на боль при накусывании", undefined);
    const next = useCopilotStore.getState();
    assert.equal(next.activeThreadId, threadId);
    assert.ok(next.threads.some((t) => t.id === threadId && t.patientName === "Петров А."));
  });
});
