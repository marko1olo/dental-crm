/**
 * @file packages/shared/src/tests/contextCompactor.test.ts
 * @description Red Team Test Suite for Context Compactor, Sliding Window & Token Counter Engine.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildExecutiveSummaryBlock,
	compactConversationHistory,
	createMemorySnapshot,
	extractEntitiesFromDialogue,
	findCleanTurnCutIndex,
	pruneOldToolOutputs,
	shouldCompactContext,
	type ChatMessageLike,
	type CompactedHistoryResult,
} from "../ai/contextCompactor.js";
import {
	buildTokenUsageReport,
	estimateConversationTokens,
	estimateMessageTokens,
	estimateTextTokens,
	estimateToolCallTokens,
	getModelContextSpec,
} from "../ai/tokenCounter.js";

describe("contextCompactor — Token Counter & Context Compaction Suite", () => {
	// =========================================================================
	// 1. TOKEN ESTIMATION (CYRILLIC, LATIN, TOOL OVERHEADS)
	// =========================================================================
	describe("1. Token Counter & Model Context Specs", () => {
		it("estimates empty or null strings as 0 tokens", () => {
			assert.equal(estimateTextTokens(""), 0);
			assert.equal(estimateTextTokens(null), 0);
			assert.equal(estimateTextTokens(undefined), 0);
		});

		it("estimates Latin text correctly (~4 chars per token)", () => {
			const text = "Hello world, this is a clean agentic test in English.";
			const tokens = estimateTextTokens(text);
			assert.ok(tokens >= 10 && tokens <= 18, `Expected 10-18 tokens, got ${tokens}`);
		});

		it("estimates Cyrillic text with appropriate token weight (~2.4 chars per token)", () => {
			const text = "Лечение глубокого кариеса зуба 16 светоотверждаемым композитом";
			const tokens = estimateTextTokens(text);
			assert.ok(tokens >= 20 && tokens <= 35, `Expected 20-35 tokens, got ${tokens}`);
		});

		it("estimates tool call overhead with envelope framing and arguments", () => {
			const toolCall = {
				id: "call_tooth_16",
				type: "function" as const,
				function: {
					name: "update_tooth_status",
					arguments: JSON.stringify({ toothNumber: 16, status: "caries", diagnosis: "K02.1" }),
				},
			};
			const tokens = estimateToolCallTokens(toolCall);
			assert.ok(tokens >= 20, `Expected >=20 tokens for tool_calls message, got ${tokens}`);
		});

		it("estimates message tokens including role framing and content", () => {
			const msg: ChatMessageLike = {
				role: "user",
				content: "Проверить одонтограмму пациента",
			};
			const tokens = estimateMessageTokens(msg);
			assert.ok(tokens >= 10 && tokens <= 25, `Expected 10-25 tokens, got ${tokens}`);
		});

		it("getModelContextSpec returns default specs and compact thresholds (75%)", () => {
			const defaultSpec = getModelContextSpec();
			assert.ok(defaultSpec.contextLimit >= 64000);
			assert.equal(defaultSpec.defaultCompactThreshold, Math.floor(defaultSpec.contextLimit * 0.75));
		});

		it("buildTokenUsageReport calculates honest metrics from provider usage metadata", () => {
			const messages: ChatMessageLike[] = [
				{ role: "system", content: "You are clinical copilot" },
				{ role: "user", content: "Лечение кариеса 36" },
			];
			const report = buildTokenUsageReport(messages, {
				prompt_tokens: 45,
				completion_tokens: 120,
				total_tokens: 165,
			});
			assert.equal(report.actualPromptTokens, 45);
			assert.equal(report.completionTokens, 120);
			assert.equal(report.totalTokens, 165);
			assert.ok(report.calibrationRatio !== undefined);
		});
	});

	// =========================================================================
	// 2. TRIGGER & CLINICAL ENTITY EXTRACTION
	// =========================================================================
	describe("2. Trigger Decision & Entity Extraction", () => {
		it("shouldCompactContext returns false when conversation is below threshold", () => {
			const messages: ChatMessageLike[] = [
				{ role: "system", content: "System anchor" },
				{ role: "user", content: "Короткий запрос" },
			];
			const needsCompaction = shouldCompactContext(messages, { thresholdTokens: 1000 });
			assert.equal(needsCompaction, false);
		});

		it("shouldCompactContext returns true when token count exceeds threshold", () => {
			const messages: ChatMessageLike[] = [
				{ role: "system", content: "System prompt" },
				{ role: "user", content: "Длинный клинический протокол повторного эндодонтического лечения зуба 46 ".repeat(40) },
				{ role: "assistant", content: "Принято в работу, проводим расчет дозировок" },
			];
			const needsCompaction = shouldCompactContext(messages, { thresholdTokens: 200 });
			assert.equal(needsCompaction, true);
		});

		it("extractEntitiesFromDialogue extracts FDI teeth, ICD-10, complaints, diagnoses, and allergies", () => {
			const text = `
Пациент жалуется на острую ноющую боль в области зуба 16 и зуба 26.
Установлен диагноз: K02.1 кариес дентина, также подозревается K04.0 пульпит зуба 36.
Выполнена инфильтрационная анестезия (артикаин 1:200 000). Стоимость лечения 8 500 руб.
Аллергический статус: аллергия на пенициллины.
Соматический анамнез: гипертония 2 стадии.
			`;
			const entities = extractEntitiesFromDialogue(text);

			assert.ok(entities.teeth.includes(16), "Expected tooth 16");
			assert.ok(entities.teeth.includes(26), "Expected tooth 26");
			assert.ok(entities.teeth.includes(36), "Expected tooth 36");
			assert.ok(entities.icdCodes.includes("K02.1"), "Expected ICD K02.1");
			assert.ok(entities.icdCodes.includes("K04.0"), "Expected ICD K04.0");
			assert.ok(entities.complaints.length > 0, "Expected complaints");
			assert.ok(entities.diagnoses.length > 0, "Expected diagnoses");
			assert.ok(entities.procedures.length > 0, "Expected procedures");
			assert.ok(entities.financials.length > 0, "Expected financials");
			assert.ok(entities.allergies && entities.allergies.length > 0, "Expected allergies");
			assert.ok(entities.somaticRisks && entities.somaticRisks.length > 0, "Expected somatic risks");
		});
	});

	// =========================================================================
	// 3. LEVEL 1: TOOL OUTPUT PRUNING
	// =========================================================================
	describe("3. Level 1: Tool Output Pruning", () => {
		it("prunes bulky tool outputs older than retainedRecentTurns", () => {
			const hugePayload = JSON.stringify({
				success: true,
				status: "COMPLETED",
				data: "X".repeat(1500),
				patientId: "pat-12345",
			});

			const messages: ChatMessageLike[] = [
				{ role: "system", content: "System anchor" },
				{ role: "user", content: "Turn 1" },
				{ role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "test", arguments: "{}" } }] },
				{ role: "tool", tool_call_id: "c1", content: hugePayload },
				{ role: "assistant", content: "Turn 1 done" },
				{ role: "user", content: "Recent hot turn" },
				{ role: "assistant", content: "Recent reply" },
			];

			const { prunedMessages, prunedCount, bytesSaved } = pruneOldToolOutputs(messages, 2, 400);

			assert.equal(prunedCount, 1);
			assert.ok(bytesSaved > 1000);
			assert.equal(prunedMessages[3].role, "tool");
			assert.ok(prunedMessages[3].content?.includes("Результат инструмента сокращен"));
			assert.equal(prunedMessages[3].tool_call_id, "c1", "tool_call_id must be preserved");
		});

		it("leaves compact tool outputs intact", () => {
			const compactPayload = JSON.stringify({ success: true, count: 5 });
			const messages: ChatMessageLike[] = [
				{ role: "system", content: "System anchor" },
				{ role: "user", content: "Turn 1" },
				{ role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "test", arguments: "{}" } }] },
				{ role: "tool", tool_call_id: "c1", content: compactPayload },
				{ role: "assistant", content: "Done" },
			];

			const { prunedCount } = pruneOldToolOutputs(messages, 1, 400);
			assert.equal(prunedCount, 0);
		});
	});

	// =========================================================================
	// 4. LEVEL 2: SLIDING WINDOW & EXECUTIVE SUMMARIZATION
	// =========================================================================
	describe("4. Level 2: Sliding Window & Executive Summarization", () => {
		it("findCleanTurnCutIndex never splits an assistant tool_calls from its tool response", () => {
			const messages: ChatMessageLike[] = [
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
			assert.notEqual(messages[cutIndex]?.role, "tool", "Cut index must never land on a tool response");
		});

		it("compactConversationHistory pins system prompt at index 0 and creates conversation_summary", () => {
			const systemPromptText = "Ты — клинический эксперт DENTE. Правило: 15 когнитивных законов.";
			const messages: ChatMessageLike[] = [
				{ role: "system", content: systemPromptText },
				...Array.from({ length: 15 }, (_, i) => ({
					role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
					content: `Реплика диалога номер ${i + 1} о лечении кариеса зуба 16 и расчете анестезии. Пациент согласовал план.`,
				})),
			];

			const result: CompactedHistoryResult = compactConversationHistory(messages, {
				thresholdTokens: 200,
				targetTokens: 100,
				retainedRecentTurns: 4,
			});

			assert.equal(result.compacted, true);
			assert.equal(result.compactedMessages[0].role, "system");
			assert.equal(result.compactedMessages[0].content, systemPromptText);
			assert.ok(result.compactedMessages.length < messages.length);
			assert.ok(result.compactedMessages.some((m) => m.content?.includes("<conversation_summary>")));
		});

		it("buildExecutiveSummaryBlock generates clean markdown without bureaucratic slang", () => {
			const olderMessages: ChatMessageLike[] = [
				{ role: "user", content: "Зуб 16 кариес K02.1, сумма 5000 руб." },
			];
			const summary = buildExecutiveSummaryBlock(olderMessages, "Предыдущий дайджест");

			assert.ok(summary.includes("16"));
			assert.ok(!summary.includes("043/у"), "Zero 043/у bureaucratic slang");
			assert.ok(!summary.includes("804н"), "Zero 804н bureaucratic slang");
			assert.ok(!summary.includes("ФФД 1.2"), "Zero ФФД 1.2 slang in human summary");
		});
	});

	// =========================================================================
	// 5. LEVEL 3: PERSISTENT MEMORY SNAPSHOT
	// =========================================================================
	describe("5. Level 3: Persistent Memory Snapshot", () => {
		it("createMemorySnapshot produces structured exportable snapshot", () => {
			const messages: ChatMessageLike[] = [
				{ role: "system", content: "System" },
				{ role: "user", content: "Лечение пульпита зуба 36, аллергия на новокаин" },
				{ role: "assistant", content: "Анестетик выбора — артикаин без вазоконстриктора" },
			];

			const compactResult: CompactedHistoryResult = {
				compacted: true,
				beforeTokens: 250,
				afterTokens: 90,
				tokensSaved: 160,
				prunedToolOutputsCount: 0,
				compressedMessagesCount: 1,
				summary: "Сжатый дайджест",
				compactedMessages: messages,
				hotMessages: messages,
			};

			const snapshot = createMemorySnapshot({
				sessionId: "sess-abc-123",
				organizationId: "org-test-777",
				patientId: "pat-999",
				messages,
				compactResult,
				compactionCount: 1,
			});

			assert.equal(snapshot.sessionId, "sess-abc-123");
			assert.equal(snapshot.organizationId, "org-test-777");
			assert.equal(snapshot.patientId, "pat-999");
			assert.ok(snapshot.clinicalEntities.teeth.includes(36));
			assert.equal(snapshot.tokenMetrics.beforeTokens, 250);
			assert.equal(snapshot.tokenMetrics.afterTokens, 90);
			assert.equal(snapshot.tokenMetrics.tokensSaved, 160);
		});
	});
});
