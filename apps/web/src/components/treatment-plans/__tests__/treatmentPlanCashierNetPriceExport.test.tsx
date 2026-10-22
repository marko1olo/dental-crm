/**
 * treatmentPlanCashierNetPriceExport.test.tsx — Тестирование сопоставления чистых цен
 * со скидками врача при экспорте плана в кассу (Mandates 8e, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Kopecks } from "@dental/shared";
import { exportPlanToCashier } from "../treatmentPlanNetworkSync.js";
import type { TreatmentPlanStage } from "../types.js";
import { buildMockTier } from "./helpers/cashierExportTestHelpers.js";

describe("exportPlanToCashier — Net Price Mapping with Doctor Discounts", () => {
	it("maps discounted line items to net unit prices preserving exact invoice total parity", async () => {
		if (typeof (globalThis as any).window === "undefined") {
			(globalThis as any).window = {
				dispatchEvent: () => true,
				addEventListener: () => {},
				removeEventListener: () => {},
			};
		}
		const dispatchedEvents: string[] = [];
		const originalDispatch = (globalThis as any).window?.dispatchEvent;
		(globalThis as any).window.dispatchEvent = (ev: any) => {
			if (ev?.type) dispatchedEvents.push(ev.type);
			return true;
		};

		const stages: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Терапевтический этап",
				subtitle: "Санация",
				clinicalGoal: "Лечение кариеса",
				order804nCodes: ["A16.07.002"],
				totalRub: 8000,
				totalKopecks: 800000 as Kopecks,
				estimatedWeeks: 1,
				estimatedVisits: 1,
				items: [
					{
						id: "it-discounted",
						name: "Восстановление зуба светоотверждаемым композитом",
						code804n: "A16.07.002",
						category: "Терапия",
						stageKind: "stage_1_therapy",
						unitPriceRub: 10000,
						priceRub: 8000,
						discountRub: 2000,
						quantity: 1,
					},
				],
			},
		];

		const dummyTier = buildMockTier(stages, 8000, 800000 as Kopecks);
		const loyaltyDeduction = {
			availableBalanceRub: 0,
			appliedBonusRub: 0,
			appliedBonusKopecks: 0 as Kopecks,
			grossKopecks: 1000000 as Kopecks,
			discountKopecks: 200000 as Kopecks,
			netPayableKopecks: 800000 as Kopecks,
			netPayableRub: 8000,
		};

		const originalFetch = (globalThis as any).fetch;
		(globalThis as any).fetch = async (url: string) => {
			if (url.includes("/api/invoices/generate-from-plan")) {
				return {
					ok: true,
					json: async () => ({
						success: true,
						invoice: { id: "11111111-2222-3333-4444-555555555555", totalAmountRub: 8000, status: "issued" },
					}),
				};
			}
			return { ok: true, json: async () => ({}) };
		};

		try {
			const exported = await exportPlanToCashier({
				patientId: "00000000-0000-0000-0000-000000000001",
				patientName: "Волков Дмитрий Андреевич",
				stages,
				currentTier: dummyTier,
				loyaltyDeduction,
			});

			assert.ok(exported, "exportPlanToCashier must return exported invoice data");
			assert.equal(exported.totalAmountRub, 8000);
			assert.equal(exported.status, "issued");
			assert.equal(exported.items.length, 1);
			assert.equal(exported.items[0]!.priceRub, 8000, "Line item must reflect net unit price after discount");
			const lineSum = exported.items.reduce((sum, item) => sum + item.quantity * item.priceRub, 0);
			assert.equal(lineSum, exported.totalAmountRub, "Sum of line items must strictly equal invoice total amount");
			assert.ok(dispatchedEvents.includes("dente-cashbox-refresh"), "Must trigger cashbox refresh event");
			assert.ok(dispatchedEvents.includes("dente-invoices-updated"), "Must trigger invoices updated event");
		} finally {
			(globalThis as any).fetch = originalFetch;
			(globalThis as any).window.dispatchEvent = originalDispatch;
		}
	});
});
