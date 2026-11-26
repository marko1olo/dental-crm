import { and, asc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { type TenantDb, withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	patientInvoices,
	patients,
	payments,
	syncEntityVectors,
	toothStates,
	visitDiaries,
	visits,
} from "../../../db/schema.js";
import { SYNC_STREAM_CHUNK_SIZE } from "./constants.js";
import type { SyncNodeInfo, SyncPullOptions, SyncPullResult } from "./types.js";

const MAX_NODE_REGISTRY_ENTRIES = 1000;
const NODE_REGISTRY_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SYNC_PULL_LIMIT = 200;
const MAX_SYNC_PULL_LIMIT = 1000;

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

	private static pruneNodeRegistry(nowMs = Date.now()): void {
		for (const [nodeId, info] of this.nodeRegistry) {
			if (this.activeConnections.has(nodeId)) continue;
			const lastSeenMs = Date.parse(info.lastSeenAt);
			if (Number.isFinite(lastSeenMs) && nowMs - lastSeenMs > NODE_REGISTRY_TTL_MS) {
				this.nodeRegistry.delete(nodeId);
			}
		}

		while (this.nodeRegistry.size > MAX_NODE_REGISTRY_ENTRIES) {
			let oldestKey: string | null = null;
			let oldestTime = Number.POSITIVE_INFINITY;
			for (const [nodeId, info] of this.nodeRegistry) {
				if (this.activeConnections.has(nodeId)) continue;
				const lastSeenMs = Date.parse(info.lastSeenAt);
				const score = Number.isFinite(lastSeenMs) ? lastSeenMs : 0;
				if (score < oldestTime) {
					oldestTime = score;
					oldestKey = nodeId;
				}
			}
			if (!oldestKey) break;
			this.nodeRegistry.delete(oldestKey);
		}
	}

	/**
	 * Registers an active streaming transport connection from a branch node.
	 */
	public static registerNodeConnection(connection: SyncStreamConnection): void {
		this.pruneNodeRegistry();
		this.activeConnections.set(connection.nodeId, connection);
		this.nodeRegistry.set(connection.nodeId, {
			nodeId: connection.nodeId,
			organizationId: connection.organizationId,
			status: "online",
			lastSeenAt: new Date().toISOString(),
			pendingMutationsCount: 0,
		});
		this.pruneNodeRegistry();
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
		this.pruneNodeRegistry();
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

		const deadNodeIds: string[] = [];
		for (const [nodeId, connection] of this.activeConnections) {
			if (connection.organizationId === organizationId) {
				try {
					connection.send(message);
					deliveredCount++;
				} catch {
					deadNodeIds.push(nodeId);
				}
			}
		}

		for (const deadId of deadNodeIds) {
			this.activeConnections.delete(deadId);
			this.nodeRegistry.delete(deadId);
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
	 * Pulls changed entities and vectors since a specified timestamp/cursor for offline client catch-up.
	 * Preserves tenant RLS context, enforces bounded batch limits, and captures paid/issued invoice updates.
	 */
	public static async pullChanges(
		organizationId: string,
		sinceIso?: string,
		options?: SyncPullOptions,
	): Promise<SyncPullResult> {
		const effectiveSinceIso = options?.cursor || sinceIso;
		const parsedSince = effectiveSinceIso ? new Date(effectiveSinceIso) : new Date(0);
		const since = Number.isNaN(parsedSince.getTime()) ? new Date(0) : parsedSince;
		const isInitialSync = since.getTime() === 0;
		const requestedLimit = options?.limit ?? DEFAULT_SYNC_PULL_LIMIT;
		const limit = Math.max(1, Math.min(Math.trunc(requestedLimit), MAX_SYNC_PULL_LIMIT));
		const queryLimit = limit + 1;

		return await withTenantCtx(organizationId, async (tx: TenantDb) => {
			// Query changed vectors first to capture historical entity mutations (e.g. past appointment cancellations)
			const rawVectors = await tx
				.select()
				.from(syncEntityVectors)
				.where(
					and(
						eq(syncEntityVectors.organizationId, organizationId),
						isInitialSync ? sql`TRUE` : gte(syncEntityVectors.updatedAt, since),
					),
				)
				.orderBy(asc(syncEntityVectors.updatedAt), asc(syncEntityVectors.entityId))
				.limit(queryLimit);

			const changedVectors = rawVectors.slice(0, limit);
			const changedAppointmentIds = changedVectors
				.filter((v) => v.entityKind === "appointment")
				.map((v) => v.entityId);
			const changedInvoiceIds = changedVectors
				.filter((v) => v.entityKind === "patient_invoice")
				.map((v) => v.entityId);

			const appointmentCondition = isInitialSync
				? eq(appointments.organizationId, organizationId)
				: changedAppointmentIds.length > 0
					? and(
							eq(appointments.organizationId, organizationId),
							or(
								gte(appointments.startsAt, since),
								inArray(appointments.id, changedAppointmentIds),
							),
						)
					: and(
							eq(appointments.organizationId, organizationId),
							gte(appointments.startsAt, since),
						);

			const invoiceTimeCondition = or(
				gte(patientInvoices.createdAt, since),
				gte(patientInvoices.paidAt, since),
				gte(patientInvoices.issuedAt, since),
			);

			const invoiceCondition = isInitialSync
				? eq(patientInvoices.organizationId, organizationId)
				: changedInvoiceIds.length > 0
					? and(
							eq(patientInvoices.organizationId, organizationId),
							or(invoiceTimeCondition, inArray(patientInvoices.id, changedInvoiceIds)),
						)
					: and(
							eq(patientInvoices.organizationId, organizationId),
							invoiceTimeCondition,
						);

			const [
				rawPatients,
				rawVisits,
				rawDiaries,
				rawPayments,
				rawAppointments,
				rawToothStates,
				rawInvoices,
			] = await Promise.all([
				tx
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							isInitialSync ? sql`TRUE` : gte(patients.updatedAt, since),
						),
					)
					.orderBy(asc(patients.updatedAt), asc(patients.id))
					.limit(queryLimit),
				tx
					.select()
					.from(visits)
					.where(
						and(
							eq(visits.organizationId, organizationId),
							isInitialSync ? sql`TRUE` : gte(visits.updatedAt, since),
						),
					)
					.orderBy(asc(visits.updatedAt), asc(visits.id))
					.limit(queryLimit),
				tx
					.select()
					.from(visitDiaries)
					.where(
						and(
							eq(visitDiaries.organizationId, organizationId),
							isInitialSync ? sql`TRUE` : gte(visitDiaries.updatedAt, since),
						),
					)
					.orderBy(asc(visitDiaries.updatedAt), asc(visitDiaries.id))
					.limit(queryLimit),
				tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, organizationId),
							isInitialSync ? sql`TRUE` : gte(payments.updatedAt, since),
						),
					)
					.orderBy(asc(payments.updatedAt), asc(payments.id))
					.limit(queryLimit),
				tx
					.select()
					.from(appointments)
					.where(appointmentCondition)
					.orderBy(asc(appointments.startsAt), asc(appointments.id))
					.limit(queryLimit),
				tx
					.select()
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							isInitialSync ? sql`TRUE` : gte(toothStates.updatedAt, since),
						),
					)
					.orderBy(asc(toothStates.updatedAt), asc(toothStates.id))
					.limit(queryLimit),
				tx
					.select()
					.from(patientInvoices)
					.where(invoiceCondition)
					.orderBy(asc(patientInvoices.createdAt), asc(patientInvoices.id))
					.limit(queryLimit),
			]);

			const changedPatients = rawPatients.slice(0, limit);
			const changedVisits = rawVisits.slice(0, limit);
			const changedDiaries = rawDiaries.slice(0, limit);
			const changedPayments = rawPayments.slice(0, limit);
			const changedAppointments = rawAppointments.slice(0, limit);
			const changedToothStates = rawToothStates.slice(0, limit);
			const changedInvoices = rawInvoices.slice(0, limit);

			const hasMore =
				rawVectors.length > limit ||
				rawPatients.length > limit ||
				rawVisits.length > limit ||
				rawDiaries.length > limit ||
				rawPayments.length > limit ||
				rawAppointments.length > limit ||
				rawToothStates.length > limit ||
				rawInvoices.length > limit;

			const serverTime = new Date().toISOString();

			return {
				serverTime,
				nextCursor: hasMore ? serverTime : null,
				hasMore,
				limit,
				patients: changedPatients,
				visits: changedVisits,
				visitDiaries: changedDiaries,
				payments: changedPayments,
				appointments: changedAppointments,
				toothStates: changedToothStates,
				vectors: changedVectors,
				invoices: changedInvoices,
			};
		});
	}
}
