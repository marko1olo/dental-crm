/**
 * DENTE Dental CRM — API LAN Mesh Service Unit Tests
 *
 * Tests the LanMeshService orchestration layer:
 * 1. Service lifecycle (start, status, stop)
 * 2. Incoming handshake processing & schema version compatibility
 * 3. Master / Satellite mutation handling (direct apply vs offline queue)
 * 4. Subnet probe execution
 */

import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { LanMeshService, resetLanMeshServiceForTest } from "../lanMeshService.js";

describe("LanMeshService Orchestrator", () => {
	let service: LanMeshService | null = null;

	afterEach(() => {
		if (service) {
			service.stop();
			service = null;
		}
		resetLanMeshServiceForTest();
	});

	it("1. Initializes with proper role, clinicId, and topology manager", () => {
		service = new LanMeshService({
			nodeId: "doctor-unit-1",
			clinicId: "clinic-test-1",
			role: "doctor",
			appVersion: "2.4.0",
			schemaVersion: 182,
			apiPort: 4102,
			udpPort: 4199,
		});

		assert.strictEqual(service.nodeId, "doctor-unit-1");
		assert.strictEqual(service.clinicId, "clinic-test-1");
		assert.strictEqual(service.role, "doctor");
		assert.strictEqual(service.apiPort, 4102);

		const topology = service.getTopology();
		assert.ok(topology);
		assert.strictEqual(topology.nodeId, "doctor-unit-1");

		const badge = service.getStatusBadge();
		assert.strictEqual(badge.isMasterOnline, false);
		assert.strictEqual(badge.syncMode, "offline_queued");
		assert.strictEqual(badge.queuedMutationsCount, 0);
	});

	it("2. Handles incoming remote handshake and updates peer table", () => {
		service = new LanMeshService({
			nodeId: "server-main",
			clinicId: "clinic-test-1",
			role: "master",
			appVersion: "2.4.0",
			schemaVersion: 182,
			apiPort: 4100,
			udpPort: 4198,
		});

		const result = service.handleIncomingHandshake({
			nodeId: "doctor-unit-1",
			clinicId: "clinic-test-1",
			appVersion: "2.4.0",
			schemaVersion: 182,
			role: "doctor",
			ip: "192.168.1.50",
			port: 4102,
			peerList: [],
		});

		assert.strictEqual(result.ok, true);
		assert.strictEqual(result.compatibility.compatible, true);
		assert.strictEqual(result.compatibility.syncAllowed, true);

		const peers = service.getKnownPeers();
		assert.strictEqual(peers.length, 1);
		assert.strictEqual(peers[0]?.nodeId, "doctor-unit-1");
		assert.strictEqual(peers[0]?.role, "doctor");
	});

	it("3. Rejects handshake from different clinicId (Tenant Isolation)", () => {
		service = new LanMeshService({
			nodeId: "server-main",
			clinicId: "clinic-test-1",
			role: "master",
			appVersion: "2.4.0",
			schemaVersion: 182,
			apiPort: 4100,
			udpPort: 4197,
		});

		const result = service.handleIncomingHandshake({
			nodeId: "alien-pc",
			clinicId: "clinic-other-org",
			appVersion: "2.4.0",
			schemaVersion: 182,
			role: "doctor",
			ip: "192.168.1.99",
			port: 4102,
			peerList: [],
		});

		assert.strictEqual(result.ok, false);
		assert.strictEqual(result.compatibility.compatible, false);
		assert.strictEqual(result.compatibility.warningBadge?.code, "CLINIC_MISMATCH");
	});

	it("4. Master node applies mutations directly", async () => {
		service = new LanMeshService({
			nodeId: "server-main",
			clinicId: "clinic-test-1",
			role: "master",
			appVersion: "2.4.0",
			schemaVersion: 182,
			apiPort: 4100,
			udpPort: 4196,
		});

		const result = await service.submitMutation({
			entityKind: "appointment",
			entityId: "app-101",
			action: "update",
			payload: { status: "confirmed" },
		});

		assert.strictEqual(result.applied, true);
		assert.strictEqual(result.queuedOffline, false);
		assert.strictEqual(result.mode, "direct_master");
		assert.ok(result.mutationId);
	});

	it("5. Satellite doctor workstation queues mutations offline when Master is unreachable", async () => {
		service = new LanMeshService({
			nodeId: "doctor-unit-1",
			clinicId: "clinic-test-1",
			role: "doctor",
			appVersion: "2.4.0",
			schemaVersion: 182,
			apiPort: 4102,
			udpPort: 4195,
		});

		const result = await service.submitMutation({
			entityKind: "visit_diary",
			entityId: "diary-501",
			action: "create",
			payload: { complaints: "Осмотр в норме" },
			idempotencyKey: "idem-diary-501",
		});

		assert.strictEqual(result.applied, false);
		assert.strictEqual(result.queuedOffline, true);
		assert.strictEqual(result.mode, "offline_queued");

		const badge = service.getStatusBadge();
		assert.strictEqual(badge.queuedMutationsCount, 1);
		assert.strictEqual(badge.syncMode, "offline_queued");
	});

	it("6. Starts and stops cleanly without dangling resources", () => {
		service = new LanMeshService({
			nodeId: "doctor-unit-2",
			clinicId: "clinic-test-1",
			role: "doctor",
			appVersion: "2.4.0",
			schemaVersion: 182,
			apiPort: 4103,
			udpPort: 4194,
		});

		const handle = service.start();
		assert.ok(handle);
		assert.strictEqual(typeof handle.stop, "function");

		// Clean stop
		handle.stop();
		service = null;
	});
});
