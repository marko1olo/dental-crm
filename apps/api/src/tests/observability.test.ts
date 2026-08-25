import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER, isValidCorrelationId } from "@dental/shared";
import Fastify from "fastify";
import { requestLoggingPlugin } from "../observability/requestLoggingPlugin.js";

describe("Server Observability & Structured Request Logging Plugin", () => {
	it("injects a generated correlation ID when none is provided", async () => {
		const app = Fastify({ logger: false });
		await app.register(requestLoggingPlugin);

		app.get("/test/ping", async (req, reply) => {
			return { ok: true, correlationId: req.correlationId };
		});

		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: "/test/ping",
		});

		assert.equal(res.statusCode, 200);
		const correlationHeader = res.headers[CORRELATION_ID_HEADER] as string;
		const requestHeader = res.headers[REQUEST_ID_HEADER] as string;

		assert.ok(correlationHeader, "Expected x-correlation-id header");
		assert.ok(requestHeader, "Expected x-request-id header");
		assert.equal(correlationHeader, requestHeader);
		assert.ok(isValidCorrelationId(correlationHeader));

		const body = JSON.parse(res.body);
		assert.equal(body.correlationId, correlationHeader);

		await app.close();
	});

	it("preserves incoming x-correlation-id header through request lifecycle", async () => {
		const app = Fastify({ logger: false });
		await app.register(requestLoggingPlugin);

		const customId = "cor_019532d5-e234-7000-8000-000000000000";

		app.get("/test/custom-id", async (req) => {
			return { correlationId: req.correlationId };
		});

		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: "/test/custom-id",
			headers: {
				[CORRELATION_ID_HEADER]: customId,
			},
		});

		assert.equal(res.statusCode, 200);
		assert.equal(res.headers[CORRELATION_ID_HEADER], customId);
		assert.equal(res.headers[REQUEST_ID_HEADER], customId);

		const body = JSON.parse(res.body);
		assert.equal(body.correlationId, customId);

		await app.close();
	});

	it("captures latency and error information when route throws", async () => {
		const app = Fastify({ logger: false });
		await app.register(requestLoggingPlugin);

		app.get("/test/error", async () => {
			throw new Error("Simulated database failure");
		});

		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: "/test/error",
		});

		assert.equal(res.statusCode, 500);
		assert.ok(res.headers[CORRELATION_ID_HEADER]);

		await app.close();
	});
});
