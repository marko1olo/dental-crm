
import {
	SOMATIC_SAFETY_FIELDS,
	isSomaticSafetyFieldOrRisk,
	mergeSomaticSafetyField,
} from "../crdt.js";
import { computePayloadHash, createCompositeIdempotencyKey, generateUuidV7 } from "../hashing.js";
import {
	type ConflictResolutionStrategy,
	type FieldConflictDetail,
	type LanAssistantCitoEvent,
	type LanChairStatus,
	type LanChairStatusEvent,
	type LanCitoCallReason,
	type LanCitoUrgency,
	type LanDiscoveryBeacon,
	type LanInvoiceTransferEvent,
	type LanInvoiceTransferItem,
	type LanMeshNode,
	type LanNodeRole,
	type LanP2PEventType,
	type LanP2PMessage,
	type MeshSyncExchangeRequest,
	type MeshSyncExchangeResponse,
	type MutationVector,
	type SyncMutationEnvelope,
	type SyncMutationResult,
	type SyncTierMode,
	type VectorClock,
	lanAssistantCitoEventSchema,
	lanChairStatusEventSchema,
	lanInvoiceTransferEventSchema,
	lanP2PMessageSchema,
} from "../types.js";
import { incrementVectorClock, mergeVectorClocks } from './vector-clock.js';

// ─────────────────────────────────────────────────────────────────────────────

export function determineSyncTierMode(options: {
	hasCloudInternet: boolean;
	hasLanMicroserver: boolean;
	hasLocalMeshPeers: boolean;
}): SyncTierMode {
	if (options.hasCloudInternet) {
		return "cloud_postgresql";
	}
	if (options.hasLanMicroserver || options.hasLocalMeshPeers) {
		return "lan_local_mesh";
	}
	return "autonomous_offline";
}

export function createLanDiscoveryBeacon(
	node: LanMeshNode,
	tier: SyncTierMode = "lan_local_mesh",
): LanDiscoveryBeacon {
	const timestamp = new Date().toISOString();
	const payloadForSig = `${node.nodeId}:${node.role}:${node.baseUrl}:${timestamp}`;
	const signature = computePayloadHash(payloadForSig);

	return {
		protocolVersion: "1.0.0",
		serverName: node.name,
		serverId: node.nodeId,
		role: node.role,
		baseUrl: node.baseUrl,
		apiPort: node.port,
		lanAddresses: node.ipAddresses,
		timestamp,
		organizationId: node.organizationId,
		activeSyncTier: tier,
		signature,
	};
}

/**
 * Handles incoming peer-to-peer mesh sync exchange between workstations/tablets without internet.
 */
export function processMeshSyncExchange(
	localMutations: SyncMutationEnvelope[],
	request: MeshSyncExchangeRequest,
	localVectorClock: VectorClock,
	localNodeId: string,
): MeshSyncExchangeResponse {
	const responderTime = new Date().toISOString();
	const localMutationMap = new Map(localMutations.map((m) => [m.mutationId, m]));
	const localIdempotencyMap = new Map(
		localMutations.map((m) => [m.idempotencyKey, m]),
	);

	let applied = 0;
	let merged = 0;
	let duplicates = 0;
	const results: SyncMutationResult[] = [];
	const returnMutations: SyncMutationEnvelope[] = [];

	let currentClock = mergeVectorClocks(localVectorClock, request.senderVectorClock);

	for (const incomingMut of request.mutations) {
		const existingById = localMutationMap.get(incomingMut.mutationId);
		const existingByKey = localIdempotencyMap.get(incomingMut.idempotencyKey);
		const existing = existingById || existingByKey;

		if (!existing) {
			applied++;
			currentClock = incrementVectorClock(currentClock, localNodeId);
			results.push({
				mutationId: incomingMut.mutationId,
				idempotencyKey: incomingMut.idempotencyKey,
				status: "applied",
				entityKind: incomingMut.entityKind,
				entityId: incomingMut.entityId,
				appliedAt: responderTime,
			});
		} else {
			const isExactHashMatch =
				existing.payloadHash === incomingMut.payloadHash;

			if (isExactHashMatch) {
				duplicates++;
				results.push({
					mutationId: incomingMut.mutationId,
					idempotencyKey: incomingMut.idempotencyKey,
					status: "duplicate",
					entityKind: incomingMut.entityKind,
					entityId: incomingMut.entityId,
					appliedAt: responderTime,
				});
			} else {
				merged++;
				currentClock = incrementVectorClock(currentClock, localNodeId);
				results.push({
					mutationId: incomingMut.mutationId,
					idempotencyKey: incomingMut.idempotencyKey,
					status: "merged",
					entityKind: incomingMut.entityKind,
					entityId: incomingMut.entityId,
					appliedAt: responderTime,
				});
			}
		}
	}

	// Send back any local mutations that the sender does not have
	for (const localMut of localMutations) {
		const senderHasMut = request.mutations.some(
			(m) => m.mutationId === localMut.mutationId,
		);
		if (!senderHasMut) {
			returnMutations.push(localMut);
		}
	}

	return {
		exchangeId: request.exchangeId,
		responderNodeId: localNodeId,
		responderVectorClock: currentClock,
		processedMutationsCount: request.mutations.length,
		appliedMutationsCount: applied,
		mergedMutationsCount: merged,
		duplicateMutationsCount: duplicates,
		returnMutations,
		results,
		responderTime,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
