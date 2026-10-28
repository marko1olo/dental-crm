/**
 * actionConfirmationHandler.ts — Shared Handler for Copilot Action Confirmations and ReAct Closure.
 *
 * Implements two-phase execution guard and ReAct stream closure (Mandates 8e, 8b).
 */

import type { FastifyReply } from "fastify";
import { db } from "../../db/client.js";
import { PERMISSIONS } from "../../security/permissions.js";
import {
	AgentOrchestrator,
	buildDenteAgentSystemPrompt,
	defaultCopilotActionManager,
	defaultLlmProvider,
	defaultSessionStore,
	defaultToolRegistry,
	formatSseEvent,
	type AgentContext,
	type TurnEvent,
} from "../../services/agent/index.js";

const DENTE_COPILOT_SYSTEM_PROMPT = buildDenteAgentSystemPrompt();

export interface ActionConfirmationParams {
	readonly reply: FastifyReply;
	readonly resolvedOrgId: string;
	readonly userId: string;
	readonly role: string;
	readonly sessionId: string;
	readonly callId: string;
	readonly decision: "confirm" | "reject";
	readonly reason?: string | undefined;
	readonly modifiedArgs?: Record<string, unknown> | undefined;
	readonly wantsJson: boolean;
}

export async function handleActionConfirmation(
	params: ActionConfirmationParams,
): Promise<void> {
	const {
		reply,
		resolvedOrgId,
		userId,
		role,
		sessionId,
		callId,
		decision,
		reason,
		modifiedArgs,
		wantsJson,
	} = params;

	if (decision === "confirm") {
		const pending = await defaultCopilotActionManager.resolvePending(
			callId,
			resolvedOrgId,
		);
		if (!pending) {
			if (wantsJson) {
				await reply.code(404).send({
					error: "NotFound",
					message:
						"Запрос на действие не найден или истек срок ожидания (15 минут)",
				});
				return;
			}
			reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
			reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
			reply.raw.setHeader("Connection", "keep-alive");
			reply.raw.setHeader("X-Accel-Buffering", "no");
			reply.raw.flushHeaders?.();
			reply.raw.write(
				formatSseEvent({
					type: "token",
					text: "\n\n⚠️ Запрос на действие не найден или истек срок ожидания (15 минут).",
				}),
			);
			reply.raw.write(formatSseEvent({ type: "final", stopReason: "expired" }));
			reply.raw.end();
			return;
		}

		const ctx: AgentContext = {
			organizationId: resolvedOrgId,
			clinicId: resolvedOrgId,
			userId,
			sessionId,
			mode: "autonomous",
			role,
			permissions: [...PERMISSIONS],
			tools: defaultToolRegistry,
			db,
		};

		try {
			const result = await defaultCopilotActionManager.confirmAction(
				ctx,
				callId,
				modifiedArgs,
			);

			if (wantsJson) {
				await reply.code(200).send({
					ok: result.ok,
					result: result.ok ? result.data : undefined,
					error: result.error,
				});
				return;
			}

			// Setup SSE headers for ReAct Stream Closure
			reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
			reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
			reply.raw.setHeader("Connection", "keep-alive");
			reply.raw.setHeader("X-Accel-Buffering", "no");
			reply.raw.flushHeaders?.();

			const toolFinishedEvent: TurnEvent = {
				type: "tool_call_finished",
				callId,
				name: pending.toolName,
				ok: result.ok,
				result: result.ok ? result.data : { error: result.error },
			};
			reply.raw.write(formatSseEvent(toolFinishedEvent));

			// Append tool result into persistent session history
			const session = await defaultSessionStore.getOrCreate(
				sessionId,
				resolvedOrgId,
				userId,
				resolvedOrgId,
			);

			session.history.push({
				role: "tool",
				content: [
					{
						type: "tool_result",
						toolCallId: callId,
						content: result.ok ? result.data : { error: result.error },
						isError: !result.ok,
					},
				],
			});

			// Continue ReAct turn to generate closing assistant message
			const stream = AgentOrchestrator.runTurnStream({
				ctx,
				provider: defaultLlmProvider,
				system: DENTE_COPILOT_SYSTEM_PROMPT,
				history: session.history,
				toolNames: defaultToolRegistry.list(),
				redactor: session.redactor,
			});

			for await (const event of stream) {
				if (event.type === "confirmation_required") {
					defaultCopilotActionManager.registerPending(
						sessionId,
						event.callId,
						event.name,
						event.arguments,
						{ organizationId: resolvedOrgId, userId },
					);
				}
				reply.raw.write(formatSseEvent(event));
			}

			await defaultSessionStore
				.save(sessionId, resolvedOrgId, session, userId, resolvedOrgId)
				.catch(() => {});
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			reply.raw.write(
				formatSseEvent({
					type: "token",
					text: `\n\n❌ Исключение при выполнении действия: ${errorMsg}`,
				}),
			);
			reply.raw.write(formatSseEvent({ type: "final", stopReason: "error" }));
		} finally {
			reply.raw.end();
		}
		return;
	}

	// decision === "reject"
	const rejection = await defaultCopilotActionManager.rejectActionAsync(
		callId,
		reason ?? "Отклонено пользователем",
		resolvedOrgId,
	);

	if (wantsJson) {
		await reply.code(200).send({
			ok: true,
			rejected: true,
			reason: rejection.reason,
		});
		return;
	}

	reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
	reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
	reply.raw.setHeader("Connection", "keep-alive");
	reply.raw.setHeader("X-Accel-Buffering", "no");
	reply.raw.flushHeaders?.();

	try {
		const session = await defaultSessionStore.getOrCreate(
			sessionId,
			resolvedOrgId,
			userId,
			resolvedOrgId,
		);

		session.history.push({
			role: "tool",
			content: [
				{
					type: "tool_result",
					toolCallId: callId,
					content: {
						error: `Действие отменено пользователем: ${rejection.reason}`,
					},
					isError: true,
				},
			],
		});

		reply.raw.write(
			formatSseEvent({
				type: "token",
				text: `\n\n🚫 Действие отменено пользователем: ${rejection.reason}`,
			}),
		);
		reply.raw.write(formatSseEvent({ type: "final", stopReason: "rejected" }));

		await defaultSessionStore
			.save(sessionId, resolvedOrgId, session, userId, resolvedOrgId)
			.catch(() => {});
	} finally {
		reply.raw.end();
	}
}
