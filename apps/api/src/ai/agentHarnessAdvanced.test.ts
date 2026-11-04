/**
 * agentHarnessAdvanced.test.ts — Advanced Scenarios & Safety Guards for DENTE Clinical Agent ReAct Harness.
 *
 * Verifies:
 * 1. Two-phase execution guard: confirmation_required for destructive operations (Mandate 8e)
 * 2. buildAgentSystemPrompt: Isolates web_browser vs desktop_native directives
 * 3. manage_task_plan: Creates, updates active plan and emits plan_updated events
 * 4. Context auto-compaction: Triggers when token threshold is exceeded
 * 5. Repetitive tool failure sentinel: Attaches stuckDetectionWarning on repeated failures
 * 6. Swarm role directives: Injects Triage, Odontogram Inquisitor, Billing Sentinel, Vision Specialist
 */

import assert from "node:assert/strict";
import test from "node:test";
import { type AgentHarnessEvent, buildAgentSystemPrompt, runAgentHarness } from "./agentHarness.js";
import {
	type AgentRouterChatParams,
	type AgentRouterChatResponse,
	type AgentRouterClient,
	type AgentRouterStreamCallbacks,
	AgentRouterAllKeysExhaustedError,
	AgentRouterModelOverloadedError,
} from "./agentRouterClient.js";
import type { DentalToolContext } from "./dentalTools.js";
import { clearActivePlansStore } from "./dentalTools/taskPlanTools.js";

const dummyContext: DentalToolContext = {
	organizationId: "11111111-1111-1111-1111-111111111111",
	patientId: "22222222-2222-2222-2222-222222222222",
	runtimeMode: "web_browser",
};

function createMockClient(scriptedResponses: AgentRouterChatResponse[]): AgentRouterClient {
	let turn = 0;
	const mock: Partial<AgentRouterClient> = {
		async createChatCompletion(params: AgentRouterChatParams): Promise<AgentRouterChatResponse> {
			if (params.signal?.aborted) {
				const err = new Error("This operation was aborted");
				err.name = "AbortError";
				throw err;
			}
			const resp = scriptedResponses[turn];
			if (!resp) throw new Error(`Mock client exhausted responses at turn ${turn}`);
			turn++;
			return resp;
		},
		async createStreamingChatCompletion(params: AgentRouterChatParams, callbacks?: AgentRouterStreamCallbacks): Promise<AgentRouterChatResponse> {
			if (params.signal?.aborted) {
				const err = new Error("This operation was aborted");
				err.name = "AbortError";
				throw err;
			}
			const resp = scriptedResponses[turn];
			if (!resp) throw new Error(`Mock client exhausted responses at turn ${turn}`);
			turn++;
			const msg = resp.choices[0]?.message;
			if (msg?.content) callbacks?.onChunk?.(msg.content);
			callbacks?.onComplete?.(resp);
			return resp;
		},
	};
	return mock as AgentRouterClient;
}

test("1. runAgentHarness: Two-phase execution guard emits confirmation_required for destructive tools", async () => {
	const events: AgentHarnessEvent[] = [];
	const mockClient = createMockClient([
		{
			id: "resp-1",
			object: "chat.completion",
			created: Date.now(),
			model: "gemini-2.5-flash",
			choices: [{
				index: 0,
				message: {
					role: "assistant",
					content: null,
					tool_calls: [{
						id: "call-destr-1",
						type: "function",
						function: {
							name: "update_tooth_status",
							arguments: JSON.stringify({
								patientId: "22222222-2222-2222-2222-222222222222",
								toothNumber: 46,
								state: "extracted",
							}),
						},
					}],
				},
				finish_reason: "tool_calls",
			}],
		},
		{
			id: "resp-2",
			object: "chat.completion",
			created: Date.now(),
			model: "gemini-2.5-flash",
			choices: [{
				index: 0,
				message: {
					role: "assistant",
					content: "Запрос на удаление зуба 46 сформирован. Ожидаю подтверждения врача.",
				},
				finish_reason: "stop",
			}],
		},
	]);

	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Удали зуб 46" }],
		context: dummyContext,
		client: mockClient,
		requireConfirmationForDestructive: true,
		onEvent: (e) => { events.push(e); },
	});

	assert.equal(result.iterations, 2);
	const confirmationEvent = events.find((e) => e.type === "confirmation_required");
	assert.ok(confirmationEvent, "Must emit confirmation_required event");
	assert.equal(confirmationEvent.tool, "update_tooth_status");
	assert.ok((result.toolCalls[0]?.result as { status: string })?.status === "confirmation_required");
});

test("2. buildAgentSystemPrompt: Correctly isolates web_browser vs desktop_native directives", () => {
	const webPrompt = buildAgentSystemPrompt("web_browser", dummyContext);
	assert.ok(webPrompt.includes("WEB_BROWSER"));
	assert.ok(webPrompt.includes("Аппаратное прямое управление USB-датчиками"));

	const desktopPrompt = buildAgentSystemPrompt("desktop_native", {
		...dummyContext,
		runtimeMode: "desktop_native",
	});
	assert.ok(desktopPrompt.includes("DESKTOP_NATIVE"));
	assert.ok(desktopPrompt.includes("Antigravity Workstation Tools"));
	assert.ok(desktopPrompt.includes("launch_workstation_app"));
	assert.ok(desktopPrompt.includes("read_clinical_file"));
});

test("3. runAgentHarness: manage_task_plan updates active plan and emits plan_updated events", async () => {
	clearActivePlansStore();
	const events: AgentHarnessEvent[] = [];

	const mockClient = createMockClient([
		{
			id: "resp-plan-1",
			object: "chat.completion",
			created: Date.now(),
			model: "gemini-2.5-flash",
			choices: [{
				index: 0,
				message: {
					role: "assistant",
					content: null,
					tool_calls: [{
						id: "call-plan-create",
						type: "function",
						function: {
							name: "manage_task_plan",
							arguments: JSON.stringify({
								action: "create",
								goal: "Комплексная санация зубов 16 и 26",
								items: [
									{ id: "step_1", title: "Лечение кариеса зуба 16" },
									{ id: "step_2", title: "Эндодонтическое лечение зуба 26", blockedBy: ["step_1"] },
								],
							}),
						},
					}],
				},
				finish_reason: "tool_calls",
			}],
		},
		{
			id: "resp-plan-2",
			object: "chat.completion",
			created: Date.now(),
			model: "gemini-2.5-flash",
			choices: [{
				index: 0,
				message: {
					role: "assistant",
					content: null,
					tool_calls: [{
						id: "call-plan-update",
						type: "function",
						function: {
							name: "manage_task_plan",
							arguments: JSON.stringify({
								action: "update_status",
								itemId: "step_1",
								status: "completed",
								notes: "Кариес зуба 16 успешно вылечен, поставлена пломба.",
							}),
						},
					}],
				},
				finish_reason: "tool_calls",
			}],
		},
		{
			id: "resp-plan-3",
			object: "chat.completion",
			created: Date.now(),
			model: "gemini-2.5-flash",
			choices: [{
				index: 0,
				message: {
					role: "assistant",
					content: "План лечения зафиксирован. Шаг 1 выполнен, перехожу к эндодонтии зуба 26.",
				},
				finish_reason: "stop",
			}],
		},
	]);

	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Составь план санации зубов 16 и 26" }],
		context: dummyContext,
		client: mockClient,
		onEvent: (e) => { events.push(e); },
	});

	assert.equal(result.iterations, 3);
	assert.ok(result.plan, "Result must contain active plan");
	assert.equal(result.plan.goal, "Комплексная санация зубов 16 и 26");
	assert.equal(result.plan.items.length, 2);
	assert.equal(result.plan.items[0]?.status, "completed");
	assert.equal(result.plan.items[1]?.status, "pending");

	const planUpdatedEvents = events.filter((e) => e.type === "plan_updated");
	assert.equal(planUpdatedEvents.length, 2, "Must emit plan_updated event on create and update_status");

	const doneEvent = events.find((e) => e.type === "done");
	assert.ok(doneEvent && doneEvent.type === "done");
	assert.ok(doneEvent.plan, "done event must include plan");
	assert.equal(doneEvent.plan.items[0]?.status, "completed");
});

test("4. runAgentHarness: Context auto-compaction triggers when token threshold is exceeded", async () => {
	const events: AgentHarnessEvent[] = [];

	const mockClient = createMockClient([
		{
			id: "resp-c1",
			object: "chat.completion",
			created: Date.now(),
			model: "gemini-2.5-flash",
			choices: [{
				index: 0,
				message: {
					role: "assistant",
					content: null,
					tool_calls: [{
						id: "call-calc-1",
						type: "function",
						function: {
							name: "calculate_anesthesia",
							arguments: JSON.stringify({ patientWeightKg: 85, plannedCarpules: 1 }),
						},
					}],
				},
				finish_reason: "tool_calls",
			}],
		},
		{
			id: "resp-c2",
			object: "chat.completion",
			created: Date.now(),
			model: "gemini-2.5-flash",
			choices: [{
				index: 0,
				message: {
					role: "assistant",
					content: "Дозировка безопасна. 1 карпула артикаина в пределах нормы для веса 85 кг.",
				},
				finish_reason: "stop",
			}],
		},
	]);

	const largeClinicalNote = "Пациент жалуется на острую боль в зубе 46. ".repeat(15);

	const result = await runAgentHarness({
		messages: [
			{ role: "user", content: largeClinicalNote },
			{ role: "assistant", content: "Провожу осмотр и зондирование зуба 46." },
			{ role: "user", content: "Рассчитай анестезию для веса 85 кг." },
		],
		context: dummyContext,
		client: mockClient,
		enableAutoCompaction: true,
		compactThresholdTokens: 50,
		slidingWindowRetainedTurns: 2,
		onEvent: (e) => { events.push(e); },
	});

	assert.equal(result.compacted, true, "Harness result must flag compacted = true");
	const compactEvent = events.find((e) => e.type === "compact_triggered");
	assert.ok(compactEvent, "Must emit compact_triggered event");
	assert.ok(result.text.includes("Дозировка безопасна"));
});

test("5. runAgentHarness: Repetitive tool failure sentinel attaches stuckDetectionWarning on repeated failures", async () => {
	const mockClient = createMockClient([
		{
			id: "resp-f1",
			object: "chat.completion",
			created: Date.now(),
			model: "gemini-2.5-flash",
			choices: [{
				index: 0,
				message: {
					role: "assistant",
					content: null,
					tool_calls: [{
						id: "call-fail-1",
						type: "function",
						function: { name: "non_existent_tool_1", arguments: "{}" },
					}],
				},
				finish_reason: "tool_calls",
			}],
		},
		{
			id: "resp-f2",
			object: "chat.completion",
			created: Date.now(),
			model: "gemini-2.5-flash",
			choices: [{
				index: 0,
				message: {
					role: "assistant",
					content: null,
					tool_calls: [{
						id: "call-fail-2",
						type: "function",
						function: { name: "non_existent_tool_2", arguments: "{}" },
					}],
				},
				finish_reason: "tool_calls",
			}],
		},
		{
			id: "resp-f3",
			object: "chat.completion",
			created: Date.now(),
			model: "gemini-2.5-flash",
			choices: [{
				index: 0,
				message: {
					role: "assistant",
					content: "Зафиксирован повторный сбой вызова инструментов. Отвечаю напрямую.",
				},
				finish_reason: "stop",
			}],
		},
	]);

	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Попробуй выполнить неизвестную команду" }],
		context: dummyContext,
		client: mockClient,
	});

	assert.equal(result.iterations, 3);
	assert.equal(result.toolCalls.length, 2);

	const firstResult = result.toolCalls[0]?.result as Record<string, unknown>;
	assert.equal(firstResult.stuckDetectionWarning, undefined);

	const secondResult = result.toolCalls[1]?.result as Record<string, unknown>;
	assert.ok(typeof secondResult.stuckDetectionWarning === "string");
	assert.ok((secondResult.stuckDetectionWarning as string).includes("STUCK_DETECTION"));
	assert.ok(result.text.includes("Зафиксирован повторный сбой"));
});

test("6. buildAgentSystemPrompt: Injects in-app clinical copilot role directives", () => {
	const triagePrompt = buildAgentSystemPrompt("web_browser", dummyContext, undefined, "triage");
	assert.ok(triagePrompt.includes("[КЛИНИЧЕСКАЯ СПЕЦИАЛИЗАЦИЯ: МАРШРУТИЗАЦИЯ И ПЕРВИЧНЫЙ ТРИАЖ]"));
	assert.ok(triagePrompt.includes("Socratic Triage"));

	const inquisitorPrompt = buildAgentSystemPrompt("web_browser", dummyContext, undefined, "odontogram_inquisitor");
	assert.ok(inquisitorPrompt.includes("[КЛИНИЧЕСКАЯ СПЕЦИАЛИЗАЦИЯ: АУДИТ МЕДИЦИНСКОЙ КАРТЫ И ОДОНТОГРАММЫ]"));
	assert.ok(inquisitorPrompt.includes("СтАР (K02–K08)"));

	const billingPrompt = buildAgentSystemPrompt("web_browser", dummyContext, undefined, "billing_sentinel");
	assert.ok(billingPrompt.includes("[КЛИНИЧЕСКАЯ СПЕЦИАЛИЗАЦИЯ: ФИНАНСОВЫЙ КОНТРОЛЬ И КАССОВАЯ ДИСЦИПЛИНА]"));
	assert.ok(billingPrompt.includes("amountKopecks"));

	const visionPrompt = buildAgentSystemPrompt("desktop_native", dummyContext, undefined, "vision_specialist");
	assert.ok(visionPrompt.includes("[КЛИНИЧЕСКАЯ СПЕЦИАЛИЗАЦИЯ: ЛУЧЕВАЯ ДИАГНОСТИКА И АНАЛИЗ СНИМКОВ]"));
	assert.ok(visionPrompt.includes("Хаунсфилда (D1–D4)"));
	assert.ok(visionPrompt.includes("DESKTOP_NATIVE"));
});

test("7. runAgentHarness: Fallback to deterministic ReAct cycle when API keys are exhausted", async () => {
	const exhaustedClient: Partial<AgentRouterClient> = {
		async createChatCompletion() {
			throw new AgentRouterAllKeysExhaustedError(10000);
		},
		async createStreamingChatCompletion() {
			throw new AgentRouterAllKeysExhaustedError(10000);
		},
	};

	const events: AgentHarnessEvent[] = [];
	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Пациент 46 зуб острая боль от сладкого, кариес эмали" }],
		context: dummyContext,
		client: exhaustedClient as AgentRouterClient,
		trustLevel: "confirm_all",
		onEvent: (e) => { events.push(e); },
	});

	assert.ok(result.text.length > 0, "Must return clinical verdict");
	assert.ok(result.iterations >= 1, "Must execute iterations in deterministic ReAct cycle");
	assert.ok(result.toolCalls.length >= 1, "Must execute tools in fallback ReAct cycle");
	assert.ok(events.some((e) => e.type === "reasoning" && e.text.includes("СУВЕРЕННЫЙ EBM КЛИНИЧЕСКИЙ ДВИЖОК")));
	assert.ok(events.some((e) => e.type === "confirmation_required"), "Must emit confirmation_required under confirm_all");
	assert.ok(events.some((e) => e.type === "done"));
});

test("7b. runAgentHarness: Fallbacks when AgentRouter throws 'exhausted all keys' Error (AI-REV-03 & ROUTER-01)", async () => {
	const exhaustedErrorClient: Partial<AgentRouterClient> = {
		async createChatCompletion() {
			throw new Error("AgentRouter exhausted all keys (2 attempts failed). Errors: [Key agentrouter...1111: 429 Rate Limit]");
		},
		async createStreamingChatCompletion() {
			throw new Error("AgentRouter exhausted all keys for streaming (2 attempts failed). Errors: [Key agentrouter...1111: 429 Rate Limit]");
		},
	};

	const events: AgentHarnessEvent[] = [];
	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Пациент жалуется на ноющие боли в зубе 16 от холодного" }],
		context: dummyContext,
		client: exhaustedErrorClient as AgentRouterClient,
		trustLevel: "confirm_all",
		onEvent: (e) => { events.push(e); },
	});

	assert.ok(result.text.length > 0, "Must return clinical verdict via fallback");
	assert.ok(result.iterations >= 1);
	assert.ok(events.some((e) => e.type === "reasoning" && e.text.includes("СУВЕРЕННЫЙ EBM КЛИНИЧЕСКИЙ ДВИЖОК")));
});

test("7c. runAgentHarness: Fallbacks when AgentRouter throws AgentRouterModelOverloadedError HTTP 402", async () => {
	const overloadedClient: Partial<AgentRouterClient> = {
		async createChatCompletion() {
			throw new AgentRouterModelOverloadedError("gemini-3.6-flash", 1800, "Quota has been exhausted");
		},
		async createStreamingChatCompletion() {
			throw new AgentRouterModelOverloadedError("gemini-3.6-flash", 1800, "Quota has been exhausted");
		},
	};

	const events: AgentHarnessEvent[] = [];
	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Зуб 24 кариес дентина, поставить пломбу" }],
		context: dummyContext,
		client: overloadedClient as AgentRouterClient,
		onEvent: (e) => { events.push(e); },
	});

	assert.ok(result.text.length > 0, "Must return clinical verdict via fallback");
	assert.ok(events.some((e) => e.type === "reasoning" && e.text.includes("СУВЕРЕННЫЙ EBM КЛИНИЧЕСКИЙ ДВИЖОК")));
});

test("8. buildAgentSystemPrompt: Injects custom doctor instructions, clinical memory and specialization", () => {
	const prompt = buildAgentSystemPrompt(
		"desktop_native",
		dummyContext,
		undefined,
		"orchestrator",
		"Всегда использовать микроскоп и коффердам",
		["Любимый композит: Filtek Ultimate A2", "Анестетик первого выбора: Убистезин форте 1:100 000"],
		"Терапевт-эндодонтист",
	);

	assert.ok(prompt.includes("=== ИНДИВИДУАЛЬНЫЙ КЛИНИЧЕСКИЙ ПРОФИЛЬ ВРАЧА И ПАМЯТЬ АССИСТЕНТА ==="));
	assert.ok(prompt.includes("Терапевт-эндодонтист"));
	assert.ok(prompt.includes("Всегда использовать микроскоп и коффердам"));
	assert.ok(prompt.includes("Любимый композит: Filtek Ultimate A2"));
	assert.ok(prompt.includes("Убистезин форте 1:100 000"));
});

test("9. ToolDispatcher: Granular permissions auto-approve file and clinical actions even in balanced mode", async () => {
	const events: AgentHarnessEvent[] = [];
	const mockClient = createMockClient([
		{
			id: "resp-1",
			object: "chat.completion",
			created: Date.now(),
			model: "mock-model",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content: null,
						tool_calls: [
							{
								id: "call-1",
								type: "function",
								function: {
									name: "read_clinical_file",
									arguments: JSON.stringify({ filePath: "test.txt" }),
								},
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		{
			id: "resp-2",
			object: "chat.completion",
			created: Date.now(),
			model: "mock-model",
			choices: [
				{
					index: 0,
					message: { role: "assistant", content: "Файл успешно прочитан без блокировок" },
					finish_reason: "stop",
				},
			],
		},
	]);

	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Прочитай файл снимка" }],
		context: dummyContext,
		client: mockClient,
		trustLevel: "confirm_all",
		granularPermissions: { autoApproveFileReads: true },
		onEvent: (e) => { events.push(e); },
	});

	assert.ok(result.text.includes("Файл успешно прочитан"));
	assert.strictEqual(events.some((e) => e.type === "confirmation_required"), false, "Must auto-approve file read when granular permission is set");
});
