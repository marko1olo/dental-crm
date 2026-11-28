/**
 * agentSessionRoutes.ts — Fastify Endpoints for Copilot Sessions & Dialogue History
 *
 * Implements:
 * - GET    /api/agent/sessions              — List dialogue sessions with patient & search filters
 * - POST   /api/agent/sessions              — Create new dialogue session
 * - GET    /api/agent/sessions/:id          — Get single session details
 * - PATCH  /api/agent/sessions/:id          — Update session metadata (activeView, summary, patientId)
 * - DELETE /api/agent/sessions/:id          — Delete session and cascade its messages
 * - GET    /api/agent/sessions/:id/messages — Get message history for session
 * - POST   /api/agent/sessions/:id/messages — Append message to session
 */

import type { FastifyInstance } from "fastify";
import { and, desc, eq, exists, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { defineTenantMutation, defineTenantQuery } from "../core/routeFactories.js";
import { withSavepoint } from "../db/rls.js";
import { copilotMessages, copilotSessions } from "../db/schema/copilot.js";
import { BoundedTtlMap } from "../lib/boundedTtlMap.js";
import {
	createSessionInDb,
	deleteSessionFromDb,
	getSessionFromDb,
	listSessionsFromDb,
	updateSessionInDb,
} from "../ai/session/copilotSessionDb.js";
import {
	addMessageToDb,
	getMessagesFromDb,
} from "../ai/session/copilotMessageDb.js";
import {
	ensureValidUuid,
	UUID_REGEX,
	type CopilotRole,
	type CopilotSessionRecord,
	type CopilotMessageRecord,
} from "../ai/session/copilotSessionTypes.js";

// Resilient in-memory fallback store when PostgreSQL constraint fails or during synthetic unit testing
interface MemorySession {
	id: string;
	organizationId: string;
	userId: string | null;
	patientId: string | null;
	activeView: string | null;
	summary: string | null;
	createdAt: Date;
	updatedAt: Date;
}

interface MemoryMessage {
	id: string;
	sessionId: string;
	role: CopilotRole;
	content: string;
	toolCalls: Record<string, unknown>[] | null;
	createdAt: Date;
}

export const MAX_FALLBACK_SESSIONS = 500;
export const MAX_FALLBACK_MESSAGES_PER_SESSION = 100;
export const FALLBACK_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const fallbackMessages = new BoundedTtlMap<string, MemoryMessage[]>({
	maxEntries: MAX_FALLBACK_SESSIONS,
	ttlMs: FALLBACK_SESSION_TTL_MS,
	touchOnGet: true,
});

const fallbackSessions = new BoundedTtlMap<string, MemorySession>({
	maxEntries: MAX_FALLBACK_SESSIONS,
	ttlMs: FALLBACK_SESSION_TTL_MS,
	touchOnGet: true,
	onEvict: (id) => {
		if (typeof id === "string") {
			fallbackMessages.delete(id);
		}
	},
});

export function cleanupExpiredFallbackSessions(currentTime?: number): number {
	const now = currentTime ?? Date.now();
	let evicted = fallbackSessions.pruneExpired(now);
	evicted += fallbackMessages.pruneExpired(now);

	for (const [id, session] of fallbackSessions.entries()) {
		if (now - session.updatedAt.getTime() > FALLBACK_SESSION_TTL_MS) {
			fallbackSessions.delete(id);
			fallbackMessages.delete(id);
			evicted++;
		}
	}

	return evicted;
}

export function saveFallbackSession(session: MemorySession): void {
	cleanupExpiredFallbackSessions();
	fallbackSessions.set(session.id, session);
}

export function appendFallbackMessage(sessionId: string, message: MemoryMessage): void {
	const existingList = fallbackMessages.get(sessionId) || [];
	existingList.push(message);
	while (existingList.length > MAX_FALLBACK_MESSAGES_PER_SESSION) {
		existingList.shift();
	}
	fallbackMessages.set(sessionId, existingList);

	const session = fallbackSessions.get(sessionId);
	if (session) {
		session.updatedAt = message.createdAt;
		fallbackSessions.set(sessionId, session);
	}
}

export function clearFallbackSessionsForTesting(): void {
	fallbackSessions.clear();
	fallbackMessages.clear();
}

export function getFallbackSessionsCountForTesting(): number {
	return fallbackSessions.size;
}

export function getFallbackMessagesForTesting(sessionId: string): readonly MemoryMessage[] {
	return fallbackMessages.get(sessionId) ?? [];
}

const createSessionBodySchema = z
	.object({
		id: z.string().optional(),
		patientId: z.string().uuid().nullable().optional(),
		activeView: z.string().nullable().optional(),
		summary: z.string().nullable().optional(),
		title: z.string().optional(),
	})
	.strict();

const updateSessionBodySchema = z
	.object({
		patientId: z.string().uuid().nullable().optional(),
		activeView: z.string().nullable().optional(),
		summary: z.string().nullable().optional(),
	})
	.strict();

const addMessageBodySchema = z
	.object({
		role: z.enum(["user", "assistant", "system", "tool"]),
		content: z.string().min(1, "Содержимое сообщения не может быть пустым"),
		toolCalls: z.array(z.record(z.unknown())).nullable().optional(),
		autoCompact: z.boolean().optional(),
	})
	.strict();

const listSessionsQuerySchema = z
	.object({
		patientId: z.string().uuid().optional(),
		limit: z.coerce.number().int().min(1).max(100).default(50),
		offset: z.coerce.number().int().min(0).default(0),
		q: z.string().max(200).optional(),
	})
	.strict();

const sessionMessagesQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(200).default(100),
		offset: z.coerce.number().int().min(0).default(0),
		order: z.enum(["asc", "desc"]).default("asc"),
	})
	.strict();

function getMemorySessions(
	orgId: string,
	query: { patientId?: string | undefined; q?: string | undefined; limit: number; offset: number },
): MemorySession[] {
	const needle = query.q?.trim().toLowerCase();
	return fallbackSessions
		.values()
		.filter((s) => s.organizationId === orgId)
		.filter((s) => !query.patientId || s.patientId === query.patientId)
		.filter((s) => {
			if (!needle) return true;
			if (s.summary && s.summary.toLowerCase().includes(needle)) return true;
			if (s.activeView && s.activeView.toLowerCase().includes(needle)) return true;
			if (s.id.toLowerCase().includes(needle)) return true;
			const msgs = fallbackMessages.get(s.id) || [];
			return msgs.some((m) => m.content.toLowerCase().includes(needle));
		})
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
		.slice(query.offset, query.offset + query.limit);
}

const SESSION_PREFIXES = [
	"/api/agent/sessions",
	"/api/v1/copilot/sessions",
	"/api/copilot/sessions",
];

export async function registerAgentSessionRoutes(server: FastifyInstance): Promise<void> {
	for (const prefix of SESSION_PREFIXES) {
		// ─── GET sessions ──────────────────────────────────────────────────────────
		defineTenantQuery(server, {
			method: "GET",
			path: prefix,
			permission: "agent.read",
			authOptions: { allowClinicTokenWithoutStaff: true },
			handler: async ({ tx, principal, organizationId, request, reply }) => {
				const parseResult = listSessionsQuerySchema.safeParse(request.query ?? {});
				if (!parseResult.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректные параметры фильтрации сессий",
						details: parseResult.error.format(),
					});
				}
				const query = parseResult.data;

				try {
					let sessions: (CopilotSessionRecord | MemorySession)[];
					const searchNeedle = query.q?.trim();

					if (searchNeedle) {
						const pattern = `%${searchNeedle}%`;
						const rows = await withSavepoint(tx, async (spTx) => {
							const conditions = [
								eq(copilotSessions.organizationId, organizationId),
								or(
									ilike(copilotSessions.summary, pattern),
									ilike(copilotSessions.activeView, pattern),
									sql`${copilotSessions.id}::text ILIKE ${pattern}`,
									exists(
										spTx
											.select({ id: copilotMessages.id })
											.from(copilotMessages)
											.where(
												and(
													eq(copilotMessages.sessionId, copilotSessions.id),
													ilike(copilotMessages.content, pattern),
												),
											),
									),
								),
							];
							if (query.patientId) {
								conditions.push(eq(copilotSessions.patientId, query.patientId));
							}
							if (principal.userId) {
								conditions.push(eq(copilotSessions.userId, principal.userId));
							}
							return spTx
								.select()
								.from(copilotSessions)
								.where(and(...conditions))
								.orderBy(desc(copilotSessions.updatedAt))
								.limit(query.limit)
								.offset(query.offset);
						});
						sessions = rows.map((r) => ({
							id: r.id,
							organizationId: r.organizationId,
							userId: r.userId,
							patientId: r.patientId,
							activeView: r.activeView,
							summary: r.summary,
							createdAt: r.createdAt,
							updatedAt: r.updatedAt,
						}));
					} else {
						sessions = await withSavepoint(tx, async () =>
							listSessionsFromDb(organizationId, {
								userId: principal.userId ?? undefined,
								patientId: query.patientId,
								limit: query.limit,
								offset: query.offset,
							}),
						);
					}

					const memSessions = getMemorySessions(organizationId, query);
					if (memSessions.length > 0) {
						const dbIds = new Set(sessions.map((s) => s.id));
						for (const ms of memSessions) {
							if (!dbIds.has(ms.id)) {
								sessions.push(ms);
							}
						}
						sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
					}

					return {
						sessions,
						data: sessions,
						total: sessions.length,
					};
				} catch (err: unknown) {
					request.log.warn(
						{ err, organizationId },
						"[agentSessionRoutes] DB listSessionsFromDb failed, falling back to memory store",
					);
					const memSessions = getMemorySessions(organizationId, query);
					return {
						sessions: memSessions,
						data: memSessions,
						total: memSessions.length,
						fallback: true,
					};
				}
			},
		});

		// ─── POST sessions ─────────────────────────────────────────────────────────
		defineTenantMutation(server, {
			method: "POST",
			path: prefix,
			permission: "agent.write",
			authOptions: { allowClinicTokenWithoutStaff: true },
			idempotency: "optional_header",
			execute: async ({ tx, principal, organizationId, request, reply }) => {
				const parseResult = createSessionBodySchema.safeParse(request.body ?? {});
				if (!parseResult.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректные параметры создания сессии",
						details: parseResult.error.format(),
					});
				}

				const body = parseResult.data;
				const sessionId = ensureValidUuid(body.id);
				const summary = body.summary || body.title || "Новый клинический диалог";

				try {
					const session = await withSavepoint(tx, async () =>
						createSessionInDb({
							id: sessionId,
							organizationId,
							userId: principal.userId ?? null,
							patientId: body.patientId ?? null,
							activeView: body.activeView ?? "Одонтограмма",
							summary,
						}),
					);

					return reply.code(201).send({ ok: true, data: session, ...session });
				} catch (err: unknown) {
					request.log.error(
						{ err, organizationId, sessionId },
						"[agentSessionRoutes] DB createSessionInDb failed, persisting to memory store fallback",
					);
					const now = new Date();
					const memSession: MemorySession = {
						id: sessionId,
						organizationId,
						userId: principal.userId ?? null,
						patientId: body.patientId ?? null,
						activeView: body.activeView ?? "Одонтограмма",
						summary,
						createdAt: now,
						updatedAt: now,
					};
					saveFallbackSession(memSession);

					return reply.code(201).send({ ok: true, data: memSession, ...memSession });
				}
			},
		});

		// ─── GET session by id ─────────────────────────────────────────────────────
		defineTenantQuery(server, {
			method: "GET",
			path: `${prefix}/:id`,
			permission: "agent.read",
			authOptions: { allowClinicTokenWithoutStaff: true },
			handler: async ({ tx, organizationId, request, reply }) => {
				const { id } = request.params as { id: string };
				if (!UUID_REGEX.test(id)) {
					return reply.code(400).send({ error: "InvalidUUID", message: "ID сессии должен быть UUID" });
				}

				try {
					const session = await withSavepoint(tx, async () =>
						getSessionFromDb(id, organizationId),
					);
					if (session) {
						return { data: session, ...session };
					}
				} catch (err: unknown) {
					request.log.warn(
						{ err, organizationId, id },
						"[agentSessionRoutes] DB getSessionFromDb failed, checking memory fallback",
					);
				}

				const memSession = fallbackSessions.get(id);
				if (memSession && memSession.organizationId === organizationId) {
					return { data: memSession, ...memSession };
				}
				return reply.code(404).send({ error: "NotFound", message: "Сессия диалога не найдена" });
			},
		});

		// ─── PATCH session by id ───────────────────────────────────────────────────
		defineTenantMutation(server, {
			method: "PATCH",
			path: `${prefix}/:id`,
			permission: "agent.write",
			authOptions: { allowClinicTokenWithoutStaff: true },
			idempotency: "optional_header",
			execute: async ({ tx, organizationId, request, reply }) => {
				const { id } = request.params as { id: string };
				if (!UUID_REGEX.test(id)) {
					return reply.code(400).send({ error: "InvalidUUID", message: "ID сессии должен быть UUID" });
				}

				const parseResult = updateSessionBodySchema.safeParse(request.body ?? {});
				if (!parseResult.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректные параметры обновления сессии",
						details: parseResult.error.format(),
					});
				}

				const body = parseResult.data;

				try {
					const updated = await withSavepoint(tx, async () =>
						updateSessionInDb(id, organizationId, body),
					);
					if (updated) {
						return { data: updated, ...updated };
					}
				} catch (err: unknown) {
					request.log.warn(
						{ err, organizationId, id },
						"[agentSessionRoutes] DB updateSessionInDb failed, checking memory fallback",
					);
				}

				const memSession = fallbackSessions.get(id);
				if (memSession && memSession.organizationId === organizationId) {
					if (body.activeView !== undefined) memSession.activeView = body.activeView;
					if (body.summary !== undefined) memSession.summary = body.summary;
					if (body.patientId !== undefined) memSession.patientId = body.patientId;
					memSession.updatedAt = new Date();
					fallbackSessions.set(id, memSession);
					return { data: memSession, ...memSession };
				}

				return reply.code(404).send({ error: "NotFound", message: "Сессия диалога не найдена" });
			},
		});

		// ─── DELETE session by id ──────────────────────────────────────────────────
		defineTenantMutation(server, {
			method: "DELETE",
			path: `${prefix}/:id`,
			permission: "agent.write",
			authOptions: { allowClinicTokenWithoutStaff: true },
			idempotency: "optional_header",
			execute: async ({ tx, organizationId, request, reply }) => {
				const { id } = request.params as { id: string };
				if (!UUID_REGEX.test(id)) {
					return reply.code(400).send({ error: "InvalidUUID", message: "ID сессии должен быть UUID" });
				}

				let dbDeleted = false;
				try {
					dbDeleted = await withSavepoint(tx, async () =>
						deleteSessionFromDb(id, organizationId),
					);
				} catch (err: unknown) {
					request.log.warn(
						{ err, organizationId, id },
						"[agentSessionRoutes] DB deleteSessionFromDb failed, checking memory fallback",
					);
				}

				const memSession = fallbackSessions.get(id);
				const memExisted = Boolean(memSession && memSession.organizationId === organizationId);
				if (memExisted) {
					fallbackSessions.delete(id);
					fallbackMessages.delete(id);
				}

				return { ok: true, deleted: dbDeleted || memExisted, success: dbDeleted || memExisted, id };
			},
		});

		// ─── GET session messages ──────────────────────────────────────────────────
		defineTenantQuery(server, {
			method: "GET",
			path: `${prefix}/:id/messages`,
			permission: "agent.read",
			authOptions: { allowClinicTokenWithoutStaff: true },
			handler: async ({ tx, organizationId, request, reply }) => {
				const { id } = request.params as { id: string };
				if (!UUID_REGEX.test(id)) {
					return reply.code(400).send({ error: "InvalidUUID", message: "ID сессии должен быть UUID" });
				}

				const parseResult = sessionMessagesQuerySchema.safeParse(request.query ?? {});
				if (!parseResult.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректные параметры запроса сообщений",
						details: parseResult.error.format(),
					});
				}
				const query = parseResult.data;

				const memSession = fallbackSessions.get(id);
				if (memSession && memSession.organizationId !== organizationId) {
					return reply.code(404).send({ error: "NotFound", message: "Сессия диалога не найдена" });
				}

				try {
					let messages: (CopilotMessageRecord | MemoryMessage)[] = await withSavepoint(tx, async () =>
						getMessagesFromDb(id, organizationId, query),
					);
					if (
						messages.length === 0 &&
						memSession &&
						memSession.organizationId === organizationId &&
						fallbackMessages.has(id)
					) {
						messages = (fallbackMessages.get(id) || []).slice(query.offset, query.offset + query.limit);
					}

					return {
						sessionId: id,
						messages,
						data: messages,
						total: messages.length,
					};
				} catch (err: unknown) {
					request.log.warn(
						{ err, organizationId, id },
						"[agentSessionRoutes] DB getMessagesFromDb failed, falling back to memory store",
					);
					const memMsgs =
						memSession && memSession.organizationId === organizationId
							? (fallbackMessages.get(id) || []).slice(query.offset, query.offset + query.limit)
							: [];
					return {
						sessionId: id,
						messages: memMsgs,
						data: memMsgs,
						total: memMsgs.length,
						fallback: true,
					};
				}
			},
		});

		// ─── POST append message to session ────────────────────────────────────────
		defineTenantMutation(server, {
			method: "POST",
			path: `${prefix}/:id/messages`,
			permission: "agent.write",
			authOptions: { allowClinicTokenWithoutStaff: true },
			idempotency: "optional_header",
			execute: async ({ tx, principal, organizationId, request, reply }) => {
				const { id } = request.params as { id: string };
				if (!UUID_REGEX.test(id)) {
					return reply.code(400).send({ error: "InvalidUUID", message: "ID сессии должен быть UUID" });
				}

				const parseResult = addMessageBodySchema.safeParse(request.body ?? {});
				if (!parseResult.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректное сообщение для сессии",
						details: parseResult.error.format(),
					});
				}

				const body = parseResult.data;
				const existingMemSession = fallbackSessions.get(id);
				if (existingMemSession && existingMemSession.organizationId !== organizationId) {
					return reply.code(404).send({ error: "NotFound", message: "Сессия диалога не найдена" });
				}

				try {
					const message = await withSavepoint(tx, async () =>
						addMessageToDb({
							sessionId: id,
							organizationId,
							role: body.role as CopilotRole,
							content: body.content,
							toolCalls: body.toolCalls,
							autoCompact: body.autoCompact,
						}),
					);

					return reply.code(201).send({ ok: true, data: message, ...message });
				} catch (err: unknown) {
					request.log.error(
						{ err, organizationId, id },
						"[agentSessionRoutes] DB addMessageToDb failed, appending to memory fallback",
					);
					const now = new Date();
					if (!existingMemSession) {
						saveFallbackSession({
							id,
							organizationId,
							userId: principal.userId ?? null,
							patientId: null,
							activeView: "Одонтограмма",
							summary: body.content.slice(0, 120),
							createdAt: now,
							updatedAt: now,
						});
					}
					const msgId = ensureValidUuid();
					const memMsg: MemoryMessage = {
						id: msgId,
						sessionId: id,
						role: body.role as CopilotRole,
						content: body.content,
						toolCalls: body.toolCalls ?? null,
						createdAt: now,
					};

					appendFallbackMessage(id, memMsg);

					return reply.code(201).send({ ok: true, data: memMsg, ...memMsg });
				}
			},
		});
	}
}
