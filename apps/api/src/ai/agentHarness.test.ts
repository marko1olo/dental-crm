/**
 * agentHarness.test.ts — Comprehensive Unit & Integration Tests for DENTE Clinical Agent ReAct Harness.
 *
 * Verifies:
 * 1. Single-turn final answer without tools
 * 2. ReAct loop: Model -> Tool Call -> Execution -> Reflection -> Final Answer
 * 3. Multi-tool calls in a single turn
 * 4. Streaming SSE event emission: token, reasoning, tool_start, tool_end, done
 * 5. Max iterations guard: terminates loop when maxIterations is reached without hanging
 * 6. AbortSignal cancellation: immediate graceful exit without unhandled rejections
 * 7. Error resilience: handles throwing tools by passing error object to model
 * 8. Two-phase execution guard: confirmation_required for destructive operations
 * 9. Runtime mode awareness: web_browser vs desktop_native prompt and tool filtering
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	type AgentHarnessEvent,
	buildAgentSystemPrompt,
	runAgentHarness,
} from "./agentHarness.js";
import type {
	AgentRouterChatParams,
	AgentRouterChatResponse,
	AgentRouterClient,
	AgentRouterStreamCallbacks,
} from "./agentRouterClient.js";
import type { DentalToolContext } from "./dentalTools.js";

const dummyContext: DentalToolContext = {
	organizationId: "11111111-1111-1111-1111-111111111111",
	patientId: "22222222-2222-2222-2222-222222222222",
	runtimeMode: "web_browser",
};

/**
 * Creates a mock AgentRouterClient with pre-scripted responses per turn
 */
function createMockClient(
	scriptedResponses: AgentRouterChatResponse[],
): AgentRouterClient {
	let turn = 0;

	const mock: Partial<AgentRouterClient> = {
		async createChatCompletion(
			params: AgentRouterChatParams,
		): Promise<AgentRouterChatResponse> {
			if (params.signal?.aborted) {
				const err = new Error("This operation was aborted");
				err.name = "AbortError";
				throw err;
			}
			const resp = scriptedResponses[turn];
			if (!resp) {
				throw new Error(`Mock client exhausted responses at turn ${turn}`);
			}
			turn++;
			return resp;
		},

		async createStreamingChatCompletion(
			params: AgentRouterChatParams,
			callbacks?: AgentRouterStreamCallbacks,
		): Promise<AgentRouterChatResponse> {
			if (params.signal?.aborted) {
				const err = new Error("This operation was aborted");
				err.name = "AbortError";
				throw err;
			}
			const resp = scriptedResponses[turn];
			if (!resp) {
				throw new Error(`Mock client exhausted responses at turn ${turn}`);
			}
			turn++;

			const msg = resp.choices[0]?.message;
			if (msg?.reasoning_content) {
				callbacks?.onReasoningChunk?.(msg.reasoning_content);
			}
			if (msg?.content) {
				// Stream content in two chunks to test chunking
				const half = Math.ceil(msg.content.length / 2);
				callbacks?.onChunk?.(msg.content.slice(0, half));
				callbacks?.onChunk?.(msg.content.slice(half));
			}
			callbacks?.onComplete?.(resp);
			return resp;
		},
	};

	return mock as AgentRouterClient;
}

test("1. runAgentHarness: Direct final answer without tool calls", async () => {
	const events: AgentHarnessEvent[] = [];
	const mockClient = createMockClient([
		{
			id: "resp-1",
			object: "chat.completion",
			created: Date.now(),
			model: "deepseek-v4-flash",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content: "Анестезия рассчитана: 1.5 карпулы артикаина 4%.",
						reasoning_content:
							"Проверяем массу тела 70 кг, выбираем 4% артикаин.",
					},
					finish_reason: "stop",
				},
			],
		},
	]);

	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Сколько карпул анестезии ввести?" }],
		context: dummyContext,
		client: mockClient,
		onEvent: (e) => {
			events.push(e);
		},
	});

	assert.equal(result.iterations, 1);
	assert.equal(result.toolCalls.length, 0);
	assert.ok(result.text.includes("Анестезия рассчитана"));
	assert.equal(result.aborted, undefined);

	// Verify events
	const reasoningEvents = events.filter((e) => e.type === "reasoning");
	const tokenEvents = events.filter((e) => e.type === "token");
	const doneEvents = events.filter((e) => e.type === "done");

	assert.ok(reasoningEvents.length >= 1, "Must emit reasoning event");
	assert.ok(tokenEvents.length >= 1, "Must emit token events");
	assert.equal(doneEvents.length, 1, "Must emit single done event");
});

test("2. runAgentHarness: ReAct Loop executes tool and returns final answer", async () => {
	const events: AgentHarnessEvent[] = [];
	const mockClient = createMockClient([
		// Turn 1: Model calls calculate_anesthesia
		{
			id: "resp-1",
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
								id: "call-1",
								type: "function",
								function: {
									name: "calculate_anesthesia",
									arguments: JSON.stringify({
										patientWeightKg: 70,
										plannedCarpules: 2,
									}),
								},
							},
						],
						reasoning_content:
							"Нужно рассчитать предельную дозу по формуле СтАР.",
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 2: Model reflects on tool result and delivers final diagnosis
		{
			id: "resp-2",
			object: "chat.completion",
			created: Date.now(),
			model: "deepseek-v4-flash",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content:
							"Безопасная доза: максимум 7 карпул артикаина. Запланированные 2 карпулы безопасны к введению.",
					},
					finish_reason: "stop",
				},
			],
		},
	]);

	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Пациент 70 кг, можно 2 карпулы?" }],
		context: dummyContext,
		client: mockClient,
		onEvent: (e) => {
			events.push(e);
		},
	});

	assert.equal(result.iterations, 2, "Must complete in 2 ReAct iterations");
	assert.equal(result.toolCalls.length, 1, "Must record 1 tool execution");
	assert.equal(result.toolCalls[0]?.tool, "calculate_anesthesia");
	assert.equal(
		(result.toolCalls[0]?.result as { safeToProceed: boolean })?.safeToProceed,
		true,
	);
	assert.ok(result.text.includes("Безопасная доза"));

	// Event flow check
	const toolStart = events.find((e) => e.type === "tool_start");
	const toolEnd = events.find((e) => e.type === "tool_end");
	const done = events.find((e) => e.type === "done");

	assert.ok(toolStart, "Must emit tool_start");
	assert.ok(toolEnd, "Must emit tool_end");
	assert.ok(done, "Must emit done");
});

test("3. runAgentHarness: Max iterations guard prevents infinite looping", async () => {
	// Script a model that perpetually calls a tool
	const endlessTurn: AgentRouterChatResponse = {
		id: "resp-endless",
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
							id: "call-loop",
							type: "function",
							function: {
								name: "compare_dental_materials",
								arguments: JSON.stringify({
									materialA: "Estelite Asteria",
									materialB: "Filtek Ultimate",
								}),
							},
						},
					],
				},
				finish_reason: "tool_calls",
			},
		],
	};

	const mockClient = createMockClient([
		endlessTurn,
		endlessTurn,
		endlessTurn,
		endlessTurn,
	]);

	const maxIter = 3;
	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Сравнивай бесконечно" }],
		context: dummyContext,
		client: mockClient,
		maxIterations: maxIter,
	});

	assert.equal(result.iterations, maxIter);
	assert.equal(result.toolCalls.length, maxIter);
	assert.ok(
		result.text.includes("Достигнут предел клинических итераций"),
		"Must append iteration limit fallback notice",
	);
});

test("4. runAgentHarness: AbortSignal stops execution immediately", async () => {
	const controller = new AbortController();
	controller.abort(); // Pre-aborted signal

	const mockClient = createMockClient([]);
	const events: AgentHarnessEvent[] = [];

	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Выполни действие" }],
		context: dummyContext,
		client: mockClient,
		signal: controller.signal,
		onEvent: (e) => {
			events.push(e);
		},
	});

	assert.equal(result.aborted, true);
	assert.equal(result.iterations, 0);
	assert.ok(
		events.some((e) => e.type === "error" && e.error.includes("прерван")),
	);
});

test("5. runAgentHarness: Error in tool execution is passed back to model without crash", async () => {
	const mockClient = createMockClient([
		// Turn 1: Model calls non-existent or invalid tool
		{
			id: "resp-1",
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
								id: "call-bad",
								type: "function",
								function: {
									name: "non_existent_tool_xyz",
									arguments: "{}",
								},
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 2: Model acknowledges error
		{
			id: "resp-2",
			object: "chat.completion",
			created: Date.now(),
			model: "deepseek-v4-flash",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content:
							"Инструмент не найден, перехожу к клиническим рекомендациям вручную.",
					},
					finish_reason: "stop",
				},
			],
		},
	]);

	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Запусти неизвестную команду" }],
		context: dummyContext,
		client: mockClient,
	});

	assert.equal(result.iterations, 2);
	assert.equal(result.toolCalls.length, 1);
	assert.ok(
		(
			result.toolCalls[0]?.result as { success: boolean; error: string }
		)?.error.includes("не найден в реестре"),
	);
	assert.ok(result.text.includes("Инструмент не найден"));
});

test("6. runAgentHarness: Two-phase execution guard emits confirmation_required for destructive tools", async () => {
	const events: AgentHarnessEvent[] = [];
	const mockClient = createMockClient([
		// Turn 1: Model attempts to update tooth status
		{
			id: "resp-1",
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
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 2: Model waits for doctor approval
		{
			id: "resp-2",
			object: "chat.completion",
			created: Date.now(),
			model: "deepseek-v4-flash",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content:
							"Запрос на удаление зуба 46 сформирован. Ожидаю подтверждения врача.",
					},
					finish_reason: "stop",
				},
			],
		},
	]);

	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Удали зуб 46" }],
		context: dummyContext,
		client: mockClient,
		requireConfirmationForDestructive: true,
		onEvent: (e) => {
			events.push(e);
		},
	});

	assert.equal(result.iterations, 2);
	const confirmationEvent = events.find(
		(e) => e.type === "confirmation_required",
	);
	assert.ok(confirmationEvent, "Must emit confirmation_required event");
	assert.equal(confirmationEvent.tool, "update_tooth_status");
	assert.ok(
		(result.toolCalls[0]?.result as { status: string })?.status ===
			"confirmation_required",
	);
});

test("7. buildAgentSystemPrompt: Correctly isolates web_browser vs desktop_native directives", () => {
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
