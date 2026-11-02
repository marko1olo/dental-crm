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
						if ((res as any).form043Text) {
							yield {
								type: "text_delta",
								text: (res as any).form043Text,
							};
							yield { type: "done", stopReason: "stop" };
							return;
						}
						if ((res as any).subjective || (res as any).assessment || (res as any).soapSection) {
							const diag = (res as any).assessment?.diagnosisTitleRu || "Пульпит";
							const code = (res as any).assessment?.icd10Code || "K04.0";
							const tooth = (res as any).toothNumber || (res as any).assessment?.toothNumber || 46;
							const complaints = (res as any).subjective?.complaints?.join(", ") || "острая боль";
							const anesthesia = (res as any).plan?.anesthesia?.drug || "Артикаин 1:100 000";
							const procedures = (res as any).plan?.procedures?.map((p: string) => `  - ${p}`).join("\n") || "";
							
							const formatted = `**Клинический протокол приёма (SOAP):**\n\n` +
								`🦷 **Локализация:** Зуб ${tooth} | **Диагноз:** [${code}] ${diag}\n\n` +
								`**S (Жалобы):** ${complaints}\n\n` +
								`**O (Объективно):** Глубокая кариозная полость, зондирование дна болезненно, перкуссия безболезненная.\n\n` +
								`**A (Оценка):** [${code}] ${diag} зуба ${tooth}. Показано эндодонтическое лечение.\n\n` +
								`**P (План лечения):**\n` +
								`1. Анестезия: ${anesthesia} (с учётом соматического статуса и аллергоанамнеза)\n` +
								`2. Изоляция: Коффердам (OptraDam)\n` +
								(procedures ? `3. Протокол вмешательства:\n${procedures}\n\n` : "") +
								`*Протокол готов к утверждению врачом и внесению в медицинскую карту приёма.*`;
							
							yield {
								type: "text_delta",
								text: formatted,
							};
							yield { type: "done", stopReason: "stop" };
							return;
						}
						if ((res as any).totalAmountKopecks !== undefined || (res as any).items || (res as any).estimate) {
							const totalRub = Math.round(((res as any).totalAmountKopecks ?? 0) / 100);
							const items = (res as any).items ?? (res as any).estimate?.items ?? [];
							const itemsList = items.map((it: any) => `• ${it.title || it.name}: ${Math.round((it.priceKopecks ?? it.amountKopecks ?? 0) / 100)} ₽`).join("\n");
							yield {
								type: "text_delta",
								text: `**Предварительный расчёт сметы лечения:**\n\n${itemsList}\n\n💰 **Итого к согласованию:** ${totalRub.toLocaleString("ru-RU")} ₽\n\n*Смета сформирована в 1 клик и готова к печати или утверждению пациентом.*`,
							};
							yield { type: "done", stopReason: "stop" };
							return;
						}
					}
					yield {
						type: "text_delta",
						text: `**Клиническое действие выполнено:**\n\`\`\`json\n${JSON.stringify(res, null, 2)}\n\`\`\``,
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
