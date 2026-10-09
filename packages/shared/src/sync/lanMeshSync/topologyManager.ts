import type {
	LanMeshRole,
	LanMeshNodeStatus,
	LanMeshPeerSummary,
	LanMeshHandshakePayload,
	LanMeshDiscoveryBeaconPayload,
	SchemaCompatibilityResult,
	MeshSyncStatusBadge,
	MasterLeaseHeartbeat,
} from "./schemas.js";
import {
	DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS,
	MISSED_HEARTBEATS_FAILOVER_THRESHOLD,
	DEFAULT_LEASE_FAILOVER_TIMEOUT_MS,
	createMasterLeaseHeartbeat,
	verifyMasterLeaseHeartbeat,
} from "./leaseSecurity.js";
import { verifyMeshSchemaCompatibility } from "./schemaCompatibility.js";
import {
	type PeerElectionCandidate,
	electMasterNode,
	electConsensusMasterNode,
} from "./electionEngine.js";
import {
	LocalMutationRingBuffer,
	OfflineMeshMutationQueue,
} from "./mutationBuffers.js";

// ─────────────────────────────────────────────────────────────────────────────
// 6. LAN Mesh Topology Manager (Layer 3)
// ─────────────────────────────────────────────────────────────────────────────

export interface LanMeshTopologyOptions {
	nodeId: string;
	clinicId: string;
	role: LanMeshRole;
	ip: string;
	port: number;
	appVersion: string;
	schemaVersion: number | string;
	peerTimeoutMs?: number | undefined;
	enableLeaseFailover?: boolean | undefined;
	leaseSecret?: string | undefined;
	leaseDurationMs?: number | undefined;
	onPeerDiscovered?: ((peer: LanMeshPeerSummary) => void) | undefined;
	onPeerLost?: ((nodeId: string) => void) | undefined;
	onMasterChanged?: ((newMaster: LanMeshPeerSummary | null) => void) | undefined;
	onStatusBadgeChanged?: ((badge: MeshSyncStatusBadge) => void) | undefined;
	onLeaseFailoverTriggered?: ((details: {
		deadMasterId: string | null;
		electedMasterId: string;
		isLocalElected: boolean;
		term: number;
	}) => void) | undefined;
}

/**
 * Central State Machine for a single clinic computer participating in the LAN Zero-Conf Mesh.
 */
export class LanMeshTopologyManager {
	readonly nodeId: string;
	readonly clinicId: string;
	readonly role: LanMeshRole;
	readonly ip: string;
	readonly port: number;
	readonly appVersion: string;
	readonly schemaVersion: number | string;

	private readonly peerTimeoutMs: number;
	private readonly peers = new Map<string, LanMeshPeerSummary>();
	private readonly mutationQueue = new OfflineMeshMutationQueue();
	private readonly ringBuffer: LocalMutationRingBuffer;
	private activeMasterId: string | null = null;
	private activeWarningBadge: MeshSyncStatusBadge["warningBadge"] | undefined;

	// Lease & Consensus Failover State
	private currentTerm = 1;
	private activeLease: MasterLeaseHeartbeat | null = null;
	private lastMasterHeartbeatAt = 0;
	private consecutiveMissedHeartbeats = 0;
	private isTemporaryMaster = false;
	private temporaryMasterNodeId: string | null = null;
	private readonly enableLeaseFailover: boolean;
	private readonly leaseSecret?: string | undefined;
	private readonly leaseDurationMs: number;
	private readonly onLeaseFailoverTriggered?: ((details: {
		deadMasterId: string | null;
		electedMasterId: string;
		isLocalElected: boolean;
		term: number;
	}) => void) | undefined;

	private readonly onPeerDiscovered?: ((peer: LanMeshPeerSummary) => void) | undefined;
	private readonly onPeerLost?: ((nodeId: string) => void) | undefined;
	private readonly onMasterChanged?: ((newMaster: LanMeshPeerSummary | null) => void) | undefined;
	private readonly onStatusBadgeChanged?: ((badge: MeshSyncStatusBadge) => void) | undefined;

	constructor(options: LanMeshTopologyOptions) {
		this.nodeId = options.nodeId;
		this.clinicId = options.clinicId;
		this.role = options.role;
		this.ip = options.ip;
		this.port = options.port;
		this.appVersion = options.appVersion;
		this.schemaVersion = options.schemaVersion;
		this.peerTimeoutMs = options.peerTimeoutMs ?? 15000;
		this.enableLeaseFailover = options.enableLeaseFailover ?? false;
		this.leaseSecret = options.leaseSecret;
		this.leaseDurationMs = options.leaseDurationMs ?? DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS;
		this.onLeaseFailoverTriggered = options.onLeaseFailoverTriggered;

		this.ringBuffer = this.mutationQueue.getRingBuffer();

		this.onPeerDiscovered = options.onPeerDiscovered;
		this.onPeerLost = options.onPeerLost;
		this.onMasterChanged = options.onMasterChanged;
		this.onStatusBadgeChanged = options.onStatusBadgeChanged;

		if (this.role === "master") {
			this.activeMasterId = this.nodeId;
			this.lastMasterHeartbeatAt = Date.now();
		}
	}

	/**
	 * Generates handshake payload representing the local node and its known peer list.
	 */
	createHandshakePayload(): LanMeshHandshakePayload {
		return {
			nodeId: this.nodeId,
			clinicId: this.clinicId,
			appVersion: this.appVersion,
			schemaVersion: this.schemaVersion,
			role: this.role,
			ip: this.ip,
			port: this.port,
			peerList: this.getPeerSummaries(),
			timestamp: Date.now(),
		};
	}

	/**
	 * Processes an incoming handshake from a remote peer:
	 * - Validates schema & version compatibility
	 * - Registers/updates the peer in the topology table
	 * - Recalculates Master election
	 * - Emits telemetry
	 */
	processIncomingHandshake(remote: LanMeshHandshakePayload): {
		accepted: boolean;
		compatibility: SchemaCompatibilityResult;
		localResponse: LanMeshHandshakePayload;
	} {
		const compatibility = verifyMeshSchemaCompatibility(
			{
				clinicId: this.clinicId,
				appVersion: this.appVersion,
				schemaVersion: this.schemaVersion,
			},
			{
				clinicId: remote.clinicId,
				appVersion: remote.appVersion,
				schemaVersion: remote.schemaVersion,
			},
		);

		if (!compatibility.compatible && compatibility.mode === "read_only" && compatibility.warningBadge?.code === "CLINIC_MISMATCH") {
			return {
				accepted: false,
				compatibility,
				localResponse: this.createHandshakePayload(),
			};
		}

		const isNew = !this.peers.has(remote.nodeId);
		const status: LanMeshNodeStatus = compatibility.syncAllowed
			? "online"
			: compatibility.mode === "sync_deferred"
				? "sync_deferred"
				: "read_only";

		const peerSummary: LanMeshPeerSummary = {
			nodeId: remote.nodeId,
			role: remote.role,
			ip: remote.ip,
			port: remote.port,
			appVersion: remote.appVersion,
			schemaVersion: remote.schemaVersion,
			lastSeen: Date.now(),
			status,
		};

		this.peers.set(remote.nodeId, peerSummary);

		if (compatibility.warningBadge) {
			this.activeWarningBadge = compatibility.warningBadge;
		}

		if (isNew && this.onPeerDiscovered) {
			this.onPeerDiscovered(peerSummary);
		}

		// Update peer list from remote's known peers (gossip propagation)
		for (const remotePeer of remote.peerList) {
			if (remotePeer.nodeId !== this.nodeId && !this.peers.has(remotePeer.nodeId)) {
				this.peers.set(remotePeer.nodeId, {
					...remotePeer,
					lastSeen: Date.now(),
				});
			}
		}

		this.recalculateMasterElection();
		this.notifyStatusBadge();

		return {
			accepted: true,
			compatibility,
			localResponse: this.createHandshakePayload(),
		};
	}

	/**
	 * Ingests a discovery beacon from a peer.
	 */
	processIncomingBeacon(beacon: LanMeshDiscoveryBeaconPayload): boolean {
		if (beacon.nodeId === this.nodeId) return false;
		if (beacon.clinicId !== this.clinicId) return false;

		const existing = this.peers.get(beacon.nodeId);
		const isNew = !existing;

		const updated: LanMeshPeerSummary = {
			nodeId: beacon.nodeId,
			role: beacon.role,
			ip: beacon.ip,
			port: beacon.port,
			appVersion: beacon.appVersion,
			schemaVersion: beacon.schemaVersion,
			lastSeen: Date.now(),
			status: existing?.status ?? "online",
		};

		this.peers.set(beacon.nodeId, updated);

		if (isNew && this.onPeerDiscovered) {
			this.onPeerDiscovered(updated);
		}

		this.recalculateMasterElection();
		this.notifyStatusBadge();
		return true;
	}

	/**
	 * Directly registers or updates a peer in the topology table (e.g. from AutoJoin PIN pairing).
	 */
	addOrUpdatePeer(peer: LanMeshPeerSummary): void {
		const isNew = !this.peers.has(peer.nodeId);
		this.peers.set(peer.nodeId, {
			...peer,
			lastSeen: peer.lastSeen || Date.now(),
		});

		if (isNew && this.onPeerDiscovered) {
			this.onPeerDiscovered(peer);
		}

		this.recalculateMasterElection();
		this.notifyStatusBadge();
	}

	/**
	 * Creates a cryptographically signed lease heartbeat.
	 * Can be emitted by the primary Master or an elected Temporary Master.
	 */
	createLeaseHeartbeat(now?: number): MasterLeaseHeartbeat {
		const issuedAt = now ?? Date.now();
		const lease = createMasterLeaseHeartbeat({
			masterNodeId: this.nodeId,
			clinicId: this.clinicId,
			term: this.currentTerm,
			schemaVersion: this.schemaVersion,
			appVersion: this.appVersion,
			leaseDurationMs: this.leaseDurationMs,
			secret: this.leaseSecret,
			issuedAt,
		});

		this.activeLease = lease;
		this.lastMasterHeartbeatAt = issuedAt;
		return lease;
	}

	/**
	 * Ingests and verifies an incoming Master Lease Heartbeat.
	 * Resets missed heartbeat counters and relinquishes temporary master if primary returns.
	 */
	processMasterLeaseHeartbeat(
		lease: MasterLeaseHeartbeat,
		secret?: string | undefined,
		now?: number | undefined,
	): { accepted: boolean; reason?: string | undefined } {
		const verification = verifyMasterLeaseHeartbeat(lease, {
			secret: secret || this.leaseSecret,
			expectedClinicId: this.clinicId,
			now: now ?? lease.issuedAt,
		});

		if (!verification.valid) {
			return { accepted: false, reason: verification.reason };
		}

		this.lastMasterHeartbeatAt = lease.issuedAt || Date.now();
		this.consecutiveMissedHeartbeats = 0;
		this.activeLease = lease;

		if (lease.term > this.currentTerm) {
			this.currentTerm = lease.term;
		}

		// If this node was acting as temporary master, relinquish immediately upon primary master return
		if (this.isTemporaryMaster || this.temporaryMasterNodeId) {
			this.isTemporaryMaster = false;
			this.temporaryMasterNodeId = null;
		}
		this.activeMasterId = lease.masterNodeId;

		// Ensure master is registered in peer table as online
		const existingPeer = this.peers.get(lease.masterNodeId);
		if (existingPeer) {
			this.peers.set(lease.masterNodeId, {
				...existingPeer,
				status: "online",
				lastSeen: lease.issuedAt || Date.now(),
			});
		} else {
			this.peers.set(lease.masterNodeId, {
				nodeId: lease.masterNodeId,
				role: "master",
				ip: "127.0.0.1",
				port: 4100,
				appVersion: lease.appVersion,
				schemaVersion: lease.schemaVersion,
				lastSeen: lease.issuedAt || Date.now(),
				status: "online",
			});
		}

		this.recalculateMasterElection();
		this.notifyStatusBadge();
		return { accepted: true };
	}

	/**
	 * Evaluates Master lease freshness.
	 * If satellites miss 2 consecutive heartbeats (10s threshold), Master is marked dead.
	 * Satellites initiate instant consensus election: highest schema version + lowest nodeId
	 * becomes the temporary active Master.
	 */
	checkMasterLeaseHealth(now = Date.now()): {
		masterAlive: boolean;
		failoverTriggered: boolean;
		electedMasterId: string | null;
		isLocalElected: boolean;
	} {
		if (this.role === "master") {
			return {
				masterAlive: true,
				failoverTriggered: false,
				electedMasterId: this.nodeId,
				isLocalElected: true,
			};
		}

		if (this.lastMasterHeartbeatAt > 0) {
			const elapsed = now - this.lastMasterHeartbeatAt;
			if (elapsed >= DEFAULT_LEASE_FAILOVER_TIMEOUT_MS) {
				// Master missed >= 2 consecutive heartbeats (10s threshold) -> marked dead
				this.consecutiveMissedHeartbeats = Math.max(
					MISSED_HEARTBEATS_FAILOVER_THRESHOLD,
					Math.floor(elapsed / DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS),
				);

				const prevMaster = this.activeMasterId;
				if (prevMaster && this.peers.has(prevMaster)) {
					const p = this.peers.get(prevMaster)!;
					this.peers.set(prevMaster, { ...p, status: "offline" });
				}

				// Instant consensus election: highest schema version + lowest nodeId
				const candidates: PeerElectionCandidate[] = [
					{
						nodeId: this.nodeId,
						role: this.role,
						schemaVersion: this.schemaVersion,
						lastSeen: now,
						status: "online",
					},
					...Array.from(this.peers.values()).filter(
						(p) => p.status !== "offline" && p.nodeId !== prevMaster,
					),
				];

				const elected = electConsensusMasterNode(candidates);
				if (elected) {
					this.currentTerm += 1;
					this.temporaryMasterNodeId = elected.nodeId;
					this.activeMasterId = elected.nodeId;
					this.isTemporaryMaster = elected.nodeId === this.nodeId;

					if (this.onLeaseFailoverTriggered) {
						this.onLeaseFailoverTriggered({
							deadMasterId: prevMaster,
							electedMasterId: elected.nodeId,
							isLocalElected: this.isTemporaryMaster,
							term: this.currentTerm,
						});
					}

					if (this.onMasterChanged) {
						this.onMasterChanged(this.getMasterNode());
					}

					this.notifyStatusBadge();
					return {
						masterAlive: false,
						failoverTriggered: true,
						electedMasterId: elected.nodeId,
						isLocalElected: this.isTemporaryMaster,
					};
				}
			}
		}

		return {
			masterAlive: true,
			failoverTriggered: false,
			electedMasterId: this.activeMasterId,
			isLocalElected: this.isTemporaryMaster,
		};
	}

	/**
	 * Prunes peers whose last heartbeat exceeds `peerTimeoutMs`.
	 */
	pruneStalePeers(now = Date.now()): string[] {
		const staleNodeIds: string[] = [];
		for (const [nodeId, peer] of this.peers.entries()) {
			if (now - peer.lastSeen > this.peerTimeoutMs) {
				staleNodeIds.push(nodeId);
				this.peers.delete(nodeId);
				if (this.onPeerLost) {
					this.onPeerLost(nodeId);
				}
			}
		}

		if (this.enableLeaseFailover) {
			this.checkMasterLeaseHealth(now);
		}

		if (staleNodeIds.length > 0) {
			this.recalculateMasterElection();
			this.notifyStatusBadge();
		}
		return staleNodeIds;
	}

	/**
	 * Recalculates master election based on active peers and local node.
	 */
	private recalculateMasterElection(): void {
		const candidates: PeerElectionCandidate[] = [
			{
				nodeId: this.nodeId,
				role: this.role,
				schemaVersion: this.schemaVersion,
				lastSeen: Date.now(),
				status: "online",
			},
			...Array.from(this.peers.values()),
		];

		const elected =
			this.enableLeaseFailover &&
			(this.consecutiveMissedHeartbeats >= MISSED_HEARTBEATS_FAILOVER_THRESHOLD ||
				this.isTemporaryMaster)
				? electConsensusMasterNode(candidates)
				: electMasterNode(candidates);

		const newMasterId = elected ? elected.nodeId : null;

		if (newMasterId !== this.activeMasterId) {
			this.activeMasterId = newMasterId;
			if (this.onMasterChanged) {
				const masterSummary =
					newMasterId === this.nodeId
						? {
								nodeId: this.nodeId,
								role: this.role,
								ip: this.ip,
								port: this.port,
								appVersion: this.appVersion,
								schemaVersion: this.schemaVersion,
								lastSeen: Date.now(),
								status: "online" as const,
							}
						: this.peers.get(newMasterId || "") || null;
				this.onMasterChanged(masterSummary);
			}
		}
	}

	getPeerSummaries(): LanMeshPeerSummary[] {
		return Array.from(this.peers.values());
	}

	getPeer(nodeId: string): LanMeshPeerSummary | undefined {
		return this.peers.get(nodeId);
	}

	getMasterNode(): LanMeshPeerSummary | null {
		if (this.activeMasterId === this.nodeId) {
			if (this.role === "master" || this.role === "admin" || this.isTemporaryMaster) {
				return {
					nodeId: this.nodeId,
					role: this.role,
					ip: this.ip,
					port: this.port,
					appVersion: this.appVersion,
					schemaVersion: this.schemaVersion,
					lastSeen: Date.now(),
					status: "online",
				};
			}
			return null;
		}
		return this.activeMasterId ? this.peers.get(this.activeMasterId) || null : null;
	}

	isMasterOnline(): boolean {
		const master = this.getMasterNode();
		if (!master) return false;
		if (master.role === "master" || master.role === "admin") return true;
		if (
			this.isTemporaryMaster ||
			(this.temporaryMasterNodeId && this.temporaryMasterNodeId === master.nodeId)
		) {
			return true;
		}
		return false;
	}

	getMutationQueue(): OfflineMeshMutationQueue {
		return this.mutationQueue;
	}

	getRingBuffer(): LocalMutationRingBuffer {
		return this.ringBuffer;
	}

	isTemporaryMasterActive(): boolean {
		return this.isTemporaryMaster;
	}

	getTemporaryMasterNodeId(): string | null {
		return this.temporaryMasterNodeId;
	}

	getLeaseTerm(): number {
		return this.currentTerm;
	}

	getConsecutiveMissedHeartbeats(): number {
		return this.consecutiveMissedHeartbeats;
	}

	getActiveLease(): MasterLeaseHeartbeat | null {
		return this.activeLease;
	}

	/**
	 * Builds non-blocking status badge telemetry for clinic frontends.
	 */
	getStatusBadge(): MeshSyncStatusBadge {
		const isMasterOnline = this.isMasterOnline();
		const queuedCount = this.mutationQueue.size();

		let syncMode: MeshSyncStatusBadge["syncMode"] = "streaming";
		if (
			this.isTemporaryMaster ||
			(this.temporaryMasterNodeId && this.temporaryMasterNodeId === this.activeMasterId)
		) {
			syncMode = "temporary_master_active";
		} else if (!isMasterOnline) {
			syncMode = "offline_queued";
		} else if (this.activeWarningBadge?.code === "INCOMPATIBLE_SCHEMA") {
			syncMode = "sync_deferred";
		} else if (this.activeWarningBadge?.code === "VERSION_MISMATCH") {
			syncMode = "read_only";
		}

		return {
			isMasterOnline,
			masterNodeId: this.activeMasterId,
			activePeersCount: this.peers.size,
			queuedMutationsCount: queuedCount,
			syncMode,
			isTemporaryMaster: this.isTemporaryMaster,
			temporaryMasterNodeId: this.temporaryMasterNodeId,
			leaseTerm: this.currentTerm,
			consecutiveMissedHeartbeats: this.consecutiveMissedHeartbeats,
			warningBadge: this.activeWarningBadge,
		};
	}

	private notifyStatusBadge(): void {
		if (this.onStatusBadgeChanged) {
			this.onStatusBadgeChanged(this.getStatusBadge());
		}
	}
}
