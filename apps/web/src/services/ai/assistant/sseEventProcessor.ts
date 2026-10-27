/**
 * sseEventProcessor.ts — Обработчик типизированных фреймов SSE стрима ИИ-ассистента
 */

import type {
	AssistantEventCallbacks,
	AssistantMessage,
	AssistantPhase,
	AssistantToolCall,
	CompactionTriggeredData,
} from "./types";
import { isDestructiveAction, getActionTitleRu } from "../aiActionDispatcher";
import { copilotActionRunner } from "../copilotActionRunner";

export async function processSseEventFrame(
	eventName: string,
	data: Record<string, unknown>,
	msg: AssistantMessage,
	apiBaseUrl: string,
	setPhase: (phase: AssistantPhase) => void,
	callbacks: AssistantEventCallbacks,
	onCompaction: (stats: CompactionTriggeredData & { timestamp: number }) => void,
): Promise<void> {
	switch (eventName) {
		case "thought":
		case "thinking": {
			setPhase("thinking");
			const delta = String(data.text || data.thought || "");
			msg.thinkingContent = (msg.thinkingContent || "") + delta;
			callbacks.onMessageUpdated?.({ ...msg });
			break;
		}

		case "token":
		case "delta":
		case "message": {
			setPhase("responding");
			const textDelta = String(data.text || data.delta || data.content || "");
			msg.content = (msg.content || "") + textDelta;
			callbacks.onMessageUpdated?.({ ...msg });
			break;
		}

		case "tool_call":
		case "tool_start": {
			setPhase("working");
			const callId = String(data.callId || data.id || `call_${Date.now()}`);
			const toolName = String(data.name || data.tool || "tool");
			const args = (data.args || data.arguments || {}) as Record<string, unknown>;
			const destructive = isDestructiveAction(toolName, args);
			const titleRu = getActionTitleRu(toolName);

			const toolCallObj: AssistantToolCall = {
				callId,
				name: toolName,
				arguments: args,
				status: destructive ? "confirmation_required" : "running",
				destructive,
				titleRu,
			};

			msg.toolCalls = [...(msg.toolCalls || []), toolCallObj];
			callbacks.onMessageUpdated?.({ ...msg });

			if (destructive) {
				copilotActionRunner.executeAction({ callId, name: toolName, arguments: args, confirmed: false }, { apiBaseUrl }).catch(() => {});
				callbacks.onConfirmationRequired?.(toolCallObj);
			} else {
				try {
					const result = await copilotActionRunner.executeAction({ callId, name: toolName, arguments: args, confirmed: true }, { apiBaseUrl });
					toolCallObj.status = result.success ? "done" : "failed";
					toolCallObj.result = result;
					callbacks.onMessageUpdated?.({ ...msg });
				} catch {
					toolCallObj.status = "failed";
					callbacks.onMessageUpdated?.({ ...msg });
				}
			}
			break;
		}

		case "tool_confirmation_required":
		case "confirmation_required": {
			setPhase("working");
			const callId = String(data.callId || data.id || `call_${Date.now()}`);
			const toolName = String(data.name || data.tool || "tool");
			const args = (data.args || data.arguments || {}) as Record<string, unknown>;
			const titleRu = getActionTitleRu(toolName);

			const toolCallObj: AssistantToolCall = {
				callId,
				name: toolName,
				arguments: args,
				status: "confirmation_required",
				destructive: true,
				titleRu,
			};

			copilotActionRunner.executeAction({ callId, name: toolName, arguments: args, confirmed: false }, { apiBaseUrl }).catch(() => {});
			const idx = msg.toolCalls?.findIndex((t) => t.callId === callId) ?? -1;
			if (idx >= 0 && msg.toolCalls) {
				msg.toolCalls[idx] = toolCallObj;
			} else {
				msg.toolCalls = [...(msg.toolCalls || []), toolCallObj];
			}
			callbacks.onMessageUpdated?.({ ...msg });
			callbacks.onConfirmationRequired?.(toolCallObj);
			break;
		}

		case "compact_triggered": {
			const before = Number(data.beforeTokens || 0);
			const after = Number(data.afterTokens || 0);
			const saved = Number(data.tokensSaved || Math.max(0, before - after));
			const summary = String(data.summary || "");
			const stats = { beforeTokens: before, afterTokens: after, tokensSaved: saved, summary, timestamp: Date.now() };
			onCompaction(stats);
			callbacks.onCompactTriggered?.(stats);
			break;
		}

		case "tool_end":
		case "tool_result": {
			const callId = String(data.callId || data.id);
			const target = msg.toolCalls?.find((t) => t.callId === callId);
			if (target) {
				const hasErr = (data.result as Record<string, unknown> | undefined)?.error !== undefined;
				target.status = data.ok !== false && !hasErr ? "done" : "failed";
				target.result = data.result;
				callbacks.onMessageUpdated?.({ ...msg });
				if (data.ok !== false) {
					copilotActionRunner.executeAction({ callId, name: target.name, arguments: target.arguments, confirmed: true }, { apiBaseUrl }).catch(() => {});
				}
			}
			break;
		}

		case "error": {
			setPhase("error");
			callbacks.onError?.(String(data.detail || data.message || "Ошибка обработки запроса"));
			break;
		}

		case "done": {
			msg.streaming = false;
			callbacks.onMessageUpdated?.({ ...msg });
			break;
		}
	}
}
