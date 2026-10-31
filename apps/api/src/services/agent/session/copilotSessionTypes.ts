/**
 * copilotSessionTypes.ts — Normalized types and UUID guards for Copilot Sessions.
 *
 * Sweet Spot: ~70 lines.
 */

import { randomUUID } from "node:crypto";

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

export const UUID_REGEX =
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
