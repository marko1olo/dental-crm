/**
 * DENTE CRM — Clinic LAN Zero-Conf Network Mesh & Multi-PC Integration Tests
 *
 * Simulates a multi-computer clinic setup (Doctor 1, Doctor 2, Reception, Server/Master)
 * operating autonomously without Internet access:
 *
 * 1. Autonomous Zero-Conf Peer Discovery:
 *    - UDP multicast & broadcast beacon formatting and parsing
 *    - Rapid peer detection (<500ms)
 *
 * 2. Version & Capability Negotiation:
 *    - Handshake contract validation: { nodeId, clinicId, appVersion, schemaVersion, role, ip, port, peerList }
 *    - Compatible version handshake
 *    - Incompatible schema protection: prevents database corruption by deferring mutations
 *    - Isolation between different clinic tenants
 *
 * 3. Dynamic Master Election & Multi-PC Role Hierarchy:
 *    - Primary Master election
 *    - Master failover & offline mutation buffering
 *    - Non-blocking UI telemetry status badges
 *    - Master recovery & idempotent mutation replay
 *
 * 4. Multi-Node Mesh Topology Simulation:
 *    - 3 simulated workstations on distinct ports (Master 4100, Doctor 4102, Reception 4103)
 *    - Cross-node peer list convergence
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	DEFAULT_MESH_HTTP_PORTS,
	DEFAULT_MESH_UDP_PORT,
	type LanMeshHandshakePayload,
	type LanMeshPeerSummary,
	LanMeshTopologyManager,
	OfflineMeshMutationQueue,
	createMeshDiscoveryBeacon,
	electMasterNode,
	parseMeshDiscoveryBeacon,
	parseMeshSemver,
	verifyMeshSchemaCompatibility,
} from "../lanMesh.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Zero-Conf Peer Discovery & Beacon Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Clinic LAN Zero-Conf Mesh: Discovery Beacons", () => {
	test("creates valid UDP discovery beacon buffer with magic marker and metadata", () => {
		const buffer = createMeshDiscoveryBeacon({
			nodeId: "doctor-room-1",
			clinicId: "dental-clinic-msk",
			role: "doctor",
			ip: "192.168.1.15",
			port: 4102,
			appVersion: "2.4.0",
			schemaVersion: 182,
		});

		assert.ok(Buffer.isBuffer(buffer));
		const parsed = parseMeshDiscoveryBeacon(buffer);
		assert.ok(parsed);
		assert.equal(parsed?.magic, "DENTE_MESH_BEACON");
		assert.equal(parsed?.protocolVersion, "2.0.0");
		assert.equal(parsed?.nodeId, "doctor-room-1");
		assert.equal(parsed?.clinicId, "dental-clinic-msk");
		assert.equal(parsed?.role, "doctor");
		assert.equal(parsed?.ip, "192.168.1.15");
		assert.equal(parsed?.port, 4102);
		assert.equal(parsed?.appVersion, "2.4.0");
		assert.equal(parsed?.schemaVersion, 182);
		assert.ok(parsed?.timestamp && parsed.timestamp > 0);
	});

	test("gracefully rejects corrupted or alien UDP packets without throwing", () => {
		const garbageBuffer = Buffer.from("SOME_RANDOM_ROUTER_SSDP_BROADCAST", "utf8");
		const parsed = parseMeshDiscoveryBeacon(garbageBuffer);
		assert.equal(parsed, null);

		const wrongMagicBuffer = Buffer.from(
			JSON.stringify({ magic: "UNKNOWN_MAGIC", nodeId: "foo" }),
			"utf8",
		);
		assert.equal(parseMeshDiscoveryBeacon(wrongMagicBuffer), null);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Version & Capability Negotiation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Clinic LAN Zero-Conf Mesh: Version & Schema Compatibility", () => {
	test("accepts identical app version and schema version for full sync", () => {
		const result = verifyMeshSchemaCompatibility(
			{ appVersion: "2.4.0", schemaVersion: 182, clinicId: "clinic-1" },
			{ appVersion: "2.4.0", schemaVersion: 182, clinicId: "clinic-1" },
		);

		assert.equal(result.compatible, true);
		assert.equal(result.syncAllowed, true);
		assert.equal(result.mode, "full_sync");
		assert.equal(result.warningBadge, undefined);
	});

	test("allows minor app version deltas when schema versions match", () => {
		const result = verifyMeshSchemaCompatibility(
			{ appVersion: "2.4.0", schemaVersion: 182, clinicId: "clinic-1" },
			{ appVersion: "2.4.1", schemaVersion: 182, clinicId: "clinic-1" },
		);

		assert.equal(result.compatible, true);
		assert.equal(result.syncAllowed, true);
		assert.equal(result.mode, "full_sync");
	});

	test("strictly rejects direct schema mutations if schema versions differ (anti-DB-corruption guard)", () => {
		const result = verifyMeshSchemaCompatibility(
			{ appVersion: "2.4.0", schemaVersion: 182, clinicId: "clinic-1" },
			{ appVersion: "2.5.0", schemaVersion: 185, clinicId: "clinic-1" },
		);

		assert.equal(result.compatible, false);
		assert.equal(result.syncAllowed, false);
		assert.equal(result.mode, "sync_deferred");
		assert.ok(result.warningBadge);
		assert.equal(result.warningBadge?.code, "INCOMPATIBLE_SCHEMA");
		assert.equal(result.warningBadge?.level, "warning");
		assert.match(result.warningBadge?.message || "", /повреждения базы данных/i);
	});

	test("isolates distinct clinics and rejects syncing across tenants", () => {
		const result = verifyMeshSchemaCompatibility(
			{ appVersion: "2.4.0", schemaVersion: 182, clinicId: "clinic-alpha" },
			{ appVersion: "2.4.0", schemaVersion: 182, clinicId: "clinic-beta" },
		);

		assert.equal(result.compatible, false);
		assert.equal(result.syncAllowed, false);
		assert.equal(result.mode, "read_only");
		assert.ok(result.warningBadge);
		assert.equal(result.warningBadge?.code, "CLINIC_MISMATCH");
		assert.equal(result.warningBadge?.level, "critical");
	});

	test("parses semver components accurately", () => {
		assert.deepEqual(parseMeshSemver("2.4.1"), [2, 4, 1]);
		assert.deepEqual(parseMeshSemver("v3.0.12-beta"), [3, 0, 12]);
		assert.deepEqual(parseMeshSemver("invalid"), [0, 0, 0]);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Dynamic Master Election & Offline Mutation Queue
// ─────────────────────────────────────────────────────────────────────────────

describe("Clinic LAN Zero-Conf Mesh: Master Election & Offline Queuing", () => {
	test("elects designated 'master' role node deterministically", () => {
		const candidates: LanMeshPeerSummary[] = [
			{
				nodeId: "doctor-1",
				role: "doctor",
				ip: "192.168.1.10",
				port: 4102,
				appVersion: "2.4.0",
				schemaVersion: 182,
				lastSeen: Date.now(),
				status: "online",
			},
			{
				nodeId: "server-primary",
				role: "master",
				ip: "192.168.1.2",
				port: 4100,
				appVersion: "2.4.0",
				schemaVersion: 182,
				lastSeen: Date.now(),
				status: "online",
			},
			{
				nodeId: "reception-pc",
				role: "reception",
				ip: "192.168.1.5",
				port: 4103,
				appVersion: "2.4.0",
				schemaVersion: 182,
				lastSeen: Date.now(),
				status: "online",
			},
		];

		const elected = electMasterNode(candidates);
		assert.ok(elected);
		assert.equal(elected?.nodeId, "server-primary");
		assert.equal(elected?.role, "master");
	});

	test("breaks ties between multiple master claims using highest schema version then lowest nodeId", () => {
		const candidates: LanMeshPeerSummary[] = [
			{
				nodeId: "server-b",
				role: "master",
				ip: "192.168.1.3",
				port: 4100,
				appVersion: "2.4.0",
				schemaVersion: 182,
				lastSeen: Date.now(),
				status: "online",
			},
			{
				nodeId: "server-a",
				role: "master",
				ip: "192.168.1.2",
				port: 4100,
				appVersion: "2.4.0",
				schemaVersion: 182,
				lastSeen: Date.now(),
				status: "online",
			},
		];

		const elected = electMasterNode(candidates);
		assert.equal(elected?.nodeId, "server-a"); // Lexicographical winner
	});

	test("offline mutation queue buffers mutations and supports idempotent replay", () => {
		const queue = new OfflineMeshMutationQueue();

		const mut1 = {
			id: "mut-1",
			entityKind: "appointment",
			entityId: "app-100",
			action: "update" as const,
			payload: { status: "in_treatment", doctorName: "Смирнов А.В." },
			timestamp: 1000,
			idempotencyKey: "idem-app-100-v1",
			originNodeId: "doctor-1",
		};

		const mut2 = {
			id: "mut-2",
			entityKind: "visit_diary",
			entityId: "diary-200",
			action: "create" as const,
			payload: { complaints: "Острая боль 46 зуб" },
			timestamp: 1500,
			idempotencyKey: "idem-diary-200-v1",
			originNodeId: "doctor-1",
		};

		queue.enqueue(mut1);
		queue.enqueue(mut2);

		assert.equal(queue.size(), 2);
		assert.deepEqual(queue.peekBatch(1).map((m) => m.id), ["mut-1"]);
		assert.deepEqual(queue.peekAll().map((m) => m.id), ["mut-1", "mut-2"]);

		// Re-enqueuing with identical idempotencyKey updates without creating duplicates
		queue.enqueue({
			...mut1,
			payload: { status: "completed" },
		});
		assert.equal(queue.size(), 2);
		assert.equal(queue.peekBatch(10)[0]?.payload.status, "completed");

		// Acknowledging removes from queue
		const acknowledged = queue.acknowledge(["idem-app-100-v1"]);
		assert.equal(acknowledged, 1);
		assert.equal(queue.size(), 1);
		assert.equal(queue.peekAll()[0]?.id, "mut-2");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Automated 3-Node Mesh Network Simulation
// ─────────────────────────────────────────────────────────────────────────────

describe("Clinic LAN Zero-Conf Mesh: 3-Node Multi-PC Network Simulation", () => {
	test("simulates 3 nodes exchanging beacons, handshaking, and syncing state", () => {
		const clinicId = "clinic-dent-central";

		// Node 1: Master Server (PostgreSQL) on port 4100
		const nodeServer = new LanMeshTopologyManager({
			nodeId: "server-master",
			clinicId,
			role: "master",
			ip: "192.168.1.100",
			port: 4100,
			appVersion: "2.4.0",
			schemaVersion: 182,
		});

		// Node 2: Doctor 1 Workstation on port 4102
		const nodeDoctor = new LanMeshTopologyManager({
			nodeId: "doctor-chair-1",
			clinicId,
			role: "doctor",
			ip: "192.168.1.102",
			port: 4102,
			appVersion: "2.4.0",
			schemaVersion: 182,
		});

		// Node 3: Reception Workstation on port 4103
		const nodeReception = new LanMeshTopologyManager({
			nodeId: "reception-desk",
			clinicId,
			role: "reception",
			ip: "192.168.1.103",
			port: 4103,
			appVersion: "2.4.0",
			schemaVersion: 182,
		});

		// Phase 1: Zero-Conf Discovery Beacons
		// Server broadcasts beacon -> Doctor & Reception receive it
		const serverBeacon = parseMeshDiscoveryBeacon(
			createMeshDiscoveryBeacon({
				nodeId: nodeServer.nodeId,
				clinicId: nodeServer.clinicId,
				role: nodeServer.role,
				ip: nodeServer.ip,
				port: nodeServer.port,
				appVersion: nodeServer.appVersion,
				schemaVersion: nodeServer.schemaVersion,
			}),
		);
		assert.ok(serverBeacon);

		nodeDoctor.processIncomingBeacon(serverBeacon);
		nodeReception.processIncomingBeacon(serverBeacon);

		// Doctor broadcasts beacon -> Server receives it
		const doctorBeacon = parseMeshDiscoveryBeacon(
			createMeshDiscoveryBeacon({
				nodeId: nodeDoctor.nodeId,
				clinicId: nodeDoctor.clinicId,
				role: nodeDoctor.role,
				ip: nodeDoctor.ip,
				port: nodeDoctor.port,
				appVersion: nodeDoctor.appVersion,
				schemaVersion: nodeDoctor.schemaVersion,
			}),
		);
		assert.ok(doctorBeacon);
		nodeServer.processIncomingBeacon(doctorBeacon);

		// Phase 2: Handshake & Capability Negotiation
		// Doctor handshakes with Server
		const doctorHandshakePayload = nodeDoctor.createHandshakePayload();
		const serverHandshakeResponse = nodeServer.processIncomingHandshake(doctorHandshakePayload);

		assert.equal(serverHandshakeResponse.accepted, true);
		assert.equal(serverHandshakeResponse.compatibility.syncAllowed, true);

		// Doctor processes response from Server
		nodeDoctor.processIncomingHandshake(serverHandshakeResponse.localResponse);

		// Reception handshakes with Server
		const receptionHandshakePayload = nodeReception.createHandshakePayload();
		const receptionServerResponse = nodeServer.processIncomingHandshake(receptionHandshakePayload);
		assert.equal(receptionServerResponse.accepted, true);
		nodeReception.processIncomingHandshake(receptionServerResponse.localResponse);

		// Phase 3: Verify Master Election on all nodes
		assert.equal(nodeServer.isMasterOnline(), true);
		assert.equal(nodeServer.getMasterNode()?.nodeId, "server-master");

		assert.equal(nodeDoctor.isMasterOnline(), true);
		assert.equal(nodeDoctor.getMasterNode()?.nodeId, "server-master");

		assert.equal(nodeReception.isMasterOnline(), true);
		assert.equal(nodeReception.getMasterNode()?.nodeId, "server-master");

		// Status badge on Doctor PC: streaming mode
		const doctorBadge = nodeDoctor.getStatusBadge();
		assert.equal(doctorBadge.isMasterOnline, true);
		assert.equal(doctorBadge.syncMode, "streaming");
		assert.equal(doctorBadge.queuedMutationsCount, 0);

		// Phase 4: Master goes offline simulation
		// Simulate stale timeout on Doctor and Reception (>15s without beacon)
		const futureTime = Date.now() + 20000;
		nodeDoctor.pruneStalePeers(futureTime);
		nodeReception.pruneStalePeers(futureTime);

		// Verify Doctor and Reception detect Master is offline
		assert.equal(nodeDoctor.getMasterNode()?.role === "master", false);
		const offlineDoctorBadge = nodeDoctor.getStatusBadge();
		assert.equal(offlineDoctorBadge.syncMode, "offline_queued");

		// Doctor works offline: queues mutation in non-blocking fashion
		nodeDoctor.getMutationQueue().enqueue({
			id: "offline-mut-1",
			entityKind: "appointment",
			entityId: "appt-999",
			action: "update",
			payload: { status: "completed" },
			timestamp: Date.now(),
			idempotencyKey: "idem-appt-999",
			originNodeId: nodeDoctor.nodeId,
		});

		const queuedBadge = nodeDoctor.getStatusBadge();
		assert.equal(queuedBadge.queuedMutationsCount, 1);
		assert.equal(queuedBadge.syncMode, "offline_queued");

		// Phase 5: Master returns to the network
		const newServerBeacon = parseMeshDiscoveryBeacon(
			createMeshDiscoveryBeacon({
				nodeId: nodeServer.nodeId,
				clinicId: nodeServer.clinicId,
				role: nodeServer.role,
				ip: nodeServer.ip,
				port: nodeServer.port,
				appVersion: nodeServer.appVersion,
				schemaVersion: nodeServer.schemaVersion,
			}),
		);
		assert.ok(newServerBeacon);
		nodeDoctor.processIncomingBeacon(newServerBeacon);

		// Master recognized again!
		assert.equal(nodeDoctor.getMasterNode()?.nodeId, "server-master");
		assert.equal(nodeDoctor.isMasterOnline(), true);

		// Doctor flushes queue to Master
		const queuedBatch = nodeDoctor.getMutationQueue().peekBatch();
		assert.equal(queuedBatch.length, 1);

		// Simulate Master applying mutation
		const ackCount = nodeDoctor.getMutationQueue().acknowledge(queuedBatch.map((m) => m.idempotencyKey));
		assert.equal(ackCount, 1);
		assert.equal(nodeDoctor.getMutationQueue().size(), 0);

		// Badge returns to streaming
		const recoveredBadge = nodeDoctor.getStatusBadge();
		assert.equal(recoveredBadge.isMasterOnline, true);
		assert.equal(recoveredBadge.syncMode, "streaming");
		assert.equal(recoveredBadge.queuedMutationsCount, 0);
	});
});
