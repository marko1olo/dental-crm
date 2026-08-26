/**
 * guardrails.ts — Policy and runtime enforcement for agent tool executions.
 *
 * Implements single-chokepoint guardrails:
 * - Rate limiting per session (actions/min and actions/session).
 * - Tool blocking and wildcard matching (e.g. `*.delete`, `billing.*`, `danger_*`).
 * - Supervised mode requirement for mutating actions.
 * - Destructive action gating.
 */

import type { AgentContext } from "./context.js";
import type { ToolCategory, ToolDefinition } from "./tools/tool.js";

export type GuardrailDecision = "allow" | "require_approval" | "block";

export interface GuardrailConfig {
	readonly maxActionsPerMinute?: number;
	readonly maxActionsPerSession?: number;
	readonly requireApprovalFor?: string[];
	readonly blockedTools?: string[];
	readonly autoRequireApprovalForDestructive?: boolean;
}

export const defaultGuardrailConfig: Required<GuardrailConfig> = {
	maxActionsPerMinute: 10,
	maxActionsPerSession: 100,
	requireApprovalFor: ["*.delete", "billing.*", "clinical.sign", "schedule.cancel"],
	blockedTools: [],
	autoRequireApprovalForDestructive: true,
};

// In-memory rate limiting windows: sessionId -> array of monotonic/epoch timestamps (ms)
const sessionWindows = new Map<string, number[]>();
const sessionTotalCounts = new Map<string, number>();

export function resetGuardrailCounters(): void {
	sessionWindows.clear();
	sessionTotalCounts.clear();
}

/**
 * Matches permission or qualified tool name with wildcard grammar.
 * e.g. "patients.read" matches "patients.read", "patients.*", "*", "*.read", "patient*".
 */
export function permissionMatches(target: string, pattern: string): boolean {
	if (pattern === "*" || target === pattern) return true;

	const escaped = pattern
		.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*");
	const regex = new RegExp(`^${escaped}$`);
	return regex.test(target);
}

export function matchesAnyPattern(target: string, patterns: string[]): boolean {
	return patterns.some((pat) => permissionMatches(target, pat));
}

/**
 * Evaluates guardrail policy for a tool invocation.
 */
export function checkGuardrails(
	ctx: AgentContext,
	tool: ToolDefinition,
	qualifiedName: string,
	config?: GuardrailConfig,
): GuardrailDecision {
	const cfg: Required<GuardrailConfig> = {
		maxActionsPerMinute:
			config?.maxActionsPerMinute ?? defaultGuardrailConfig.maxActionsPerMinute,
		maxActionsPerSession:
			config?.maxActionsPerSession ?? defaultGuardrailConfig.maxActionsPerSession,
		requireApprovalFor:
			config?.requireApprovalFor ?? defaultGuardrailConfig.requireApprovalFor,
		blockedTools:
			config?.blockedTools ?? defaultGuardrailConfig.blockedTools,
		autoRequireApprovalForDestructive:
			config?.autoRequireApprovalForDestructive ??
			defaultGuardrailConfig.autoRequireApprovalForDestructive,
	};

	// 1. Check if tool is explicitly blocked
	if (matchesAnyPattern(qualifiedName, cfg.blockedTools)) {
		return "block";
	}

	// 2. Check rate limit
	const now = Date.now();
	let timestamps = sessionWindows.get(ctx.sessionId);
	if (!timestamps) {
		timestamps = [];
		sessionWindows.set(ctx.sessionId, timestamps);
	}

	// Drop timestamps older than 60 seconds
	const windowStart = now - 60_000;
	timestamps = timestamps.filter((t) => t > windowStart);
	sessionWindows.set(ctx.sessionId, timestamps);

	const totalCount = (sessionTotalCounts.get(ctx.sessionId) ?? 0) + 1;
	sessionTotalCounts.set(ctx.sessionId, totalCount);

	if (timestamps.length >= cfg.maxActionsPerMinute) {
		return "block";
	}

	if (totalCount > cfg.maxActionsPerSession) {
		return "block";
	}

	timestamps.push(now);

	// 3. Supervised mode enforces approval for all non-read actions
	if (ctx.mode === "supervised" && tool.category !== "read") {
		return "require_approval";
	}

	// 4. Destructive tools require approval by default
	if (cfg.autoRequireApprovalForDestructive && tool.category === "destructive") {
		return "require_approval";
	}

	// 5. Require-approval patterns
	if (matchesAnyPattern(qualifiedName, cfg.requireApprovalFor)) {
		return "require_approval";
	}

	return "allow";
}
