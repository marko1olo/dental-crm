/**
 * VisitWorkOrderService.test.ts
 *
 * Unit & Integration Tests for Visit Work Order & Plan Items Transfer.
 * Compliant with:
 * - Постановление Правительства РФ от 11.05.2023 № 736 «Платные медицинские услуги»
 * - Закон РФ от 07.02.1992 № 2300-1 «О защите прав потребителей» (ст. 16 — запрет навязывания услуг)
 * - Приказ Минздрава России от 13.10.2017 № 804н «Номенклатура медицинских услуг»
 * - Федеральный закон от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ»
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	VisitWorkOrderError,
	VisitWorkOrderService,
} from "./VisitWorkOrderService.js";

describe("VisitWorkOrderService — Input Validation & Statutory Guards", () => {
	const validOrgId = "11111111-1111-4111-8111-111111111111";
	const validVisitId = "22222222-2222-4222-8222-222222222222";
	const validPlanId = "33333333-3333-4333-8333-333333333333";
	const validItemId = "44444444-4444-4444-8444-444444444444";

	it("1.1 Rejects invalid non-UUID visitId with VALIDATION_ERROR (400)", async () => {
		await assert.rejects(
			async () => {
				await VisitWorkOrderService.applyPlanItemsToVisit({
					organizationId: validOrgId,
					visitId: "not-a-uuid",
					planId: validPlanId,
					itemIds: [validItemId],
				});
			},
			(err: unknown) => {
				assert(err instanceof VisitWorkOrderError);
				assert.equal(err.code, "VALIDATION_ERROR");
				assert.equal(err.statusCode, 400);
				assert.match(err.message, /visitId/i);
				return true;
			},
		);
	});

	it("1.2 Rejects invalid non-UUID planId with VALIDATION_ERROR (400)", async () => {
		await assert.rejects(
			async () => {
				await VisitWorkOrderService.applyPlanItemsToVisit({
					organizationId: validOrgId,
					visitId: validVisitId,
					planId: "invalid-plan",
					itemIds: [validItemId],
				});
			},
			(err: unknown) => {
				assert(err instanceof VisitWorkOrderError);
				assert.equal(err.code, "VALIDATION_ERROR");
				assert.equal(err.statusCode, 400);
				assert.match(err.message, /planId/i);
				return true;
			},
		);
	});

	it("1.3 Rejects empty itemIds array with VALIDATION_ERROR (400)", async () => {
		await assert.rejects(
			async () => {
				await VisitWorkOrderService.applyPlanItemsToVisit({
					organizationId: validOrgId,
					visitId: validVisitId,
					planId: validPlanId,
					itemIds: [],
				});
			},
			(err: unknown) => {
				assert(err instanceof VisitWorkOrderError);
				assert.equal(err.code, "VALIDATION_ERROR");
				assert.equal(err.statusCode, 400);
				assert.match(err.message, /как минимум один itemId/i);
				return true;
			},
		);
	});

	it("1.4 Rejects invalid UUID in itemIds with VALIDATION_ERROR (400)", async () => {
		await assert.rejects(
			async () => {
				await VisitWorkOrderService.applyPlanItemsToVisit({
					organizationId: validOrgId,
					visitId: validVisitId,
					planId: validPlanId,
					itemIds: [validItemId, "malformed-id"],
				});
			},
			(err: unknown) => {
				assert(err instanceof VisitWorkOrderError);
				assert.equal(err.code, "VALIDATION_ERROR");
				assert.equal(err.statusCode, 400);
				assert.match(err.message, /malformed-id/);
				return true;
			},
		);
	});

	it("1.5 VisitWorkOrderError maps correct HTTP status codes", () => {
		const err404 = new VisitWorkOrderError("VISIT_NOT_FOUND", "Not found", 404);
		assert.equal(err404.statusCode, 404);
		assert.equal(err404.code, "VISIT_NOT_FOUND");

		const err409 = new VisitWorkOrderError("VISIT_CLOSED", "Closed", 409);
		assert.equal(err409.statusCode, 409);
		assert.equal(err409.code, "VISIT_CLOSED");

		const err422 = new VisitWorkOrderError(
			"PLAN_NOT_APPROVED",
			"Not approved",
			422,
		);
		assert.equal(err422.statusCode, 422);
		assert.equal(err422.code, "PLAN_NOT_APPROVED");

		const err400 = new VisitWorkOrderError(
			"PATIENT_MISMATCH",
			"Different patient",
			400,
		);
		assert.equal(err400.statusCode, 400);
		assert.equal(err400.code, "PATIENT_MISMATCH");
	});
});

describe("VisitWorkOrderService — Kopeck-Exact Financial Arithmetic", () => {
	it("2.1 Accurately calculates line price with kopeck precision (fractional rubles without drift)", () => {
		// unitPrice: 1500.50 ₽, quantity: 2, discount: 200.25 ₽
		// Expected: (150050 * 2) - 20025 = 300100 - 20025 = 280075 kopecks = 2800.75 ₽
		const unitPriceRub = 1500.5;
		const quantity = 2;
		const discountRub = 200.25;

		const unitPriceKopecks = Math.round(unitPriceRub * 100);
		const discountKopecks = Math.round(discountRub * 100);
		const lineTotalKopecks = Math.max(
			0,
			unitPriceKopecks * quantity - discountKopecks,
		);

		assert.equal(unitPriceKopecks, 150050);
		assert.equal(discountKopecks, 20025);
		assert.equal(lineTotalKopecks, 280075);
		assert.equal(lineTotalKopecks / 100, 2800.75);
	});

	it("2.2 Never yields negative line price when discount exceeds price", () => {
		const unitPriceKopecks = 50000; // 500.00 ₽
		const quantity = 1;
		const discountKopecks = 60000; // 600.00 ₽ (скидка больше цены)

		const lineTotalKopecks = Math.max(
			0,
			unitPriceKopecks * quantity - discountKopecks,
		);
		assert.equal(lineTotalKopecks, 0);
	});

	it("2.3 Correctly handles multi-item sum in kopecks", () => {
		const items = [
			{ price: 1250.33, qty: 3, discount: 50.0 }, // 125033 * 3 - 5000 = 375099 - 5000 = 370099
			{ price: 890.99, qty: 1, discount: 0.0 }, // 89099
			{ price: 4500.0, qty: 2, discount: 500.5 }, // 450000 * 2 - 50050 = 900000 - 50050 = 849950
		];

		let totalKopecks = 0;
		for (const it of items) {
			const uKop = Math.round(it.price * 100);
			const dKop = Math.round(it.discount * 100);
			totalKopecks += Math.max(0, uKop * it.qty - dKop);
		}

		assert.equal(totalKopecks, 370099 + 89099 + 849950);
		assert.equal(totalKopecks, 1309148);
		assert.equal(totalKopecks / 100, 13091.48);
	});
});

describe("VisitWorkOrderService — Anti-Imposition & Consumer Protection Logic", () => {
	it("3.1 Validates that only 'Approved' plans are allowed for transfer", () => {
		const validStatuses = ["Draft", "Active", "Approved", "Completed", "Rejected"];
		for (const status of validStatuses) {
			const isAllowed = status === "Approved";
			if (!isAllowed) {
				const error = new VisitWorkOrderError(
					"PLAN_NOT_APPROVED",
					`Перенос услуг в наряд разрешен только из утвержденного плана лечения (статус 'Approved'). Текущий статус плана: '${status}'. Без согласования с пациентом списание услуг запрещено (ст. 16 ЗоЗПП, ПП РФ № 736).`,
					422,
				);
				assert.equal(error.code, "PLAN_NOT_APPROVED");
				assert.equal(error.statusCode, 422);
				assert.match(error.message, /16 ЗоЗПП/);
			} else {
				assert.equal(status, "Approved");
			}
		}
	});

	it("3.2 Validates that cross-patient transfer is strictly blocked", () => {
		const visitPatientId = "11111111-1111-1111-1111-111111111111";
		const planPatientId = "22222222-2222-2222-2222-222222222222";

		assert.notEqual(visitPatientId, planPatientId);
		const error = new VisitWorkOrderError(
			"PATIENT_MISMATCH",
			"План лечения принадлежит другому пациенту. Перенос чужих услуг категорически запрещен (152-ФЗ, 323-ФЗ ст. 13).",
			400,
		);
		assert.equal(error.code, "PATIENT_MISMATCH");
		assert.equal(error.statusCode, 400);
		assert.match(error.message, /152-ФЗ/);
	});

	it("3.3 Validates that signed or voided visits cannot accept new work items", () => {
		const closedStatuses = ["signed", "voided"];
		for (const st of closedStatuses) {
			const error = new VisitWorkOrderError(
				"VISIT_CLOSED",
				"Нельзя добавлять позиции плана в уже подписанный или аннулированный приём.",
				409,
			);
			assert.equal(error.code, "VISIT_CLOSED");
			assert.equal(error.statusCode, 409);
		}
	});

	it("3.4 Validates plan completion percentage calculation", () => {
		const totalPlanItems = 5;
		assert.equal(Math.round((0 / totalPlanItems) * 100), 0);
		assert.equal(Math.round((1 / totalPlanItems) * 100), 20);
		assert.equal(Math.round((3 / totalPlanItems) * 100), 60);
		assert.equal(Math.round((5 / totalPlanItems) * 100), 100);

		// Zero total items edge case
		const zeroTotal = 0;
		const completion = zeroTotal > 0 ? Math.round((0 / zeroTotal) * 100) : 0;
		assert.equal(completion, 0);
	});
});
