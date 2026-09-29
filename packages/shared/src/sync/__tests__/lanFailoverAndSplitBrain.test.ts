/**
 * DENTE CRM — Multi-PC Clinic LAN Mesh Failover & Split-Brain Resilience Test Suite
 *
 * Machine verification of:
 * 1. Cryptographic Master Lease Heartbeats & Tampering Rejection
 * 2. 2-Missed-Heartbeat (10s) Dynamic Failover & Consensus Election (Highest Schema + Lowest NodeId)
 * 3. Satellite Local Mutation Ring Buffer (Zero Disruption, O(1) Idempotency, FIFO Eviction)
 * 4. Split-Brain Re-convergence via Deterministic CRDT Laws:
 *    - Somatic allergies & medical alerts: Union merge (never drop life-critical allergies)
 *    - Odontogram: Per-surface Last-Write-Wins (LWW) with millisecond timestamps
 *    - Clinical diary notes: Chronological append with doctor digital signatures ([ЭЦП])
 * 5. Full End-to-End Multi-PC Clinic Partition & Split-Brain Healing Simulation
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_LEASE_FAILOVER_TIMEOUT_MS,
	DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS,
	LanMeshTopologyManager,
	LocalMutationRingBuffer,
	type MasterLeaseHeartbeat,
	type QueuedMeshMutation,
	VectorClockEngine,
	compareEntityVectors,
	createMasterLeaseHeartbeat,
	createMeshLeaseHeartbeatPacket,
	electConsensusMasterNode,
	mergeClinicalDiaryChronological,
	mergeOdontogramToothPerSurface,
	parseMeshLeaseHeartbeatPacket,
	reconcileSplitBrainEntity,
	unionMergeSomaticAllergies,
	verifyMasterLeaseHeartbeat,
} from "../index.js";

describe("1. Dynamic Master Lease & Heartbeat Failover", () => {
	const clinicId = "clinic-alpha-77";
	const leaseSecret = "secret-clinic-key-2026";

	it("1.1. Generates valid HMAC-SHA256 signed lease heartbeat with required fields", () => {
		const now = Date.now();
		const lease = createMasterLeaseHeartbeat({
			masterNodeId: "reception-pc",
			clinicId,
			term: 1,
			schemaVersion: 182,
			appVersion: "2.4.0",
			secret: leaseSecret,
			issuedAt: now,
			leaseDurationMs: 5000,
		});

		assert.ok(lease.leaseId);
		assert.strictEqual(lease.masterNodeId, "reception-pc");
		assert.strictEqual(lease.clinicId, clinicId);
		assert.strictEqual(lease.term, 1);
		assert.strictEqual(lease.schemaVersion, 182);
		assert.strictEqual(lease.issuedAt, now);
		assert.strictEqual(lease.expiresAt, now + 5000);
		assert.ok(lease.signature.length >= 32);

		const verification = verifyMasterLeaseHeartbeat(lease, {
			secret: leaseSecret,
			expectedClinicId: clinicId,
			now: now + 1000,
		});

		assert.strictEqual(verification.valid, true);
		assert.strictEqual(verification.reason, undefined);
	});

	it("1.2. Strictly rejects tampered lease heartbeats (signature mismatch)", () => {
		const now = Date.now();
		const lease = createMasterLeaseHeartbeat({
			masterNodeId: "reception-pc",
			clinicId,
			term: 1,
			schemaVersion: 182,
			appVersion: "2.4.0",
			secret: leaseSecret,
			issuedAt: now,
		});

		// Tampering attack: rogue satellite elevates term or changes masterNodeId
		const tampered: MasterLeaseHeartbeat = {
			...lease,
			term: 99, // Tampered term
		};

		const verification = verifyMasterLeaseHeartbeat(tampered, {
			secret: leaseSecret,
			expectedClinicId: clinicId,
			now,
		});

		assert.strictEqual(verification.valid, false);
		assert.match(verification.reason || "", /invalid cryptographic lease signature/i);
	});

	it("1.3. Strictly rejects leases signed with an alien clinic key (tenant isolation)", () => {
		const now = Date.now();
		const lease = createMasterLeaseHeartbeat({
			masterNodeId: "rogue-pc",
			clinicId,
			term: 1,
			schemaVersion: 182,
			appVersion: "2.4.0",
			secret: "wrong-foreign-secret-xyz",
			issuedAt: now,
		});

		const verification = verifyMasterLeaseHeartbeat(lease, {
			secret: leaseSecret,
			expectedClinicId: clinicId,
			now,
		});

		assert.strictEqual(verification.valid, false);
	});

	it("1.4. Rejects expired leases beyond clock skew tolerance", () => {
		const now = Date.now();
		const lease = createMasterLeaseHeartbeat({
			masterNodeId: "reception-pc",
			clinicId,
			term: 1,
			schemaVersion: 182,
			appVersion: "2.4.0",
			secret: leaseSecret,
			issuedAt: now - 15000,
			leaseDurationMs: 5000, // expired 10 seconds ago
		});

		const verification = verifyMasterLeaseHeartbeat(lease, {
			secret: leaseSecret,
			expectedClinicId: clinicId,
			now,
			clockSkewToleranceMs: 2000,
		});

		assert.strictEqual(verification.valid, false);
		assert.match(verification.reason || "", /lease expired/i);
	});

	it("1.5. Serializes and deserializes UDP lease packet with magic marker", () => {
		const lease = createMasterLeaseHeartbeat({
			masterNodeId: "reception-pc",
			clinicId,
			term: 2,
			schemaVersion: 182,
			appVersion: "2.4.0",
			secret: leaseSecret,
		});

		const packetBuffer = createMeshLeaseHeartbeatPacket(lease);
		assert.ok(packetBuffer instanceof Buffer);

		const parsedLease = parseMeshLeaseHeartbeatPacket(packetBuffer);
		assert.ok(parsedLease);
		assert.strictEqual(parsedLease.leaseId, lease.leaseId);
		assert.strictEqual(parsedLease.masterNodeId, "reception-pc");
		assert.strictEqual(parsedLease.signature, lease.signature);

		// Malformed buffer returns null without throwing
		assert.strictEqual(parseMeshLeaseHeartbeatPacket(Buffer.from("invalid-noise")), null);
	});

	it("1.6. Triggers dynamic consensus failover when Master misses 2 consecutive heartbeats (10s)", () => {
		let failoverEventEmitted = false;
		let electedNode = "";

		const doctor1 = new LanMeshTopologyManager({
			nodeId: "doctor-1",
			clinicId,
			role: "doctor",
			ip: "192.168.1.101",
			port: 4101,
			appVersion: "2.4.0",
			schemaVersion: 182,
			enableLeaseFailover: true,
			leaseSecret,
			onLeaseFailoverTriggered: (details) => {
				failoverEventEmitted = true;
				electedNode = details.electedMasterId;
			},
		});

		const t0 = 1700000000000;

		// Doctor 1 receives initial lease from Reception Master
		const initialLease = createMasterLeaseHeartbeat({
			masterNodeId: "reception-pc",
			clinicId,
			term: 1,
			schemaVersion: 182,
			appVersion: "2.4.0",
			secret: leaseSecret,
			issuedAt: t0,
		});
		doctor1.processMasterLeaseHeartbeat(initialLease, leaseSecret);

		// Add Doctor 2 peer
		doctor1.processIncomingBeacon({
			magic: "DENTE_MESH_BEACON",
			protocolVersion: "2.0.0",
			nodeId: "doctor-2",
			clinicId,
			role: "doctor",
			ip: "192.168.1.102",
			port: 4102,
			appVersion: "2.4.0",
			schemaVersion: 183, // Higher schema version!
			timestamp: t0,
		});

		// 1. At t0 + 4s (missed 0 heartbeats, within 5s lease) -> healthy
		const check1 = doctor1.checkMasterLeaseHealth(t0 + 4000);
		assert.strictEqual(check1.masterAlive, true);
		assert.strictEqual(check1.failoverTriggered, false);

		// 2. At t0 + 8s (missed 1 heartbeat, but below 10s threshold) -> waiting
		const check2 = doctor1.checkMasterLeaseHealth(t0 + 8000);
		assert.strictEqual(check2.masterAlive, true);
		assert.strictEqual(check2.failoverTriggered, false);

		// 3. At t0 + 10.5s (missed >= 2 heartbeats, exceeds 10s threshold) -> FAILOVER TRIGGERED!
		const check3 = doctor1.checkMasterLeaseHealth(t0 + 10500);
		assert.strictEqual(check3.masterAlive, false);
		assert.strictEqual(check3.failoverTriggered, true);
		assert.strictEqual(failoverEventEmitted, true);

		// Doctor 2 has schema 183 vs Doctor 1 schema 182 -> Doctor 2 MUST win election
		assert.strictEqual(check3.electedMasterId, "doctor-2");
		assert.strictEqual(electedNode, "doctor-2");
		assert.strictEqual(doctor1.isTemporaryMasterActive(), false);
		assert.strictEqual(doctor1.getTemporaryMasterNodeId(), "doctor-2");

		// Badge reflects temporary master state
		const badge = doctor1.getStatusBadge();
		assert.strictEqual(badge.syncMode, "temporary_master_active");
		assert.strictEqual(badge.masterNodeId, "doctor-2");
	});

	it("1.7. Temporary Master role is relinquished immediately when Primary Master returns", () => {
		const doctor2 = new LanMeshTopologyManager({
			nodeId: "doctor-2",
			clinicId,
			role: "doctor",
			ip: "192.168.1.102",
			port: 4102,
			appVersion: "2.4.0",
			schemaVersion: 183,
			enableLeaseFailover: true,
			leaseSecret,
		});

		const t0 = 1700000000000;
		const receptionLease = createMasterLeaseHeartbeat({
			masterNodeId: "reception-pc",
			clinicId,
			term: 1,
			schemaVersion: 182,
			appVersion: "2.4.0",
			secret: leaseSecret,
			issuedAt: t0,
		});
		doctor2.processMasterLeaseHeartbeat(receptionLease, leaseSecret);

		// Reception goes silent for 11 seconds
		doctor2.checkMasterLeaseHealth(t0 + 11000);
		assert.strictEqual(doctor2.isTemporaryMasterActive(), true);

		// Primary Master restarts and broadcasts Term 2 lease at t0 + 20s
		const returningLease = createMasterLeaseHeartbeat({
			masterNodeId: "reception-pc",
			clinicId,
			term: 2,
			schemaVersion: 182,
			appVersion: "2.4.0",
			secret: leaseSecret,
			issuedAt: t0 + 20000,
		});
		const result = doctor2.processMasterLeaseHeartbeat(returningLease, leaseSecret);
		assert.strictEqual(result.accepted, true);

		// Doctor 2 relinquished temporary master back to Reception
		assert.strictEqual(doctor2.isTemporaryMasterActive(), false);
		assert.strictEqual(doctor2.getMasterNode()?.nodeId, "reception-pc");
		assert.strictEqual(doctor2.getStatusBadge().isMasterOnline, true);
	});
});

describe("2. Satellite Local Mutation Ring Buffer", () => {
	it("2.1. Buffers mutations during disconnected state with zero disruption", () => {
		const ring = new LocalMutationRingBuffer({ capacity: 10 });
		assert.strictEqual(ring.size(), 0);

		const mutation1: QueuedMeshMutation = {
			id: "m-1",
			entityKind: "visit_diary",
			entityId: "visit-101",
			action: "update",
			payload: { note: "First entry" },
			timestamp: 1000,
			attempts: 0,
			idempotencyKey: "idem-visit-101-1",
			originNodeId: "doc-1",
		};

		const res1 = ring.push(mutation1);
		assert.strictEqual(res1.buffered, true);
		assert.strictEqual(res1.isDuplicate, false);
		assert.strictEqual(ring.size(), 1);
		assert.strictEqual(ring.has("idem-visit-101-1"), true);
	});

	it("2.2. Provides O(1) idempotency key deduplication and in-place updates", () => {
		const ring = new LocalMutationRingBuffer({ capacity: 10 });

		const mutationOriginal: QueuedMeshMutation = {
			id: "m-1",
			entityKind: "odontogram",
			entityId: "tooth-16",
			action: "update",
			payload: { surfaces: ["O"] },
			timestamp: 1000,
			attempts: 0,
			idempotencyKey: "idem-tooth-16",
			originNodeId: "doc-1",
		};
		ring.push(mutationOriginal);

		// Same idempotency key re-submitted with updated payload
		const mutationUpdated: QueuedMeshMutation = {
			id: "m-1-retry",
			entityKind: "odontogram",
			entityId: "tooth-16",
			action: "update",
			payload: { surfaces: ["O", "M"] },
			timestamp: 1050,
			attempts: 1,
			idempotencyKey: "idem-tooth-16",
			originNodeId: "doc-1",
		};

		const res2 = ring.push(mutationUpdated);
		assert.strictEqual(res2.buffered, true);
		assert.strictEqual(res2.isDuplicate, true);
		assert.strictEqual(ring.size(), 1); // Size unchanged!

		const peeked = ring.peekBatch(5);
		assert.strictEqual(peeked.length, 1);
		assert.deepStrictEqual(peeked[0]?.payload, { surfaces: ["O", "M"] });
	});

	it("2.3. Enforces FIFO eviction when capacity is reached without memory leakage", () => {
		const capacity = 4;
		const ring = new LocalMutationRingBuffer({ capacity });

		for (let i = 1; i <= capacity; i++) {
			ring.push({
				id: `m-${i}`,
				entityKind: "appointment",
				entityId: `app-${i}`,
				action: "update",
				payload: { step: i },
				timestamp: 1000 + i,
				attempts: 0,
				idempotencyKey: `idem-${i}`,
				originNodeId: "doc-1",
			});
		}
		assert.strictEqual(ring.size(), 4);
		assert.strictEqual(ring.getDroppedCount(), 0);

		// Push 5th item -> triggers FIFO eviction of m-1
		const res5 = ring.push({
			id: "m-5",
			entityKind: "appointment",
			entityId: "app-5",
			action: "update",
			payload: { step: 5 },
			timestamp: 1005,
			attempts: 0,
			idempotencyKey: "idem-5",
			originNodeId: "doc-1",
		});

		assert.strictEqual(res5.buffered, true);
		assert.strictEqual(ring.size(), 4); // Still capped at 4
		assert.strictEqual(ring.getDroppedCount(), 1);
		assert.strictEqual(ring.has("idem-1"), false); // Oldest evicted
		assert.strictEqual(ring.has("idem-5"), true); // Newest retained

		const remaining = ring.peekBatch(10).map((m) => m.idempotencyKey);
		assert.deepStrictEqual(remaining, ["idem-2", "idem-3", "idem-4", "idem-5"]);
	});

	it("2.4. Acknowledges and cleanly purges synced mutations upon reconnection", () => {
		const ring = new LocalMutationRingBuffer({ capacity: 10 });
		ring.push({
			id: "m-1",
			entityKind: "payment",
			entityId: "pay-1",
			action: "create",
			payload: { amountCents: 500000 },
			timestamp: 1000,
			attempts: 0,
			idempotencyKey: "idem-pay-1",
			originNodeId: "doc-1",
		});
		ring.push({
			id: "m-2",
			entityKind: "payment",
			entityId: "pay-2",
			action: "create",
			payload: { amountCents: 350000 },
			timestamp: 1001,
			attempts: 0,
			idempotencyKey: "idem-pay-2",
			originNodeId: "doc-1",
		});

		assert.strictEqual(ring.size(), 2);
		const removed = ring.acknowledge(["idem-pay-1"]);
		assert.strictEqual(removed, 1);
		assert.strictEqual(ring.size(), 1);
		assert.strictEqual(ring.has("idem-pay-1"), false);
		assert.strictEqual(ring.has("idem-pay-2"), true);
	});
});

describe("3. Split-Brain Re-convergence & Deterministic CRDT Laws", () => {
	it("3.1. Vector Clocks accurately identify causality and detect split-brain divergence", () => {
		const engine = new VectorClockEngine("node-auditor");

		// Identical clocks
		const relIdentical = compareEntityVectors({ "node-a": 2, "node-b": 1 }, { "node-a": 2, "node-b": 1 });
		assert.strictEqual(relIdentical, "identical");

		// Local dominates
		const relLocalDom = compareEntityVectors({ "node-a": 3, "node-b": 1 }, { "node-a": 2, "node-b": 1 });
		assert.strictEqual(relLocalDom, "local_dominates");

		// Remote dominates
		const relRemoteDom = compareEntityVectors({ "node-a": 1, "node-b": 1 }, { "node-a": 2, "node-b": 2 });
		assert.strictEqual(relRemoteDom, "remote_dominates");

		// Divergent split-brain (Node A made edits unaware of Node B edits)
		const relDivergent = compareEntityVectors({ "node-a": 2, "node-b": 0 }, { "node-a": 1, "node-b": 1 });
		assert.strictEqual(relDivergent, "divergent_split_brain");
	});

	it("3.2. Somatic Allergies Law: Union merge never drops life-critical alerts and upgrades anesthesia risk", () => {
		const localState = {
			allergies: ["Пенициллин", "Лидокаин (отек Квинке)"],
			anesthesiaRisk: "ASA II",
			chronicDiseases: ["Гипертония 1 ст."],
		};

		const remoteState = {
			allergies: ["пенициллин", "Латекс (контактный дерматит)", "Аспирин"],
			anesthesiaRisk: "ASA III", // Higher somatic risk!
			chronicDiseases: ["Сахарный диабет 2 типа"],
		};

		const result = reconcileSplitBrainEntity({
			entityKind: "patient",
			entityId: "pat-999",
			localState,
			localVector: { "node-doctor-1": 3, "node-reception": 2 },
			localUpdatedAtMs: 1700000005000,
			remoteState,
			remoteVector: { "node-doctor-1": 2, "node-reception": 4 }, // Divergent!
			remoteUpdatedAtMs: 1700000006000,
			reconcilingNodeId: "node-reception",
		});

		assert.strictEqual(result.hasDivergence, true);
		assert.strictEqual(result.somaticAlertsPreserved, true);

		const merged = result.mergedState as {
			allergies: string[];
			anesthesiaRisk: string;
			chronicDiseases: string[];
		};

		// 1. All allergies from both sides preserved (Union merged)
		assert.ok(merged.allergies.includes("Пенициллин"));
		assert.ok(merged.allergies.includes("Лидокаин (отек Квинке)"));
		assert.ok(merged.allergies.includes("Латекс (контактный дерматит)"));
		assert.ok(merged.allergies.includes("Аспирин"));
		// No case duplicates
		const penicillins = merged.allergies.filter((a) => a.toLowerCase().includes("пенициллин"));
		assert.strictEqual(penicillins.length, 1);

		// 2. Anesthesia risk upgraded to highest safety severity
		assert.strictEqual(merged.anesthesiaRisk, "ASA III");

		// 3. Chronic diseases union merged
		assert.ok(merged.chronicDiseases.includes("Гипертония 1 ст."));
		assert.ok(merged.chronicDiseases.includes("Сахарный диабет 2 типа"));
	});

	it("3.3. Odontogram Law: Per-surface LWW preserves independent surfaces on the same tooth", () => {
		// Tooth 16:
		// Node A treated Occlusal ("O") surface with light-curing composite at t=1000
		// Node B treated Mesial ("M") surface with flowable composite at t=1005
		const localTooth = {
			toothNumber: 16,
			condition: "treated",
			surfaces: {
				O: {
					material: "composite_filtek",
					status: "restored",
					shade: "A2",
					updatedAtMs: 1000,
					doctor: "Д-р Иванов",
				},
			},
		};

		const remoteTooth = {
			toothNumber: 16,
			condition: "treated",
			surfaces: {
				M: {
					material: "composite_flow",
					status: "restored",
					shade: "A3",
					updatedAtMs: 1005,
					doctor: "Д-р Смирнова",
				},
			},
		};

		const result = reconcileSplitBrainEntity({
			entityKind: "odontogram",
			entityId: "tooth-16",
			localState: localTooth,
			localVector: { "doctor-1": 1 },
			localUpdatedAtMs: 1000,
			remoteState: remoteTooth,
			remoteVector: { "doctor-2": 1 },
			remoteUpdatedAtMs: 1005,
			reconcilingNodeId: "reception-pc",
		});

		const merged = result.mergedState as {
			toothNumber: number;
			surfaces: Record<string, { material: string; status: string; shade: string }>;
		};

		// Both surfaces O and M MUST exist simultaneously on Tooth 16!
		assert.strictEqual(merged.toothNumber, 16);
		assert.ok(merged.surfaces.O, "Occlusal surface must be preserved");
		assert.ok(merged.surfaces.M, "Mesial surface must be preserved");
		assert.strictEqual(merged.surfaces.O.material, "composite_filtek");
		assert.strictEqual(merged.surfaces.M.material, "composite_flow");
		assert.strictEqual(result.surfacesMergedCount, 2);
	});

	it("3.4. Odontogram Law: Same surface conflict resolves via Last-Write-Wins with vector clock timestamps", () => {
		// Both nodes touched the Distal ("D") surface of Tooth 36
		const localTooth = {
			toothNumber: 36,
			surfaces: {
				D: { material: "temporary_filling", updatedAtMs: 2000, doctor: "Д-р 1" },
			},
		};

		const remoteTooth = {
			toothNumber: 36,
			surfaces: {
				D: { material: "permanent_ceramic_inlay", updatedAtMs: 2500, doctor: "Д-р 2" },
			},
		};

		const merged = mergeOdontogramToothPerSurface(localTooth, remoteTooth);
		const surfaces = merged.surfaces as Record<string, { material: string }>;

		// 2500ms > 2000ms -> permanent_ceramic_inlay wins
		assert.strictEqual(surfaces.D.material, "permanent_ceramic_inlay");
	});

	it("3.5. Clinical Diary Notes Law: Chronological append with doctor signatures preserved verbatim", () => {
		const localDiary = {
			visitId: "visit-801",
			notes: [
				{
					id: "note-1",
					timestampMs: 1000,
					authorName: "Д-р Сидоров А.П.",
					text: "Анестезия Sol. Ubistesini 4% 1.7ml. Препарирование кариозной полости.",
					doctorSignature: "UKEP-HASH-SDRV-9912",
				},
			],
		};

		const remoteDiary = {
			visitId: "visit-801",
			notes: [
				{
					id: "note-2",
					timestampMs: 2000,
					authorName: "Д-р Сидоров А.П.",
					text: "Постановка пломбы Estelite Asteria A2B. Шлифовка, полировка. Прикус проверен.",
					doctorSignature: "UKEP-HASH-SDRV-9913",
				},
			],
		};

		const result = reconcileSplitBrainEntity({
			entityKind: "visit_diary",
			entityId: "visit-801",
			localState: localDiary,
			localVector: { "doctor-pc": 2, "reception-pc": 1 },
			localUpdatedAtMs: 1000,
			remoteState: remoteDiary,
			remoteVector: { "doctor-pc": 1, "reception-pc": 3 },
			remoteUpdatedAtMs: 2000,
			reconcilingNodeId: "reception-pc",
		});

		const merged = result.mergedState as {
			notes: Array<{
				id: string;
				timestampMs: number;
				authorName: string;
				text: string;
				doctorSignature: string;
			}>;
		};

		assert.strictEqual(merged.notes.length, 2);
		assert.strictEqual(merged.notes[0]?.id, "note-1");
		assert.strictEqual(merged.notes[1]?.id, "note-2");
		assert.strictEqual(merged.notes[0]?.doctorSignature, "UKEP-HASH-SDRV-9912");
		assert.strictEqual(merged.notes[1]?.doctorSignature, "UKEP-HASH-SDRV-9913");
	});

	it("3.6. Reconciled entity vector clock strictly dominates both divergent branches", () => {
		const localVector = { "node-a": 3, "node-b": 1 };
		const remoteVector = { "node-a": 2, "node-b": 2 };

		const result = reconcileSplitBrainEntity({
			entityKind: "patient",
			entityId: "pat-1",
			localState: { name: "Иван" },
			localVector,
			localUpdatedAtMs: 100,
			remoteState: { name: "Иван" },
			remoteVector,
			remoteUpdatedAtMs: 101,
			reconcilingNodeId: "node-reconciler",
		});

		// Merged clock must dominate localVector and remoteVector:
		// max(node-a): 3, max(node-b): 2, node-reconciler: +1
		assert.strictEqual(result.mergedVectorClock["node-a"], 3);
		assert.strictEqual(result.mergedVectorClock["node-b"], 2);
		assert.strictEqual(result.mergedVectorClock["node-reconciler"], 1);

		const compLocal = compareEntityVectors(result.mergedVectorClock, localVector);
		const compRemote = compareEntityVectors(result.mergedVectorClock, remoteVector);
		assert.strictEqual(compLocal, "local_dominates");
		assert.strictEqual(compRemote, "local_dominates");
	});
});

describe("4. End-to-End Multi-PC Clinic Partition & Split-Brain Healing Simulation", () => {
	it("4.1. Simulates Master power-off -> Doctor consensus election -> Concurrent edits -> Re-convergence", () => {
		const clinicId = "clinic-dent-central";
		const leaseSecret = "secret-dent-central-2026";

		// ── STEP 1: INITIAL STATE (All nodes synchronized) ──────────────────────────
		const receptionEngine = new VectorClockEngine("reception-server");
		const doctor1Engine = new VectorClockEngine("doctor-unit-1");
		const doctor2Engine = new VectorClockEngine("doctor-unit-2");

		// Reception PC is initial Master
		const receptionTopology = new LanMeshTopologyManager({
			nodeId: "reception-server",
			clinicId,
			role: "master",
			ip: "192.168.1.10",
			port: 4100,
			appVersion: "2.4.0",
			schemaVersion: 182,
			leaseSecret,
		});

		// Doctor 1 (Satellite, schema 182)
		const doctor1Topology = new LanMeshTopologyManager({
			nodeId: "doctor-unit-1",
			clinicId,
			role: "doctor",
			ip: "192.168.1.21",
			port: 4101,
			appVersion: "2.4.0",
			schemaVersion: 182,
			enableLeaseFailover: true,
			leaseSecret,
		});

		// Doctor 2 (Satellite, schema 183 — upgraded workstation)
		const doctor2Topology = new LanMeshTopologyManager({
			nodeId: "doctor-unit-2",
			clinicId,
			role: "doctor",
			ip: "192.168.1.22",
			port: 4102,
			appVersion: "2.4.0",
			schemaVersion: 183,
			enableLeaseFailover: true,
			leaseSecret,
		});

		let simTime = 1700000000000;

		// Initial lease emitted by Reception Server
		const lease1 = receptionTopology.createLeaseHeartbeat(simTime);
		doctor1Topology.processMasterLeaseHeartbeat(lease1, leaseSecret);
		doctor2Topology.processMasterLeaseHeartbeat(lease1, leaseSecret);

		// Discovery beacons exchanged
		doctor1Topology.processIncomingBeacon({
			magic: "DENTE_MESH_BEACON",
			protocolVersion: "2.0.0",
			nodeId: "doctor-unit-2",
			clinicId,
			role: "doctor",
			ip: "192.168.1.22",
			port: 4102,
			appVersion: "2.4.0",
			schemaVersion: 183,
			timestamp: simTime,
		});
		doctor2Topology.processIncomingBeacon({
			magic: "DENTE_MESH_BEACON",
			protocolVersion: "2.0.0",
			nodeId: "doctor-unit-1",
			clinicId,
			role: "doctor",
			ip: "192.168.1.21",
			port: 4101,
			appVersion: "2.4.0",
			schemaVersion: 182,
			timestamp: simTime,
		});

		assert.strictEqual(doctor1Topology.getStatusBadge().isMasterOnline, true);
		assert.strictEqual(doctor2Topology.getStatusBadge().isMasterOnline, true);

		// ── STEP 2: MASTER POWERED OFF (Network Partition) ─────────────────────────
		// Reception server shuts down / cord pulled.
		// Time advances 10.5 seconds (missed 2 leases)
		simTime += 10500;

		const health1 = doctor1Topology.checkMasterLeaseHealth(simTime);
		const health2 = doctor2Topology.checkMasterLeaseHealth(simTime);

		assert.strictEqual(health1.failoverTriggered, true);
		assert.strictEqual(health2.failoverTriggered, true);

		// Doctor 2 has schema 183 (vs Doctor 1 schema 182), so Doctor 2 is elected Temporary Master
		assert.strictEqual(health1.electedMasterId, "doctor-unit-2");
		assert.strictEqual(health2.electedMasterId, "doctor-unit-2");
		assert.strictEqual(health2.isLocalElected, true);
		assert.strictEqual(doctor2Topology.isTemporaryMasterActive(), true);

		// ── STEP 3: CONCURRENT CLINICAL MUTATIONS DURING PARTITION ─────────────────
		// Doctor 1 works offline on Tooth 26 & patient somatic allergy in ring buffer
		const doc1Mutation = {
			entityKind: "patient",
			entityId: "pat-505",
			allergies: ["Пенициллин (шок)"],
			anesthesiaRisk: "ASA II",
			tooth26: {
				surfaces: {
					D: { material: "composite", shade: "A2", updatedAtMs: simTime + 1000 },
				},
			},
		};
		const doc1Vec = doctor1Engine.recordMutation("patient", "pat-505", "doctor-unit-1", simTime + 1000);

		// Doctor 2 (Temporary Master) updates same patient with additional allergy & Tooth 26 Mesial surface
		const doc2Mutation = {
			entityKind: "patient",
			entityId: "pat-505",
			allergies: ["Аспирин"],
			anesthesiaRisk: "ASA III", // Upgraded risk
			tooth26: {
				surfaces: {
					M: { material: "ceramic_inlay", shade: "A1", updatedAtMs: simTime + 1200 },
				},
			},
		};
		const doc2Vec = doctor2Engine.recordMutation("patient", "pat-505", "doctor-unit-2", simTime + 1200);

		// Causality check during partition: divergent split-brain
		const partitionCausality = compareEntityVectors(doc1Vec.vectorClock, doc2Vec.vectorClock);
		assert.strictEqual(partitionCausality, "divergent_split_brain");

		// ── STEP 4: RECEPTION SERVER RECOVERS & RECONVERGENCE EXECUTES ─────────────
		simTime += 5000;
		// Reception returns with Term 2 lease
		const returningLease = receptionTopology.createLeaseHeartbeat(simTime);
		doctor1Topology.processMasterLeaseHeartbeat(returningLease, leaseSecret);
		doctor2Topology.processMasterLeaseHeartbeat(returningLease, leaseSecret);

		// Temporary Master role relinquished
		assert.strictEqual(doctor2Topology.isTemporaryMasterActive(), false);
		assert.strictEqual(doctor1Topology.getStatusBadge().isMasterOnline, true);
		assert.strictEqual(doctor2Topology.getStatusBadge().isMasterOnline, true);

		// Reconciliation runs on Master node
		const reconciliationResult = reconcileSplitBrainEntity({
			entityKind: "patient",
			entityId: "pat-505",
			localState: doc1Mutation,
			localVector: doc1Vec.vectorClock,
			localUpdatedAtMs: doc1Vec.updatedAtMs,
			remoteState: doc2Mutation,
			remoteVector: doc2Vec.vectorClock,
			remoteUpdatedAtMs: doc2Vec.updatedAtMs,
			reconcilingNodeId: "reception-server",
		});

		assert.strictEqual(reconciliationResult.hasDivergence, true);
		assert.strictEqual(reconciliationResult.somaticAlertsPreserved, true);

		const finalPatient = reconciliationResult.mergedState as {
			allergies: string[];
			anesthesiaRisk: string;
			tooth26: { surfaces: Record<string, { material: string; shade: string }> };
		};

		// 1. Both life-critical allergies preserved
		assert.ok(finalPatient.allergies.includes("Пенициллин (шок)"));
		assert.ok(finalPatient.allergies.includes("Аспирин"));

		// 2. Highest somatic/anesthesia risk preserved
		assert.strictEqual(finalPatient.anesthesiaRisk, "ASA III");

		// 3. Both tooth surfaces D and M preserved on tooth 26
		assert.ok(finalPatient.tooth26.surfaces.D);
		assert.ok(finalPatient.tooth26.surfaces.M);
		assert.strictEqual(finalPatient.tooth26.surfaces.D.material, "composite");
		assert.strictEqual(finalPatient.tooth26.surfaces.M.material, "ceramic_inlay");

		// 4. Vector clock dominance verified
		const finalClock = reconciliationResult.mergedVectorClock;
		assert.ok(finalClock["doctor-unit-1"] >= 1);
		assert.ok(finalClock["doctor-unit-2"] >= 1);
		assert.ok(finalClock["reception-server"] >= 1);
	});
});
