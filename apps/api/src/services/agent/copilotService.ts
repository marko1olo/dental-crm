/**
 * copilotService.ts — SSE Streaming and User Action Confirmation / Rejection Manager.
 */

import type { AgentContext } from "./context.js";
import type { ToolResult } from "./tools/tool.js";
import type { TurnEvent } from "./types.js";

export interface PendingAction {
	readonly sessionId: string;
	readonly callId: string;
	readonly toolName: string;
	readonly arguments: Record<string, unknown>;
	readonly createdAt: number;
}

/**
 * Formats a TurnEvent into standard SSE protocol chunk.
 */
export function formatSseEvent(event: TurnEvent): string {
	const eventName = event.type;
	const payload = JSON.stringify(event);
	return `event: ${eventName}\ndata: ${payload}\n\n`;
}

/**
 * Manages pending actions requiring human-in-the-loop review or confirmation.
 */
export class CopilotActionManager {
	private readonly pendingActions = new Map<string, PendingAction>();

	public registerPending(
		sessionId: string,
		callId: string,
		toolName: string,
		args: Record<string, unknown>,
	): PendingAction {
		const action: PendingAction = {
			sessionId,
			callId,
			toolName,
			arguments: args,
			createdAt: Date.now(),
		};
		this.pendingActions.set(callId, action);
		return action;
	}

	public getPending(callId: string): PendingAction | undefined {
		const action = this.pendingActions.get(callId);
		if (!action) return undefined;

		// Clean up expired actions older than 15 minutes
		if (Date.now() - action.createdAt > 15 * 60 * 1000) {
			this.pendingActions.delete(callId);
			return undefined;
		}

		return action;
	}

	public async confirmAction(
		ctx: AgentContext,
		callId: string,
	): Promise<ToolResult> {
		const action = this.getPending(callId);
		if (!action) {
			return {
				ok: false,
				error: "Запрос на действие не найден или истек срок ожидания",
				executionTimeMs: 0,
			};
		}

		this.pendingActions.delete(callId);

		// Execute with guardrail config overriding supervised requirement for this approved action
		const approvedCtx: AgentContext = {
			...ctx,
			mode: "autonomous",
		};

		return await ctx.tools.call(approvedCtx, action.toolName, action.arguments);
	}

	public rejectAction(
		callId: string,
		reason = "Действие отклонено пользователем",
	): { ok: boolean; reason: string } {
		const action = this.getPending(callId);
		if (!action) {
			return {
				ok: false,
				reason: "Запрос на действие не найден",
			};
		}

		this.pendingActions.delete(callId);
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
