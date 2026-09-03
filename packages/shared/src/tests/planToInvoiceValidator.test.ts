/**
 * DENTE Dental CRM — Unit Tests for Plan Price Locking & Obsolete Service Gate (Feature #41).
 *
 * Tests:
 * 1. Price lock protection with clinic absorption calculation.
 * 2. 804n group extraction and active analogue auto-matching.
 * 3. Strict blocking of archived/missing services before work order generation.
 * 4. Zero and invalid price detection.
 * 5. Expired plan resolution policies.
 * 6. Statutory supplementary agreement HTML generator.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	type CatalogServiceLookup,
	type PlanItemForValidation,
	type PlanToInvoiceValidationPayload,
	validatePlanToInvoice,
} from "../finance/planToInvoiceValidator.js";
import {
	PRICE_LOCK_POLICY_CONFIGS,
	renderSupplementaryAgreementHtml,
} from "../finance/priceLockEngine.js";

describe("planToInvoiceValidator (Feature #41)", () => {
	const mockCatalog: CatalogServiceLookup[] = [
		{
			id: "srv-001",
			code804n: "A16.07.002.001",
			title: "Наложение пломбы из фотополимерного композита Filtek Z250",
			category: "therapy",
			basePriceKopecks: 650000, // 6 500 ₽ (подорожало с 5 000 ₽)
			active: true,
			isArchived: false,
		},
		{
			id: "srv-002",
			code804n: "A16.07.004",
			title: "Удаление постоянного зуба сложное с разъединением корней",
			category: "surgery",
			basePriceKopecks: 450000, // 4 500 ₽
			active: true,
			isArchived: false,
		},
		{
			id: "srv-003-archived",
			code804n: "A16.07.002.999",
			title: "Пломбирование химическим композитом (устаревшая методика)",
			category: "therapy",
			basePriceKopecks: 300000,
			active: false,
			isArchived: true, // В архиве!
		},
		{
			id: "srv-004-modern",
			code804n: "A16.07.002.002",
			title: "Восстановление зуба пломбой светового отверждения Gradia Direct",
			category: "therapy",
			basePriceKopecks: 580000, // 5 800 ₽
			active: true,
			isArchived: false,
		},
	];

	it("should protect patient agreed price within 30-day window and calculate clinic absorption", () => {
		const items: PlanItemForValidation[] = [
			{
				itemId: "item-1",
				toothNumber: 16,
				code804n: "A16.07.002.001",
				nameRu: "Пломба Filtek Z250",
				quantity: 1,
				planUnitPriceKopecks: 500000, // 5 000 ₽ в плане (в каталоге 6 500 ₽)
				planDiscountKopecks: 0,
			},
		];

		const payload: PlanToInvoiceValidationPayload = {
			planId: "PLAN-101",
			planNumber: "ПЛАН-001",
			patientId: "PAT-001",
			patientName: "Иванов Иван",
			planCreatedAtIso: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 дней назад
			isSignedWithPatient: true,
			items,
			catalog: mockCatalog,
		};

		const report = validatePlanToInvoice(payload);

		assert.equal(report.isPriceLocked, true);
		assert.equal(report.isPlanExpired, false);
		assert.equal(report.canGenerateWorkOrder, true);
		assert.equal(report.canGenerateInvoice, true);

		const itemRes = report.items[0]!;
		assert.equal(itemRes.unitPriceDeltaKopecks, 150000); // +1 500 ₽ в каталоге
		assert.equal(itemRes.clinicAbsorptionKopecks, 150000); // Клиника берет разницу на себя
		assert.equal(itemRes.effectiveUnitPriceKopecks, 500000); // Пациент платит 5 000 ₽
		assert.equal(report.totalClinicAbsorptionKopecks, 150000);
		assert.equal(report.effectiveInvoiceNetKopecks, 500000);
	});

	it("should strictly block work order generation when plan contains archived service without 804n replacement", () => {
		const items: PlanItemForValidation[] = [
			{
				itemId: "item-archived",
				toothNumber: 24,
				code804n: "A16.07.002.999",
				nameRu: "Пломбирование химическим композитом",
				quantity: 1,
				planUnitPriceKopecks: 300000,
			},
		];

		const payload: PlanToInvoiceValidationPayload = {
			planId: "PLAN-102",
			patientId: "PAT-002",
			planCreatedAtIso: new Date().toISOString(),
			items,
			catalog: mockCatalog,
		};

		const report = validatePlanToInvoice(payload);

		// DEFECT-PRICE-02: Strict block
		assert.equal(report.canGenerateWorkOrder, false);
		assert.equal(report.archivedItemsCount, 1);

		const itemRes = report.items[0]!;
		assert.equal(itemRes.isArchived, true);
		assert.equal(itemRes.severity, "BLOCKED");
		assert.ok(itemRes.suggested804nAnalogue !== null);
		assert.equal(itemRes.suggested804nAnalogue?.code804n.startsWith("A16.07.002"), true);
	});

	it("should unblock work order generation once archived service is replaced with suggested 804n analogue", () => {
		const items: PlanItemForValidation[] = [
			{
				itemId: "item-archived",
				toothNumber: 24,
				code804n: "A16.07.002.999",
				nameRu: "Пломбирование химическим композитом",
				quantity: 1,
				planUnitPriceKopecks: 300000,
			},
		];

		const payload: PlanToInvoiceValidationPayload = {
			planId: "PLAN-102",
			patientId: "PAT-002",
			planCreatedAtIso: new Date().toISOString(),
			items,
			catalog: mockCatalog,
			itemResolutionOverrides: {
				"item-archived": "REPLACE_WITH_804N_ANALOGUE",
			},
			itemAnalogueSelections: {
				"item-archived": "srv-004-modern", // Заменяем на Gradia Direct (A16.07.002.002)
			},
		};

		const report = validatePlanToInvoice(payload);

		assert.equal(report.canGenerateWorkOrder, true);
		assert.equal(report.canGenerateInvoice, true);
		assert.equal(report.items[0]?.effectiveUnitPriceKopecks, 580000); // Актуальная цена аналога
	});

	it("should detect invalid zero-price items and flag as blocking error", () => {
		const items: PlanItemForValidation[] = [
			{
				itemId: "item-zero",
				toothNumber: 11,
				code804n: "A16.07.004",
				nameRu: "Удаление зуба",
				quantity: 1,
				planUnitPriceKopecks: 0, // 0 ₽!
			},
		];

		const payload: PlanToInvoiceValidationPayload = {
			planId: "PLAN-103",
			patientId: "PAT-003",
			planCreatedAtIso: new Date().toISOString(),
			items,
			catalog: mockCatalog,
		};

		const report = validatePlanToInvoice(payload);

		assert.equal(report.canGenerateWorkOrder, false);
		assert.equal(report.items[0]?.discrepancyType, "INVALID_PRICE");
		assert.equal(report.items[0]?.severity, "BLOCKED");
	});

	it("should require admin override if price inflation exceeds policy threshold", () => {
		const items: PlanItemForValidation[] = [
			{
				itemId: "item-spike",
				toothNumber: 36,
				code804n: "A16.07.002.001",
				nameRu: "Пломба Filtek Z250",
				quantity: 1,
				planUnitPriceKopecks: 200000, // В плане было 2 000 ₽, в прайсе 6 500 ₽ (+225%!)
			},
		];

		const payload: PlanToInvoiceValidationPayload = {
			planId: "PLAN-104",
			patientId: "PAT-004",
			planCreatedAtIso: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 дней назад
			isSignedWithPatient: false,
			inflationThresholdPercent: 15,
			items,
			catalog: mockCatalog,
		};

		const report = validatePlanToInvoice(payload);

		assert.equal(report.canGenerateWorkOrder, false);
		assert.equal(report.itemsRequiringOverrideCount, 1);
	});

	it("should authorize generation when admin override is provided with valid name and reason", () => {
		const items: PlanItemForValidation[] = [
			{
				itemId: "item-spike",
				toothNumber: 36,
				code804n: "A16.07.002.001",
				nameRu: "Пломба Filtek Z250",
				quantity: 1,
				planUnitPriceKopecks: 200000,
			},
		];

		const payload: PlanToInvoiceValidationPayload = {
			planId: "PLAN-104",
			patientId: "PAT-004",
			planCreatedAtIso: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
			isSignedWithPatient: false,
			adminOverrideAuthorized: true,
			adminOverrideStaffName: "Главный врач Сидоров В. П.",
			adminOverrideReason: "Согласовано по гарантийным обязательствам клиники",
			items,
			catalog: mockCatalog,
		};

		const report = validatePlanToInvoice(payload);

		assert.equal(report.canGenerateWorkOrder, true);
		assert.equal(report.adminOverrideInfo.isAuthorized, true);
		assert.equal(report.adminOverrideInfo.staffName, "Главный врач Сидоров В. П.");
	});

	it("should enforce 10% default inflation threshold per Decree 659 and art. 709 GK RF", () => {
		const items: PlanItemForValidation[] = [
			{
				itemId: "item-12-percent",
				toothNumber: 36,
				code804n: "A16.07.002.001",
				nameRu: "Пломба Filtek Z250",
				quantity: 1,
				planUnitPriceKopecks: 500000, // 5 000 ₽ в плане
			},
		];

		// В каталоге srv-001 цена 6 500 ₽ (+30% > 10% дефолтного порога)
		const payload: PlanToInvoiceValidationPayload = {
			planId: "PLAN-105",
			patientId: "PAT-005",
			planCreatedAtIso: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
			isSignedWithPatient: false,
			// inflationThresholdPercent НЕ передан — обязан дефолтиться на 10%
			items,
			catalog: mockCatalog,
		};

		const report = validatePlanToInvoice(payload);

		assert.equal(report.canGenerateWorkOrder, false);
		assert.equal(report.items[0]?.requiresAdminOverride, true);
		assert.equal(report.itemsRequiringOverrideCount, 1);
	});

	it("should strictly block unilateral UPDATE_TO_CURRENT_PRICE on locked solid estimate (твердая смета) without admin override", () => {
		const items: PlanItemForValidation[] = [
			{
				itemId: "item-locked-override",
				toothNumber: 16,
				code804n: "A16.07.002.001",
				nameRu: "Пломба Filtek Z250",
				quantity: 2, // 2 шт.
				planUnitPriceKopecks: 500000, // 5 000 ₽ за ед.
				planDiscountKopecks: 0,
			},
		];

		const payload: PlanToInvoiceValidationPayload = {
			planId: "PLAN-106",
			patientId: "PAT-006",
			planCreatedAtIso: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
			isSignedWithPatient: true, // Твердая смета подписана с пациентом!
			items,
			catalog: mockCatalog, // В каталоге 6 500 ₽ за ед.
			itemResolutionOverrides: {
				"item-locked-override": "UPDATE_TO_CURRENT_PRICE", // Попытка оператора поднять цену по твердой смете
			},
		};

		const report = validatePlanToInvoice(payload);

		// Должно требовать авторизацию руководства и блокировать выписку без оверрайда
		assert.equal(report.canGenerateWorkOrder, false, "Выписка наряда по твердой смете с повышением цены обязана блокироваться без согласования руководства!");
		assert.equal(report.items[0]?.requiresAdminOverride, true);
		assert.equal(report.items[0]?.patientSurchargeKopecks, 300000); // 2 шт. * 1 500 ₽ = 3 000 ₽ доплата
		assert.equal(report.supplementaryAgreementNeeded, true, "Требуется Дополнительное соглашение (ст. 709 ГК РФ)");
	});
});

describe("priceLockEngine (Feature #41)", () => {
	it("should have correct policy statuses for preset configurations", () => {
		const policy = PRICE_LOCK_POLICY_CONFIGS.standard_30_days;
		assert.equal(policy.validityDays, 30);
		assert.equal(policy.isAutoLockEnabled, true);
	});

	it("should generate legal supplementary agreement HTML per Decree 736 and Law 2300-1", () => {
		const html = renderSupplementaryAgreementHtml({
			agreementNumber: "ДС-01/8492",
			agreementDateIso: "2026-09-01",
			contractNumber: "ДОГ-8492/2026",
			planNumber: "ПЛАН-001",
			clinicBrandName: "DENTE",
			clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			clinicInn: "7701234567",
			clinicOgrn: "1157746123456",
			clinicAddress: "г. Москва, ул. Стоматологическая, д. 10",
			doctorFullName: "Сидоров В. П.",
			patientFullName: "Иванов Иван Иванович",
			patientPassportOrDoc: "4510 № 123456, выдан ОВД г. Москвы, 10.05.2015",
			previousPlanTotalKopecks: 10000000,
			newPlanTotalKopecks: 12000000,
			deltaKopecks: 2000000,
			isClinicAbsorption: false,
			clinicAbsorptionKopecks: 0,
			patientPayableDeltaKopecks: 2000000,
			justificationRu: "Корректировка объема лечения в связи с дополнительными показаниями",
			modifiedItems: [
				{
					toothNumber: 16,
					code804n: "A16.07.002.001",
					serviceTitle: "Восстановление зуба композитом",
					quantity: 1,
					oldUnitPriceKopecks: 500000,
					newUnitPriceKopecks: 700000,
					deltaUnitPriceKopecks: 200000,
					lineOldTotalKopecks: 500000,
					lineNewTotalKopecks: 700000,
					changeReasonRu: "Усложнение клинической картины и прайс-лист 2026",
				},
			],
		});

		assert.ok(html.includes("ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № ДС-01/8492"));
		assert.ok(html.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("120") && html.includes("000,00"));
		assert.ok(html.includes("A16.07.002.001"));
	});
});
