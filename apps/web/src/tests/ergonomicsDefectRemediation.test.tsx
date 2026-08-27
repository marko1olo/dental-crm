import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientBillingModal } from "../components/finance/PatientBillingModal";
import { CbctHotkeysStatusBar } from "../components/radiology/CbctHotkeysStatusBar";
import { ScheduleView } from "../ScheduleView";
import { AppLogicProvider } from "../contexts/AppLogicContext";

describe("Frontend Ergonomics & Layout Defects Remediation", () => {
  it("1. PatientBillingModal: max-w-5xl, full non-truncated title & unclipped WhatsApp button", () => {
    const html = renderToStaticMarkup(
      createElement(PatientBillingModal, {
        isOpen: true,
        onClose: () => {},
        patient: {
          fullName: "Иванов Иван Иванович",
          phone: "+7 (999) 123-45-67",
        },
        doctor: {
          fullName: "Д-р Смирнов А. П.",
        },
      }),
    );

    assert.ok(
      html.includes("max-w-5xl"),
      "PatientBillingModal container must have max-w-5xl for 1440px viewport",
    );
    assert.ok(
      html.includes("Гарантийный талон"),
      "Title must include full 'Гарантийный талон' text without truncation",
    );
    assert.ok(
      html.includes("whitespace-nowrap"),
      "Title must have whitespace-nowrap to avoid ellipsis at 1440px",
    );
    assert.ok(
      html.includes("В WhatsApp"),
      "Subnavigation must include 'В WhatsApp' button",
    );
    assert.ok(
      html.includes("shrink-0"),
      "WhatsApp button and text must have shrink-0 to prevent right-edge clipping",
    );
  });

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

  it("3. Floating Softphone CSS: safe bottom/right spacing avoiding toast collision", () => {
    const cssPath = path.resolve(
      import.meta.dirname,
      "../components/telephony/telephonyFloatingWidget.css",
    );
    const cssContent = fs.readFileSync(cssPath, "utf8");

    assert.ok(
      cssContent.includes("bottom: 84px"),
      "telephonyFloatingWidget.css must position floating softphone at bottom: 84px on desktop to avoid toast collision",
    );
    assert.ok(
      cssContent.includes("right: 24px"),
      "telephonyFloatingWidget.css must align right: 24px on desktop",
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
});