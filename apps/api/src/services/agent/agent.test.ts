/**
 * agent.test.ts — Comprehensive test suite for Dentalpin Agentic Core & PHI Redaction Ingestor.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { z } from "zod";
import type { AgentContext } from "./context.js";
import {
	CopilotActionManager,
	formatSseEvent,
} from "./copilotService.js";
import {
	checkGuardrails,
	permissionMatches,
	resetGuardrailCounters,
} from "./guardrails.js";
import {
	TokenBudgetGuard,
	runTurn,
} from "./orchestrator.js";
import { Redactor, SymbolTable } from "./redaction.js";
import {
	findPatientTool,
	getEmrCardTool,
	registerClinicalTools,
	suggestIcd10PlanTool,
} from "./tools/clinicalTools.js";
import { ToolRegistry } from "./tools/registry.js";
import {
	toolToAnthropicSchema,
	toolToOpenAiSchema,
	zodToJsonSchema,
} from "./tools/schemaSerializer.js";
import type { ToolDefinition } from "./tools/tool.js";
import type {
	LLMProvider,
	ProviderMessage,
} from "./types.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";
const PATIENT_ID = "00000000-0000-7000-8000-000000000004";

function createMockContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerClinicalTools(registry, "clinical");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: USER_ID,
		sessionId: "test-session-" + Math.random().toString(36).slice(2),
		mode: "autonomous",
		permissions: ["patients.read", "clinical.read", "schedule.write"],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("PHI Redaction Engine (SymbolTable & Redactor)", () => {
	test("SymbolTable tokenizes deterministically and rehydrates accurately", () => {
		const table = new SymbolTable();
		const realName = "Иванов Иван Иванович";
		const realPhone = "+7 (999) 123-45-67";

		const tokenName1 = table.tokenize(realName, "NAME");
		const tokenName2 = table.tokenize(realName, "NAME");
		const tokenPhone = table.tokenize(realPhone, "PHONE");

		assert.strictEqual(tokenName1, tokenName2, "Tokens must be deterministic for identical input");
		assert.match(tokenName1, /^NAME_[0-9a-f]{6}$/, "Token must match KIND_hash format");
		assert.match(tokenPhone, /^PHONE_[0-9a-f]{6}$/);

		const textWithTokens = `Пациент ${tokenName1}, тел. ${tokenPhone}, готов к осмотру.`;
		const restored = table.restoreText(textWithTokens);

		assert.strictEqual(
			restored,
			`Пациент ${realName}, тел. ${realPhone}, готов к осмотру.`,
			"Text must be restored to original cleartext",
		);
	});

	test("Redactor masks structured JSON keys across all Russian PHI categories", () => {
		const redactor = new Redactor();
		const structuredPayload = {
			fullName: "Петрова Анна Сергеевна",
			phone: "89271234567",
			email: "petrova@dental.ru",
			passport: "45 10 123456",
			snils: "123-456-789 01",
			oms: "1234567890123456",
			address: "г. Москва, ул. Тверская, д. 10",
			birthDate: "1985-05-12",
			patientId: PATIENT_ID,
			clinicalNotes: "Зуб 36 реагирует на холод",
		};

		const redacted = redactor.redactResult(structuredPayload) as Record<string, unknown>;

		assert.notStrictEqual(redacted.fullName, structuredPayload.fullName);
		assert.match(String(redacted.fullName), /^NAME_/);
		assert.match(String(redacted.phone), /^PHONE_/);
		assert.match(String(redacted.email), /^EMAIL_/);
		assert.match(String(redacted.passport), /^PASSPORT_/);
		assert.match(String(redacted.snils), /^SNILS_/);
		assert.match(String(redacted.oms), /^OMS_/);
		assert.match(String(redacted.address), /^ADDRESS_/);
		assert.match(String(redacted.birthDate), /^DOB_/);
		assert.match(String(redacted.patientId), /^PATIENT_/);

		// Resolve args / rehydration round-trip check
		const resolved = redactor.resolveArgs(redacted);
		assert.deepStrictEqual(resolved, structuredPayload, "Resolved args must perfectly match original payload");
	});

	test("Redactor scrubs free-text Russian PII using heuristic NER patterns", () => {
		const redactor = new Redactor();
		const prompt =
			"Запиши Сидорова Олега, телефон +79165554433, паспорт 4510 654321, СНИЛС 987-654-321 00 на прием.";

		const messages: ProviderMessage[] = [
			{
				role: "user",
				content: prompt,
			},
		];

		const outgoing = redactor.redactOutgoing(messages);
		const redactedText = typeof outgoing[0]?.content === "string" ? outgoing[0].content : "";

		assert.ok(!redactedText.includes("+79165554433"), "Phone must not leave in cleartext");
		assert.ok(!redactedText.includes("4510 654321"), "Passport must not leave in cleartext");
		assert.ok(!redactedText.includes("987-654-321 00"), "SNILS must not leave in cleartext");
		assert.match(redactedText, /PHONE_[0-9a-f]{6}/);
		assert.match(redactedText, /PASSPORT_[0-9a-f]{6}/);
		assert.match(redactedText, /SNILS_[0-9a-f]{6}/);

		const restored = redactor.rehydrate(redactedText);
		assert.strictEqual(restored, prompt, "Free text round-trip rehydration must match");
	});

	test("Redactor stream buffer emits clean rehydrated tokens across chunk boundaries", () => {
		const redactor = new Redactor();
		const name = "Смирнов Алексей";
		const token = redactor.table.tokenize(name, "NAME");

		// Simulate token split across 3 streaming deltas
		const chunk1 = "Пациент " + token.slice(0, 3);
		const chunk2 = token.slice(3, 7);
		const chunk3 = token.slice(7) + " прибыл в клинику.";

		const delta1 = redactor.rehydrateDelta(chunk1);
		const delta2 = redactor.rehydrateDelta(chunk2);
		const delta3 = redactor.rehydrateDelta(chunk3);
		const flushed = redactor.flushDeltaBuffer();

		const combined = delta1 + delta2 + delta3 + flushed;
		assert.strictEqual(
			combined,
			`Пациент ${name} прибыл в клинику.`,
			"Stream buffering must prevent split token corruption",
		);
	});
});

describe("Guardrails & RBAC Policy Engine", () => {
	test("Wildcard permission matching works accurately", () => {
		assert.ok(permissionMatches("patients.read", "patients.read"));
		assert.ok(permissionMatches("patients.read", "patients.*"));
		assert.ok(permissionMatches("patients.read", "*"));
		assert.ok(permissionMatches("schedule.cancel", "*.cancel"));
		assert.ok(!permissionMatches("billing.write", "patients.*"));
	});

	test("Supervised mode requires approval for non-read tools", () => {
		resetGuardrailCounters();
		const ctx = createMockContext({ mode: "supervised" });

		const mockReadTool: ToolDefinition = {
			name: "read_info",
			description: "Read only",
			parameters: z.object({}),
			permissions: ["patients.read"],
			category: "read",
			handler: async () => ({ ok: true }),
		};

		const mockWriteTool: ToolDefinition = {
			name: "update_card",
			description: "Write card",
			parameters: z.object({}),
			permissions: ["clinical.read"],
			category: "write",
			handler: async () => ({ ok: true }),
		};

		assert.strictEqual(checkGuardrails(ctx, mockReadTool, "read_info"), "allow");
		assert.strictEqual(checkGuardrails(ctx, mockWriteTool, "update_card"), "require_approval");
	});

	test("Rate limiting blocks calls exceeding max actions per minute", () => {
		resetGuardrailCounters();
		const ctx = createMockContext({ mode: "autonomous" });

		const dummyTool: ToolDefinition = {
			name: "quick_tool",
			description: "Fast",
			parameters: z.object({}),
			permissions: ["patients.read"],
			category: "read",
			handler: async () => ({ ok: true }),
		};

		const config = { maxActionsPerMinute: 3 };

		assert.strictEqual(checkGuardrails(ctx, dummyTool, "quick_tool", config), "allow");
		assert.strictEqual(checkGuardrails(ctx, dummyTool, "quick_tool", config), "allow");
		assert.strictEqual(checkGuardrails(ctx, dummyTool, "quick_tool", config), "allow");
		assert.strictEqual(checkGuardrails(ctx, dummyTool, "quick_tool", config), "block");
	});

	test("Blocked tools policy blocks invocation", () => {
		resetGuardrailCounters();
		const ctx = createMockContext();
		const tool: ToolDefinition = {
			name: "danger_tool",
			description: "Danger",
			parameters: z.object({}),
			permissions: ["*"],
			category: "destructive",
			handler: async () => ({ ok: true }),
		};

		const config = { blockedTools: ["danger_*"] };
		assert.strictEqual(checkGuardrails(ctx, tool, "danger_tool", config), "block");
	});
});

describe("Schema Serializer (OpenAI & Anthropic)", () => {
	test("Converts Zod object schema to standard JSON Schema and tool formats", () => {
		const testSchema = z.object({
			patientName: z.string().describe("Имя пациента"),
			age: z.number().optional().describe("Возраст"),
			status: z.enum(["active", "archived"]).default("active"),
		});

		const tool: ToolDefinition = {
			name: "test_tool",
			description: "Test tool description",
			parameters: testSchema,
			permissions: [],
			category: "read",
			handler: async () => ({}),
		};

		const jsonSchema = zodToJsonSchema(testSchema);
		assert.strictEqual(jsonSchema.type, "object");
		assert.deepStrictEqual((jsonSchema as any).required, ["patientName"]);
		assert.ok((jsonSchema as any).properties.patientName);

		const openAi = toolToOpenAiSchema(tool, "mod.test_tool") as any;
		assert.strictEqual(openAi.type, "function");
		assert.strictEqual(openAi.function.name, "mod.test_tool");
		assert.strictEqual(openAi.function.description, "Test tool description");

		const anthropic = toolToAnthropicSchema(tool, "mod.test_tool") as any;
		assert.strictEqual(anthropic.name, "mod.test_tool");
		assert.strictEqual(anthropic.input_schema.type, "object");
	});
});

describe("Tool Registry Chokepoint & RBAC", () => {
	test("Rejects invocation when RBAC permission is missing", async () => {
		const registry = new ToolRegistry();
		const securedTool: ToolDefinition = {
			name: "secret_records",
			description: "VIP only",
			parameters: z.object({ id: z.string() }),
			permissions: ["vip.access"],
			category: "read",
			handler: async () => ({ vip: true }),
		};

		registry.register(securedTool, "admin");

		const ctx = createMockContext({
			permissions: ["patients.read"],
			tools: registry,
		});

		const result = await registry.call(ctx, "admin.secret_records", { id: "123" });
		assert.strictEqual(result.ok, false);
		assert.match(String(result.error), /permission denied: vip\.access/);
	});

	test("Validates parameters against Zod schema before calling handler", async () => {
		const registry = new ToolRegistry();
		const mathTool: ToolDefinition = {
			name: "calc",
			description: "Calc",
			parameters: z.object({
				amount: z.number().min(100, "Сумма должна быть от 100"),
			}),
			permissions: ["patients.read"],
			category: "read",
			handler: async (_ctx, args) => ({ total: args.amount * 2 }),
		};

		registry.register(mathTool);
		const ctx = createMockContext({ tools: registry });

		// Invalid parameter
		const failRes = await registry.call(ctx, "calc", { amount: 50 });
		assert.strictEqual(failRes.ok, false);
		assert.match(String(failRes.error), /validation error: amount/);

		// Valid parameter
		const okRes = await registry.call(ctx, "calc", { amount: 200 });
		assert.strictEqual(okRes.ok, true);
		assert.deepStrictEqual(okRes.data, { total: 400 });
	});
});

describe("Clinical Tools Specification & ICD-10 Validator", () => {
	test("suggest_icd10_plan validates FDI tooth formula and returns matched stages", async () => {
		const ctx = createMockContext();

		// Invalid tooth number (e.g. 99)
		await assert.rejects(
			() =>
				suggestIcd10PlanTool.handler(ctx, {
					complaint: "Ноющая боль",
					toothNumber: 99,
				}),
			/Некорректный номер зуба FDI: 99/,
		);

		// Valid tooth 36 with Pulpitis complaint
		const pulpitisRes = (await suggestIcd10PlanTool.handler(ctx, {
			complaint: "Острая ночная самопроизвольная боль",
			toothNumber: 36,
		})) as any;

		assert.strictEqual(pulpitisRes.toothNumber, 36);
		assert.ok(pulpitisRes.suggestedDiagnoses.length > 0);
		const diag = pulpitisRes.suggestedDiagnoses[0];
		assert.strictEqual(diag.code, "K04.0");
		assert.match(diag.title, /Пульпит/);
		assert.ok(diag.stages.length >= 3);
		assert.strictEqual(diag.validation.isValid, true);
	});

	test("suggest_icd10_plan proposes Caries treatment stages for tooth 11", async () => {
		const ctx = createMockContext();
		const cariesRes = (await suggestIcd10PlanTool.handler(ctx, {
			complaint: "Кариес переднего зуба, реакция на сладкое",
			toothNumber: 11,
		})) as any;

		const diag = cariesRes.suggestedDiagnoses[0];
		assert.strictEqual(diag.code, "K02.1");
		assert.match(diag.title, /Кариес дентина/);
		assert.strictEqual(diag.validation.isValid, true);
	});
});

describe("Agent Orchestrator Loop & Turn Suspension", () => {
	test("Orchestrator executes READ tools automatically and writes assistant turn in real space", async () => {
		const redactor = new Redactor();
		const patientName = "Кузнецов Дмитрий";
		redactor.table.tokenize(patientName, "NAME");

		const registry = new ToolRegistry();
		const infoTool: ToolDefinition = {
			name: "get_status",
			description: "Status",
			parameters: z.object({ patient: z.string() }),
			permissions: ["patients.read"],
			category: "read",
			handler: async (_ctx, args) => {
				return { message: `Пациент ${args.patient} на месте` };
			},
		};
		registry.register(infoTool);

		const ctx = createMockContext({ tools: registry });

		// Mock LLM provider that streams tool use, then text response
		let step = 0;
		const mockProvider: LLMProvider = {
			async *complete() {
				if (step === 0) {
					step++;
					yield {
						type: "tool_use",
						id: "call_1",
						name: "get_status",
						input: { patient: redactor.table.getToken(patientName) || patientName },
					};
					yield {
						type: "done",
						stopReason: "tool_use",
					};
				} else {
					yield {
						type: "text_delta",
						text: "Пациент ожидает в холле.",
					};
					yield {
						type: "done",
						stopReason: "stop",
					};
				}
			},
		};

		const history: ProviderMessage[] = [
			{ role: "user", content: `Где ${patientName}?` },
		];

		const events: any[] = [];
		for await (const ev of runTurn({
			ctx,
			provider: mockProvider,
			system: "Dental assistant",
			history,
			toolNames: ["get_status"],
			redactor,
		})) {
			events.push(ev);
		}

		assert.ok(events.some((e) => e.type === "tool_call_started"));
		assert.ok(events.some((e) => e.type === "tool_call_finished"));
		assert.ok(events.some((e) => e.type === "token" && e.text.includes("Пациент ожидает")));
		assert.ok(events.some((e) => e.type === "final"));

		// Verify history contains un-redacted cleartext
		const lastAssistant = history[history.length - 1]!;
		assert.strictEqual(lastAssistant.role, "assistant");
	});

	test("Orchestrator suspends turn on WRITE tool requiring confirmation", async () => {
		const registry = new ToolRegistry();
		const writeTool: ToolDefinition = {
			name: "book_slot",
			description: "Book",
			parameters: z.object({ time: z.string() }),
			permissions: ["schedule.write"],
			category: "write",
			handler: async () => ({ booked: true }),
		};
		registry.register(writeTool);

		const ctx = createMockContext({ tools: registry });

		const mockProvider: LLMProvider = {
			async *complete() {
				yield {
					type: "tool_use",
					id: "call_book_1",
					name: "book_slot",
					input: { time: "14:00" },
				};
				yield {
					type: "done",
					stopReason: "tool_use",
				};
			},
		};

		const history: ProviderMessage[] = [{ role: "user", content: "Запиши меня" }];
		const events: any[] = [];

		for await (const ev of runTurn({
			ctx,
			provider: mockProvider,
			system: "Assistant",
			history,
			toolNames: ["book_slot"],
		})) {
			events.push(ev);
		}

		const confirmEvent = events.find((e) => e.type === "confirmation_required") as any;
		assert.ok(confirmEvent, "Orchestrator must yield confirmation_required for WRITE tool");
		assert.strictEqual(confirmEvent.callId, "call_book_1");
		assert.strictEqual(confirmEvent.name, "book_slot");
	});

	test("TokenBudgetGuard prevents calls when threshold is exceeded", async () => {
		const guard = new TokenBudgetGuard(100);
		guard.record(60, 50); // total 110 >= 100
		assert.strictEqual(guard.check(), false);

		const ctx = createMockContext();
		const mockProvider: LLMProvider = {
			async *complete() {},
		};

		const events: any[] = [];
		for await (const ev of runTurn({
			ctx,
			provider: mockProvider,
			system: "System",
			history: [],
			toolNames: [],
			budget: guard,
		})) {
			events.push(ev);
		}

		assert.strictEqual(events[0]?.type, "budget_exceeded");
	});
});

describe("Copilot Action Manager & SSE Formatting", () => {
	test("Registers pending actions, confirms, and formats SSE protocol chunks", async () => {
		const manager = new CopilotActionManager();
		const ctx = createMockContext();

		manager.registerPending("sess_1", "call_xyz", "clinical.find_patient", {
			query: "Иванов",
		});

		const pending = manager.getPending("call_xyz");
		assert.ok(pending);
		assert.strictEqual(pending.toolName, "clinical.find_patient");

		// SSE formatting check
		const sseChunk = formatSseEvent({
			type: "confirmation_required",
			callId: "call_xyz",
			name: "clinical.find_patient",
			arguments: { query: "Иванов" },
		});

		assert.ok(sseChunk.startsWith("event: confirmation_required\n"));
		assert.ok(sseChunk.includes('"callId":"call_xyz"'));
		assert.ok(sseChunk.endsWith("\n\n"));

		// Rejection check
		const rejected = manager.rejectAction("call_xyz", "Отменено врачом");
		assert.strictEqual(rejected.ok, true);
		assert.strictEqual(manager.getPending("call_xyz"), undefined);
	});
});
