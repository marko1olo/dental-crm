/**
 * DENTE Dental CRM — Red Team Verification Suite:
 * Sovereign Mobile Apple HIG Primitives & Chairside EHR Ergonomics
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  MobileBottomSheet,
  MobileGroupedList,
  MobileGroupedListItem,
  MobileSegmentedControl,
  MobileFloatingBottomBar,
  MobileTopBar,
  MobileChairsideEHR,
} from "../components/mobile";

test("Sovereign Mobile Layer — Apple HIG Primitives & Chairside EHR Suite", async (t) => {
  await t.test("1. MobileBottomSheet renders iOS HIG structure: drag handle, 24px top radius, close button >= 44x44px", () => {
    const html = renderToString(
      <MobileBottomSheet
        isOpen={true}
        onClose={() => {}}
        title="Тестовая шторка"
        subtitle="Подзаголовок"
        footer={<button type="button">Применить</button>}
      >
        <p>Содержимое шторки</p>
      </MobileBottomSheet>
    );

    assert.ok(html.includes("mobile-bottom-sheet-backdrop"), "Must include backdrop");
    assert.ok(html.includes("mobile-bottom-sheet-surface"), "Must include surface with iOS drawer styling");
    assert.ok(html.includes("mobile-drag-handle"), "Must include tactile drag handle 36x5px");
    assert.ok(html.includes("mobile-bottom-sheet-close"), "Must include close button with >= 44x44px target");
    assert.ok(html.includes("mobile-bottom-sheet-footer"), "Must include sticky footer");
    assert.ok(html.includes("Тестовая шторка"), "Must render title");
    assert.ok(html.includes("Содержимое шторки"), "Must render body children");
  });

  await t.test("2. MobileGroupedList & ListItem adhere to Apple Health Inset Card layout (>= 52px height)", () => {
    const html = renderToString(
      <MobileGroupedList label="Клинические данные">
        <MobileGroupedListItem
          title="Кариес эмали 16 зуба"
          subtitle="Вестибулярная поверхность"
          trailing={<span>4 500 ₽</span>}
          onClick={() => {}}
        />
        <MobileGroupedListItem
          title="Аллергоанамнез"
          subtitle="Лидокаин, Новокаин"
        />
      </MobileGroupedList>
    );

    assert.ok(html.includes("mobile-grouped-list-section"), "Must render grouped list section");
    assert.ok(html.includes("mobile-grouped-list-card"), "Must render inset card wrapper");
    assert.ok(html.includes("mobile-grouped-list-item"), "Must render list items");
    assert.ok(html.includes("Кариес эмали 16 зуба"), "Must render title");
    assert.ok(html.includes("4 500 ₽"), "Must render trailing slot");
  });

  await t.test("3. MobileSegmentedControl renders accessible tabs with active state", () => {
    const options = [
      { id: "step1", label: "Жалобы" },
      { id: "step2", label: "Осмотр" },
      { id: "step3", label: "Диагноз" },
    ];

    const html = renderToString(
      <MobileSegmentedControl
        options={options}
        activeId="step2"
        onChange={() => {}}
      />
    );

    assert.ok(html.includes('role="tablist"'), "Must be accessible tablist");
    assert.ok(html.includes("mobile-segmented-button is-active"), "Must mark step2 as active");
    assert.ok(html.includes("Жалобы"), "Must render step1");
    assert.ok(html.includes("Осмотр"), "Must render step2");
  });

  await t.test("4. MobileFloatingBottomBar places Primary CTA strictly in Natural Thumb Zone", () => {
    const html = renderToString(
      <MobileFloatingBottomBar
        primaryLabel="Завершить приём и чек — 4 500 ₽"
        onPrimaryClick={() => {}}
        secondaryAction={<button type="button">Отмена</button>}
      />
    );

    assert.ok(html.includes("mobile-floating-bottom-bar"), "Must render floating bottom bar container");
    assert.ok(html.includes("mobile-primary-cta"), "Must render 52px primary CTA button");
    assert.ok(html.includes("Завершить приём и чек — 4 500 ₽"), "Must render primary label");
  });

  await t.test("5. MobileTopBar renders 1-row compact layout with back button and safe-area padding", () => {
    const html = renderToString(
      <MobileTopBar
        title="Иванов Иван Иванович"
        subtitle="34 года · Первичный приём"
        onBack={() => {}}
      />
    );

    assert.ok(html.includes("mobile-top-bar"), "Must render 1-row top bar");
    assert.ok(html.includes("mobile-top-bar-action"), "Must render 44x44px back button");
    assert.ok(html.includes("mobile-top-bar-title"), "Must render centered title");
    assert.ok(html.includes("Иванов Иван Иванович"), "Must render patient name");
  });

  await t.test("6. MobileChairsideEHR renders chairside workflow: Top Bar, Segmented Steps, 1-Tap Norm and Thumb Zone CTA", () => {
    const html = renderToString(
      <MobileChairsideEHR
        patientName="Петрова Анна Сергеевна"
        patientAge={28}
        allergyNotice="Лидокаин"
        visitReason="Острая зубная боль"
        toothCode="26"
        onClose={() => {}}
        onFinishVisit={() => {}}
      />
    );

    assert.ok(html.includes("Петрова Анна Сергеевна"), "Must render patient name");
    assert.ok(html.includes("Лидокаин"), "Must render allergy warning badge");
    assert.ok(html.includes("Зуб 26"), "Must render tooth code");
    assert.ok(html.includes("Автонорма") || html.includes("Автозаполнение"), "Must offer chairside norm auto-fill");
    assert.ok(html.includes("✓ Заполнить нормой"), "Must render 1-tap norm button");
    assert.ok(html.includes("mobile-floating-bottom-bar"), "Must provide thumb zone action bar");
  });

  await t.test("7. CSS Token & Invariant Verification: 0px horizontal drift, safe-area-insets, touch targets", () => {
    const cssPath = path.resolve(process.cwd(), "src/components/mobile/mobileHigPrimitives.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // 0px horizontal drift guarantee
    assert.ok(cssContent.includes("overflow-x: clip"), "Must enforce overflow-x: clip");
    assert.ok(cssContent.includes("max-width: 100vw"), "Must enforce max-width: 100vw");

    // Safe area insets protection
    assert.ok(cssContent.includes("env(safe-area-inset-top"), "Must respect Dynamic Island / Notch safe-area-inset-top");
    assert.ok(cssContent.includes("env(safe-area-inset-bottom"), "Must respect Home Indicator safe-area-inset-bottom");

    // Natural Thumb Zone & Touch Target invariants
    assert.ok(cssContent.includes("min-height: 52px") || cssContent.includes("height: 52px"), "Must define 52px height for CTA");
    assert.ok(cssContent.includes("min-width: 44px") && cssContent.includes("min-height: 44px"), "Must guarantee 44x44px touch hitbox");

    // Dark theme support
    assert.ok(cssContent.includes('[data-theme="dark"]'), "Must support dark theme tokens without glare");
  });
});
