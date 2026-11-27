import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	clearPendingCheckoutStorage,
	resolveEffectiveBillingSummary,
	resolveEffectivePatient,
} from "../useFinanceView.js";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders.js";
import { CashRegisterStudioFooter } from "../../../components/cashbox/studioModules/CashRegisterStudioFooter.js";

describe("RED TEAM INQUISITION: Finance POS & Pending Checkout Data Continuity", () => {
	it("1. useFinanceView prioritizes pendingCheckout patient and billing summary over stale props", () => {
		const mockStalePatient = { id: "pat-stale", fullName: "Старый Пациент" };
		const mockPendingCheckout = {
			patientId: "pat-pending",
			patientName: "Свежий Пациент из Приёма",
			patientPhone: "+7 (999) 000-11-22",
			totalDueRub: 15400,
			services: [{ id: "srv-1" }],
		};

		const patientWithPending = resolveEffectivePatient({
			pendingCheckout: mockPendingCheckout as never,
			documentPatient: mockStalePatient,
		});
		assert.strictEqual(patientWithPending?.id, "pat-pending");
		assert.strictEqual(patientWithPending?.fullName, "Свежий Пациент из Приёма");

		const patientWithoutPending = resolveEffectivePatient({
			pendingCheckout: null,
			documentPatient: mockStalePatient,
		});
		assert.strictEqual(patientWithoutPending?.id, "pat-stale");

		const mockStaleBilling = { totalDueRub: 5000, totalPaidRub: 0 };
		const summaryWithPending = resolveEffectiveBillingSummary({
			pendingCheckout: mockPendingCheckout as never,
			billingSummary: mockStaleBilling,
		});
		assert.strictEqual(summaryWithPending?.totalDueRub, 15400);

		const summaryWithoutPending = resolveEffectiveBillingSummary({
			pendingCheckout: null,
			billingSummary: mockStaleBilling,
		});
		assert.strictEqual(summaryWithoutPending?.totalDueRub, 5000);
	});

	it("2. clearPendingCheckoutStorage removes dente_pending_checkout from storage and resets state", () => {
		const removedSession: string[] = [];
		const removedLocal: string[] = [];
		const originalWindow = globalThis.window;

		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: {
				sessionStorage: { removeItem: (k: string) => removedSession.push(k) },
				localStorage: { removeItem: (k: string) => removedLocal.push(k) },
			},
		});

		try {
			let clearedCheckout: unknown = { patientId: "p-1" };
			let clearedAmount = "1500";
			clearPendingCheckoutStorage(
				(v) => {
					clearedCheckout = v;
				},
				(v) => {
					clearedAmount = v;
				},
			);
			assert.deepEqual(removedSession, ["dente_pending_checkout"]);
			assert.deepEqual(removedLocal, ["dente_pending_checkout"]);
			assert.equal(clearedCheckout, null);
			assert.equal(clearedAmount, "");
		} finally {
			if (originalWindow === undefined) {
				Reflect.deleteProperty(globalThis, "window");
			} else {
				Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
			}
		}
	});

	it("3. denteClinicalMutationHeaders forwards explicit Idempotency-Key for billing mutations", () => {
		const headers = denteClinicalMutationHeaders({
			"Content-Type": "application/json",
			"Idempotency-Key": "idemp-fin-001",
		});
		assert.equal(headers["Idempotency-Key"], "idemp-fin-001");
		assert.equal(headers["Content-Type"], "application/json");
	});

	it("4. CashRegisterStudioFooter renders Apple HIG >= 44px touch targets and safe-area padding", () => {
		const html = renderToStaticMarkup(
			React.createElement(CashRegisterStudioFooter, {
				activeTab: "checkout",
				isShiftActive: true,
				isSubmitting: false,
				effectiveTotalKopecks: 150000n,
				calculatedNetRevenueKopecks: 150000n,
				shiftNumber: 1,
				isWarranty: false,
				onClose: () => {},
				onExecutePayment: () => {},
				onToggleShift: () => {},
				onPrintXReport: () => {},
				onCopyTape: () => {},
			}),
		);
		assert.ok(html.includes("min-h-[44px]"));
		assert.ok(html.includes("env(safe-area-inset-bottom)"));
	});
});
