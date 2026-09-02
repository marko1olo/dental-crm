import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify from "fastify";
import { registerSpeechLiveRoutes } from "./speechLive.js";

describe("SpeechLive Fastify Routes (/api/v1/speech/live)", () => {
	it("registers status endpoint and returns valid diagnostic metadata", async () => {
		const app = fastify({ logger: false });
		await registerSpeechLiveRoutes(app);

		const response = await app.inject({
			method: "GET",
			url: "/api/v1/speech/live/status",
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.ok, true);
		assert.equal(body.provider, "gemini_transcribe_live");
		assert.ok(body.endpoint.includes("generativelanguage.googleapis.com"));
		assert.ok(body.model.includes("gemini-3.5-transcribe-live"));
		assert.ok(typeof body.proxy === "object");
		assert.ok(typeof body.keyPool === "object");
		assert.ok(body.dentalVocabularyTermsCount > 20);

		await app.close();
	});
});
