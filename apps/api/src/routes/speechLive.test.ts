import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify from "fastify";
import WebSocket from "ws";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerSpeechLiveRoutes } from "./speechLive.js";

describe("SpeechLive Fastify Routes (/api/v1/speech/live)", () => {
	it("rejects unauthenticated /status (401) and returns diagnostic metadata with valid clinic token (200)", async () => {
		const prevNodeEnv = process.env.NODE_ENV;
		const prevAllowReads = process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		const prevAdminSecret = process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.NODE_ENV = "development";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

		const app = fastify({ logger: false });
		try {
			await registerSpeechLiveRoutes(app);

			const unauthRes = await app.inject({
				method: "GET",
				url: "/api/v1/speech/live/status",
			});
			assert.equal(unauthRes.statusCode, 401);

			const clinicToken = signToken({ organizationId: "org-speech-status" }, authTokenSecret());
			const response = await app.inject({
				method: "GET",
				url: "/api/v1/speech/live/status",
				headers: {
					"x-dente-clinic-token": clinicToken,
				},
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
		} finally {
			await app.close();
			if (prevNodeEnv !== undefined) process.env.NODE_ENV = prevNodeEnv;
			else delete process.env.NODE_ENV;
			if (prevAllowReads !== undefined) process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = prevAllowReads;
			else delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
			if (prevAdminSecret !== undefined) process.env.DENTE_CLINICAL_ADMIN_SECRET = prevAdminSecret;
		}
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
				} catch (err) {
					receivedError = err;
				}
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

		let parseError: unknown = null;

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
				} catch (err) {
					parseError = err;
				}
			});
			ws.on("close", (code) => {
				closedCode = code;
				resolve();
			});
			setTimeout(resolve, 3000);
		});

		assert.equal(opened, true, "WebSocket /api/speech/live должен открываться для администратора");
		assert.equal(parseError, null, "Не должно быть ошибок парсинга сообщений");
		assert.notEqual(closedCode, 4403, "WebSocket НЕ должен быть закрыт с кодом 4403 Forbidden");

		await app.close();
	});

	it("closes unauthenticated WebSocket /api/v1/speech/live with code 4001 Unauthorized", async () => {
		const app = fastify({ logger: false });
		await registerSpeechLiveRoutes(app);
		await app.ready();
		await app.listen({ port: 0, host: "127.0.0.1" });
		const addr = app.server.address();
		const port = typeof addr === "object" && addr ? addr.port : 0;

		const ws = new WebSocket(`ws://127.0.0.1:${port}/api/v1/speech/live`);
		let closedCode = 0;

		await new Promise<void>((resolve) => {
			ws.on("close", (code) => {
				closedCode = code;
				resolve();
			});
			ws.on("error", () => resolve());
			setTimeout(resolve, 3000);
		});

		assert.equal(closedCode, 4001, `Ожидался код закрытия 4001 для анонимного WS, получено ${closedCode}`);
		await app.close();
	});

	it("issues short-lived WS ticket via POST /api/v1/speech/live/ticket (.strict()) and accepts ?ticket= & first-frame auth", async () => {
		const app = fastify({ logger: false });
		try {
			await registerSpeechLiveRoutes(app);
			await app.ready();
			await app.listen({ port: 0, host: "127.0.0.1" });
			const addr = app.server.address();
			const port = typeof addr === "object" && addr ? addr.port : 0;

			const unauthTicketRes = await app.inject({ method: "POST", url: "/api/v1/speech/live/ticket" });
			assert.equal(unauthTicketRes.statusCode, 401);

			const secret = authTokenSecret();
			const clinicToken = signToken({ organizationId: "org-speech-ticket" }, secret);
			const staffToken = signToken(
				{ organizationId: "org-speech-ticket", userId: "user-doc-1", role: "doctor" },
				secret,
			);

			const extraFieldRes = await app.inject({
				method: "POST",
				url: "/api/v1/speech/live/ticket",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: { unknownProp: true },
			});
			assert.equal(extraFieldRes.statusCode, 400);

			const ticketRes = await app.inject({
				method: "POST",
				url: "/api/v1/speech/live/ticket",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: { specialty: "therapist", sampleRate: 16000 },
			});
			assert.equal(ticketRes.statusCode, 200);
			const ticketBody = ticketRes.json() as { ok: boolean; ticket: string };
			assert.equal(ticketBody.ok, true);
			assert.ok(ticketBody.ticket.length > 10);

			// 1. Connect via query ticket
			const wsTicket = new WebSocket(`ws://127.0.0.1:${port}/api/v1/speech/live?ticket=${encodeURIComponent(ticketBody.ticket)}`);
			let ticketOpened = false;
			let ticketClosedCode = 0;
			await new Promise<void>((resolve) => {
				wsTicket.on("open", () => {
					ticketOpened = true;
					wsTicket.send(JSON.stringify({ type: "ping" }));
				});
				wsTicket.on("message", (raw) => {
					const msg = JSON.parse(raw.toString()) as { type?: string };
					if (msg.type === "pong") {
						wsTicket.close(1000, "Done");
					}
				});
				wsTicket.on("close", (code) => {
					ticketClosedCode = code;
					resolve();
				});
				setTimeout(resolve, 2000);
			});
			assert.equal(ticketOpened, true, "WS с валидным ?ticket= должен открываться");
			assert.notEqual(ticketClosedCode, 4001, "WS с валидным ?ticket= не должен закрываться с 4001");
			assert.notEqual(ticketClosedCode, 4403);

			// 2. Connect via browser-compatible first-frame session_init with signed tokens
			const wsFirstFrame = new WebSocket(`ws://127.0.0.1:${port}/api/speech/live`);
			let gotReady = false;
			let firstFrameClosedCode = 0;
			await new Promise<void>((resolve) => {
				wsFirstFrame.on("open", () => {
					wsFirstFrame.send(JSON.stringify({ type: "session_init", clinicToken, staffToken, sampleRate: 16000 }));
				});
				wsFirstFrame.on("message", (raw) => {
					const msg = JSON.parse(raw.toString()) as { type?: string };
					if (msg.type === "session_ready") {
						gotReady = true;
						wsFirstFrame.send(JSON.stringify({ type: "ping" }));
					} else if (msg.type === "pong") {
						wsFirstFrame.close(1000, "Done");
					}
				});
				wsFirstFrame.on("close", (code) => {
					firstFrameClosedCode = code;
					resolve();
				});
				setTimeout(resolve, 2000);
			});
			assert.equal(gotReady, true, "WS с валидным session_init должен присылать session_ready");
			assert.notEqual(firstFrameClosedCode, 4001);
			assert.notEqual(firstFrameClosedCode, 4403);

			// 3. Reject spoofed session_init without signed token or ticket (4001)
			const wsSpoof = new WebSocket(`ws://127.0.0.1:${port}/api/speech/live`);
			let spoofCloseCode = 0;
			await new Promise<void>((resolve) => {
				wsSpoof.on("open", () => {
					wsSpoof.send(JSON.stringify({ type: "session_init", organizationId: "spoofed-org", adminSecret: "fake" }));
				});
				wsSpoof.on("close", (code) => {
					spoofCloseCode = code;
					resolve();
				});
				setTimeout(resolve, 2000);
			});
			assert.equal(spoofCloseCode, 4001);
		} finally {
			await app.close();
		}
	});
});
