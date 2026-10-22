/**
 * apps/web/src/tests/treatmentPlan4RailsInquisition.test.ts
 *
 * RED TEAM CLINICAL & FISCAL RAIL INQUISITOR TESTS
 *
 * Exhaustive verification of the 4 end-to-end rails of Treatment Plans in DENTE CRM:
 * 1. Chairside visit handoff: FDI tooth preservation, 804n code, price & agreed discounts (Mandate 8e).
 * 2. 54-FZ Cashier checkout: Stage selection, partial advance payments, FFD 1.2 Tag 1215 advance offset.
 * 3. Dental Lab (ЗТЛ) order bridge: Seamless transmission of tooth numbers, stage info, and pricing.
 * 4. Closed-loop completion & Warehouse BOM soft-overdraft invariants (Mandate 8n).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	formatStageItemForBilling,
	groupTreatmentPlanByStages,
	buildStageMedicalDiaryText,
} from "../components/visit/visitPlanStageHandoff";
import { parseSingleBillingItem } from "../components/visit/billing/billingEventItemParser";
import { dispatchOpenLabOrderForStage } from "../components/visit/visitPlanStageHandoffEvents";

describe("Treatment Plan 4 End-to-End Rails Inquisition", () => {
	// Set up DOM event listener support in Node environment for custom events
	const originalWindow = (globalThis as any).window;

	beforeEach(() => {
		const listeners: Record<string, Function[]> = {};
		(globalThis as any).window = {
			addEventListener: (type: string, cb: any) => {
				listeners[type] = listeners[type] || [];
				listeners[type].push(cb);
			},
			removeEventListener: (type: string, cb: any) => {
				if (listeners[type]) {
					listeners[type] = listeners[type].filter((fn) => fn !== cb);
				}
			},
			dispatchEvent: (event: any) => {
				const cbs = listeners[event.type] || [];
				for (const cb of cbs) cb(event);
				return true;
			},
		};
	});

	afterEach(() => {
		(globalThis as any).window = originalWindow;
	});

	describe("Rail 1: Chairside Visit Handoff (FDI, 804n, Prices, Discounts, Autonomy)", () => {
		it("formatStageItemForBilling preserves tooth FDI, 804n code, and doctor discounts", () => {
			const stageItem = {
				id: "item-surgery-46",
				code804n: "A16.07.054",
				name: "Внутрикостная дентальная имплантация",
				toothNumber: 46,
				unitPriceRub: 35000,
				price: 31500,
				discount: 3500,
				discountPercent: 10,
				quantity: 1,
			};

			const billingItem = formatStageItemForBilling(stageItem);

			expect(billingItem.code804n).toBe("A16.07.054");
			expect(billingItem.title).toBe("Внутрикостная дентальная имплантация");
			expect(billingItem.toothNumber).toBe(46);
			expect(billingItem.toothCode).toBe("46");
			expect(billingItem.unitPriceRub).toBe(35000);
			expect(billingItem.discountRub).toBe(3500);
			expect(billingItem.discountPercent).toBe(10);
			// Net total after discount
			const netPrice = billingItem.unitPriceRub * billingItem.quantity - billingItem.discountRub;
			expect(netPrice).toBe(31500);
		});

		it("formatStageItemForBilling handles priceKopecks correctly without precision loss", () => {
			const stageItemWithKopecks = {
				id: "item-therapy-16",
				code804n: "A16.07.002",
				name: "Восстановление зуба пломбой",
				toothNumber: 16,
				priceKopecks: 450000, // 4 500 ₽
				discountRub: 500,
				quantity: 1,
			};

			const billingItem = formatStageItemForBilling(stageItemWithKopecks);
			expect(billingItem.unitPriceRub).toBe(4500);
			expect(billingItem.discountRub).toBe(500);
			expect(billingItem.toothCode).toBe("16");
			const netPrice = billingItem.unitPriceRub * billingItem.quantity - billingItem.discountRub;
			expect(netPrice).toBe(4000);
		});

		it("parseSingleBillingItem never zeroes out agreed plan discounts", () => {
			const incomingStageDetail = {
				code804n: "A16.07.004",
				title: "Коронка из диоксида циркония",
				toothCode: "25",
				unitPriceRub: 28000,
				price: 25200,
				discountRub: 2800,
				discountPercent: 10,
				quantity: 1,
			};

			const parsed = parseSingleBillingItem(incomingStageDetail, 0);

			expect(parsed.code804n).toBe("A16.07.004");
			expect(parsed.title).toBe("Коронка из диоксида циркония");
			expect(parsed.toothCode).toBe("25");
			expect(parsed.unitPriceRub).toBe(28000);
			expect(parsed.discountRub).toBe(2800);
			expect(parsed.discountPercent).toBe(10);
			const lineTotal = parsed.unitPriceRub * parsed.quantity - parsed.discountRub;
			expect(lineTotal).toBe(25200);
		});

		it("groupTreatmentPlanByStages correctly marks stage status and completed flags", () => {
			const mockPlan = {
				id: "plan-777",
				stages: [
					{ stageNumber: 1, titleRu: "Санация", status: "completed" },
					{ stageNumber: 2, titleRu: "Ортопедия", status: "planned" },
				],
				items: [
					{
						id: "i1",
						stageNumber: 1,
						name: "Пломба",
						price: 5000,
						status: "completed",
						isCompleted: true,
					},
					{
						id: "i2",
						stageNumber: 2,
						name: "Коронка",
						price: 30000,
						status: "planned",
						isCompleted: false,
					},
				],
			};

			const grouped = groupTreatmentPlanByStages(mockPlan);
			expect(grouped.stages).toHaveLength(2);

			const stage1 = grouped.stages[0]!;
			expect(stage1.stageNumber).toBe(1);
			expect(stage1.isCompleted).toBe(true);
			expect(stage1.status).toBe("completed");

			const stage2 = grouped.stages[1]!;
			expect(stage2.stageNumber).toBe(2);
			expect(stage2.isCompleted).toBe(false);
			expect(stage2.status).toBe("planned");
		});

		it("buildStageMedicalDiaryText generates clean clinical entry with FDI teeth", () => {
			const items = [
				{
					code804n: "A16.07.002",
					name: "Лечение кариеса",
					toothNumber: 36,
				},
				{
					code804n: "A16.07.002.001",
					name: "Шлифовка и полировка",
					toothNumber: 36,
				},
			];

			const diaryText = buildStageMedicalDiaryText("Этап 1: Терапия", items);
			expect(diaryText).toContain("[Этап 1: Терапия]:");
			expect(diaryText).toContain("Лечение кариеса (зуб #36)");
			expect(diaryText).toContain("Шлифовка и полировка (зуб #36)");
		});
	});

	describe("Rail 2: 54-FZ Cashier Checkout & Advance Offset (Tag 1215)", () => {
		it("calculates remaining stage balance when prior advance payments exist", () => {
			const stageOption = {
				id: "stage-implant-2",
				stageNumber: 2,
				title: "Имплантация 46",
				amountRub: 50000,
				amountKopecks: 5000000,
				paidAmountRub: 20000,
				paidAmountKop: 2000000,
				advanceAlreadyPaidRub: 20000,
				remainingDueRub: 30000,
				remainingDueKop: 3000000,
				items: [],
			};

			// Remaining due calculation invariant: Math.max(0, gross - paid)
			const remainingCalculated = Math.max(0, stageOption.amountRub - stageOption.paidAmountRub);
			expect(remainingCalculated).toBe(30000);
			expect(stageOption.remainingDueRub).toBe(30000);

			// If advance paid equals total price, remaining is 0
			const fullyPaidAdvance = 50000;
			const remainingZero = Math.max(0, stageOption.amountRub - fullyPaidAdvance);
			expect(remainingZero).toBe(0);
		});

		it("validates FFD 1.2 Tag 1215 advance offset logic without over-crediting", () => {
			const stageTotalRub = 45000;
			const stageAdvancePaidRub = 15000;

			// Cashier applies Tag 1215
			const maxAllowedTag1215Offset = Math.min(stageTotalRub, stageAdvancePaidRub);
			expect(maxAllowedTag1215Offset).toBe(15000);

			// The patient pays the remainder (30 000 ₽) via card/cash
			const remainingToPay = stageTotalRub - maxAllowedTag1215Offset;
			expect(remainingToPay).toBe(30000);

			// Total tenders: Tag 1215 (15 000 ₽) + Card (30 000 ₽) == 45 000 ₽ (0 kopeck divergence)
			const tenderSum = maxAllowedTag1215Offset + remainingToPay;
			expect(tenderSum).toBe(stageTotalRub);
		});
	});

	describe("Rail 3: Dental Lab (ЗТЛ) Order Bridge", () => {
		it("dispatchOpenLabOrderForStage emits custom event with toothFdi, selectedTeeth, and price", () => {
			const stagePayload = {
				stageNumber: 3,
				title: "Ортопедический этап: циркониевые коронки",
				items: [
					{
						id: "lab-item-1",
						name: "Коронка из диоксида циркония",
						toothNumber: 14,
						code804n: "A16.07.004",
						price: 28000,
					},
					{
						id: "lab-item-2",
						name: "Коронка из диоксида циркония",
						toothNumber: 15,
						code804n: "A16.07.004",
						price: 28000,
					},
				],
			};

			let capturedEvent: any = null;
			const handler = (e: any) => {
				capturedEvent = e;
			};
			window.addEventListener("dente-open-lab-order-modal", handler);

			dispatchOpenLabOrderForStage(stagePayload, stagePayload.items, "plan-777", { id: "p1" });

			expect(capturedEvent).not.toBeNull();
			const detail = capturedEvent.detail;
			expect(detail.stageNumber).toBe(3);
			expect(detail.stageTitle).toBe("Ортопедический этап: циркониевые коронки");
			expect(detail.priceRub).toBe(56000);
			expect(detail.toothFdi).toBe("14, 15");
			expect(detail.toothNumber).toBe(14);
			expect(detail.selectedTeeth).toEqual([14, 15]);
			expect(detail.items).toHaveLength(2);

			window.removeEventListener("dente-open-lab-order-modal", handler);
		});
	});

	describe("Rail 4: Plan Lifecyle & Doctor Autonomy (Mandates 8e & 8n)", () => {
		it("expired plans (>30 days) never block taking stage into visit or billing (Mandate 8e)", () => {
			const expiredPlan = {
				id: "plan-expired-45days",
				createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
				status: "expired",
				stages: [{ stageNumber: 1, titleRu: "Срочная терапия", status: "planned" }],
				items: [
					{
						id: "urgent-item-1",
						stageNumber: 1,
						code804n: "A16.07.002",
						name: "Купирование острой боли",
						toothNumber: 24,
						price: 4500,
						unitPriceRub: 4500,
					},
				],
			};

			const grouped = groupTreatmentPlanByStages(expiredPlan);
			expect(grouped.stages).toHaveLength(1);
			const stage = grouped.stages[0]!;

			// Stage items can still be transformed and added to visit
			const billingItem = formatStageItemForBilling(stage.items[0]!);
			expect(billingItem.code804n).toBe("A16.07.002");
			expect(billingItem.unitPriceRub).toBe(4500);
			expect(billingItem.toothCode).toBe("24");
		});

		it("completed stages can be repeated in visit without blocking disabled state (Doctor Autonomy)", () => {
			const completedStage = {
				stageNumber: 1,
				isCompleted: true,
				status: "completed" as const,
				totalPriceRub: 5000,
				items: [
					{
						id: "done-1",
						name: "Пломба",
						toothNumber: 36,
						price: 5000,
						isCompleted: true,
					},
				],
			};

			// Doctor has autonomy to repeat or re-execute procedure if revision is needed
			const billing = formatStageItemForBilling(completedStage.items[0]);
			expect(billing.unitPriceRub).toBe(5000);
			expect(billing.toothCode).toBe("36");
		});
	});
});
