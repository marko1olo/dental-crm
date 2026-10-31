/**
 * copilotMessageDb.ts — PostgreSQL message operations and context compaction for DENTE Copilot.
 *
 * Sweet Spot: ~210 lines.
 */

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { copilotMessages, copilotSessions } from "../../../db/schema/copilot.js";
import {
	compactMessageHistory,
	DEFAULT_COMPACTION_THRESHOLD,
	type CompactorOptions,
} from "../copilotContextCompactor.js";
import { getOrCreateSessionInDb, getSessionFromDb, updateSessionInDb } from "./copilotSessionDb.js";
import {
	type AddMessageParams,
	type CopilotMessageRecord,
	type CopilotRole,
	type CopilotSessionRecord,
	ensureValidUuid,
	UUID_REGEX,
} from "./copilotSessionTypes.js";

/**
 * Appends a message to the persistent PostgreSQL store and optionally auto-compacts context when > 15 messages.
 */
export async function addMessageToDb(
	params: AddMessageParams,
): Promise<CopilotMessageRecord> {
	const sessionId = ensureValidUuid(params.sessionId);
	const orgId = params.organizationId;
	const now = new Date();

	// Ensure parent session exists
	await getOrCreateSessionInDb(sessionId, orgId);

	const messageRecord = await withTenantCtx(orgId, async (tx) => {
		const [row] = await tx
			.insert(copilotMessages)
			.values({
				sessionId,
				role: params.role,
				content: params.content,
				toolCalls: params.toolCalls ?? null,
				createdAt: now,
			})
			.returning();

		if (!row) {
			throw new Error("Не удалось сохранить сообщение копайлота в PostgreSQL");
		}

		// Touch session updatedAt
		await tx
			.update(copilotSessions)
			.set({ updatedAt: now })
			.where(
				and(
					eq(copilotSessions.id, sessionId),
					eq(copilotSessions.organizationId, orgId),
				),
			);

		return {
			id: row.id,
			sessionId: row.sessionId,
			role: row.role as CopilotRole,
			content: row.content,
			toolCalls: (row.toolCalls as Record<string, unknown>[] | null) ?? null,
			createdAt: row.createdAt,
		};
	});

	// Trigger automatic compaction if requested or by default when count > 15
	if (params.autoCompact !== false) {
		const messageCount = await getMessageCountFromDb(sessionId, orgId);
		if (messageCount > DEFAULT_COMPACTION_THRESHOLD) {
			await compactSessionInDb(sessionId, orgId);
		}
	}

	return messageRecord;
}

/**
 * Retrieves messages for a session ordered chronologically.
 */
export async function getMessagesFromDb(
	sessionId: string,
	organizationId: string,
	options?: {
		limit?: number | undefined;
		offset?: number | undefined;
		order?: ("asc" | "desc") | undefined;
	},
): Promise<CopilotMessageRecord[]> {
	if (!UUID_REGEX.test(sessionId)) {
		return [];
	}

	const limit = options?.limit ?? 100;
	const offset = options?.offset ?? 0;
	const orderDirection = options?.order === "desc" ? desc : asc;

	return await withTenantCtx(organizationId, async (tx) => {
		// Check session ownership for tenant security
		const sessionExists = await tx
			.select({ id: copilotSessions.id })
			.from(copilotSessions)
			.where(
				and(
					eq(copilotSessions.id, sessionId),
					eq(copilotSessions.organizationId, organizationId),
				),
			)
			.limit(1);

		if (sessionExists.length === 0) {
			return [];
		}

		const rows = await tx
			.select()
			.from(copilotMessages)
			.where(eq(copilotMessages.sessionId, sessionId))
			.orderBy(orderDirection(copilotMessages.createdAt))
			.limit(limit)
			.offset(offset);

		return rows.map((r) => ({
			id: r.id,
			sessionId: r.sessionId,
			role: r.role as CopilotRole,
			content: r.content,
			toolCalls: (r.toolCalls as Record<string, unknown>[] | null) ?? null,
			createdAt: r.createdAt,
		}));
	});
}

/**
 * Counts total messages in a session.
 */
export async function getMessageCountFromDb(
	sessionId: string,
	organizationId: string,
): Promise<number> {
	if (!UUID_REGEX.test(sessionId)) {
		return 0;
	}

	return await withTenantCtx(organizationId, async (tx) => {
		const sessionExists = await tx
			.select({ id: copilotSessions.id })
			.from(copilotSessions)
			.where(
				and(
					eq(copilotSessions.id, sessionId),
					eq(copilotSessions.organizationId, organizationId),
				),
			)
			.limit(1);

		if (sessionExists.length === 0) {
			return 0;
		}

		const [res] = await tx
			.select({ total: count() })
			.from(copilotMessages)
			.where(eq(copilotMessages.sessionId, sessionId));

		return Number(res?.total ?? 0);
	});
}

/**
 * Compacts dialogue history for a session: compresses older messages into `session.summary`.
 */
export async function compactSessionInDb(
	sessionId: string,
	organizationId: string,
	options?: CompactorOptions,
): Promise<{
	compacted: boolean;
	summary: string | null;
	totalMessages: number;
	retainedCount: number;
}> {
	const session = await getSessionFromDb(sessionId, organizationId);
	if (!session) {
		return {
			compacted: false,
			summary: null,
			totalMessages: 0,
			retainedCount: 0,
		};
	}

	const allMessages = await getMessagesFromDb(sessionId, organizationId, {
		order: "asc",
		limit: 500,
	});

	const compactionResult = compactMessageHistory(
		allMessages,
		session.summary,
		options,
	);

	if (compactionResult.compacted) {
		await updateSessionInDb(sessionId, organizationId, {
			summary: compactionResult.summary,
		});
	}

	return {
		compacted: compactionResult.compacted,
		summary: compactionResult.summary || session.summary,
		totalMessages: compactionResult.totalMessagesCount,
		retainedCount: compactionResult.retainedMessages.length,
	};
}

/**
 * Retrieves complete session context ready for LLM invocation:
 * Returns active session metadata, latest compacted summary, and the recent messages slice.
 */
export async function getSessionContextFromDb(
	sessionId: string,
	organizationId: string,
	options?: { maxRecentMessages?: number | undefined },
): Promise<{
	session: CopilotSessionRecord;
	summary: string | null;
	recentMessages: CopilotMessageRecord[];
	totalMessageCount: number;
}> {
	const session = await getOrCreateSessionInDb(sessionId, organizationId);
	const allMessages = await getMessagesFromDb(sessionId, organizationId, {
		order: "asc",
		limit: 500,
	});

	const maxRecent = options?.maxRecentMessages ?? 10;
	const recentMessages =
		allMessages.length > maxRecent
			? allMessages.slice(allMessages.length - maxRecent)
			: allMessages;

	return {
		session,
		summary: session.summary,
		recentMessages,
		totalMessageCount: allMessages.length,
	};
}

/**
 * Deletes specific messages or cleans up older message slices.
 */
export async function deleteMessagesFromDb(
	sessionId: string,
	organizationId: string,
	messageIds?: string[],
): Promise<number> {
	if (!UUID_REGEX.test(sessionId)) {
		return 0;
	}

	return await withTenantCtx(organizationId, async (tx) => {
		const sessionExists = await tx
			.select({ id: copilotSessions.id })
			.from(copilotSessions)
			.where(
				and(
					eq(copilotSessions.id, sessionId),
					eq(copilotSessions.organizationId, organizationId),
				),
			)
			.limit(1);

		if (sessionExists.length === 0) {
			return 0;
		}

		if (messageIds && messageIds.length > 0) {
			const validIds = messageIds.filter((id) => UUID_REGEX.test(id));
			if (validIds.length === 0) return 0;

			const res = await tx
				.delete(copilotMessages)
				.where(
					and(
						eq(copilotMessages.sessionId, sessionId),
						inArray(copilotMessages.id, validIds),
					),
				)
				.returning({ id: copilotMessages.id });

			return res.length;
		}

		const res = await tx
			.delete(copilotMessages)
			.where(eq(copilotMessages.sessionId, sessionId))
			.returning({ id: copilotMessages.id });

		return res.length;
	});
}
