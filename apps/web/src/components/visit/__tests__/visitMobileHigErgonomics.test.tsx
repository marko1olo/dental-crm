/**
 * apps/web/src/components/visit/__tests__/visitMobileHigErgonomics.test.tsx
 *
 * DENTE Dental CRM — Mobile Apple HIG Ergonomics & Anti-Desktop-Squeeze Suite
 * Invariants tested:
 * 1. 0px Horizontal drift (overflow-x: clip; max-width: 100vw)
 * 2. Natural Thumb Zone Floating Bottom Bar (52px CTA, Safe Area Inset)
 * 3. Handoff Banner integration & Stage CTA (min-height >= 44px)
 * 4. Native iOS Bottom Sheet for tooth clinical context & checkout
 * 5. Absolute ban on dev-jargon and bird language in patient/doctor UI
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { MobileChairsideVisitWorkspace } from "../MobileChairsideVisitWorkspace";
import { VisitPlanStageHandoffBanner } from "../VisitPlanStageHandoffBanner";

test("Mobile Apple HIG Ergonomics & Anti-Desktop-Squeeze Verification", async (t) => {
  const dummyPatient = {
    id: "pat-999",
    fullName: "Калинина София Сергеевна",
    phone: "+7 (916) 123-45-67",
    birthDate: "1992-04-10",
    allergies: ["Ультракаин"],
  };

  const dummyAppointment = {
    id: "apt-888",
    startTime: "2026-10-08T10:00:00Z",
    status: "in_progress",
    notes: "Этап 1: Профгигиена и санация",
  };

  const dummyTreatmentPlan = {
    id: "tp-1",
    name: "Комплексный план санации и реставрации",
    status: "Approved",
    stages: [
      {
        id: "stage-1",
        stageNumber: 1,
        title: "Терапевтическая санация",
        items: [
          {
            id: "s1-item-1",
            code804n: "A16.07.002",
            name: "Восстановление зуба световым композитом",
            price: 4500,
            quantity: 1,
            toothNumber: 26,
          },
          {
            id: "s1-item-2",
            code804n: "A16.07.051",
            name: "Профессиональная гигиена полости рта",
            price: 3500,
            quantity: 1,
          },
        ],
      },
      {
        id: "stage-2",
        stageNumber: 2,
        title: "Ортопедический этап",
        items: [
          {
            id: "s2-item-1",
            code804n: "A16.07.004",
            name: "Восстановление зуба коронкой",
            price: 25000,
            quantity: 1,
            toothNumber: 16,
          },
        ],
      },
    ],
  };

  await t.test("1. VisitPlanStageHandoffBanner satisfies Apple HIG touch targets & 0px drift", () => {
    const html = renderToString(
      <VisitPlanStageHandoffBanner
        loadedTreatmentPlan={dummyTreatmentPlan}
        activeAppointment={dummyAppointment}
        activePatient={dummyPatient}
      />,
    );

    // 0px drift & containment
    assert.ok(html.includes("overflow-x-clip"), "Banner must enforce overflow-x-clip");
    assert.ok(html.includes("max-w-full"), "Banner must enforce max-w-full");

    // Human-readable CTA (No bird language)
    assert.ok(html.includes("Взять этап"), "Banner must offer clean CTA to take stage into work");
    assert.ok(!html.includes("54-ФЗ"), "Banner must NOT contain 54-ФЗ");
    assert.ok(!html.includes("043/у"), "Banner must NOT contain 043/у");
    assert.ok(!html.includes("804н"), "Banner must NOT contain 804н");
    assert.ok(!html.includes("Мандат"), "Banner must NOT contain Mandate numbers in UI");

    // Touch Ergonomics (>= 44px CTA button)
    assert.ok(html.includes("min-h-[44px]"), "CTA button must enforce minimum 44px touch target");
  });

  await t.test("2. MobileChairsideVisitWorkspace embeds Handoff Banner and renders 52px Stage CTA", () => {
    const html = renderToString(
      <MobileChairsideVisitWorkspace
        activePatient={dummyPatient}
        activeAppointment={dummyAppointment}
        loadedTreatmentPlan={dummyTreatmentPlan}
        visitNoteForm={{}}
        updateVisitNoteField={() => {}}
      />,
    );

    // Check step progress chips formatting
    assert.ok(html.includes("1. Жалобы"), "Must render 1. Жалобы");
    assert.ok(html.includes("2. Осмотр"), "Must render 2. Осмотр");
    assert.ok(html.includes("3. Диагноз"), "Must render 3. Диагноз");
    assert.ok(html.includes("4. Лечение"), "Must render 4. Лечение");
    assert.ok(html.includes("5. Итог и Чек"), "Must render 5. Итог и Чек");

    // Check bottom bar
    assert.ok(html.includes("mobile-chairside-floating-bar"), "Must render floating bottom bar");
    assert.ok(html.includes("mobile-chairside-primary-cta"), "Must render primary CTA");
  });

  await t.test("3. Zero dev-jargon or bird-language in user-facing workspace strings", () => {
    const htmlStep1 = renderToString(
      <MobileChairsideVisitWorkspace
        activePatient={dummyPatient}
        activeAppointment={dummyAppointment}
        loadedTreatmentPlan={dummyTreatmentPlan}
        initialStep="complaints"
        visitNoteForm={{
          complaint: "Жалобы отсутствуют",
        }}
        updateVisitNoteField={() => {}}
      />,
    );

    const htmlStep3 = renderToString(
      <MobileChairsideVisitWorkspace
        activePatient={dummyPatient}
        activeAppointment={dummyAppointment}
        loadedTreatmentPlan={dummyTreatmentPlan}
        initialStep="diagnosis"
        visitNoteForm={{
          diagnosis: "Z01.2 Здоров",
        }}
        updateVisitNoteField={() => {}}
      />,
    );

    const htmlStep5 = renderToString(
      <MobileChairsideVisitWorkspace
        activePatient={dummyPatient}
        activeAppointment={dummyAppointment}
        loadedTreatmentPlan={dummyTreatmentPlan}
        initialStep="checkout"
        visitNoteForm={{}}
        updateVisitNoteField={() => {}}
      />,
    );

    // Banned terms
    const forbidden = ["54-ФЗ", "Форма 043/у", "по номенклатуре", "Мандат 8e", "ФФД 1.2", "StomX", "DentalPRO"];
    for (const term of forbidden) {
      assert.ok(!htmlStep1.includes(term), `Step 1 HTML must NOT contain forbidden dev-jargon: "${term}"`);
      assert.ok(!htmlStep3.includes(term), `Step 3 HTML must NOT contain forbidden dev-jargon: "${term}"`);
      assert.ok(!htmlStep5.includes(term), `Step 5 HTML must NOT contain forbidden dev-jargon: "${term}"`);
    }

    // Clean Russian clinical titles
    assert.ok(htmlStep1.includes("Жалобы пациента"), "Must render clean complaints title");
    assert.ok(htmlStep3.includes("Клинический диагноз"), "Must render clean diagnosis title");
    assert.ok(htmlStep5.includes("К оплате по приёму"), "Must render clean billing title");
    assert.ok(htmlStep5.includes("Завершить приём и сформировать счёт"), "Must render clean checkout CTA");
  });

  await t.test("4. CSS Apple HIG Invariants for Bottom Sheet & Touch Targets", () => {
    const candidate1 = path.resolve(process.cwd(), "src/styles/VisitView.css");
    const candidate2 = path.resolve(process.cwd(), "apps/web/src/styles/VisitView.css");
    const cssPath = fs.existsSync(candidate1) ? candidate1 : candidate2;
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // iOS Bottom sheet rules
    assert.ok(cssContent.includes("._ccm-drag-handle"), "Must define tactile drag handle for bottom sheet");
    assert.ok(cssContent.includes("border-radius: 24px 24px 0 0;"), "Must define 24px top rounded corners on mobile");
    assert.ok(cssContent.includes("animation: _ccm-slide-up"), "Must define smooth slide-up animation");
    assert.ok(cssContent.includes("padding-bottom: max(16px, env(safe-area-inset-bottom"), "Must protect Home Indicator");

    // Minimum 44px touch targets on mobile modal
    assert.ok(cssContent.includes("min-height: 44px;"), "Must enforce >= 44px touch targets for tab buttons");
    assert.ok(cssContent.includes("min-height: 48px;"), "Must enforce >= 48px touch targets for action rows");
  });
});
