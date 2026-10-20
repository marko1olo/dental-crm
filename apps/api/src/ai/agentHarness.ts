/**
 * agentHarness.ts — Autonomous Clinical Dental Agent ReAct Harness
 *
 * Implements resilient ReAct (Reasoning + Acting) execution loop with native
 * OpenAI/DeepSeek Tool Calling, Server-Sent Events (SSE) streaming callbacks,
 * StAR / ICD-10 clinical domain safety, T.A.R.S. anti-sycophancy, runtimeMode awareness
 * (web_browser vs desktop_native workstation), and iteration guards (maxIterations = 6).
 */

import {
	MASTER_COGNITIVE_ARCHITECTURE_TEXT,
	type TaskPlan,
	formatPlanForSystemPrompt,
} from "@dental/shared";
import {
	type AgentRouterChatMessage,
	type AgentRouterChatResponse,
	type AgentRouterClient,
	type AgentRouterToolDefinition,
	agentRouterClient,
	maskApiKey,
	safeParseToolArguments,
} from "./agentRouterClient.js";
import {
	type AgentRuntimeMode,
	type DentalToolContext,
	executeDentalTool,
	getDentalTools,
	getToolDescriptionRu,
	isDestructiveDentalTool,
} from "./dentalTools.js";
import {
	compactConversationHistory,
	shouldCompactContext,
	type CompactedHistoryResult,
	type TokenCompactorOptions,
} from "./contextCompactor.js";
import {
	estimateConversationTokens,
	estimateTextTokens,
} from "./tokenCounter.js";

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

export interface AgentHarnessEventConfirmationRequired {
	type: "confirmation_required";
	tool: string;
	args: Record<string, unknown>;
	callId: string;
	descriptionRu?: string;
}

export interface AgentHarnessEventCompactTriggered {
	type: "compact_triggered";
	beforeTokens: number;
	afterTokens: number;
	tokensSaved: number;
	prunedToolOutputsCount: number;
	compressedMessagesCount: number;
	summary: string;
}

export interface AgentHarnessEventPlanUpdated {
	type: "plan_updated";
	plan: TaskPlan;
}

export interface AgentHarnessEventDone {
	type: "done";
	text: string;
	toolCallsCount: number;
	iterations: number;
	tokenUsage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		estimatedPromptTokens?: number | undefined;
	} | undefined;
	compacted?: boolean | undefined;
	plan?: TaskPlan | undefined;
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
	| AgentHarnessEventConfirmationRequired
	| AgentHarnessEventCompactTriggered
	| AgentHarnessEventPlanUpdated
	| AgentHarnessEventDone
	| AgentHarnessEventError;

export interface AgentHarnessParams {
	messages: AgentRouterChatMessage[];
	context: DentalToolContext;
	runtimeMode?: AgentRuntimeMode | undefined;
	client?: AgentRouterClient | undefined;
	maxIterations?: number | undefined;
	stream?: boolean | undefined;
	requireConfirmationForDestructive?: boolean | undefined;
	onEvent?: ((event: AgentHarnessEvent) => void | Promise<void>) | undefined;
	signal?: AbortSignal | undefined;
	// Auto-compaction & Sliding window options
	enableAutoCompaction?: boolean | undefined;
	compactThresholdTokens?: number | undefined;
	slidingWindowRetainedTurns?: number | undefined;
	initialSummary?: string | undefined;
	initialPlan?: TaskPlan | undefined;
}

export interface AgentHarnessResult {
	text: string;
	toolCalls: Array<{
		tool: string;
		args: Record<string, unknown>;
		result: unknown;
	}>;
	iterations: number;
	aborted?: boolean | undefined;
	compacted?: boolean | undefined;
	summary?: string | undefined;
	plan?: TaskPlan | undefined;
	tokenUsage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		estimatedPromptTokens?: number | undefined;
	} | undefined;
}

/**
 * Builds the clinical system prompt tailored to DENTE CRM standards,
 * evidence-based dental medicine, and host execution environment.
 */
export function buildAgentSystemPrompt(
	runtimeMode: AgentRuntimeMode = "web_browser",
	context?: DentalToolContext,
	activePlan?: TaskPlan,
): string {
	const runtimeSpecificDirective =
		runtimeMode === "desktop_native"
			? `[СРЕДА ВЫПОЛНЕНИЯ: DESKTOP_NATIVE (ЛОКАЛЬНАЯ РАБОЧАЯ СТАНЦИЯ ВРАЧА — NATIVE AGENT HARNESS)]
Ты работаешь внутри установленного настольного приложения DENTE Clinic (Windows Desktop EXE).
Тебе доступен полный системный агентный харнесс операционной системы Windows (Antigravity Workstation Tools):
1. Файловый I/O и глубокий поиск:
   - 'search_workstation_files': глубокий рекурсивный поиск файлов на дисках ПК (снимки DICOM/RVG, прейскуранты, базы пациентов, протоколы).
   - 'read_clinical_file': чтение локальных файлов, протоколов, срезов строк и снимков.
   - 'write_clinical_file': безопасное сохранение клинических файлов, выписок и дампов.
   - 'replace_file_content': точечное редактирование содержимого файлов на ПК по фрагменту текста.
   - 'list_patient_study_directory': инспекция папки снимков пациента.
   - 'open_patient_dropzone_folder': открытие папки снимков в Проводнике Windows.
2. Процессы и фоновые задачи:
   - 'run_workstation_command': запуск диагностических команд оборудования с контролем времени WaitMsBeforeAsync и уходом в фон.
   - 'manage_task': фоновый менеджер задач (list, status, kill, send_input).
   - 'schedule': установка таймеров и периодических напоминаний для ассистента.
3. Внешний медицинский софт и Vision:
   - 'launch_workstation_app': запуск программ Planmeca Romexis, VATECH EzDent, EasyDent, Sidexis, 3Shape, Exocad.
   - 'capture_workstation_screen': захват снимка экрана или ROI датчика визиографа для мультимодального анализа.
4. Локальный MCP-мост (Model Context Protocol):
   - 'call_local_mcp_tool': вызов инструментов кассовых аппаратов Атол/Штрих-М, 2D сканеров Честный Знак и TWAIN-сенсоров.
   - 'list_local_mcp_tools', 'read_local_mcp_resource': опрос инструментов и телеметрии подключенного оборудования.
5. Настройка и импорт данных клиники:
   - 'configure_clinic_setup': автономная настройка клиники под ключ (кресла, врачи, смены, каталог услуг, кассовый аппарат).
   - 'import_clinic_data_file': пакетный импорт прейскуранта услуг или базы пациентов из файлов Excel, CSV, JSON.
Если врач просит настроить клинику, найти файл, проверить датчик или фискализировать чек — активно используй эти системные инструменты!`
			: `[СРЕДА ВЫПОЛНЕНИЯ: WEB_BROWSER (БРАУЗЕРНЫЙ КЛИЕНТ)]
Ты работаешь в стандартном веб-браузере врача.
Тебе доступны все клинические инструменты анализа карты, расчета анестезии, проверки соматики, протоколов лечения и зубной формулы, а также настройка клиники и импорт файлов.
Аппаратное прямое управление USB-датчиками, кассами и локальными папками Windows недоступно из браузера.
Если врач просит прямой аппаратный запуск оборудования — объясни, что эта функция активируется в настольном приложении DENTE Desktop EXE, а в веб-версии снимок загружается через интерфейс.`;

	const patientContextInfo = context?.patientId
		? `Активный пациент ID: ${context.patientId}. При необходимости используй инструменты 'get_patient_emr_and_odontogram' и 'update_tooth_status'.`
		: "Активный пациент в контексте не выбран. Если вопрос касается конкретного пациента — запроси ID или ФИО.";

	const planSection = activePlan
		? `\n\n=== АКТИВНЫЙ ПЛАН ВЫПОЛНЕНИЯ ЗАДАЧИ ===\n${formatPlanForSystemPrompt(activePlan)}`
		: "";

	return `Ты — Автономный Клинический Эксперт и Ассистент Врача-Стоматолога DENTE CRM.
Твой статус: клинический Red Team соратник врача с презумпцией доказательности (EBM) 100%.

${MASTER_COGNITIVE_ARCHITECTURE_TEXT}

=== ПРИНЦИПЫ РАБОТЫ И ИСПОЛЬЗОВАНИЯ ИНСТРУМЕНТОВ ===
1. ВХОД: Свободная естественная речь врача. Категорически запрещены слэш-команды (/calc, /rx, /record) — ты автономно понимаешь клинику и вызываешь нужные инструменты через Function Calling.
2. ИНСТРУМЕНТЫ (DENTAL TOOL ARSENAL):
   - 'manage_task_plan': создание и ведение динамического плана многошаговых задач (create, update_status, add_item, get_plan).
   - 'configure_clinic_setup': экспресс-настройка клиники под ключ (кабинеты, врачи, смены, прейскурант, касса).
   - 'import_clinic_data_file': пакетный импорт прейскуранта или картотеки пациентов из файлов CSV/JSON.
   - 'search_workstation_files': глубокий поиск снимков, баз и документов на дисках ПК.
   - 'calculate_anesthesia': расчет безопасной дозы анестетика (артикаин, мепивакаин, лидокаин) по весу и кардиорискам.
   - 'get_patient_emr_and_odontogram': запрос электронной медицинской карты и зубной формулы.
   - 'check_somatic_risks': проверка противопоказаний (гипертония, бисфосфонаты, антикоагулянты, аллергии).
   - 'search_clinic_services_and_prices': поиск услуг и цен в прейскуранте клиники.
   - 'update_tooth_status': внесение диагноза или состояния зуба в одонтограмму.
   - 'generate_form_043_entry': составление дневника приёма по стандарту SOAP.
   - 'create_appointment': добавление записи в расписание.
   - 'create_invoice_draft': формирование счёта на оплату.
   - 'print_document': отправка медицинской карты, согласий и актов на печать.
3. АВТОНОМИЯ: Если для ответа врачу требуются данные (например, доза анестетика, протокол или карта) — НЕ ПРИДУМЫВАЙ их «из головы», а НЕМЕДЛЕННО вызывай соответствующий инструмент!
4. СТИЛЬ: Лаконичный, профессиональный, медицинский русский язык. Никакой пустой любезности и воды. Сразу к клинической сути.

${runtimeSpecificDirective}
${patientContextInfo}${planSection}`;
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
		initialPlan,
	} = params;

	let activePlan: TaskPlan | undefined = initialPlan;

	const effectiveToolContext: DentalToolContext = {
		...context,
		runtimeMode,
	};

	const tools: AgentRouterToolDefinition[] = getDentalTools(runtimeMode);
	const systemPrompt = buildAgentSystemPrompt(
		runtimeMode,
		effectiveToolContext,
		activePlan,
	);

	// Working history for this ReAct execution turn
	let history: AgentRouterChatMessage[] = [
		{ role: "system", content: systemPrompt },
		...messages,
	];

	let hasCompacted = false;
	let currentSummary = params.initialSummary || "";
	let lastRecordedUsage: AgentHarnessResult["tokenUsage"] | undefined;

	const compactorOptions: TokenCompactorOptions = {
		...(params.compactThresholdTokens !== undefined
			? { thresholdTokens: params.compactThresholdTokens }
			: {}),
		...(params.slidingWindowRetainedTurns !== undefined
			? { retainedRecentTurns: params.slidingWindowRetainedTurns }
			: {}),
		previousSummary: currentSummary,
	};

	// Level 1 + Level 2 initial check: compact before the first inference turn if dialogue exceeds threshold
	if (params.enableAutoCompaction !== false && shouldCompactContext(history, compactorOptions)) {
		const compactResult = compactConversationHistory(history, compactorOptions);
		if (compactResult.compacted) {
			hasCompacted = true;
			currentSummary = compactResult.summary;
			history = compactResult.compactedMessages as AgentRouterChatMessage[];

			onEvent?.({
				type: "compact_triggered",
				beforeTokens: compactResult.beforeTokens,
				afterTokens: compactResult.afterTokens,
				tokensSaved: compactResult.tokensSaved,
				prunedToolOutputsCount: compactResult.prunedToolOutputsCount,
				compressedMessagesCount: compactResult.compressedMessagesCount,
				summary: compactResult.summary,
			});
		}
	}

	const recordedToolCalls: Array<{
		tool: string;
		args: Record<string, unknown>;
		result: unknown;
	}> = [];

	let iteration = 0;
	let finalResponseText = "";
	let consecutiveToolFailures = 0;
	let lastFailedToolName = "";

	while (iteration < maxIterations) {
		if (signal?.aborted) {
			onEvent?.({
				type: "error",
				error: "Запрос был прерван клиентом (Connection aborted)",
				code: "ABORTED",
			});
			return {
				text: finalResponseText,
				toolCalls: recordedToolCalls,
				iterations: iteration,
				aborted: true,
				compacted: hasCompacted,
				summary: currentSummary || undefined,
				tokenUsage: lastRecordedUsage,
			};
		}

		iteration++;

		// Mid-execution compaction check if tool outputs swelled the context during multi-step ReAct
		if (params.enableAutoCompaction !== false && iteration > 1) {
			const midCompactorOpts: TokenCompactorOptions = {
				...(params.compactThresholdTokens !== undefined
					? { thresholdTokens: params.compactThresholdTokens }
					: {}),
				...(params.slidingWindowRetainedTurns !== undefined
					? { retainedRecentTurns: params.slidingWindowRetainedTurns }
					: {}),
				previousSummary: currentSummary,
			};

			if (shouldCompactContext(history, midCompactorOpts)) {
				const compactResult = compactConversationHistory(history, midCompactorOpts);
				if (compactResult.compacted) {
					hasCompacted = true;
					currentSummary = compactResult.summary;
					history = compactResult.compactedMessages as AgentRouterChatMessage[];

					onEvent?.({
						type: "compact_triggered",
						beforeTokens: compactResult.beforeTokens,
						afterTokens: compactResult.afterTokens,
						tokensSaved: compactResult.tokensSaved,
						prunedToolOutputsCount: compactResult.prunedToolOutputsCount,
						compressedMessagesCount: compactResult.compressedMessagesCount,
						summary: compactResult.summary,
					});
				}
			}
		}

		try {
			const isStreamingRequested =
				params.stream !== false &&
				typeof client.createStreamingChatCompletion === "function";

			let completion: AgentRouterChatResponse;
			let streamEmittedTokens = false;

			if (isStreamingRequested) {
				completion = await client.createStreamingChatCompletion(
					{
						messages: history,
						tools,
						tool_choice: "auto",
						temperature: 0.2,
						signal,
					},
					{
						onChunk: (chunk) => {
							streamEmittedTokens = true;
							onEvent?.({ type: "token", text: chunk });
						},
						onReasoningChunk: (reasoningChunk) => {
							onEvent?.({ type: "reasoning", text: reasoningChunk });
						},
					},
				);
			} else {
				completion = await client.createChatCompletion({
					messages: history,
					tools,
					tool_choice: "auto",
					temperature: 0.2,
					signal,
				});

				const reasoning = completion.choices[0]?.message?.reasoning_content;
				if (reasoning) {
					onEvent?.({ type: "reasoning", text: reasoning });
				}
			}

			const choice = completion.choices[0];
			if (!choice?.message) {
				throw new Error("AgentRouter returned an empty choices array.");
			}

			if (completion.usage) {
				lastRecordedUsage = {
					promptTokens: completion.usage.prompt_tokens,
					completionTokens: completion.usage.completion_tokens,
					totalTokens: completion.usage.total_tokens,
					estimatedPromptTokens: estimateConversationTokens(history),
				};
			} else {
				const est = estimateConversationTokens(history);
				const compEst = estimateTextTokens(choice.message.content || "");
				lastRecordedUsage = {
					promptTokens: est,
					completionTokens: compEst,
					totalTokens: est + compEst,
					estimatedPromptTokens: est,
				};
			}

			const message = choice.message;
			const toolCalls = message.tool_calls;
			const content = message.content;

			// CASE 1: Model returned text without tool calls -> Final Answer reached
			if (!toolCalls || toolCalls.length === 0) {
				finalResponseText = content || "";
				// Only emit token event if non-streaming or if no chunks were emitted during streaming
				if (finalResponseText && !streamEmittedTokens) {
					onEvent?.({ type: "token", text: finalResponseText });
				}
				onEvent?.({
					type: "done",
					text: finalResponseText,
					toolCallsCount: recordedToolCalls.length,
					iterations: iteration,
					tokenUsage: lastRecordedUsage,
					compacted: hasCompacted,
					plan: activePlan,
				});
				return {
					text: finalResponseText,
					toolCalls: recordedToolCalls,
					iterations: iteration,
					compacted: hasCompacted,
					summary: currentSummary || undefined,
					tokenUsage: lastRecordedUsage,
					plan: activePlan,
				};
			}

			// CASE 2: Model returned tool_calls -> Execute tools in ReAct loop
			// Add assistant tool_calls message to history
			history.push({
				role: "assistant",
				content: content || null,
				tool_calls: toolCalls,
			});

			if (content && !streamEmittedTokens) {
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

				// Two-phase execution guard: check if operation is destructive
				const isDestructive = isDestructiveDentalTool(toolName);
				if (
					params.requireConfirmationForDestructive &&
					isDestructive &&
					!effectiveToolContext.allowLocalExecution
				) {
					const descRu = getToolDescriptionRu(toolName);
					onEvent?.({
						type: "confirmation_required",
						tool: toolName,
						args: parsedArgs,
						callId: call.id,
						descriptionRu: descRu,
					});

					const pendingResult = {
						status: "confirmation_required",
						destructive: true,
						message: `Действие '${descRu}' требует подтверждения врача.`,
						args: parsedArgs,
					};

					recordedToolCalls.push({
						tool: toolName,
						args: parsedArgs,
						result: pendingResult,
					});

					onEvent?.({
						type: "tool_end",
						tool: toolName,
						result: pendingResult,
						callId: call.id,
					});

					history.push({
						role: "tool",
						tool_call_id: call.id,
						content: JSON.stringify(pendingResult),
					});
					continue;
				}

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
					toolResult = {
						success: false,
						code: "TOOL_EXECUTION_FAILED",
						error: "ToolExecutionFailed",
						message: msg,
						recoverable: true,
					};
				}

				// Stuck detection / Repetitive tool failure sentinel
				const isFailed = Boolean(
					toolResult &&
						typeof toolResult === "object" &&
						(("success" in toolResult &&
							(toolResult as { success?: boolean }).success === false) ||
							("error" in toolResult &&
								Boolean((toolResult as { error?: unknown }).error)) ||
							("status" in toolResult &&
								(toolResult as { status?: string }).status === "failed")),
				);

				if (isFailed) {
					consecutiveToolFailures++;
					lastFailedToolName = toolName;
					if (consecutiveToolFailures >= 2) {
						const warningMsg = `[STUCK_DETECTION] Повторный сбой инструмента '${toolName}' (${consecutiveToolFailures} раз подряд). Категорически запрещено повторять аналогичный вызов с теми же аргументами. Смените стратегию или обратитесь к врачу.`;
						if (typeof toolResult === "object" && toolResult !== null) {
							(toolResult as Record<string, unknown>).stuckDetectionWarning =
								warningMsg;
						}
					}
				} else {
					consecutiveToolFailures = 0;
					lastFailedToolName = "";
				}

				// Task plan synchronization: if manage_task_plan was called and updated a plan
				if (
					(toolName === "manage_task_plan" || toolName === "task_plan") &&
					toolResult &&
					typeof toolResult === "object" &&
					"plan" in toolResult &&
					(toolResult as { plan?: TaskPlan }).plan
				) {
					activePlan = (toolResult as { plan: TaskPlan }).plan;
					onEvent?.({
						type: "plan_updated",
						plan: activePlan,
					});
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

				if (signal?.aborted) {
					onEvent?.({
						type: "error",
						error: "Запрос был прерван клиентом (Connection aborted)",
						code: "ABORTED",
					});
					return {
						text: finalResponseText,
						toolCalls: recordedToolCalls,
						iterations: iteration,
						aborted: true,
						compacted: hasCompacted,
						summary: currentSummary || undefined,
						tokenUsage: lastRecordedUsage,
						plan: activePlan,
					};
				}
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
					tokenUsage: lastRecordedUsage,
					compacted: hasCompacted,
					plan: activePlan,
				});
				return {
					text: finalResponseText,
					toolCalls: recordedToolCalls,
					iterations: iteration,
					compacted: hasCompacted,
					summary: currentSummary || undefined,
					tokenUsage: lastRecordedUsage,
					plan: activePlan,
				};
			}
		} catch (turnErr: unknown) {
			if (signal?.aborted) {
				onEvent?.({
					type: "error",
					error: "Запрос был прерван клиентом (Connection aborted)",
					code: "ABORTED",
				});
				return {
					text: finalResponseText,
					toolCalls: recordedToolCalls,
					iterations: iteration,
					aborted: true,
					compacted: hasCompacted,
					summary: currentSummary || undefined,
					tokenUsage: lastRecordedUsage,
					plan: activePlan,
				};
			}

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
		tokenUsage: lastRecordedUsage,
		compacted: hasCompacted,
		plan: activePlan,
	});

	return {
		text: finalResponseText,
		toolCalls: recordedToolCalls,
		iterations: iteration,
		compacted: hasCompacted,
		summary: currentSummary || undefined,
		tokenUsage: lastRecordedUsage,
		plan: activePlan,
	};
}
