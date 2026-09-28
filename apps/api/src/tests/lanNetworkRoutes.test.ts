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
	getActivePairingNoncesCount,
} from "../routes/lanNetwork.js";
import { authTokenSecret } from "../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";

describe("LAN Discovery & Tablet QR Pairing Security Routes", () => {
	let app: ReturnType<typeof Fastify>;
	const testOrgId = "11111111-2222-3333-4444-555555555555";
	let validClinicToken: string;

	beforeEach(async () => {
		clearPairingNoncesForTest();
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

	it("9. GET /api/network/lan-mesh/handshake: fast HTTP probe returns local node info", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/network/lan-mesh/handshake",
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
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.ok, true);
		assert.ok(json.localNode);
		assert.ok(json.statusBadge);
		assert.ok(["streaming", "offline_queued", "sync_deferred", "read_only"].includes(json.statusBadge.syncMode));
	});

	it("12. POST /api/network/lan-mesh/mutations: applies mutation batch", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/network/lan-mesh/mutations",
			payload: {
				mutations: [
					{
						id: "mut-batch-1",
						entityKind: "appointment",
						entityId: "app-300",
						action: "update",
						payload: { status: "confirmed" },
						timestamp: Date.now(),
						idempotencyKey: "idem-batch-1",
						originNodeId: "doctor-remote",
					},
				],
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.ok, true);
		assert.strictEqual(json.appliedCount, 1);
	});
});
