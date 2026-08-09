/**
 * СТОРОЖ ТЕЛА ВЕБХУКОВ MAX / WhatsApp (cast-after-200).
 *
 * Раньше после reply.code(200).send(...) шёл bare cast:
 *   const body = request.body as Record<string, unknown>
 *   body.payload / body.entry  → TypeError если body null/не-object
 * Клиент уже получил 200, но uncaught rejection портил воркер и логи.
 *
 * Shape-guard после ACK: null / "string" / [] → 200 и тихий return, без throw.
 * NODE_ENV=test: секреты вебхука не заданы → dev-path (пропуск verify).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { registerMaxRoutes } from "../../routes/max.js";
import { registerWhatsappRoutes } from "../../routes/whatsapp.js";

describe("Messenger webhooks — cast-after-200 body guard", () => {
	let app: FastifyInstance;
	const savedEnv: Record<string, string | undefined> = {};

	before(async () => {
		savedEnv.NODE_ENV = process.env.NODE_ENV;
		savedEnv.MAX_WEBHOOK_SECRET = process.env.MAX_WEBHOOK_SECRET;
		savedEnv.DENTE_WEBHOOK_SECRET = process.env.DENTE_WEBHOOK_SECRET;
		savedEnv.WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET;
		savedEnv.META_APP_SECRET = process.env.META_APP_SECRET;

		// test ≠ production → webhook secret / app secret optional (dev warn path)
		process.env.NODE_ENV = "test";
		delete process.env.MAX_WEBHOOK_SECRET;
		delete process.env.DENTE_WEBHOOK_SECRET;
		delete process.env.WHATSAPP_APP_SECRET;
		delete process.env.META_APP_SECRET;

		app = Fastify({ logger: false });
		await registerMaxRoutes(app);
		await registerWhatsappRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
		for (const [key, value] of Object.entries(savedEnv)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});

	async function postWebhook(
		url: string,
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
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			payload?: any;
		} = { method: "POST", url, headers };

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
		return {
			statusCode: response.statusCode,
			json,
			body: String(response.body || ""),
		};
	}

	test("MAX webhook: JSON null body → 200 ok, no throw", async () => {
		const res = await postWebhook("/api/max/webhook", {
			rawPayload: "null",
		});
		assert.equal(res.statusCode, 200, res.body);
		assert.equal(res.json.ok, true);
	});

	test("MAX webhook: JSON string body → 200 ok, no throw", async () => {
		const res = await postWebhook("/api/max/webhook", {
			rawPayload: '"not-an-object"',
		});
		assert.equal(res.statusCode, 200, res.body);
		assert.equal(res.json.ok, true);
	});

	test("MAX webhook: empty object → 200 ok (no payload, silent return)", async () => {
		const res = await postWebhook("/api/max/webhook", { body: {} });
		assert.equal(res.statusCode, 200, res.body);
		assert.equal(res.json.ok, true);
	});

	test("WhatsApp webhook: JSON null body → 200 received, no throw", async () => {
		const res = await postWebhook("/api/whatsapp/webhook", {
			rawPayload: "null",
		});
		assert.equal(res.statusCode, 200, res.body);
		assert.equal(res.json.received, true);
	});

	test("WhatsApp webhook: empty object → 200 received", async () => {
		const res = await postWebhook("/api/whatsapp/webhook", { body: {} });
		assert.equal(res.statusCode, 200, res.body);
		assert.equal(res.json.received, true);
	});
});
