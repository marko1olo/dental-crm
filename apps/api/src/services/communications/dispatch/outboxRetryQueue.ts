/**
 * @file outboxRetryQueue.ts
 * @description Layer 2: Outbox queue locking, transaction isolation,
 * stuck lock release, remainder counting, and patient rate limit accounting.
 */

import {
	and,
	eq,
	gt,
	inArray,
	isNotNull,
	lt,
	lte,
	notInArray,
	or,
	sql,
} from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	communicationOutbox,
	patientCommunicationConsents,
} from "../../../db/schema.js";
import type {
	CommunicationChannelCode,
	CommunicationConsentScope,
} from "../channelRouter.js";
import type { ConsentRecord } from "../deliveryPolicy.js";
import type { OutboxRow } from "./types.js";

/**
 * Возврат зависших захватов. Процесс мог упасть между «пометил sending» и
 * «записал результат»; без этого такие строки не отправятся никогда.
 */
export async function releaseStuckLocks(
	now: Date,
	stuckLockMinutes: number,
	organizationId: string | null,
): Promise<number> {
	const threshold = new Date(now.getTime() - stuckLockMinutes * 60_000);
	const scope = [
		eq(communicationOutbox.status, "sending" as const),
		or(
			lt(communicationOutbox.lockedAt, threshold),
			sql`${communicationOutbox.lockedAt} IS NULL`,
		),
	];
	if (organizationId)
		scope.push(eq(communicationOutbox.organizationId, organizationId));

	const released = await db
		.update(communicationOutbox)
		.set({
			status: "queued",
			lockedAt: null,
			lockedBy: null,
			nextAttemptAt: now,
			updatedAt: now,
		})
		.where(and(...scope))
		.returning({ id: communicationOutbox.id });
	return released.length;
}

/**
 * Захват пачки. SKIP LOCKED пропускает строки, которые уже держит другой
 * процесс: две копии сервера не отправят одно напоминание дважды.
 */
export async function claimBatch(
	now: Date,
	batchSize: number,
	workerId: string,
	organizationId: string | null,
): Promise<OutboxRow[]> {
	return db.transaction(async (tx) => {
		const scope = [
			eq(communicationOutbox.status, "queued" as const),
			lte(communicationOutbox.nextAttemptAt, now),
		];
		if (organizationId)
			scope.push(eq(communicationOutbox.organizationId, organizationId));

		const candidates = await tx
			.select({ id: communicationOutbox.id })
			.from(communicationOutbox)
			.where(and(...scope))
			.orderBy(communicationOutbox.nextAttemptAt)
			.limit(batchSize)
			.for("update", { skipLocked: true });

		if (candidates.length === 0) return [];

		return tx
			.update(communicationOutbox)
			.set({
				status: "sending",
				lockedAt: now,
				lockedBy: workerId,
				updatedAt: now,
			})
			.where(
				inArray(
					communicationOutbox.id,
					candidates.map((row) => row.id),
				),
			)
			.returning();
	});
}

/**
 * Что осталось лежать в очереди со сроком в будущем. `handledIds` — строки этого
 * прохода: они уже названы своими счётчиками (`retried`, `deferred`), и считать их
 * второй раз значило бы показать администратору удвоенное число.
 */
export async function countQueueRemainder(
	now: Date,
	organizationId: string | null,
	handledIds: readonly string[],
): Promise<{ awaitingRetry: number; awaitingSchedule: number }> {
	const scope = [
		eq(communicationOutbox.status, "queued" as const),
		gt(communicationOutbox.nextAttemptAt, now),
	];
	if (organizationId)
		scope.push(eq(communicationOutbox.organizationId, organizationId));
	if (handledIds.length > 0)
		scope.push(notInArray(communicationOutbox.id, [...handledIds]));

	const [row] = await db
		.select({
			awaitingRetry: sql<number>`(count(*) filter (where ${communicationOutbox.attempts} > 0))::int`,
			awaitingSchedule: sql<number>`(count(*) filter (where ${communicationOutbox.attempts} = 0))::int`,
		})
		.from(communicationOutbox)
		.where(and(...scope));

	return {
		awaitingRetry: Number(row?.awaitingRetry ?? 0),
		awaitingSchedule: Number(row?.awaitingSchedule ?? 0),
	};
}

export async function loadConsents(
	organizationId: string,
	patientIds: string[],
): Promise<Map<string, ConsentRecord[]>> {
	const byPatient = new Map<string, ConsentRecord[]>();
	if (patientIds.length === 0) return byPatient;

	const rows = await db
		.select({
			patientId: patientCommunicationConsents.patientId,
			channel: patientCommunicationConsents.channel,
			scope: patientCommunicationConsents.scope,
			state: patientCommunicationConsents.state,
		})
		.from(patientCommunicationConsents)
		.where(
			and(
				eq(patientCommunicationConsents.organizationId, organizationId),
				inArray(patientCommunicationConsents.patientId, patientIds),
			),
		);

	for (const row of rows) {
		const list = byPatient.get(row.patientId) ?? [];
		list.push({
			channel: row.channel as CommunicationChannelCode,
			scope: row.scope as CommunicationConsentScope,
			state: row.state as "granted" | "revoked",
		});
		byPatient.set(row.patientId, list);
	}
	return byPatient;
}

/** Сколько сообщений уже ушло пациенту за сегодня — против навязчивости. */
export async function countSentToday(
	organizationId: string,
	patientIds: string[],
	now: Date,
): Promise<Map<string, number>> {
	const counts = new Map<string, number>();
	if (patientIds.length === 0) return counts;

	const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const rows = await db
		.select({
			patientId: communicationOutbox.patientId,
			total: sql<number>`count(*)::int`,
		})
		.from(communicationOutbox)
		.where(
			and(
				eq(communicationOutbox.organizationId, organizationId),
				inArray(communicationOutbox.patientId, patientIds),
				inArray(communicationOutbox.status, ["sent", "delivered"]),
				isNotNull(communicationOutbox.sentAt),
				sql`${communicationOutbox.sentAt} >= ${dayStart.toISOString()}`,
			),
		)
		.groupBy(communicationOutbox.patientId);

	for (const row of rows) {
		if (row.patientId) counts.set(row.patientId, Number(row.total));
	}
	return counts;
}

export async function markSuppressed(
	row: OutboxRow,
	reason: string,
	now: Date,
): Promise<void> {
	await db
		.update(communicationOutbox)
		.set({
			status: "suppressed",
			lockedAt: null,
			lockedBy: null,
			lastErrorClass: "suppressed",
			lastErrorMessage: reason,
			updatedAt: now,
		})
		.where(eq(communicationOutbox.id, row.id));
}

export async function markDeferred(
	row: OutboxRow,
	notBefore: Date,
	reason: string,
	now: Date,
): Promise<void> {
	await db
		.update(communicationOutbox)
		.set({
			status: "queued",
			lockedAt: null,
			lockedBy: null,
			nextAttemptAt: notBefore,
			lastErrorClass: "deferred",
			lastErrorMessage: reason,
			updatedAt: now,
		})
		.where(eq(communicationOutbox.id, row.id));
}
