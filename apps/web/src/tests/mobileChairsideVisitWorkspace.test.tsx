/**
 * apps/web/src/tests/mobileChairsideVisitWorkspace.test.tsx
 * DENTE Dental CRM — Red Team Verification Suite:
 * Sovereign Mobile Chairside Visit Workspace (Apple iOS HIG §3.2)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  MobileChairsideVisitWorkspace,
  type MobileChairsideStep,
} from "../components/visit/MobileChairsideVisitWorkspace";

test("Sovereign Mobile Chairside Visit Workspace Suite (Apple HIG)", async (t) => {
  const dummyPatient = {
    id: "pat-101",
    fullName: "Воронова Елена Дмитриевна",
    phone: "+7 (999) 234-56-78",
    birthDate: "1994-06-15",
    allergies: ["Лидокаин", "Пенициллин"],
  };

  const dummyAppointment = {
    id: "apt-202",
    startTime: "2026-10-05T09:00:00Z",
    status: "in_progress",
  };

  const dummyNoteForm = {
    complaint: "Жалобы на ноющие боли от холодного в зубе 16.",
    anamnesis: "Соматически здоров. Аллергия на Лидокаин.",
    objectiveStatus: "Зуб 16: кариозная полость средней глубины на окклюзионной поверхности.",
    diagnosis: "К02.1 Кариес дентина",
    treatmentPlan: "Препарирование, медикаментозная обработка, пломба световой полимеризации.",
  };

  await t.test("1. Renders 1-Row Compact Top HUD with Patient info, phone link, visit timer and allergy alert", () => {
    const html = renderToString(
      <MobileChairsideVisitWorkspace
        activePatient={dummyPatient}
        activeAppointment={dummyAppointment}
        visitNoteForm={dummyNoteForm}
        updateVisitNoteField={() => {}}
        consolidatedAllergyChip="Аллергия: Лидокаин, Пенициллин"
        patientAge="32 года"
        handlePrintForm043uFast={() => {}}
        handleOpenLabOrder={() => {}}
        onClose={() => {}}
      />,
    );

    assert.ok(html.includes("Воронова Елена Дмитриевна"), "Must render patient full name");
    assert.ok(html.includes("+7 (999) 234-56-78"), "Must render patient phone");
    assert.ok(html.includes("tel:+7 (999) 234-56-78"), "Must provide clickable tel: link");
    assert.ok(html.includes("32 года"), "Must render patient age");
    assert.ok(html.includes("Аллергия: Лидокаин, Пенициллин"), "Must render consolidated allergy badge");
    assert.ok(html.includes("mobile-chairside-allergy-pulse"), "Must apply pulsing alert animation");
  });

  await t.test("2. Renders 5-Segment Step Progress Bar in Apple HIG style", () => {
    const html = renderToString(
      <MobileChairsideVisitWorkspace
        activePatient={dummyPatient}
        activeAppointment={dummyAppointment}
        visitNoteForm={dummyNoteForm}
        updateVisitNoteField={() => {}}
      />,
    );

    assert.ok(html.includes("1. Жалобы"), "Must render step 1 label");
    assert.ok(html.includes("2. Осмотр"), "Must render step 2 label");
    assert.ok(html.includes("3. Диагноз"), "Must render step 3 label");
    assert.ok(html.includes("4. Лечение"), "Must render step 4 label");
    assert.ok(html.includes("5. Итог и Чек"), "Must render step 5 label");
  });

  await t.test("3. Prominent 52px 1-Tap Somatic Norm button is rendered", () => {
    const html = renderToString(
      <MobileChairsideVisitWorkspace
        activePatient={dummyPatient}
        activeAppointment={dummyAppointment}
        visitNoteForm={dummyNoteForm}
        updateVisitNoteField={() => {}}
        handleApplySomaticNormQuick={() => {}}
      />,
    );

    assert.ok(html.includes("mobile-chairside-norm-btn"), "Must render 52px norm button class");
    assert.ok(html.includes("✓ Соматически здоров / Норма"), "Must render standard norm CTA");
    assert.ok(html.includes("1 тап"), "Must indicate 1-tap simplicity");
  });

  await t.test("4. Full-Width SmartMicrophone voice dictation card is rendered", () => {
    const html = renderToString(
      <MobileChairsideVisitWorkspace
        activePatient={dummyPatient}
        activeAppointment={dummyAppointment}
        visitNoteForm={dummyNoteForm}
        updateVisitNoteField={() => {}}
      />,
    );

    assert.ok(html.includes("mobile-smart-mic-card"), "Must render smart microphone card");
    assert.ok(html.includes("Голосовая диктовка SmartMic"), "Must offer voice dictation CTA");
    assert.ok(html.includes("+ Перкуссия норм"), "Must render quick dental phrases");
    assert.ok(html.includes("+ Анестезия 1.7мл"), "Must render quick anesthesia phrase");
  });

  await t.test("5. Natural Thumb Zone Floating Bottom Bar with 52px CTA is rendered", () => {
    const html = renderToString(
      <MobileChairsideVisitWorkspace
        activePatient={dummyPatient}
        activeAppointment={dummyAppointment}
        visitNoteForm={dummyNoteForm}
        updateVisitNoteField={() => {}}
      />,
    );

    assert.ok(html.includes("mobile-chairside-floating-bar"), "Must render floating bottom bar");
    assert.ok(html.includes("mobile-chairside-primary-cta"), "Must render 52px primary CTA button");
    assert.ok(html.includes("Далее: 2. Осмотр"), "Must prompt for next clinical step");
  });

  await t.test("6. CSS Invariant Verification: 0px horizontal drift, safe-area-insets, touch targets", () => {
    const candidate1 = path.resolve(process.cwd(), "src/components/visit/mobile-chairside-visit.css");
    const candidate2 = path.resolve(process.cwd(), "apps/web/src/components/visit/mobile-chairside-visit.css");
    const cssPath = fs.existsSync(candidate1) ? candidate1 : candidate2;
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // 0px horizontal drift invariant
    assert.ok(cssContent.includes("overflow-x: clip"), "Must enforce overflow-x: clip");
    assert.ok(cssContent.includes("max-width: 100vw"), "Must enforce max-width: 100vw");

    // Safe area insets protection
    assert.ok(cssContent.includes("env(safe-area-inset-top"), "Must respect Dynamic Island / Notch safe-area-inset-top");
    assert.ok(cssContent.includes("env(safe-area-inset-bottom"), "Must respect Home Indicator safe-area-inset-bottom");

    // 52px button heights
    assert.ok(cssContent.includes("min-height: 52px"), "Must define 52px touch targets");
    assert.ok(cssContent.includes("backdrop-filter: blur(20px)"), "Must use iOS glass blur");
  });
});
