/**
 * treatmentPlanCashierToolbarExport.test.tsx — Тестирование тулбара экспорта в кассу
 * и меню опций TreatmentPlanModule (Mandates 8c, 8d, 8e, 8k, 8n).
 */

import assert from "node:assert/strict";
import React from "react";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext.js";
import { TreatmentPlanModule } from "../TreatmentPlanModule.js";
import type { CashierInvoiceExportData } from "../types.js";
import { mockCashierAppContext, mockSampleTeeth } from "./helpers/cashierExportTestHelpers.js";

describe("TreatmentPlanModule — 1-Click Cashier Export Toolbar & Options Menu", () => {
	it("renders 1-click cashier export button 'tp-quick-cashier-btn' in toolbar with Send icon", () => {
		const html = renderToString(
			<AppLogicProvider value={mockCashierAppContext as any}>
				<TreatmentPlanModule
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
					teethData={mockSampleTeeth}
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="tp-quick-cashier-btn"'), "tp-quick-cashier-btn must be present on main toolbar");
		assert.ok(html.includes("В кассу"), "Button title or text 'В кассу' must be rendered");
		assert.ok(html.includes('data-testid="tp-invoice-btn"'), "tp-invoice-btn must be preserved alongside");
	});

	it("renders 1-click export action 'options-menu-export-cashier-btn' in options dropdown", () => {
		const html = renderToString(
			<AppLogicProvider value={mockCashierAppContext as any}>
				<TreatmentPlanModule
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
					teethData={mockSampleTeeth}
					initialOptionsMenuOpen={true}
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="options-menu-export-cashier-btn"'), "options-menu-export-cashier-btn must be rendered");
		assert.ok(html.includes("Отправить счет кассиру"), "Button must display clear clinical label without jargon");
	});

	it("guarantees Apple HIG touch target compliance (>= 44px touch, >= 38px desktop)", () => {
		const html = renderToString(
			<AppLogicProvider value={mockCashierAppContext as any}>
				<TreatmentPlanModule
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
					teethData={mockSampleTeeth}
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes("min-h-[44px]") && html.includes("sm:min-h-[38px]"), "Buttons must specify min-h-[44px] touch targets");
	});

	it("guarantees 0 cartoon emojis in treatment plan toolbar and menus (Mandate 8d)", () => {
		const html = renderToString(
			<AppLogicProvider value={mockCashierAppContext as any}>
				<TreatmentPlanModule
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
					teethData={mockSampleTeeth}
					initialOptionsMenuOpen={true}
				/>
			</AppLogicProvider>,
		);

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html), "Strict ban on cartoon emojis: only vector Lucide icons allowed");
	});

	it("accepts onExportToCashier prop and passes it cleanly without type errors", () => {
		let exportedData: CashierInvoiceExportData | null = null;
		const html = renderToString(
			<AppLogicProvider value={mockCashierAppContext as any}>
				<TreatmentPlanModule
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
					teethData={mockSampleTeeth}
					onExportToCashier={(data) => { exportedData = data; }}
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="tp-quick-cashier-btn"'), "TreatmentPlanModule must retain quick cashier button");
	});
});
