import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import Fastify from "fastify";
import { signToken } from "../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "./auth.js";
import { registerMdlpRoutes } from "./mdlp.js";

describe("MDLP / Chestny Znak API Routes", () => {
	let app: ReturnType<typeof Fastify>;
	let clinicHeaders: Record<string, string>;
	const testOrgId = "11111111-2222-3333-4444-555555555555";

	beforeEach(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: testOrgId },
				TOKEN_SECRET(),
			),
			"x-organization-id": testOrgId,
		};

		app = Fastify();
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

		// 3. Second disposal of the same SGTIN should be rejected with 409
		const doubleDisposeRes = await app.inject({
			method: "POST",
			url: "/api/mdlp/dispose",
			headers: clinicHeaders,
			payload: {
				sgtin: "03400930000038DISPOSE123456",
			},
		});

		assert.strictEqual(doubleDisposeRes.statusCode, 409);
		assert.strictEqual(
			doubleDisposeRes.json().error,
			"MedicationAlreadyDisposed",
		);
	});

	test("GET /api/mdlp/items lists and filters tracked medications", async () => {
		const resAll = await app.inject({
			method: "GET",
			url: "/api/mdlp/items",
			headers: clinicHeaders,
		});

		assert.strictEqual(resAll.statusCode, 200);
		const jsonAll = resAll.json();
		assert.strictEqual(jsonAll.success, true);
		assert(Array.isArray(jsonAll.items));
		assert(jsonAll.total >= 2);

		// Filter by status=disposed
		const resDisposed = await app.inject({
			method: "GET",
			url: "/api/mdlp/items?status=disposed",
			headers: clinicHeaders,
		});

		assert.strictEqual(resDisposed.statusCode, 200);
		const jsonDisposed = resDisposed.json();
		assert(jsonDisposed.items.every((it: { status: string }) => it.status === "disposed"));

		// Filter by search query
		const resSearch = await app.inject({
			method: "GET",
			url: "/api/mdlp/items?search=Ультракаин",
			headers: clinicHeaders,
		});

		assert.strictEqual(resSearch.statusCode, 200);
		const jsonSearch = resSearch.json();
		assert(jsonSearch.items.every((it: { tradeName: string }) => it.tradeName.includes("Ультракаин")));
	});
});
