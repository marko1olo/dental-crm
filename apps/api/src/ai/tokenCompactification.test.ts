/**
 * @file apps/api/src/ai/tokenCompactification.test.ts
 * @description Red Team Test Suite for Token Counter, Sliding Window & Auto-Compaction Engine.
 *
 * Verifies:
 * 1. Token Estimation (BPE Cyrillic ~2.4 chars/token, Latin/code ~4 chars/token, tool envelopes).
 * 2. Model Specs & Compaction Threshold Decision (shouldCompactContext).
 * 3. Level 1: Tool Output Pruning (large older tool outputs pruned, hot context tool results kept intact).
 * 4. Level 2: Sliding Window & Executive Summarization (Pinned System Prompt, clean turn boundaries, clinical entities).
 * 5. Level 3: Persistent Memory Snapshot generation.
 * 6. End-to-end runAgentHarness ReAct execution with compact_triggered SSE event delivery.
 * 7. Human language compliance (zero raw bureaucratic codes: 043/у, 804н, ФФД 1.2).
 */

import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	buildTokenUsageReport,
	estimateConversationTokens,
	estimateMessageTokens,
	estimateTextTokens,
	estimateToolCallTokens,
	getModelContextSpec,
	MODEL_CONTEXT_REGISTRY,
} from "./tokenCounter.js";
import {
	buildExecutiveSummaryBlock,
	compactConversationHistory,
	createMemorySnapshot,
	extractEntitiesFromDialogue,
	findCleanTurnCutIndex,
	pruneOldToolOutputs,
	shouldCompactContext,
	type CompactedHistoryResult,
	type TokenCompactorOptions,
} from "./contextCompactor.js";
import {
	runAgentHarness,
	type AgentHarnessEvent,
	type AgentHarnessEventCompactTriggered,
} from "./agentHarness.js";
import type {
	AgentRouterChatMessage,
	AgentRouterChatParams,
	AgentRouterChatResponse,
	AgentRouterClient,
} from "./agentRouterClient.js";
import type { DentalToolContext } from "./dentalTools/types.js";

const MOCK_TOOL_CONTEXT: DentalToolContext = {
	organizationId: "org-00000000-0000-7000-8000-000000000001",
	patientId: "pat-11111111-2222-3333-4444-555555555555",
	runtimeMode: "web_browser",
};

describe("1. Token Counter — BPE Эвристики и Учет Метаданных", () => {
	it("1.1 estimateTextTokens: оценивает русский текст с плотностью ~2.4 символа на токен", () => {
		const russianSentence = "Лечение глубокого кариеса зуба 16 светоотверждаемым композитом";
		const tokens = estimateTextTokens(russianSentence);

		// Длина строки ~62 символа. При ~2.4 симв/токен ожидается около 24-28 токенов
		assert.ok(tokens >= 20 && tokens <= 35, `Ожидалось 20-35 токенов, получено ${tokens}`);
	});

	it("1.2 estimateTextTokens: оценивает английский текст и код с плотностью ~4 символа на токен", () => {
		const englishCode = "function calculateAnesthesia(patientWeightKg: number): number { return weight * 7; }";
		const tokens = estimateTextTokens(englishCode);

		// Длина ~85 символов. При ~4 симв/токен ожидается около 20-25 токенов
		assert.ok(tokens >= 18 && tokens <= 30, `Ожидалось 18-30 токенов, получено ${tokens}`);
	});

	it("1.3 estimateToolCallTokens: учитывает оверхед конверта OpenAI (~12 токенов) и аргументы", () => {
		const toolCall = {
			id: "call_abc123",
			type: "function",
			function: {
				name: "calculate_anesthesia",
				arguments: JSON.stringify({ patientWeightKg: 70, hasCardioRisk: false }),
			},
		};

		const tokens = estimateToolCallTokens(toolCall);
		// Оверхед 12 + имя функции ~5 + json аргументов ~14 = ~31 токен
		assert.ok(tokens >= 25 && tokens <= 40, `Ожидалось 25-40 токенов, получено ${tokens}`);
	});

	it("1.4 estimateMessageTokens: рассчитывает токены роли, контента и вложенных вызовов", () => {
		const assistantMsg: AgentRouterChatMessage = {
			role: "assistant",
			content: "Проверяем противопоказания пациента...",
			tool_calls: [
				{
					id: "call_1",
					type: "function",
					function: {
						name: "check_somatic_risks",
						arguments: JSON.stringify({ patientId: "pat-123" }),
					},
				},
			],
		};

		const tokens = estimateMessageTokens(assistantMsg);
		assert.ok(tokens >= 40, `Ожидалось >= 40 токенов для вызова с инструментами, получено ${tokens}`);
	});

	it("1.5 getModelContextSpec: возвращает корректные лимиты и пороги (75%) для моделей", () => {
		const deepseek = getModelContextSpec("deepseek-v4-flash");
		assert.strictEqual(deepseek.contextLimit, 64_000);
		assert.strictEqual(deepseek.defaultCompactThreshold, 48_000);

		const gpt4o = getModelContextSpec("gpt-4o");
		assert.strictEqual(gpt4o.contextLimit, 128_000);
		assert.strictEqual(gpt4o.defaultCompactThreshold, 96_000);

		const fallback = getModelContextSpec("unknown-model");
		assert.strictEqual(fallback.contextLimit, 64_000);
	});

	it("1.6 buildTokenUsageReport: объединяет эвристику с метаданными usage от провайдера", () => {
		const messages: AgentRouterChatMessage[] = [
			{ role: "user", content: "Привет, составь план лечения кариеса зуба 26" },
			{ role: "assistant", content: "План лечения зуба 26 сформирован." },
		];

		const providerUsage = {
			prompt_tokens: 38,
			completion_tokens: 15,
			total_tokens: 53,
		};

		const report = buildTokenUsageReport(messages, providerUsage);
		assert.strictEqual(report.actualPromptTokens, 38);
		assert.strictEqual(report.completionTokens, 15);
		assert.strictEqual(report.totalTokens, 53);
		assert.ok(report.estimatedPromptTokens > 0);
		assert.ok(typeof report.calibrationRatio === "number");
	});
});

describe("2. Trigger & Entity Extraction — Порог и Клинические Сущности", () => {
	it("2.1 shouldCompactContext: возвращает false при малом количестве токенов", () => {
		const shortMessages: AgentRouterChatMessage[] = [
			{ role: "system", content: "Ты — ассистент врача" },
			{ role: "user", content: "Добрый день" },
		];

		const should = shouldCompactContext(shortMessages, { thresholdTokens: 5000 });
		assert.strictEqual(should, false);
	});

	it("2.2 shouldCompactContext: возвращает true при превышении настроенного порога", () => {
		const bulkyMessage = "Медицинская карта приёма и анамнез пациента. ".repeat(200);
		const messages: AgentRouterChatMessage[] = [
			{ role: "system", content: "Базовый системный промпт" },
			{ role: "user", content: bulkyMessage },
			{ role: "assistant", content: "Ответ врача принят" },
		];

		const should = shouldCompactContext(messages, { thresholdTokens: 300 });
		assert.strictEqual(should, true);
	});

	it("2.3 extractEntitiesFromDialogue: извлекает зубы FDI, МКБ-10, жалобы и финансы на чистом русском", () => {
		const sampleDialogue = `
			Пациент жалуется на острую ноющую боль в области зуба 16 и зуба 46.
			Диагноз: глубокий кариес дентина K02.1 и пульпит K04.0.
			Назначена инфильтрационная анестезия артикаином и фотополимерная пломба.
			Предварительный счет по прейскуранту: 6 500 руб.
			Проверен файл C:\\dental\\studies\\16_rvg.png в программе Romexis.
		`;

		const entities = extractEntitiesFromDialogue(sampleDialogue);
		assert.deepStrictEqual(entities.teeth, [16, 46]);
		assert.ok(entities.icdCodes.includes("K02.1"));
		assert.ok(entities.icdCodes.includes("K04.0"));
		assert.ok(entities.complaints.length > 0);
		assert.ok(entities.financials.some((f) => f.includes("6 500")));
		assert.ok(entities.workstationApps.includes("Romexis"));
	});
});

describe("3. Level 1: Tool Output Pruning — Обрезка Старых Результатов Инструментов", () => {
	it("3.1 pruneOldToolOutputs: сжимает объемные результаты инструментов старых витков (> 400 симв.)", () => {
		const hugeFileDump = JSON.stringify({
			filePath: "C:\\Clinic\\records\\long_report.txt",
			lines: 600,
			data: "Анамнез жизни, соматический статус, осмотр слизистой, термометрия... ".repeat(50),
			status: "success",
		});

		const messages: AgentRouterChatMessage[] = [
			{ role: "system", content: "Системный промпт" },
			{ role: "user", content: "Прочитай протокол исследования" },
			{
				role: "assistant",
				content: null,
				tool_calls: [{ id: "call_file_1", type: "function", function: { name: "read_clinical_file", arguments: "{}" } }],
			},
			{ role: "tool", tool_call_id: "call_file_1", content: hugeFileDump },
			// Recent hot context turns:
			{ role: "user", content: "Что в итоге по зубу 36?" },
			{ role: "assistant", content: "По зубу 36 выявлен кариес эмали." },
		];

		const { prunedMessages, prunedCount, bytesSaved } = pruneOldToolOutputs(messages, 2, 300);

		assert.strictEqual(prunedCount, 1);
		assert.ok(bytesSaved > 1000);

		const prunedToolMsg = prunedMessages[3]!;
		assert.strictEqual(prunedToolMsg.role, "tool");
		assert.strictEqual(prunedToolMsg.tool_call_id, "call_file_1");
		assert.ok(prunedToolMsg.content?.includes("[Результат инструмента сокращен:"));
		assert.ok(prunedToolMsg.content?.includes("Статус:"));

		// Hot context messages remain 100% untouched
		assert.strictEqual(prunedMessages[4]!.content, "Что в итоге по зубу 36?");
		assert.strictEqual(prunedMessages[5]!.content, "По зубу 36 выявлен кариес эмали.");
	});

	it("3.2 pruneOldToolOutputs: не трогает компактные результаты инструментов (< 300 симв.)", () => {
		const shortToolMsg: AgentRouterChatMessage = {
			role: "tool",
			tool_call_id: "call_calc_1",
			content: JSON.stringify({ safeDoseMg: 350, carpules: 4 }),
		};

		const messages: AgentRouterChatMessage[] = [
			{ role: "system", content: "Системный промпт" },
			shortToolMsg,
			{ role: "user", content: "Спасибо" },
		];

		const { prunedCount } = pruneOldToolOutputs(messages, 1, 300);
		assert.strictEqual(prunedCount, 0);
	});
});

describe("4. Level 2: Sliding Window & Executive Summarization — Скользящее Окно", () => {
	it("4.1 Invariant: Системный промпт ВСЕГДА закреплен на нулевой позиции (Pinned Anchor)", () => {
		const systemPromptText = "Ты — клинический эксперт DENTE. Правило: 15 когнитивных законов.";
		const messages: AgentRouterChatMessage[] = [
			{ role: "system", content: systemPromptText },
			...Array.from({ length: 15 }, (_, i) => ({
				role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
				content: `Реплика диалога номер ${i + 1} о лечении кариеса зуба 16 и расчете анестезии.`,
			})),
		];

		const result = compactConversationHistory(messages, {
			thresholdTokens: 200,
			retainedRecentTurns: 4,
		});

		assert.strictEqual(result.compacted, true);
		assert.strictEqual(result.compactedMessages[0]!.role, "system");
		assert.strictEqual(result.compactedMessages[0]!.content, systemPromptText);
	});

	it("4.2 Invariant: Не разрывает пару assistant(tool_calls) и tool(tool_call_id)", () => {
		const messages: AgentRouterChatMessage[] = [
			{ role: "system", content: "Системный промпт" },
			{ role: "user", content: "Шаг 1: проверь соматику" },
			{
				role: "assistant",
				content: null,
				tool_calls: [{ id: "call_som_1", type: "function", function: { name: "check_somatic_risks", arguments: "{}" } }],
			},
			{ role: "tool", tool_call_id: "call_som_1", content: JSON.stringify({ safe: true }) },
			{ role: "assistant", content: "Противопоказаний нет." },
			{ role: "user", content: "Шаг 2: назови цену" },
			{ role: "assistant", content: "Стоимость 4 500 руб." },
		];

		const cutIndex = findCleanTurnCutIndex(messages, 3);
		// Разрез не должен встать на индекс 3 (tool сообщение)
		assert.notStrictEqual(messages[cutIndex]?.role, "tool");
	});

	it("4.3 Инкапсулирует резюме в тег <conversation_summary> и сохраняет сущности", () => {
		const messages: AgentRouterChatMessage[] = [
			{ role: "system", content: "Главный промпт" },
			{ role: "user", content: "Пациент жалуется на ноющие боли в зубе 47. По МКБ ставим K04.0 пульпит." },
			{ role: "assistant", content: "Согласован план лечения: депульпирование зуба 47, сумма 7 200 руб." },
			{ role: "user", content: "Следующий вопрос: анестезия артикаином подходит?" },
			{ role: "assistant", content: "Да, артикаин 4% безопасен в дозировке 3.4 мл." },
		];

		const result = compactConversationHistory(messages, {
			thresholdTokens: 50,
			retainedRecentTurns: 2,
		});

		assert.strictEqual(result.compacted, true);
		assert.ok(result.summary.length > 0);
		assert.ok(result.summary.includes("47"));
		assert.ok(result.summary.includes("K04.0"));

		// Второе сообщение содержит блок резюме
		const summaryMsg = result.compactedMessages[1]!;
		assert.strictEqual(summaryMsg.role, "system");
		assert.ok(summaryMsg.content?.includes("<conversation_summary>"));
		assert.ok(summaryMsg.content?.includes("</conversation_summary>"));

		// Последние сообщения сохранены без сжатия
		const lastMsg = result.compactedMessages[result.compactedMessages.length - 1]!;
		assert.strictEqual(lastMsg.content, "Да, артикаин 4% безопасен в дозировке 3.4 мл.");
	});

	it("4.4 Запрет канцелярита: резюме не содержит советских бюрократических шифров", () => {
		const olderTurn: AgentRouterChatMessage[] = [
			{ role: "user", content: "Заполни медицинскую карту приёма по зубу 11 по прейскуранту услуг" },
			{ role: "assistant", content: "Запись приёма сохранена, кассовый чек сформирован" },
		];

		const summary = buildExecutiveSummaryBlock(olderTurn);
		assert.strictEqual(summary.includes("043/у"), false, "Резюме не должно содержать '043/у'");
		assert.strictEqual(summary.includes("804н"), false, "Резюме не должно содержать '804н'");
		assert.strictEqual(summary.includes("ФФД 1.2"), false, "Резюме не должно содержать 'ФФД 1.2'");
	});
});

describe("5. Level 3: Persistent Memory Snapshot — Снепшот Памяти Сессии", () => {
	it("5.1 createMemorySnapshot: формирует персистентный слепок клинического состояния и метрик", () => {
		const messages: AgentRouterChatMessage[] = [
			{ role: "user", content: "Жалобы на зуб 24 и 25, боль от сладкого. Предварительно кариес K02.1." },
			{ role: "assistant", content: "План лечения составлен на 9 000 руб." },
		];

		const compactResult: CompactedHistoryResult = {
			compacted: true,
			beforeTokens: 450,
			afterTokens: 120,
			tokensSaved: 330,
			prunedToolOutputsCount: 1,
			compressedMessagesCount: 2,
			summary: "Лечение кариеса зубов 24 и 25",
			compactedMessages: messages,
			hotMessages: messages,
		};

		const snapshot = createMemorySnapshot({
			sessionId: "sess_test_12345",
			organizationId: "org-1",
			patientId: "pat-1",
			messages,
			compactResult,
			compactionCount: 1,
		});

		assert.strictEqual(snapshot.sessionId, "sess_test_12345");
		assert.strictEqual(snapshot.tokenMetrics.tokensSaved, 330);
		assert.deepStrictEqual(snapshot.clinicalEntities.teeth, [24, 25]);
		assert.ok(snapshot.clinicalEntities.icdCodes.includes("K02.1"));
		assert.ok(snapshot.timestamp > 0);
	});
});

describe("6. runAgentHarness E2E — Интеграция Автокомпактификации и SSE Событий", () => {
	it("6.1 runAgentHarness: инициирует компактификацию при длинной истории и вещает compact_triggered", async () => {
		let compactEventEmitted: AgentHarnessEventCompactTriggered | null = null;
		const events: AgentHarnessEvent[] = [];

		// Синтезируем длинную историю диалога врача с ассистентом
		const dialogueHistory: AgentRouterChatMessage[] = [
			{ role: "user", content: "Осмотр зуба 16: кариес дентина K02.1. Боль при зондировании. ".repeat(15) },
			{ role: "assistant", content: "Рекомендуется изоляция коффердамом и постановка пломбы. ".repeat(15) },
			{ role: "user", content: "Проверь дозу анестетика для пациента весом 75 кг. ".repeat(15) },
			{ role: "assistant", content: "Безопасная доза артикаина: до 7 карпул. ".repeat(15) },
			{ role: "user", content: "Какова итоговая стоимость лечения по прейскуранту?" },
		];

		const mockClient = {
			async createChatCompletion(_params: AgentRouterChatParams): Promise<AgentRouterChatResponse> {
				return {
					id: "mock_resp_1",
					object: "chat.completion",
					created: Date.now(),
					model: "deepseek-v4-flash",
					choices: [
						{
							index: 0,
							message: {
								role: "assistant",
								content: "Итоговая стоимость лечения зуба 16 составляет 5 800 рублей.",
							},
							finish_reason: "stop",
						},
					],
					usage: {
						prompt_tokens: 180,
						completion_tokens: 25,
						total_tokens: 205,
					},
				};
			},
		} as unknown as AgentRouterClient;

		const result = await runAgentHarness({
			messages: dialogueHistory,
			context: MOCK_TOOL_CONTEXT,
			client: mockClient,
			compactThresholdTokens: 250, // Низкий порог для надежного триггера автокомпактификации
			slidingWindowRetainedTurns: 2,
			onEvent: (event) => {
				events.push(event);
				if (event.type === "compact_triggered") {
					compactEventEmitted = event;
				}
			},
		});

		assert.ok(compactEventEmitted !== null, "Событие 'compact_triggered' обязано быть отправлено в поток");
		assert.strictEqual((compactEventEmitted as any).type, "compact_triggered");
		assert.ok((compactEventEmitted as any).beforeTokens > (compactEventEmitted as any).afterTokens);
		assert.ok((compactEventEmitted as any).tokensSaved > 0);
		assert.ok((compactEventEmitted as any).summary.length > 0);

		// Результат харнесса содержит флаг компактификации и метрики токенов
		assert.strictEqual(result.compacted, true);
		assert.ok(result.tokenUsage !== undefined);
		assert.strictEqual(result.tokenUsage.promptTokens, 180);
		assert.strictEqual(result.tokenUsage.completionTokens, 25);
		assert.ok(result.text.includes("5 800 рублей"));
	});

	it("6.2 runAgentHarness: обрезка огромного tool output в цикле ReAct не сбивает финальный ответ", async () => {
		const hugeStudyDump = JSON.stringify({
			status: "success",
			studyId: "study_999",
			teeth: [16, 17],
			rawScanMatrix: "010101010101010101".repeat(200), // ~3600 символов
		});

		let toolExecuted = false;
		const events: AgentHarnessEvent[] = [];

		const mockClient = {
			async createChatCompletion(params: AgentRouterChatParams): Promise<AgentRouterChatResponse> {
				// Если инструмент еще не вызывался — модель инициирует tool_call
				if (!toolExecuted) {
					return {
						id: "mock_resp_tool",
						object: "chat.completion",
						created: Date.now(),
						model: "deepseek-v4-flash",
						choices: [
							{
								index: 0,
								message: {
									role: "assistant",
									content: null,
									tool_calls: [
										{
											id: "call_card_1",
											type: "function",
											function: {
												name: "get_patient_card",
												arguments: JSON.stringify({ patientId: MOCK_TOOL_CONTEXT.patientId }),
											},
										},
									],
								},
								finish_reason: "tool_calls",
							},
						],
						usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
					};
				}

				// Второй виток: модель видит результат и выдает финальный клинический ответ
				return {
					id: "mock_resp_final",
					object: "chat.completion",
					created: Date.now(),
					model: "deepseek-v4-flash",
					choices: [
						{
							index: 0,
							message: {
								role: "assistant",
								content: "Электронная медицинская карта прочитана. Зуб 16 требует лечения кариеса.",
							},
							finish_reason: "stop",
						},
					],
					usage: { prompt_tokens: 120, completion_tokens: 20, total_tokens: 140 },
				};
			},
		};

		const result = await runAgentHarness({
			messages: [{ role: "user", content: "Покажи медицинскую карту пациента" }],
			context: MOCK_TOOL_CONTEXT,
			client: mockClient as unknown as AgentRouterClient,
			onEvent: (event) => {
				events.push(event);
				if (event.type === "tool_start") {
					toolExecuted = true;
				}
			},
		});

		assert.strictEqual(result.iterations, 2);
		assert.strictEqual(result.toolCalls.length, 1);
		assert.strictEqual(result.toolCalls[0]!.tool, "get_patient_card");
		assert.ok(result.text.includes("Зуб 16 требует лечения кариеса"));
	});
});
