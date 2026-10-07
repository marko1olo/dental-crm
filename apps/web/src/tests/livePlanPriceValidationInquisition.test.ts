/**
 * livePlanPriceValidationInquisition.test.ts
 *
 * Бескомпромиссная Ред-тим инквизиция валидатора цен планов лечения и прейскуранта (8c, 8e, 8f, 8y).
 * Проверяет:
 * 1. Валидацию плана лечения с динамическим каталогом услуг (без статических мок-заглушек).
 * 2. Детекцию инфляции цен (+20%), превышающей клинический порог (10%), с фиксацией дельты.
 * 3. Жесткую детекцию архивных услуг (active: false, isArchived: true) и классификацию BLOCKED_ARCHIVED_SERVICE.
 * 4. Автономию врача (Мандат 8e): 1-клик фиксацию оригинальной цены (LOCK_ORIGINAL_PRICE),
 *    расчет абсорбции клиникой до копейки, отсутствие искусственных бюрократических блокировок.
 * 5. Формирование валидного заказ-наряда ЗТЛ и акта выполненных работ без фиктивных номеров.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	type CatalogServiceItem,
	PLAN_PRICE_POLICY_PRESETS,
	type TreatmentPlanItemValidationContext,
	type TreatmentPlanValidationPayload,
} from "../components/treatment-plans/validation/planPriceValidationPresets.js";
import {
	applyBatchResolutionToAllItems,
	calculateDaysBetween,
	findCatalogService,
	generateWorkOrderExportPayload,
	validateSinglePlanItem,
	validateTreatmentPlanPrices,
} from "../components/treatment-plans/validation/planPriceValidationEngine.js";

describe("Live Plan Price Validation Inquisition (8c, 8e, 8f, 8y)", () => {
	// Динамический живой каталог стоматологических услуг клиники (без привязки к статическим пресетам)
	const dynamicLiveCatalog: readonly CatalogServiceItem[] = [
		{
			id: "srv-live-photo-composite",
			code804n: "A16.07.002",
			title: "Восстановление зуба светоотверждаемым композитом Filtek",
			category: "therapy",
			basePriceRub: 5500,
			active: true,
			isArchived: false,
		},
		{
			id: "srv-live-zirconia-crown",
			code804n: "A16.07.004",
			title: "Восстановление зуба коронкой из диоксида циркония Prettau",
			category: "prosthetics",
			basePriceRub: 24000, // Подорожала с 20 000 до 24 000 (+20%)
			active: true,
			isArchived: false,
		},
		{
			id: "srv-live-hygiene-complex",
			code804n: "A16.07.051",
			title: "Комплексная гигиена полости рта Air-Flow + УЗ",
			category: "hygiene",
			basePriceRub: 4500, // Подешевела с 5 000 до 4 500 (-10%)
			active: true,
			isArchived: false,
		},
		{
			id: "srv-live-legacy-amalgam",
			code804n: "A16.07.002.legacy",
			title: "Пломбирование зуба серебряной амальгамой (В АРХИВЕ)",
			category: "therapy",
			basePriceRub: 2500,
			active: false,
			isArchived: true, // Выведена из оборота клиникой
		},
	];

	it("1. Dynamic Catalog Lookup: finds services by ID and 804n code without mock stubs", () => {
		const byId = findCatalogService("A16.07.002", "srv-live-photo-composite", dynamicLiveCatalog);
		assert.ok(byId, "Service must be located by exact ID");
		assert.equal(byId?.basePriceRub, 5500);
		assert.equal(byId?.active, true);

		const byCode = findCatalogService("A16.07.004", undefined, dynamicLiveCatalog);
		assert.ok(byCode, "Service must be located by Order 804n code");
		assert.equal(byCode?.id, "srv-live-zirconia-crown");
		assert.equal(byCode?.basePriceRub, 24000);

		const nonExistent = findCatalogService("A99.99.999", "srv-non-existent", dynamicLiveCatalog);
		assert.equal(nonExistent, null, "Non-existent service must return null");
	});

	it("2. Inflation Detection: flags price increase > 10% and triggers admin override requirement", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;

		const zirconiaItem: TreatmentPlanItemValidationContext = {
			itemId: "item-zirconia-46",
			toothNumber: 46,
			code804n: "A16.07.004",
			serviceTitle: "Коронка из диоксида циркония",
			category: "prosthetics",
			planUnitPriceRub: 20000, // Старая цена в плане
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 1,
			planLineTotalRub: 20000,
			serviceId: "srv-live-zirconia-crown",
		};

		const res = validateSinglePlanItem(zirconiaItem, dynamicLiveCatalog, preset, false);
		assert.equal(res.discrepancyKind, "PRICE_INCREASED");
		assert.equal(res.currentCatalogPriceRub, 24000);
		assert.equal(res.unitPriceDeltaRub, 4000); // +4 000 руб.
		assert.equal(res.unitPriceDeltaPercent, 20); // +20%
		assert.equal(res.requiresAdminOverride, true, "Inflation of 20% exceeds 10% threshold");
		assert.equal(res.severity, "warning");
	});

	it("3. Archived Service Rejection: strictly detects inactive/archived catalog positions", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;

		const legacyItem: TreatmentPlanItemValidationContext = {
			itemId: "item-legacy-amalgam",
			toothNumber: 36,
			code804n: "A16.07.002.legacy",
			serviceTitle: "Пломба из амальгамы",
			category: "therapy",
			planUnitPriceRub: 2500,
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 1,
			planLineTotalRub: 2500,
			serviceId: "srv-live-legacy-amalgam",
		};

		const res = validateSinglePlanItem(legacyItem, dynamicLiveCatalog, preset, false);
		assert.equal(res.discrepancyKind, "SERVICE_ARCHIVED");
		assert.equal(res.isArchived, true);
		assert.equal(res.severity, "error");
		assert.equal(res.requiresAdminOverride, true);
	});

	it("4. Promo / Price Decrease Detection: suggests updating to current lower catalog price", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;

		const hygieneItem: TreatmentPlanItemValidationContext = {
			itemId: "item-hygiene-complex",
			code804n: "A16.07.051",
			serviceTitle: "Комплексная гигиена",
			category: "hygiene",
			planUnitPriceRub: 5000, // Старая цена в плане была выше
			planDiscountRub: 0,
			planDiscountPercent: 0,
			quantity: 1,
			planLineTotalRub: 5000,
			serviceId: "srv-live-hygiene-complex",
		};

		const res = validateSinglePlanItem(hygieneItem, dynamicLiveCatalog, preset, false);
		assert.equal(res.discrepancyKind, "PRICE_DECREASED");
		assert.equal(res.unitPriceDeltaRub, -500);
		assert.equal(res.unitPriceDeltaPercent, -10);
		assert.equal(res.suggestedResolution, "UPDATE_TO_CURRENT_PRICE");
		assert.equal(res.requiresAdminOverride, false);
	});

	it("5. Comprehensive Plan Report & Doctor Autonomy (Mandates 8e, 8n): unblocks with clinic absorption", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;

		const planPayload: TreatmentPlanValidationPayload = {
			planId: "plan-live-uuid-001",
			planNumber: "TP-2026-0891",
			planTitle: "Комплексный ортопедический план лечения",
			patientId: "patient-uuid-101",
			patientName: "Воронова Елена Дмитриевна",
			patientChartNumber: "CARD-8812",
			doctorId: "doc-uuid-501",
			doctorFullName: "Д-р Соколов А. В.",
			createdAtIso: new Date(Date.now() - 10 * 86400000).toISOString(), // 10 дней назад (в пределах 30 дней)
			items: [
				{
					itemId: "item-1",
					toothNumber: 11,
					code804n: "A16.07.002",
					serviceTitle: "Реставрация композитом",
					category: "therapy",
					planUnitPriceRub: 5500,
					planDiscountRub: 0,
					planDiscountPercent: 0,
					quantity: 1,
					planLineTotalRub: 5500,
					serviceId: "srv-live-photo-composite",
				},
				{
					itemId: "item-2",
					toothNumber: 46,
					code804n: "A16.07.004",
					serviceTitle: "Коронка из диоксида циркония",
					category: "prosthetics",
					planUnitPriceRub: 20000,
					planDiscountRub: 0,
					planDiscountPercent: 0,
					quantity: 1,
					planLineTotalRub: 20000,
					serviceId: "srv-live-zirconia-crown",
				},
			],
		};

		// 1. Подорожание коронки свыше 10% фиксирует 1 позицию с инфляцией
		const initialReport = validateTreatmentPlanPrices(
			planPayload,
			dynamicLiveCatalog,
			preset,
			{},
			{},
			{ isAuthorized: false },
		);

		assert.equal(initialReport.overallStatus, "APPROVED_PRICE_LOCKED");
		assert.equal(initialReport.increasedItemsCount, 1);
		assert.equal(initialReport.itemsRequiringAdminOverrideCount, 1);

		// 2. Врач применяет автономию (LOCK_ORIGINAL_PRICE) с авторизацией лояльности
		const resolutions = {
			"item-2": "LOCK_ORIGINAL_PRICE" as const,
		};
		const adminOverride = {
			isAuthorized: true,
			authorizedByAdminName: "Соколов А. В. (Главный врач)",
			overrideReason: "Сохранение стоимости по гарантии предварительной сметы",
		};

		const approvedReport = validateTreatmentPlanPrices(
			planPayload,
			dynamicLiveCatalog,
			preset,
			resolutions,
			{},
			adminOverride,
		);

		assert.equal(approvedReport.overallStatus, "APPROVED_PRICE_LOCKED");
		// Клиника абсорбирует разницу в 4 000 руб.
		assert.equal(approvedReport.totalClinicAbsorptionRub, 4000);
		assert.equal(approvedReport.resolvedNetRub, 25500); // 5 500 + 20 000

		// 3. Генерация заказ-наряда ЗТЛ
		const workOrderExport = generateWorkOrderExportPayload(approvedReport);
		assert.equal(workOrderExport.planId, "plan-live-uuid-001");
		assert.equal(workOrderExport.patientName, "Воронова Елена Дмитриевна");
		assert.equal(workOrderExport.doctorFullName, "Д-р Соколов А. В.");
		assert.equal(workOrderExport.totalPayableRub, 25500);
		assert.equal(workOrderExport.clinicAbsorptionGuaranteeRub, 4000);
		assert.equal(workOrderExport.items.length, 2);
	});

	it("6. Archived Service Detection & Doctor Autonomy: detects archived service and protects clinical flow", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;

		const planWithArchived: TreatmentPlanValidationPayload = {
			planId: "plan-live-uuid-002",
			planNumber: "TP-2026-0892",
			planTitle: "План с архивной услугой",
			patientId: "patient-uuid-102",
			patientName: "Сидоров П. И.",
			doctorId: "doc-uuid-501",
			doctorFullName: "Д-р Соколов А. В.",
			createdAtIso: new Date().toISOString(),
			items: [
				{
					itemId: "item-archived-1",
					toothNumber: 36,
					code804n: "A16.07.002.legacy",
					serviceTitle: "Пломба из амальгамы",
					category: "therapy",
					planUnitPriceRub: 2500,
					planDiscountRub: 0,
					planDiscountPercent: 0,
					quantity: 1,
					planLineTotalRub: 2500,
					serviceId: "srv-live-legacy-amalgam",
				},
			],
		};

		const report = validateTreatmentPlanPrices(
			planWithArchived,
			dynamicLiveCatalog,
			preset,
			{},
			{},
			{ isAuthorized: false },
		);

		assert.equal(report.overallStatus, "BLOCKED_ARCHIVED_SERVICE");
		assert.equal(report.archivedItemsCount, 1);
		assert.equal(report.canGenerateWorkOrder, true, "Mandate 8e: Work order generation not blocked for doctor");
	});
});
