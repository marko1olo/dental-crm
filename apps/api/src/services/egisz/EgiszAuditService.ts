import { createHash } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import type { db } from "../../db/client.js";
import { egiszAuditLogs } from "../../db/schema/clinical.js";

export type DbTransaction =
	| Parameters<Parameters<typeof db.transaction>[0]>[0]
	| typeof db
	// biome-ignore lint/suspicious/noExplicitAny: allow any drizzle transaction or connection adapter
	| any;

export const GENESIS_HASH =
	"0000000000000000000000000000000000000000000000000000000000000000";

export interface AppendEgiszAuditLogParams {
	organizationId: string;
	eventType: string;
	entityType: string;
	entityId: string;
	patientId?: string | null | undefined;
	actorUserId?: string | null | undefined;
	actorIpAddress?: string | null | undefined;
	actorUserAgent?: string | null | undefined;
	payload?: Record<string, unknown> | unknown;
	createdAt?: Date | undefined;
}

export interface EgiszAuditLogEntry {
	id: string;
	organizationId: string;
	sequenceNumber: number;
	previousHash: string;
	currentHash: string;
	eventType: string;
	entityType: string;
	entityId: string;
	patientId: string | null;
	actorUserId: string | null;
	actorIpAddress: string | null;
	actorUserAgent: string | null;
	payloadJson: unknown;
	payloadSha256: string;
	createdAt: Date;
}

export interface AuditIntegrityVerificationResult {
	valid: boolean;
	count: number;
	latestSequenceNumber?: number | undefined;
	latestHash?: string | undefined;
	failedSequenceNumber?: number | undefined;
	tamperedRowId?: string | undefined;
	reason?: string | undefined;
}

/**
 * Deterministic JSON stringification (RFC 8785 subset)
 * - Object keys sorted lexicographically
 * - Array elements canonicalized in order
 * - Primitives serialized deterministically
 * - Undefined object values omitted
 */
export function canonicalizeJson(obj: unknown): string {
	if (obj === null || typeof obj !== "object") {
		return JSON.stringify(obj);
	}
	if (Array.isArray(obj)) {
		return `[${obj.map((item) => canonicalizeJson(item)).join(",")}]`;
	}
	const record = obj as Record<string, unknown>;
	const sortedKeys = Object.keys(record)
		.filter((k) => record[k] !== undefined)
		.sort();
	const pairs = sortedKeys.map(
		(key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`,
	);
	return `{${pairs.join(",")}}`;
}

/**
 * Computes SHA-256 digest of canonicalized JSON payload.
 */
export function computePayloadSha256(payload: unknown): string {
	const canonical = canonicalizeJson(payload ?? {});
	return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Computes SHA-256 digest for an audit entry according to the contract:
 * current_hash = SHA256(previous_hash + ":" + sequence_number + ":" + organization_id + ":" + event_type + ":" + entity_type + ":" + entity_id + ":" + payload_sha256 + ":" + timestamp_iso + ":" + actor_user_id)
 */
export function computeAuditEntryHash(params: {
	previousHash: string;
	sequenceNumber: number;
	organizationId: string;
	eventType: string;
	entityType: string;
	entityId: string;
	payloadSha256: string;
	timestampIso: string;
	actorUserId?: string | null | undefined;
}): string {
	const actorUserId = params.actorUserId ?? "";
	const dataToHash = `${params.previousHash}:${params.sequenceNumber}:${params.organizationId}:${params.eventType}:${params.entityType}:${params.entityId}:${params.payloadSha256}:${params.timestampIso}:${actorUserId}`;
	return createHash("sha256").update(dataToHash, "utf8").digest("hex");
}

/**
 * Appends a new immutable EGISZ audit log entry to the hash chain.
 * Uses PostgreSQL SELECT ... FOR UPDATE row-level locking on the tenant's tail sequence number
 * to guarantee strict serialization without ledger branches or race conditions.
 */
export async function appendEgiszAuditLog(
	tx: DbTransaction,
	params: AppendEgiszAuditLogParams,
): Promise<EgiszAuditLogEntry> {
	// 1. Lock the latest audit record for this tenant
	const [lastRow] = await tx
		.select({
			sequenceNumber: egiszAuditLogs.sequenceNumber,
			currentHash: egiszAuditLogs.currentHash,
		})
		.from(egiszAuditLogs)
		.where(eq(egiszAuditLogs.organizationId, params.organizationId))
		.orderBy(desc(egiszAuditLogs.sequenceNumber))
		.limit(1)
		.for("update");

	const sequenceNumber = lastRow ? Number(lastRow.sequenceNumber) + 1 : 1;
	const previousHash = lastRow ? String(lastRow.currentHash) : GENESIS_HASH;

	const payload = params.payload ?? {};
	const payloadSha256 = computePayloadSha256(payload);
	const createdAt = params.createdAt ?? new Date();
	const timestampIso = createdAt.toISOString();

	const currentHash = computeAuditEntryHash({
		previousHash,
		sequenceNumber,
		organizationId: params.organizationId,
		eventType: params.eventType,
		entityType: params.entityType,
		entityId: params.entityId,
		payloadSha256,
		timestampIso,
		actorUserId: params.actorUserId ?? null,
	});

	const [inserted] = await tx
		.insert(egiszAuditLogs)
		.values({
			organizationId: params.organizationId,
			sequenceNumber,
			previousHash,
			currentHash,
			eventType: params.eventType,
			entityType: params.entityType,
			entityId: params.entityId,
			patientId: params.patientId ?? null,
			actorUserId: params.actorUserId ?? null,
			actorIpAddress: params.actorIpAddress ?? null,
			actorUserAgent: params.actorUserAgent ?? null,
			payloadJson: payload,
			payloadSha256,
			createdAt,
		})
		.returning();

	if (!inserted) {
		throw new Error(
			`[EgiszAuditService] Failed to insert audit log entry for organization ${params.organizationId}`,
		);
	}

	return {
		id: inserted.id,
		organizationId: inserted.organizationId,
		sequenceNumber: Number(inserted.sequenceNumber),
		previousHash: inserted.previousHash,
		currentHash: inserted.currentHash,
		eventType: inserted.eventType,
		entityType: inserted.entityType,
		entityId: inserted.entityId,
		patientId: inserted.patientId,
		actorUserId: inserted.actorUserId,
		actorIpAddress: inserted.actorIpAddress,
		actorUserAgent: inserted.actorUserAgent,
		payloadJson: inserted.payloadJson,
		payloadSha256: inserted.payloadSha256,
		createdAt: inserted.createdAt,
	};
}

/**
 * Pure function to verify cryptographic integrity of an audit log rows array in memory.
 */
export function verifyAuditLogChain(
	rows: Array<{
		id: string;
		organizationId: string;
		sequenceNumber: number | bigint;
		previousHash: string;
		currentHash: string;
		eventType: string;
		entityType: string;
		entityId: string;
		patientId?: string | null | undefined;
		actorUserId?: string | null | undefined;
		payloadJson: unknown;
		payloadSha256: string;
		createdAt: Date | string;
	}>,
): AuditIntegrityVerificationResult {
	if (rows.length === 0) {
		return {
			valid: true,
			count: 0,
		};
	}

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (!row) {
			return {
				valid: false,
				count: rows.length,
				reason: `Missing row at index ${i}`,
			};
		}
		const seq = Number(row.sequenceNumber);
		const expectedSeq = i + 1;

		if (seq !== expectedSeq) {
			return {
				valid: false,
				count: rows.length,
				failedSequenceNumber: seq,
				tamperedRowId: row.id,
				reason: `Sequence break: expected sequence number ${expectedSeq}, found ${seq}`,
			};
		}

		const prevRow = i > 0 ? rows[i - 1] : undefined;
		const expectedPrevHash =
			i === 0 ? GENESIS_HASH : (prevRow?.currentHash ?? GENESIS_HASH);

		if (row.previousHash !== expectedPrevHash) {
			return {
				valid: false,
				count: rows.length,
				failedSequenceNumber: seq,
				tamperedRowId: row.id,
				reason: `Previous hash mismatch at sequence ${seq}: expected ${expectedPrevHash}, found ${row.previousHash}`,
			};
		}

		// Recompute payload SHA-256
		const recomputedPayloadSha256 = computePayloadSha256(row.payloadJson);
		if (row.payloadSha256 !== recomputedPayloadSha256) {
			return {
				valid: false,
				count: rows.length,
				failedSequenceNumber: seq,
				tamperedRowId: row.id,
				reason: `Payload hash mismatch at sequence ${seq}: expected ${recomputedPayloadSha256}, found ${row.payloadSha256}`,
			};
		}

		// Recompute current hash
		const timestampIso =
			row.createdAt instanceof Date
				? row.createdAt.toISOString()
				: new Date(row.createdAt).toISOString();

		const recomputedCurrentHash = computeAuditEntryHash({
			previousHash: row.previousHash,
			sequenceNumber: seq,
			organizationId: row.organizationId,
			eventType: row.eventType,
			entityType: row.entityType,
			entityId: row.entityId,
			payloadSha256: row.payloadSha256,
			timestampIso,
			actorUserId: row.actorUserId ?? null,
		});

		if (row.currentHash !== recomputedCurrentHash) {
			return {
				valid: false,
				count: rows.length,
				failedSequenceNumber: seq,
				tamperedRowId: row.id,
				reason: `Current hash mismatch at sequence ${seq}: expected ${recomputedCurrentHash}, found ${row.currentHash}`,
			};
		}
	}

	const lastRow = rows[rows.length - 1];
	return {
		valid: true,
		count: rows.length,
		latestSequenceNumber: lastRow ? Number(lastRow.sequenceNumber) : undefined,
		latestHash: lastRow ? lastRow.currentHash : undefined,
	};
}

/**
 * Verifies the unbroken cryptographic chain across all rows for a given organization in the database.
 *
 * @guard requireClinicalReadAccess / requireClinicalReadContext / requireSettingsAccess
 * @caller EGISZ audit reporting endpoints, compliance integrity auditors, forensic verification routines
 * @param tx Drizzle transaction or database client instance
 * @param organizationId Multi-tenant organization UUID boundary
 * @returns Cryptographic integrity verification report with validation flag and tamper details if broken
 */
export async function verifyAuditLogIntegrity(
	tx: DbTransaction,
	organizationId: string,
): Promise<AuditIntegrityVerificationResult> {
	const rows = await tx
		.select()
		.from(egiszAuditLogs)
		.where(eq(egiszAuditLogs.organizationId, organizationId))
		.orderBy(asc(egiszAuditLogs.sequenceNumber));

	return verifyAuditLogChain(rows);
}
