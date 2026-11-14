import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OneCExportButton } from "../components/finance/OneCExportButton";
import { PediatricMixedDentitionModal } from "../components/odontogram/PediatricMixedDentitionModal";
import { CbctHotkeysStatusBar } from "../components/radiology/CbctHotkeysStatusBar";
import { ScheduleView } from "../ScheduleView";
import { AppLogicProvider } from "../contexts/AppLogicContext";

describe("Frontend Ergonomics & Layout Defects Remediation", () => {
  it("2. CbctHotkeysStatusBar: unglued 'Shift+ЛКМ Вращение' with strict inline gap", () => {
    const html = renderToStaticMarkup(
      createElement(CbctHotkeysStatusBar, {
        activeViewport: "axial",
        onToggleHelp: () => {},
      }),
    );

    assert.ok(
      !html.includes("Shift+ЛКМВращение"),
      "Status bar must NOT contain glued text 'Shift+ЛКМВращение'",
    );
    assert.ok(
      html.includes("Shift+ЛКМ") && html.includes("Вращение"),
      "Status bar must contain both 'Shift+ЛКМ' and 'Вращение'",
    );
    assert.ok(
      html.includes("inline-flex items-center gap-1.5"),
      "Status bar badges must use inline-flex items-center gap-1.5 for clear physical spacing",
    );
  });

  it("3. Telephony Ambient Top Capsule & Drawer: Apple HIG non-blocking island layout", () => {
    const cssPath = path.resolve(
      import.meta.dirname,
      "../components/telephony/styles/telephonyCapsuleAndDrawer.css",
    );
    const cssContent = fs.readFileSync(cssPath, "utf8");

    assert.ok(
      cssContent.includes(".dnt-incoming-call-badge-container") && cssContent.includes("top: 12px"),
      "telephonyCapsuleAndDrawer.css must position incoming call capsule container at top: 12px for non-blocking ambient banner",
    );
    assert.ok(
      cssContent.includes(".dnt-incoming-call-capsule"),
      "telephonyCapsuleAndDrawer.css must contain .dnt-incoming-call-capsule style",
    );
    assert.ok(
      cssContent.includes(".dnt-telephony-patient-drawer") && cssContent.includes("width: 420px"),
      "telephonyCapsuleAndDrawer.css must specify patient drawer width of 420px strictly per Mandates 8b & 8e",
    );
  });

  it("4. ScheduleView: displays informative EmptyState with retry button when disconnected", () => {
    const html = renderToStaticMarkup(
      createElement(AppLogicProvider, {
        value: {} as any,
        children: createElement(ScheduleView as any, {
          dashboard: undefined,
          loadDashboard: async () => {},
          sortedAppointments: [],
        }),
      }),
    );

    assert.ok(
      html.includes("schedule-view-disconnected-state"),
      "Must render schedule-view-disconnected-state when dashboard is missing",
    );
    assert.ok(
      html.includes("Нет связи с сервером"),
      "Must display 'Нет связи с сервером' title in empty state",
    );
    assert.ok(
      html.includes("Повторить подключение"),
      "Must display 'Повторить подключение' button in empty state",
    );
    assert.ok(
      html.includes("btn-retry-schedule-connection"),
      "Must have data-testid='btn-retry-schedule-connection'",
    );
  });

  it("6. Pediatrics tabs overflow-x & age slider compact brackets; 1C button inline-flex center", () => {
    // 1. PediatricMixedDentitionModal
    const pediaHtml = renderToStaticMarkup(
      createElement(PediatricMixedDentitionModal, {
        isOpen: true,
        onClose: () => {},
      }),
    );

    assert.ok(
      pediaHtml.includes("overflow-x: auto") || pediaHtml.includes("overflow-x:auto") || pediaHtml.includes("overflow-x-auto"),
      "Pediatric modal tabs container must support horizontal scrolling without wrapping",
    );
    assert.ok(
      pediaHtml.includes("flex-shrink: 0") || pediaHtml.includes("flex-shrink:0") || pediaHtml.includes("shrink-0"),
      "Pediatric modal tabs must have flex-shrink: 0",
    );
    assert.ok(
      pediaHtml.includes("hidden sm:inline"),
      "Age slider scale must hide verbose text in brackets on mobile (<640px)",
    );
    assert.ok(
      pediaHtml.includes("Сроки смены</span>") && pediaHtml.includes("Cariogram</span>"),
      "Pediatric modal tabs must include compact mobile labels 'Сроки смены' and 'Cariogram'",
    );
    assert.ok(
      pediaHtml.includes("padding-bottom: 112px") || pediaHtml.includes("padding-bottom:112px") || pediaHtml.includes("pb-28"),
      "Pediatric modal scroll body must have 112px / pb-28 bottom padding to clear sticky footer",
    );

    // 2. OneCExportButton
    const btnHtml = renderToStaticMarkup(
      createElement(OneCExportButton, {
        actNumber: "АКТ-2026-101",
        items: [],
        totalRub: 1000,
      }),
    );

    assert.ok(
      btnHtml.includes("display: inline-flex") || btnHtml.includes("display:inline-flex") || btnHtml.includes("inline-flex"),
      "OneCExportButton must use inline-flex alignment",
    );
    assert.ok(
      btnHtml.includes("gap: 6px") || btnHtml.includes("gap:6px") || btnHtml.includes("gap-1.5"),
      "OneCExportButton must have 6px physical gap between icon and text",
    );
  });
});