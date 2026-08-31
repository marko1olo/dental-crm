/**
 * copilotSessionStore.ts — PostgreSQL-backed session and normalized message store for DENTE Copilot (SQUAD GAMMA).
 *
 * SQUAD GAMMA INVARIANTS:
 * 1. Persistent storage in PostgreSQL tables `copilot_sessions` and `copilot_messages`.
 * 2. Absolute ban on volatile in-memory Map() traps for dialogue state.
 * 3. Strict fail-closed tenant isolation enforced via `organization_id` and `withTenantCtx`.
 * 4. Automatic context compaction (> 15 messages) via `copilotContextCompactor.ts`.
 * 5. Full support for active workspace view, patient binding, user binding, and rolling summaries.
 */

import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { copilotMessages, copilotSessions } from "../../db/schema/copilot.js";
import {
	compactMessageHistory,
	DEFAULT_COMPACTION_THRESHOLD,
	type CompactorOptions,
} from "./copilotContextCompactor.js";

export type CopilotRole = "user" | "assistant" | "system" | "tool";

export interface CopilotSessionRecord {
	readonly id: string;
	readonly organizationId: string;
	readonly userId: string | null;
	readonly patientId: string | null;
	readonly activeView: string | null;
	readonly summary: string | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
}

export interface CopilotMessageRecord {
	readonly id: string;
	readonly sessionId: string;
	readonly role: CopilotRole;
	readonly content: string;
	readonly toolCalls: Record<string, unknown>[] | null;
	readonly createdAt: Date;
}

export interface CreateSessionParams {
	readonly id?: string | undefined;
	readonly organizationId: string;
	readonly userId?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly activeView?: string | null | undefined;
	readonly summary?: string | null | undefined;
}

export interface AddMessageParams {
	readonly sessionId: string;
	readonly organizationId: string;
	readonly role: CopilotRole;
	readonly content: string;
	readonly toolCalls?: Record<string, unknown>[] | null | undefined;
	readonly autoCompact?: boolean | undefined;
}

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Normalizes input sessionId into a valid RFC 4122 UUID.
 * If input is already a valid UUID, returns it. Otherwise returns a new random UUID.
 */
export function ensureValidUuid(id?: string): string {
	if (id && UUID_REGEX.test(id)) {
		return id.toLowerCase();
	}
	return randomUUID();
}

export class CopilotSessionStore {
	/**
	 * Creates a new persistent Copilot session in PostgreSQL with tenant isolation.
	 */
	public async createSession(
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
	public async getSession(
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
	public async getOrCreateSession(
		sessionId: string,
		organizationId: string,
		defaults?: Partial<CreateSessionParams>,
	): Promise<CopilotSessionRecord> {
		const existing = await this.getSession(sessionId, organizationId);
		if (existing) {
			return existing;
		}

		return await this.createSession({
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
	public async updateSession(
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
	public async deleteSession(
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
	public async listSessions(
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

	/**
	 * Appends a message to the persistent PostgreSQL store and optionally auto-compacts context when > 15 messages.
	 */
	public async addMessage(
		params: AddMessageParams,
	): Promise<CopilotMessageRecord> {
		const sessionId = ensureValidUuid(params.sessionId);
		const orgId = params.organizationId;
		const now = new Date();

		// Ensure parent session exists
		await this.getOrCreateSession(sessionId, orgId);

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
			const messageCount = await this.getMessageCount(sessionId, orgId);
			if (messageCount > DEFAULT_COMPACTION_THRESHOLD) {
				await this.compactSession(sessionId, orgId);
			}
		}

		return messageRecord;
	}

	/**
	 * Retrieves messages for a session ordered chronologically.
	 */
	public async getMessages(
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
	public async getMessageCount(
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
	public async compactSession(
		sessionId: string,
		organizationId: string,
		options?: CompactorOptions,
	): Promise<{
		compacted: boolean;
		summary: string | null;
		totalMessages: number;
		retainedCount: number;
	}> {
		const session = await this.getSession(sessionId, organizationId);
		if (!session) {
			return {
				compacted: false,
				summary: null,
				totalMessages: 0,
				retainedCount: 0,
			};
		}

		const allMessages = await this.getMessages(sessionId, organizationId, {
			order: "asc",
			limit: 500,
		});

		const compactionResult = compactMessageHistory(
			allMessages,
			session.summary,
			options,
		);

		if (compactionResult.compacted) {
			await this.updateSession(sessionId, organizationId, {
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
	public async getSessionContext(
		sessionId: string,
		organizationId: string,
		options?: { maxRecentMessages?: number | undefined },
	): Promise<{
		session: CopilotSessionRecord;
		summary: string | null;
		recentMessages: CopilotMessageRecord[];
		totalMessageCount: number;
	}> {
		const session = await this.getOrCreateSession(sessionId, organizationId);
		const allMessages = await this.getMessages(sessionId, organizationId, {
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
	public async deleteMessages(
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
}

export const defaultCopilotSessionStore = new CopilotSessionStore();
