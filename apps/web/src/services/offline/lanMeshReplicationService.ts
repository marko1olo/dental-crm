/**
 * DENTE CRM — Wi-Fi Mesh & Peer-to-Peer Offline LAN Replication Service
 *
 * Provides:
 * 1. Clinic LAN Subnet Discovery (Tablets, Reception PCs, Local Server)
 * 2. Peer-to-Peer Bidirectional Mutation Exchange over Wi-Fi without Internet
 * 3. Vector Clock Causal State Tracking per Node
 * 4. 3-Tier Seamless Transition: Offline <-> LAN Local Mesh <-> Cloud PostgreSQL
 */

import {
	type LanDiscoveryBeacon,
	type LanMeshNode,
	type LanNodeRole,
	type MeshSyncExchangeRequest,
	type MeshSyncExchangeResponse,
	type SyncMutationEnvelope,
	type SyncTierMode,
	type VectorClock,
	compareVectorClocks,
	computePayloadHash,
	createCompositeIdempotencyKey,
	createVectorClock,
	determineSyncTierMode,
	incrementVectorClock,
	mergeVectorClocks,
	processMeshSyncExchange,
	vectorClockToString,
} from "@dental/shared";
import { logger } from "../../utils/logger";
import {
	type DiscoveredLanServer,
	discoverLocalClinicServer,
	getActiveApiBaseUrl,
	lanHeartbeatManager,
	setActiveApiBaseUrl,
} from "../lanDiscovery/lanServerDiscovery";
import {
	clearSyncedOfflineMutations,
	generateMutationUuid,
	getPendingOfflineMutations,
	nowIsoWithMs,
	updateOfflineMutationStatus,
} from "./offlineStorage";
import {
	getOrCreateClientId,
	mapToSyncAction,
	mapToSyncEntityKind,
} from "./offlineSyncService";
import type { OfflineMutation } from "./types";

export interface MeshReplicationOptions {
	nodeRole?: LanNodeRole;
	nodeName?: string;
	broadcastPort?: number;
	peerCandidates?: string[];
	pollIntervalMs?: number;
	organizationId?: string;
	fetchImpl?: typeof fetch;
}

export interface MeshReplicationMetrics {
	activeTier: SyncTierMode;
	knownPeersCount: number;
	lastReplicationIso: string | null;
	localVectorClock: VectorClock;
	replicatedMutationsCount: number;
}

export type MeshEventListener = (event: {
	type: "peer_discovered" | "replication_complete" | "tier_changed" | "error";
	data: unknown;
}) => void;

export class LanMeshReplicationService {
	private static instance: LanMeshReplicationService | null = null;

	private nodeId: string;
	private nodeRole: LanNodeRole = "doctor_tablet";
	private nodeName = "Doctor Tablet Workstation";
	private localVectorClock: VectorClock = {};
	private knownPeers = new Map<string, LanMeshNode>();
	private activeTier: SyncTierMode = "autonomous_offline";
	private isReplicating = false;
	private timerId: ReturnType<typeof setTimeout> | null = null;
	private pollIntervalMs = 15000;
	private listeners = new Set<MeshEventListener>();
	private organizationId?: string;
	private lastReplicationIso: string | null = null;
	private replicatedMutationsCount = 0;

	constructor() {
		this.nodeId = getOrCreateClientId();
		this.localVectorClock = createVectorClock(this.nodeId, 1);
	}

	public static getInstance(): LanMeshReplicationService {
		if (!LanMeshReplicationService.instance) {
			LanMeshReplicationService.instance = new LanMeshReplicationService();
		}
		return LanMeshReplicationService.instance;
	}

	/**
	 * Configures current workstation / tablet mesh identity.
	 */
	public configure(options: MeshReplicationOptions): void {
		if (options.nodeRole) this.nodeRole = options.nodeRole;
		if (options.nodeName) this.nodeName = options.nodeName;
		if (options.organizationId) this.organizationId = options.organizationId;
		if (options.pollIntervalMs) this.pollIntervalMs = options.pollIntervalMs;
	}

	public getNodeId(): string {
		return this.nodeId;
	}

	public getNodeRole(): LanNodeRole {
		return this.nodeRole;
	}

	public getActiveTier(): SyncTierMode {
		return this.activeTier;
	}

	public getVectorClock(): VectorClock {
		return { ...this.localVectorClock };
	}

	public getKnownPeers(): LanMeshNode[] {
		return Array.from(this.knownPeers.values());
	}

	public getMetrics(): MeshReplicationMetrics {
		return {
			activeTier: this.activeTier,
			knownPeersCount: this.knownPeers.size,
			lastReplicationIso: this.lastReplicationIso,
			localVectorClock: { ...this.localVectorClock },
			replicatedMutationsCount: this.replicatedMutationsCount,
		};
	}

	public subscribe(listener: MeshEventListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private emit(
		type: "peer_discovered" | "replication_complete" | "tier_changed" | "error",
		data: unknown,
	): void {
		for (const listener of this.listeners) {
			try {
				listener({ type, data });
			} catch (err) {
				logger.error("[LanMeshReplicationService] Listener error", err);
			}
		}
	}

	/**
	 * Sets and updates network tier with reactive notification.
	 */
	public setSyncTier(tier: SyncTierMode): void {
		if (this.activeTier !== tier) {
			const prev = this.activeTier;
			this.activeTier = tier;
			logger.info(
				`[LanMeshReplicationService] Network tier transitioned: ${prev} -> ${tier}`,
			);
			this.emit("tier_changed", { prevTier: prev, currentTier: tier });
		}
	}

	/**
	 * Registers a newly discovered or probed peer node in local mesh registry.
	 */
	public registerPeerNode(node: LanMeshNode): void {
		const existing = this.knownPeers.get(node.nodeId);
		this.knownPeers.set(node.nodeId, {
			...node,
			lastSeenIso: new Date().toISOString(),
		});

		if (!existing || existing.status !== node.status) {
			logger.info(
				`[LanMeshReplicationService] Registered Mesh Peer: ${node.name} (${node.role}) @ ${node.baseUrl}`,
			);
			this.emit("peer_discovered", node);
		}
	}

	/**
	 * Evaluates and transitions network tier based on connectivity signals.
	 */
	public evaluateNetworkTier(signals: {
		isOnline: boolean;
		isCloudReachable: boolean;
		lanServer: DiscoveredLanServer | null;
	}): SyncTierMode {
		const hasCloud = signals.isOnline && signals.isCloudReachable;
		const hasLan = Boolean(signals.lanServer && signals.lanServer.status === "online");
		const hasPeers = this.knownPeers.size > 0;

		const tier = determineSyncTierMode({
			hasCloudInternet: hasCloud,
			hasLanMicroserver: hasLan,
			hasLocalMeshPeers: hasPeers,
		});

		this.setSyncTier(tier);
		return tier;
	}

	/**
	 * Converts local outbox mutations to standard SyncMutationEnvelope list.
	 */
	public buildOutboxEnvelopes(mutations: OfflineMutation[]): SyncMutationEnvelope[] {
		return mutations.map((mut) => {
			const payload = (
				mut.payload && typeof mut.payload === "object"
					? (mut.payload as Record<string, unknown>)
					: { value: mut.payload }
			) as Record<string, unknown>;

			const calculatedHash = mut.payloadHash || computePayloadHash(payload);
			const idempotencyKey =
				mut.idempotencyKey ||
				createCompositeIdempotencyKey(mut.mutationId, payload);

			return {
				mutationId: mut.mutationId,
				idempotencyKey,
				payloadHash: calculatedHash,
				entityKind: mapToSyncEntityKind(mut.entityType),
				entityId: mut.entityId,
				action: mapToSyncAction(mut.action),
				payload,
				updatedAt: mut.timestamp || nowIsoWithMs(),
				mutationVector: mut.mutationVector,
				vectorClock: { ...this.localVectorClock },
				clientId: this.nodeId,
				authorUserId: mut.authorUserId,
			};
		});
	}

	/**
	 * Executes bidirectional P2P replication cycle against a specific target peer.
	 */
	public async replicateWithPeer(
		targetPeer: LanMeshNode,
		options: { fetchImpl?: typeof fetch } = {},
	): Promise<MeshSyncExchangeResponse | null> {
		const fetcher = options.fetchImpl || (typeof fetch !== "undefined" ? fetch : undefined);
		if (!fetcher) return null;

		try {
			const pending = await getPendingOfflineMutations({
				organizationId: this.organizationId,
			});
			const envelopes = this.buildOutboxEnvelopes(pending);

			this.localVectorClock = incrementVectorClock(this.localVectorClock, this.nodeId);

			const requestPayload: MeshSyncExchangeRequest = {
				exchangeId: generateMutationUuid(),
				senderNodeId: this.nodeId,
				senderRole: this.nodeRole,
				senderVectorClock: { ...this.localVectorClock },
				mutations: envelopes,
				sentAt: nowIsoWithMs(),
				organizationId: this.organizationId,
			};

			const targetUrl = `${targetPeer.baseUrl.replace(/\/+$/, "")}/api/sync/mesh/exchange`;

			const res = await fetcher(targetUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-mesh-sender": this.nodeId,
					"x-dente-mesh-role": this.nodeRole,
				},
				body: JSON.stringify(requestPayload),
			});

			if (!res.ok) {
				logger.warn(
					`[LanMeshReplicationService] Replication with ${targetPeer.name} returned HTTP ${res.status}`,
				);
				return null;
			}

			const responseData = (await res.json()) as MeshSyncExchangeResponse;

			// Update vector clock from peer response
			this.localVectorClock = mergeVectorClocks(
				this.localVectorClock,
				responseData.responderVectorClock,
			);

			// Mark local applied & duplicate mutations as synced
			for (const result of responseData.results) {
				if (result.status === "applied" || result.status === "duplicate" || result.status === "merged") {
					await updateOfflineMutationStatus(result.mutationId, "synced");
				}
			}

			await clearSyncedOfflineMutations();

			this.lastReplicationIso = new Date().toISOString();
			this.replicatedMutationsCount += responseData.appliedMutationsCount + responseData.mergedMutationsCount;

			this.emit("replication_complete", {
				peer: targetPeer,
				response: responseData,
			});

			return responseData;
		} catch (err) {
			logger.warn(
				`[LanMeshReplicationService] Replication with peer ${targetPeer.name} failed:`,
				err,
			);
			return null;
		}
	}

	/**
	 * Runs a full mesh replication round across all discovered online peers.
	 */
	public async syncAllPeers(options: { fetchImpl?: typeof fetch } = {}): Promise<number> {
		if (this.isReplicating) return 0;
		this.isReplicating = true;

		let totalReplicated = 0;
		try {
			const onlinePeers = Array.from(this.knownPeers.values()).filter(
				(p) => p.status === "online" && p.nodeId !== this.nodeId,
			);

			for (const peer of onlinePeers) {
				const res = await this.replicateWithPeer(peer, options);
				if (res) {
					totalReplicated += res.appliedMutationsCount + res.mergedMutationsCount;
				}
			}
		} finally {
			this.isReplicating = false;
		}

		return totalReplicated;
	}
}

export const lanMeshReplicationService = LanMeshReplicationService.getInstance();
