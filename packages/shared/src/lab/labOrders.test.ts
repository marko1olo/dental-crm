import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	labWorkTypeSchema,
	prostheticConstructionTypeSchema,
	prostheticMaterialSchema,
	labOrderStatusSchema,
	labWorkflowStageSchema,
	impressionTypeSchema,
	vitaClassicalShadeSchema,
	vitaBleachShadeSchema,
	vita3dMasterShadeSchema,
	stumpNaturalDieShadeSchema,
	labOrderSchema,
	type LabOrder,
	DEFAULT_LAB_TURNAROUND_DAYS,
	addBusinessDays,
	calculateExpectedDeliveryDate,
	isLabOrderDelayed,
	canTransitionLabOrderStatus,
	calculateLabFinancialSplitKopecks,
	calculateLabOrderFinancialsKopecks,
	CANONICAL_5STAGE_LAB_PIPELINE,
	canonical5LabStatusSchema,
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	mapTo5StageLabStatus,
	FORM_ZTL_1_METADATA,
	generateProstheticWarrantyPassport,
	prostheticWarrantyPassportSchema,
	CANONICAL_PG_LAB_STATUSES,
	canonicalPgLabStatusSchema,
	STAGE_TO_CANONICAL_PG_STATUS,
	mapStageToCanonicalPgStatus,
	mapPgStatusTo5Stage,
	isValidVitaShade,
} from "./labOrders.js";
import {
	VALID_VITA_SHADE_REGEX,
	getVitaShadeHex,
	getChromascopShadeHex,
} from "./vitaPalette.js";

describe("Shared Dental Lab — Zod Validation Schemas", () => {
	test("labWorkTypeSchema validates all standard work types", () => {
		const types = ["crown", "bridge", "denture", "implant", "veneer", "orthodontic", "inlay_onlay", "splint_nightguard", "repair", "other"];
		for (const t of types) {
			assert.equal(labWorkTypeSchema.parse(t), t);
		}
		assert.throws(() => labWorkTypeSchema.parse("invalid_type"));
	});

	test("prostheticConstructionTypeSchema validates Russian and international categories", () => {
		const types = ["single_crown", "bridge", "veneer", "inlay_onlay", "all_on_4_6", "all_on_arch", "implant_abutment", "clasp_denture", "aligners_nightguard", "endocrown"];
		for (const t of types) {
			assert.equal(prostheticConstructionTypeSchema.parse(t), t);
		}
	});

	test("prostheticMaterialSchema validates key CAD/CAM & ceramics materials", () => {
		const mats = ["zirconia_multilayer", "emax_lithium_disilicate", "pfm_cocr", "pmma_temporary", "titanium_custom_abutment", "peek_biohpp", "biocompatible_3d_resin"];
		for (const m of mats) {
			assert.equal(prostheticMaterialSchema.parse(m), m);
		}
	});

	test("vitaClassicalShadeSchema validates A1..D4 & Bleach BL1..BL4", () => {
		const classical = ["A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D2", "D3", "D4"];
		for (const s of classical) {
			assert.equal(vitaClassicalShadeSchema.parse(s), s);
		}
		assert.equal(vitaClassicalShadeSchema.parse("BL1"), "BL1");
		assert.equal(vitaClassicalShadeSchema.parse("BL4"), "BL4");
	});

	test("vita3dMasterShadeSchema validates 3D-Master codes (1M1..5M3)", () => {
		const shades = ["1M1", "2M2", "3L1.5", "4R2.5", "5M3"];
		for (const s of shades) {
			assert.equal(vita3dMasterShadeSchema.parse(s), s);
		}
	});

	test("stumpNaturalDieShadeSchema validates IPS Natural Die ND1..ND9", () => {
		for (let i = 1; i <= 9; i++) {
			assert.equal(stumpNaturalDieShadeSchema.parse(`ND${i}`), `ND${i}`);
		}
	});

	test("Ivoclar Chromascop (110–540) validation and hex resolution", () => {
		const validChromascop = ["110", "120", "130", "140", "210", "220", "230", "240", "310", "320", "330", "340", "410", "420", "430", "440", "510", "520", "530", "540"];
		for (const code of validChromascop) {
			assert.ok(isValidVitaShade(code), `Code ${code} must be valid in isValidVitaShade`);
			assert.ok(VALID_VITA_SHADE_REGEX.test(code), `Code ${code} must match VALID_VITA_SHADE_REGEX`);
			assert.ok(getVitaShadeHex(code), `Code ${code} must resolve to hex color`);
			assert.ok(getChromascopShadeHex(code), `Code ${code} must resolve via getChromascopShadeHex`);
		}

		// Invalid Chromascop codes
		assert.equal(isValidVitaShade("150"), false, "150 is out of Chromascop range");
		assert.equal(isValidVitaShade("610"), false, "610 group does not exist in Chromascop");
		assert.equal(VALID_VITA_SHADE_REGEX.test("999"), false, "999 must fail regex");
	});

	test("labOrderSchema validates realistic statutory lab order", () => {
		const orderData = {
			organizationId: "11111111-1111-1111-1111-111111111111",
			patientId: "22222222-2222-2222-2222-222222222222",
			labContactId: "33333333-3333-3333-3333-333333333333",
			orderNumber: "ЛО-2026/08-0042",
			workType: "crown",
			toothReference: "21",
			impressionType: "digital_scan",
			shade: "A2",
			status: "sent",
			sentDate: "2026-08-28",
			expectedDate: "2026-09-04",
			costKopecks: 650000,
		};
		const parsed = labOrderSchema.parse(orderData);
		assert.equal(parsed.orderNumber, "ЛО-2026/08-0042");
		assert.equal(parsed.costKopecks, 650000);
	});
});

describe("Shared Dental Lab — Turnaround SLA & Business Days Math", () => {
	test("addBusinessDays skips Saturdays and Sundays accurately", () => {
		const friday = new Date("2026-08-28T10:00:00Z"); // Friday
		const monday = addBusinessDays(friday, 1);
		assert.equal(monday.getDay(), 1); // Monday

		const fiveDays = addBusinessDays(friday, 5);
		assert.equal(fiveDays.toISOString().slice(0, 10), "2026-09-04");
	});

	test("calculateExpectedDeliveryDate respects default SLA turnarounds", () => {
		const start = "2026-08-28";
		const crownDelivery = calculateExpectedDeliveryDate(start, "crown"); // 7 business days
		assert.ok(crownDelivery.getTime() > new Date(start).getTime());

		const dentureDelivery = calculateExpectedDeliveryDate(start, "denture"); // 14 business days
		assert.ok(dentureDelivery.getTime() > crownDelivery.getTime());
	});

	test("isLabOrderDelayed accurately flags overdue orders", () => {
		const order: LabOrder = {
			organizationId: "11111111-1111-1111-1111-111111111111",
			patientId: "22222222-2222-2222-2222-222222222222",
			labContactId: "33333333-3333-3333-3333-333333333333",
			orderNumber: "ЛО-01",
			workType: "crown",
			status: "sent",
			sentDate: "2026-08-01",
			expectedDate: "2026-08-10",
			costKopecks: 650000,
			isRemake: false,
		};
		const futureDate = new Date("2026-08-20");
		assert.equal(isLabOrderDelayed(order, futureDate), true);

		const pastDate = new Date("2026-08-05");
		assert.equal(isLabOrderDelayed(order, pastDate), false);

		// Completed orders are never delayed
		order.status = "completed";
		assert.equal(isLabOrderDelayed(order, futureDate), false);
	});

	test("canTransitionLabOrderStatus enforces valid workflow state machine", () => {
		assert.equal(canTransitionLabOrderStatus("draft", "sent"), true);
		assert.equal(canTransitionLabOrderStatus("sent", "in_progress"), true);
		assert.equal(canTransitionLabOrderStatus("in_progress", "ready"), true);
		assert.equal(canTransitionLabOrderStatus("ready", "received"), true);
		assert.equal(canTransitionLabOrderStatus("received", "fitted"), true);
		assert.equal(canTransitionLabOrderStatus("fitted", "completed"), true);

		// Invalid direct jump from draft to completed
		assert.equal(canTransitionLabOrderStatus("draft", "completed"), false);
	});
});

describe("Shared Dental Lab — Integer Kopecks Financial Clearing (No Floats)", () => {
	test("calculateLabFinancialSplitKopecks 50/50 guarantees exact zero-penny-drift split", () => {
		const totalKopecks = 1545055; // 15,450.55 ₽
		const split = calculateLabFinancialSplitKopecks(totalKopecks, 50);

		assert.equal(split.isBalanced, true);
		assert.equal(split.totalKopecks, 1545055);
		assert.equal(split.doctorKopecks, 772528);
		assert.equal(split.clinicKopecks, 772527);
		assert.equal(split.doctorKopecks + split.clinicKopecks, totalKopecks);
		assert.equal(split.doctorAmountRub, 7725.28);
		assert.equal(split.clinicAmountRub, 7725.27);
	});

	test("calculateLabOrderFinancialsKopecks computes margin, commission, and profit in kopecks", () => {
		const clearing = calculateLabOrderFinancialsKopecks({
			unitsCount: 3,
			pricePerUnitKopecks: 2500000, // 25,000.00 ₽
			costPerUnitKopecks: 700000,   // 7,000.00 ₽
			doctorPercent: 20,
		});

		assert.equal(clearing.unitsCount, 3);
		assert.equal(clearing.patientPriceTotalKopecks, 7500000); // 75,000.00 ₽
		assert.equal(clearing.labCostTotalKopecks, 2100000);      // 21,000.00 ₽
		assert.equal(clearing.grossMarginKopecks, 5400000);       // 54,000.00 ₽
		assert.equal(clearing.grossMarginPercent, 72.0);
		assert.equal(clearing.doctorCommissionKopecks, 1080000);   // 10,800.00 ₽ (20% of 54,000)
		assert.equal(clearing.clinicNetProfitKopecks, 4320000);    // 43,200.00 ₽
		assert.equal(clearing.isBalanced, true);
		assert.equal(clearing.doctorCommissionKopecks + clearing.clinicNetProfitKopecks, clearing.grossMarginKopecks);
	});
});

describe("Shared Dental Lab — 5-Stage Pipeline & Warranty Passport", () => {
	test("CANONICAL_5STAGE_LAB_PIPELINE contains all 5 sequential clinical stages", () => {
		const stages = ["impression_scan", "cad_modeling", "framework_fitting", "ceramic_layering", "ready_fixation"] as const;
		stages.forEach((stageKey, i) => {
			const stage = CANONICAL_5STAGE_LAB_PIPELINE[stageKey];
			assert.ok(stage);
			assert.equal(stage.step, i + 1);
			assert.ok(stage.titleRu.length > 0);
		});
	});

	test("generateProstheticWarrantyPassport generates valid StAR passport", () => {
		const passport = generateProstheticWarrantyPassport({
			orderNumber: "ЛО-2026/09-0012",
			patientFullName: "Иванов Иван Иванович",
			doctorFullName: "Петров П.П.",
			toothFdi: "11, 21",
			restorationType: "Коронка e.max Press",
			frameworkMaterial: "Дисиликат лития IPS e.max",
			shade: "A2",
			warrantyYears: 3,
			fixationDate: "2026-09-01",
		});

		assert.equal(passport.orderNumber, "ЛО-2026/09-0012");
		assert.equal(passport.warrantyYears, 3);
		assert.equal(passport.fixationDate, "2026-09-01");
		assert.equal(passport.expirationDate, "2029-09-01");
		assert.ok(passport.batchCode.startsWith("LOT-2026-"));
		assert.ok(passport.gostStandard.includes("ГОСТ"));
		assert.ok(passport.sanpinDisinfectionMark.includes("СанПиН 3.3686-21"));
	});

	test("CANONICAL_5_CLINICAL_LAB_STATUSES contains all 5 statutory clinical stages in order", () => {
		assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES.length, 5);
		const expectedIds = ["sent", "in_progress", "fitting", "ready", "completed"];
		CANONICAL_5_CLINICAL_LAB_STATUSES.forEach((stage, idx) => {
			assert.equal(stage.id, expectedIds[idx]);
			assert.equal(stage.step, idx + 1);
			assert.ok(stage.labelRu.length > 0);
			assert.ok(stage.shortLabelRu.length > 0);
			assert.ok(stage.descRu.length > 0);
			assert.equal(canonical5LabStatusSchema.parse(stage.id), stage.id);
		});
	});

	test("mapTo5StageLabStatus correctly maps raw workflow statuses to the 5 canonical stages", () => {
		// 1. Sent
		assert.equal(mapTo5StageLabStatus("draft"), "sent");
		assert.equal(mapTo5StageLabStatus("sent"), "sent");
		assert.equal(mapTo5StageLabStatus("sent_to_lab"), "sent");
		assert.equal(mapTo5StageLabStatus("impression_sent"), "sent");

		// 2. In progress
		assert.equal(mapTo5StageLabStatus("in_progress"), "in_progress");
		assert.equal(mapTo5StageLabStatus("cad_design"), "in_progress");
		assert.equal(mapTo5StageLabStatus("milling_wax_up"), "in_progress");
		assert.equal(mapTo5StageLabStatus("ceramic_layering"), "in_progress");

		// 3. Fitting
		assert.equal(mapTo5StageLabStatus("fitting"), "fitting");
		assert.equal(mapTo5StageLabStatus("refitting"), "fitting");
		assert.equal(mapTo5StageLabStatus("try_in_fitting"), "fitting");

		// 4. Ready
		assert.equal(mapTo5StageLabStatus("ready"), "ready");
		assert.equal(mapTo5StageLabStatus("received"), "ready");
		assert.equal(mapTo5StageLabStatus("shipped"), "ready");

		// 5. Completed
		assert.equal(mapTo5StageLabStatus("completed"), "completed");
		assert.equal(mapTo5StageLabStatus("fitted"), "completed");
	});

	test("FORM_ZTL_1_METADATA defines statutory Form ZTL-1 and Mandate 8e invariants", () => {
		assert.equal(FORM_ZTL_1_METADATA.code, "Форма № ЗТЛ-1");
		assert.ok(FORM_ZTL_1_METADATA.titleRu.includes("Форма № ЗТЛ-1"));
		assert.ok(FORM_ZTL_1_METADATA.treatmentPlanTermsNoticeRu.includes("подтвержден лечащим врачом"));
		assert.ok(FORM_ZTL_1_METADATA.sanpinClauseRu.includes("СанПиН 3.3686-21"));
		assert.ok(FORM_ZTL_1_METADATA.warrantyGostRu.includes("ГОСТ Р 51087-97"));
	});

	test("generateProstheticWarrantyPassport runtime entropy, leap-year calculation and Zod validation", () => {
		const baseParams = {
			orderNumber: "ЛО-2026/09-0099",
			patientFullName: "Смирнова Анна Сергеевна",
			doctorFullName: "Ковалев А.В.",
			toothFdi: "16",
			restorationType: "Циркониевая коронка Prettau",
			frameworkMaterial: "Диоксид циркония ZrO₂ Multilayer",
			shade: "A3",
			fixationDate: "2024-02-29", // Leap year edge case
			warrantyYears: 2,
		};

		const passport1 = generateProstheticWarrantyPassport(baseParams);
		const passport2 = generateProstheticWarrantyPassport(baseParams);

		// Zod runtime schema check
		const validated = prostheticWarrantyPassportSchema.parse(passport1);
		assert.equal(validated.orderNumber, baseParams.orderNumber);
		assert.equal(validated.fixationDate, "2024-02-29");
		// 2024-02-29 + 2 years in JS Date -> 2026-03-01
		assert.equal(validated.expirationDate, "2026-03-01");
		assert.equal(validated.warrantyYears, 2);

		// Batch codes must be distinct and non-empty (crypto entropy)
		assert.match(passport1.batchCode, /^LOT-2024-[A-Z0-9]{6}$/);
		assert.match(passport2.batchCode, /^LOT-2024-[A-Z0-9]{6}$/);
		assert.notEqual(passport1.batchCode, passport2.batchCode);

		// When explicit batchCode is supplied, it must be preserved without mutation
		const explicit = generateProstheticWarrantyPassport({
			...baseParams,
			batchCode: "LOT-CUSTOM-777",
		});
		assert.equal(explicit.batchCode, "LOT-CUSTOM-777");

		// Validation failure on invalid warranty period
		assert.throws(() => {
			prostheticWarrantyPassportSchema.parse({
				...passport1,
				warrantyYears: 0,
			});
		});
		assert.throws(() => {
			prostheticWarrantyPassportSchema.parse({
				...passport1,
				warrantyYears: 15,
			});
		});
	});

	test("CANONICAL_PG_LAB_STATUSES and bidirectional stage-status mappers satisfy Postgres 0231 CHECK constraint", () => {
		// Strict 13 statuses matching PostgreSQL CHECK constraint (0231)
		assert.equal(CANONICAL_PG_LAB_STATUSES.length, 13);
		const expectedPgStatuses: readonly CanonicalPgLabStatus[] = [
			"draft",
			"sent",
			"in_progress",
			"ready",
			"ready_in_clinic",
			"fitting",
			"fitted",
			"refitting",
			"shipped",
			"received",
			"completed",
			"cancelled",
			"rejected_remake",
		];
		expectedPgStatuses.forEach((st) => {
			assert.ok(CANONICAL_PG_LAB_STATUSES.includes(st));
			assert.equal(canonicalPgLabStatusSchema.parse(st), st);
		});

		// UI 5-stages to PG status mapping: no arbitrary unconstrained strings and no downgrade of fitting/ready into received
		assert.equal(STAGE_TO_CANONICAL_PG_STATUS.sent, "sent");
		assert.equal(STAGE_TO_CANONICAL_PG_STATUS.in_progress, "in_progress");
		assert.equal(STAGE_TO_CANONICAL_PG_STATUS.fitting, "fitting");
		assert.equal(STAGE_TO_CANONICAL_PG_STATUS.ready, "ready_in_clinic");
		assert.equal(STAGE_TO_CANONICAL_PG_STATUS.completed, "completed");

		// mapStageToCanonicalPgStatus: resilient handling of ad-hoc stage names into strict 12 statuses without forced collapse to received
		assert.equal(mapStageToCanonicalPgStatus("draft"), "draft");
		assert.equal(mapStageToCanonicalPgStatus("sent"), "sent");
		assert.equal(mapStageToCanonicalPgStatus("scan_sent"), "sent");
		assert.equal(mapStageToCanonicalPgStatus("Слепок/Скан"), "sent");
		assert.equal(mapStageToCanonicalPgStatus("in_progress"), "in_progress");
		assert.equal(mapStageToCanonicalPgStatus("in_production"), "in_progress");
		assert.equal(mapStageToCanonicalPgStatus("cad_modeling"), "in_progress");
		assert.equal(mapStageToCanonicalPgStatus("shipped"), "shipped");
		assert.equal(mapStageToCanonicalPgStatus("ready"), "ready");
		assert.equal(mapStageToCanonicalPgStatus("ready_in_clinic"), "ready_in_clinic");
		assert.equal(mapStageToCanonicalPgStatus("in_clinic"), "ready_in_clinic");
		assert.equal(mapStageToCanonicalPgStatus("fitting"), "fitting");
		assert.equal(mapStageToCanonicalPgStatus("fitting_ready"), "fitting");
		assert.equal(mapStageToCanonicalPgStatus("fitted"), "fitted");
		assert.equal(mapStageToCanonicalPgStatus("refitting"), "refitting");
		assert.equal(mapStageToCanonicalPgStatus("rework"), "refitting");
		assert.equal(mapStageToCanonicalPgStatus("completed"), "completed");
		assert.equal(mapStageToCanonicalPgStatus("seated"), "completed");
		assert.equal(mapStageToCanonicalPgStatus("cancelled"), "cancelled");

		// mapPgStatusTo5Stage returns canonical 5-stage progression
		assert.equal(mapPgStatusTo5Stage("sent"), "sent");
		assert.equal(mapPgStatusTo5Stage("in_progress"), "in_progress");
		assert.equal(mapPgStatusTo5Stage("fitting"), "fitting");
		assert.equal(mapPgStatusTo5Stage("refitting"), "fitting");
		assert.equal(mapPgStatusTo5Stage("ready"), "ready");
		assert.equal(mapPgStatusTo5Stage("ready_in_clinic"), "ready");
		assert.equal(mapPgStatusTo5Stage("received"), "ready");
		assert.equal(mapPgStatusTo5Stage("completed"), "completed");
		assert.equal(mapPgStatusTo5Stage("fitted"), "completed");
	});
});

