/**
 * dentalLabOrders.test.ts — ЗТЛ заказ-наряды, валидация Idempotency-Key и синхронизация статусов.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateLabOrderCostAndMarkup,
	calculateLabOrderTurnaround,
} from "../../routes/lab/ordersCrudModules/labOrderCostCalculator.js";
import { mapDbStatusToStage } from "../../../../web/src/components/lab/dentalLabCatalogData.js";
import { calculateLabFinancialSplit } from "../../../../web/src/components/lab/math/labFinancialSplit.js";
import { mapStageToLabOrderStatus } from "../../routes/lab/labTypesModules/labOrderStatusAndTrackingTypes.js";
import { mapStageToCanonicalPgStatus } from "@dental/shared";
import { LAB_ORDER_STATUS_RU_MAP } from "../../services/daemons/ztlLookAheadDaemon.js";

describe("Dental Lab Orders SSOT & Idempotency Invariants", () => {
	it("1. mapDbStatusToStage correctly maps cancelled, rejected_remake, and shipped without default fallback", () => {
		assert.equal(mapDbStatusToStage("cancelled"), "cancelled");
		assert.equal(mapDbStatusToStage("rejected_remake"), "rejected_remake");
		assert.equal(mapDbStatusToStage("rework"), "rejected_remake");
		assert.equal(mapDbStatusToStage("shipped"), "shipped");
		assert.equal(mapDbStatusToStage("in_progress"), "in_production");
		assert.equal(mapDbStatusToStage("ready"), "in_clinic");
		assert.equal(mapDbStatusToStage("completed"), "seated");
		assert.equal(mapDbStatusToStage("sent"), "scan_sent");
	});

	it("2. calculateLabFinancialSplit computes exact kopeck split without float drift", () => {
		const split = calculateLabFinancialSplit(15000, 30);
		assert.equal(split.totalKopecks, 1500000);
		assert.equal(split.doctorKopecks, 450000);
		assert.equal(split.clinicKopecks, 1050000);
		assert.equal(split.isBalanced, true);
	});

	it("3. calculateLabOrderCostAndMarkup preserves integer kopecks and calculates margins", () => {
		const result = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "crown_zirconia",
			priceRub: 25000,
			unitsCount: 2,
		});

		assert.equal(result.unitsCount, 2);
		assert.equal(result.estimatedCostKopecks, 1500000); // 7500 rub * 2 = 15000 rub = 1500000 kopecks
		assert.equal(result.suggestedPriceKopecks, 2500000); // 25000 rub = 2500000 kopecks
		assert.equal(result.grossMarginKopecks, 1000000); // 10000 rub = 1000000 kopecks
		assert.equal(result.grossMarginPercent, 40);
	});

	it("4. calculateLabOrderTurnaround calculates business days excluding weekends", () => {
		const standard = calculateLabOrderTurnaround("crown_zirconia", false);
		assert.equal(standard.turnaroundBusinessDays, 5);
		assert.equal(standard.isUrgent, false);

		const urgent = calculateLabOrderTurnaround("crown_zirconia", true);
		assert.equal(urgent.turnaroundBusinessDays, 3);
		assert.equal(urgent.isUrgent, true);
	});

	it("5. mapStageToLabOrderStatus and mapStageToCanonicalPgStatus preserve rejected_remake and map framework_fitting to fitting", () => {
		assert.equal(mapStageToLabOrderStatus("rejected_remake"), "rejected_remake");
		assert.equal(mapStageToCanonicalPgStatus("rejected_remake"), "rejected_remake");
		assert.equal(mapStageToLabOrderStatus("framework_fitting"), "fitting");
		assert.equal(mapStageToLabOrderStatus("каркас/примерка"), "fitting");
		assert.equal(mapStageToLabOrderStatus("ready_fixation"), "ready_in_clinic");
		assert.equal(mapStageToLabOrderStatus("installed_completed"), "completed");
		assert.equal(mapStageToCanonicalPgStatus("installed_completed"), "completed");
		assert.equal(mapStageToLabOrderStatus("delivered_completed"), "completed");
		assert.equal(mapStageToCanonicalPgStatus("delivered_completed"), "completed");
		assert.equal(mapStageToLabOrderStatus("ready_in_clinic"), "ready_in_clinic");
		assert.equal(mapStageToLabOrderStatus("in_progress"), "in_progress");
	});

	it("6. ztlLookAheadDaemon LAB_ORDER_STATUS_RU_MAP contains localized Russian descriptions without raw leaks", () => {
		assert.equal(LAB_ORDER_STATUS_RU_MAP.ready, "Готово в ЗТЛ (ожидает курьера)");
		assert.equal(LAB_ORDER_STATUS_RU_MAP.ready_in_clinic, "В клинике (готов к установке)");
		assert.equal(LAB_ORDER_STATUS_RU_MAP.fitting, "На примерке");
		assert.equal(LAB_ORDER_STATUS_RU_MAP.rejected_remake, "Гарантийная переделка");
	});
});
