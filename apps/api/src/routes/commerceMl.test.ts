/**
 * DENTE Dental CRM — 1C:Enterprise (CommerceML 2.09) Fastify API Routes Tests.
 */

import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import { after, before, describe, it } from "node:test";
import {
	COMMERCEML_VERSION_209,
	COMMERCEML_XMLNS,
	DEFAULT_1C_CHART_OF_ACCOUNTS,
	DEFAULT_CLINIC_PROFILE_1C,
} from "@dental/shared";
import { createRealisticShiftExportPackage } from "../../../../packages/shared/src/tests/fixtures/commerceMlFixtures.js";
import { db } from "../db/client.js";
import { organizations, users } from "../db/schema.js";
import { idempotencyPlugin } from "../plugins/idempotencyPlugin.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerCommerceMlRoutes } from "./commerceMl.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import { createTenantTestApp } from "../tests/support/tenantTestApp.js";

const NAMESPACE = "commerceMlRoute";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const ADMIN_USER_ID = fixtureUuid(NAMESPACE, 2);

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = createTenantTestApp();
	await app.register(idempotencyPlugin);
	await app.register(registerCommerceMlRoutes);
	await app.ready();
	return app;
}

function createStaffHeaders(organizationId: string, userId = ADMIN_USER_ID, role = "admin") {
	const token = signToken(
		{ organizationId, userId, role },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
	};
}

describe("1C CommerceML 2.09 Fastify Integration Routes", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "ООО «ДЕНТЕ Тест 1С»",
				loginId: `org_cml_${Date.now()}`,
				inn: "7707083893",
				kpp: "770701001",
				ogrn: "1027700132195",
			}).onConflictDoNothing();
			await db.insert(users).values({
				id: ADMIN_USER_ID,
				organizationId: ORG_ID,
				fullName: "Администратор 1С Тест",
				role: "admin",
			}).onConflictDoNothing();
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("GET /api/v1/integrations/1c/commerceml/export returns statutory XML package", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID);

		const res = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/export?startDateIso=2026-09-01&endDateIso=2026-09-01&format=xml",
			headers,
		});

		assert.equal(res.statusCode, 200);
		assert.equal(res.headers["content-type"]?.includes("application/xml"), true);
		assert.equal(res.headers["x-commerceml-version"], COMMERCEML_VERSION_209);
		assert.ok(res.headers["x-commerceml-sha256"]);

		const xml = res.body;
		assert.equal(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'), true);
		assert.equal(xml.includes(`xmlns="${COMMERCEML_XMLNS}"`), true);
		assert.equal(xml.includes("<КоммерческаяИнформация"), true);
		assert.equal(xml.includes("Отчет о розничных продажах"), true);
		assert.equal(xml.includes("90.01.1"), true);
		assert.equal(xml.includes("50.01"), true);
		await app.close();
	});

	it("POST /api/v1/integrations/1c/commerceml/export returns JSON package with SHA-256 and integrity checks", async () => {
		const app = await buildTestApp();
		const headers = {
			...createStaffHeaders(ORG_ID),
			"idempotency-key": randomUUID(),
		};

		const res = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/export",
			headers,
			payload: {
				organizationId: ORG_ID,
				startDateIso: "2026-09-01",
				endDateIso: "2026-09-01",
				format: "json",
			},
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.success, true);
		assert.ok(json.packageId);
		assert.ok(json.sha256);
		assert.equal(json.integrity.isValid, true);
		assert.equal(json.integrity.errors.length, 0);
		assert.equal(json.package.chartOfAccounts.accountCashDesk, "50.01");
		await app.close();
	});

	it("POST /api/v1/integrations/1c/commerceml/validate requires auth and validates package integrity", async () => {
		const app = await buildTestApp();
		const pkg = createRealisticShiftExportPackage(
			"2026-09-01",
			DEFAULT_CLINIC_PROFILE_1C,
			DEFAULT_1C_CHART_OF_ACCOUNTS,
		);

		const unauthRes = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/validate",
			headers: { "idempotency-key": randomUUID() },
			payload: pkg,
		});
		assert.equal(unauthRes.statusCode, 401);

		const res = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/validate",
			headers: {
				...createStaffHeaders(ORG_ID),
				"idempotency-key": randomUUID(),
			},
			payload: pkg,
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.isValid, true);
		assert.equal(json.errors.length, 0);
		assert.ok(json.sha256);
		await app.close();
	});

	it("POST /api/v1/integrations/1c/commerceml/check-double-posting detects previously exported packages in PG18", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID);

		const exportRes = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/export",
			headers: { ...headers, "idempotency-key": randomUUID() },
			payload: {
				organizationId: ORG_ID,
				startDateIso: "2026-09-01",
				endDateIso: "2026-09-01",
				format: "json",
			},
		});
		const exportJson = exportRes.json();
		const sha256 = exportJson.sha256;

		const checkRes = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/check-double-posting",
			headers: { ...headers, "idempotency-key": randomUUID() },
			payload: {
				organizationId: ORG_ID,
				sha256Hash: sha256,
			},
		});

		assert.equal(checkRes.statusCode, 200);
		const checkJson = checkRes.json();
		assert.equal(checkJson.isDoublePosting, true);
		assert.equal(checkJson.message.includes("уже выгружался ранее"), true);
		await app.close();
	});

	it("POST /api/v1/integrations/1c/commerceml/sync handles inbound ACID transactions & invalid XML 400", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID);

		const invalidXmlRes = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/sync",
			headers: {
				...headers,
				"content-type": "application/xml",
				"idempotency-key": randomUUID(),
			},
			payload: "<NotCommerceML><Foo>bar</Foo></NotCommerceML>",
		});
		assert.equal(invalidXmlRes.statusCode, 400);
		assert.equal(invalidXmlRes.json().error, "InvalidXmlPayload");

		const syncPayload = {
			organizationId: ORG_ID,
			syncTransactionId: `sync-1c-${Date.now()}`,
			syncTimestamp: new Date().toISOString(),
			postedDocumentConfirmations: [
				{
					documentId: "doc-sales-20260901",
					documentNumber: "DN-РОЗН-20260901",
					isPosted: true,
					oneCDocumentNumber: "1С-000492",
					postedAtIso: new Date().toISOString(),
				},
			],
			inventoryStockUpdates: [
				{
					sku: "MAT-SEPT-100",
					updatedQty: 48,
					unitCostKopecks: 550000,
					warehouseName: "Основной склад клиники",
				},
			],
		};

		const res1 = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/sync",
			headers: { ...headers, "idempotency-key": randomUUID() },
			payload: syncPayload,
		});

		assert.equal(res1.statusCode, 200);
		const json1 = res1.json();
		assert.equal(json1.success, true);
		assert.ok(json1.syncTransactionHash);

		// Different Idempotency-Key but identical payload exercises PG18 commerceml_sync_journal dedup
		const res2 = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/sync",
			headers: { ...headers, "idempotency-key": randomUUID() },
			payload: syncPayload,
		});

		assert.equal(res2.statusCode, 200);
		const json2 = res2.json();
		assert.equal(json2.success, true);
		assert.equal(json2.syncTransactionHash, json1.syncTransactionHash);
		await app.close();
	});

	it("GET /api/v1/integrations/1c/commerceml/{shifts,acts,materials,catalog,offers} return inspection data", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID);

		const resShifts = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/shifts?startDateIso=2026-09-01",
			headers,
		});
		assert.equal(resShifts.statusCode, 200);
		assert.equal(resShifts.json().accountsBreakdown.accountCashDesk, "50.01");

		const resActs = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/acts?startDateIso=2026-09-01",
			headers,
		});
		assert.equal(resActs.statusCode, 200);
		assert.ok(resActs.json().medicalActs);

		const resMat = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/materials?startDateIso=2026-09-01",
			headers,
		});
		assert.equal(resMat.statusCode, 200);
		assert.equal(resMat.json().accounts.debitAccount, "20.01");

		const resCatalog = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/catalog?format=json",
			headers,
		});
		assert.equal(resCatalog.statusCode, 200);
		assert.ok(resCatalog.json().xml.includes("<Классификатор>"));

		const resOffers = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/offers?format=json",
			headers,
		});
		assert.equal(resOffers.statusCode, 200);
		assert.ok(resOffers.json().xml.includes("<ПакетПредложений"));
		await app.close();
	});
});
