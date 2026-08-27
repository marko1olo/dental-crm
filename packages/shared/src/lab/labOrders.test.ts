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
	DEFAULT_LAB_TURNAROUND_DAYS,
	addBusinessDays,
	calculateExpectedDeliveryDate,
	isLabOrderDelayed,
	canTransitionLabOrderStatus,
	calculateLabFinancialSplitKopecks,
	calculateLabOrderFinancialsKopecks,
} from "./labOrders.js";

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
		const order: any = {
			organizationId: "11111111-1111-1111-1111-111111111111",
			patientId: "22222222-2222-2222-2222-222222222222",
			labContactId: "33333333-3333-3333-3333-333333333333",
			orderNumber: "ЛО-01",
			workType: "crown",
			status: "sent",
			sentDate: "2026-08-01",
			expectedDate: "2026-08-10",
			costKopecks: 650000,
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
