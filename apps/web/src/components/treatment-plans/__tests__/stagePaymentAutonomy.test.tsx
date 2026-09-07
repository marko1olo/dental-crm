/**
 * stagePaymentAutonomy.test.tsx
 *
 * Autonomy and Non-blocking Actions Test Suite for StagePaymentPlanModal:
 * 1. Guarantees auto-allocate deposit button is NOT hard-disabled when deposit is 0.
 * 2. Guarantees touch target satisfies Apple HIG >= 44px.
 * 3. Mandates 8e (Doctor & Staff Autonomy) and 8n (Solo Doctor Sovereignty).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { StagePaymentPlanModal } from "../stagePayment/StagePaymentPlanModal";

describe("StagePaymentPlanModal Autonomy & Non-blocking Deposit Allocation", () => {
	const sampleStages = [
		{
			id: "stage-1",
			stageNumber: 1,
			kind: "therapy" as const,
			title: "Терапевтический этап",
			totalKopecks: 500000,
			totalAmountKopecks: 500000,
			advanceRequiredKopecks: 150000,
			advancePaidKopecks: 0,
			escrowLockedKopecks: 0,
			completionPaidKopecks: 0,
			directExpensesKopecks: { labKopecks: 0, materialsKopecks: 0, otherKopecks: 0 },
			items: [],
			status: "draft" as const,
		},
	];

	const sampleWallet = {
		totalBalanceKopecks: 0,
		availableDepositKopecks: 0,
		lockedEscrowKopecks: 0,
	};

	it("renders auto-allocate deposit button as enabled (disabled === false) even when deposit is 0", () => {
		const html = renderToString(
			<StagePaymentPlanModal
				isOpen={true}
				onClose={() => {}}
				planTitle="Комплексный план лечения"
				patientName="Иванов И.И."
				initialStages={sampleStages as any}
				initialDepositKopecks={0 as any}
				initialTab="escrow"
			/>
		);

		// Verify button is rendered
		assert.ok(html.includes("Распределить свободный депозит"), "Must render auto-allocate button");

		// Verify button is NOT hard-disabled
		assert.ok(!html.includes('disabled="" class="stage-action-btn primary'), "Auto-allocate button must NOT be hard-disabled");

		// Verify min-height >= 44px
		assert.ok(html.includes("min-height: 44px") || html.includes("minHeight: 44px") || html.includes("min-height:44px"), "Button must have >= 44px touch target");
	});
});
