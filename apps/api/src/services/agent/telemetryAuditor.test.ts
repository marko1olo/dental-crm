/**
 * telemetryAuditor.test.ts — Test Suite for AI Token Telemetry, Cost Auditor & Financial Accounting.
 *
 * SQUAD LAMBDA VERIFICATION SUITE:
 * 1. Exact integer kopeck cost calculations across LLM providers (zero float loss).
 * 2. Multi-model tariff resolution & prefix matching (OpenAI, Anthropic, Groq, DeepSeek, Domestic).
 * 3. Custom tariff registration and fallback behavior.
 * 4. Usage recording (success, error, latency, token tallies).
 * 5. Organization usage aggregation & analytics (by model, by provider, totals, average latency).
 * 6. Tenant isolation (Org A telemetry completely isolated from Org B).
 * 7. Period window filtering (today, custom date range).
 * 8. Dialogue history compaction & context window management.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { compactHistory, summarizeHistorySegment } from "./orchestrator.js";
import {
	DEFAULT_MODEL_TARIFFS,
	TelemetryAuditor,
} from "./telemetryAuditor.js";
import type { ProviderMessage } from "./types.js";

const ORG_A = "00000000-0000-7000-8000-000000000001";
const ORG_B = "00000000-0000-7000-8000-000000000002";
const USER_1 = "00000000-0000-7000-8000-000000000010";

describe("SQUAD LAMBDA — AI Token Telemetry, Cost Auditor & Context Compactor", () => {
	describe("1. Exact Integer Kopeck Cost Calculation & Tariff Resolution", () => {
		const auditor = new TelemetryAuditor();

		test("zero tokens yield exactly 0 kopecks", () => {
			const cost = auditor.calculateCostKopecks("openai", "gpt-4o", 0, 0);
			assert.strictEqual(cost, 0);
		});

		test("gpt-4o calculates exact kopeck cost with integer math", () => {
			// gpt-4o: prompt 23125 kopecks/1M, completion 92500 kopecks/1M
			// 1000 prompt tokens -> ceil(1000 * 23125 / 1e6) = ceil(23.125) = 24 kopecks
			// 500 completion tokens -> ceil(500 * 92500 / 1e6) = ceil(46.25) = 47 kopecks
			// Total: 24 + 47 = 71 kopecks
			const cost = auditor.calculateCostKopecks("openai", "gpt-4o", 1000, 500);
			assert.strictEqual(cost, 71);
			assert.strictEqual(Number.isInteger(cost), true);
		});

		test("gpt-4o-mini provides cheap micro-token pricing in integer kopecks", () => {
			// gpt-4o-mini: prompt 1388 kopecks/1M, completion 5550 kopecks/1M
			// 2000 prompt tokens -> ceil(2000 * 1388 / 1e6) = ceil(2.776) = 3 kopecks
			// 1000 completion tokens -> ceil(1000 * 5550 / 1e6) = ceil(5.55) = 6 kopecks
			// Total: 3 + 6 = 9 kopecks
			const cost = auditor.calculateCostKopecks("openai", "gpt-4o-mini", 2000, 1000);
			assert.strictEqual(cost, 9);
		});

		test("claude-3-5-sonnet tariff calculation", () => {
			// claude-3-5-sonnet: prompt 27750 kopecks/1M, completion 138750 kopecks/1M
			// 4000 prompt tokens -> ceil(4000 * 27750 / 1e6) = ceil(111) = 111 kopecks
			// 1000 completion tokens -> ceil(1000 * 138750 / 1e6) = ceil(138.75) = 139 kopecks
			// Total: 111 + 139 = 250 kopecks (2.50 RUB)
			const cost = auditor.calculateCostKopecks(
				"anthropic",
				"claude-3-5-sonnet",
				4000,
				1000,
			);
			assert.strictEqual(cost, 250);
		});

		test("groq llama-3.3-70b-versatile fast inference pricing", () => {
			// llama-3.3-70b-versatile: prompt 5458 kopecks/1M, completion 7308 kopecks/1M
			// 10000 prompt tokens -> ceil(10000 * 5458 / 1e6) = ceil(54.58) = 55 kopecks
			// 2000 completion tokens -> ceil(2000 * 7308 / 1e6) = ceil(14.616) = 15 kopecks
			// Total: 55 + 15 = 70 kopecks
			const cost = auditor.calculateCostKopecks(
				"groq",
				"llama-3.3-70b-versatile",
				10000,
				2000,
			);
			assert.strictEqual(cost, 70);
		});

		test("deepseek-chat ultra-cost-effective tariff", () => {
			// deepseek-chat: prompt 1295 kopecks/1M, completion 2590 kopecks/1M
			// 10000 prompt -> ceil(12.95) = 13 kopecks
			// 5000 completion -> ceil(12.95) = 13 kopecks
			// Total: 26 kopecks
			const cost = auditor.calculateCostKopecks(
				"deepseek",
				"deepseek-chat",
				10000,
				5000,
			);
			assert.strictEqual(cost, 26);
		});

		test("prefix matching resolves versioned model names", () => {
			const tariff1 = auditor.getTariff("gpt-4o-2024-08-06");
			assert.strictEqual(
				tariff1.promptKopecksPer1M,
				DEFAULT_MODEL_TARIFFS["gpt-4o"]!.promptKopecksPer1M,
			);

			const tariff2 = auditor.getTariff("claude-3-5-sonnet-20241022");
			assert.strictEqual(
				tariff2.promptKopecksPer1M,
				DEFAULT_MODEL_TARIFFS["claude-3-5-sonnet"]!.promptKopecksPer1M,
			);
		});

		test("custom tariff registration overrides default pricing", () => {
			const customAuditor = new TelemetryAuditor();
			customAuditor.registerTariff("custom-fine-tuned-dental", {
				promptKopecksPer1M: 50000,
				completionKopecksPer1M: 100000,
			});

			const tariff = customAuditor.getTariff("custom-fine-tuned-dental");
			assert.strictEqual(tariff.promptKopecksPer1M, 50000);
			assert.strictEqual(tariff.completionKopecksPer1M, 100000);

			const cost = customAuditor.calculateCostKopecks(
				"custom",
				"custom-fine-tuned-dental",
				2000,
				1000,
			);
			// 2000 * 50000 / 1e6 = 100 kopecks
			// 1000 * 100000 / 1e6 = 100 kopecks
			// Total = 200 kopecks
			assert.strictEqual(cost, 200);
		});

		test("unlisted model falls back to default tariff gracefully", () => {
			const fallbackTariff = auditor.getTariff("completely-unknown-model-xyz");
			assert.strictEqual(
				fallbackTariff.promptKopecksPer1M,
				DEFAULT_MODEL_TARIFFS.default!.promptKopecksPer1M,
			);
		});
	});

	describe("2. Usage Recording & Telemetry Audit Trail", () => {
		test("records successful AI generation event with complete metadata", async () => {
			const auditor = new TelemetryAuditor();
			const entry = {
				organizationId: ORG_A,
				userId: USER_1,
				sessionId: "session_copilot_101",
				modelName: "gpt-4o",
				provider: "openai",
				promptTokens: 1500,
				completionTokens: 350,
				latencyMs: 820,
				status: "success" as const,
			};

			const record = await auditor.recordUsage(entry);

			assert.ok(record.id);
			assert.strictEqual(record.organizationId, ORG_A);
			assert.strictEqual(record.userId, USER_1);
			assert.strictEqual(record.sessionId, "session_copilot_101");
			assert.strictEqual(record.totalTokens, 1850);
			assert.strictEqual(record.status, "success");
			assert.strictEqual(record.latencyMs, 820);
			assert.ok(record.estimatedCostKopecks > 0);
			assert.ok(record.createdAt instanceof Date);
		});

		test("records error events and captures error codes", async () => {
			const auditor = new TelemetryAuditor();
			const errorEntry = {
				organizationId: ORG_A,
				sessionId: "session_copilot_err",
				modelName: "llama-3.3-70b-versatile",
				provider: "groq",
				promptTokens: 800,
				completionTokens: 0,
				latencyMs: 150,
				status: "error" as const,
				errorCode: "RATE_LIMIT_EXCEEDED",
			};

			const record = await auditor.recordUsage(errorEntry);

			assert.strictEqual(record.status, "error");
			assert.strictEqual(record.errorCode, "RATE_LIMIT_EXCEEDED");
			assert.strictEqual(record.totalTokens, 800);
			assert.strictEqual(record.completionTokens, 0);
		});
	});

	describe("3. Organization Usage Aggregations & Analytics", () => {
		test("aggregates multiple telemetry events with exact mathematical sums", async () => {
			const auditor = new TelemetryAuditor();
			auditor.clearInMemory();

			// Record 3 events for Org A
			await auditor.recordUsage({
				organizationId: ORG_A,
				modelName: "gpt-4o",
				provider: "openai",
				promptTokens: 1000,
				completionTokens: 500,
				latencyMs: 600,
				status: "success",
			});

			await auditor.recordUsage({
				organizationId: ORG_A,
				modelName: "gpt-4o",
				provider: "openai",
				promptTokens: 2000,
				completionTokens: 1000,
				latencyMs: 1000,
				status: "success",
			});

			await auditor.recordUsage({
				organizationId: ORG_A,
				modelName: "deepseek-chat",
				provider: "deepseek",
				promptTokens: 5000,
				completionTokens: 2000,
				latencyMs: 800,
				status: "error",
				errorCode: "TIMEOUT",
			});

			const stats = await auditor.getOrganizationUsageStats(ORG_A);

			assert.strictEqual(stats.organizationId, ORG_A);
			assert.strictEqual(stats.totalRequests, 3);
			assert.strictEqual(stats.successfulRequests, 2);
			assert.strictEqual(stats.errorRequests, 1);

			// Tokens check
			assert.strictEqual(stats.totalPromptTokens, 1000 + 2000 + 5000); // 8000
			assert.strictEqual(stats.completionTokens, 500 + 1000 + 2000); // 3500
			assert.strictEqual(stats.totalTokens, 8000 + 3500); // 11500

			// Latency check: (600 + 1000 + 800) / 3 = 800ms
			assert.strictEqual(stats.averageLatencyMs, 800);

			// Breakdown by Model
			assert.ok(stats.byModel["gpt-4o"]);
			assert.strictEqual(stats.byModel["gpt-4o"].requests, 2);
			assert.strictEqual(stats.byModel["gpt-4o"].promptTokens, 3000);
			assert.strictEqual(stats.byModel["gpt-4o"].completionTokens, 1500);
			assert.strictEqual(stats.byModel["gpt-4o"].totalTokens, 4500);

			assert.ok(stats.byModel["deepseek-chat"]);
			assert.strictEqual(stats.byModel["deepseek-chat"].requests, 1);
			assert.strictEqual(stats.byModel["deepseek-chat"].totalTokens, 7000);

			// Breakdown by Provider
			assert.ok(stats.byProvider.openai);
			assert.strictEqual(stats.byProvider.openai.requests, 2);
			assert.strictEqual(stats.byProvider.openai.totalTokens, 4500);

			assert.ok(stats.byProvider.deepseek);
			assert.strictEqual(stats.byProvider.deepseek.requests, 1);
			assert.strictEqual(stats.byProvider.deepseek.totalTokens, 7000);

			// Total cost check
			assert.ok(stats.totalCostKopecks > 0);
			assert.strictEqual(
				stats.totalCostKopecks,
				stats.byModel["gpt-4o"].costKopecks +
					stats.byModel["deepseek-chat"].costKopecks,
			);
		});

		test("enforces strict multi-tenant isolation", async () => {
			const auditor = new TelemetryAuditor();
			auditor.clearInMemory();

			// Org A event
			await auditor.recordUsage({
				organizationId: ORG_A,
				modelName: "gpt-4o",
				provider: "openai",
				promptTokens: 1000,
				completionTokens: 500,
			});

			// Org B event
			await auditor.recordUsage({
				organizationId: ORG_B,
				modelName: "claude-3-5-sonnet",
				provider: "anthropic",
				promptTokens: 5000,
				completionTokens: 2000,
			});

			const statsA = await auditor.getOrganizationUsageStats(ORG_A);
			const statsB = await auditor.getOrganizationUsageStats(ORG_B);

			assert.strictEqual(statsA.totalRequests, 1);
			assert.strictEqual(statsA.totalTokens, 1500);
			assert.strictEqual(statsA.byModel["claude-3-5-sonnet"], undefined);

			assert.strictEqual(statsB.totalRequests, 1);
			assert.strictEqual(statsB.totalTokens, 7000);
			assert.strictEqual(statsB.byModel["gpt-4o"], undefined);
		});

		test("filters usage by period window", async () => {
			const auditor = new TelemetryAuditor();
			auditor.clearInMemory();

			const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
			const recentDate = new Date();

			await auditor.recordUsage({
				organizationId: ORG_A,
				modelName: "gpt-4o-mini",
				provider: "openai",
				promptTokens: 1000,
				completionTokens: 500,
				createdAt: pastDate,
			});

			await auditor.recordUsage({
				organizationId: ORG_A,
				modelName: "gpt-4o-mini",
				provider: "openai",
				promptTokens: 2000,
				completionTokens: 1000,
				createdAt: recentDate,
			});

			const filteredStats = await auditor.getOrganizationUsageStats(ORG_A, {
				from: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
				to: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
			});

			assert.strictEqual(filteredStats.totalRequests, 1);
			assert.strictEqual(filteredStats.totalTokens, 3000);
		});
	});

	describe("4. Context Compactor & History Management", () => {
		test("summarizeHistorySegment summarizes text and tool use correctly", () => {
			const historySlice: ProviderMessage[] = [
				{ role: "user", content: "Покажи карту пациента Иванов" },
				{
					role: "assistant",
					content: [
						{
							type: "tool_use",
							id: "call_1",
							name: "clinical.find_patient",
							input: { query: "Иванов" },
						},
					],
				},
				{
					role: "tool",
					content: [
						{
							type: "tool_result",
							toolCallId: "call_1",
							content: { patientId: "P-100", name: "Иванов И.И." },
						},
					],
				},
			];

			const summary = summarizeHistorySegment(historySlice);
			assert.ok(summary.includes("Пользователь: Покажи карту пациента Иванов"));
			assert.ok(summary.includes("clinical.find_patient"));
			assert.ok(summary.includes("Результат инструмента"));
		});

		test("compactHistory preserves system message and creates concise context summary on overflow", () => {
			const systemMsg: ProviderMessage = {
				role: "system",
				content: "Ты — клинический ассистент DENTE.",
			};

			const messages: ProviderMessage[] = [systemMsg];
			for (let i = 1; i <= 25; i++) {
				messages.push({
					role: i % 2 === 1 ? "user" : "assistant",
					content: `Сообщение ${i}`,
				});
			}

			assert.strictEqual(messages.length, 26);

			// Compact with max 10 messages and retain recent 4
			const compacted = compactHistory(messages, 10, 4);

			// Must preserve system prompt at index 0
			assert.strictEqual(compacted[0]?.role, "system");
			assert.strictEqual(compacted[0]?.content, "Ты — клинический ассистент DENTE.");

			// Must inject context summary
			const summaryMsg = compacted[1];
			assert.strictEqual(summaryMsg?.role, "user");
			assert.ok(
				typeof summaryMsg?.content === "string" &&
					summaryMsg.content.includes("Context Summary"),
			);

			// Total compacted length must be strictly smaller than original
			assert.ok(compacted.length < messages.length);
		});
	});
});
