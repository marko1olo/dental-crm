/**
 * DENTE Dental CRM — Unit & Pen-Tests for LAN Discovery & QR Pairing Routes
 *
 * Verifies:
 * 1. GET /api/network/ping: Heartbeat connectivity
 * 2. GET /api/network/lan-info: Guest protection (no doctor tokens handed out without auth)
 * 3. GET /api/network/lan-info: Authenticated session issues valid pairing token & 4-digit PIN
 * 4. POST /api/network/pair/generate: Rejects unauthenticated requests with 401
 * 5. POST /api/network/pair/generate: Validates targetIp against local physical LAN adapters
 * 6. POST /api/network/pair/verify: Validates token and PIN correctly
 * 7. POST /api/network/pair/verify: Anti-Replay Single-Use Guarantee (second verification fails with 401)
 * 8. POST /api/network/pair/verify: Rejects mismatched verification PIN with 401
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import Fastify from "fastify";
import {
	registerLanNetworkRoutes,
	clearPairingNoncesForTest,
	clearAutoJoinRateLimitsForTest,
	getActivePairingNoncesCount,
} from "../routes/lanNetwork.js";
import {
	hasLanMeshAutoJoinServiceForOrg,
	resetLanMeshAutoJoinServiceForTest,
} from "../services/lanMeshAutoJoinService.js";
import { authTokenSecret } from "../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";

describe("LAN Discovery & Tablet QR Pairing Security Routes", () => {
	let app: ReturnType<typeof Fastify>;
	const testOrgId = "11111111-2222-3333-4444-555555555555";
	let validClinicToken: string;

	beforeEach(async () => {
		clearPairingNoncesForTest();
		clearAutoJoinRateLimitsForTest();
		resetLanMeshAutoJoinServiceForTest();
		app = Fastify();
		await registerLanNetworkRoutes(app);
		await app.ready();

		validClinicToken = signToken(
			{
				organizationId: testOrgId,
				role: "clinic",
				pairedDevice: "Server Main Console",
			},
			authTokenSecret(),
			3600,
		);
	});

	it("1. GET /api/network/ping returns ultra-lightweight heartbeat", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/network/ping",
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.ok, true);
		assert.strictEqual(json.service, "dental-crm-lan");
		assert.ok(json.time);
	});

	it("2. GET /api/network/lan-info: unauthenticated guest receives topology but ZERO pairing tokens (Guest CVSS 9.8 Fix)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/network/lan-info",
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.ok, true);
		assert.strictEqual(json.requiresAuth, true);
		assert.strictEqual(json.pairingToken, null, "Guest MUST NOT receive pairingToken");
		assert.strictEqual(json.pairingUrl, null, "Guest MUST NOT receive pairingUrl");
		assert.strictEqual(json.pairingPin, null, "Guest MUST NOT receive pairingPin");
		assert.ok(json.primaryIp);
		assert.ok(Array.isArray(json.lanAddresses));
		assert.ok(Array.isArray(json.interfaces));
	});

	it("3. GET /api/network/lan-info: authenticated clinic PC receives signed token, URL and 4-digit PIN", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/network/lan-info",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.ok, true);
		assert.strictEqual(json.requiresAuth, false);
		assert.ok(typeof json.pairingToken === "string" && json.pairingToken.length > 20);
		assert.ok(typeof json.pairingUrl === "string" && json.pairingUrl.includes("pair="));
		assert.ok(/^\d{4}$/.test(json.pairingPin), `PIN must be 4 digits, got: ${json.pairingPin}`);
		assert.strictEqual(json.pairingRole, "doctor");
		assert.strictEqual(getActivePairingNoncesCount(), 1);
	});

	it("4. POST /api/network/pair/generate: rejects unauthenticated requests with 401", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/network/pair/generate",
			payload: {
				role: "doctor",
			},
		});

		assert.strictEqual(res.statusCode, 401);
		const json = res.json();
		assert.strictEqual(json.error, "Unauthorized");
	});

	it("5. POST /api/network/pair/generate: validates targetIp against physical LAN interfaces (anti-SSRF/open-redirect)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/network/pair/generate",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
			payload: {
				role: "assistant",
				targetIp: "8.8.8.8", // Fake / spoofed foreign IP
			},
		});

		assert.strictEqual(res.statusCode, 400);
		const json = res.json();
		assert.strictEqual(json.error, "InvalidTargetIp");
	});

	it("6. POST /api/network/pair/generate & /pair/verify: issues role token and grants session", async () => {
		const genRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/generate",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
			payload: {
				role: "assistant",
			},
		});

		assert.strictEqual(genRes.statusCode, 200);
		const genJson = genRes.json();
		assert.strictEqual(genJson.ok, true);
		assert.strictEqual(genJson.role, "assistant");
		assert.ok(genJson.pairingToken);
		assert.ok(/^\d{4}$/.test(genJson.pairingPin));

		const verifyRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/verify",
			payload: {
				token: genJson.pairingToken,
				pin: genJson.pairingPin,
				deviceName: "iPad Assistant Dental 1",
			},
		});

		assert.strictEqual(verifyRes.statusCode, 200);
		const verifyJson = verifyRes.json();
		assert.strictEqual(verifyJson.ok, true);
		assert.strictEqual(verifyJson.role, "assistant");
		assert.strictEqual(verifyJson.organizationId, testOrgId);
		assert.ok(verifyJson.clinicToken);
	});

	it("7. POST /api/network/pair/verify: Anti-Replay Single-Use Guarantee (second verification fails)", async () => {
		// 1. Generate pairing token
		const genRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/generate",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
			payload: {
				role: "doctor",
			},
		});
		assert.strictEqual(genRes.statusCode, 200);
		const genJson = genRes.json();

		// 2. First verification succeeds and consumes nonce
		const firstVerify = await app.inject({
			method: "POST",
			url: "/api/network/pair/verify",
			payload: {
				token: genJson.pairingToken,
				pin: genJson.pairingPin,
			},
		});
		assert.strictEqual(firstVerify.statusCode, 200);

		// 3. Replay attack: second verification with the EXACT SAME token MUST fail
		const secondVerify = await app.inject({
			method: "POST",
			url: "/api/network/pair/verify",
			payload: {
				token: genJson.pairingToken,
				pin: genJson.pairingPin,
			},
		});
		assert.strictEqual(secondVerify.statusCode, 401);
		const errJson = secondVerify.json();
		assert.strictEqual(errJson.error, "PairingTokenExpiredOrUsed");
	});

	it("8. POST /api/network/pair/verify: rejects invalid PIN with 401", async () => {
		const genRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/generate",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
			payload: {
				role: "doctor",
			},
		});
		const genJson = genRes.json();

		const wrongPinRes = await app.inject({
			method: "POST",
			url: "/api/network/pair/verify",
			payload: {
				token: genJson.pairingToken,
				pin: "0000", // Wrong PIN
			},
		});
		assert.strictEqual(wrongPinRes.statusCode, 401);
		const errJson = wrongPinRes.json();
		assert.strictEqual(errJson.error, "InvalidPairingPin");
	});

	it("9. GET /api/network/lan-mesh/handshake: requires auth and returns local node info", async () => {
		const unauth = await app.inject({
			method: "GET",
			url: "/api/network/lan-mesh/handshake",
		});
		assert.ok(unauth.statusCode === 401 || unauth.statusCode === 403 || unauth.statusCode === 503);

		const res = await app.inject({
			method: "GET",
			url: "/api/network/lan-mesh/handshake",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.ok, true);
		assert.ok(json.nodeId);
		assert.ok(json.clinicId);
		assert.ok(json.role);
		assert.ok(json.appVersion);
		assert.ok(json.schemaVersion !== undefined);
	});

	it("10. POST /api/network/lan-mesh/handshake: negotiates capabilities and returns compatibility", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/network/lan-mesh/handshake",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
			payload: {
				nodeId: "remote-doctor-2",
				clinicId: "clinic-default",
				appVersion: "2.4.0",
				schemaVersion: 182,
				role: "doctor",
				ip: "192.168.1.55",
				port: 4105,
				peerList: [],
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.ok, true);
		assert.strictEqual(json.compatibility.compatible, true);
		assert.strictEqual(json.compatibility.syncAllowed, true);
		assert.strictEqual(json.compatibility.mode, "full_sync");
		assert.ok(json.handshake);
	});

	it("11. GET /api/network/lan-mesh/status: returns topology status badge", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/network/lan-mesh/status",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.ok, true);
		assert.ok(json.localNode);
		assert.ok(json.statusBadge);
		assert.ok(["streaming", "offline_queued", "sync_deferred", "read_only"].includes(json.statusBadge.syncMode));
	});

	it("12. POST /api/network/lan-mesh/mutations: rejects unauthenticated and applies authenticated mutation batch", async () => {
		const unauth = await app.inject({
			method: "POST",
			url: "/api/network/lan-mesh/mutations",
			payload: { mutations: [] },
		});
		assert.ok(unauth.statusCode === 401 || unauth.statusCode === 403 || unauth.statusCode === 503);

		const res = await app.inject({
			method: "POST",
			url: "/api/network/lan-mesh/mutations",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
			payload: {
				mutations: [
					{
						id: "mut-batch-1",
						entityKind: "appointment",
						entityId: "app-300",
						action: "update",
						payload: { status: "confirmed" },
						timestamp: Date.now(),
						idempotencyKey: `idem-batch-${Date.now()}`,
						originNodeId: "doctor-remote",
					},
				],
			},
		});

		// Синтетический testOrgId не заведён в organizations: SyncGatewayService честно
		// отклоняет мутацию в PG18 (`rejectedCount: 1, ok: false`), а при недоступности БД
		// роут возвращает честный 503 (`persisted: false`), не маскируя сбой под 200 ok:true.
		const json = res.json();
		if (res.statusCode === 503) {
			assert.strictEqual(json.ok, false);
			assert.strictEqual(json.persisted, false);
			assert.strictEqual(json.queuedInMemory, true);
			assert.strictEqual(json.rejectedCount, 1);
		} else {
			assert.strictEqual(res.statusCode, 200);
			assert.strictEqual(json.persisted, true);
			assert.strictEqual(json.processedCount, 1);
			assert.strictEqual(json.ok, false);
			assert.strictEqual(json.appliedCount, 0);
			assert.strictEqual(json.rejectedCount, 1);
		}
	});

	it("13. POST /api/sync/mesh/exchange: blocks cross-tenant orgId and processes valid P2P mesh exchange", async () => {
		const crossTenantRes = await app.inject({
			method: "POST",
			url: "/api/sync/mesh/exchange",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
			payload: {
				exchangeId: `exch-cross-${Date.now()}`,
				senderNodeId: "tablet-dr-ivanov",
				senderRole: "doctor_tablet",
				senderVectorClock: { "tablet-dr-ivanov": 1 },
				mutations: [],
				sentAt: new Date().toISOString(),
				organizationId: "99999999-9999-4999-8999-999999999999",
			},
		});
		assert.strictEqual(crossTenantRes.statusCode, 403);

		const payloadData = { status: "in_treatment" };
		const res = await app.inject({
			method: "POST",
			url: "/api/sync/mesh/exchange",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
			payload: {
				exchangeId: `exch-${Date.now()}`,
				senderNodeId: "tablet-dr-ivanov",
				senderRole: "doctor_tablet",
				senderVectorClock: { "tablet-dr-ivanov": 3 },
				mutations: [
					{
						mutationId: "mut-p2p-1",
						idempotencyKey: `idem-p2p-${Date.now()}`,
						payloadHash: "0123456789abcdef0123456789abcdef",
						entityKind: "appointment",
						entityId: "app-p2p-101",
						action: "update",
						payload: payloadData,
						updatedAt: new Date().toISOString(),
						clientId: "tablet-dr-ivanov",
					},
				],
				sentAt: new Date().toISOString(),
				organizationId: testOrgId,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.ok(json.exchangeId);
		assert.ok(json.responderNodeId);
		assert.ok(json.responderVectorClock);
		assert.strictEqual(json.processedMutationsCount, 1);
		assert.strictEqual(typeof json.appliedMutationsCount, "number");
		assert.ok(Array.isArray(json.results));
	});

	it("14. POST /api/lan/p2p/dispatch: dispatches peer-to-peer event with clinic auth", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/lan/p2p/dispatch",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
			payload: {
				messageId: `p2p-msg-${Date.now()}`,
				eventType: "chair_status_changed",
				senderNodeId: "workstation-cabinet-1",
				senderRole: "reception_workstation",
				senderName: "Ресепшн 1",
				organizationId: testOrgId,
				sentAt: new Date().toISOString(),
				payload: { chairId: "chair-1", status: "patient_seated" },
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.ok, true);
		assert.strictEqual(json.eventType, "chair_status_changed");
		assert.ok(json.messageId);
		assert.ok(json.receivedAt);
	});

	it("15. POST /api/network/mesh/auto-join/verify rejects unauthenticated arbitrary organizationId without instantiating tenant service", async () => {
		const arbitraryOrgId = "99999999-8888-4777-8666-555555555555";
		const res = await app.inject({
			method: "POST",
			url: "/api/network/mesh/auto-join/verify",
			payload: {
				pin: "123456",
				organizationId: arbitraryOrgId,
			},
		});

		assert.strictEqual(res.statusCode, 403);
		const json = res.json();
		assert.strictEqual(json.ok, false);
		assert.strictEqual(json.error, "AutoJoinOrganizationNotActive");
		assert.strictEqual(hasLanMeshAutoJoinServiceForOrg(arbitraryOrgId), false);
	});

	it("16. POST /api/network/mesh/auto-join/verify allows LAN tablet join after clinic activates pairing status", async () => {
		const statusRes = await app.inject({
			method: "GET",
			url: "/api/network/mesh/auto-join/status",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
		});
		assert.strictEqual(statusRes.statusCode, 200);
		const activePin = statusRes.json().status.currentPin as string;
		assert.match(activePin, /^\d{6}$/);

		const joinRes = await app.inject({
			method: "POST",
			url: "/api/network/mesh/auto-join/verify",
			payload: {
				pin: activePin,
				organizationId: testOrgId,
				nodeId: "tablet-cabinet-2",
				clientName: "iPad Врача 2",
				role: "doctor",
			},
		});
		assert.strictEqual(joinRes.statusCode, 200);
		const joinJson = joinRes.json();
		assert.strictEqual(joinJson.ok, true);
		assert.strictEqual(joinJson.join.success, true);
		assert.strictEqual(joinJson.join.clinicId, testOrgId);
		assert.ok(joinJson.join.meshToken);
	});

	it("17. POST /api/network/mesh/auto-join/verify rate-limits PIN brute force (429 + Retry-After)", async () => {
		const statusRes = await app.inject({
			method: "GET",
			url: "/api/network/mesh/auto-join/status",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
		});
		const activePin = statusRes.json().status.currentPin as string;
		const wrongPin = activePin === "000000" ? "111111" : "000000";

		for (let i = 0; i < 4; i++) {
			const failRes = await app.inject({
				method: "POST",
				url: "/api/network/mesh/auto-join/verify",
				payload: { pin: wrongPin, organizationId: testOrgId },
			});
			assert.strictEqual(failRes.statusCode, 403);
		}

		// 5th invalid attempt triggers 429 RATE_LIMITED
		const lockRes = await app.inject({
			method: "POST",
			url: "/api/network/mesh/auto-join/verify",
			payload: { pin: wrongPin, organizationId: testOrgId },
		});
		assert.strictEqual(lockRes.statusCode, 429);
		assert.strictEqual(lockRes.json().error, "RATE_LIMITED");
		assert.ok(lockRes.headers["retry-after"]);

		// Correct PIN is also blocked while locked out
		const blockedCorrectRes = await app.inject({
			method: "POST",
			url: "/api/network/mesh/auto-join/verify",
			payload: { pin: activePin, organizationId: testOrgId },
		});
		assert.strictEqual(blockedCorrectRes.statusCode, 429);
		assert.strictEqual(blockedCorrectRes.json().error, "RATE_LIMITED");
	});

	it("18. POST /api/network/mesh/auto-join/verify rate-limits enumeration across arbitrary organizationIds", async () => {
		for (let i = 1; i <= 4; i++) {
			const res = await app.inject({
				method: "POST",
				url: "/api/network/mesh/auto-join/verify",
				payload: {
					pin: "123456",
					organizationId: `99999999-8888-4777-8666-55555555550${i}`,
				},
			});
			assert.strictEqual(res.statusCode, 403);
		}

		const lockedRes = await app.inject({
			method: "POST",
			url: "/api/network/mesh/auto-join/verify",
			payload: {
				pin: "123456",
				organizationId: "99999999-8888-4777-8666-555555555509",
			},
		});
		assert.strictEqual(lockedRes.statusCode, 429);
		assert.strictEqual(lockedRes.json().error, "RATE_LIMITED");
		assert.ok(lockedRes.headers["retry-after"]);
	});

	it("19. POST /api/network/mesh/auto-join/verify rejects authenticated cross-tenant organizationId mismatch with 403", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/network/mesh/auto-join/verify",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
			payload: {
				pin: "123456",
				organizationId: "88888888-7777-4666-8555-444444444444",
			},
		});
		assert.strictEqual(res.statusCode, 403);
		assert.strictEqual(res.json().error, "Forbidden");
	});
});
