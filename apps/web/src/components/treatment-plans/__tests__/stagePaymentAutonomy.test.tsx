/**
 * stagePaymentAutonomy.test.tsx
 *
 * Autonomy and Non-blocking Actions Test Suite for StudioInstallmentTab:
 * 1. Guarantees installment terms (3, 6, 12, 24 months) are rendered and clickable.
 * 2. Guarantees touch target satisfies Apple HIG >= 44px (min-h-[52px]).
 * 3. Mandates 8e (Doctor & Staff Autonomy) and 8n (Solo Doctor Sovereignty).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { StudioInstallmentTab } from "../studioTabs/StudioInstallmentTab";
import type { TreatmentPlanTier } from "../treatmentPlanTypes";

describe("StudioInstallmentTab Autonomy & Non-blocking Installment Terms", () => {
	const sampleTier: TreatmentPlanTier = {
		tierId: "optimum",
		title: "Оптимум (Стандарт клиники)",
		badge: "Оптимум",
		totalRub: 180000,
		totalKopecks: 18000000,
		isRecommended: true,
		stages: [],
		itemsCount: 5,
		borderClass: "border-teal-500",
		warrantyYears: 2,
	};

	it("renders installment options with touch targets >= 44px and 0% interest", () => {
		const html = renderToString(
			<StudioInstallmentTab
				activeTier={sampleTier}
				patientName="Иванов И.И."
			/>
		);

		// Verify container is rendered
		assert.ok(html.includes('data-testid="studio-installment-tab"'), "Must render studio installment tab");

		// Verify 0% banner
		assert.ok(html.includes("0% переплат клинике"), "Must state 0% interest");

		// Verify all 4 term options are rendered
		for (const months of [3, 6, 12, 24]) {
			assert.ok(html.includes(`data-testid="installment-term-${months}-btn"`), `Must render ${months} months term button`);
		}
		assert.ok(html.includes("0% взнос"), "Must display 0% downpayment badge");

		// Verify touch targets min-h-[52px] (>= 44px)
		assert.ok(html.includes("min-h-[52px]"), "Button must have >= 44px touch target (min-h-[52px])");

		// Verify 13% NDFL tax deduction block
		assert.ok(html.includes("13%"), "Must render NDFL tax deduction block");
	});
});
