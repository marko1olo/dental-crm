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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
import { clearActivePlansStore } from "./dentalTools/taskPlanTools.js";

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

test("8. runAgentHarness: manage_task_plan updates active plan and emits plan_updated events", async () => {
	clearActivePlansStore();
	const events: AgentHarnessEvent[] = [];

	const mockClient = createMockClient([
		// Turn 1: Model creates plan
		{
			id: "resp-plan-1",
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
								id: "call-plan-create",
								type: "function",
								function: {
									name: "manage_task_plan",
									arguments: JSON.stringify({
										action: "create",
										goal: "Комплексная санация зубов 16 и 26",
										items: [
											{ id: "step_1", title: "Лечение кариеса зуба 16" },
											{
												id: "step_2",
												title: "Эндодонтическое лечение зуба 26",
												blockedBy: ["step_1"],
											},
										],
									}),
								},
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 2: Model updates step_1 to completed
		{
			id: "resp-plan-2",
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
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 3: Final response
		{
			id: "resp-plan-3",
			object: "chat.completion",
			created: Date.now(),
			model: "deepseek-v4-flash",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content:
							"План лечения зафиксирован. Шаг 1 выполнен, перехожу к эндодонтии зуба 26.",
					},
					finish_reason: "stop",
				},
			],
		},
	]);

	const result = await runAgentHarness({
		messages: [{ role: "user", content: "Составь план санации зубов 16 и 26" }],
		context: dummyContext,
		client: mockClient,
		onEvent: (e) => {
			events.push(e);
		},
	});

	assert.equal(result.iterations, 3);
	assert.ok(result.plan, "Result must contain active plan");
	assert.equal(result.plan.goal, "Комплексная санация зубов 16 и 26");
	assert.equal(result.plan.items.length, 2);
	assert.equal(result.plan.items[0]?.status, "completed");
	assert.equal(result.plan.items[1]?.status, "pending");

	const planUpdatedEvents = events.filter((e) => e.type === "plan_updated");
	assert.equal(
		planUpdatedEvents.length,
		2,
		"Must emit plan_updated event on create and on update_status",
	);

	const doneEvent = events.find((e) => e.type === "done");
	assert.ok(doneEvent && doneEvent.type === "done");
	assert.ok(doneEvent.plan, "done event must include plan");
	assert.equal(doneEvent.plan.items[0]?.status, "completed");
});

test("9. runAgentHarness: Context auto-compaction triggers when token threshold is exceeded", async () => {
	const events: AgentHarnessEvent[] = [];

	const mockClient = createMockClient([
		{
			id: "resp-c1",
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
								id: "call-calc-1",
								type: "function",
								function: {
									name: "calculate_anesthesia",
									arguments: JSON.stringify({
										patientWeightKg: 85,
										plannedCarpules: 1,
									}),
								},
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		{
			id: "resp-c2",
			object: "chat.completion",
			created: Date.now(),
			model: "deepseek-v4-flash",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content:
							"Дозировка безопасна. 1 карпула артикаина в пределах нормы для веса 85 кг.",
					},
					finish_reason: "stop",
				},
			],
		},
	]);

	const largeClinicalNote =
		"Пациент жалуется на острую пульсирующую боль в зубе 46 при накусывании. ".repeat(
			15,
		);

	const result = await runAgentHarness({
		messages: [
			{ role: "user", content: largeClinicalNote },
			{
				role: "assistant",
				content:
					"Провожу осмотр и зондирование зуба 46. Глубокая кариозная полость.",
			},
			{
				role: "user",
				content: "Рассчитай анестезию для веса 85 кг перед лечением.",
			},
		],
		context: dummyContext,
		client: mockClient,
		enableAutoCompaction: true,
		compactThresholdTokens: 50,
		slidingWindowRetainedTurns: 2,
		onEvent: (e) => {
			events.push(e);
		},
	});

	assert.equal(result.compacted, true, "Harness result must flag compacted = true");
	const compactEvent = events.find((e) => e.type === "compact_triggered");
	assert.ok(compactEvent, "Must emit compact_triggered event");
	assert.ok(result.text.includes("Дозировка безопасна"));
});

test("10. runAgentHarness: Universal workstation aliases (write_file, read_file, search_files, run_command) resolve in desktop_native mode", async () => {
	const desktopContext: DentalToolContext = {
		organizationId: "11111111-1111-1111-1111-111111111111",
		patientId: "22222222-2222-2222-2222-222222222222",
		runtimeMode: "desktop_native",
		allowLocalExecution: true,
	};

	const testDir = path.resolve(os.tmpdir(), `dente_test_dir_${Date.now()}`);
	if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
	const testFilePath = path.resolve(
		testDir,
		`dente_alias_test_${Date.now()}.txt`,
	);

	const mockClient = createMockClient([
		// Turn 1: write_file alias -> write_clinical_file
		{
			id: "resp-a1",
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
								id: "call-write",
								type: "function",
								function: {
									name: "write_file",
									arguments: JSON.stringify({
										targetFile: testFilePath,
										content: "CLINICAL_TEST_DATA_ALIAS",
										overwrite: true,
									}),
								},
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 2: read_file alias -> read_clinical_file
		{
			id: "resp-a2",
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
								id: "call-read",
								type: "function",
								function: {
									name: "read_file",
									arguments: JSON.stringify({
										filePath: testFilePath,
									}),
								},
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 3: search_files alias -> search_workstation_files
		{
			id: "resp-a3",
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
								id: "call-search",
								type: "function",
								function: {
									name: "search_files",
									arguments: JSON.stringify({
										query: "dente_alias_test",
										searchRoots: [testDir],
									}),
								},
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 4: run_command alias -> run_workstation_command
		{
			id: "resp-a4",
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
								id: "call-cmd",
								type: "function",
								function: {
									name: "run_command",
									arguments: JSON.stringify({
										commandLine: "echo ALIAS_OK",
									}),
								},
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 5: Final response
		{
			id: "resp-a5",
			object: "chat.completion",
			created: Date.now(),
			model: "deepseek-v4-flash",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content:
							"Все системные инструменты успешно вызваны через стандартные псевдонимы.",
					},
					finish_reason: "stop",
				},
			],
		},
	]);

	try {
		const result = await runAgentHarness({
			messages: [{ role: "user", content: "Проверь файловый харнесс" }],
			context: desktopContext,
			client: mockClient,
		});

		assert.equal(result.iterations, 5);
		assert.equal(result.toolCalls.length, 4);

		// 1. write_file
		assert.equal(result.toolCalls[0]?.tool, "write_file");
		assert.equal(
			(result.toolCalls[0]?.result as { success: boolean }).success,
			true,
		);

		// 2. read_file
		assert.equal(result.toolCalls[1]?.tool, "read_file");
		const readRes = result.toolCalls[1]?.result as {
			success: boolean;
			content: string;
		};
		assert.equal(readRes.success, true);
		assert.ok(readRes.content.includes("CLINICAL_TEST_DATA_ALIAS"));

		// 3. search_files
		assert.equal(result.toolCalls[2]?.tool, "search_files");
		assert.equal(
			(result.toolCalls[2]?.result as { success: boolean }).success,
			true,
		);

		// 4. run_command
		assert.equal(result.toolCalls[3]?.tool, "run_command");
		assert.equal(
			(result.toolCalls[3]?.result as { success: boolean }).success,
			true,
		);

		assert.ok(
			result.text.includes("Все системные инструменты успешно вызваны"),
		);
	} finally {
		if (fs.existsSync(testFilePath)) {
			try {
				fs.unlinkSync(testFilePath);
			} catch {
				// ignore cleanup error
			}
		}
		if (fs.existsSync(testDir)) {
			try {
				fs.rmSync(testDir, { recursive: true, force: true });
			} catch {
				// ignore cleanup error
			}
		}
	}
});

test("11. runAgentHarness: Repetitive tool failure sentinel attaches stuckDetectionWarning on repeated failures", async () => {
	const mockClient = createMockClient([
		// Turn 1: Model calls non-existent tool -> 1st failure
		{
			id: "resp-f1",
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
								id: "call-fail-1",
								type: "function",
								function: {
									name: "non_existent_tool_1",
									arguments: "{}",
								},
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 2: Model calls non-existent tool again -> 2nd failure triggers stuck warning
		{
			id: "resp-f2",
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
								id: "call-fail-2",
								type: "function",
								function: {
									name: "non_existent_tool_2",
									arguments: "{}",
								},
							},
						],
					},
					finish_reason: "tool_calls",
				},
			],
		},
		// Turn 3: Model notices warning and stops calling bad tools
		{
			id: "resp-f3",
			object: "chat.completion",
			created: Date.now(),
			model: "deepseek-v4-flash",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content:
							"Зафиксирован повторный сбой вызова инструментов. Прекращаю попытки и формулирую ответ врачу напрямую.",
					},
					finish_reason: "stop",
				},
			],
		},
	]);

	const result = await runAgentHarness({
		messages: [
			{ role: "user", content: "Попробуй выполнить неизвестную команду" },
		],
		context: dummyContext,
		client: mockClient,
	});

	assert.equal(result.iterations, 3);
	assert.equal(result.toolCalls.length, 2);

	// First tool failure has no stuck warning
	const firstResult = result.toolCalls[0]?.result as Record<string, unknown>;
	assert.equal(firstResult.stuckDetectionWarning, undefined);

	// Second tool failure must have stuckDetectionWarning
	const secondResult = result.toolCalls[1]?.result as Record<string, unknown>;
	assert.ok(typeof secondResult.stuckDetectionWarning === "string");
	assert.ok(
		(secondResult.stuckDetectionWarning as string).includes("STUCK_DETECTION"),
		"Must attach stuck detection warning on 2nd consecutive failure",
	);

	assert.ok(result.text.includes("Зафиксирован повторный сбой"));
});

test("12. buildAgentSystemPrompt: Injects in-app multi-agent swarm role directives", () => {
	const triagePrompt = buildAgentSystemPrompt("web_browser", dummyContext, undefined, "triage");
	assert.ok(triagePrompt.includes("[РОЛЬ РОЯ: 📞 TRIAGE AGENT]"));
	assert.ok(triagePrompt.includes("Socratic Triage"));

	const inquisitorPrompt = buildAgentSystemPrompt("web_browser", dummyContext, undefined, "odontogram_inquisitor");
	assert.ok(inquisitorPrompt.includes("[РОЛЬ РОЯ: 📋 ODONTOGRAM & DIARY INQUISITOR]"));
	assert.ok(inquisitorPrompt.includes("СтАР (K02–K08)"));

	const billingPrompt = buildAgentSystemPrompt("web_browser", dummyContext, undefined, "billing_sentinel");
	assert.ok(billingPrompt.includes("[РОЛЬ РОЯ: 💳 BILLING & FISCAL SENTINEL]"));
	assert.ok(billingPrompt.includes("amountKopecks"));

	const visionPrompt = buildAgentSystemPrompt("desktop_native", dummyContext, undefined, "vision_specialist");
	assert.ok(visionPrompt.includes("[РОЛЬ РОЯ: 🩻 VISION / DICOM SPECIALIST]"));
	assert.ok(visionPrompt.includes("Хаунсфилда (D1–D4)"));
	assert.ok(visionPrompt.includes("DESKTOP_NATIVE"));
});


