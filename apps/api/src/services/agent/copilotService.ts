/**
 * copilotService.ts — SSE Streaming, Action Confirmation Manager & Default LLM Provider.
 */

import { and, eq, lt } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { copilotPendingActions } from "../../db/schema/copilot.js";
import { selectProviderKey } from "../../speech/keyPool.js";
import type { AgentContext } from "./context.js";
import type { ToolResult } from "./tools/tool.js";
import { routeCopilotFallback } from "./copilotFallbackRouter.js";
import { ClinicalValidatorAgent } from "./validatorAgent.js";
import { omniLlmGateway } from "./omniGateway.js";
import type {
	LLMProvider,
	LLMStreamEvent,
	TextBlock,
	ToolResultBlock,
	ToolUseBlock,
	TurnEvent,
} from "./types.js";

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
 * Formats a TurnEvent or proactive event into standard SSE protocol chunk.
 */
export function formatSseEvent(
	event: TurnEvent | { type: string; [key: string]: unknown },
): string {
	let eventName: string = event.type;
	if (event.type === "tool_call_started") eventName = "tool_call";
	else if (event.type === "tool_call_finished") eventName = "tool_result";
	else if (event.type === "confirmation_required")
		eventName = "tool_confirmation_required";
	else if (event.type === "final") eventName = "done";
	else if (event.type === "proactive_alert") eventName = "proactive_alert";

	const payload = JSON.stringify(event);
	return `event: ${eventName}\ndata: ${payload}\n\n`;
}

export interface CopilotStreamSubscriber {
	readonly id: string;
	readonly organizationId: string;
	readonly userId?: string | undefined;
	readonly sessionId?: string | undefined;
	readonly send: (chunk: string) => boolean;
	readonly close?: (() => void) | undefined;
	readonly write?: ((chunk: string) => void) | undefined;
}

/**
 * Manages active SSE streaming connections for real-time Server-Initiated Proactive Messages.
 */
export class CopilotStreamManager {
	private readonly subscribers = new Map<string, CopilotStreamSubscriber>();

	public subscribe(
		subOrId: CopilotStreamSubscriber | string,
		maybeSub?:
			| {
					organizationId?: string | undefined;
					userId?: string | undefined;
					sessionId?: string | undefined;
					send?: ((chunk: string) => boolean) | undefined;
					write?: ((chunk: string) => void) | undefined;
					close?: (() => void) | undefined;
			  }
			| undefined,
	): () => void {
		let sub: CopilotStreamSubscriber;
		if (typeof subOrId === "string") {
			const id = subOrId;
			const organizationId = maybeSub?.organizationId || "default";
			const writeFn = maybeSub?.write;
			const sendFn =
				maybeSub?.send ||
				((chunk: string) => {
					if (writeFn) {
						writeFn(chunk);
						return true;
					}
					return true;
				});
			sub = {
				id,
				organizationId,
				send: sendFn,
				...(maybeSub?.userId !== undefined ? { userId: maybeSub.userId } : {}),
				...(maybeSub?.sessionId !== undefined
					? { sessionId: maybeSub.sessionId }
					: {}),
				...(writeFn !== undefined ? { write: writeFn } : {}),
				...(maybeSub?.close !== undefined ? { close: maybeSub.close } : {}),
			};
		} else {
			sub = subOrId;
		}

		this.subscribers.set(sub.id, sub);
		return () => {
			this.subscribers.delete(sub.id);
		};
	}

	public broadcastToOrganization(
		organizationId: string,
		eventName: string,
		data: unknown,
	): number {
		const chunk = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
		let count = 0;
		for (const [id, sub] of this.subscribers.entries()) {
			if (sub.organizationId === organizationId) {
				const ok = sub.send(chunk);
				if (ok) {
					count++;
				} else {
					this.subscribers.delete(id);
				}
			}
		}
		return count;
	}

	public broadcastProactiveAlert(
		organizationId: string,
		alert: unknown,
	): number {
		return this.broadcastToOrganization(
			organizationId,
			"proactive_alert",
			alert,
		);
	}

	public getSubscriberCount(organizationId?: string): number {
		if (!organizationId) return this.subscribers.size;
		let count = 0;
		for (const sub of this.subscribers.values()) {
			if (sub.organizationId === organizationId) count++;
		}
		return count;
	}

	public getActiveSubscribersCount(organizationId?: string): number {
		return this.getSubscriberCount(organizationId);
	}
}

export const defaultCopilotStreamManager = new CopilotStreamManager();

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

		// Execute with guardrail config overriding supervised requirement for this approved action
		const approvedCtx: AgentContext = {
			...ctx,
			mode: "autonomous",
		};

		return await ctx.tools.call(approvedCtx, action.toolName, effectiveArgs);
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

/**
 * Creates the default LLM provider for the AI Clinical Copilot with streaming and heuristic fallbacks.
 */
export function createDefaultLlmProvider(): LLMProvider {
	const omniProvider = omniLlmGateway.asLlmProvider();

	return {
		async *complete(params): AsyncIterable<LLMStreamEvent> {
			let emittedAny = false;
			try {
				const stream = omniProvider.complete(params);
				for await (const chunk of stream) {
					emittedAny = true;
					yield chunk;
				}
				return;
			} catch (streamErr: unknown) {
				if (emittedAny) {
					// Mid-stream error; do not corrupt stream with duplicate heuristic output
					throw streamErr;
				}
				console.warn(
					"[CopilotService] OmniGateway stream failed, falling back to deterministic SemanticRouter:",
					streamErr instanceof Error ? streamErr.message : String(streamErr),
				);
			}

			// Local Intelligent Fallback Generator (Deterministic SemanticRouter)
			const lastMsg = params.messages[params.messages.length - 1];
			let userText = "";
			if (typeof lastMsg?.content === "string") {
				userText = lastMsg.content;
			} else if (Array.isArray(lastMsg?.content)) {
				userText = lastMsg.content
					.filter((b): b is TextBlock => b.type === "text")
					.map((b) => b.text)
					.join(" ");
			}
			const lower = userText.toLowerCase();

			// Parse embedded or system-provided clinical context
			const systemStr = params.system || "";
			const toothMatch =
				systemStr.match(/Выбранный зуб \(FDI\):\s*#?([0-9]{2})/i) ||
				userText.match(/(?:зуб[аеу]?|tooth)\s*#?\s*([1-48][1-8])/i);
			const contextTooth = toothMatch?.[1] ? Number(toothMatch[1]) : 46;

			const patientMatch =
				systemStr.match(/Активный пациент:[^()]*\(ID:\s*([a-f0-9-]+)\)/i) ||
				userText.match(
					/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
				);
			const contextPatientId =
				patientMatch?.[1] && patientMatch[1] !== "null"
					? patientMatch[1]
					: "00000000-0000-7000-8000-000000000001";

			yield* routeCopilotFallback({
				userText,
				lower,
				contextTooth,
				contextPatientId,
			});
		},
	};
}

export const defaultLlmProvider = createDefaultLlmProvider();
