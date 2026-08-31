/**
 * registry.ts — Global tool registry and single-chokepoint invocation engine.
 */

import type { z } from "zod";
import { recordAuditEvent } from "../../../audit.js";
import type { AgentContext } from "../context.js";
import { checkGuardrails, permissionMatches } from "../guardrails.js";
import { registerClinicalNotesTools } from "./clinicalNotesTool.js";
import { registerClinicalTools } from "./clinicalTools.js";
import { registerSanpinTools } from "./sanpinTools.js";
import { toolToAnthropicSchema, toolToOpenAiSchema } from "./schemaSerializer.js";
import type { ToolDefinition, ToolResult } from "./tool.js";

export class ToolRegistryError extends Error {}

export class ToolRegistry {
	// biome-ignore lint/suspicious/noExplicitAny: Generic tools map
	private readonly tools = new Map<string, ToolDefinition<any, any>>();
	private readonly owners = new Map<string, string>();

	// biome-ignore lint/suspicious/noExplicitAny: Generic tool definition parameter
	public register(tool: ToolDefinition<any, any>, moduleName?: string): void {
		const qualified = moduleName ? `${moduleName}.${tool.name}` : tool.name;
		if (this.tools.has(qualified)) {
			throw new ToolRegistryError(
				`Tool '${qualified}' is already registered (owner: ${this.owners.get(qualified)})`,
			);
		}
		this.tools.set(qualified, tool);
		if (moduleName) {
			this.owners.set(qualified, moduleName);
		}
	}

	public unregisterModule(moduleName: string): void {
		for (const [qualified, owner] of this.owners.entries()) {
			if (owner === moduleName) {
				this.tools.delete(qualified);
				this.owners.delete(qualified);
			}
		}
	}

	public clear(): void {
		this.tools.clear();
		this.owners.clear();
	}

	// biome-ignore lint/suspicious/noExplicitAny: Generic tool retrieval
	public get(qualifiedName: string): ToolDefinition<any, any> | undefined {
		return this.tools.get(qualifiedName);
	}

	public list(): string[] {
		return Array.from(this.tools.keys()).sort();
	}

	public schemasFor(
		qualifiedNames: string[],
		dialect: "openai" | "anthropic" = "openai",
	): Record<string, unknown>[] {
		const serializer =
			dialect === "anthropic" ? toolToAnthropicSchema : toolToOpenAiSchema;
		const out: Record<string, unknown>[] = [];
		for (const qualified of qualifiedNames) {
			const tool = this.tools.get(qualified);
			if (!tool) {
				throw new ToolRegistryError(`Unknown tool: ${qualified}`);
			}
			out.push(serializer(tool, qualified));
		}
		return out;
	}

	/**
	 * Single chokepoint invocation with Guardrails, RBAC, Zod validation, and Audit Trail.
	 */
	public async call(
		ctx: AgentContext,
		qualifiedName: string,
		args: Record<string, unknown>,
	): Promise<ToolResult> {
		const tool = this.tools.get(qualifiedName);
		if (!tool) {
			return {
				ok: false,
				error: `Unknown tool: ${qualifiedName}`,
				executionTimeMs: 0,
			};
		}

		// 1. Guardrail policy check
		const decision = checkGuardrails(
			ctx,
			tool,
			qualifiedName,
			ctx.guardrailConfig,
		);
		if (decision === "block") {
			await this.recordAuditSafe(ctx, qualifiedName, args, {
				status: "BLOCKED",
				error: "blocked by guardrails",
			});
			return {
				ok: false,
				error: "blocked by guardrails",
				executionTimeMs: 0,
			};
		}

		if (decision === "require_approval") {
			await this.recordAuditSafe(ctx, qualifiedName, args, {
				status: "PENDING_APPROVAL",
				reason: "guardrail policy requires review",
			});
			return {
				ok: false,
				data: {
					approvalRequired: true,
					tool: qualifiedName,
					arguments: args,
				},
				error: "pending approval",
				executionTimeMs: 0,
			};
		}

		// 2. RBAC permissions check
		for (const required of tool.permissions) {
			const hasPermission = ctx.permissions.some((granted) =>
				permissionMatches(required, granted),
			);
			if (!hasPermission) {
				await this.recordAuditSafe(ctx, qualifiedName, args, {
					status: "BLOCKED",
					error: `permission denied: ${required}`,
				});
				return {
					ok: false,
					error: `permission denied: ${required}`,
					executionTimeMs: 0,
				};
			}
		}

		// 3. Zod parameter validation
		const parsed = tool.parameters.safeParse(args);
		if (!parsed.success) {
			const validationMsg = parsed.error.issues
				.map((i) => `${i.path.join(".")}: ${i.message}`)
				.join("; ");
			await this.recordAuditSafe(ctx, qualifiedName, args, {
				status: "FAILED",
				error: `validation error: ${validationMsg}`,
			});
			return {
				ok: false,
				error: `validation error: ${validationMsg}`,
				executionTimeMs: 0,
			};
		}

		// 4. Execution
		const t0 = performance.now();
		try {
			const rawResult = await tool.handler(ctx, parsed.data);
			const elapsedMs = Math.round(performance.now() - t0);

			await this.recordAuditSafe(ctx, qualifiedName, args, {
				status: "SUCCESS",
				executionTimeMs: elapsedMs,
			});

			return {
				ok: true,
				data: rawResult,
				executionTimeMs: elapsedMs,
			};
		} catch (error) {
			const elapsedMs = Math.round(performance.now() - t0);
			const errorMsg =
				error instanceof Error ? error.message : String(error);

			await this.recordAuditSafe(ctx, qualifiedName, args, {
				status: "FAILED",
				error: errorMsg,
				executionTimeMs: elapsedMs,
			});

			return {
				ok: false,
				error: errorMsg,
				executionTimeMs: elapsedMs,
			};
		}
	}

	private async recordAuditSafe(
		ctx: AgentContext,
		toolName: string,
		args: Record<string, unknown>,
		details: {
			status: string;
			error?: string;
			reason?: string;
			executionTimeMs?: number;
		},
	): Promise<void> {
		try {
			if (ctx.organizationId && ctx.db !== null) {
				await recordAuditEvent({
					organizationId: ctx.organizationId,
					actorUserId: ctx.userId ?? null,
					entityType: "AgentToolInvocation",
					entityId: toolName,
					action: details.status,
					reason: details.error ?? details.reason ?? `Invoked ${toolName}`,
				});
			}
		} catch {
			// Fail-open for audit recording in agent context to prevent crashing tool execution
		}
	}
}

export function createDefaultToolRegistry(): ToolRegistry {
	const registry = new ToolRegistry();
	registerClinicalTools(registry, "clinical");
	registerClinicalNotesTools(registry, "clinical_notes");
	registerSanpinTools(registry, "sanpin");
	return registry;
}

export const defaultToolRegistry = createDefaultToolRegistry();

