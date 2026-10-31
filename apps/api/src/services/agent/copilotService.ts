/**
 * copilotService.ts — SSE Streaming, Action Confirmation Manager & Default LLM Provider.
 *
 * Compliant with Mandate 8b / 8zi (Decomposed into clean sweet spot modules).
 */

import { routeCopilotFallback } from "./copilotFallbackRouter.js";
import { omniLlmGateway } from "./omniGateway.js";
import type {
	LLMProvider,
	LLMStreamEvent,
	TextBlock,
} from "./types.js";

export {
	formatSseEvent,
	type CopilotStreamSubscriber,
	CopilotStreamManager,
	defaultCopilotStreamManager,
} from "./copilot/copilotStreamManager.js";

export {
	type PendingAction,
	COPILOT_ACTION_TTL_MS,
	CopilotActionManager,
	defaultCopilotActionManager,
} from "./copilot/copilotActionManager.js";

/**
 * Creates the default LLM provider for the AI Clinical Copilot with streaming and heuristic fallbacks.
 */
export function createDefaultLlmProvider(): LLMProvider {
	const defaultOptions = process.env.AGENTROUTER_API_KEYS
		? {
				modelId: process.env.AGENTROUTER_MODEL || "deepseek-v4-flash",
				fallbackChain: ["deepseek", "groq", "gemini"] as const,
		  }
		: {};
	const omniProvider = omniLlmGateway.asLlmProvider(defaultOptions);

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

			// Check if previous turn executed a tool and synthesize closing clinical response
			const lastMessage = params.messages[params.messages.length - 1];
			const isToolTurn = lastMessage?.role === "tool";
			if (isToolTurn && Array.isArray(lastMessage?.content)) {
				const toolResult = (lastMessage.content as any[]).find(
					(b) => b.type === "tool_result",
				);
				if (toolResult && toolResult.content && !toolResult.isError) {
					const res = toolResult.content;
					if (typeof res === "object" && res !== null) {
						if ((res as any).subjective || (res as any).assessment || (res as any).soapSection) {
							yield {
								type: "text_delta",
								text: "Клинический дневник приёма (SOAP) сформирован и готов к применению в медицинскую карту приёма.",
							};
							yield { type: "done", stopReason: "stop" };
							return;
						}
						if ((res as any).totalAmountKopecks !== undefined || (res as any).items || (res as any).estimate) {
							yield {
								type: "text_delta",
								text: "Предварительный расчёт сметы лечения сформирован и готов к согласованию с пациентом.",
							};
							yield { type: "done", stopReason: "stop" };
							return;
						}
					}
					yield {
						type: "text_delta",
						text: "Клиническое действие успешно выполнено.",
					};
					yield { type: "done", stopReason: "stop" };
					return;
				}
			}

			// Local Intelligent Fallback Generator (Deterministic SemanticRouter)
			const lastUserMsg = [...params.messages].reverse().find((m) => m.role === "user");
			let userText = "";
			if (typeof lastUserMsg?.content === "string") {
				userText = lastUserMsg.content;
			} else if (Array.isArray(lastUserMsg?.content)) {
				userText = lastUserMsg.content
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
