import { type SQL, and, asc, eq, gt, gte, inArray, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { BoundedTtlMap } from "../../../lib/boundedTtlMap.js";
import { type TenantDb, withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	patientInvoices,
	patients,
	payments,
	syncEntityVectors,
	syncTombstones,
	toothStates,
	visitDiaries,
	visits,
} from "../../../db/schema.js";
import { SYNC_STREAM_CHUNK_SIZE } from "./constants.js";
import type { SyncNodeInfo, SyncPullOptions, SyncPullResult } from "./types.js";

const CURSOR_PREFIX = "keyset:v1:";

export interface StreamKeysetPoint {
	ts: string;
	id: string;
}

export interface CompositeSyncPullCursor {
	sinceIso: string;
	vectors?: StreamKeysetPoint | undefined;
	patients?: StreamKeysetPoint | undefined;
	visits?: StreamKeysetPoint | undefined;
	visitDiaries?: StreamKeysetPoint | undefined;
	payments?: StreamKeysetPoint | undefined;
	appointments?: StreamKeysetPoint | undefined;
	toothStates?: StreamKeysetPoint | undefined;
	invoices?: StreamKeysetPoint | undefined;
	tombstones?: StreamKeysetPoint | undefined;
}

export function encodeSyncPullCursor(cursor: CompositeSyncPullCursor): string {
	return `${CURSOR_PREFIX}${Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url")}`;
}

export function decodeSyncPullCursor(
	cursorOrIso?: string,
	sinceIso?: string,
): CompositeSyncPullCursor | null {
	const raw = cursorOrIso || sinceIso;
	if (!raw) return null;
	if (raw.startsWith(CURSOR_PREFIX)) {
		try {
			const parsed = JSON.parse(
				Buffer.from(raw.slice(CURSOR_PREFIX.length), "base64url").toString("utf8"),
			) as CompositeSyncPullCursor;
			if (parsed && typeof parsed === "object" && typeof parsed.sinceIso === "string") {
				return parsed;
			}
		} catch {
			return null;
		}
	}
	const parsedDate = new Date(raw);
	if (Number.isNaN(parsedDate.getTime())) return null;
	return { sinceIso: parsedDate.toISOString() };
}

function buildTupleKeysetWhere(
	tsColumn: AnyPgColumn,
	idColumn: AnyPgColumn,
	point: StreamKeysetPoint | undefined,
	fallbackSince: Date,
	isInitialSync: boolean,
): SQL | undefined {
	if (point) {
		const cursorTs = new Date(point.ts);
		if (!Number.isNaN(cursorTs.getTime())) {
			return or(
				gt(tsColumn, cursorTs),
				and(eq(tsColumn, cursorTs), gt(idColumn, point.id)),
			);
		}
	}
	if (isInitialSync) {
		return undefined;
	}
	return gte(tsColumn, fallbackSince);
}

function extractLastPoint(
	rows: readonly Record<string, unknown>[],
	tsField: string,
	prev: StreamKeysetPoint | undefined,
): StreamKeysetPoint | undefined {
	if (rows.length === 0) return prev;
	const last = rows[rows.length - 1];
	if (!last || typeof last.id !== "string") return prev;
	const rawTs = last[tsField];
	if (!(rawTs instanceof Date) && typeof rawTs !== "string") return prev;
	const dateObj = rawTs instanceof Date ? rawTs : new Date(rawTs);
	if (Number.isNaN(dateObj.getTime())) return prev;
	return { ts: dateObj.toISOString(), id: last.id };
}

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
	private static activeConnections = new BoundedTtlMap<string, SyncStreamConnection>({
		maxEntries: MAX_NODE_REGISTRY_ENTRIES,
		touchOnGet: false,
		onEvict: (_nodeId, connection, reason) => {
			if (reason === "capacity") {
				try {
					connection.close();
				} catch {
					// socket may already be closed during eviction
				}
			}
		},
	});
	private static nodeRegistry = new BoundedTtlMap<string, SyncNodeInfo>({
		maxEntries: MAX_NODE_REGISTRY_ENTRIES,
		ttlMs: NODE_REGISTRY_TTL_MS,
	});

	private static pruneNodeRegistry(nowMs = Date.now()): void {
		this.nodeRegistry.pruneExpired(nowMs);
		for (const [nodeId, info] of this.nodeRegistry.entries()) {
			if (this.activeConnections.has(nodeId)) continue;
			const lastSeenMs = Date.parse(info.lastSeenAt);
			if (Number.isFinite(lastSeenMs) && nowMs - lastSeenMs > NODE_REGISTRY_TTL_MS) {
				this.nodeRegistry.delete(nodeId);
			}
		}

		while (this.nodeRegistry.size > MAX_NODE_REGISTRY_ENTRIES) {
			let oldestKey: string | null = null;
			let oldestTime = Number.POSITIVE_INFINITY;
			for (const [nodeId, info] of this.nodeRegistry.entries()) {
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
		const decodedCursor = decodeSyncPullCursor(options?.cursor, sinceIso);
		const parsedSince = decodedCursor ? new Date(decodedCursor.sinceIso) : new Date(0);
		const since = Number.isNaN(parsedSince.getTime()) ? new Date(0) : parsedSince;
		const isInitialSync = since.getTime() === 0;
		const requestedLimit = options?.limit ?? DEFAULT_SYNC_PULL_LIMIT;
		const limit = Math.max(1, Math.min(Math.trunc(requestedLimit), MAX_SYNC_PULL_LIMIT));
		const queryLimit = limit + 1;

		return await withTenantCtx(organizationId, async (tx: TenantDb) => {
			const vectorsKeyset = buildTupleKeysetWhere(
				syncEntityVectors.updatedAt,
				syncEntityVectors.id,
				decodedCursor?.vectors,
				since,
				isInitialSync,
			);

			// Query changed vectors first using deterministic tuple keyset (updated_at, id)
			const rawVectors = await tx
				.select()
				.from(syncEntityVectors)
				.where(
					vectorsKeyset
						? and(eq(syncEntityVectors.organizationId, organizationId), vectorsKeyset)
						: eq(syncEntityVectors.organizationId, organizationId),
				)
				.orderBy(asc(syncEntityVectors.updatedAt), asc(syncEntityVectors.id))
				.limit(queryLimit);

			const changedVectors = rawVectors.slice(0, limit);
			const changedAppointmentIds = changedVectors
				.filter((v) => v.entityKind === "appointment")
				.map((v) => v.entityId);
			const changedInvoiceIds = changedVectors
				.filter((v) => v.entityKind === "patient_invoice")
				.map((v) => v.entityId);

			const apptKeyset = buildTupleKeysetWhere(
				appointments.startsAt,
				appointments.id,
				decodedCursor?.appointments,
				since,
				isInitialSync,
			);
			const appointmentCondition =
				decodedCursor?.appointments && apptKeyset
					? and(eq(appointments.organizationId, organizationId), apptKeyset)
					: isInitialSync
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
			const invoiceKeyset = buildTupleKeysetWhere(
				patientInvoices.createdAt,
				patientInvoices.id,
				decodedCursor?.invoices,
				since,
				isInitialSync,
			);
			const invoiceCondition =
				decodedCursor?.invoices && invoiceKeyset
					? and(eq(patientInvoices.organizationId, organizationId), invoiceKeyset)
					: isInitialSync
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

			const patientsKeyset = buildTupleKeysetWhere(patients.updatedAt, patients.id, decodedCursor?.patients, since, isInitialSync);
			const visitsKeyset = buildTupleKeysetWhere(visits.updatedAt, visits.id, decodedCursor?.visits, since, isInitialSync);
			const diariesKeyset = buildTupleKeysetWhere(visitDiaries.updatedAt, visitDiaries.id, decodedCursor?.visitDiaries, since, isInitialSync);
			const paymentsKeyset = buildTupleKeysetWhere(payments.updatedAt, payments.id, decodedCursor?.payments, since, isInitialSync);
			const toothKeyset = buildTupleKeysetWhere(toothStates.updatedAt, toothStates.id, decodedCursor?.toothStates, since, isInitialSync);
			const tombstonesKeyset = buildTupleKeysetWhere(syncTombstones.deletedAt, syncTombstones.id, decodedCursor?.tombstones, since, isInitialSync);

			const [
				rawPatients,
				rawVisits,
				rawDiaries,
				rawPayments,
				rawAppointments,
				rawToothStates,
				rawInvoices,
				rawTombstones,
			] = await Promise.all([
				tx
					.select()
					.from(patients)
					.where(
						patientsKeyset
							? and(eq(patients.organizationId, organizationId), patientsKeyset)
							: eq(patients.organizationId, organizationId),
					)
					.orderBy(asc(patients.updatedAt), asc(patients.id))
					.limit(queryLimit),
				tx
					.select()
					.from(visits)
					.where(
						visitsKeyset
							? and(eq(visits.organizationId, organizationId), visitsKeyset)
							: eq(visits.organizationId, organizationId),
					)
					.orderBy(asc(visits.updatedAt), asc(visits.id))
					.limit(queryLimit),
				tx
					.select()
					.from(visitDiaries)
					.where(
						diariesKeyset
							? and(eq(visitDiaries.organizationId, organizationId), diariesKeyset)
							: eq(visitDiaries.organizationId, organizationId),
					)
					.orderBy(asc(visitDiaries.updatedAt), asc(visitDiaries.id))
					.limit(queryLimit),
				tx
					.select()
					.from(payments)
					.where(
						paymentsKeyset
							? and(eq(payments.organizationId, organizationId), paymentsKeyset)
							: eq(payments.organizationId, organizationId),
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
						toothKeyset
							? and(eq(toothStates.organizationId, organizationId), toothKeyset)
							: eq(toothStates.organizationId, organizationId),
					)
					.orderBy(asc(toothStates.updatedAt), asc(toothStates.id))
					.limit(queryLimit),
				tx
					.select()
					.from(patientInvoices)
					.where(invoiceCondition)
					.orderBy(asc(patientInvoices.createdAt), asc(patientInvoices.id))
					.limit(queryLimit),
				tx
					.select()
					.from(syncTombstones)
					.where(
						tombstonesKeyset
							? and(eq(syncTombstones.organizationId, organizationId), tombstonesKeyset)
							: eq(syncTombstones.organizationId, organizationId),
					)
					.orderBy(asc(syncTombstones.deletedAt), asc(syncTombstones.id))
					.limit(queryLimit),
			] as const);

			const changedPatients = rawPatients.slice(0, limit);
			const changedVisits = rawVisits.slice(0, limit);
			const changedDiaries = rawDiaries.slice(0, limit);
			const changedPayments = rawPayments.slice(0, limit);
			const changedAppointments = rawAppointments.slice(0, limit);
			const changedToothStates = rawToothStates.slice(0, limit);
			const changedInvoices = rawInvoices.slice(0, limit);
			const changedTombstones = rawTombstones.slice(0, limit);

			const hasMore =
				rawVectors.length > limit ||
				rawPatients.length > limit ||
				rawVisits.length > limit ||
				rawDiaries.length > limit ||
				rawPayments.length > limit ||
				rawAppointments.length > limit ||
				rawToothStates.length > limit ||
				rawInvoices.length > limit ||
				rawTombstones.length > limit;

			const serverTime = new Date().toISOString();
			const nextCursor = hasMore
				? encodeSyncPullCursor({
						sinceIso: since.toISOString(),
						vectors: extractLastPoint(changedVectors, "updatedAt", decodedCursor?.vectors),
						patients: extractLastPoint(changedPatients, "updatedAt", decodedCursor?.patients),
						visits: extractLastPoint(changedVisits, "updatedAt", decodedCursor?.visits),
						visitDiaries: extractLastPoint(changedDiaries, "updatedAt", decodedCursor?.visitDiaries),
						payments: extractLastPoint(changedPayments, "updatedAt", decodedCursor?.payments),
						appointments: extractLastPoint(changedAppointments, "startsAt", decodedCursor?.appointments),
						toothStates: extractLastPoint(changedToothStates, "updatedAt", decodedCursor?.toothStates),
						invoices: extractLastPoint(changedInvoices, "createdAt", decodedCursor?.invoices),
						tombstones: extractLastPoint(changedTombstones, "deletedAt", decodedCursor?.tombstones),
					})
				: null;

			return {
				serverTime,
				nextCursor,
				hasMore,
				limit,
				patients: changedPatients,
				visits: changedVisits,
				visitDiaries: changedDiaries,
				payments: changedPayments,
				appointments: changedAppointments,
				toothStates: changedToothStates,
				vectors: changedVectors,
				tombstones: changedTombstones,
				invoices: changedInvoices,
			};
		});
	}
}
