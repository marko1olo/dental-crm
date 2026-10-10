import { computePayloadHash } from "../hashing.js";
import { incrementVectorClock } from "../mesh.js";
import { compareEntityVectors } from "./ordering.js";
import { reconcileSplitBrainEntity } from "./reconciliation.js";
import type {
	SplitBrainReconciliationInput,
	SplitBrainReconciliationResult,
	SyncEntityVector,
} from "./types.js";

/**
 * In-memory / persistent table manager for tracking `sync_entity_vectors` across
 * the clinic network and managing split-brain re-convergence.
 */
export class VectorClockEngine {
	private readonly nodeId: string;
	private readonly vectors = new Map<string, SyncEntityVector>();

	constructor(nodeId?: string) {
		this.nodeId = (nodeId && typeof nodeId === "string" ? nodeId.trim() : "") || "default-node";
	}

	getNodeId(): string {
		return this.nodeId;
	}

	private makeKey(entityKind: string, entityId: string): string {
		return `${entityKind}:${entityId}`;
	}

	/**
	 * Records a local or remote mutation, advancing the vector clock for the given nodeId.
	 */
	recordMutation(
		entityKind: string,
		entityId: string,
		actingNodeId = this.nodeId,
		timestampMs = Date.now(),
		stateHash?: string,
	): SyncEntityVector {
		const key = this.makeKey(entityKind, entityId);
		const existing = this.vectors.get(key);

		const baseClock = existing?.vectorClock ? { ...existing.vectorClock } : {};
		const updatedClock = incrementVectorClock(baseClock, actingNodeId);

		const updatedVector: SyncEntityVector = {
			entityKind,
			entityId,
			vectorClock: updatedClock,
			updatedAtMs: Math.max(timestampMs, (existing?.updatedAtMs ?? 0) + 1),
			lastModifiedByNodeId: actingNodeId,
			stateHash: stateHash ?? existing?.stateHash,
		};

		this.vectors.set(key, updatedVector);
		return updatedVector;
	}

	/**
	 * Increments the vector clock for an entity mutation.
	 */
	incrementVector(
		entityKind: string,
		entityId: string,
		actingNodeId = this.nodeId,
	): SyncEntityVector {
		return this.recordMutation(entityKind, entityId, actingNodeId);
	}

	/**
	 * Fetches vector clock for a specific entity.
	 */
	getEntityVector(entityKind: string, entityId: string): SyncEntityVector | undefined {
		return this.vectors.get(this.makeKey(entityKind, entityId));
	}

	/**
	 * Direct setter for synchronizing entity vectors.
	 */
	setEntityVector(vector: SyncEntityVector): void {
		this.vectors.set(this.makeKey(vector.entityKind, vector.entityId), { ...vector });
	}

	/**
	 * Returns all tracked entity vectors.
	 */
	getAllVectors(): SyncEntityVector[] {
		return Array.from(this.vectors.values());
	}

	/**
	 * Exports all entity vectors for LAN exchange.
	 */
	exportSyncEntityVectors(): SyncEntityVector[] {
		return this.getAllVectors();
	}

	/**
	 * Ingests remote entity vectors and returns keys that are divergent (split-brain).
	 */
	detectDivergentEntities(remoteVectors: SyncEntityVector[]): {
		divergent: Array<{ local: SyncEntityVector; remote: SyncEntityVector }>;
		remoteNewer: SyncEntityVector[];
		localNewer: SyncEntityVector[];
		identical: SyncEntityVector[];
	} {
		const divergent: Array<{ local: SyncEntityVector; remote: SyncEntityVector }> = [];
		const remoteNewer: SyncEntityVector[] = [];
		const localNewer: SyncEntityVector[] = [];
		const identical: SyncEntityVector[] = [];

		for (const remote of remoteVectors) {
			const local = this.getEntityVector(remote.entityKind, remote.entityId);
			if (!local) {
				remoteNewer.push(remote);
				continue;
			}

			const relation = compareEntityVectors(local.vectorClock, remote.vectorClock);
			if (relation === "identical") {
				identical.push(local);
			} else if (relation === "remote_dominates") {
				remoteNewer.push(remote);
			} else if (relation === "local_dominates") {
				localNewer.push(local);
			} else {
				divergent.push({ local, remote });
			}
		}

		return { divergent, remoteNewer, localNewer, identical };
	}

	/**
	 * Full reconciliation between local entity state and remote entity state.
	 * Automatically records the resulting merged vector clock in the local engine table.
	 */
	reconcile(input: Omit<SplitBrainReconciliationInput, "reconcilingNodeId">): SplitBrainReconciliationResult {
		const result = reconcileSplitBrainEntity({
			...input,
			reconcilingNodeId: this.nodeId,
		});

		this.setEntityVector({
			entityKind: input.entityKind,
			entityId: input.entityId,
			vectorClock: result.mergedVectorClock,
			updatedAtMs: Math.max(input.localUpdatedAtMs ?? 0, input.remoteUpdatedAtMs ?? 0, Date.now()),
			lastModifiedByNodeId: this.nodeId,
			stateHash: computePayloadHash(result.mergedState),
		});

		return result;
	}

	size(): number {
		return this.vectors.size;
	}

	clear(): void {
		this.vectors.clear();
	}
}
