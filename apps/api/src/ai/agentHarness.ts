/**
 * agentHarness.ts — Autonomous Clinical Dental Agent ReAct Harness
 *
 * Implements resilient ReAct (Reasoning + Acting) execution loop with native
 * OpenAI/DeepSeek Tool Calling, Server-Sent Events (SSE) streaming callbacks,
 * StAR / ICD-10 clinical domain safety, T.A.R.S. anti-sycophancy, runtimeMode awareness
 * (web_browser vs desktop_native workstation), and iteration guards (maxIterations = 6).
 */

import {
	agentRouterClient,
	createChatCompletion,
	maskApiKey,
	safeParseToolArguments,
	type AgentRouterChatMessage,
	type AgentRouterClient,
	type AgentRouterToolCall,
	type AgentRouterToolDefinition,
} from "./agentRouterClient.js";
import {
	executeDentalTool,
	getDentalTools,
	type AgentRuntimeMode,
	type DentalToolContext,
} from "./dentalTools.js";
import { MASTER_COGNITIVE_ARCHITECTURE_TEXT } from "../../../../packages/shared/src/ai/clinicalCognitiveCore.js";

export const MAX_REACT_ITERATIONS = 6;

export interface AgentHarnessEventToken {
	type: "token";
	text: string;
}

export interface AgentHarnessEventReasoning {
	type: "reasoning";
	text: string;
}

export interface AgentHarnessEventToolStart {
	type: "tool_start";
	tool: string;
	args: Record<string, unknown>;
	callId: string;
}

export interface AgentHarnessEventToolEnd {
	type: "tool_end";
	tool: string;
	result: unknown;
	callId: string;
}

export interface AgentHarnessEventDone {
	type: "done";
	text: string;
	toolCallsCount: number;
	iterations: number;
}

export interface AgentHarnessEventError {
	type: "error";
	error: string;
	code?: string;
}

export type AgentHarnessEvent =
	| AgentHarnessEventToken
	| AgentHarnessEventReasoning
	| AgentHarnessEventToolStart
	| AgentHarnessEventToolEnd
	| AgentHarnessEventDone
	| AgentHarnessEventError;

export interface AgentHarnessParams {
	messages: AgentRouterChatMessage[];
	context: DentalToolContext;
	runtimeMode?: AgentRuntimeMode;
	client?: AgentRouterClient;
	maxIterations?: number;
	onEvent?: (event: AgentHarnessEvent) => void | Promise<void>;
	signal?: AbortSignal;
}

export interface AgentHarnessResult {
	text: string;
	toolCalls: Array<{ tool: string; args: Record<string, unknown>; result: unknown }>;
	iterations: number;
	aborted?: boolean;
}

/**
 * Builds the clinical system prompt tailored to DENTE CRM standards,
 * evidence-based dental medicine, and host execution environment.
 */
export function buildAgentSystemPrompt(
	runtimeMode: AgentRuntimeMode = "web_browser",
	context?: DentalToolContext,
): string {
	const runtimeSpecificDirective =
		runtimeMode === "desktop_native"
			? `[СРЕДА ВЫПОЛНЕНИЯ: DESKTOP_NATIVE (ЛОКАЛЬНАЯ РАБОЧАЯ СТАНЦИЯ ВРАЧА)]
Ты работаешь внутри установленного настольного приложения DENTE Clinic (Windows Desktop EXE).
Тебе доступны аппаратные инструменты прямого взаимодействия с ПК врача (Antigravity Workstation Tools):
- 'open_visiograph_folder': прямой доступ к локальной папке экспорта снимков визиографа (VATECH, Dexis, Planmeca).
- 'launch_sensor_driver': прямое аппаратное управление интраоральным радиовизиографом.
Если врач просит проверить снимок или включить визиограф — активно вызывай эти инструменты!`
			: `[СРЕДА ВЫПОЛНЕНИЯ: WEB_BROWSER (БРАУЗЕРНЫЙ КЛИЕНТ)]
Ты работаешь в стандартном веб-браузере врача.
Тебе доступны все клинические инструменты анализа карты, расчета анестезии, проверки соматики, СтАР протоколов и зубной формулы.
Аппаратное прямое управление USB-датчиками и локальными папками Windows недоступно из браузера.
Если врач просит прямой аппаратный запуск визиографа — объясни, что эта функция активируется в настольном приложении DENTE Desktop EXE, а в веб-версии снимок загружается через интерфейс.`;

	const patientContextInfo = context?.patientId
		? `Активный пациент ID: ${context.patientId}. При необходимости используй инструменты 'get_patient_card' и 'get_dental_formula'.`
		: "Активный пациент в контексте не выбран. Если вопрос касается конкретного пациента — запроси ID или ФИО.";

	return `Ты — Автономный Клинический Эксперт и Ассистент Врача-Стоматолога DENTE CRM.
Твой статус: клинический Red Team соратник врача с презумпцией доказательности (EBM) 100%.

${MASTER_COGNITIVE_ARCHITECTURE_TEXT}

=== ПРИНЦИПЫ РАБОТЫ И ИСПОЛЬЗОВАНИЯ ИНСТРУМЕНТОВ ===
1. ВХОД: Свободная естественная речь врача. Категорически запрещены слэш-команды (/calc, /rx, /record) — ты автономно понимаешь клинику и вызываешь нужные инструменты через Function Calling.
2. ИНСТРУМЕНТЫ (DENTAL TOOL ARSENAL):
   - 'calculate_anesthesia': расчет безопасной дозы анестетика (артикаин, мепивакаин, лидокаин) по весу и кардиорискам.
   - 'get_patient_card': запрос ЭМК 043/у пациента.
   - 'check_somatic_contraindications': проверка стоп-факторов (гипертония, бисфосфонаты, антикоагулянты, аллергии).
   - 'get_star_protocol': клинические протоколы СтАР по МКБ-10 (K02.1, K04.0, K04.5, K05.3).
   - 'calculate_treatment_estimate': смета услуг по Номенклатуре 804н.
   - 'check_drug_interactions': проверка совместимости медикаментов.
   - 'get_dental_formula': чтение зубной формулы FDI (11..48, 51..85).
   - 'update_tooth_status': внесение диагноза зуба.
   - 'draft_soap_diary': составление записи SOAP в амбулаторную карту.
3. АВТОНОМИЯ: Если для ответа врачу требуются данные (например, доза анестетика, протокол СтАР или карта) — НЕ ПРИДУМЫВАЙ их «из головы», а НЕМЕДЛЕННО вызывай соответствующий инструмент!
4. СТИЛЬ: Лаконичный, профессиональный, медицинский русский язык. Никакой пустой любезности и воды. Сразу к клинической сути.

${runtimeSpecificDirective}
${patientContextInfo}`;
}

/**
 * Runs the ReAct execution loop for autonomous dental assistant.
 */
export async function runAgentHarness(
	params: AgentHarnessParams,
): Promise<AgentHarnessResult> {
	const {
		messages,
		context,
		runtimeMode = context.runtimeMode || "web_browser",
		client = agentRouterClient,
		maxIterations = MAX_REACT_ITERATIONS,
		onEvent,
		signal,
	} = params;

	const effectiveToolContext: DentalToolContext = {
		...context,
		runtimeMode,
	};

	const tools: AgentRouterToolDefinition[] = getDentalTools(runtimeMode);
	const systemPrompt = buildAgentSystemPrompt(runtimeMode, effectiveToolContext);

	// Working history for this ReAct execution turn
	const history: AgentRouterChatMessage[] = [
		{ role: "system", content: systemPrompt },
		...messages,
	];

	const recordedToolCalls: Array<{
		tool: string;
		args: Record<string, unknown>;
		result: unknown;
	}> = [];

	let iteration = 0;
	let finalResponseText = "";

	while (iteration < maxIterations) {
		if (signal?.aborted) {
			onEvent?.({
				type: "error",
				error: "Запрос был прерван клиентом (Connection aborted)",
			});
			return {
				text: finalResponseText,
				toolCalls: recordedToolCalls,
				iterations: iteration,
				aborted: true,
			};
		}

		iteration++;

		try {
			const completion = await client.createChatCompletion({
				messages: history,
				tools,
				tool_choice: "auto",
				temperature: 0.2,
				signal,
			});

			const choice = completion.choices[0];
			if (!choice || !choice.message) {
				throw new Error("AgentRouter returned an empty choices array.");
			}

			const message = choice.message;
			const toolCalls = message.tool_calls;
			const content = message.content;
			const reasoning = message.reasoning_content;

			if (reasoning) {
				onEvent?.({ type: "reasoning", text: reasoning });
			}

			// CASE 1: Model returned text without tool calls -> Final Answer reached
			if (!toolCalls || toolCalls.length === 0) {
				finalResponseText = content || "";
				if (finalResponseText) {
					onEvent?.({ type: "token", text: finalResponseText });
				}
				onEvent?.({
					type: "done",
					text: finalResponseText,
					toolCallsCount: recordedToolCalls.length,
					iterations: iteration,
				});
				return {
					text: finalResponseText,
					toolCalls: recordedToolCalls,
					iterations: iteration,
				};
			}

			// CASE 2: Model returned tool_calls -> Execute tools in ReAct loop
			// Add assistant tool_calls message to history
			history.push({
				role: "assistant",
				content: content || null,
				tool_calls: toolCalls,
			});

			if (content) {
				onEvent?.({ type: "token", text: content });
			}

			for (const call of toolCalls) {
				const toolName = call.function.name;
				const parsedArgs =
					safeParseToolArguments<Record<string, unknown>>(call) || {};

				onEvent?.({
					type: "tool_start",
					tool: toolName,
					args: parsedArgs,
					callId: call.id,
				});

				let toolResult: unknown;
				try {
					toolResult = await executeDentalTool(
						toolName,
						parsedArgs,
						effectiveToolContext,
					);
				} catch (toolExecErr) {
					const msg =
						toolExecErr instanceof Error
							? toolExecErr.message
							: String(toolExecErr);
					toolResult = { error: "ToolExecutionFailed", message: msg };
				}

				recordedToolCalls.push({
					tool: toolName,
					args: parsedArgs,
					result: toolResult,
				});

				onEvent?.({
					type: "tool_end",
					tool: toolName,
					result: toolResult,
					callId: call.id,
				});

				// Append tool execution result message for model's next turn
				history.push({
					role: "tool",
					tool_call_id: call.id,
					content: JSON.stringify(toolResult),
				});
			}

			// Check if iteration limit is reached after tool executions
			if (iteration >= maxIterations) {
				const fallbackNotice =
					"\n\n[Достигнут предел клинических итераций (maxIterations = 6). Все промежуточные вызовы инструментов сохранены.]";
				finalResponseText += fallbackNotice;
				onEvent?.({ type: "token", text: fallbackNotice });
				onEvent?.({
					type: "done",
					text: finalResponseText,
					toolCallsCount: recordedToolCalls.length,
					iterations: iteration,
				});
				return {
					text: finalResponseText,
					toolCalls: recordedToolCalls,
					iterations: iteration,
				};
			}
		} catch (turnErr: unknown) {
			const safeErrMsg =
				turnErr instanceof Error
					? maskApiKey(turnErr.message)
					: "Внутренняя ошибка выполнения модели";

			onEvent?.({
				type: "error",
				error: safeErrMsg,
			});

			throw new Error(safeErrMsg);
		}
	}

	onEvent?.({
		type: "done",
		text: finalResponseText,
		toolCallsCount: recordedToolCalls.length,
		iterations: iteration,
	});

	return {
		text: finalResponseText,
		toolCalls: recordedToolCalls,
		iterations: iteration,
	};
}
