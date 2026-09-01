/**
 * DENTE Dental CRM — 1C:Enterprise (CommerceML 2.09) Fastify API Routes Tests.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import Fastify from "fastify";
import {
	COMMERCEML_VERSION_209,
	COMMERCEML_XMLNS,
	DEFAULT_1C_CHART_OF_ACCOUNTS,
	DEFAULT_CLINIC_PROFILE_1C,
	createRealisticShiftExportPackage,
} from "@dental/shared";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerCommerceMlRoutes } from "./commerceMl.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = Fastify();
	await app.register(registerCommerceMlRoutes);
	await app.ready();
	return app;
}

function createStaffHeaders(organizationId: string, userId = "usr-admin-1", role = "admin") {
	const token = signToken(
		{ organizationId, userId, role },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
	};
}

describe("1C CommerceML 2.09 Fastify Integration Routes", () => {
	it("GET /api/v1/integrations/1c/commerceml/export returns statutory XML package", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID);

		const res = await app.inject({
			method: "GET",
			url: `/api/v1/integrations/1c/commerceml/export?startDateIso=2026-09-01&endDateIso=2026-09-01&format=xml`,
			headers,
		});

		assert.equal(res.statusCode, 200);
		assert.equal(
			res.headers["content-type"]?.includes("application/xml"),
			true,
		);
		assert.equal(res.headers["x-commerceml-version"], COMMERCEML_VERSION_209);
		assert.ok(res.headers["x-commerceml-sha256"]);

		const xml = res.body;
		assert.equal(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'), true);
		assert.equal(xml.includes(`xmlns="${COMMERCEML_XMLNS}"`), true);
		assert.equal(xml.includes("<КоммерческаяИнформация"), true);
		assert.equal(xml.includes("Отчет о розничных продажах"), true);
		assert.equal(xml.includes("90.01.1"), true);
		assert.equal(xml.includes("50.01"), true);
	});

	it("POST /api/v1/integrations/1c/commerceml/export returns JSON package with SHA-256 and integrity checks", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID);

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
	});

	it("POST /api/v1/integrations/1c/commerceml/validate validates package integrity", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID);
		const pkg = createRealisticShiftExportPackage(
			"2026-09-01",
			DEFAULT_CLINIC_PROFILE_1C,
			DEFAULT_1C_CHART_OF_ACCOUNTS,
		);

		const res = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/validate",
			headers,
			payload: pkg,
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.isValid, true);
		assert.equal(json.errors.length, 0);
		assert.ok(json.sha256);
	});

	it("POST /api/v1/integrations/1c/commerceml/check-double-posting detects previously exported packages", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID);

		// First export to log SHA-256
		const exportRes = await app.inject({
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
		const exportJson = exportRes.json();
		const sha256 = exportJson.sha256;

		// Check double posting
		const checkRes = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/check-double-posting",
			headers,
			payload: {
				organizationId: ORG_ID,
				sha256Hash: sha256,
			},
		});

		assert.equal(checkRes.statusCode, 200);
		const checkJson = checkRes.json();
		assert.equal(checkJson.isDoublePosting, true);
		assert.equal(checkJson.message.includes("уже выгружался ранее"), true);
	});

	it("POST /api/v1/integrations/1c/commerceml/sync handles inbound ACID transactions with idempotency", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID);

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
					unitCostRub: 5500,
					warehouseName: "Основной склад клиники",
				},
			],
		};

		// 1. Initial sync execution
		const res1 = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/sync",
			headers,
			payload: syncPayload,
		});

		assert.equal(res1.statusCode, 200);
		const json1 = res1.json();
		assert.equal(json1.success, true);
		assert.ok(json1.syncTransactionHash);

		// 2. Duplicate sync replay (idempotency check)
		const res2 = await app.inject({
			method: "POST",
			url: "/api/v1/integrations/1c/commerceml/sync",
			headers,
			payload: syncPayload,
		});

		assert.equal(res2.statusCode, 200);
		const json2 = res2.json();
		assert.equal(json2.success, true);
		assert.equal(json2.syncTransactionHash, json1.syncTransactionHash);
	});

	it("GET /api/v1/integrations/1c/commerceml/shifts, acts, and materials return inspection data", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(ORG_ID);

		// Shifts
		const resShifts = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/shifts?startDateIso=2026-09-01",
			headers,
		});
		assert.equal(resShifts.statusCode, 200);
		const shiftsJson = resShifts.json();
		assert.equal(shiftsJson.accountsBreakdown.accountCashDesk, "50.01");

		// Medical Acts
		const resActs = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/acts?startDateIso=2026-09-01",
			headers,
		});
		assert.equal(resActs.statusCode, 200);
		const actsJson = resActs.json();
		assert.ok(actsJson.medicalActs);

		// Materials
		const resMat = await app.inject({
			method: "GET",
			url: "/api/v1/integrations/1c/commerceml/materials?startDateIso=2026-09-01",
			headers,
		});
		assert.equal(resMat.statusCode, 200);
		const matJson = resMat.json();
		assert.equal(matJson.accounts.debitAccount, "20.01");
	});
});
