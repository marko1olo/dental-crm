/**
 * aiRbacGuard.ts — AI RBAC Guard & JWT Security Engine (Chapter VII).
 *
 * Implements granular role-based access control, JWT identity enforcement,
 * cross-tenant IDOR isolation, and prompt injection / privilege spoofing defense
 * at the Agent ToolRegistry single-chokepoint boundary.
 *
 * ROLES SUPPORTED:
 * - 'owner': Full master authority across all clinical, financial, administrative and settings tools.
 * - 'chief_doctor': Full clinical, schedule, patients, staff tasks, sanpin and medical documentation authority,
 *                   with clinical audit and payroll oversight. Disallowed from cash refunds and legal settings changes.
 * - 'doctor': Clinical examinations, treatment planning, diary entries (043/u), EMR signing, patient timeline,
 *             recalls and personal schedule management. Disallowed from finance, clinic settings and other doctors' payroll.
 * - 'assistant': Read-only patient and schedule access, SanPiN sterilization registers, inventory tracking.
 *                Disallowed from medical diagnoses/signing, appointments rescheduling, finance, and settings.
 * - 'registrar': Reception and registration desk — appointment booking/rescheduling, patient records, payment receipt,
 *                patient messaging. Disallowed from medical records authoring, sterilization validation, and clinic settings.
 */

import type { AgentContext } from "../context.js";
import { permissionMatches } from "../guardrails.js";
import type { ToolDefinition } from "../tools/tool.js";

export const AI_ROLES = [
	"owner",
	"chief_doctor",
	"doctor",
	"assistant",
	"registrar",
] as const;

export type AiUserRole = (typeof AI_ROLES)[number];

/**
 * Normalization map for legacy and alternative role aliases.
 */
export const AI_ROLE_ALIASES: Readonly<Record<string, AiUserRole>> = {
	owner: "owner",
	admin: "owner",
	administrator: "registrar",
	receptionist: "registrar",
	registrar: "registrar",
	manager: "registrar",
	chief_doctor: "chief_doctor",
	chiefdoctor: "chief_doctor",
	head_doctor: "chief_doctor",
	doctor: "doctor",
	physician: "doctor",
	dentist: "doctor",
	assistant: "assistant",
	nurse: "assistant",
	accountant: "owner",
};

/**
 * Base AI Role Permissions Matrix.
 */
export const DEFAULT_AI_ROLE_PERMISSIONS: Readonly<
	Record<AiUserRole, readonly string[]>
> = {
	owner: [
		"*",
	],
	chief_doctor: [
		"clinical.*",
		"schedule.*",
		"patients.*",
		"sanpin.*",
		"tasks.*",
		"communications.*",
		"inventory.*",
		"analytics.read",
		"payroll.read",
		"egisz.*",
	],
	doctor: [
		"clinical.read",
		"clinical.write",
		"patients.read",
		"patients.write",
		"schedule.read",
		"schedule.write",
		"communications.read",
		"sanpin.read",
		"tasks.read",
		"tasks.write",
		"inventory.read",
		"payroll.read.own",
		"egisz.submit",
	],
	assistant: [
		"patients.read",
		"schedule.read",
		"clinical.read",
		"sanpin.read",
		"sanpin.write",
		"inventory.read",
		"inventory.write",
		"communications.read",
		"tasks.read",
	],
	registrar: [
		"schedule.read",
		"schedule.write",
		"patients.read",
		"patients.write",
		"finance.read",
		"finance.write",
		"communications.read",
		"communications.write",
		"tasks.read",
		"tasks.write",
		"inventory.read",
	],
};

/**
 * Known sensitive context override keys that must never be accepted from LLM or dialog payloads.
 */
const SENSITIVE_CONTEXT_KEYS = new Set([
	"organizationid",
	"orgid",
	"tenantid",
	"userid",
	"actoruserid",
	"role",
	"userrole",
	"permissions",
	"issuperuser",
	"bypassrbac",
	"isadmin",
	"systemrole",
	"__proto__",
	"constructor",
	"prototype",
]);

/**
 * Prompt injection patterns aimed at role manipulation or security bypass.
 */
const PROMPT_INJECTION_PATTERNS: readonly RegExp[] = [
	/(?:system\s+override|grant\s+role|ignore\s+(?:previous\s+)?instructions|override\s+rbac|escalate\s+privileges)/i,
	/(?:you\s+are\s+now\s+(?:owner|admin|chief_doctor|superuser)|act\s+as\s+owner)/i,
	/(?:elevate\s+to\s+admin|bypass\s+permissions|sudo\s+mode|disable\s+guardrails)/i,
	/(?:set_role\s*\(\s*['"]owner['"]\s*\)|role\s*:\s*['"]owner['"])/i,
];

export interface AiRbacDecision {
	readonly allowed: boolean;
	readonly statusCode?: number;
	readonly error?: string;
	readonly reason?: string;
	readonly missingPermissions?: string[];
	readonly requiredPermissions?: string[];
	readonly role?: AiUserRole | string;
	readonly userId?: string;
	readonly toolName?: string;
	readonly sanitizedArgs?: Record<string, unknown>;
}

/**
 * Normalizes role string to canonical AiUserRole.
 */
export function normalizeAiRole(role: string | null | undefined): AiUserRole | null {
	if (!role || typeof role !== "string") return null;
	const normalized = role.trim().toLowerCase();
	if (!normalized) return null;
	return AI_ROLE_ALIASES[normalized] ?? null;
}

/**
 * Checks if a permission string matches a pattern (supports wildcards e.g. `*`, `clinical.*`).
 */
export function matchAiPermission(target: string, pattern: string): boolean {
	return permissionMatches(target, pattern);
}

/**
 * Computes the effective permissions for a role, combining default matrix and custom overrides.
 */
export function getEffectiveAiPermissions(
	role: string | null | undefined,
	customPermissions?: readonly string[] | null,
): string[] {
	const normalizedRole = normalizeAiRole(role);
	const basePerms = normalizedRole
		? DEFAULT_AI_ROLE_PERMISSIONS[normalizedRole] ?? []
		: [];

	const effectiveSet = new Set<string>(basePerms);

	if (customPermissions && Array.isArray(customPermissions)) {
		for (const p of customPermissions) {
			if (typeof p === "string" && p.trim()) {
				effectiveSet.add(p.trim());
			}
		}
	}

	return Array.from(effectiveSet);
}

/**
 * Evaluates whether a user with given role and custom permissions has the required permission.
 */
export function hasAiPermission(
	role: string | null | undefined,
	customPermissions: readonly string[] | undefined,
	requiredPermission: string,
): boolean {
	if (!requiredPermission || typeof requiredPermission !== "string") {
		return false;
	}

	const effective = getEffectiveAiPermissions(role, customPermissions);
	return effective.some((granted) => matchAiPermission(requiredPermission, granted));
}

/**
 * Inspects arguments for prompt injection attempts or security-sensitive property tampering.
 */
export function detectPromptInjectionInArgs(
	args: Record<string, unknown>,
): { hasInjection: boolean; reasons: string[] } {
	const reasons: string[] = [];

	function scanValue(val: unknown, path: string): void {
		if (typeof val === "string") {
			for (const pattern of PROMPT_INJECTION_PATTERNS) {
				if (pattern.test(val)) {
					reasons.push(
						`Suspicious prompt injection pattern detected at '${path}': ${pattern.source}`,
					);
				}
			}
		} else if (val && typeof val === "object" && !Array.isArray(val)) {
			for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
				const lowerK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
				if (SENSITIVE_CONTEXT_KEYS.has(lowerK)) {
					reasons.push(
						`Forbidden security context override key '${k}' in arguments at '${path}'`,
					);
				}
				scanValue(v, path ? `${path}.${k}` : k);
			}
		} else if (Array.isArray(val)) {
			for (let i = 0; i < val.length; i++) {
				scanValue(val[i], `${path}[${i}]`);
			}
		}
	}

	scanValue(args, "");
	return {
		hasInjection: reasons.length > 0,
		reasons,
	};
}

/**
 * Sanitizes tool arguments and strictly prevents cross-tenant IDOR violations.
 */
export function sanitizeAndValidateToolArgs(
	ctx: AgentContext,
	args: Record<string, unknown>,
): { ok: boolean; sanitizedArgs: Record<string, unknown>; error?: string } {
	// Deep clone to prevent mutating input objects
	const sanitized: Record<string, unknown> = JSON.parse(JSON.stringify(args ?? {}));

	// Check top-level keys for cross-tenant IDOR attempts
	for (const [key, value] of Object.entries(sanitized)) {
		const lower = key.toLowerCase().replace(/[^a-z0-9]/g, "");
		if (
			(lower === "organizationid" || lower === "orgid" || lower === "tenantid") &&
			typeof value === "string" &&
			value.trim() !== ""
		) {
			if (value.trim() !== ctx.organizationId) {
				return {
					ok: false,
					sanitizedArgs: sanitized,
					error: `403 Forbidden: Cross-tenant access violation. Target organizationId '${value}' does not match authenticated context organizationId '${ctx.organizationId}'.`,
				};
			}
		}
	}

	// Purge any attempted injected role/permissions overrides
	delete sanitized.role;
	delete sanitized.userRole;
	delete sanitized.permissions;
	delete sanitized.isSuperUser;
	delete sanitized.bypassRbac;
	delete sanitized.systemRole;

	return {
		ok: true,
		sanitizedArgs: sanitized,
	};
}

/**
 * Evaluates AI RBAC Guard for a tool invocation at the ToolRegistry single-chokepoint boundary.
 */
export function checkAiRbacGuard(
	ctx: AgentContext,
	tool: ToolDefinition,
	qualifiedToolName: string,
	args: Record<string, unknown>,
): AiRbacDecision {
	// 1. Mandatory Identity and Tenant Invariants (Fail-Closed)
	if (!ctx.organizationId || typeof ctx.organizationId !== "string" || !ctx.organizationId.trim()) {
		return {
			allowed: false,
			statusCode: 403,
			error: "403 Forbidden: Missing or invalid organizationId in Agent execution context.",
			reason: "MISSING_TENANT_CONTEXT",
			toolName: qualifiedToolName,
		};
	}

	if (!ctx.userId || typeof ctx.userId !== "string" || !ctx.userId.trim()) {
		return {
			allowed: false,
			statusCode: 403,
			error: "403 Forbidden: Missing or invalid userId in Agent execution context.",
			reason: "MISSING_USER_IDENTITY",
			toolName: qualifiedToolName,
		};
	}

	// 2. Prompt Injection & Argument Security Validation
	const injectionCheck = detectPromptInjectionInArgs(args);
	if (injectionCheck.hasInjection) {
		return {
			allowed: false,
			statusCode: 403,
			error: `403 Forbidden: Security violation - prompt injection or privilege tampering detected in tool arguments: ${injectionCheck.reasons.join("; ")}`,
			reason: "PROMPT_INJECTION_DETECTED",
			toolName: qualifiedToolName,
			userId: ctx.userId,
		};
	}

	// 3. Cross-Tenant IDOR Sanitization
	const sanitization = sanitizeAndValidateToolArgs(ctx, args);
	if (!sanitization.ok) {
		return {
			allowed: false,
			statusCode: 403,
			error: sanitization.error ?? "403 Forbidden: Cross-tenant isolation check failed.",
			reason: "CROSS_TENANT_VIOLATION",
			toolName: qualifiedToolName,
			userId: ctx.userId,
		};
	}

	// 4. Role & Granular RBAC Permissions Evaluation
	// If ctx.role is provided, use it. If not, fallback to ctx.permissions directly, or default to "doctor"
	const normalizedRole = normalizeAiRole(ctx.role);
	const effectiveRole = normalizedRole ?? (ctx.role as AiUserRole) ?? (ctx.permissions && ctx.permissions.length > 0 ? null : "doctor");
	const effectivePermissions = effectiveRole
		? getEffectiveAiPermissions(effectiveRole, ctx.permissions)
		: Array.from(new Set(ctx.permissions ?? []));

	// Check all required permissions on the tool
	const requiredPerms = tool.permissions ?? [];
	for (const required of requiredPerms) {
		const granted = effectivePermissions.some((pat) =>
			matchAiPermission(required, pat),
		);
		if (!granted) {
			const roleLabel = ctx.role ?? effectiveRole ?? "unknown";
			return {
				allowed: false,
				statusCode: 403,
				error: `403 Forbidden: permission denied: ${required}. Tool '${qualifiedToolName}' requires permission '${required}', but role '${roleLabel}' (userId: ${ctx.userId}) lacks this privilege.`,
				reason: "INSUFFICIENT_PERMISSIONS",
				missingPermissions: [required],
				requiredPermissions: requiredPerms,
				role: roleLabel,
				userId: ctx.userId,
				toolName: qualifiedToolName,
			};
		}
	}

	return {
		allowed: true,
		role: effectiveRole ?? undefined,
		userId: ctx.userId,
		toolName: qualifiedToolName,
		sanitizedArgs: sanitization.sanitizedArgs,
	};
}
