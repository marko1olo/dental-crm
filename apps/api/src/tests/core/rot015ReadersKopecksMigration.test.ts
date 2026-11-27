import assert from "node:assert/strict";
import test from "node:test";
import { rublesToKopecks } from "@dental/shared";
import {
	projectServiceCatalogRows,
	type ServiceCatalogRow,
} from "../../db/pricelistModules/pricelistReadQueries.js";
import { resolvePriceFaqItemKopecks } from "../../services/bots/plugins/PriceFaqPlugin.js";
import {
	buildDerived3TierSummary,
	resolvePlanNetKopecks,
} from "../../services/budget/budgetTiersSummary.js";
import { reconcileSurgicalActWithInventory } from "../../services/daemons/sanpinDaemon/inventoryDeductionRunner.js";
import {
	buildDeterministicTreatmentItems,
	findCatalogService,
} from "../../services/demo/deepSeeder/timelineModules/clinicalHistoryGenerator.js";

function makeCatalogRow(overrides: Partial<ServiceCatalogRow>): ServiceCatalogRow {
	return {
		id: "11111111-1111-7111-8111-111111111111",
		organizationId: "22222222-2222-7222-8222-222222222222",
		code: "B01.065.001",
		title: "Первичный приём врача-стоматолога",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 0,
		priceRub: 0,
		priceKopecks: 0n,
		basePriceKopecks: 0n,
		durationMinutes: 30,
		taxDeductible: true,
		taxDeductionCode: null,
		order804nCode: null,
		uetAdult: 1,
		uetChild: 1,
		isDecree458Expensive: false,
		nsiServiceId: null,
		materialsCostRub: 0,
		labCostRub: 0,
		materialsCostKopecks: 0n,
		labCostKopecks: 0n,
		salaryPriceKopecks: null,
		tierPrices: {},
		isActive: true,
		...overrides,
	};
}

test("ROT-015 pricelistReadQueries prefers canonical *Kopecks BIGINT columns over stale *Rub", () => {
	const rowWithPrimaryKopecks = makeCatalogRow({
		basePriceKopecks: 150050n,
		priceKopecks: 150050n,
		materialsCostKopecks: 22575n,
		labCostKopecks: 40025n,
		basePriceRub: 999,
		priceRub: 999,
		materialsCostRub: 10,
		labCostRub: 10,
	});
	const legacyRow = makeCatalogRow({
		id: "33333333-3333-7333-8333-333333333333",
		code: "A16.07.002",
		title: "Лечение кариеса (легаси строка)",
		basePriceKopecks: 0n,
		priceKopecks: 0n,
		materialsCostKopecks: 0n,
		labCostKopecks: 0n,
		basePriceRub: 3200.5,
		priceRub: 3200.5,
		materialsCostRub: 150.25,
		labCostRub: 0,
	});

	const { items, rejected } = projectServiceCatalogRows([
		rowWithPrimaryKopecks,
		legacyRow,
	]);

	assert.equal(rejected.length, 0);
	assert.equal(items.length, 2);

	const first = items[0];
	assert.ok(first);
	assert.equal(first.priceKopecks, 150050);
	assert.equal(first.basePriceRub, 1500.5);
	assert.equal(first.materialsCostRub, 225.75);
	assert.equal(first.labCostRub, 400.25);

	const second = items[1];
	assert.ok(second);
	assert.equal(second.priceKopecks, 320050);
	assert.equal(second.basePriceRub, 3200.5);
	assert.equal(second.materialsCostRub, 150.25);
});

test("ROT-015 PriceFaqPlugin resolves basePriceKopecks -> priceKopecks -> legacy basePriceRub", () => {
	assert.equal(
		resolvePriceFaqItemKopecks({
			basePriceKopecks: 245050n,
			priceKopecks: 10000n,
			basePriceRub: 100,
		}),
		245050,
	);
	assert.equal(
		resolvePriceFaqItemKopecks({
			basePriceKopecks: 0n,
			priceKopecks: 199025n,
			basePriceRub: 50,
		}),
		199025,
	);
	assert.equal(
		resolvePriceFaqItemKopecks({
			basePriceKopecks: 0n,
			priceKopecks: 0n,
			basePriceRub: 1800.75,
		}),
		180075,
	);
});

test("ROT-015 clinicalHistoryGenerator reads *Kopecks first and writes *Kopecks on treatment items", () => {
	const catalogRows = [
		{
			id: "svc-fill-1",
			code: "A16.07.002.010",
			title: "Восстановление зуба пломбой (светоотверждаемый композит)",
			basePriceKopecks: 350075n,
			priceKopecks: 350075n,
			basePriceRub: 10,
		},
	];
	const byCode = new Map(
		catalogRows.map((row) => [row.code.toUpperCase(), row]),
	);

	const lookup = findCatalogService(
		catalogRows,
		byCode,
		"A16.07.002.010",
		"Восстановление зуба пломбой",
		3500,
	);
	assert.equal(lookup.priceKopecks, 350075);
	assert.equal(lookup.price, 3500.75);

	const items = buildDeterministicTreatmentItems({
		isCanonicalDemo: false,
		organizationId: "org-1",
		p0Id: "p0",
		p1Id: "p1",
		p3Id: "p3",
		doctorUserId: "doc-1",
		orthopedistUserId: "doc-2",
		surgeonUserId: "doc-3",
		chair1Id: "ch-1",
		chair2Id: "ch-2",
		catalogRows,
	});
	const cariesItem = items.find((i) => i.serviceId === "svc-fill-1");
	assert.ok(cariesItem);
	assert.equal(cariesItem.priceKopecks, 350075n);
	assert.equal(cariesItem.unitPriceKopecks, 350075n);
	assert.equal(cariesItem.discountKopecks, 0n);
	assert.equal(cariesItem.priceRub, 3500.75);
});

test("ROT-015 budgetTiersSummary prefers planDiscountKopecks & totalPriceKopecks over legacy *Rub", () => {
	const primaryPlan = resolvePlanNetKopecks({
		totalPriceKopecks: 1200050n,
		totalPriceRub: 100,
		totalPrice: 100,
		planDiscountKopecks: 200050n,
		planDiscountRub: "999.00",
	});
	assert.equal(primaryPlan.netKopecks, 1000000);
	assert.equal(primaryPlan.discountKopecks, 200050);

	const legacyDiscountPlan = resolvePlanNetKopecks({
		totalPriceKopecks: 500000n,
		totalPriceRub: 5000,
		totalPrice: 5000,
		planDiscountKopecks: 0n,
		planDiscountRub: "1500.25",
	});
	assert.equal(legacyDiscountPlan.discountKopecks, 150025);
	assert.equal(legacyDiscountPlan.netKopecks, 349975);

	const summary = buildDerived3TierSummary(
		primaryPlan.netKopecks,
		primaryPlan.discountKopecks,
		"optimum",
	);
	assert.equal(summary.defaultSelectedTierId, "optimum");
	const optimumTier = summary.tiersSummary.find((t) => t.tierId === "optimum");
	assert.equal(optimumTier?.netTotalKopecks, 1000000);
	assert.equal(optimumTier?.discountKopecks, 200050);
	assert.equal(optimumTier?.taxDeduction13Kopecks, rublesToKopecks(1300));
});

test("ROT-015 inventoryDeductionRunner uses treatmentItems.priceKopecks and inventoryTransactions.unitCostKopecks", () => {
	const alerts = reconcileSurgicalActWithInventory(
		{
			visitId: "visit-1",
			organizationId: "org-1",
			patientId: "patient-1",
			patientFullName: "Тестов Пациент",
			doctorId: "doc-1",
			doctorName: "Доктор Хирург",
			shiftDate: "2026-11-27",
			implantInstallations: [],
			billedItems: [
				{
					id: "ti-1",
					serviceId: "svc-implant",
					serviceCode: "A16.07.054",
					serviceTitle: "Установка имплантата Straumann BLX",
					quantity: 1,
					priceKopecks: 4512350n,
					priceRub: 100,
				},
			],
		},
		[
			{
				id: "tx-1",
				itemId: "inv-1",
				itemName: "Шовный материал",
				quantityChanged: -1,
				unitCostKopecks: 895025n,
				unitCostRub: "1.00",
			},
			{
				id: "tx-2",
				itemId: "inv-2",
				itemName: "Костный блок (легаси)",
				quantityChanged: -1,
				unitCostKopecks: 0n,
				unitCostRub: "1250.75",
			},
		],
	);

	assert.equal(alerts.length, 1);
	const alert = alerts[0];
	assert.ok(alert);
	assert.equal(alert.billedOrInstalled.estimatedPriceRub, 45123.5);
	assert.equal(alert.warehouseRecorded[0]?.unitCostRub, 8950.25);
	assert.equal(alert.warehouseRecorded[1]?.unitCostRub, 1250.75);
});
