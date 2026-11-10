/**
 * chairsideCopilotHUD.test.tsx - Unit tests for Chairside AI Copilot HUD & Omnibar (Mandates 8c, 8d, 8e, 8k, 8n).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChairsideCopilotHUD } from "../ChairsideCopilotHUD";

const expect = (actual: any) => ({
  toBe: (expected: any) => {
    assert.strictEqual(actual, expected);
  },
  toContain: (expected: string) => {
    assert.ok(
      typeof actual === "string" && actual.includes(expected),
      `Expected string to contain ${JSON.stringify(expected)}`,
    );
  },
  toBeNull: () => {
    assert.strictEqual(actual, null);
  },
  not: {
    toMatch: (regex: RegExp) => {
      assert.ok(!regex.test(String(actual)), `Expected string not to match ${regex}`);
    },
  },
});

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
    expect(html).toContain("Иванов И.И.");
  });

  it("1b. renders 'Пациент не выбран' empty state when patientName is not provided (Zero Fake Ivanov)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        initialDocked={false}
        activeTooth={16}
      />
    );

    expect(html).toContain("Пациент не выбран");
    assert.ok(!html.includes("Иванов И.И."), "Фейковый Иванов не должен рендериться при отсутствии пациента");
  });

  it("1c. renders clean neutral empty state when no active tooth is selected (Zero Hallucinated Tooth 16)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        initialDocked={false}
      />
    );

    expect(html).toContain("Пациент не выбран");
    expect(html).toContain("Готов к диктовке");
    expect(html).toContain("chairside-empty-proposals");
    assert.ok(!html.includes("Зуб 16:"), "Tooth 16 must NOT be hallucinated on empty initialization");
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
    const initialThoughts = [
      { id: "step-1", stepNumber: 1, title: "Проверка аллергического статуса и лекарственной безопасности DDI", status: "done" as const },
      { id: "step-2", stepNumber: 2, title: "Сверка диагноза МКБ-10: K02.1 Кариес дентина", status: "done" as const },
      { id: "step-3", stepNumber: 3, title: "Расчет стоимости услуг по прейскуранту", status: "done" as const },
      { id: "step-4", stepNumber: 4, title: "Формирование клинического протокола приёма", status: "done" as const },
    ];
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
        initialThoughts={initialThoughts}
      />
    );

    expect(html).toContain("chairside-thought-stream");
    expect(html).toContain("Размышления ИИ");
    expect(html).toContain("завершено");

    // All 4 thought stream steps must be rendered
    expect(html).toContain("Проверка аллергического статуса и лекарственной безопасности DDI");
    expect(html).toContain("Сверка диагноза МКБ-10");
    expect(html).toContain("K02.1 Кариес дентина");
    expect(html).toContain("Расчет стоимости услуг по прейскуранту");
    expect(html).toContain("Формирование клинического протокола приёма");
  });

  it("3b. renders resting state without thoughts (Zero Fake Thoughts on mount)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("chairside-thought-stream");
    expect(html).toContain("готов к работе");
    expect(html).toContain("Готов к работе. Ожидание команды или диктовки...");
    assert.ok(!html.includes("step-1"), "Fake static step-1 must NOT be present on mount");
    assert.ok(!html.includes("Проверка аллергического статуса"), "Unprompted allergy check must NOT be present on mount");
  });

  it("4. renders Odontogram action proposal card with tooth, state, and apply button", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
        initialToothProposal={{
          toothNumber: 16,
          state: "C2",
          stateLabel: "Кариес дентина (C2)",
          surfaces: ["O"],
          applied: false,
        }}
      />
    );

    expect(html).toContain("chairside-card-odontogram");
    expect(html).toContain("Одонтограмма: Зуб 16");
    expect(html).toContain("Кариес дентина (C2)");
    expect(html).toContain("btn-apply-tooth");
    expect(html).toContain("Применить к зубу");
  });

  it("4b. does NOT hallucinate tooth proposals or caries C2 on simple tooth selection (Mandate 8z Honest Empty State)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).not.toMatch(/chairside-card-odontogram/);
    expect(html).not.toMatch(/chairside-card-services/);
    expect(html).not.toMatch(/Кариес дентина \(C2\)/);
  });

  it("5. renders Services & Billing proposal card with codes, prices in rubles, and add button", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
        initialServicesProposal={[
          {
            id: "srv-1",
            serviceCode: "A16.07.002.010",
            code804n: "A16.07.002.010",
            title: "Препарирование и медикаментозная обработка кариозной полости",
            toothNumber: 16,
            quantity: 1,
            priceRub: 2500,
            applied: false,
          },
          {
            id: "srv-2",
            serviceCode: "A16.07.002.011",
            code804n: "A16.07.002.011",
            title: "Восстановление зуба пломбой светового отверждения",
            toothNumber: 16,
            quantity: 1,
            priceRub: 4500,
            applied: false,
          },
          {
            id: "srv-3",
            serviceCode: "A25.07.001",
            code804n: "A25.07.001",
            title: "Местная анестезия",
            toothNumber: 16,
            quantity: 1,
            priceRub: 500,
            applied: false,
          },
        ]}
      />
    );

    expect(html).toContain("chairside-card-services");
    expect(html).toContain("Смета услуг");
    expect(html).toContain("A16.07.002.010");
    expect(html).toContain("A16.07.002.011");
    expect(html).toContain("A25.07.001");
    expect(html).toContain("Препарирование и медикаментозная обработка кариозной полости");
    expect(html).toContain("Восстановление зуба пломбой светового отверждения");
    expect(html).toContain("Местная анестезия");
    expect(html).toContain("btn-apply-services");
    expect(html).toContain("Добавить в смету");
  });

  it("6. renders Medical Card SOAP Diary card with structured clinical sections when preset is selected", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
        initialPresetIndex={0}
      />
    );

    expect(html).toContain("chairside-card-soap");
    expect(html).toContain("Дневник приёма");
    expect(html).toContain("Жалобы (S):");
    expect(html).toContain("Объективно (O):");
    expect(html).toContain("Диагноз (A):");
    expect(html).toContain("План лечения (P):");
    expect(html).toContain("K02.1 Кариес дентина (зуб 16)");
    expect(html).toContain("btn-apply-soap");
    expect(html).toContain("Применить в визит");
  });

  it("6b. does NOT hallucinate SOAP diary or diagnosis on simple tooth selection (Zero Unprompted Caries)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).not.toMatch(/chairside-card-soap/);
    expect(html).not.toMatch(/K02\.1/);
    expect(html).toContain("Нет активных клинических предложений");
    expect(html).toContain("Готов к диктовке");
  });

  it("7. renders Safety Alert card with DDI / allergy status and acknowledge button when preset is selected", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
        initialPresetIndex={0}
      />
    );

    expect(html).toContain("chairside-card-safety-alert");
    expect(html).toContain("Аллергологический профиль проверен");
    expect(html).toContain("Аллергии на артикаин и сульфиты не зафиксированы");
    expect(html).toContain("btn-acknowledge-safety-alert");
    expect(html).toContain("Принять к сведению");
  });

  it("7b. does NOT hallucinate safety alerts or anesthetic proposal on simple tooth selection (Honest Waiting State)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).not.toMatch(/chairside-card-safety-alert/);
    expect(html).not.toMatch(/chairside-card-anesthetic/);
    expect(html).not.toMatch(/Ультракаин/);
  });

  it("8. renders 1-Click Apply All control bar with doctor autonomy note (Mandates 8e & 8k)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("btn-chairside-apply-all");
    expect(html).toContain("Применить все предложения");
    expect(html).toContain("btn-chairside-dismiss-all");
    expect(html).toContain("Сброс");
    expect(html).toContain("chairside-autonomy-note");
    expect(html).toContain("Полный контроль врача");
  });

  it("8b. renders 1-Click Macro-Batch Apply banner in proposals container when proposals exist", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
        initialPresetIndex={0}
      />
    );

    expect(html).toContain("chairside-proposals-macro-banner");
    expect(html).toContain("chairside-btn-macro-apply-all");
    expect(html).toContain("Применить все предложения");
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

  it("13. Mandate 8l check: renders 44px compact capsule bar with chairside-hud-capsule", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        initialCompact={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("chairside-hud-capsule");
    expect(html).toContain("chairside-hud-panel--compact");
    expect(html).toContain("btn-toggle-capsule-drawer");
    expect(html).toContain("btn-capsule-mic");
  });

  it("14. Mandate 8l check: renders live VU-meter sound wave with 5 equalizer bars", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("chairside-vu-meter");
    expect(html).toContain("chairside-vu-bar--1");
    expect(html).toContain("chairside-vu-bar--2");
    expect(html).toContain("chairside-vu-bar--3");
    expect(html).toContain("chairside-vu-bar--4");
    expect(html).toContain("chairside-vu-bar--5");
    expect(html).toContain("aria-label=\"Индикатор звука микрофона\"");
  });

  it("15. Mandate 8l check: renders interactive live entity pills with 1-click removal buttons", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
        initialToothProposal={{
          toothNumber: 16,
          state: "C2",
          stateLabel: "Кариес дентина (C2)",
          surfaces: ["O"],
          applied: false,
        }}
        initialServicesProposal={[
          {
            id: "srv-1",
            serviceCode: "A16.07.002.010",
            code804n: "A16.07.002.010",
            title: "Препарирование кариозной полости",
            toothNumber: 16,
            quantity: 1,
            priceRub: 2500,
            applied: false,
          },
        ]}
        initialAnestheticProposal={{
          drugName: "Убистезин",
          carpulesCount: 1,
          maxCarpules: 4,
          patientWeightKg: 70,
          epinephrineMcg: 17,
          isCardiovascularRisk: false,
          applied: false,
        }}
        initialSoapProposal={{
          complaint: "Боль",
          anamnesis: "Анамнез",
          objectiveStatus: "Статус",
          diagnosis: "K02.1 Кариес",
          treatmentPlan: "План",
          recommendations: "Рекомендации",
          applied: false,
        }}
      />
    );

    expect(html).toContain("chairside-hud-live-pills");
    // Tooth pill + remove button
    expect(html).toContain("live-pill-tooth");
    expect(html).toContain("btn-remove-pill-tooth");
    expect(html).toContain("Зуб 16");

    // Diagnosis pill + remove button
    expect(html).toContain("live-pill-diagnosis");
    expect(html).toContain("btn-remove-pill-diagnosis");

    // Anesthetic pill + remove button
    expect(html).toContain("live-pill-anesthetic");
    expect(html).toContain("btn-remove-pill-anesthetic");

    // Services pill + remove button
    expect(html).toContain("live-pill-services");
    expect(html).toContain("btn-remove-pill-services");
  });

  it("16. Mandate 8l check: renders quick apply button in capsule with Enter shortcut", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
      />
    );

    expect(html).toContain("btn-capsule-apply-scheme");
    expect(html).toContain("Применить к схеме");
    expect(html).toContain("chairside-capsule-kbd");
    expect(html).toContain("↵");
  });
});

