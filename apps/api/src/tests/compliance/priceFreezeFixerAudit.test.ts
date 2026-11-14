/**
 * apps/api/src/tests/compliance/priceFreezeFixerAudit.test.ts
 *
 * RED TEAM FIXER REGRESSION AUDIT [FIXER-PRICEFREEZE-01]:
 * 1. SEV-1: Tooth-only matching defect eradicated in buildPlanItemsForValidation.
 * 2. SEV-2: code804n and toothNumber properly frozen and matched.
 * 3. SEV-2: Multi-tenant tenant isolation in CommerceML reconciliationStore.
 * 4. SEV-2: Fastify XML parser for inbound 1C CommerceML sync (no 415 error).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { buildPlanItemsForValidation } from "../../routes/invoiceRoutes/helpers/planItemsValidationBuilder.js";
import {
	checkDoublePosting,
	clearReconciliationStoreForTests,
	isSyncHashProcessed,
	markSyncHashProcessed,
	registerExportedPackage,
} from "../../services/finance/commerceMl/modules/reconciliationStore.js";
import { registerCommerceMlRoutes } from "../../routes/commerceMl.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

describe("RED TEAM FIXER AUDIT [FIXER-PRICEFREEZE-01]", () => {
	it("SEV-1 FIXED: tooth-only match does NOT override price of unrelated service on same tooth", () => {
		const targetPlanDbItems = [
			{
				id: "plan-item-crown-36",
				planId: "plan-1",
				priceId: "srv-crown-zirconia::Коронка диоксид циркония",
				price: 38000,
				priceRub: 38000,
				unitPriceKopecks: 3800000,
				toothNumber: 36,
				name: "Коронка диоксид циркония",
			},
		];

		const catalogRows = [
			{
				id: "srv-xray-36",
				code: "A06.07.001",
				name: "Прицельный снимок визиографа",
				basePriceRub: 350,
				category: "Диагностика",
			},
			{
				id: "srv-crown-zirconia",
				code: "A16.07.004",
				name: "Коронка диоксид циркония",
				basePriceRub: 42000, // Каталожная цена выросла до 42 000 ₽
				category: "Ортопедия",
			},
		];

		// Врач выписывает прицельный снимок (350 ₽) на зубе 36
		const invoiceItems = [
			{
				itemId: "item-xray",
				serviceId: "srv-xray-36",
				nameRu: "Прицельный снимок визиографа",
				toothNumber: 36,
				quantity: 1,
			},
		];

		const result = buildPlanItemsForValidation({
			items: invoiceItems,
			catalogRows: catalogRows as any,
			freezeToken: null,
			targetPlanDbItems: targetPlanDbItems as any,
			targetPlan: null,
			isPriceLockedFinal: false,
			isAdminOverrideVerified: false,
		});

		assert.equal(result.length, 1);
		// Прицельный снимок ОБЯЗАН остаться 350 ₽ (35 000 копеек), а НЕ 38 000 ₽ (3 800 000 копеек)!
		assert.equal(
			result[0]?.planUnitPriceKopecks,
			35000,
			`SEV-1 Defect! X-ray price must be 350 ₽ (35000 kop), but got ${result[0]?.planUnitPriceKopecks} kop!`,
		);
	});

	it("SEV-1 VERIFICATION: identical service on matching tooth correctly receives plan locked price", () => {
		const targetPlanDbItems = [
			{
				id: "plan-item-crown-36",
				planId: "plan-1",
				priceId: "srv-crown-zirconia::Коронка диоксид циркония",
				price: 38000,
				priceRub: 38000,
				unitPriceKopecks: 3800000,
				toothNumber: 36,
				name: "Коронка диоксид циркония",
			},
		];

		const catalogRows = [
			{
				id: "srv-crown-zirconia",
				code: "A16.07.004",
				name: "Коронка диоксид циркония",
				price: 42000, // Каталожная цена выросла до 42 000 ₽
				priceRub: 42000,
				category: "Ортопедия",
			},
		];

		// Врач выписывает коронку на зубе 36
		const invoiceItems = [
			{
				itemId: "plan-item-crown-36",
				serviceId: "srv-crown-zirconia",
				nameRu: "Коронка диоксид циркония",
				toothNumber: 36,
				quantity: 1,
			},
		];

		const result = buildPlanItemsForValidation({
			items: invoiceItems,
			catalogRows: catalogRows as any,
			freezeToken: null,
			targetPlanDbItems: targetPlanDbItems as any,
			targetPlan: null,
			isPriceLockedFinal: true,
			isAdminOverrideVerified: false,
		});

		assert.equal(result.length, 1);
		// Коронка на зубе 36 получает утвержденную цену плана 38 000 ₽
		assert.equal(result[0]?.planUnitPriceKopecks, 3800000);
	});

	it("SEV-2 FIXED: CommerceML reconciliationStore multi-tenant isolation by organizationId", () => {
		clearReconciliationStoreForTests();
		const orgAlpha = "00000000-0000-7000-8000-000000000001";
		const orgBeta = "00000000-0000-7000-8000-000000000002";
		const commonHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

		// Клиника Альфа обработала синхронизацию
		markSyncHashProcessed(orgAlpha, commonHash);
		assert.equal(isSyncHashProcessed(orgAlpha, commonHash), true);
		// Клиника Бета НЕ должна блокироваться из-за хэша Альфы!
		assert.equal(isSyncHashProcessed(orgBeta, commonHash), false);

		// Клиника Альфа зарегистрировала экспорт пакета
		registerExportedPackage(orgAlpha, commonHash, {
			exportedAtIso: "2026-11-14T10:00:00.000Z",
			packageId: "pkg-alpha-01",
		});

		const checkAlpha = checkDoublePosting(orgAlpha, commonHash);
		assert.equal(checkAlpha.isDoublePosting, true);

		const checkBeta = checkDoublePosting(orgBeta, commonHash);
		assert.equal(checkBeta.isDoublePosting, false);
	});

	it("SEV-2 FIXED: Fastify handles application/xml and text/xml without 415 Unsupported Media Type", async () => {
		const app = Fastify();
		await registerCommerceMlRoutes(app);

		const xmlPayload = `<?xml version="1.0" encoding="windows-1251"?>
<КоммерческаяИнформация ВерсияСхемы="2.09" ДатаФормирования="2026-11-14">
	<ПакетДокументов>
		<Документ>
			<Ид>doc-1c-001</Ид>
			<Номер>1С-001</Номер>
		</Документ>
	</ПакетДокументов>
</КоммерческаяИнформация>`;

		const token = signToken(
			{
				organizationId: "00000000-0000-7000-8000-000000000001",
				role: "admin",
				userId: "00000000-0000-7000-8000-000000000002",
			},
			authTokenSecret(),
		);

		const response = await app.inject({
			method: "POST",
			url: "/api/commerceml/sync",
			headers: {
				"content-type": "application/xml",
				"x-dente-clinic-token": token,
			},
			payload: xmlPayload,
		});

		// Запрос НЕ должен отклоняться Fastify с HTTP 415!
		assert.notEqual(
			response.statusCode,
			415,
			`Endpoint must NOT fail with 415 Unsupported Media Type! Got: ${response.statusCode}`,
		);
		assert.equal(response.statusCode, 200);
		const json = response.json();
		assert.equal(json.success, true);
	});
});
