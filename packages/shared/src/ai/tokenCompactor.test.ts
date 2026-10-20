/**
 * @file packages/shared/src/ai/tokenCompactor.test.ts
 * @description Red Team Test Suite for Industrial Token Compactor & Context Invariants.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	estimateStringTokens,
	estimateMessageTokens,
	estimateConversationTokens,
	validateToolCallIntegrity,
	partitionConversationAtomically,
	compactConversation,
	compactConversationAsync,
	generateHeuristicSummary,
	type AgentRouterChatMessage,
} from "./tokenCompactor.js";

describe("tokenCompactor — Industrial Token Counter & Adaptive Context Compaction", () => {
	// =========================================================================
	// 1. HONEST TOKEN ESTIMATION (CYRILLIC, LATIN, JSON & CHATML OVERHEAD)
	// =========================================================================
	describe("1. Token Estimation Accuracy", () => {
		it("estimates empty or null strings as 0 tokens", () => {
			assert.equal(estimateStringTokens(""), 0);
			assert.equal(estimateStringTokens(null), 0);
			assert.equal(estimateStringTokens(undefined), 0);
		});

		it("estimates Latin English text correctly (~4 chars per token)", () => {
			const text = "Hello world, this is a clean agentic test in English.";
			const tokens = estimateStringTokens(text);
			assert.ok(tokens >= 10 && tokens <= 18, `Expected 10-18 tokens, got ${tokens}`);
		});

		it("estimates Cyrillic Russian text with higher token weight (~1.5 tokens/word)", () => {
			const text = "Здравствуйте, доктор! Беспокоит зуб сорок шесть, острая боль при накусывании.";
			// 9 Russian words: expect ~14-25 tokens
			const tokens = estimateStringTokens(text);
			assert.ok(tokens >= 15 && tokens <= 30, `Expected 15-30 tokens for Russian clinical sentence, got ${tokens}`);
		});

		it("estimates JSON and code syntax with appropriate token weight", () => {
			const json = JSON.stringify({
				action: "update_tooth_status",
				tooth: 46,
				diagnosis: "K02.1",
				notes: "Кариес дентина окклюзионной поверхности",
			});
			const tokens = estimateStringTokens(json);
			assert.ok(tokens >= 25 && tokens <= 60, `Expected 25-60 tokens for JSON payload, got ${tokens}`);
		});

		it("estimates individual message tokens with ChatML framing overhead", () => {
			const simpleMsg: AgentRouterChatMessage = {
				role: "user",
				content: "Привет",
			};
			// ChatML overhead: 4 tokens + "Привет" (~2 tokens) = ~6 tokens
			const tokens = estimateMessageTokens(simpleMsg);
			assert.ok(tokens >= 5 && tokens <= 8, `Expected 5-8 tokens, got ${tokens}`);
		});

		it("accurately estimates tool_calls overhead and JSON argument payloads", () => {
			const toolCallMsg: AgentRouterChatMessage = {
				role: "assistant",
				content: null,
				tool_calls: [
					{
						id: "call_abc123",
						type: "function",
						function: {
							name: "update_tooth_status",
							arguments: JSON.stringify({ toothNumber: 46, status: "caries" }),
						},
					},
				],
			};
			const tokens = estimateMessageTokens(toolCallMsg);
			// 4 framing + 8 tool framing + id tokens + name tokens + arguments tokens
			assert.ok(tokens >= 20, `Expected at least 20 tokens for tool_calls message, got ${tokens}`);
		});

		it("accounts for reasoning_content (DeepSeek-R1 CoT) in token calculation", () => {
			const reasoningMsg: AgentRouterChatMessage = {
				role: "assistant",
				reasoning_content: "Анализируем соматический статус пациента: аллергия на пенициллины, масса 70 кг.",
				content: "Назначаем альтернативный препарат.",
			};
			const tokens = estimateMessageTokens(reasoningMsg);
			assert.ok(tokens >= 30, `Expected >=30 tokens with reasoning_content, got ${tokens}`);
		});

		it("estimates total conversation tokens with assistant priming (+3 tokens)", () => {
			const conversation: AgentRouterChatMessage[] = [
				{ role: "system", content: "You are clinical assistant" },
				{ role: "user", content: "Check tooth 36" },
			];
			const total = estimateConversationTokens(conversation);
			const sum = estimateMessageTokens(conversation[0]) + estimateMessageTokens(conversation[1]) + 3;
			assert.equal(total, sum);
		});
	});

	// =========================================================================
	// 2. RED TEAM AUDIT: TOOL-CALL PAIR ATOMICITY VALIDATOR
	// =========================================================================
	describe("2. Tool-Call Pair Atomicity Validator", () => {
		it("passes on valid conversation without tool calls", () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "system", content: "System" },
				{ role: "user", content: "User prompt" },
				{ role: "assistant", content: "Assistant reply" },
			];
			const check = validateToolCallIntegrity(messages);
			assert.equal(check.valid, true);
		});

		it("passes on properly matched single tool call and response", () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "user", content: "Check price" },
				{
					role: "assistant",
					content: null,
					tool_calls: [
						{
							id: "call_1",
							type: "function",
							function: { name: "search_services", arguments: "{}" },
						},
					],
				},
				{ role: "tool", tool_call_id: "call_1", content: '{"found": 1}' },
				{ role: "assistant", content: "Услуга найдена в прайсе." },
			];
			const check = validateToolCallIntegrity(messages);
			assert.equal(check.valid, true);
		});

		it("passes on multiple parallel tool calls matched by corresponding tool responses", () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "user", content: "Check anesthesia and tooth 46" },
				{
					role: "assistant",
					content: null,
					tool_calls: [
						{
							id: "call_tooth",
							type: "function",
							function: { name: "update_tooth_status", arguments: "{}" },
						},
						{
							id: "call_anes",
							type: "function",
							function: { name: "calculate_anesthesia", arguments: "{}" },
						},
					],
				},
				{ role: "tool", tool_call_id: "call_tooth", content: '{"ok": true}' },
				{ role: "tool", tool_call_id: "call_anes", content: '{"maxDoseMl": 7.0}' },
				{ role: "assistant", content: "Одонтограмма обновлена, доза анестезии проверена." },
			];
			const check = validateToolCallIntegrity(messages);
			assert.equal(check.valid, true);
		});

		it("fails when role: 'tool' appears without preceding assistant tool_calls (orphaned response)", () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "user", content: "Hello" },
				{ role: "tool", tool_call_id: "call_ghost", content: "Ghost response" },
			];
			const check = validateToolCallIntegrity(messages);
			assert.equal(check.valid, false);
			assert.ok(check.error?.includes("without matching preceding assistant.tool_calls"));
		});

		it("fails when assistant tool_calls are left unanswered before user turn", () => {
			const messages: AgentRouterChatMessage[] = [
				{
					role: "assistant",
					content: null,
					tool_calls: [
						{
							id: "call_pending",
							type: "function",
							function: { name: "read_file", arguments: "{}" },
						},
					],
				},
				{ role: "user", content: "Why didn't you answer?" },
			];
			const check = validateToolCallIntegrity(messages);
			assert.equal(check.valid, false);
			assert.ok(check.error?.includes("awaiting responses"));
		});
	});

	// =========================================================================
	// 3. ATOMIC PARTITIONING (HEAD / MIDDLE / TAIL)
	// =========================================================================
	describe("3. Atomic Partitioning with Tool-Call Shift", () => {
		it("preserves system prompt and initial user turn in Head", () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "system", content: "System Prompt 15 Laws" },
				{ role: "user", content: "Root goal: Настроить клинику и проверить одонтограмму" },
				{ role: "assistant", content: "Ход 1" },
				{ role: "user", content: "Ход 2" },
				{ role: "assistant", content: "Ход 3" },
				{ role: "user", content: "Ход 4" },
				{ role: "assistant", content: "Ход 5" },
			];

			const partition = partitionConversationAtomically(messages, 2);
			assert.equal(partition.canCompact, true);
			assert.equal(partition.head.length, 2);
			assert.equal(partition.head[0].role, "system");
			assert.equal(partition.head[1].role, "user");
			assert.ok(partition.head[1].content?.includes("Root goal"));
		});

		it("automatically shifts Tail boundary to include parent assistant when Tail starts on role: 'tool'", () => {
			// Message 3 is assistant with tool_call, Message 4 is tool response
			const messages: AgentRouterChatMessage[] = [
				{ role: "system", content: "System" },
				{ role: "user", content: "Root goal" },
				{ role: "assistant", content: "Middle turn" },
				{
					role: "assistant",
					tool_calls: [
						{
							id: "call_boundary",
							type: "function",
							function: { name: "run_command", arguments: "{}" },
						},
					],
				},
				{ role: "tool", tool_call_id: "call_boundary", content: "Exit Code 0" },
				{ role: "assistant", content: "Final answer in tail" },
			];

			// If preserveRecentTurns is 2, naive slice would take index 4 (tool) and index 5 (assistant)
			// leaving index 4 orphan! Our partitioner MUST shift left to include index 3 (assistant)!
			const partition = partitionConversationAtomically(messages, 2);
			assert.equal(partition.canCompact, true);

			// Check tail integrity: it must be completely self-contained!
			const tailCheck = validateToolCallIntegrity(partition.tail);
			assert.equal(tailCheck.valid, true, `Tail integrity failed: ${tailCheck.error}`);
			assert.equal(partition.tail[0].role, "assistant");
			assert.ok(partition.tail[0].tool_calls?.some((tc) => tc.id === "call_boundary"));
		});
	});

	// =========================================================================
	// 4. COMPACT CONVERSATION: THRESHOLD & SHORT CIRCUITING
	// =========================================================================
	describe("4. Compaction Threshold & Short Circuiting", () => {
		it("returns original array untouched when tokens are below threshold", () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "system", content: "System" },
				{ role: "user", content: "Short query" },
				{ role: "assistant", content: "Short answer" },
			];

			// maxContextTokens = 10000, ratio = 0.75 -> threshold = 7500 tokens
			const result = compactConversation({
				messages,
				maxContextTokens: 10000,
				compactThresholdRatio: 0.75,
			});

			assert.equal(result.compacted, false);
			assert.equal(result.messages, messages);
			assert.equal(result.compactedTurnsCount, 0);
			assert.equal(result.tokensBefore, result.tokensAfter);
		});

		it("returns original array when conversation is too short to compact (no middle turns)", () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "system", content: "System" },
				{ role: "user", content: "Goal" },
			];

			const result = compactConversation({
				messages,
				maxContextTokens: 10, // artificial small limit
				compactThresholdRatio: 0.5,
			});

			assert.equal(result.compacted, false);
			assert.equal(result.messages.length, 2);
		});
	});

	// =========================================================================
	// 5. COMPACT STRATEGY: SUMMARIZE OLDER
	// =========================================================================
	describe("5. Strategy 'summarize_older' (Structured Compaction)", () => {
		it("compresses intermediate conversation into structured human clinical summary", () => {
			const longHistory: AgentRouterChatMessage[] = [
				{ role: "system", content: "System Constitutional Prompt (T.A.R.S. 100% honesty)" },
				{ role: "user", content: "Первичный приём: пациент с острой болью в области зуба 46." },
				// Intermediate turns to be compacted
				{ role: "assistant", content: "Проводим осмотр зуба 46: глубокая кариозная полость." },
				{
					role: "assistant",
					tool_calls: [
						{
							id: "call_anesthesia",
							type: "function",
							function: {
								name: "calculate_anesthesia",
								arguments: JSON.stringify({ patientWeightKg: 75, drug: "articaine_4" }),
							},
						},
					],
				},
				{
					role: "tool",
					tool_call_id: "call_anesthesia",
					content: JSON.stringify({
						maxSafeDoseMl: 7.0,
						safeToProceed: true,
						drugName: "Артикаин 4% с эпинефрином 1:200000",
						maxDoseMg: 500,
						patientWeightKg: 75,
						maxCarpulesByAnesthetic: 7,
						clinicalProtocolSummary: "Предельная доза артикаина 500 мг (7 карпул). Кардиорисков нет. Запланированная доза безопасна к введению.",
					}),
				},
				{
					role: "assistant",
					tool_calls: [
						{
							id: "call_tooth_update",
							type: "function",
							function: {
								name: "update_tooth_status",
								arguments: JSON.stringify({ toothNumber: 46, status: "pulpitis" }),
							},
						},
					],
				},
				{
					role: "tool",
					tool_call_id: "call_tooth_update",
					content: JSON.stringify({
						success: true,
						updated: 46,
						previousStatus: "caries",
						newStatus: "pulpitis",
						icd10: "K04.0",
						treatmentPlanRecommended: ["Эндодонтическое лечение", "Механическая обработка 3 каналов", "Пломбирование гуттаперчей"],
					}),
				},
				{ role: "assistant", content: "Диагноз: К04.0 Острый очаговый пульпит зуба 46. Проведена мандибулярная анестезия препаратом артикаин 4% 1.7 мл. Рабочее поле изолировано коффердамом." },
				{ role: "user", content: "Что делать с корневыми каналами и каков протокол их антисептической обработки?" },
				{ role: "assistant", content: "Необходима механическая обработка никель-титановыми инструментами до размера 25/06 и медикаментозная обработка 3% гипохлоритом натрия с ультразвуковой активацией." },
				// Recent turns to preserve
				{ role: "user", content: "Какова предварительная стоимость лечения?" },
				{ role: "assistant", content: "Рассчитываем смету по прайс-листу процедур." },
			];

			const tokensBefore = estimateConversationTokens(longHistory);

			const result = compactConversation({
				messages: longHistory,
				maxContextTokens: 100, // force threshold breach
				compactThresholdRatio: 0.5,
				strategy: "summarize_older",
				preserveRecentTurns: 2,
			});

			assert.equal(result.compacted, true);
			assert.ok(result.tokensAfter < result.tokensBefore);
			assert.equal(result.strategyUsed, "summarize_older");
			assert.ok(result.compactedTurnsCount >= 5);

			// Check structure of compacted messages:
			// Head: system + first user
			assert.equal(result.messages[0].role, "system");
			assert.equal(result.messages[1].role, "user");
			assert.ok(result.messages[1].content?.includes("Первичный приём"));

			// Compacted summary turn
			const summaryMsg = result.messages[2];
			assert.equal(summaryMsg.role, "user");
			assert.ok(summaryMsg.content?.includes("[СЖАТЫЙ КОНТЕКСТ СЕССИИ / COMPACTED HISTORY SUMMARY]"));
			assert.ok(summaryMsg.content?.includes("Одонтограмма (статус зуба)"));
			assert.ok(summaryMsg.content?.includes("Расчет безопасной анестезии"));
			assert.ok(summaryMsg.content?.toLowerCase().includes("пульпит"));

			// Tail: preserved recent turns
			const lastMsg = result.messages[result.messages.length - 1];
			assert.equal(lastMsg.role, "assistant");
			assert.ok(lastMsg.content?.includes("Рассчитываем смету"));

			// Full Tool Call Integrity Check
			const integrity = validateToolCallIntegrity(result.messages);
			assert.equal(integrity.valid, true);
		});
	});

	// =========================================================================
	// 6. COMPACT STRATEGY: SLIDING WINDOW
	// =========================================================================
	describe("6. Strategy 'sliding_window' (Fast Truncation with Notice)", () => {
		it("drops intermediate turns while preserving Head and Tail with sliding notice", () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "system", content: "Constitutional System Prompt" },
				{ role: "user", content: "Initial User Task" },
				{ role: "assistant", content: "Intermediate step 1" },
				{ role: "user", content: "Intermediate step 2" },
				{ role: "assistant", content: "Intermediate step 3" },
				{ role: "user", content: "Intermediate step 4" },
				{ role: "user", content: "Recent question" },
				{ role: "assistant", content: "Recent answer" },
			];

			const result = compactConversation({
				messages,
				maxContextTokens: 50,
				compactThresholdRatio: 0.5,
				strategy: "sliding_window",
				preserveRecentTurns: 2,
				insertSlidingWindowNotice: true,
			});

			assert.equal(result.compacted, true);
			assert.equal(result.strategyUsed, "sliding_window");

			// Head preserved
			assert.equal(result.messages[0].role, "system");
			assert.equal(result.messages[1].content, "Initial User Task");

			// Notice inserted
			assert.ok(result.messages[2].content?.includes("[СКОЛЬЗЯЩЕЕ ОКНО: пропущено 4 промежуточных сообщений"));

			// Tail preserved
			assert.equal(result.messages[3].content, "Recent question");
			assert.equal(result.messages[4].content, "Recent answer");
		});

		it("sliding_window without notice produces clean head + tail", () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "system", content: "System" },
				{ role: "user", content: "Goal" },
				{ role: "assistant", content: "Step 1" },
				{ role: "user", content: "Step 2" },
				{ role: "user", content: "Tail question" },
				{ role: "assistant", content: "Tail answer" },
			];

			const result = compactConversation({
				messages,
				maxContextTokens: 20,
				compactThresholdRatio: 0.5,
				strategy: "sliding_window",
				preserveRecentTurns: 2,
				insertSlidingWindowNotice: false,
			});

			assert.equal(result.compacted, true);
			assert.equal(result.messages.length, 4); // Head(2) + Tail(2)
			assert.equal(result.messages[2].content, "Tail question");
			assert.equal(result.messages[3].content, "Tail answer");
		});
	});

	// =========================================================================
	// 7. CUSTOM SUMMARIZER SUPPORT & ASYNC OPERATION
	// =========================================================================
	describe("7. Custom Summarizer & Async Execution", () => {
		it("uses synchronous customSummarizer if provided", () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "system", content: "Sys" },
				{ role: "user", content: "Goal" },
				{ role: "assistant", content: "Middle 1" },
				{ role: "assistant", content: "Middle 2" },
				{ role: "user", content: "Tail" },
			];

			const result = compactConversation({
				messages,
				maxContextTokens: 20,
				compactThresholdRatio: 0.5,
				preserveRecentTurns: 1,
				customSummarizer: (msgs) => `CUSTOM SUMMARY OF ${msgs.length} MESSAGES`,
			});

			assert.equal(result.compacted, true);
			assert.equal(result.summaryText, "CUSTOM SUMMARY OF 2 MESSAGES");
			assert.equal(result.messages[2].content, "CUSTOM SUMMARY OF 2 MESSAGES");
		});

		it("supports async compaction with compactConversationAsync", async () => {
			const messages: AgentRouterChatMessage[] = [
				{ role: "system", content: "Sys" },
				{ role: "user", content: "Goal" },
				{ role: "assistant", content: "Old work" },
				{ role: "user", content: "Tail" },
			];

			const result = await compactConversationAsync({
				messages,
				maxContextTokens: 10,
				compactThresholdRatio: 0.5,
				preserveRecentTurns: 1,
				customSummarizer: async (msgs) => {
					await new Promise((r) => setTimeout(r, 5));
					return `ASYNC LLM SUMMARY FOR ${msgs.length} TURNS`;
				},
			});

			assert.equal(result.compacted, true);
			assert.equal(result.summaryText, "ASYNC LLM SUMMARY FOR 1 TURNS");
		});
	});

	// =========================================================================
	// 8. RED TEAM INVARIANT: WORKSTATION TOOLS & NO BUREAUCRACY
	// =========================================================================
	describe("8. Workstation Tools & Clean Terminology Law", () => {
		it("generates summary with human workstation names (no raw code or jargon)", () => {
			const workstationMessages: AgentRouterChatMessage[] = [
				{
					role: "assistant",
					tool_calls: [
						{
							id: "call_read",
							type: "function",
							function: {
								name: "read_clinical_file",
								arguments: JSON.stringify({ path: "C:/DICOM/study_123.dcm" }),
							},
						},
						{
							id: "call_cmd",
							type: "function",
							function: {
								name: "run_workstation_command",
								arguments: JSON.stringify({ cmd: "ping 127.0.0.1" }),
							},
						},
					],
				},
				{ role: "tool", tool_call_id: "call_read", content: "DICOM HEADER OK" },
				{ role: "tool", tool_call_id: "call_cmd", content: "TTL=128" },
				{ role: "assistant", content: "Файл КЛКТ прочитан, сеть рабочей станции проверена." },
			];

			const summary = generateHeuristicSummary(workstationMessages, "Проверить файлы и сеть");
			assert.ok(summary.includes("Чтение файлов рабочей станции"));
			assert.ok(summary.includes("Выполнение системных команд"));
			assert.ok(!summary.includes("043/у"), "Must not leak raw 043/u abbreviations");
			assert.ok(!summary.includes("804н"), "Must not leak raw 804n abbreviations");
		});
	});
});
