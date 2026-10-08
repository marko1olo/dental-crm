import { and, eq, gte } from "drizzle-orm";
import { type TenantDb, withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	patients,
	payments,
	syncEntityVectors,
	toothStates,
	visitDiaries,
	visits,
} from "../../../db/schema.js";
import { SYNC_STREAM_CHUNK_SIZE } from "./constants.js";
import type { SyncNodeInfo, SyncPullResult } from "./types.js";

/**
 * WebSocket / Stream connection contract for distributed clinic nodes.
 */
export interface SyncStreamConnection {
	nodeId: string;
	organizationId: string;
	send(data: string): void;
	close(): void;
}

/**
 * Manages streaming data transport, batch chunking, and real-time node connections.
 */
export class SyncStreamTransport {
	private static activeConnections = new Map<string, SyncStreamConnection>();
	private static nodeRegistry = new Map<string, SyncNodeInfo>();

	/**
	 * Registers an active streaming transport connection from a branch node.
	 */
	public static registerNodeConnection(connection: SyncStreamConnection): void {
		this.activeConnections.set(connection.nodeId, connection);
		this.nodeRegistry.set(connection.nodeId, {
			nodeId: connection.nodeId,
			organizationId: connection.organizationId,
			status: "online",
			lastSeenAt: new Date().toISOString(),
			pendingMutationsCount: 0,
		});
	}

	/**
	 * Unregisters an offline or disconnected node connection.
	 */
	public static unregisterNodeConnection(nodeId: string): void {
		this.activeConnections.delete(nodeId);
		const existing = this.nodeRegistry.get(nodeId);
		if (existing) {
			this.nodeRegistry.set(nodeId, {
				...existing,
				status: "offline",
				lastSeenAt: new Date().toISOString(),
			});
		}
	}

	/**
	 * Broadcasts an event to all connected branch nodes within an organization.
	 */
	public static broadcastToOrganization(
		organizationId: string,
		payload: Record<string, unknown>,
	): number {
		let deliveredCount = 0;
		const message = JSON.stringify(payload);

		for (const [_, connection] of this.activeConnections) {
			if (connection.organizationId === organizationId) {
				try {
					connection.send(message);
					deliveredCount++;
				} catch {
					// Discard broken connections silently
				}
			}
		}

		return deliveredCount;
	}

	/**
	 * Chunks large mutation batches for memory-safe streaming without heap spikes.
	 */
	public static chunkBatch<T>(
		items: T[],
		chunkSize = SYNC_STREAM_CHUNK_SIZE,
	): T[][] {
		if (items.length <= chunkSize) {
			return [items];
		}
		const chunks: T[][] = [];
		for (let i = 0; i < items.length; i += chunkSize) {
			chunks.push(items.slice(i, i + chunkSize));
		}
		return chunks;
	}

	/**
	 * Pulls changed entities and vectors since a specified timestamp for offline client catch-up.
	 * Preserves tenant RLS context and exact database query topology.
	 */
	public static async pullChanges(
		organizationId: string,
		sinceIso?: string,
	): Promise<SyncPullResult> {
		const since = sinceIso ? new Date(sinceIso) : new Date(0);

		return await withTenantCtx(organizationId, async (tx: TenantDb) => {
			const [
				changedPatients,
				changedVisits,
				changedDiaries,
				changedPayments,
				changedAppointments,
				changedToothStates,
				changedVectors,
			] = await Promise.all([
				tx
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							gte(patients.updatedAt, since),
						),
					),
				tx
					.select()
					.from(visits)
					.where(
						and(
							eq(visits.organizationId, organizationId),
							gte(visits.updatedAt, since),
						),
					),
				tx
					.select()
					.from(visitDiaries)
					.where(
						and(
							eq(visitDiaries.organizationId, organizationId),
							gte(visitDiaries.updatedAt, since),
						),
					),
				tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, organizationId),
							gte(payments.updatedAt, since),
						),
					),
				tx
					.select()
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							gte(appointments.startsAt, since),
						),
					),
				tx
					.select()
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							gte(toothStates.updatedAt, since),
						),
					),
				tx
					.select()
					.from(syncEntityVectors)
					.where(
						and(
							eq(syncEntityVectors.organizationId, organizationId),
							gte(syncEntityVectors.updatedAt, since),
						),
					),
			]);

			return {
				serverTime: new Date().toISOString(),
				patients: changedPatients,
				visits: changedVisits,
				visitDiaries: changedDiaries,
				payments: changedPayments,
				appointments: changedAppointments,
				toothStates: changedToothStates,
				vectors: changedVectors,
			};
		});
	}
}
