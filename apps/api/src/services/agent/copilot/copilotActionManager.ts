/**
 * copilotActionManager.ts — Pending Action Registration & 2-Phase Confirmation Manager.
 *
 * Sweet Spot: ~220 lines.
 */

import { and, eq } from "drizzle-orm";
import { executeDentalTool, type DentalToolContext } from "../../../ai/dentalTools.js";
import { withTenantCtx } from "../../../db/rls.js";
import { copilotPendingActions } from "../../../db/schema/copilot.js";
import type { AgentContext } from "../context.js";
import type { ToolResult } from "../tools/tool.js";

export interface PendingAction {
	readonly sessionId: string;
	readonly callId: string;
	readonly toolName: string;
	readonly arguments: Record<string, unknown>;
	readonly createdAt: number;
	readonly organizationId?: string | undefined;
	readonly userId?: string | undefined;
}

export const COPILOT_ACTION_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Manages pending actions requiring human-in-the-loop review or confirmation.
 * Backed by in-memory L1 cache + persistent PostgreSQL storage with tenant isolation.
 */
export class CopilotActionManager {
	private readonly pendingActions = new Map<string, PendingAction>();

	public registerPending(
		sessionId: string,
		callId: string,
		toolName: string,
		args: Record<string, unknown>,
		meta?: { organizationId?: string | undefined; userId?: string | undefined },
	): PendingAction {
		const action: PendingAction = {
			sessionId,
			callId,
			toolName,
			arguments: args,
			createdAt: Date.now(),
			organizationId: meta?.organizationId,
			userId: meta?.userId,
		};
		this.pendingActions.set(callId, action);

		// Asynchronously persist to PostgreSQL if organizationId is present
		if (meta?.organizationId) {
			const orgId = meta.organizationId;
			const expiresAt = new Date(action.createdAt + COPILOT_ACTION_TTL_MS);
			withTenantCtx(orgId, async (tx) => {
				await tx
					.insert(copilotPendingActions)
					.values({
						id: callId,
						sessionId,
						organizationId: orgId,
						userId: meta?.userId ?? null,
						toolName,
						arguments: args,
						status: "pending",
						createdAt: new Date(action.createdAt),
						expiresAt,
					})
					.onConflictDoUpdate({
						target: copilotPendingActions.id,
						set: {
							status: "pending",
							toolName,
							arguments: args,
							expiresAt,
						},
					});
			}).catch(() => {});
		}

		return action;
	}

	public getPending(callId: string): PendingAction | undefined {
		const action = this.pendingActions.get(callId);
		if (!action) return undefined;

		// Clean up expired actions older than 15 minutes
		if (Date.now() - action.createdAt > COPILOT_ACTION_TTL_MS) {
			this.pendingActions.delete(callId);
			return undefined;
		}

		return action;
	}

	public async resolvePending(
		callId: string,
		organizationId?: string,
	): Promise<PendingAction | undefined> {
		const cached = this.getPending(callId);
		if (cached) return cached;

		if (!organizationId) return undefined;

		try {
			const rows = await withTenantCtx(organizationId, async (tx) => {
				return tx
					.select()
					.from(copilotPendingActions)
					.where(
						and(
							eq(copilotPendingActions.id, callId),
							eq(copilotPendingActions.organizationId, organizationId),
							eq(copilotPendingActions.status, "pending"),
						),
					)
					.limit(1);
			});

			const row = rows[0];
			if (!row) return undefined;
			if (row.expiresAt.getTime() <= Date.now()) {
				return undefined;
			}

			const action: PendingAction = {
				sessionId: row.sessionId,
				callId: row.id,
				toolName: row.toolName,
				arguments: (row.arguments ?? {}) as Record<string, unknown>,
				createdAt: row.createdAt.getTime(),
				organizationId: row.organizationId,
				userId: row.userId ?? undefined,
			};

			this.pendingActions.set(callId, action);
			return action;
		} catch {
			return undefined;
		}
	}

	public async confirmAction(
		ctx: AgentContext,
		callId: string,
		modifiedArgs?: Record<string, unknown>,
	): Promise<ToolResult> {
		const action = await this.resolvePending(callId, ctx.organizationId);
		if (!action) {
			return {
				ok: false,
				error: "Запрос на действие не найден или истек срок ожидания",
				executionTimeMs: 0,
			};
		}

		this.pendingActions.delete(callId);

		const effectiveArgs = modifiedArgs ?? action.arguments;

		// Mark as confirmed in PostgreSQL
		if (ctx.organizationId) {
			withTenantCtx(ctx.organizationId, async (tx) => {
				await tx
					.update(copilotPendingActions)
					.set({
						status: "confirmed",
						arguments: effectiveArgs,
						resolvedAt: new Date(),
					})
					.where(
						and(
							eq(copilotPendingActions.id, callId),
							eq(copilotPendingActions.organizationId, ctx.organizationId),
						),
					);
			}).catch(() => {});
		}

		const startTime = Date.now();
		// Execute with guardrail config overriding supervised requirement for this approved action
		const approvedCtx: AgentContext = {
			...ctx,
			mode: "autonomous",
		};

		// 1. Canonical Dental Tools SSOT execution (Mandates 8e, 8s, 8wy)
		const dentalContext: DentalToolContext = {
			organizationId: ctx.organizationId,
			userId: ctx.userId,
			doctorId: ctx.userId,
			patientId:
				(effectiveArgs.patientId as string) ||
				(ctx.metadata?.patientId as string) ||
				undefined,
			activeVisitId:
				(effectiveArgs.visitId as string) ||
				(ctx.metadata?.activeVisitId as string) ||
				undefined,
			activeTooth:
				typeof effectiveArgs.toothNumber === "number"
					? effectiveArgs.toothNumber
					: typeof effectiveArgs.tooth === "number"
						? effectiveArgs.tooth
						: undefined,
			runtimeMode:
				(ctx.metadata?.runtimeMode as "web_browser" | "desktop_native") ||
				"web_browser",
			db: ctx.db,
			allowLocalExecution: true,
		};

		try {
			const res = (await executeDentalTool(
				action.toolName,
				effectiveArgs,
				dentalContext,
			)) as any;
			const executionTimeMs = Date.now() - startTime;
			if (res && typeof res === "object" && res.success === false) {
				// Fallback to legacy registry if tool not found in dentalTools
				if (
					res.code === "TOOL_NOT_FOUND" &&
					ctx.tools?.has?.(action.toolName)
				) {
					return await ctx.tools.call(
						approvedCtx,
						action.toolName,
						effectiveArgs,
					);
				}
				return {
					ok: false,
					error: res.error || "Ошибка выполнения действия",
					data: res,
					executionTimeMs,
				};
			}
			return {
				ok: true,
				data: res,
				executionTimeMs,
			};
		} catch (err: unknown) {
			const executionTimeMs = Date.now() - startTime;
			// Fallback to legacy registry if error
			if (ctx.tools?.has?.(action.toolName)) {
				try {
					return await ctx.tools.call(
						approvedCtx,
						action.toolName,
						effectiveArgs,
					);
				} catch {
					// Fall through to error return below
				}
			}
			return {
				ok: false,
				error: err instanceof Error ? err.message : String(err),
				executionTimeMs,
			};
		}
	}

	public rejectAction(
		callId: string,
		reason = "Действие отклонено пользователем",
		organizationId?: string,
	): { ok: boolean; reason: string } {
		const action = this.getPending(callId);

		this.pendingActions.delete(callId);

		// If organizationId or action.organizationId is available, update DB
		const orgId = organizationId ?? action?.organizationId;
		if (orgId) {
			withTenantCtx(orgId, async (tx) => {
				await tx
					.update(copilotPendingActions)
					.set({
						status: "rejected",
						rejectionReason: reason,
						resolvedAt: new Date(),
					})
					.where(
						and(
							eq(copilotPendingActions.id, callId),
							eq(copilotPendingActions.organizationId, orgId),
						),
					);
			}).catch(() => {});
		}

		if (!action && !organizationId) {
			return {
				ok: false,
				reason: "Запрос на действие не найден",
			};
		}

		return {
			ok: true,
			reason,
		};
	}

	public async rejectActionAsync(
		callId: string,
		reason = "Действие отклонено пользователем",
		organizationId?: string,
	): Promise<{ ok: boolean; reason: string }> {
		const action = await this.resolvePending(callId, organizationId);
		this.pendingActions.delete(callId);

		const orgId = organizationId ?? action?.organizationId;
		if (orgId) {
			try {
				await withTenantCtx(orgId, async (tx) => {
					await tx
						.update(copilotPendingActions)
						.set({
							status: "rejected",
							rejectionReason: reason,
							resolvedAt: new Date(),
						})
						.where(
							and(
								eq(copilotPendingActions.id, callId),
								eq(copilotPendingActions.organizationId, orgId),
							),
						);
				});
			} catch (err: unknown) {
				console.warn("[CopilotService] Failed to reject pending action in DB:", err);
			}
		}

		if (!action) {
			return {
				ok: false,
				reason: "Запрос на действие не найден",
			};
		}

		return {
			ok: true,
			reason,
		};
	}

	public clear(): void {
		this.pendingActions.clear();
	}
}

export const defaultCopilotActionManager = new CopilotActionManager();
