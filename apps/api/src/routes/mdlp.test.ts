import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { getRequestIdentity } from "../security/identity.js";
import { mdlpQueueService } from "../services/mdlp/index.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerMdlpRoutes } from "./mdlp.js";

describe("MDLP / Chestny Znak API Routes", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	const testOrgId = "11111111-2222-3333-4444-555555555555";

	beforeEach(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.AUTH_TOKEN_SECRET ??= "test-auth-token-secret";

		mdlpQueueService.clearQueue(testOrgId);

		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: testOrgId, role: "admin", userId: "00000000-1111-2222-3333-444444444444" },
				authTokenSecret(),
			),
			"x-organization-id": testOrgId,
		};

		app = Fastify();
		app.addHook("onRequest", async (request) => {
			const identity = getRequestIdentity(request);
			const carrier = request as unknown as Record<string, unknown>;
			if (identity?.organizationId) {
				carrier.tenantId = identity.organizationId;
			}
		});

		await registerMdlpRoutes(app);
	});

	afterEach(async () => {
		await app.close();
	});

	test("POST /api/mdlp/scan parses valid Ultracain DataMatrix and registers item", async () => {
		const rawBarcode =
			"0103664798000016211A2B3C4D5E6F7\x1d91ABCD\x1d92aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789012345678";

		const response = await app.inject({
			method: "POST",
			url: "/api/mdlp/scan",
			headers: clinicHeaders,
			payload: {
				rawBarcode,
				autoRegister: true,
			},
		});

		assert.strictEqual(response.statusCode, 200);
		const json = response.json();
		assert.strictEqual(json.success, true);
		assert.strictEqual(json.isRegistered, true);
		assert.strictEqual(json.isDisposed, false);
		assert.strictEqual(json.status, "in_stock");
		assert.strictEqual(json.parsed.gtin, "03664798000016");
		assert.strictEqual(json.parsed.serialNumber, "1A2B3C4D5E6F7");
		assert.strictEqual(json.parsed.recognizedDrug?.id, "ultracain-ds-forte");
		assert.strictEqual(json.item.tradeName, "Ультракаин® Д-С форте");
	});

	test("POST /api/mdlp/scan rejects corrupted GTIN checksum with 422", async () => {
		// Bad check digit: 9 instead of 6
		const rawBarcode =
			"0103664798000019211A2B3C4D5E6F7\x1d91ABCD\x1d92aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789012345678";

		const response = await app.inject({
			method: "POST",
			url: "/api/mdlp/scan",
			headers: clinicHeaders,
			payload: {
				rawBarcode,
			},
		});

		assert.strictEqual(response.statusCode, 422);
		const json = response.json();
		assert.strictEqual(json.success, false);
		assert.strictEqual(json.error, "InvalidDataMatrixBarcode");
	});

	test("POST /api/mdlp/scan rejects empty barcode payload with 400", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/mdlp/scan",
			headers: clinicHeaders,
			payload: {
				rawBarcode: "",
			},
		});

		assert.strictEqual(response.statusCode, 400);
	});

	test("POST /api/mdlp/dispose records medical care write-off under Schema 10560", async () => {
		const rawBarcode =
			"010340093000003821DISPOSE123456\x1d91KEYX\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";

		// 1. First scan the item
		await app.inject({
			method: "POST",
			url: "/api/mdlp/scan",
			headers: clinicHeaders,
			payload: { rawBarcode },
		});

		// 2. Dispose for patient medical care
		const disposeRes = await app.inject({
			method: "POST",
			url: "/api/mdlp/dispose",
			headers: clinicHeaders,
			payload: {
				rawBarcode,
				series: "SER-2026-X",
				costRub: 420.0,
				reason: "Анестезия при лечении пульпита зуба 2.6",
			},
		});

		assert.strictEqual(disposeRes.statusCode, 200);
		const disposeJson = disposeRes.json();
		assert.strictEqual(disposeJson.success, true);
		assert.strictEqual(disposeJson.sgtin, "03400930000038DISPOSE123456");
		assert.strictEqual(disposeJson.item.status, "disposed");
		assert.strictEqual(
			disposeJson.disposalDocument.withdrawalType,
			13,
		);
		assert(disposeJson.disposalDocument.xmlContent.includes('<withdrawal action_id="10560">'));
		assert(disposeJson.disposalDocument.xmlContent.includes("<sgtin>03400930000038DISPOSE123456</sgtin>"));
	});

	test("GET /api/mdlp/catalog/anesthetics returns catalog of dental anesthetics", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/mdlp/catalog/anesthetics",
			headers: clinicHeaders,
		});

		assert.strictEqual(response.statusCode, 200);
		const json = response.json();
		assert.strictEqual(json.success, true);
		assert(Array.isArray(json.catalog));
		assert(json.catalog.length >= 6);
	});

	test("MDLP Queue workflow: add, list, remove, batch dispose under Schema 10560", async () => {
		const raw1 =
			"010366479800001621QUEUE00000001\x1d17280531\x1d10LOT1\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
		const raw2 =
			"010340093000001421QUEUE00000002\x1d17280531\x1d10LOT2\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";

		// 1. Add to queue
		const addRes1 = await app.inject({
			method: "POST",
			url: "/api/mdlp/queue/add",
			headers: clinicHeaders,
			payload: { rawBarcode: raw1, costRub: 450 },
		});
		assert.strictEqual(addRes1.statusCode, 200);
		assert.strictEqual(addRes1.json().success, true);

		const addRes2 = await app.inject({
			method: "POST",
			url: "/api/mdlp/queue/add",
			headers: clinicHeaders,
			payload: { rawBarcode: raw2, costRub: 420 },
		});
		assert.strictEqual(addRes2.statusCode, 200);

		// 2. Get queue
		const queueRes = await app.inject({
			method: "GET",
			url: "/api/mdlp/queue",
			headers: clinicHeaders,
		});
		assert.strictEqual(queueRes.statusCode, 200);
		const queueJson = queueRes.json();
		assert.strictEqual(queueJson.items.length, 2);
		assert.strictEqual(queueJson.stats.totalCount, 2);
		assert.strictEqual(queueJson.stats.totalCostRub, 870);

		// 3. Batch dispose from queue
		const batchRes = await app.inject({
			method: "POST",
			url: "/api/mdlp/dispose-batch",
			headers: clinicHeaders,
			payload: {
				useQueue: true,
				docNum: "BATCH-TEST-01",
				docDate: "2026-08-25",
			},
		});

		assert.strictEqual(batchRes.statusCode, 200);
		const batchJson = batchRes.json();
		assert.strictEqual(batchJson.success, true);
		assert.strictEqual(batchJson.disposedCount, 2);
		assert.strictEqual(batchJson.disposalDocument.actionId, 10560);
		assert(batchJson.disposalDocument.xmlContent.includes("<doc_num>BATCH-TEST-01</doc_num>"));

		// 4. Queue should now be empty
		const emptyQueueRes = await app.inject({
			method: "GET",
			url: "/api/mdlp/queue",
			headers: clinicHeaders,
		});
		assert.strictEqual(emptyQueueRes.json().items.length, 0);
	});

	test("POST /api/mdlp/disposal-act generates Senior Nurse Write-off Act", async () => {
		const raw =
			"010366479800001621ACT0000000001\x1d17280531\x1d10LOT2026\x1d91ABCD\x1d92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
		await app.inject({
			method: "POST",
			url: "/api/mdlp/queue/add",
			headers: clinicHeaders,
			payload: { rawBarcode: raw, costRub: 450 },
		});

		const actRes = await app.inject({
			method: "POST",
			url: "/api/mdlp/disposal-act",
			headers: clinicHeaders,
			payload: {
				useQueue: true,
				actNumber: "СПИС-API-01",
				seniorNurseName: "Иванова Е.В.",
			},
		});

		assert.strictEqual(actRes.statusCode, 200);
		const actJson = actRes.json();
		assert.strictEqual(actJson.success, true);
		assert.strictEqual(actJson.actData.actNumber, "СПИС-API-01");
		assert(actJson.html.includes("АКТ СПИСАНИЯ ЛЕКАРСТВЕННЫХ ПРЕПАРАТОВ"));
		assert(actJson.html.includes("Иванова Е.В."));
	});
});
