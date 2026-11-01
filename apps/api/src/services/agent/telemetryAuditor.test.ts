/**
 * telemetryAuditor.test.ts — AI Token Telemetry, Cost Auditor & Multi-Tenant Analytics Suite.
 *
 * Sweet Spot: ~260 lines (<350 lines limit).
 * 1. Exact integer kopeck cost calculations across LLM providers (zero float loss).
 * 2. Multi-model tariff resolution & prefix matching (OpenAI, Claude, Gemini, Groq, DeepSeek).
 * 3. Free tier model detection (OpenRouter :free suffix, auto, 0 kopecks).
 * 4. Custom tariff registration and fallback behavior.
 * 5. Usage recording (success, error, latency, token tallies).
 * 6. Organization usage aggregation & multi-tenant isolation.
 * 7. Period window filtering.
 * 8. Dialogue history compaction & context window management.
 */

import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { describe, test } from "node:test";
import { compactHistory, summarizeHistorySegment } from "./orchestrator.js";
import {
	DEFAULT_MODEL_TARIFFS,
	TelemetryAuditor,
} from "./telemetryAuditor.js";
import type { ProviderMessage } from "./types.js";

const ORG_A = "00000000-0000-7000-8000-000000000001";
const USER_1 = "00000000-0000-7000-8000-000000000010";

describe("TelemetryAuditor & Context Compactor Suite", () => {
	describe("1. Exact Integer Kopeck Cost Calculation & Tariffs", () => {
		const auditor = new TelemetryAuditor();

		test("zero tokens and free models yield strictly 0 kopecks", () => {
			assert.strictEqual(auditor.calculateCostKopecks("openai", "gpt-4o", 0, 0), 0);
			assert.strictEqual(
				auditor.calculateCostKopecks("openrouter", "meta-llama/llama-3.3-70b-instruct:free", 50000, 10000),
				0,
			);
			assert.strictEqual(auditor.calculateCostKopecks("openrouter", "openrouter/auto", 10000, 2000), 0);
		});

		test("OpenAI models (gpt-4o, gpt-4o-mini, o1, o3-mini) calculate exact kopecks", () => {
			// gpt-4o: 1000 prompt (24 kop) + 500 comp (47 kop) = 71 kop
			assert.strictEqual(auditor.calculateCostKopecks("openai", "gpt-4o", 1000, 500), 71);
			// gpt-4o-mini: 2000 prompt (3 kop) + 1000 comp (6 kop) = 9 kop
			assert.strictEqual(auditor.calculateCostKopecks("openai", "gpt-4o-mini", 2000, 1000), 9);
			// o1: 1000 prompt (139 kop) + 1000 comp (555 kop) = 694 kop
			assert.strictEqual(auditor.calculateCostKopecks("openai", "o1", 1000, 1000), 694);
			// o3-mini: 2000 prompt (21 kop) + 1000 comp (41 kop) = 62 kop
			assert.strictEqual(auditor.calculateCostKopecks("openai", "o3-mini", 2000, 1000), 62);
		});

		test("Claude, Gemini, Groq, and DeepSeek tariffs compute exact integer math", () => {
			// claude-3-7-sonnet: 4000 prompt (111 kop) + 1000 comp (139 kop) = 250 kop
			assert.strictEqual(auditor.calculateCostKopecks("anthropic", "claude-3-7-sonnet", 4000, 1000), 250);
			assert.strictEqual(auditor.calculateCostKopecks("anthropic", "claude-3.7-sonnet", 4000, 1000), 250);

			// gemini-2.0-flash (18 kop), gemini-3.5-flash (36 kop)
			assert.strictEqual(auditor.calculateCostKopecks("google", "gemini-2.0-flash", 10000, 2000), 18);
			assert.strictEqual(auditor.calculateCostKopecks("google", "gemini-3.5-flash", 10000, 5000), 36);

			// groq llama-3.3-70b-versatile (70 kop) & deepseek-chat (26 kop)
			assert.strictEqual(auditor.calculateCostKopecks("groq", "llama-3.3-70b-versatile", 10000, 2000), 70);
			assert.strictEqual(auditor.calculateCostKopecks("deepseek", "deepseek-chat", 10000, 5000), 26);
		});

		test("prefix matching resolves versioned model names", () => {
			assert.strictEqual(
				auditor.getTariff("gpt-4o-2024-08-06").promptKopecksPer1M,
				DEFAULT_MODEL_TARIFFS["gpt-4o"]!.promptKopecksPer1M,
			);
			assert.strictEqual(
				auditor.getTariff("claude-3-7-sonnet-20250219").promptKopecksPer1M,
				DEFAULT_MODEL_TARIFFS["claude-3-7-sonnet"]!.promptKopecksPer1M,
			);
		});

		test("custom tariff registration overrides default pricing and unknown models fallback", () => {
			const customAuditor = new TelemetryAuditor();
			customAuditor.registerTariff("custom-fine-tuned-dental", {
				promptKopecksPer1M: 50000,
				completionKopecksPer1M: 100000,
			});
			assert.strictEqual(
				customAuditor.calculateCostKopecks("custom", "custom-fine-tuned-dental", 2000, 1000),
				200,
			);
			assert.strictEqual(
				auditor.getTariff("completely-unknown-model-xyz").promptKopecksPer1M,
				DEFAULT_MODEL_TARIFFS.default!.promptKopecksPer1M,
			);
		});
	});

	describe("2. Usage Recording & Error Auditing", () => {
		test("records successful AI generation event with metadata", async () => {
			const auditor = new TelemetryAuditor();
			const record = await auditor.recordUsage({
				organizationId: ORG_A,
				userId: USER_1,
				sessionId: "session_copilot_101",
				modelName: "gpt-4o",
				provider: "openai",
				promptTokens: 1500,
				completionTokens: 350,
				latencyMs: 820,
				status: "success",
			});

			assert.ok(record.id);
			assert.strictEqual(record.organizationId, ORG_A);
			assert.strictEqual(record.totalTokens, 1850);
			assert.strictEqual(record.status, "success");
			assert.ok(record.estimatedCostKopecks > 0);
		});

		test("records error events and captures error codes", async () => {
			const auditor = new TelemetryAuditor();
			const record = await auditor.recordUsage({
				organizationId: ORG_A,
				sessionId: "session_copilot_err",
				modelName: "llama-3.3-70b-versatile",
				provider: "groq",
				promptTokens: 800,
				completionTokens: 0,
				latencyMs: 150,
				status: "error",
				errorCode: "RATE_LIMIT_EXCEEDED",
			});

			assert.strictEqual(record.status, "error");
			assert.strictEqual(record.errorCode, "RATE_LIMIT_EXCEEDED");
			assert.strictEqual(record.totalTokens, 800);
		});
	});

	describe("3. Multi-Tenant Analytics & Window Filtering", () => {
		test("aggregates multiple telemetry events with exact mathematical sums", async () => {
			const auditor = new TelemetryAuditor();
			auditor.clearInMemory();
			const testOrgA = randomUUID();

			await auditor.recordUsage({
				organizationId: testOrgA,
				modelName: "gpt-4o",
				provider: "openai",
				promptTokens: 1000,
				completionTokens: 500,
				latencyMs: 600,
				status: "success",
			});
			await auditor.recordUsage({
				organizationId: testOrgA,
				modelName: "claude-3-7-sonnet",
				provider: "anthropic",
				promptTokens: 2000,
				completionTokens: 1000,
				latencyMs: 1000,
				status: "success",
			});
			await auditor.recordUsage({
				organizationId: testOrgA,
				modelName: "deepseek-chat",
				provider: "deepseek",
				promptTokens: 5000,
				completionTokens: 2000,
				latencyMs: 800,
				status: "error",
				errorCode: "TIMEOUT",
			});

			const stats = await auditor.getOrganizationUsageStats(testOrgA);
			assert.strictEqual(stats.organizationId, testOrgA);
			assert.strictEqual(stats.totalRequests, 3);
			assert.strictEqual(stats.successfulRequests, 2);
			assert.strictEqual(stats.errorRequests, 1);
			assert.strictEqual(stats.totalPromptTokens, 8000);
			assert.strictEqual(stats.completionTokens, 3500);
			assert.strictEqual(stats.totalTokens, 11500);
			assert.strictEqual(stats.averageLatencyMs, 800);

			assert.strictEqual(stats.byModel["gpt-4o"]?.requests, 1);
			assert.strictEqual(stats.byModel["claude-3-7-sonnet"]?.requests, 1);
			assert.strictEqual(stats.byModel["deepseek-chat"]?.requests, 1);
			assert.strictEqual(stats.byProvider.openai?.requests, 1);
			assert.strictEqual(stats.byProvider.anthropic?.requests, 1);
			assert.strictEqual(stats.byProvider.deepseek?.requests, 1);
			assert.ok(stats.totalCostKopecks > 0);
		});

		test("enforces strict multi-tenant isolation and period window filtering", async () => {
			const auditor = new TelemetryAuditor();
			auditor.clearInMemory();
			const tenantA = randomUUID();
			const tenantB = randomUUID();

			await auditor.recordUsage({
				organizationId: tenantA,
				modelName: "gpt-4o",
				provider: "openai",
				promptTokens: 1000,
				completionTokens: 500,
			});
			await auditor.recordUsage({
				organizationId: tenantB,
				modelName: "claude-3-7-sonnet",
				provider: "anthropic",
				promptTokens: 5000,
				completionTokens: 2000,
			});

			const statsA = await auditor.getOrganizationUsageStats(tenantA);
			const statsB = await auditor.getOrganizationUsageStats(tenantB);
			assert.strictEqual(statsA.totalRequests, 1);
			assert.strictEqual(statsA.totalTokens, 1500);
			assert.strictEqual(statsA.byModel["claude-3-7-sonnet"], undefined);

			assert.strictEqual(statsB.totalRequests, 1);
			assert.strictEqual(statsB.totalTokens, 7000);
			assert.strictEqual(statsB.byModel["gpt-4o"], undefined);

			// Period window filtering
			const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
			await auditor.recordUsage({
				organizationId: tenantA,
				modelName: "gpt-4o-mini",
				provider: "openai",
				promptTokens: 3000,
				completionTokens: 1500,
				createdAt: pastDate,
			});

			const filteredStats = await auditor.getOrganizationUsageStats(tenantA, {
				from: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
				to: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
			});
			assert.strictEqual(filteredStats.totalRequests, 1);
			assert.strictEqual(filteredStats.totalTokens, 1500);
		});
	});

	describe("4. Context Compactor & History Management", () => {
		test("summarizeHistorySegment summarizes text and tool use correctly", () => {
			const historySlice: ProviderMessage[] = [
				{ role: "user", content: "Покажи карту пациента Иванов" },
				{
					role: "assistant",
					content: [{ type: "tool_use", id: "c1", name: "clinical.find_patient", input: { query: "Иванов" } }],
				},
				{
					role: "tool",
					content: [{ type: "tool_result", toolCallId: "c1", content: { patientId: "P-100", name: "Иванов И.И." } }],
				},
			];

			const summary = summarizeHistorySegment(historySlice);
			assert.ok(summary.includes("Пользователь: Покажи карту пациента Иванов"));
			assert.ok(summary.includes("clinical.find_patient"));
			assert.ok(summary.includes("Результат инструмента"));
		});

		test("compactHistory preserves system message and creates concise context summary on overflow", () => {
			const systemMsg: ProviderMessage = { role: "system", content: "Ты — клинический ассистент DENTE." };
			const messages: ProviderMessage[] = [systemMsg];
			for (let i = 1; i <= 25; i++) {
				messages.push({ role: i % 2 === 1 ? "user" : "assistant", content: `Сообщение ${i}` });
			}
			assert.strictEqual(messages.length, 26);

			const compacted = compactHistory(messages, 10, 4);
			assert.strictEqual(compacted[0]?.role, "system");
			assert.strictEqual(compacted[0]?.content, "Ты — клинический ассистент DENTE.");

			const summaryMsg = compacted[1];
			assert.strictEqual(summaryMsg?.role, "user");
			assert.ok(typeof summaryMsg?.content === "string" && summaryMsg.content.includes("Context Summary"));
			assert.ok(compacted.length < messages.length);
		});
	});
});
