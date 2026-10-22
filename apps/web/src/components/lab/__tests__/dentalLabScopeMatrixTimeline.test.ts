import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_LAB_PRICE_MATRIX } from "../DentalLabPriceMatrixModal";
import {
	CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES,
	checkFittingAppointmentCollision,
} from "../dentalLabOrderEngine";

describe("dentalLabScopeMatrixTimeline — Matrix & Timeline", () => {
	it("Прайс-матрица ЗТЛ содержит обязательные типы конструкций", () => {
		const matrixIds = CANONICAL_LAB_PRICE_MATRIX.map((item) => item.id);
		assert.ok(matrixIds.includes("crown_zirconia_katana"));
		assert.ok(matrixIds.includes("crown_emax_press"));
		assert.ok(matrixIds.includes("metal_ceramic_noritake"));
		assert.ok(matrixIds.includes("veneer_emax_refractory"));
		assert.ok(matrixIds.includes("clasp_denture_bredent"));
		assert.ok(matrixIds.includes("removable_acry_free"));
		assert.ok(matrixIds.includes("ortho_aligners_pack"));
		assert.ok(matrixIds.includes("surgical_guide_implant"));

		for (const item of CANONICAL_LAB_PRICE_MATRIX) {
			assert.ok(item.turnaroundBusinessDays > 0);
			assert.ok(item.suggestedCostRub > 0);
			assert.ok(item.suggestedPriceRub >= item.suggestedCostRub);
		}
	});

	it("Канонический 6-этапный жизненный цикл и детектор коллизий", () => {
		assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.length, 6);
		const stageIds = CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.map((s) => s.id);
		assert.deepEqual(stageIds, [
			"impression_taken",
			"courier_sent",
			"framework_fitting",
			"ceramic_layering",
			"ready_in_clinic",
			"patient_fixation",
		]);

		const today = new Date();
		const in5Days = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
		const in2Days = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
		const collision = checkFittingAppointmentCollision(in5Days, in2Days);
		assert.equal(collision.hasCollision, true);

		const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
		const noCollision = checkFittingAppointmentCollision(in5Days, in7Days);
		assert.equal(noCollision.hasCollision, false);
	});
});
