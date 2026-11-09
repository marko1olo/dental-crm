/**
 * copilotReactStreamDiff.test.tsx — Vitest suite for ReAct Stream, Extended Thinking (CoT)
 * and Two-Phase Contiguous Diff Inspector (Standard Google Antigravity & language_server).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotThinkingIndicator } from "../CopilotThinkingIndicator";
import { CopilotThinkingMessage } from "../message/CopilotThinkingMessage";
import { CopilotToolMessage } from "../message/CopilotToolMessage";
import { ActionConfirmDiffBox } from "../actionConfirm/ActionConfirmDiffBox";
import { CopilotStudioModal } from "../CopilotStudioModal";
import { setRuntimeDemoMode } from "../../../lib/demoMode";
import type { ToolUiMessage, ThinkingUiMessage } from "../copilotTypes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanHtml = (raw: string): string =>
  raw.replace(/<!--.*?-->/g, "").replace(/\u00A0/g, " ");

describe("Copilot ReAct Stream, Extended Thinking (CoT) & Two-Phase Diff Suite", () => {
  it("1. CopilotThinkingIndicator renders thinking timer and accordion toggle label", () => {
    const raw = renderToString(
      <CopilotThinkingIndicator
        isThinking={true}
        activeTooth={36}
        icd10Code="K02.1"
        thoughtProcess="Анализ снимка КЛКТ зуба 36: визуализация очага деструкции в периапикальной зоне."
        speedMode="turbo"
        showThinkingProcess={true}
      />
    );
    const html = cleanHtml(raw);
    assert.ok(html.includes("Мышление модели"), "Индикатор обязан содержать 'Мышление модели'");
    assert.ok(html.includes("Раскрыть") || html.includes("Свернуть"), "Индикатор обязан содержать статус раскрытия аккордеона");
    assert.ok(html.includes("FDI 36"), "Индикатор обязан отображать активный зуб");
    assert.ok(html.includes("МКБ-10 K02.1"), "Индикатор обязан отображать МКБ код");
  });

  it("2. CopilotThinkingMessage renders in-feed reasoning with duration", () => {
    const msg: ThinkingUiMessage = {
      kind: "thinking",
      text: "Пошаговый план: 1. Инфильтрация Артикаин 1.7 мл. 2. Препарирование кариозной полости. 3. Адгезивный протокол.",
      durationMs: 3200,
    };
    const html = cleanHtml(renderToString(<CopilotThinkingMessage message={msg} />));
    assert.ok(html.includes("Мышление модели (3.2с)"), "Должен отображаться расчет длительности в секундах");
    assert.ok(html.includes("Раскрыть"), "По умолчанию блок рассуждений свернут для компактности");
  });

  it("3. CopilotToolMessage renders running state with spinner", () => {
    const msg: ToolUiMessage = {
      kind: "tool",
      callId: "call-1",
      name: "updateToothStatusTool",
      status: "running",
      args: { tooth: 36, state: "C" },
    };
    const html = cleanHtml(renderToString(<CopilotToolMessage message={msg} />));
    assert.ok(html.includes("Вызов: updateToothStatusTool (Зуб 36)"), "Обязан отображаться правильный заголовок вызова с зубом");
    assert.ok(html.includes("Выполняется..."), "Статус running обязан содержать 'Выполняется...'");
  });

  it("4. CopilotToolMessage renders done state with execution duration and result", () => {
    const msg: ToolUiMessage = {
      kind: "tool",
      callId: "call-2",
      name: "createInvoiceDraftTool",
      status: "done",
      durationMs: 45,
      args: { amountKopecks: 650000 },
    };
    const html = cleanHtml(renderToString(<CopilotToolMessage message={msg} />));
    assert.ok(html.includes("Вызов: createInvoiceDraftTool (6 500 ₽)"), "Заголовок обязан содержать отформатированную сумму");
    assert.ok(html.includes("Готово (45мс)"), "Обязана отображаться длительность выполнения инструмента");
  });

  it("5. CopilotToolMessage renders confirmation_required with Two-Phase Contiguous Diff and buttons", () => {
    let confirmed = false;
    let rejected = false;
    const msg: ToolUiMessage = {
      kind: "tool",
      callId: "call-conf-1",
      name: "updateToothStatusTool",
      status: "confirmation_required",
      args: {
        tooth: 36,
        old_status: "Без патологии / Интактный",
        treatment: "K02.1 Кариес дентина, пломба световая",
      },
    };
    const html = cleanHtml(
      renderToString(
        <CopilotToolMessage
          message={msg}
          onConfirm={(_id, decision) => {
            if (decision === "confirm") confirmed = true;
            if (decision === "reject") rejected = true;
          }}
        />
      )
    );
    assert.ok(html.includes("Требуется подтверждение"), "Бейдж подтверждения обязан отображаться");
    assert.ok(html.includes("diff-del"), "Класс строки удаления diff-del обязан присутствовать");
    assert.ok(html.includes("diff-add"), "Класс строки добавления diff-add обязан присутствовать");
    assert.ok(html.includes("Зуб 36: Без патологии / Интактный"), "Строка удаления обязана содержать старый статус");
    assert.ok(html.includes("Зуб 36: K02.1 Кариес дентина, пломба световая"), "Строка добавления обязана содержать новый статус");
    assert.ok(html.includes("Применить в карту"), "Кнопка 'Применить в карту' обязана присутствовать");
    assert.ok(html.includes("Отклонить"), "Кнопка 'Отклонить' обязана присутствовать");
    assert.equal(html.includes("disabled"), false, "Мандат 8e: кнопки врача никогда не должны быть заблокированы");
  });

  it("6. ActionConfirmDiffBox renders contiguous two-phase diff inspector with green + and red - rows", () => {
    const html = cleanHtml(
      renderToString(
        <ActionConfirmDiffBox
          clinicalDiff={{
            target: "Зуб 36",
            from: "Без патологии / Интактный",
            to: "K02.1 Глубокий кариес дентина, нанокомпозит Estelite",
            badge: "Одонтограмма",
          }}
        />
      )
    );
    assert.ok(html.includes("copilot-contiguous-diff"), "Контейнер contiguous diff обязан присутствовать");
    assert.ok(html.includes("diff-del"), "Красная строка удаления (-) обязана присутствовать");
    assert.ok(html.includes("diff-add"), "Зеленая строка добавления (+) обязана присутствовать");
    assert.ok(html.includes("Было") && html.includes("Будет изменено"), "Классические бейджи также сохраняются");
  });

  it("7. CopilotStudioModal renders structured Tool Execution Card with two-phase diff for action proposals", () => {
    setRuntimeDemoMode(true);
    const html = cleanHtml(
      renderToString(
        <CopilotStudioModal
          isOpen={true}
          onClose={() => {}}
          activeTooth={36}
          initialTab="dialog"
        />
      )
    );
    assert.ok(html.includes("copilot-tool-execution-card"), "Карточка инструмента обязана присутствовать в диалоге");
    assert.ok(html.includes("Требуется подтверждение"), "Бейдж подтверждения действия обязан отображаться");
    assert.ok(html.includes("Зуб 36: Без патологии / Интактный"), "Строка удаления (-) обязана содержать старое состояние");
    assert.ok(html.includes("Применить в карту"), "Кнопка подтверждения действия 'Применить в карту' обязана присутствовать");
    assert.ok(html.includes("Отклонить"), "Кнопка 'Отклонить' обязана присутствовать");
    assert.equal(html.includes("disabled"), false, "Мандат 8e: кнопки врача никогда не должны быть disabled");
    setRuntimeDemoMode(null);
  });

  it("8. Мандат 8d pt 7: строго 0 cartoon emojis во всех компонентах ReAct Stream & Diff", () => {
    const targetFiles = [
      "../CopilotThinkingIndicator.tsx",
      "../message/CopilotThinkingMessage.tsx",
      "../message/CopilotToolMessage.tsx",
      "../actionConfirm/ActionConfirmDiffBox.tsx",
      "../CopilotStudioModal.tsx",
    ];
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    for (const rel of targetFiles) {
      const full = path.join(__dirname, rel);
      const content = fs.readFileSync(full, "utf-8");
      assert.equal(emojiRegex.test(content), false, `Обнаружен запрещенный emoji в файле ${rel}`);
    }
  });
});
