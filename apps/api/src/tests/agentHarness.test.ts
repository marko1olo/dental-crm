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
import { randomUUID } from "node:crypto";
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
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../security/identity.js";
import { signToken } from "../utils/cryptoHelper.js";

describe("Autonomous Dental Agent ReAct Harness & Routes", () => {
	const testOrgId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
	const testDoctorId = "01945000-0000-7000-8000-000000000099";
	let validClinicToken: string;
	let validStaffToken: string;

	beforeEach(() => {
		validClinicToken = signToken(
			{
				organizationId: testOrgId,
				role: "clinic",
			},
			authTokenSecret(),
			3600,
		);
		validStaffToken = signToken(
			{
				organizationId: testOrgId,
				userId: testDoctorId,
				role: "doctor",
			},
			authTokenSecret(),
			3600,
		);
	});

	// ─── 1. RUNTIMEMODE & DENTAL TOOLS TESTS ───────────────────────────────────

	it("1. Dental tools reflect runtimeMode: 18 tools in web_browser vs 33 in desktop_native", () => {
		const webTools = getDentalTools("web_browser");
		const desktopTools = getDentalTools("desktop_native");

		assert.equal(webTools.length, 18, "web_browser must have exactly 18 clinical + CRM tools");
		assert.equal(desktopTools.length, 33, "desktop_native must have 33 tools (18 clinical + 15 workstation hardware tools)");

		const webToolNames = webTools.map((t) => t.function.name);
		assert.ok(webToolNames.includes("calculate_anesthesia"));
		assert.ok(webToolNames.includes("record_treatment"));
		assert.ok(webToolNames.includes("get_available_slots"));
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

		const prevExe = process.env.IS_DESKTOP_EXE;
		process.env.IS_DESKTOP_EXE = "true";
		try {
			const nativeRes = (await executeDentalTool(
				"open_patient_dropzone_folder",
				{ patientId: "11111111-2222-3333-4444-555555555555" },
				{ organizationId: testOrgId, runtimeMode: "desktop_native" },
			)) as { success: boolean; dropzonePath: string };

			assert.equal(nativeRes.success, true);
			assert.ok(nativeRes.dropzonePath.length > 0);
		} finally {
			if (prevExe !== undefined) process.env.IS_DESKTOP_EXE = prevExe;
			else delete process.env.IS_DESKTOP_EXE;
		}
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
		assert.equal(result.toolCalls[0]?.tool, "calculate_anesthesia");
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
										name: "generate_clinical_protocol_entry",
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
					onEvent: (ev) => {
						capturedEvents.push(ev);
					},
				});
			},
			(err: Error) => {
				// Secret must be masked!
				assert.ok(!err.message.includes(rawKey), "Raw API key must NOT leak in error message");
				assert.ok(err.message.includes("sk-***tT3u") || err.message.includes("agentrouter...ytT3u"), "Masked key should be present");
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
		assert.equal(json.count, 18);
		assert.equal(json.runtimeMode, "web_browser");

		// Spoofed x-agent-runtime: desktop_native WITHOUT IS_DESKTOP_EXE/WORKSTATION_MODE must stay web_browser (P0-1)
		const prevDesktopExe = process.env.IS_DESKTOP_EXE;
		const prevWorkstation = process.env.WORKSTATION_MODE;
		delete process.env.IS_DESKTOP_EXE;
		delete process.env.WORKSTATION_MODE;
		try {
			const spoofRes = await app.inject({
				method: "GET",
				url: "/api/agent/tools",
				headers: {
					[CLINIC_TOKEN_HEADER]: validClinicToken,
					"x-agent-runtime": "desktop_native",
				},
			});
			assert.equal(spoofRes.statusCode, 200);
			const spoofJson = spoofRes.json();
			assert.equal(spoofJson.runtimeMode, "web_browser");
			assert.equal(spoofJson.count, 18);

			// Trusted workstation flag enables desktop_native on loopback IP
			process.env.IS_DESKTOP_EXE = "true";
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
			assert.equal(nativeJson.count, 33);
			assert.equal(nativeJson.runtimeMode, "desktop_native");
		} finally {
			if (prevDesktopExe !== undefined) process.env.IS_DESKTOP_EXE = prevDesktopExe;
			else delete process.env.IS_DESKTOP_EXE;
			if (prevWorkstation !== undefined) process.env.WORKSTATION_MODE = prevWorkstation;
			else delete process.env.WORKSTATION_MODE;
		}

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

	it("11. runAgentHarness sanitizes output: strips reasoning, AI fluff and transforms bureaucratic codes (Mandates 8x, 8ba, T.A.R.S.)", async () => {
		const fluffClient = {
			createChatCompletion: async () => ({
				id: "chatcmpl-fluff",
				object: "chat.completion",
				created: Date.now(),
				model: "gemini-3.6-flash",
				choices: [
					{
						index: 0,
						message: {
							role: "assistant",
							content: "<think>Внутренние рассуждения модели...</think>Конечно! Рад помочь! Согласно форме 043/у и номенклатуре 804н данные внесены, чек проведен по 54-ФЗ.",
						},
						finish_reason: "stop",
					},
				],
			}),
		} as unknown as AgentRouterClient;

		const result = await runAgentHarness({
			messages: [{ role: "user", content: "Оформи приём" }],
			context: { organizationId: testOrgId },
			client: fluffClient,
		});

		assert.ok(!result.text.includes("<think>"), "Must strip thinking tags");
		assert.ok(!result.text.includes("Конечно!"), "Must eliminate AI fluff");
		assert.ok(!result.text.includes("Рад помочь!"), "Must eliminate AI fluff");
		assert.ok(!result.text.includes("043/у"), "Must replace Soviet code 043/у");
		assert.ok(!result.text.includes("804н"), "Must replace bureaucratic code 804н");
		assert.ok(!result.text.includes("54-ФЗ"), "Must replace bureaucratic code 54-ФЗ");
		assert.ok(result.text.includes("Медицинская карта приёма"), "Must use clean clinical terms");
		assert.ok(result.text.includes("Прейскурант услуг"), "Must use clean clinical terms");
		assert.ok(result.text.includes("Касса"), "Must use clean clinical terms");
	});

	it("12. POST /api/agent/chat auto-generates sessionId when omitted & /api/agent/action accepts nullish patientId/visitId", async () => {
		const app = Fastify();
		await app.register(registerAgentRoutes);
		await app.ready();

		const jsonChatRes = await app.inject({
			method: "POST",
			url: "/api/agent/chat",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				"Content-Type": "application/json",
			},
			payload: {
				messages: [{ role: "user", content: "Какой статус расписания?" }],
				stream: false,
				fallbackToDeterministicAgent: true,
			},
		});
		assert.equal(jsonChatRes.statusCode, 200);
		const chatBody = jsonChatRes.json() as { sessionId?: string };
		assert.match(
			chatBody.sessionId ?? "",
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			"JSON /api/agent/chat must return auto-generated UUID sessionId",
		);

		const sseRes = await app.inject({
			method: "POST",
			url: "/api/agent/chat",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				"Content-Type": "application/json",
			},
			payload: {
				messages: [{ role: "user", content: "Краткий статус" }],
				stream: true,
				fallbackToDeterministicAgent: true,
			},
		});
		assert.equal(sseRes.statusCode, 200);
		assert.match(sseRes.body, /"sessionId":"[0-9a-f-]{36}"/i, "SSE events must include auto-generated sessionId");

		const actionRes = await app.inject({
			method: "POST",
			url: "/api/agent/action",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				"Content-Type": "application/json",
			},
			payload: {
				tool: "patient_search",
				args: { query: "Иванов" },
				patientId: null,
				visitId: null,
			},
		});
		assert.notEqual(actionRes.statusCode, 400, "patientId: null and visitId: null must be accepted by .nullish()");

		await app.close();
	});

	it("13. /api/agent/action enforces 403 ConfirmationRequired without confirmed=true and /api/agent/settings validates custom provider + SSRF", async () => {
		const app = Fastify();
		await app.register(registerAgentRoutes);
		await app.ready();

		const unconfirmedActionRes = await app.inject({
			method: "POST",
			url: "/api/agent/action",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				[STAFF_TOKEN_HEADER]: validStaffToken,
				"Content-Type": "application/json",
			},
			payload: {
				toolName: "update_tooth_status",
				args: { patientId: "01945000-0000-7000-8000-000000000001", toothNumber: 16, status: "caries" },
			},
		});
		assert.equal(unconfirmedActionRes.statusCode, 403);
		assert.equal((unconfirmedActionRes.json() as { error?: string }).error, "ConfirmationRequired");

		const confirmedActionRes = await app.inject({
			method: "POST",
			url: "/api/agent/action",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				[STAFF_TOKEN_HEADER]: validStaffToken,
				"Content-Type": "application/json",
			},
			payload: {
				toolName: "update_tooth_status",
				args: { patientId: "01945000-0000-7000-8000-000000000001", toothNumber: 16, status: "caries" },
				confirmed: true,
			},
		});
		assert.notEqual(confirmedActionRes.statusCode, 403, "confirmed=true must pass confirmation gate");

		const ssrfRes = await app.inject({
			method: "PUT",
			url: "/api/agent/settings",
			headers: {
				[CLINIC_TOKEN_HEADER]: validClinicToken,
				[STAFF_TOKEN_HEADER]: validStaffToken,
				"Content-Type": "application/json",
				"Idempotency-Key": randomUUID(),
			},
			payload: {
				settings: {
					byokProvider: "custom",
					byokBaseUrl: "http://127.0.0.1:8080/v1",
					pinnedThreadIds: ["01945000-0000-7000-8000-000000000111"],
				},
			},
		});
		assert.equal(ssrfRes.statusCode, 400, "byokProvider=custom & pinnedThreadIds pass Zod, SSRF URL fails with 400");

		await app.close();
	});

	it("14. P0-1 & P0-3: blocks desktop_native tool execution via header/body spoof without IS_DESKTOP_EXE and accepts chairside payload", async () => {
		const prevExe = process.env.IS_DESKTOP_EXE;
		const prevWs = process.env.WORKSTATION_MODE;
		delete process.env.IS_DESKTOP_EXE;
		delete process.env.WORKSTATION_MODE;

		const app = Fastify();
		await app.register(registerAgentRoutes);
		await app.ready();

		try {
			const spoofedDesktopAction = await app.inject({
				method: "POST",
				url: "/api/agent/action",
				headers: {
					[CLINIC_TOKEN_HEADER]: validClinicToken,
					[STAFF_TOKEN_HEADER]: validStaffToken,
					"x-agent-runtime": "desktop_native",
					"Content-Type": "application/json",
					"Idempotency-Key": randomUUID(),
				},
				payload: {
					toolName: "capture_workstation_screen",
					args: { roi: "full" },
					runtimeMode: "desktop_native",
					confirmed: true,
				},
			});
			assert.equal(spoofedDesktopAction.statusCode, 403, "Spoofed desktop_native must return 403 without IS_DESKTOP_EXE");

			const chairsideChatRes = await app.inject({
				method: "POST",
				url: "/api/agent/chat",
				headers: {
					[CLINIC_TOKEN_HEADER]: validClinicToken,
					[STAFF_TOKEN_HEADER]: validStaffToken,
					"Content-Type": "application/json",
					"Idempotency-Key": randomUUID(),
				},
				payload: {
					messages: [{ role: "user", content: "Составь краткий план по зубу 36" }],
					patientId: "01945000-0000-7000-8000-000000000001",
					activeTooth: 36,
					allergies: ["Лидокаин"],
					somaticHistory: "ИБС",
					stream: false,
					fallbackToDeterministicAgent: true,
				},
			});
			assert.equal(chairsideChatRes.statusCode, 200, "Chairside JSON payload with activeTooth must pass .strict()");
			const body = chairsideChatRes.json() as { text?: string; runtimeMode?: string };
			assert.equal(typeof body.text, "string");
			assert.ok((body.text?.length ?? 0) > 0);
			assert.equal(body.runtimeMode, "web_browser");
		} finally {
			if (prevExe !== undefined) process.env.IS_DESKTOP_EXE = prevExe;
			else delete process.env.IS_DESKTOP_EXE;
			if (prevWs !== undefined) process.env.WORKSTATION_MODE = prevWs;
			else delete process.env.WORKSTATION_MODE;
			await app.close();
		}
	});
});
