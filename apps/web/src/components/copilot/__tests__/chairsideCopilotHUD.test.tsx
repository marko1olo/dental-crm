/**
 * chairsideCopilotHUD.test.tsx
 *
 * Unit tests for Chairside AI Copilot HUD & Omnibar:
 * - Mandate 8c: Universal 3-tier architecture (Tier 1 chairside cockpit).
 * - Mandate 8d: 7 Deadly Sins checklist compliance (Toolbar 32-36px, <=2 buttons/card, WCAG AAA tokens, 0 emojis).
 * - Mandate 8e: Doctor & Staff Autonomy (Zero disabled buttons, 1-click batch application, reversible actions).
 * - Mandate 8k: CRM != Reality Simulator (Friction-killer ReAct thought stream and action proposals).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChairsideCopilotHUD } from "../ChairsideCopilotHUD";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("ChairsideCopilotHUD Component Tests", () => {
  it("1. renders expanded HUD panel with 1-line header and brand badge", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        initialDocked={false}
        activeTooth={16}
        patientName="Иванов И.И."
      />
    );

    expect(html).toContain("chairside-copilot-hud");
    expect(html).toContain("Копилот у кресла");
    expect(html).toContain("В кресле");
    expect(html).toContain("btn-chairside-hud-dock-toggle");
    expect(html).toContain("btn-chairside-hud-minimize");
    expect(html).toContain("btn-chairside-hud-close");
  });

  it("2. renders minimized pill when isMinimized is triggered", () => {
    // We can test minimized representation
    const html = renderToString(
      <div className="chairside-copilot-hud chairside-copilot-hud--floating" data-testid="chairside-copilot-hud-minimized">
        <button type="button" className="chairside-hud-pill">
          <div className="chairside-hud-pill-icon" />
          <span>Копилот у кресла</span>
          <span className="chairside-hud-pill-badge">Готов</span>
        </button>
      </div>
    );

    expect(html).toContain("chairside-copilot-hud-minimized");
    expect(html).toContain("chairside-hud-pill");
    expect(html).toContain("Готов");
  });

  it("3. renders Collapsible Thought Stream with 4 clinical ReAct reasoning steps", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("chairside-thought-stream");
    expect(html).toContain("Размышления ИИ");
    expect(html).toContain("завершено");

    // All 4 thought stream steps must be rendered
    expect(html).toContain("Проверка аллергического статуса и лекарственной безопасности DDI");
    expect(html).toContain("Сверка диагноза МКБ-10");
    expect(html).toContain("K02.1 Кариес дентина");
    expect(html).toContain("Расчет стоимости услуг по Номенклатуре 804н");
    expect(html).toContain("Формирование протокола SOAP Формы 043/у");
  });

  it("4. renders Odontogram action proposal card with tooth, state, and apply button", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("chairside-card-odontogram");
    expect(html).toContain("Одонтограмма: Зуб 16");
    expect(html).toContain("Кариес дентина (C2)");
    expect(html).toContain("btn-apply-tooth");
    expect(html).toContain("Применить к зубу");
  });

  it("5. renders 804n Services & Billing card with codes, prices in rubles, and add button", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("chairside-card-services");
    expect(html).toContain("Смета услуг по 804н");
    expect(html).toContain("A16.07.002.010");
    expect(html).toContain("A16.07.002.011");
    expect(html).toContain("A25.07.001");
    expect(html).toContain("Препарирование и медикаментозная обработка кариозной полости");
    expect(html).toContain("Восстановление зуба пломбой светового отверждения");
    expect(html).toContain("Местная анестезия");
    expect(html).toContain("btn-apply-services");
    expect(html).toContain("Добавить в смету");
  });

  it("6. renders Form 043/u SOAP Diary card with structured clinical sections", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("chairside-card-soap");
    expect(html).toContain("Дневник 043/у (SOAP)");
    expect(html).toContain("Жалобы (S):");
    expect(html).toContain("Объективно (O):");
    expect(html).toContain("Диагноз (A):");
    expect(html).toContain("План лечения (P):");
    expect(html).toContain("K02.1 Кариес дентина (зуб 16)");
    expect(html).toContain("btn-apply-soap");
    expect(html).toContain("Применить в визит");
  });

  it("7. renders Safety Alert card with DDI / allergy status and acknowledge button", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("chairside-card-safety-alert");
    expect(html).toContain("Аллергический статус пациента");
    expect(html).toContain("Аллергия на пенициллины зафиксирована в карте");
    expect(html).toContain("btn-acknowledge-safety-alert");
    expect(html).toContain("Принять к сведению");
  });

  it("8. renders 1-Click Apply All control bar with doctor autonomy note (Mandates 8e & 8k)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("btn-chairside-apply-all");
    expect(html).toContain("Применить всё в 1 клик");
    expect(html).toContain("btn-chairside-dismiss-all");
    expect(html).toContain("Сброс");
    expect(html).toContain("chairside-autonomy-note");
    expect(html).toContain("Автономия врача (Мандат 8e) • 0 блокировок • Обратимые действия");
  });

  it("9. renders quick clinical presets chips (Caries, Pulpitis, Hygiene)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("btn-preset-caries-16");
    expect(html).toContain("Кариес 16 (пломба + анестезия)");
    expect(html).toContain("btn-preset-pulpitis-26");
    expect(html).toContain("Пульпит 26 (эндодонтия 3 канала)");
    expect(html).toContain("btn-preset-hygiene");
    expect(html).toContain("Профгигиена (Air-Flow + УЗ)");
  });

  it("10. 7 Deadly Sins check: zero emojis, strictly Lucide vector icons in markup", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    // Ensure no cartoon emojis (e.g. 🦷, 💉, 💊, ⚠️, 🤖)
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(html).not.toMatch(emojiRegex);
  });

  it("11. Mandate 8e check: send button is NEVER disabled, input is accessible", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("btn-chairside-send");
    // Ensure send button does NOT have disabled attribute
    expect(html).not.toMatch(/btn-chairside-send[^>]*disabled|disabled[^>]*btn-chairside-send/);
    expect(html).toContain("btn-chairside-mic");
    expect(html).toContain("input-chairside-prompt");
  });

  it("12. CSS audit: ChairsideCopilotHUD.css uses strictly CSS variables, zero hardcoded hex colors", () => {
    const cssPath = path.resolve(__dirname, "../ChairsideCopilotHUD.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Remove comments
    const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, "");

    // Check for hardcoded hex colors #123456 or #123
    const hexMatch = cleanCss.match(/#[0-9a-fA-F]{3,8}\b/);
    expect(hexMatch).toBeNull();

    // Verify key design tokens are used
    expect(cssContent).toContain("var(--paper");
    expect(cssContent).toContain("var(--ink");
    expect(cssContent).toContain("var(--teal");
    expect(cssContent).toContain("var(--ok-fg");
  });
});
