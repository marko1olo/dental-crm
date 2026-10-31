/**
 * copilotSessionDb.ts — PostgreSQL session operations for DENTE Copilot.
 *
 * Sweet Spot: ~180 lines.
 */

import { and, desc, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { copilotSessions } from "../../../db/schema/copilot.js";
import {
	type CopilotSessionRecord,
	type CreateSessionParams,
	ensureValidUuid,
	UUID_REGEX,
} from "./copilotSessionTypes.js";

/**
 * Creates a new persistent Copilot session in PostgreSQL with tenant isolation.
 */
export async function createSessionInDb(
	params: CreateSessionParams,
): Promise<CopilotSessionRecord> {
	const sessionId = ensureValidUuid(params.id);
	const orgId = params.organizationId;
	const now = new Date();

	return await withTenantCtx(orgId, async (tx) => {
		const [row] = await tx
			.insert(copilotSessions)
			.values({
				id: sessionId,
				organizationId: orgId,
				userId: params.userId ?? null,
				patientId: params.patientId ?? null,
				activeView: params.activeView ?? null,
				summary: params.summary ?? null,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		if (!row) {
			throw new Error("Не удалось создать сессию копайлота в PostgreSQL");
		}

		return {
			id: row.id,
			organizationId: row.organizationId,
			userId: row.userId,
			patientId: row.patientId,
			activeView: row.activeView,
			summary: row.summary,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	});
}

/**
 * Retrieves an existing Copilot session by ID and organizationId.
 */
export async function getSessionFromDb(
	sessionId: string,
	organizationId: string,
): Promise<CopilotSessionRecord | null> {
	if (!UUID_REGEX.test(sessionId)) {
		return null;
	}

	return await withTenantCtx(organizationId, async (tx) => {
		const rows = await tx
			.select()
			.from(copilotSessions)
			.where(
				and(
					eq(copilotSessions.id, sessionId),
					eq(copilotSessions.organizationId, organizationId),
				),
			)
			.limit(1);

		const row = rows[0];
		if (!row) return null;

		return {
			id: row.id,
			organizationId: row.organizationId,
			userId: row.userId,
			patientId: row.patientId,
			activeView: row.activeView,
			summary: row.summary,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	});
}

/**
 * Retrieves an existing session or initializes a new one if not found.
 */
export async function getOrCreateSessionInDb(
	sessionId: string,
	organizationId: string,
	defaults?: Partial<CreateSessionParams>,
): Promise<CopilotSessionRecord> {
	const existing = await getSessionFromDb(sessionId, organizationId);
	if (existing) {
		return existing;
	}

	return await createSessionInDb({
		id: sessionId,
		organizationId,
		userId: defaults?.userId,
		patientId: defaults?.patientId,
		activeView: defaults?.activeView,
		summary: defaults?.summary,
	});
}

/**
 * Updates session attributes (active view, patient binding, summary).
 */
export async function updateSessionInDb(
	sessionId: string,
	organizationId: string,
	updates: Partial<{
		activeView: string | null;
		summary: string | null;
		patientId: string | null;
		userId: string | null;
	}>,
): Promise<CopilotSessionRecord | null> {
	if (!UUID_REGEX.test(sessionId)) {
		return null;
	}

	const now = new Date();
	return await withTenantCtx(organizationId, async (tx) => {
		const setFields: Record<string, unknown> = {
			updatedAt: now,
		};

		if (updates.activeView !== undefined) {
			setFields.activeView = updates.activeView;
		}
		if (updates.summary !== undefined) {
			setFields.summary = updates.summary;
		}
		if (updates.patientId !== undefined) {
			setFields.patientId = updates.patientId;
		}
		if (updates.userId !== undefined) {
			setFields.userId = updates.userId;
		}

		const [row] = await tx
			.update(copilotSessions)
			.set(setFields)
			.where(
				and(
					eq(copilotSessions.id, sessionId),
					eq(copilotSessions.organizationId, organizationId),
				),
			)
			.returning();

		if (!row) return null;

		return {
			id: row.id,
			organizationId: row.organizationId,
			userId: row.userId,
			patientId: row.patientId,
			activeView: row.activeView,
			summary: row.summary,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	});
}

/**
 * Deletes a session and cascades deletion of all its messages in PostgreSQL.
 */
export async function deleteSessionFromDb(
	sessionId: string,
	organizationId: string,
): Promise<boolean> {
	if (!UUID_REGEX.test(sessionId)) {
		return false;
	}

	return await withTenantCtx(organizationId, async (tx) => {
		const result = await tx
			.delete(copilotSessions)
			.where(
				and(
					eq(copilotSessions.id, sessionId),
					eq(copilotSessions.organizationId, organizationId),
				),
			)
			.returning({ id: copilotSessions.id });

		return result.length > 0;
	});
}

/**
 * Lists recent sessions for a given organization with optional user/patient filters.
 */
export async function listSessionsFromDb(
	organizationId: string,
	options?: {
		userId?: string | undefined;
		patientId?: string | undefined;
		limit?: number | undefined;
		offset?: number | undefined;
	},
): Promise<CopilotSessionRecord[]> {
	const limit = Math.min(options?.limit ?? 50, 100);
	const offset = options?.offset ?? 0;

	return await withTenantCtx(organizationId, async (tx) => {
		const conditions = [eq(copilotSessions.organizationId, organizationId)];

		if (options?.userId && UUID_REGEX.test(options.userId)) {
			conditions.push(eq(copilotSessions.userId, options.userId));
		}
		if (options?.patientId && UUID_REGEX.test(options.patientId)) {
			conditions.push(eq(copilotSessions.patientId, options.patientId));
		}

		const rows = await tx
			.select()
			.from(copilotSessions)
			.where(and(...conditions))
			.orderBy(desc(copilotSessions.updatedAt))
			.limit(limit)
			.offset(offset);

		return rows.map((r) => ({
			id: r.id,
			organizationId: r.organizationId,
			userId: r.userId,
			patientId: r.patientId,
			activeView: r.activeView,
			summary: r.summary,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt,
		}));
	});
}
