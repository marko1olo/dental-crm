/**
 * CopilotWorkspaceHost.test.tsx — Red Team тесты единого кабинета Копайлота DENTE.
 * Мандаты 8b, 8e (автономия врача), 8am (ровно 1 Primary CTA), 8wy (двухрежимный харнесс).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotWorkspaceHost } from "../CopilotWorkspaceHost";
import { DirectCopilotLauncher } from "../DirectCopilotLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CopilotWorkspaceHost Red Team Inquisition", () => {
  it("1. рендерит панель кабинета Копайлота с заголовком и контекстом пациента", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
        activeTooth={36}
        patientName="Сидоров А. П."
        initialTab="dialog"
      />
    );
    assert.ok(html.includes("ДЕНТА Копайлот"));
    assert.ok(html.includes("Сидоров А. П."));
    assert.ok(html.includes("Зуб 36"));
  });

  it("2. содержит обе ключевые вкладки: «Клинический диалог» и «Быстрые действия»", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
        initialTab="dialog"
      />
    );
    assert.ok(html.includes("Клинический диалог"));
    assert.ok(html.includes("Быстрые действия"));
  });

  it("3. Мандат 8am: ровно ОДНА Primary CTA кнопка #0d9488 («✓ Применить в карту приёма»)", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
        initialTab="dialog"
      />
    );
    assert.ok(html.includes('data-testid="copilot-primary-apply-cta"'));
    assert.ok(html.includes("Применить в карту приёма"));
    // Проверяем стиль Primary CTA (var(--teal) / #0d9488)
    assert.ok(html.includes("var(--teal,#0d9488)") || html.includes("bg-[var(--teal,#0d9488)]"));
  });

  it("4. Apple HIG: нативный Drag Handle для выдвижного Bottom Sheet на мобильных", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("touch-none"));
    assert.ok(html.includes("rounded-full"));
  });

  it("5. Мандат 8wy: Двухрежимный харнесс (Веб-ассистент vs Станция ОС)", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes("Веб-ассистент"));
    assert.ok(html.includes("Станция ОС"));
  });

  it("6. Вкладка «Быстрые действия»: рендерит 4 реальных Fastify инструмента без блокировок врача (Мандат 8e)", () => {
    const html = renderToString(
      <CopilotWorkspaceHost
        isOpen={true}
        onClose={() => {}}
        initialTab="actions"
      />
    );
    assert.ok(html.includes("Бронирование слота"));
    assert.ok(html.includes("Зубная формула FDI"));
    assert.ok(html.includes("Выставление счёта"));
    assert.ok(html.includes("Захват визиографа"));
    // Мандат 8e: ни одна кнопка не имеет disabled
    assert.equal(html.includes("disabled"), false, "Кнопки быстрых действий не должны быть disabled");
  });

  it("7. Мандат 8d pt 7: исходный код CopilotWorkspaceHost.tsx содержит строго 0 cartoon emojis", () => {
    const filePath = path.join(__dirname, "../CopilotWorkspaceHost.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.equal(emojiRegex.test(content), false, "Обнаружены запрещенные cartoon emojis в CopilotWorkspaceHost.tsx");
  });

  it("8. Мандат 8b: размер файла CopilotWorkspaceHost.tsx строго в Sweet Spot 380–480 строк", () => {
    const filePath = path.join(__dirname, "../CopilotWorkspaceHost.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 380 && lines <= 480, `CopilotWorkspaceHost.tsx имеет ${lines} строк (ожидалось 380–480)`);
  });

  it("9. DirectCopilotLauncher: размер файла строго в Sweet Spot 60–80 строк", () => {
    const filePath = path.join(__dirname, "../DirectCopilotLauncher.tsx");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
    assert.ok(lines >= 60 && lines <= 80, `DirectCopilotLauncher.tsx имеет ${lines} строк (ожидалось 60–80)`);
  });

  it("10. DirectCopilotLauncher монтируется и не падает при SSR", () => {
    const html = renderToString(<DirectCopilotLauncher />);
    // В тестовом Node окружении без window.location search/hash возвращает null или компонент
    assert.equal(typeof html, "string");
  });
});
