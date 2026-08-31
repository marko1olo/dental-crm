/**
 * context.ts — Agent execution context and operational mode types.
 */

import type { GuardrailConfig } from "./guardrails.js";
import type { ToolRegistry } from "./tools/registry.js";

export type AgentMode = "autonomous" | "supervised";

export interface AgentContext {
	readonly organizationId: string;
	readonly clinicId: string;
	readonly userId: string;
	readonly sessionId: string;
	readonly mode: AgentMode;
	readonly permissions: string[];
	readonly tools: ToolRegistry;
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle client or transaction instance
	readonly db: any;
	readonly role?: string | undefined;
	readonly supervisorId?: string | null;
	readonly metadata?: Record<string, unknown>;
	readonly guardrailConfig?: GuardrailConfig;
}

export interface AgentResult {
	readonly ok: boolean;
	readonly summary: string;
	readonly data?: Record<string, unknown>;
}
