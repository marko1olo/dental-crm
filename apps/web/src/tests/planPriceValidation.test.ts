/**
 * Unit Test Suite for Treatment Plan Price Lock & Pricelist Validator Engine
 * (DOMAIN: PLAN PRICE VALIDATION & PRICELIST LOCK)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type CatalogServiceItem,
	PLAN_PRICE_POLICY_PRESETS,
	SAMPLE_CURRENT_PRICELIST,
	SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
	type TreatmentPlanValidationPayload,
} from "../components/treatment-plans/validation/planPriceValidationPresets";
import {
	applyBatchResolutionToAllItems,
	calculateDaysBetween,
	findCatalogService,
	generateWorkOrderExportPayload,
	validateSinglePlanItem,
	validateTreatmentPlanPrices,
} from "../components/treatment-plans/validation/planPriceValidationEngine";

describe("Treatment Plan Price Validation - Presets & Catalog Lookup", () => {
	it("contains all standard clinical presets (30, 90, 180 days, flexible)", () => {
		const presets = PLAN_PRICE_POLICY_PRESETS;
		assert.ok(presets.standard_30);
		assert.ok(presets.ortho_implant_90);
		assert.ok(presets.long_term_vip_180);
		assert.ok(presets.flexible_clinic);

		// Standard 30 days
		assert.equal(presets.standard_30.validityDays, 30);
		assert.equal(presets.standard_30.inflationThresholdPercent, 10);
		assert.equal(presets.standard_30.allowAutoLockWithinValidity, true);
		assert.equal(presets.standard_30.disallowArchivedServices, true);

		// Ortho/Implant 90 days
		assert.equal(presets.ortho_implant_90.validityDays, 90);
		assert.equal(presets.ortho_implant_90.inflationThresholdPercent, 15);

		// VIP 180 days
		assert.equal(presets.long_term_vip_180.validityDays, 180);
		assert.equal(presets.long_term_vip_180.inflationThresholdPercent, 20);
	});

	it("finds catalog services by ID and by Order 804n code correctly", () => {
		const catalog = SAMPLE_CURRENT_PRICELIST;

		// Find by exact ID
		const byId = findCatalogService("A16.07.002", "srv_karies_photopolymer", catalog);
		assert.ok(byId);
		assert.equal(byId?.id, "srv_karies_photopolymer");
		assert.equal(byId?.basePriceRub, 5200);

		// Find by 804n code
		const byCode = findCatalogService("A16.07.054.001", undefined, catalog);
		assert.ok(byCode);
		assert.equal(byCode?.id, "srv_implant_straumann");
		assert.equal(byCode?.basePriceRub, 65000);

		// Non-existent service returns null
		const missing = findCatalogService("UNKNOWN_CODE", "missing_id", catalog);
		assert.equal(missing, null);
	});

	it("calculates date differences accurately", () => {
		const d1 = "2026-06-01T00:00:00.000Z";
		const d2 = "2026-06-30T00:00:00.000Z";
		const diff = calculateDaysBetween(d1, d2);
		assert.equal(diff, 29);
	});
});

describe("Single Item Price Discrepancy & Anomaly Detection", () => {
	const catalog = SAMPLE_CURRENT_PRICELIST;
	const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;

	it("detects exact PRICE_MATCH when plan price matches catalog", () => {
		const item = {
			itemId: "item_match",
			toothNumber: 11,
			code804n: "A06.07.007",
			serviceTitle: "КЛКТ двух челюстей",
			category: "Диагностика",
			planUnitPriceRub: 3500,
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 1,
			planLineTotalRub: 3500,
			serviceId: "srv_cbct_3d",
		};

		const res = validateSinglePlanItem(item, catalog, preset, false);
		assert.equal(res.discrepancyKind, "PRICE_MATCH");
		assert.equal(res.severity, "success");
		assert.equal(res.unitPriceDeltaRub, 0);
		assert.equal(res.requiresAdminOverride, false);
	});

	it("detects PRICE_INCREASED with inflation calculation and admin threshold trigger", () => {
		const item = {
			itemId: "item_increased",
			toothNumber: 46,
			code804n: "A16.07.002",
			serviceTitle: "Восстановление зуба пломбой",
			category: "Терапия",
			planUnitPriceRub: 4500, // В прайсе 5200 (+700 ₽, +15.6%) -> выше порога 10%
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 2,
			planLineTotalRub: 9000,
			serviceId: "srv_karies_photopolymer",
		};

		const res = validateSinglePlanItem(item, catalog, preset, false);
		assert.equal(res.discrepancyKind, "PRICE_INCREASED");
		assert.equal(res.unitPriceDeltaRub, 700);
		assert.equal(res.unitPriceDeltaPercent, 15.6);
		assert.equal(res.lineTotalDeltaRub, 1400);
		assert.equal(res.requiresAdminOverride, true); // Превышает порог 10%
		assert.match(res.statusBadgeText, /Подорожало \+700 ₽/);
	});

	it("detects PRICE_DECREASED and suggests updating to current promo price", () => {
		const item = {
			itemId: "item_decreased",
			code804n: "A16.07.050",
			serviceTitle: "Профессиональная гигиена",
			category: "Гигиена",
			planUnitPriceRub: 5000, // В прайсе 4500 (-500 ₽, -10%)
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 1,
			planLineTotalRub: 5000,
			serviceId: "srv_hygiene_complex",
		};

		const res = validateSinglePlanItem(item, catalog, preset, false);
		assert.equal(res.discrepancyKind, "PRICE_DECREASED");
		assert.equal(res.unitPriceDeltaRub, -500);
		assert.equal(res.unitPriceDeltaPercent, -10);
		assert.equal(res.suggestedResolution, "UPDATE_TO_CURRENT_PRICE");
	});

	it("detects SERVICE_ARCHIVED and flags as error with admin override required", () => {
		const item = {
			itemId: "item_archived",
			toothNumber: 47,
			code804n: "A16.07.004.002",
			serviceTitle: "Коронка металлокерамическая",
			category: "Ортопедия",
			planUnitPriceRub: 13000,
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 1,
			planLineTotalRub: 13000,
			serviceId: "srv_old_cermet_crown",
		};

		const res = validateSinglePlanItem(item, catalog, preset, false);
		assert.equal(res.discrepancyKind, "SERVICE_ARCHIVED");
		assert.equal(res.isArchived, true);
		assert.equal(res.severity, "error");
		assert.equal(res.requiresAdminOverride, true);
	});

	it("detects DISCOUNT_EXPIRED_OR_INVALID when doctor discount exceeds policy threshold", () => {
		const item = {
			itemId: "item_invalid_discount",
			code804n: "A16.07.002",
			serviceTitle: "Пломба",
			category: "Терапия",
			planUnitPriceRub: 5200,
			planDiscountRub: 1300,
			planDiscountPercent: 25, // Лимит врача в стандарте = 10%
			quantity: 1,
			planLineTotalRub: 3900,
			serviceId: "srv_karies_photopolymer",
		};

		const res = validateSinglePlanItem(item, catalog, preset, false);
		assert.equal(res.discrepancyKind, "DISCOUNT_EXPIRED_OR_INVALID");
		assert.equal(res.requiresAdminOverride, true);
	});
});

describe("Price Lock Resolutions & Financial Calculations", () => {
	const catalog = SAMPLE_CURRENT_PRICELIST;
	const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;

	it("calculates clinic absorption correctly when locking original price against inflation", () => {
		const item = {
			itemId: "item_lock",
			toothNumber: 46,
			code804n: "A16.07.002",
			serviceTitle: "Восстановление зуба пломбой",
			category: "Терапия",
			planUnitPriceRub: 4500, // В прайсе 5200
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 3,
			planLineTotalRub: 13500,
			serviceId: "srv_karies_photopolymer",
		};

		const res = validateSinglePlanItem(
			item,
			catalog,
			preset,
			false,
			"LOCK_ORIGINAL_PRICE",
		);

		assert.equal(res.selectedResolution, "LOCK_ORIGINAL_PRICE");
		assert.equal(res.effectiveUnitPriceRub, 4500);
		assert.equal(res.effectiveLineNetRub, 13500);
		// Absorption = (5200 - 4500) * 3 = 2100 руб.
		assert.equal(res.clinicAbsorptionRub, 2100);
	});

	it("recalculates line total and discounts when updating to current catalog price", () => {
		const item = {
			itemId: "item_update",
			toothNumber: 45,
			code804n: "A16.07.030.002",
			serviceTitle: "Эндодонтическое лечение",
			category: "Эндодонтия",
			planUnitPriceRub: 10000, // В прайсе 11500
			planDiscountRub: 1000,
			planDiscountPercent: 10,
			quantity: 1,
			planLineTotalRub: 9000,
			serviceId: "srv_endo_pulpitis_2canals",
		};

		const res = validateSinglePlanItem(
			item,
			catalog,
			preset,
			false,
			"UPDATE_TO_CURRENT_PRICE",
		);

		assert.equal(res.selectedResolution, "UPDATE_TO_CURRENT_PRICE");
		assert.equal(res.effectiveUnitPriceRub, 11500);
		assert.equal(res.effectiveDiscountRub, 1150); // 10% от 11500
		assert.equal(res.effectiveLineNetRub, 11500 - 1150);
		assert.equal(res.clinicAbsorptionRub, 0);
	});
});

describe("Comprehensive Treatment Plan Validation Report", () => {
	const catalog = SAMPLE_CURRENT_PRICELIST;
	const samplePlan = SAMPLE_TREATMENT_PLAN_FOR_VALIDATION;

	it("builds a full validation report and blocks on archived services without admin override", () => {
		const report = validateTreatmentPlanPrices(
			samplePlan,
			catalog,
			PLAN_PRICE_POLICY_PRESETS.standard_30,
		);

		assert.equal(report.planNumber, "ПЛ-2026/041");
		assert.equal(report.totalItemsCount, 5);
		assert.equal(report.archivedItemsCount, 1);
		assert.equal(report.overallStatus, "BLOCKED_ARCHIVED_SERVICE");
		assert.equal(report.canGenerateWorkOrder, false);
		assert.equal(report.canGenerateCompletedAct, false);
		assert.ok(report.validationMessages.length > 0);
	});

	it("unblocks report when admin override is authorized", () => {
		const adminOverride = {
			isAuthorized: true,
			authorizedByAdminName: "Главный врач Смирнов",
			authorizationPinOrToken: "PIN-777",
			overrideReason: "Разрешена замена на металлокерамику по старому договору",
			authorizedAtIso: new Date().toISOString(),
		};

		const report = validateTreatmentPlanPrices(
			samplePlan,
			catalog,
			PLAN_PRICE_POLICY_PRESETS.standard_30,
			undefined,
			undefined,
			adminOverride,
		);

		assert.equal(report.adminOverride.isAuthorized, true);
		assert.equal(report.canGenerateWorkOrder, true);
		assert.equal(report.canGenerateCompletedAct, true);
	});

	it("applies 1-click batch lock and batch update correctly", () => {
		const lockedReport = applyBatchResolutionToAllItems(
			samplePlan,
			catalog,
			PLAN_PRICE_POLICY_PRESETS.standard_30,
			"LOCK_ORIGINAL_PRICE",
		);

		assert.ok(
			lockedReport.items.every((i) => i.selectedResolution === "LOCK_ORIGINAL_PRICE"),
		);
		assert.ok(lockedReport.totalClinicAbsorptionRub > 0);

		const updatedReport = applyBatchResolutionToAllItems(
			samplePlan,
			catalog,
			PLAN_PRICE_POLICY_PRESETS.standard_30,
			"UPDATE_TO_CURRENT_PRICE",
		);

		assert.ok(
			updatedReport.items.every((i) => i.selectedResolution === "UPDATE_TO_CURRENT_PRICE"),
		);
	});

	it("generates valid Work Order (Заказ-наряд) and Completed Works Act exports", () => {
		const adminOverride = {
			isAuthorized: true,
			authorizedByAdminName: "Управляющий",
		};

		const report = validateTreatmentPlanPrices(
			samplePlan,
			catalog,
			PLAN_PRICE_POLICY_PRESETS.standard_30,
			undefined,
			undefined,
			adminOverride,
		);

		// Work Order export
		const workOrder = generateWorkOrderExportPayload(report, "work_order");
		assert.match(workOrder.orderNumber, /^НЗ-/);
		assert.equal(workOrder.orderType, "work_order");
		assert.equal(workOrder.items.length, 5);
		assert.equal(workOrder.totalPayableRub, report.resolvedNetRub);
		assert.equal(workOrder.isApprovedByManager, true);

		// Completed Act export
		const act = generateWorkOrderExportPayload(report, "completed_works_act");
		assert.match(act.orderNumber, /^АВР-/);
		assert.equal(act.orderType, "completed_works_act");
		assert.equal(act.totalPayableRub, report.resolvedNetRub);
	});
});
