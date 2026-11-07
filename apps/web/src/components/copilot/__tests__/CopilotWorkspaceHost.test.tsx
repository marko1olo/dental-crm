/**
 * CopilotWorkspaceHost.test.tsx — Red Team тесты тонкого фасада Копайлота DENTE.
 * Мандаты 8s (фасад без дублирования), 8e (автономия врача), 8wy (двухрежимный харнесс).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotWorkspaceHost, CopilotDrawer } from "../CopilotWorkspaceHost";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CopilotWorkspaceHost Red Team Inquisition (SSOT Facade)", () => {
  it("1. рендерит канонический CopilotDrawer через фасад CopilotWorkspaceHost", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
        activeTooth={36}
        patientName="Сидоров А. П."
        initialTab="chat"
      />
    );
    assert.ok(html.includes('data-testid="copilot-drawer"'), "Должен монтироваться канонический copilot-drawer");
    assert.ok(html.includes("Клинический ассистент") || html.includes("Копайлот"));
  });

  it("2. содержит обе канонические вкладки: «Чат» и «Задачи»", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
        initialTab="chat"
      />
    );
    assert.ok(html.includes("Чат"));
    assert.ok(html.includes("Задачи"));
  });

  it("3. Apple HIG: нативный Drag Handle для выдвижного Bottom Sheet на мобильных", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("copilot-drawer-drag-handle"));
  });

  it("4. Мандат 8wy: Двухрежимный харнесс (Веб-клиника vs Рабочая станция)", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("Веб-клиника"));
    assert.ok(html.includes("Рабочая станция"));
    assert.ok(html.includes('data-testid="copilot-mode-switcher"'));
  });

  it("5. Вкладка «Задачи» (pending) рендерится без блокировок врача (Мандат 8e)", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
        initialTab="actions"
      />
    );
    assert.ok(html.includes("Задачи"));
    // Проверяем отсутствие заблокированных кнопок
    assert.equal(html.includes("disabled"), false, "Кнопки задач не должны быть заблокированы");
  });

  it("6. Мандат 8d pt 7: исходный код CopilotWorkspaceHost.tsx содержит строго 0 cartoon emojis", () => {
    const filePath = path.join(__dirname, "../CopilotWorkspaceHost.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.equal(emojiRegex.test(content), false, "Обнаружены запрещенные cartoon emojis в CopilotWorkspaceHost.tsx");
  });

  it("7. Мандат 8s: размер файла CopilotWorkspaceHost.tsx строго компактный (< 75 строк)", () => {
    const filePath = path.join(__dirname, "../CopilotWorkspaceHost.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines <= 75, `CopilotWorkspaceHost.tsx имеет ${lines} строк (ожидалось <= 75)`);
  });

  it("8. Мандат 8wy: отсутствие захардкоженного массива DEFAULT_MESSAGES про зуб 36", () => {
    const filePath = path.join(__dirname, "../CopilotWorkspaceHost.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.equal(content.includes("DEFAULT_MESSAGES"), false, "Обнаружен устаревший захардкоженный DEFAULT_MESSAGES");
    assert.equal(content.includes("Пациент с жалобами на боли от холодного в зубе 36"), false, "Обнаружен статический хардкод жалобы");
  });

  it("9. Прозрачный реэкспорт канонического CopilotDrawer", () => {
    assert.ok(CopilotDrawer !== undefined, "CopilotDrawer должен реэкспортироваться из CopilotWorkspaceHost");
    assert.equal(typeof CopilotDrawer, "function");
  });

  it("10. При isOpen=false возвращает null", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={false}
        onClose={() => {}}
      />
    );
    assert.equal(html, "");
  });
});
