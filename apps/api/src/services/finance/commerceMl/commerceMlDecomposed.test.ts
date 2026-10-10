/**
 * DENTE Dental CRM — CommerceML 2.09 Decomposed Module Unit & Integration Tests.
 * Tests catalogXmlGenerator, offersXmlGenerator, and reconciliationEngine.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	COMMERCEML_VERSION_209,
	COMMERCEML_XMLNS,
	DEFAULT_OKEI_PIECE_CODE,
} from "@dental/shared";
import {
	CommerceMlService,
	ReconciliationEngine,
	buildCatalogXml,
	buildOffersXml,
	exportCommerceMlParamsSchema,
	oneCSyncPayloadSchema,
} from "./index.js";

const TEST_ORG_ID = "00000000-0000-7000-8000-000000000001";

describe("CommerceML Decomposed Modular Architecture Tests", () => {
	it("catalogXmlGenerator generates valid statutory import.xml CommerceML 2.09 structure", async () => {
		const result = await buildCatalogXml({
			organizationId: TEST_ORG_ID,
			classifierName: "Классификатор стоматологических услуг",
			catalogName: "Прейскурант клиники",
			includeInactive: false,
			priceTypeTitle: "Основной прайс-лист",
		});

		assert.ok(result.xml);
		assert.ok(result.sha256);
		assert.equal(result.sha256.length, 64);
		assert.ok(result.groupsCount >= 10);
		assert.ok(result.generatedAtIso);

		const xml = result.xml;
		assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes(`<КоммерческаяИнформация xmlns="${COMMERCEML_XMLNS}"`));
		assert.ok(xml.includes(`ВерсияСхемы="${COMMERCEML_VERSION_209}"`));
		assert.ok(xml.includes("<Классификатор>"));
		assert.ok(xml.includes("<Группы>"));
		assert.ok(xml.includes("Терапевтическая стоматология"));
		assert.ok(xml.includes("Дентальная имплантация"));
		assert.ok(xml.includes("Рентгенодиагностика"));
		assert.ok(xml.includes("<Каталог СодержитТолькоИзменения=\"false\">"));
		assert.ok(xml.includes("<Товары>"));
		assert.ok(xml.includes(`<Код>${DEFAULT_OKEI_PIECE_CODE}</Код>`));
	});

	it("offersXmlGenerator generates valid statutory offers.xml CommerceML 2.09 structure", async () => {
		const result = await buildOffersXml({
			organizationId: TEST_ORG_ID,
			warehouseName: "Основной склад клиники",
			includeZeroStock: true,
			priceTypeTitle: "Учетная цена списания",
		});

		assert.ok(result.xml);
		assert.ok(result.sha256);
		assert.equal(result.sha256.length, 64);
		assert.ok(result.generatedAtIso);

		const xml = result.xml;
		assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes(`<КоммерческаяИнформация xmlns="${COMMERCEML_XMLNS}"`));
		assert.ok(xml.includes(`ВерсияСхемы="${COMMERCEML_VERSION_209}"`));
		assert.ok(xml.includes("<ПакетПредложений СодержитТолькоИзменения=\"false\">"));
		assert.ok(xml.includes("<ТипыЦен>"));
		assert.ok(xml.includes("<Склады>"));
		assert.ok(xml.includes("<Предложения>"));
		assert.ok(xml.includes("Основной склад клиники"));
	});

	it("ReconciliationEngine builds statutory package and validates integrity", async () => {
		const res = await ReconciliationEngine.buildCommerceMlPackage({
			organizationId: TEST_ORG_ID,
			startDateIso: "2026-09-01",
			endDateIso: "2026-09-01",
			includeRetailSales: true,
			includeMedicalActs: true,
			includeMaterials: true,
			includePayroll: true,
		});

		assert.ok(res.package);
		assert.ok(res.xml);
		assert.ok(res.sha256);
		assert.ok(res.integrity);
		assert.equal(res.integrity.isValid, true);
		assert.equal(res.integrity.errors.length, 0);

		// Check facade integration
		const doubleCheck = CommerceMlService.checkDoublePosting(TEST_ORG_ID, res.sha256);
		assert.equal(doubleCheck.isDoublePosting, true);
		assert.ok(doubleCheck.message.includes("уже выгружался ранее"));
	});

	it("schemas validate parameters strictly per CommerceML contracts", () => {
		const validParams = {
			organizationId: TEST_ORG_ID,
			startDateIso: "2026-09-01",
			endDateIso: "2026-09-01",
		};
		assert.doesNotThrow(() => exportCommerceMlParamsSchema.parse(validParams));

		const invalidParams = {
			organizationId: "invalid-uuid",
			startDateIso: "01.09.2026",
			endDateIso: "2026-09-01",
		};
		assert.throws(() => exportCommerceMlParamsSchema.parse(invalidParams));

		const validSync = {
			organizationId: TEST_ORG_ID,
			syncTransactionId: "tx-test-01",
			reconciledPayments: [
				{
					paymentId: TEST_ORG_ID,
					status: "reconciled",
					fiscalReceiptNumber: "000123",
				},
			],
			inventoryStockUpdates: [
				{
					sku: "MAT-01",
					updatedQty: 10,
					unitCostRub: 120,
				},
			],
		};
		assert.doesNotThrow(() => oneCSyncPayloadSchema.parse(validSync));
	});

	it("CommerceMlService facade delegates methods transparently", async () => {
		const catalogRes = await CommerceMlService.buildCatalogXml({
			organizationId: TEST_ORG_ID,
			classifierName: "Классификатор стоматологических услуг",
			catalogName: "Прейскурант клиники",
			includeInactive: false,
			priceTypeTitle: "Основной прайс-лист",
		});
		assert.ok(catalogRes.xml);
		assert.ok(catalogRes.sha256);

		const offersRes = await CommerceMlService.buildOffersXml({
			organizationId: TEST_ORG_ID,
			warehouseName: "Основной склад клиники",
			priceTypeTitle: "Учетная цена списания",
			includeZeroStock: true,
		});
		assert.ok(offersRes.xml);
		assert.ok(offersRes.sha256);
	});
});
