import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientBillingModal } from "../components/finance/PatientBillingModal";
import { OneCExportButton } from "../components/finance/OneCExportButton";
import { PediatricMixedDentitionModal } from "../components/odontogram/PediatricMixedDentitionModal";
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

  it("5. PatientBillingModal Audit Remediation: legal requisites, single WhatsApp button, titanium implant icon, dark close button, 2x2 footer & anti-matryoshka", () => {
    const html = renderToStaticMarkup(
      createElement(PatientBillingModal, {
        isOpen: true,
        onClose: () => {},
        patient: {
          id: "pat-1",
          fullName: "Иванов Иван Иванович",
          phone: "+7 (999) 123-45-67",
        },
        doctor: {
          fullName: "Д-р Смирнов А. П.",
        },
        initialServices: [
          {
            id: "srv-1",
            name: "Восстановление зуба пломбой Filtek Ultimate",
            code804n: "A16.07.002.001",
            toothNumber: "16",
            quantity: 1,
            priceRub: 6500,
            category: "therapy",
          },
          {
            id: "srv-2",
            name: "Установка дентального имплантата Straumann BLX",
            code804n: "A16.07.054",
            toothNumber: "26",
            quantity: 1,
            priceRub: 55000,
            category: "implantology",
          },
        ],
      }),
    );

    // 1. Legal requisites: no truncate, full text with Order 804n & Law 2300-1
    assert.ok(
      html.includes("Приказ МЗ РФ № 804н") && html.includes("Закон РФ № 2300-1"),
      "Legal requisites must include both Order 804n and Law 2300-1",
    );
    assert.ok(
      html.includes("flex-wrap"),
      "Legal requisites line must use flex-wrap to prevent clipping on mobile",
    );

    // 2. WhatsApp Spam elimination: giant banner and duplicate tab removed, single footer button left
    assert.ok(
      !html.includes("btn-send-bill-whatsapp"),
      "Giant WhatsApp advertising banner in center must be removed",
    );
    assert.ok(
      !html.includes("btn-quick-whatsapp-bill"),
      "Duplicate WhatsApp tab in upper toolbar must be removed",
    );
    assert.ok(
      html.includes("btn-footer-send-whatsapp"),
      "Strict single WhatsApp button in bottom toolbar must be present",
    );

    // 3. Implant icon: no industrial gear emoji in implant group, uses medical icon
    assert.ok(
      !html.includes("⚙️"),
      "No industrial gear emoji should be used in dental implantology billing",
    );
    assert.ok(
      html.includes("Дентальный титановый имплантат"),
      "Implant badge title must be present",
    );

    // 4. Dark mode close button: no blinding white #f1f5f9
    assert.ok(
      html.includes("dark:bg-slate-800/60") && html.includes("dark:hover:bg-slate-700"),
      "Close button must use dark:bg-slate-800/60 and dark:hover:bg-slate-700 for Dark Mode",
    );

    // 5. Mobile footer 2x2 grid & 96px scroll container padding
    assert.ok(
      html.includes("grid-cols-2"),
      "Mobile footer must use 2x2 grid layout for action buttons",
    );
    assert.ok(
      html.includes("padding-bottom: 96px") || html.includes("padding-bottom:96px") || html.includes("pb-24"),
      "Scroll container must have padding-bottom: 96px to prevent fixed footer collision",
    );
    assert.ok(
      html.includes("btn-fiscalize-54fz") && html.includes("Фискализировать (54-ФЗ)"),
      "Bottom toolbar must contain 54-FZ fiscalization button",
    );

    // 6. Anti-Matryoshka: items inside group use divide-y without nested double border
    assert.ok(
      html.includes("divide-y"),
      "Service items must use divide-y without nested double borders",
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