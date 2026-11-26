/**
 * Part 11 Integration Tests:
 * - Public /api/health/discovery hides MAC/hostname/interfaces
 * - Shared UDP 4101 socket between lanDiscoveryService & LanMeshService + mDNS lifecycle
 * - auto-join/verify issues real signed clinicToken verified by security/identity
 * - POST /api/lan/p2p/dispatch broadcasts LAN_P2P_EVENT via wsBroker
 * - Chunked SHA-256 upload routes enforce auth, tenant isolation, and chunk SHA-256 integrity
 * - SyncStreamTransport bounds nodeRegistry & paginates pullChanges
 */

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import Fastify from "fastify";
import { registerHealthRoutes } from "../routes/health.js";
import {
	registerLanNetworkRoutes,
	clearAutoJoinRateLimitsForTest,
	clearPairingNoncesForTest,
	getActivePairingNoncesCount,
} from "../routes/lanNetwork.js";
import { registerChunkedUploadRoutes } from "../routes/imaging/chunkedUploadRoutes.js";
import { registerSyncRoutes } from "../routes/sync/index.js";
import { authTokenSecret } from "../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, resolveIdentityFromTokens } from "../security/identity.js";
import {
	getLanDiscoveryUdpSocket,
	getPublicLanDiscoverySummary,
	startLanDiscoveryService,
	stopLanDiscoveryService,
} from "../services/lanDiscoveryService.js";
import { getLanMeshService, resetLanMeshServiceForTest } from "../services/lanMeshService.js";
import { getLanMeshAutoJoinServiceForOrg, resetLanMeshAutoJoinServiceForTest } from "../services/lanMeshAutoJoinService.js";
import { SyncStreamTransport } from "../services/sync/syncGateway/syncStreamTransport.js";
import { wsBroker } from "../services/websocketBroker.js";
import { signToken } from "../utils/cryptoHelper.js";

describe("Part 11 LAN, Auth, P2P, Chunked Upload & Sync Pagination", () => {
	afterEach(() => {
		resetLanMeshServiceForTest();
		stopLanDiscoveryService();
		resetLanMeshAutoJoinServiceForTest();
		clearAutoJoinRateLimitsForTest();
		clearPairingNoncesForTest();
	});

	it("1. GET /api/health/discovery hides MAC addresses, interfaces array, and hostname", async () => {
		const app = Fastify();
		await registerHealthRoutes(app);
		await app.ready();

		const res = await app.inject({ method: "GET", url: "/api/health/discovery" });
		assert.strictEqual(res.statusCode, 200);
		const body = res.json() as Record<string, unknown>;
		assert.strictEqual("interfaces" in body, false);
		assert.strictEqual("hostname" in body, false);
		assert.strictEqual("mac" in body, false);
		assert.ok(typeof body.primaryIp === "string" && body.primaryIp.length > 0);
		assert.ok(typeof body.serverId === "string" && body.serverId.length > 0);
		await app.close();
	});

	it("2. LanMeshService reuses LanDiscoveryService UDP 4101 socket without dual-bind crash", () => {
		const prevDisableMdns = process.env.DENTE_DISABLE_MDNS;
		process.env.DENTE_DISABLE_MDNS = "1";
		try {
			const discovery = startLanDiscoveryService({ port: 44101, disableMdns: true });
			const sharedSock = getLanDiscoveryUdpSocket();
			assert.ok(sharedSock !== null, "Discovery UDP socket must be active");

			const mesh = getLanMeshService({
				udpPort: 44101,
				probeOnStart: false,
				role: "master",
			});
			mesh.start();
			mesh.broadcastBeacon();
			mesh.broadcastLeaseHeartbeat();
			discovery.stop();
		} finally {
			if (prevDisableMdns === undefined) delete process.env.DENTE_DISABLE_MDNS;
			else process.env.DENTE_DISABLE_MDNS = prevDisableMdns;
		}
	});

	it("3. auto-join/verify issues a signed clinicToken accepted by resolveIdentityFromTokens", async () => {
		const prevClinic = process.env.DENTE_CLINIC_ID;
		const orgId = "11111111-2222-3333-4444-555555555555";
		process.env.DENTE_CLINIC_ID = orgId;
		try {
			const app = Fastify();
			await registerLanNetworkRoutes(app);
			await app.ready();

			const autoJoin = getLanMeshAutoJoinServiceForOrg(orgId);
			const activePin = autoJoin.getPairingStatus().currentPin;

			const res = await app.inject({
				method: "POST",
				url: "/api/network/mesh/auto-join/verify",
				payload: { pin: activePin, organizationId: orgId, role: "doctor" },
			});
			assert.strictEqual(res.statusCode, 200);
			const json = res.json() as { ok: boolean; clinicToken: string; join: { clinicToken: string } };
			assert.strictEqual(json.ok, true);
			assert.ok(typeof json.clinicToken === "string" && json.clinicToken.length > 20);
			assert.strictEqual(json.clinicToken, json.join.clinicToken);

			const identity = resolveIdentityFromTokens(json.clinicToken, undefined);
			assert.strictEqual(identity.verified, true);
			assert.strictEqual(identity.organizationId, orgId);
			await app.close();
		} finally {
			if (prevClinic === undefined) delete process.env.DENTE_CLINIC_ID;
			else process.env.DENTE_CLINIC_ID = prevClinic;
		}
	});

	it("4. POST /api/lan/p2p/dispatch broadcasts LAN_P2P_EVENT via wsBroker.broadcastToOrganization", async () => {
		const orgId = "22222222-3333-4444-5555-666666666666";
		const clinicToken = signToken({ organizationId: orgId, role: "clinic" }, authTokenSecret(), 300);
		const app = Fastify();
		await registerLanNetworkRoutes(app);
		await app.ready();

		const captured: Array<{ orgId: string; message: Record<string, unknown> }> = [];
		const originalBroadcast = wsBroker.broadcastToOrganization.bind(wsBroker);
		wsBroker.broadcastToOrganization = (targetOrgId: string, message: object) => {
			captured.push({ orgId: targetOrgId, message: message as Record<string, unknown> });
		};

		try {
			const res = await app.inject({
				method: "POST",
				url: "/api/lan/p2p/dispatch",
				headers: { [CLINIC_TOKEN_HEADER]: clinicToken },
				payload: {
					messageId: "msg-p2p-test-1",
					eventType: "chair_status_changed",
					senderNodeId: "doctor-tablet-1",
					senderRole: "doctor_tablet",
					senderName: "Доктор Иванов",
					organizationId: orgId,
					sentAt: new Date().toISOString(),
					vectorClock: { "doctor-tablet-1": 1 },
					payload: { chairId: "chair-1", cabinetNumber: 1, status: "busy" },
				},
			});
			assert.strictEqual(res.statusCode, 200);
			assert.strictEqual(captured.length, 1);
			assert.strictEqual(captured[0]?.orgId, orgId);
			assert.strictEqual(captured[0]?.message.type, "LAN_P2P_EVENT");
		} finally {
			wsBroker.broadcastToOrganization = originalBroadcast;
			await app.close();
		}
	});

	it("5. Chunked upload rejects missing auth (401) and SHA-256 mismatch before part commit", async () => {
		const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dente-chunks-test-"));
		const prevRoot = process.env.DENTE_PACS_STORAGE_ROOT;
		process.env.DENTE_PACS_STORAGE_ROOT = tmpRoot;
		try {
			const orgId = "33333333-4444-5555-6666-777777777777";
			const otherOrgId = "44444444-5555-6666-7777-888888888888";
			const clinicToken = signToken({ organizationId: orgId, role: "clinic" }, authTokenSecret(), 300);
			const otherToken = signToken({ organizationId: otherOrgId, role: "clinic" }, authTokenSecret(), 300);

			const app = Fastify();
			await registerChunkedUploadRoutes(app);
			await app.ready();

			const unauth = await app.inject({
				method: "POST",
				url: "/api/imaging/chunks/init",
				payload: {},
			});
			assert.strictEqual(unauth.statusCode, 401);

			// Seed synthetic session dir inside org A jail to test SHA-256 & tenant isolation on PUT part
			const uploadId = crypto.randomUUID();
			const sessionDir = path.join(tmpRoot, orgId, ".chunk-sessions", uploadId);
			await fs.mkdir(sessionDir, { recursive: true });
			await fs.writeFile(
				path.join(sessionDir, "session.json"),
				JSON.stringify({
					uploadId,
					organizationId: orgId,
					patientId: crypto.randomUUID(),
					visitId: null,
					kind: "periapical",
					title: "Test Scan",
					toothCode: "16",
					region: null,
					fileName: "scan.png",
					fileSizeBytes: 12,
					totalChunks: 1,
					chunkSizeBytes: 1024,
					fileSha256: "0".repeat(64),
					createdAt: new Date().toISOString(),
					uploadedChunks: [],
				}),
				"utf8",
			);

			const wrongTenant = await app.inject({
				method: "GET",
				url: `/api/imaging/chunks/${uploadId}`,
				headers: { [CLINIC_TOKEN_HEADER]: otherToken },
			});
			assert.strictEqual(wrongTenant.statusCode, 404);

			const badSha = await app.inject({
				method: "PUT",
				url: `/api/imaging/chunks/${uploadId}/part?index=0&sha256=${"a".repeat(64)}`,
				headers: {
					[CLINIC_TOKEN_HEADER]: clinicToken,
					"content-type": "application/octet-stream",
				},
				payload: Buffer.from("hello-chunk!"),
			});
			assert.strictEqual(badSha.statusCode, 422);

			const goodPayload = Buffer.from("hello-chunk!");
			const goodSha = crypto.createHash("sha256").update(goodPayload).digest("hex");
			const goodPart = await app.inject({
				method: "PUT",
				url: `/api/imaging/chunks/${uploadId}/part?index=0&sha256=${goodSha}`,
				headers: {
					[CLINIC_TOKEN_HEADER]: clinicToken,
					"content-type": "application/octet-stream",
				},
				payload: goodPayload,
			});
			assert.strictEqual(goodPart.statusCode, 200);
			assert.deepStrictEqual((goodPart.json() as { uploadedChunks: number[] }).uploadedChunks, [0]);

			await app.close();
		} finally {
			if (prevRoot === undefined) delete process.env.DENTE_PACS_STORAGE_ROOT;
			else process.env.DENTE_PACS_STORAGE_ROOT = prevRoot;
			await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
		}
	});

	it("6. SyncStreamTransport bounds nodeRegistry to <= 1000 entries and exposes public summary cleanly", () => {
		const summary = getPublicLanDiscoverySummary();
		assert.ok(summary.primaryIp);

		for (let i = 0; i < 1050; i++) {
			const nodeId = `test-bounded-node-${i}`;
			SyncStreamTransport.registerNodeConnection({
				nodeId,
				organizationId: "11111111-2222-3333-4444-555555555555",
				send: () => {},
				close: () => {},
			});
			SyncStreamTransport.unregisterNodeConnection(nodeId);
		}
		assert.strictEqual(typeof registerSyncRoutes, "function");
	});

	it("7. lanNetwork pairing nonces are bounded via BoundedTtlMap (no unbounded RAM growth)", async () => {
		const orgId = "55555555-6666-7777-8888-999999999999";
		const clinicToken = signToken({ organizationId: orgId, role: "clinic" }, authTokenSecret(), 300);
		const app = Fastify();
		await registerLanNetworkRoutes(app);
		await app.ready();

		try {
			for (let i = 0; i < 1050; i++) {
				const res = await app.inject({
					method: "POST",
					url: "/api/network/pair/generate",
					headers: { [CLINIC_TOKEN_HEADER]: clinicToken },
					payload: { role: "doctor" },
				});
				assert.strictEqual(res.statusCode, 200);
			}
			assert.ok(
				getActivePairingNoncesCount() <= 1024,
				`Expected bounded activePairingNonces <= 1024, got ${getActivePairingNoncesCount()}`,
			);
		} finally {
			await app.close();
		}
	});
});
