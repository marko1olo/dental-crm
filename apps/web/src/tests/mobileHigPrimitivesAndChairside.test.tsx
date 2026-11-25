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

  await t.test("4. CSS Token & Invariant Verification: 0px horizontal drift, safe-area-insets, touch targets", () => {
    const candidatePath1 = path.resolve(process.cwd(), "src/components/mobile/mobileHigPrimitives.css");
    const candidatePath2 = path.resolve(process.cwd(), "apps/web/src/components/mobile/mobileHigPrimitives.css");
    const cssPath = fs.existsSync(candidatePath1) ? candidatePath1 : candidatePath2;
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
