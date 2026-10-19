import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateBusinessDaysDueDate,
	mapStageOrStatusToMilestone,
	mapStageToLabOrderStatus,
} from "../../routes/lab/labTypesModules/labOrderStatusAndTrackingTypes.js";
import {
	CANONICAL_DENTAL_LAB_PRESETS,
	colorVitaSchema,
	createLabOrderSchema,
	expressLabOrderSchema,
	normalizeRestorationMaterial,
	normalizeRestorationType,
	normalizeShadeSystem,
	normalizeStumpShade,
	toothFdiSchema,
	validateFdiToothNotation,
} from "../../routes/lab/labTypesModules/labMaterialAndShadeTypes.js";
import {
	calculateLabOrderCostAndMarkup,
	calculateLabOrderTurnaround,
	estimateDeliveryAndFittingSchedule,
} from "../../routes/lab/ordersCrudModules/labOrderCostCalculator.js";
import {
	cadCamCrownOrderSchema,
	updateLabOrderSchema,
} from "../../routes/lab/ordersCrudModules/labOrderValidationSchemas.js";

describe("Dental Lab Orders Decomposition — Layer 0 Schemas & Types Parity", () => {
	it("validates FDI tooth notation: single teeth, spans, and whole-jaw appliances", () => {
		assert.equal(validateFdiToothNotation("16"), true);
		assert.equal(validateFdiToothNotation("11, 21, 22"), true);
		assert.equal(validateFdiToothNotation("46-47"), true);
		assert.equal(validateFdiToothNotation("ВЧ капа"), true);
		assert.equal(validateFdiToothNotation("Челюсть сплинты"), true);
		assert.equal(validateFdiToothNotation("all"), true);
		assert.equal(validateFdiToothNotation("999"), false);
	});

	it("normalizes and validates Vita shades including 3D Master and Bleach", () => {
		const resA2 = colorVitaSchema.safeParse("A2");
		assert.ok(resA2.success);
		assert.equal(resA2.data, "A2");

		const resLower = colorVitaSchema.safeParse("a1");
		assert.ok(resLower.success);
		assert.equal(resLower.data, "A1");

		const resBleach = colorVitaSchema.safeParse("BL1");
		assert.ok(resBleach.success);
		assert.equal(resBleach.data, "BL1");

		const resInvalid = colorVitaSchema.safeParse("NeonGreen");
		assert.equal(resInvalid.success, false);
	});

	it("validates CAD/CAM crown order schema for Zirconia and E.max", () => {
		const validZirconia = cadCamCrownOrderSchema.safeParse({
			patientId: "0192e2b0-8451-789a-bcde-000000000001",
			toothFdi: "16",
			material: "zirconia_ml",
			colorVita: "A2",
			shadeSystem: "VITA_CLASSICAL",
			occlusalClearanceMm: 1.5,
			finishLineType: "chamfer",
			priceRub: 24000,
		});
		assert.ok(validZirconia.success);
		assert.equal(validZirconia.data.material, "zirconia_ml");
		assert.equal(validZirconia.data.colorVita, "A2");

		const validEmax = cadCamCrownOrderSchema.safeParse({
			patientId: "0192e2b0-8451-789a-bcde-000000000002",
			toothFdi: "21",
			material: "emax_press",
			colorVita: "A1",
			shadeSystem: "VITA_3D_MASTER",
			stumpShade: "ND1",
			priceRub: 26000,
		});
		assert.ok(validEmax.success);
		assert.equal(validEmax.data.material, "emax_press");
		assert.equal(validEmax.data.stumpShade, "ND1");
	});

	it("validates updateLabOrderSchema allows partial clinical updates", () => {
		const partialUpdate = updateLabOrderSchema.safeParse({
			colorVita: "A3",
			clinicalNotes: "Уточнение прикуса: коррекция контактного пункта дистально.",
			priceRub: 28000,
		});
		assert.ok(partialUpdate.success);
		assert.equal(partialUpdate.data.colorVita, "A3");
		assert.equal(partialUpdate.data.priceRub, 28000);
	});

	it("normalizes restoration materials and restoration types correctly", () => {
		assert.equal(normalizeRestorationType("single_crown"), "crown_monolithic");
		assert.equal(normalizeRestorationType("crown_emax"), "crown_layered_cutback");
		assert.equal(normalizeRestorationType("aligners"), "clear_aligner_stage");

		assert.equal(normalizeRestorationMaterial("zirconia"), "zirconia_multilayer_gradient");
		assert.equal(normalizeRestorationMaterial("emax"), "emax_lithium_disilicate_press");
		assert.equal(normalizeRestorationMaterial("titanium"), "titanium_grade_5");

		assert.equal(normalizeShadeSystem("3d_master"), "VITA_3D_MASTER");
		assert.equal(normalizeShadeSystem("classical"), "VITA_CLASSICAL");

		assert.equal(normalizeStumpShade("nd2"), "ND2");
		assert.equal(normalizeStumpShade("invalid"), null);
	});
});

describe("Dental Lab Orders Decomposition — Layer 1/2 Cost & Schedule Calculator", () => {
	it("calculates turnaround in business days excluding weekends", () => {
		// Test standard zirconia (5 days)
		const friday = new Date(2026, 9, 2, 10, 0, 0); // Friday Oct 2, 2026
		const standard = calculateLabOrderTurnaround("crown_zirconia", false, friday);
		assert.equal(standard.turnaroundBusinessDays, 5);
		assert.equal(standard.dueDate.getDay(), 5); // Friday Oct 9, 2026

		// Test urgent zirconia (3 days)
		const urgent = calculateLabOrderTurnaround("crown_zirconia", true, friday);
		assert.equal(urgent.turnaroundBusinessDays, 3);
		assert.equal(urgent.dueDate.getDay(), 3); // Wednesday Oct 7, 2026
	});

	it("calculates cost, markup, and gross margin accurately", () => {
		const breakdown = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "crown_zirconia",
			priceRub: 24000,
			unitsCount: 1,
		});
		assert.equal(breakdown.suggestedPriceRub, 24000);
		assert.equal(breakdown.estimatedCostRub, 7500);
		assert.equal(breakdown.grossMarginRub, 16500);
		assert.equal(breakdown.grossMarginPercent, 69); // (16500 / 24000) * 100 = 68.75% -> 69%
	});

	it("calculates multi-unit bridge costs proportionally", () => {
		const bridgeBreakdown = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "crown_zirconia",
			priceRub: 72000,
			unitsCount: 3,
		});
		assert.equal(bridgeBreakdown.suggestedPriceRub, 72000);
		assert.equal(bridgeBreakdown.estimatedCostRub, 22500); // 7500 * 3
		assert.equal(bridgeBreakdown.grossMarginRub, 49500);
		assert.equal(bridgeBreakdown.unitsCount, 3);
	});

	it("estimates sequential CAD/CAM milestones schedule", () => {
		const monday = new Date(2026, 9, 5, 10, 0, 0); // Monday Oct 5, 2026
		const schedule = estimateDeliveryAndFittingSchedule(monday, 5);
		// Production due: Mon Oct 12
		assert.equal(schedule.productionDueDate.getDate(), 12);
		// Delivery to clinic: Tue Oct 13
		assert.equal(schedule.clinicDeliveryDate.getDate(), 13);
		// Fitting appointment: Wed Oct 14
		assert.equal(schedule.suggestedFittingDate.getDate(), 14);
	});
});

describe("Dental Lab Orders Decomposition — Layer 0/2 Stage & Status Mapping", () => {
	it("maps clinical stages to database enum statuses", () => {
		assert.equal(mapStageToLabOrderStatus("Слепок/Скан"), "sent");
		assert.equal(mapStageToLabOrderStatus("model_cad_design"), "in_progress");
		assert.equal(mapStageToLabOrderStatus("shipped_to_clinic"), "shipped");
		assert.equal(mapStageToLabOrderStatus("Готовая работа"), "received");
		assert.equal(mapStageToLabOrderStatus("fitting_in_mouth"), "refitting");
		assert.equal(mapStageToLabOrderStatus("Фиксация"), "completed");
		assert.equal(mapStageToLabOrderStatus("cancelled"), "cancelled");
		assert.equal(mapStageToLabOrderStatus("unknown_stage"), null);
	});

	it("maps stages and statuses to audit log milestones", () => {
		assert.equal(mapStageOrStatusToMilestone("draft"), "draft");
		assert.equal(mapStageOrStatusToMilestone("sent"), "submitted");
		assert.equal(mapStageOrStatusToMilestone("model_cad_design"), "digital_design_cad");
		assert.equal(mapStageOrStatusToMilestone("framework_wax_milling"), "cam_production");
		assert.equal(mapStageOrStatusToMilestone("delivered_to_clinic"), "clinic_received");
		assert.equal(mapStageOrStatusToMilestone("completed"), "final_cementation");
	});
});
