import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { afterEach, describe, it } from "node:test";
import { generateUuidV7 } from "@dental/shared";
import Fastify from "fastify";
import { WebSocket, WebSocketServer } from "ws";
import { isDemoShowcaseMode } from "../../accessGuard.js";
import { withResilientTransaction } from "../../db/resilientTransaction.js";
import { cacheHeadersPlugin, clearAllCache } from "../../plugins/cacheHeaders.js";
import { extractTenantId } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import {
	clearInMemoryIdempotencyCache,
	idempotencyPlugin,
} from "../../plugins/idempotencyPlugin.js";
import { registerHealthRoutes } from "../../routes/health.js";
import { authTokenSecret, resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { resolveDemoTokenIdentity } from "../../security/identityModules/tokenSignerAndVerifier.js";
import { roleHasPermissionWithOverrides } from "../../security/permissionsModules/permissionChecks.js";
import { resolveWebOrigins } from "../../serverModules/corsAndSecurity.js";
import {
	CloudRelayClient,
	isRouteAllowedForTunnel,
	loadCloudRelayConfigFromEnv,
	type TunnelRequestPayload,
	type TunnelResponsePayload,
} from "../../services/cloudRelayClient.js";
import { ServerHealthWatchdog } from "../../services/system/ServerHealthWatchdog.js";
import { wsBroker, type WsClientSocket } from "../../services/websocketBroker.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { readWhatsappCredentials } from "../../whatsappTransport.js";

function withSavedEnv(overrides: Record<string, string | undefined>, fn: () => Promise<void> | void) {
	return async () => {
		const prev: Record<string, string | undefined> = {};
		for (const [k, v] of Object.entries(overrides)) {
			prev[k] = process.env[k];
			if (v === undefined) delete process.env[k];
			else process.env[k] = v;
		}
		resetAuthSecretCacheForTests();
		try {
			await fn();
		} finally {
			for (const [k, v] of Object.entries(prev)) {
				if (v === undefined) delete process.env[k];
				else process.env[k] = v;
			}
			resetAuthSecretCacheForTests();
		}
	};
}

describe("Wave 15 Platform Security, Plugins, RLS & Transports Regression Suite", () => {
	afterEach(() => {
		clearInMemoryIdempotencyCache();
		clearAllCache();
	});

	it(
		"[W15-SEC-01 & W15-SEC-04] rejects demo tokens and fails closed outside named development/test modes",
		withSavedEnv(
			{
				NODE_ENV: "staging",
				AUTH_TOKEN_SECRET: undefined,
				WEB_ORIGIN: undefined,
				DENTE_DEMO_MODE: "1",
				DENTE_ALLOW_DEMO_LOGIN: "1",
			},
			() => {
				assert.strictEqual(isDemoShowcaseMode(), false);
				assert.strictEqual(
					resolveDemoTokenIdentity("demo-showcase-token", "demo-token-owner"),
					null,
				);
				assert.throws(() => authTokenSecret(), /AUTH_TOKEN_SECRET/);
				assert.throws(() => resolveWebOrigins(), /WEB_ORIGIN/);
			},
		),
	);

	it(
		"[W15-SEC-01] rejects demo tokens even in development when demo login/mode flags are off",
		withSavedEnv(
			{
				NODE_ENV: "development",
				DENTE_ALLOW_DEMO_LOGIN: "0",
				DENTE_DEMO_MODE: undefined,
				DENTE_DEMO_SHOWCASE: undefined,
			},
			() => {
				assert.strictEqual(isDemoShowcaseMode(), false);
				assert.strictEqual(
					resolveDemoTokenIdentity("demo-showcase-clinic-token", "demo-showcase-staff-token-owner"),
					null,
				);
			},
		),
	);

	it("[W15-SEC-02] blocks pre-auth x-organization-id tenant spoofing in idempotency & cacheHeaders and emits Idempotency-Key", async () => {
		const victimOrg = "11111111-1111-4111-8111-111111111111";
		const spoofedReq = {
			headers: { "x-organization-id": victimOrg },
			params: { organizationId: victimOrg },
			body: { organizationId: victimOrg, clinicId: victimOrg },
			query: {},
		} as unknown as Parameters<typeof extractTenantId>[0];

		assert.strictEqual(extractTenantId(spoofedReq), null);

		const app = Fastify({ logger: false });
		await app.register(idempotencyPlugin);
		await app.register(cacheHeadersPlugin);

		let counter = 0;
		app.post("/api/test/idem", async (_req, reply) => {
			counter++;
			return reply.code(201).send({ ok: true, counter });
		});

		app.get("/api/templates", async (_req, reply) => {
			counter++;
			return reply.code(200).send({ ok: true, counter });
		});

		await app.ready();

		const key = generateUuidV7();
		const resPost = await app.inject({
			method: "POST",
			url: "/api/test/idem",
			headers: { "idempotency-key": key },
			payload: { step: 1 },
		});
		assert.strictEqual(resPost.statusCode, 201);
		assert.strictEqual(resPost.headers["x-idempotency-key"], key);
		assert.strictEqual(resPost.headers["idempotency-key"], key);

		// Hash mismatch evicts in-memory conflict without leaving stale in_flight
		const resCollision = await app.inject({
			method: "POST",
			url: "/api/test/idem",
			headers: { "idempotency-key": key },
			payload: { step: 2 },
		});
		assert.strictEqual(resCollision.statusCode, 409);

		// Private catalog cache must not serve 304 to unauthenticated caller spoofing x-organization-id
		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: victimOrg }, secret, 3600);
		const authGet = await app.inject({
			method: "GET",
			url: "/api/templates",
			headers: { "x-dente-clinic-token": clinicToken },
		});
		assert.strictEqual(authGet.statusCode, 200);
		const etag = String(authGet.headers.etag ?? "");
		assert.ok(etag.startsWith('W/"'));

		const spoofGet = await app.inject({
			method: "GET",
			url: "/api/templates",
			headers: {
				"x-organization-id": victimOrg,
				"if-none-match": etag,
			},
		});
		assert.strictEqual(spoofGet.statusCode, 200);
		await app.close();
	});

	it(
		"[W15-SEC-03] /api/system/metrics requires auth and ServerHealthWatchdog escapes Prometheus labels",
		withSavedEnv(
			{
				NODE_ENV: "production",
				DENTE_CLINICAL_ADMIN_SECRET: "wave15-metrics-secret-1234567890",
				DENTE_CLINICAL_ALLOW_UNGUARDED_READS: undefined,
			},
			async () => {
				const app = Fastify({ logger: false });
				await registerHealthRoutes(app);
				await app.ready();

				const denied = await app.inject({ method: "GET", url: "/api/system/metrics" });
				assert.strictEqual(denied.statusCode, 403);

				const ok = await app.inject({
					method: "GET",
					url: "/api/system/metrics",
					headers: { "x-dente-admin-secret": "wave15-metrics-secret-1234567890" },
				});
				assert.strictEqual(ok.statusCode, 200);
				await app.close();

				const metrics = await ServerHealthWatchdog.getSystemMetrics({ checkDbPing: false });
				metrics.queues.queues['bad"queue\nline\\test'] = {
					pending: 2,
					processing: 1,
					deadLetter: 0,
					failed: 0,
				};
				const prom = ServerHealthWatchdog.toPrometheusMetrics(metrics);
				assert.ok(prom.includes('queue="bad\\"queue\\nline\\\\test"'));
			},
		),
	);

	it("[W15-SEC-05] wsBroker.broadcastToUser isolates clinical events and strips diagnostic payloads for non-clinical staff", () => {
		const orgId = "org-ws-user-test";
		const docSent: string[] = [];
		const recSent: string[] = [];

		const makeSocket = (bucket: string[]): WsClientSocket => ({
			readyState: 1,
			send(data: string, cb?: (err?: Error) => void) {
				bucket.push(data);
				cb?.();
			},
			close() {},
		});

		const docWs = makeSocket(docSent);
		const recWs = makeSocket(recSent);

		wsBroker.addClient(docWs, orgId, undefined, true, undefined, "user-doc");
		wsBroker.addClient(recWs, orgId, undefined, "receptionist", undefined, "user-rec");

		try {
			wsBroker.broadcastToUser(orgId, "user-rec", {
				type: "NOTIFICATION",
				payload: { note: "Пациент с К04.0 пульпит зуба 16" },
			});
			wsBroker.broadcastToUser(orgId, "user-doc", {
				type: "CLINICAL_EMR_UPDATED",
				payload: { diagnosis: "K04.0 пульпит зуба 16" },
			});
			wsBroker.broadcastToUser(orgId, "user-rec", {
				type: "CLINICAL_EMR_UPDATED",
				payload: { diagnosis: "K04.0 пульпит зуба 16" },
			});

			assert.strictEqual(docSent.length, 1);
			assert.ok(docSent[0]?.includes("K04.0"));
			// Non-clinical user receives sanitized non-clinical notification and zero clinical events
			assert.strictEqual(recSent.length, 1);
			assert.ok(!recSent[0]?.includes("пульпит"));
		} finally {
			wsBroker.removeClient(docWs);
			wsBroker.removeClient(recWs);
		}
	});

	it(
		"[W15-SEC-06] CloudRelayClient removes mock-storage, avoids hardcoded prod secret, rejects clinic mismatch & strips admin headers",
		withSavedEnv(
			{
				NODE_ENV: "production",
				CLOUD_RELAY_TOKEN: undefined,
				EDGE_AUTH_TOKEN: undefined,
				PORT: undefined,
				API_PORT: undefined,
			},
			async () => {
				assert.strictEqual(isRouteAllowedForTunnel("/api/portal/mock-storage/file.jpg"), false);
				const cfg = loadCloudRelayConfigFromEnv();
				assert.strictEqual(cfg.authToken, "");
				assert.strictEqual(cfg.enabled, false);
				assert.strictEqual(cfg.localBaseUrl, "http://127.0.0.1:4100");

				let receivedAuthHeader: string | undefined;
				let receivedQuery: string | undefined;
				const httpServer: Server = createServer();
				const wss = new WebSocketServer({ noServer: true });
				let serverWs: WebSocket | null = null;

				httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
					receivedAuthHeader = req.headers.authorization;
					receivedQuery = req.url;
					wss.handleUpgrade(req, socket, head, (ws) => {
						serverWs = ws;
						wss.emit("connection", ws, req);
					});
				});

				await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
				const addr = httpServer.address();
				const port = typeof addr === "object" && addr ? addr.port : 0;

				const mockApp = Fastify({ logger: false });
				let capturedHeaders: Record<string, unknown> = {};
				mockApp.get("/api/portal/lab-order/:token", async (req) => {
					capturedHeaders = { ...req.headers };
					return { ok: true };
				});

				const client = new CloudRelayClient(
					{
						enabled: true,
						relayUrl: `ws://127.0.0.1:${port}/edge`,
						authToken: "secret-header-token",
						clinicId: "clinic-real",
					},
					mockApp,
				);

				try {
					client.start();
					const ws = await new Promise<WebSocket>((resolve) => {
						wss.on("connection", (socket) => resolve(socket));
					});

					assert.strictEqual(receivedAuthHeader, "Bearer secret-header-token");
					assert.ok(!receivedQuery?.includes("secret-header-token"));

					const responses: TunnelResponsePayload[] = [];
					ws.on("message", (raw) => {
						const msg = JSON.parse(raw.toString()) as TunnelResponsePayload;
						if (msg.type === "HTTP_RESPONSE") responses.push(msg);
					});

					const mismatchReq: TunnelRequestPayload = {
						type: "HTTP_REQUEST",
						id: "req-mismatch",
						clinicId: "clinic-other",
						method: "GET",
						url: "/api/portal/lab-order/t1",
						headers: {},
					};
					ws.send(JSON.stringify(mismatchReq));

					const injectReq: TunnelRequestPayload = {
						type: "HTTP_REQUEST",
						id: "req-headers",
						clinicId: "clinic-real",
						method: "GET",
						url: "/api/portal/lab-order/t1",
						headers: {
							"x-dente-admin-secret": "forged",
							"x-organization-id": "forged-org",
							accept: "application/json",
						},
					};
					ws.send(JSON.stringify(injectReq));

					await new Promise((r) => setTimeout(r, 80));

					const mismatchResp = responses.find((r) => r.id === "req-mismatch");
					assert.strictEqual(mismatchResp?.statusCode, 403);
					assert.strictEqual(capturedHeaders["x-dente-admin-secret"], undefined);
					assert.strictEqual(capturedHeaders["x-organization-id"], undefined);
				} finally {
					client.stop();
					if (serverWs) (serverWs as WebSocket).close();
					wss.close();
					await new Promise<void>((resolve) => httpServer.close(() => resolve()));
					await mockApp.close();
				}
			},
		),
	);

	it("[W15-SEC-07] withResilientTransaction does not retry poisoned nested transactions", async () => {
		let nestedAttempts = 0;
		const fakeOuterTx = {
			execute: async () => [],
			transaction: async <T>(cb: (tx: typeof fakeOuterTx) => Promise<T>): Promise<T> => {
				return cb(fakeOuterTx);
			},
		};

		await assert.rejects(
			() =>
				withResilientTransaction(
					fakeOuterTx as Parameters<typeof withResilientTransaction>[0],
					async () => {
						nestedAttempts++;
						throw Object.assign(new Error("serialization failure"), { code: "40001" });
					},
					{ maxRetries: 3, initialBackoffMs: 1, jitterMs: 0 },
				),
			/serialization failure/,
		);
		assert.strictEqual(nestedAttempts, 1);
	});

	it("[W15-SEC-10] roleHasPermissionWithOverrides respects overrides and enforces clinical separation for bare admin", () => {
		assert.strictEqual(roleHasPermissionWithOverrides("admin", "clinical.write", null), false);
		assert.strictEqual(roleHasPermissionWithOverrides("admin", "egisz.submit", null), false);
		assert.strictEqual(roleHasPermissionWithOverrides("admin", "settings.write", null), true);
		assert.strictEqual(
			roleHasPermissionWithOverrides("admin", "settings.write", {
				admin: { "settings.write": false },
			}),
			false,
		);
		assert.strictEqual(roleHasPermissionWithOverrides("owner", "clinical.write", null), true);
	});

	it("[W15-SEC-11] readWhatsappCredentials fails closed (returns null) when encrypted token cannot be decrypted", () => {
		const resMissingOrg = readWhatsappCredentials({
			phoneNumberId: "123456789",
			accessToken: "enc:v1:invalidciphertext",
			organizationId: null,
		});
		assert.strictEqual(resMissingOrg, null);

		const resCorrupt = readWhatsappCredentials({
			phoneNumberId: "123456789",
			accessToken: "enc:v1:corrupted-payload",
			organizationId: "11111111-1111-4111-8111-111111111111",
		});
		assert.strictEqual(resCorrupt, null);
	});
});
