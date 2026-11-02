import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify from "fastify";
import WebSocket from "ws";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
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

	it("allows non-clinical staff (receptionist, administrator) to connect via WebSocket without 4403 (Mandates 8e, 8n)", async () => {
		const app = fastify({ logger: false });
		await registerSpeechLiveRoutes(app);
		await app.ready();
		await app.listen({ port: 0, host: "127.0.0.1" });
		const addr = app.server.address();
		const port = typeof addr === "object" && addr ? addr.port : 0;

		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: "org-speech-receptionist" }, secret);
		const staffToken = signToken(
			{
				organizationId: "org-speech-receptionist",
				userId: "user-receptionist-1",
				role: "receptionist",
				clinicalRole: null,
			},
			secret,
		);

		const wsUrl = `ws://127.0.0.1:${port}/api/v1/speech/live`;
		const ws = new WebSocket(wsUrl, {
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
		});

		let opened = false;
		let receivedPong = false;
		let closedCode = 0;
		let receivedError: unknown = null;

		await new Promise<void>((resolve) => {
			ws.on("open", () => {
				opened = true;
				ws.send(JSON.stringify({ type: "ping" }));
			});
			ws.on("message", (raw) => {
				try {
					const msg = JSON.parse(raw.toString());
					if (msg.type === "pong") {
						receivedPong = true;
						ws.close(1000, "Normal closure");
					} else if (msg.type === "error") {
						receivedError = msg;
					}
				} catch {}
			});
			ws.on("close", (code) => {
				closedCode = code;
				resolve();
			});
			setTimeout(resolve, 3000);
		});

		assert.equal(opened, true, "WebSocket должен успешно установиться");
		assert.notEqual(closedCode, 4403, "WebSocket НЕ должен быть закрыт с кодом 4403 Forbidden");
		assert.notEqual((receivedError as { error?: string })?.error, "MedicalSpeechDictationForbidden");

		await app.close();
	});

	it("supports alternate route /api/speech/live for all clinic staff (admin/owner)", async () => {
		const app = fastify({ logger: false });
		await registerSpeechLiveRoutes(app);
		await app.ready();
		await app.listen({ port: 0, host: "127.0.0.1" });
		const addr = app.server.address();
		const port = typeof addr === "object" && addr ? addr.port : 0;

		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: "org-speech-admin" }, secret);
		const staffToken = signToken(
			{
				organizationId: "org-speech-admin",
				userId: "user-admin-1",
				role: "administrator",
				clinicalRole: null,
			},
			secret,
		);

		const wsUrl = `ws://127.0.0.1:${port}/api/speech/live`;
		const ws = new WebSocket(wsUrl, {
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
		});

		let opened = false;
		let receivedPong = false;
		let closedCode = 0;

		await new Promise<void>((resolve) => {
			ws.on("open", () => {
				opened = true;
				ws.send(JSON.stringify({ type: "ping" }));
			});
			ws.on("message", (raw) => {
				try {
					const msg = JSON.parse(raw.toString());
					if (msg.type === "pong") {
						receivedPong = true;
						ws.close(1000, "Normal closure");
					}
				} catch {}
			});
			ws.on("close", (code) => {
				closedCode = code;
				resolve();
			});
			setTimeout(resolve, 3000);
		});

		assert.equal(opened, true, "WebSocket /api/speech/live должен открываться для администратора");
		assert.notEqual(closedCode, 4403, "WebSocket НЕ должен быть закрыт с кодом 4403 Forbidden");

		await app.close();
	});
});
