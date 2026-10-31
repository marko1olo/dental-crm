/**
 * copilotSessionStore.ts — PostgreSQL-backed session and normalized message store for DENTE Copilot (SQUAD GAMMA).
 *
 * SQUAD GAMMA INVARIANTS:
 * 1. Persistent storage in PostgreSQL tables `copilot_sessions` and `copilot_messages`.
 * 2. Absolute ban on volatile in-memory Map() traps for dialogue state.
 * 3. Strict fail-closed tenant isolation enforced via `organization_id` and `withTenantCtx`.
 * 4. Automatic context compaction (> 15 messages) via `copilotContextCompactor.ts`.
 * 5. Full support for active workspace view, patient binding, user binding, and rolling summaries.
 * 6. Compliant with Mandate 8b / 8zi (Decomposed into clean sweet spot modules).
 */

import type { CompactorOptions } from "./copilotContextCompactor.js";
import {
	addMessageToDb,
	compactSessionInDb,
	deleteMessagesFromDb,
	getMessageCountFromDb,
	getMessagesFromDb,
	getSessionContextFromDb,
} from "./session/copilotMessageDb.js";
import {
	createSessionInDb,
	deleteSessionFromDb,
	getOrCreateSessionInDb,
	getSessionFromDb,
	listSessionsFromDb,
	updateSessionInDb,
} from "./session/copilotSessionDb.js";
import {
	type AddMessageParams,
	type CopilotMessageRecord,
	type CopilotRole,
	type CopilotSessionRecord,
	type CreateSessionParams,
	ensureValidUuid,
	UUID_REGEX,
} from "./session/copilotSessionTypes.js";

export type {
	CopilotRole,
	CopilotSessionRecord,
	CopilotMessageRecord,
	CreateSessionParams,
	AddMessageParams,
};
export { ensureValidUuid, UUID_REGEX };

export class CopilotSessionStore {
	/**
	 * Creates a new persistent Copilot session in PostgreSQL with tenant isolation.
	 */
	public async createSession(
		params: CreateSessionParams,
	): Promise<CopilotSessionRecord> {
		return await createSessionInDb(params);
	}

	/**
	 * Retrieves an existing Copilot session by ID and organizationId.
	 */
	public async getSession(
		sessionId: string,
		organizationId: string,
	): Promise<CopilotSessionRecord | null> {
		return await getSessionFromDb(sessionId, organizationId);
	}

	/**
	 * Retrieves an existing session or initializes a new one if not found.
	 */
	public async getOrCreateSession(
		sessionId: string,
		organizationId: string,
		defaults?: Partial<CreateSessionParams>,
	): Promise<CopilotSessionRecord> {
		return await getOrCreateSessionInDb(sessionId, organizationId, defaults);
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
		return await updateSessionInDb(sessionId, organizationId, updates);
	}

	/**
	 * Deletes a session and cascades deletion of all its messages in PostgreSQL.
	 */
	public async deleteSession(
		sessionId: string,
		organizationId: string,
	): Promise<boolean> {
		return await deleteSessionFromDb(sessionId, organizationId);
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
		return await listSessionsFromDb(organizationId, options);
	}

	/**
	 * Appends a message to the persistent PostgreSQL store and optionally auto-compacts context when > 15 messages.
	 */
	public async addMessage(
		params: AddMessageParams,
	): Promise<CopilotMessageRecord> {
		return await addMessageToDb(params);
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
		return await getMessagesFromDb(sessionId, organizationId, options);
	}

	/**
	 * Counts total messages in a session.
	 */
	public async getMessageCount(
		sessionId: string,
		organizationId: string,
	): Promise<number> {
		return await getMessageCountFromDb(sessionId, organizationId);
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
		return await compactSessionInDb(sessionId, organizationId, options);
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
		return await getSessionContextFromDb(sessionId, organizationId, options);
	}

	/**
	 * Deletes specific messages or cleans up older message slices.
	 */
	public async deleteMessages(
		sessionId: string,
		organizationId: string,
		messageIds?: string[],
	): Promise<number> {
		return await deleteMessagesFromDb(sessionId, organizationId, messageIds);
	}
}

export const defaultCopilotSessionStore = new CopilotSessionStore();
