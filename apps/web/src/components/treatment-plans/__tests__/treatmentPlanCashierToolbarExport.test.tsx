/**
 * treatmentPlanCashierToolbarExport.test.tsx — Тестирование канонической студии планов лечения
 * TreatmentPlanStudioModal (Mandates 8c, 8d, 8e, 8k, 8n, 8am).
 */

import assert from "node:assert/strict";
import React from "react";
import { describe, it } from "node:test";
import { renderToString } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext.js";
import { TreatmentPlanStudioModal } from "../TreatmentPlanStudioModal.js";
import { mockCashierAppContext, mockSampleTeeth } from "./helpers/cashierExportTestHelpers.js";

describe("TreatmentPlanStudioModal — 1-Click Chairside Actions & Toolbar (SSOT)", () => {
	it("renders 1-click approve button 'approve-treatment-plan-btn' as Primary CTA", () => {
		const html = renderToString(
			<AppLogicProvider value={mockCashierAppContext}>
				<TreatmentPlanStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
					teeth={mockSampleTeeth}
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="approve-treatment-plan-btn"'), "approve-treatment-plan-btn must be present as Primary CTA");
		assert.ok(html.includes("Утвердить"), "Button title or text 'Утвердить' must be rendered");
		assert.ok(html.includes('data-testid="save-draft-btn"'), "save-draft-btn must be preserved alongside");
	});

	it("renders print and export button 'print-plan-btn' in header", () => {
		const html = renderToString(
			<AppLogicProvider value={mockCashierAppContext}>
				<TreatmentPlanStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
					teeth={mockSampleTeeth}
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="print-plan-btn"'), "print-plan-btn must be rendered");
		assert.ok(html.includes("Печать плана"), "Button must display clear clinical label without jargon");
	});

	it("guarantees Apple HIG touch target compliance (>= 44px touch)", () => {
		const html = renderToString(
			<AppLogicProvider value={mockCashierAppContext}>
				<TreatmentPlanStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
					teeth={mockSampleTeeth}
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes("min-h-[44px]") || html.includes("min-h-[52px]"), "Buttons must specify min-h-[44px] touch targets");
	});

	it("guarantees 0 cartoon emojis in treatment plan toolbar and menus (Mandate 8d)", () => {
		const html = renderToString(
			<AppLogicProvider value={mockCashierAppContext}>
				<TreatmentPlanStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
					teeth={mockSampleTeeth}
				/>
			</AppLogicProvider>,
		);

		const cartoonEmojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;
		assert.ok(!cartoonEmojiRegex.test(html), "Strict ban on cartoon emojis: only vector Lucide icons allowed");
	});

	it("accepts onApprovePlan prop and executes cleanly without type errors", () => {
		let approvedPlanId: string | null = null;
		const html = renderToString(
			<AppLogicProvider value={mockCashierAppContext}>
				<TreatmentPlanStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="PAT-WAVE62"
					patientName="Волков Дмитрий Андреевич"
					teeth={mockSampleTeeth}
					onApprovePlan={(tier) => { approvedPlanId = tier.tierId; }}
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="approve-treatment-plan-btn"'), "TreatmentPlanStudioModal must retain approve button");
	});
});
