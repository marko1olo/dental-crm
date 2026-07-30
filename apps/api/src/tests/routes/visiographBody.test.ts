/**
 * СТОРОЖ ТЕЛА /api/imaging/visiograph-ai.
 *
 * Раньше: bare cast `request.body as { imageBase64?: string }` — null/non-object
 * не проверялись как у соседних imaging-маршрутов через parseImagingPayload.
 * Missing imageBase64 message сохранён: 400 { error: "Missing imageBase64" }.
 *
 * Auth-first: requireClinicalReadAccess до parse. В NODE_ENV=test + unguarded
 * reads без секрета → пропуск в body-gate (как speech access proofs).
 * Не ходим в AI: только ветки 400 до analyzeVisiographImage.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { registerImagingRoutes } from "../../routes/imaging.js";

describe("Visiograph AI — body guard (null → 400, не 500)", () => {
	let app: FastifyInstance;
	const savedEnv: Record<string, string | undefined> = {};

	before(async () => {
		for (const key of [
			"NODE_ENV",
			"DENTE_CLINICAL_ADMIN_SECRET",
			"DENTE_CLINICAL_ALLOW_UNGUARDED_READS",
		]) {
			savedEnv[key] = process.env[key];
		}

		process.env.NODE_ENV = "test";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

		app = Fastify({ logger: false });
		await registerImagingRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
		for (const [key, value] of Object.entries(savedEnv)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});

	async function postVisiograph(
		opts: {
			body?: unknown;
			rawPayload?: string | Buffer | null;
		} = {},
	) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		const injectOpts: {
			method: "POST";
			url: string;
			headers: Record<string, string>;
			payload?: unknown;
		} = {
			method: "POST",
			url: "/api/imaging/visiograph-ai",
			headers,
		};
		if (opts.rawPayload !== undefined) {
			if (opts.rawPayload !== null) injectOpts.payload = opts.rawPayload;
		} else if (opts.body !== undefined) {
			injectOpts.payload = opts.body;
		}
		const response = await app.inject(injectOpts);
		let json: Record<string, unknown> = {};
		try {
			json = JSON.parse(response.body) as Record<string, unknown>;
		} catch {
			json = {};
		}
		return { statusCode: response.statusCode, json, body: response.body };
	}

	test("JSON null body → 400 Missing imageBase64, не 500", async () => {
		const refused = await postVisiograph({ rawPayload: "null" });
		assert.equal(
			refused.statusCode,
			400,
			`null body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "Missing imageBase64");
	});

	test("пустое {} → 400 Missing imageBase64, не 500", async () => {
		const refused = await postVisiograph({ body: {} });
		assert.equal(
			refused.statusCode,
			400,
			`пустой body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "Missing imageBase64");
	});

	test("imageBase64 пустая строка → 400 Missing imageBase64", async () => {
		const refused = await postVisiograph({ body: { imageBase64: "" } });
		assert.equal(
			refused.statusCode,
			400,
			`пустая imageBase64 дала HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.equal(refused.json.error, "Missing imageBase64");
	});

	test("imageBase64 пробелы → 400 Missing imageBase64", async () => {
		const refused = await postVisiograph({ body: { imageBase64: "   " } });
		assert.equal(
			refused.statusCode,
			400,
			`пробелы imageBase64 дали HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.equal(refused.json.error, "Missing imageBase64");
	});

	test("JSON array body → 400 Missing imageBase64, не 500", async () => {
		const refused = await postVisiograph({ rawPayload: "[]" });
		assert.equal(
			refused.statusCode,
			400,
			`array body дал HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.notEqual(refused.statusCode, 500);
		assert.equal(refused.json.error, "Missing imageBase64");
	});
});
