/**
 * treatmentPlanCashierWarranty100Export.test.tsx — Тестирование экспорта 100% гарантийных
 * планов лечения в кассу со статусом warranty_100 и суммой 0 ₽ (Mandates 8e, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Kopecks } from "@dental/shared";
import { exportPlanToCashier } from "../treatmentPlanNetworkSync.js";
import type { TreatmentPlanStage } from "../types.js";
import { buildMockTier } from "./helpers/cashierExportTestHelpers.js";

describe("exportPlanToCashier — 100% Warranty Autonomy with 0 ₽ Price", () => {
	it("exports 100% clinical warranty plan with status 'warranty_100' and 0 ₽ prices", async () => {
		const stages: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Гарантийный прием",
				subtitle: "Коррекция",
				clinicalGoal: "Гарантийная пришлифовка",
				order804nCodes: ["A16.07.025"],
				totalRub: 0,
				totalKopecks: 0 as Kopecks,
				estimatedWeeks: 1,
				estimatedVisits: 1,
				items: [
					{
						id: "it-warranty",
						name: "Гарантийная шлифовка пломбы",
						code804n: "A16.07.025",
						category: "Терапия",
						stageKind: "stage_1_therapy",
						unitPriceRub: 2500,
						priceRub: 0,
						discountRub: 2500,
						quantity: 1,
						isWarranty: true,
					},
				],
			},
		];

		const dummyTier = {
			...buildMockTier(stages, 0, 0 as Kopecks),
			tierId: "standard" as const,
			title: "Стандарт",
			isRecommended: false,
		};

		const loyaltyDeduction = {
			availableBalanceRub: 0,
			appliedBonusRub: 0,
			appliedBonusKopecks: 0 as Kopecks,
			grossKopecks: 250000 as Kopecks,
			discountKopecks: 250000 as Kopecks,
			netPayableKopecks: 0 as Kopecks,
			netPayableRub: 0,
		};

		const originalFetch = (globalThis as any).fetch;
		(globalThis as any).fetch = async (url: string) => {
			if (url.includes("/api/invoices/generate-from-plan")) {
				return {
					ok: true,
					json: async () => ({
						success: true,
						invoice: { id: "22222222-3333-4444-5555-666666666666", totalAmountRub: 0, status: "warranty_100" },
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

			assert.ok(exported, "exportPlanToCashier must return exported warranty invoice data");
			assert.equal(exported.totalAmountRub, 0);
			assert.equal(exported.status, "warranty_100");
			assert.equal(exported.items[0]!.priceRub, 0);
		} finally {
			(globalThis as any).fetch = originalFetch;
		}
	});
});
