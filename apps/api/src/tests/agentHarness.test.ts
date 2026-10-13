/**
 * agentHarness.test.ts — Comprehensive Integration & Red Team Test Suite
 * for Autonomous Clinical Dental Agent ReAct Harness & Fastify Routes.
 *
 * Verifies:
 * 1. Full ReAct Loop: tool calling (calculate_anesthesia) -> execution -> final answer
 * 2. Infinite Loop Guard: hard termination at maxIterations with safe clinical summary
 * 3. SSE Event Emission: reasoning, tool_start, tool_end, token, done sequence
 * 4. Resilient Error Handling & Secret Scrubbing: 402/429 maskApiKey protection
 * 5. RuntimeMode Differentiation: web_browser vs desktop_native workstation tools
 * 6. Fastify Endpoints: GET /api/agent/tools & POST /api/agent/chat (SSE + JSON)
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import Fastify from "fastify";
import {
	runAgentHarness,
	buildAgentSystemPrompt,
	type AgentHarnessEvent,
} from "../ai/agentHarness.js";
import {
	getDentalTools,
	executeDentalTool,
} from "../ai/dentalTools.js";
import {
	AgentRouterClient,
	type AgentRouterChatParams,
	type AgentRouterChatResponse,
} from "../ai/agentRouterClient.js";
import { registerAgentRoutes } from "../routes/agentRoutes.js";
import { authTokenSecret } from "../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";

describe("Autonomous Dental Agent ReAct Harness & Routes", () => {
	const testOrgId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
	let validClinicToken: string;

	beforeEach(() => {
		validClinicToken = signToken(
			{
				organizationId: testOrgId,
				role: "clinic",
			},
			authTokenSecret(),
			3600,
		);
	});

	// ─── 1. RUNTIMEMODE & DENTAL TOOLS TESTS ───────────────────────────────────

	it("1. Dental tools reflect runtimeMode: 13 tools in web_browser vs 18 in desktop_native", () => {
		const webTools = getDentalTools("web_browser");
		const desktopTools = getDentalTools("desktop_native");

		assert.equal(webTools.length, 13, "web_browser must have exactly 13 clinical + CRM tools");
		assert.equal(desktopTools.length, 18, "desktop_native must have 18 tools (13 clinical + 5 workstation hardware tools)");

		const webToolNames = webTools.map((t) => t.function.name);
		assert.ok(webToolNames.includes("calculate_anesthesia"));
		assert.ok(webToolNames.includes("check_somatic_risks_and_contraindications"));
		assert.ok(!webToolNames.includes("open_patient_dropzone_folder"));
		assert.ok(!webToolNames.includes("launch_workstation_app"));

		const desktopToolNames = desktopTools.map((t) => t.function.name);
		assert.ok(desktopToolNames.includes("open_patient_dropzone_folder"));
		assert.ok(desktopToolNames.includes("launch_workstation_app"));
		assert.ok(desktopToolNames.includes("capture_workstation_screen"));
	});

	it("2. Hardware workstation tools reject direct execution in web_browser runtime", async () => {
		const webRes = (await executeDentalTool(
			"open_patient_dropzone_folder",
			{ patientId: "11111111-2222-3333-4444-555555555555" },
			{ organizationId: testOrgId, runtimeMode: "web_browser" },
		)) as { success: boolean; availableInWeb: boolean; error: string };

		assert.equal(webRes.success, false);
		assert.equal(webRes.availableInWeb, false);
		assert.match(webRes.error, /локальной станции врача/);

		const nativeRes = (await executeDentalTool(
			"open_patient_dropzone_folder",
			{ patientId: "11111111-2222-3333-4444-555555555555" },
			{ organizationId: testOrgId, runtimeMode: "desktop_native" },
		)) as { success: boolean; dropzonePath: string };

		assert.equal(nativeRes.success, true);
		assert.ok(nativeRes.dropzonePath.length > 0);
	});

	it("3. calculate_anesthesia tool correctly calculates articaine dosage with cardiac risk limits", async () => {
		const normalCalc = (await executeDentalTool(
			"calculate_anesthesia",
			{
				patientWeightKg: 80,
				anestheticType: "articaine_1_200000",
			},
			{ organizationId: testOrgId },
		)) as any;

		assert.equal(normalCalc.safeToProceed, true);
		assert.equal(normalCalc.patientWeightKg, 80);
		assert.ok(normalCalc.absoluteMaxCarpules >= 6);

		const cardiacCalc = (await executeDentalTool(
			"calculate_anesthesia",
			{
				patientWeightKg: 80,
				anestheticType: "articaine_1_100000",
				hasCardiovascularRisk: true,
			},
			{ organizationId: testOrgId },
		)) as any;

		assert.equal(cardiacCalc.isCardiovascularRisk, true);
		assert.ok(cardiacCalc.warnings.length > 0, "Cardiac risk with 1:100 000 must emit warnings");
		assert.match(cardiacCalc.warnings[0], /гипертонического криза/);
	});

	it("4. System prompt adapts directives according to runtimeMode", () => {
		const webPrompt = buildAgentSystemPrompt("web_browser");
		const desktopPrompt = buildAgentSystemPrompt("desktop_native");

		assert.match(webPrompt, /WEB_BROWSER/);
		assert.match(desktopPrompt, /DESKTOP_NATIVE/);
		assert.match(desktopPrompt, /Antigravity Workstation Tools/);
	});

	// ─── 2. REACT HARNESS LOOP TESTS ──────────────────────────────────────────

	it("5. runAgentHarness executes complete ReAct turn: tool calling -> execution -> final answer", async () => {
		let callCount = 0;
		const events: AgentHarnessEvent[] = [];

		// Controlled Mock Client simulating DeepSeek Tool Calling turn
		const mockClient = {
			createChatCompletion: async (params: AgentRouterChatParams): Promise<AgentRouterChatResponse> => {
				callCount++;
				if (callCount === 1) {
					// Turn 1: Model decides to call calculate_anesthesia
					return {
						id: "test-call-1",
						object: "chat.completion",
						created: 1728000000,
						model: "deepseek-v4-flash",
						choices: [
							{
								index: 0,
								message: {
									role: "assistant",
									content: null,
									reasoning_content: "Пациент 85 кг, требуется расчет артикаина 1:200000.",
									tool_calls: [
										{
											id: "call_anesthesia_123",
											type: "function",
											function: {
												name: "calculate_anesthesia",
												arguments: JSON.stringify({
													patientWeightKg: 85,
													anestheticType: "articaine_1_200000",
												}),
											},
										},
									],
								},
								finish_reason: "tool_calls",
							},
						],
					};
				}

				// Turn 2: Model receives tool output and synthesizes final answer
				return {
					id: "test-call-2",
					object: "chat.completion",
					created: 1728000001,
					model: "deepseek-v4-flash",
					choices: [
						{
							index: 0,
							message: {
								role: "assistant",
								content: "Максимальная безопасная доза артикаина для пациента 85 кг составляет 7 карпул.",
								tool_calls: undefined,
							},
							finish_reason: "stop",
						},
					],
				};
			},
		} as unknown as AgentRouterClient;

		const result = await runAgentHarness({
			messages: [{ role: "user", content: "Посчитай артикаин для пациента 85 кг" }],
			context: { organizationId: testOrgId },
			client: mockClient,
			onEvent: (ev) => {
				events.push(ev);
			},
		});

		assert.equal(callCount, 2, "Must perform 2 calls to model");
		assert.equal(result.iterations, 2);
		assert.equal(result.toolCalls.length, 1);
		assert.equal(result.toolCalls[0].tool, "calculate_anesthesia");
		assert.match(result.text, /7 карпул/);

		// Verify event sequence: reasoning -> tool_start -> tool_end -> token -> done
		const eventTypes = events.map((e) => e.type);
		assert.ok(eventTypes.includes("reasoning"));
		assert.ok(eventTypes.includes("tool_start"));
		assert.ok(eventTypes.includes("tool_end"));
		assert.ok(eventTypes.includes("token"));
		assert.ok(eventTypes.includes("done"));
	});

	it("6. ReAct loop terminates safely when maxIterations limit is reached", async () => {
		// Mock client that infinitely returns tool calls
		const loopingClient = {
			createChatCompletion: async (): Promise<AgentRouterChatResponse> => ({
				id: "loop-call",
				object: "chat.completion",
				created: 1728000000,
				model: "deepseek-v4-flash",
				choices: [
					{
						index: 0,
						message: {
							role: "assistant",
							content: null,
							tool_calls: [
								{
									id: "call_inf",
									type: "function",
									function: {
										name: "generate_form_043",
										arguments: JSON.stringify({
											toothNumber: 36,
											icd10Diagnosis: "K02.1",
											anamnesisMorbi: "Жалобы на кратковременные боли от сладкого",
										}),
									},
								},
							],
						},
						finish_reason: "tool_calls",
					},
				],
			}),
		} as unknown as AgentRouterClient;

		const result = await runAgentHarness({
			messages: [{ role: "user", content: "Зацикленный запрос" }],
			context: { organizationId: testOrgId },
			client: loopingClient,
			maxIterations: 4, // Custom tight bound
		});

		assert.equal(result.iterations, 4, "Must stop strictly at maxIterations");
		assert.equal(result.toolCalls.length, 4);
		assert.match(result.text, /Достигнут предел клинических итераций/);
	});

	it("7. Network/API errors mask sensitive credentials and emit error event", async () => {
		const rawKey = "sk-6osQfoRXkSyFDuySQOAotuSU74uh75f4gGj69e2zqaVytT3u";
		const failingClient = {
			createChatCompletion: async () => {
				throw new Error(`Connection to AgentRouter failed with key ${rawKey}`);
			},
		} as unknown as AgentRouterClient;

		const capturedEvents: AgentHarnessEvent[] = [];

		await assert.rejects(
			async () => {
				await runAgentHarness({
					messages: [{ role: "user", content: "Тестовая ошибка" }],
					context: { organizationId: testOrgId },
					client: failingClient,
					onEvent: (ev) => capturedEvents.push(ev),
				});
			},
			(err: Error) => {
				// Secret must be masked!
				assert.ok(!err.message.includes(rawKey), "Raw API key must NOT leak in error message");
				assert.ok(err.message.includes("agentrouter...ytT3u"), "Masked key should be present");
				return true;
			},
		);

		const errorEvent = capturedEvents.find((e) => e.type === "error");
		assert.ok(errorEvent);
		assert.ok(!errorEvent.error.includes(rawKey));
	});

	// ─── 3. FASTIFY ROUTES ENDPOINT TESTS ─────────────────────────────────────

	it("8. GET /api/agent/tools requires clinic auth and returns tool schemas", async () => {
		const app = Fastify();
		await app.register(registerAgentRoutes);
		await app.ready();

		// Unauthenticated request -> 401
		const unauthRes = await app.inject({
			method: "GET",
			url: "/api/agent/tools",
		});
		assert.equal(unauthRes.statusCode, 401);

		// Authenticated request (web_browser)
		const authRes = await app.inject({
			method: "GET",
			url: "/api/agent/tools",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
			},
		});

		assert.equal(authRes.statusCode, 200);
		const json = authRes.json();
		assert.equal(json.count, 13);
		assert.equal(json.runtimeMode, "web_browser");

		// Authenticated request with x-agent-runtime: desktop_native
		const nativeRes = await app.inject({
			method: "GET",
			url: "/api/agent/tools",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				"x-agent-runtime": "desktop_native",
			},
		});

		assert.equal(nativeRes.statusCode, 200);
		const nativeJson = nativeRes.json();
		assert.equal(nativeJson.count, 18);
		assert.equal(nativeJson.runtimeMode, "desktop_native");

		await app.close();
	});

	it("9. POST /api/agent/chat validates request body structure (rejects empty messages)", async () => {
		const app = Fastify();
		await app.register(registerAgentRoutes);
		await app.ready();

		const res = await app.inject({
			method: "POST",
			url: "/api/agent/chat",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				"Content-Type": "application/json",
			},
			payload: {
				messages: [],
			},
		});

		assert.equal(res.statusCode, 400);
		const json = res.json();
		assert.equal(json.error, "ValidationError");

		await app.close();
	});

	it("10. POST /api/agent/chat stream mode sets SSE headers and streams events", async () => {
		const app = Fastify();
		await app.register(registerAgentRoutes);
		await app.ready();

		// Test SSE request
		const res = await app.inject({
			method: "POST",
			url: "/api/agent/chat",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				"Content-Type": "application/json",
			},
			payload: {
				messages: [{ role: "user", content: "Привет, какой сегодня день?" }],
				stream: true,
			},
		});

		assert.equal(res.statusCode, 200);
		assert.match(res.headers["content-type"] || "", /text\/event-stream/);
		// Output body contains event: data chunks
		assert.ok(res.body.length > 0);

		await app.close();
	});
});
