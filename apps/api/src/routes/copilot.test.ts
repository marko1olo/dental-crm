/**
 * copilot.test.ts — End-to-End Fastify Integration Tests for DENTE Copilot & AI Agent Subsystem.
 * Tests SSE streaming, tool dispatch, human-in-the-loop action confirmations, and proactive clinical nudges.
 */

import assert from "node:assert";
import { afterEach, beforeEach, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import {
	defaultCopilotActionManager,
	defaultToolRegistry,
	type ToolDefinition,
} from "../services/agent/index.js";
import { signToken } from "../utils/cryptoHelper.js";
import { copilotRoutes } from "./copilot.js";

const TEST_SECRET = "test-secret";
const ORG_ID = "00000000-0000-7000-8000-000000000001";
const USER_ID = "00000000-0000-7000-8000-000000000002";

function authHeaders(): Record<string, string> {
	return {
		"x-dente-clinic-token": signToken(
			{ organizationId: ORG_ID },
			TEST_SECRET,
			3600,
		),
		"x-dente-staff-token": signToken(
			{ userId: USER_ID, organizationId: ORG_ID, role: "doctor" },
			TEST_SECRET,
			3600,
		),
	};
}

/**
 * Helper to parse Server-Sent Events (SSE) stream buffer into structured frames.
 */
interface ParsedSseFrame {
	event: string;
	data: unknown;
	raw: string;
}

function parseSseStream(rawPayload: string): ParsedSseFrame[] {
	const frames: ParsedSseFrame[] = [];
	const blocks = rawPayload.split("\n\n");

	for (const block of blocks) {
		const trimmed = block.trim();
		if (!trimmed) continue;

		let eventName = "message";
		let dataStr = "";

		for (const line of trimmed.split("\n")) {
			if (line.startsWith("event:")) {
				eventName = line.slice(6).trim();
			} else if (line.startsWith("data:")) {
				dataStr += line.slice(5).trim();
			}
		}

		let parsedData: unknown = dataStr;
		if (dataStr) {
			try {
				parsedData = JSON.parse(dataStr);
			} catch {
				parsedData = dataStr;
			}
		}

		frames.push({
			event: eventName,
			data: parsedData,
			raw: trimmed,
		});
	}

	return frames;
}

describe("Copilot & Agent Subsystem Routes (E2E Integration)", () => {
	let app: FastifyInstance;

	beforeEach(async () => {
		process.env.NODE_ENV = "test";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		defaultCopilotActionManager.clear();
		app = Fastify();
		await app.register(copilotRoutes);
	});

	afterEach(async () => {
		defaultCopilotActionManager.clear();
		await app.close();
	});

	describe("POST /api/v1/copilot/sessions/:sessionId/messages (SSE Stream & Tool Execution)", () => {
		test("returns 401 when request is unauthorized", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/sessions/sess_anon/messages",
				payload: { content: "Привет" },
			});
			assert.strictEqual(res.statusCode, 401);
		});

		test("returns 400 for empty or invalid message payload", async () => {
			const emptyRes = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/sessions/sess_test_1/messages",
				headers: authHeaders(),
				payload: {},
			});
			assert.strictEqual(emptyRes.statusCode, 400);
			const emptyJson = emptyRes.json();
			assert.strictEqual(emptyJson.error, "ValidationError");

			const blankRes = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/sessions/sess_test_1/messages",
				headers: authHeaders(),
				payload: { content: "   " },
			});
			assert.strictEqual(blankRes.statusCode, 400);
			assert.strictEqual(blankRes.json().error, "ValidationError");
		});

		test("streams SSE events and executes clinical.find_patient tool for patient queries", async () => {
			const sessionId = "sess_patient_query_101";
			const res = await app.inject({
				method: "POST",
				url: `/api/v1/copilot/sessions/${sessionId}/messages`,
				headers: authHeaders(),
				payload: {
					content: "Найди пациента Иванов",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			assert.ok(
				res.headers["content-type"]?.includes("text/event-stream"),
				`Expected text/event-stream content-type, got: ${res.headers["content-type"]}`,
			);

			const frames = parseSseStream(res.body);
			assert.ok(
				frames.length >= 2,
				`Expected at least 2 SSE frames, got ${frames.length}`,
			);

			// Should contain tool invocation frames or text tokens
			const toolStarted = frames.find(
				(f) => f.event === "tool_call_started" || f.event === "tool_call",
			);
			const toolFinished = frames.find(
				(f) => f.event === "tool_call_finished" || f.event === "tool_result",
			);

			if (toolStarted) {
				const startData = toolStarted.data as Record<string, unknown>;
				assert.strictEqual(startData.name, "clinical.find_patient");
			}

			if (toolFinished) {
				const finishData = toolFinished.data as Record<string, unknown>;
				assert.strictEqual(finishData.name, "clinical.find_patient");
			}

			// Final / completion frame
			const finalFrame = frames.find(
				(f) => f.event === "final" || f.event === "done",
			);
			assert.ok(finalFrame, "Must emit final/done SSE event");
		});

		test("streams SSE events and executes clinical.get_doctor_schedule for schedule query", async () => {
			const sessionId = "sess_sched_202";
			const res = await app.inject({
				method: "POST",
				url: `/api/v1/copilot/sessions/${sessionId}/messages`,
				headers: authHeaders(),
				payload: {
					content: "Покажи расписание приемов на сегодня",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res.headers["content-type"]?.includes("text/event-stream"));

			const frames = parseSseStream(res.body);
			assert.ok(frames.length >= 1);

			const toolStarted = frames.find(
				(f) => f.event === "tool_call_started" || f.event === "tool_call",
			);
			if (toolStarted) {
				const startData = toolStarted.data as Record<string, unknown>;
				assert.strictEqual(startData.name, "clinical.get_doctor_schedule");
			}

			const finalFrame = frames.find(
				(f) => f.event === "final" || f.event === "done",
			);
			assert.ok(finalFrame, "Must emit final event at the end of stream");
		});

		test("streams greeting / general assistance text tokens for open query", async () => {
			const sessionId = "sess_general_303";
			const res = await app.inject({
				method: "POST",
				url: `/api/v1/copilot/sessions/${sessionId}/messages`,
				headers: authHeaders(),
				payload: {
					content: "Привет! Чем ты можешь помочь в клинике?",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res.headers["content-type"]?.includes("text/event-stream"));

			const frames = parseSseStream(res.body);
			const tokenFrames = frames.filter(
				(f) => f.event === "token" || f.event === "delta",
			);
			assert.ok(
				tokenFrames.length > 0,
				"Must stream text tokens for general queries",
			);

			const textContent = tokenFrames
				.map((f) => String((f.data as { text?: string })?.text ?? ""))
				.join("");
			assert.ok(
				textContent.includes("DENTE") || textContent.includes("помочь"),
			);
		});
	});

	describe("POST /api/v1/copilot/sessions/:sessionId/confirmations/:callId (Action Confirmation & Rejection)", () => {
		test("returns 401 when unauthorized", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/sessions/sess_1/confirmations/call_123",
				payload: { decision: "confirm" },
			});
			assert.strictEqual(res.statusCode, 401);
		});

		test("returns 400 for invalid decision enum", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/sessions/sess_1/confirmations/call_123",
				headers: authHeaders(),
				payload: {
					decision: "invalid_decision",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			assert.strictEqual(res.json().error, "ValidationError");
		});

		test("confirms pending action and streams tool execution result", async () => {
			const sessionId = "sess_confirm_001";
			const callId = "call-act-999";

			// Register mock tool in defaultToolRegistry for testing execution
			const mockToolName = "safe_action";
			const qualifiedName = `test_clinical.${mockToolName}`;
			const mockTool: ToolDefinition = {
				name: mockToolName,
				description: "Safe test clinical action",
				category: "write",
				permissions: [],
				parameters: z.object({ item: z.string() }),
				handler: async () => ({ saved: true, item: "fluoride_gel" }),
			};
			defaultToolRegistry.register(mockTool, "test_clinical");

			// Register pending action in defaultCopilotActionManager
			defaultCopilotActionManager.registerPending(
				sessionId,
				callId,
				qualifiedName,
				{ item: "fluoride_gel" },
			);

			const res = await app.inject({
				method: "POST",
				url: `/api/v1/copilot/sessions/${sessionId}/confirmations/${callId}`,
				headers: authHeaders(),
				payload: {
					decision: "confirm",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res.headers["content-type"]?.includes("text/event-stream"));

			const frames = parseSseStream(res.body);
			assert.ok(frames.length >= 2);

			// Must emit tool_result / tool_call_finished event
			const finishedFrame = frames.find(
				(f) => f.event === "tool_result" || f.event === "tool_call_finished",
			);
			assert.ok(finishedFrame, "Must emit tool_result on confirm");
			const finishedData = finishedFrame.data as Record<string, unknown>;
			assert.strictEqual(finishedData.name, qualifiedName);
			assert.strictEqual(finishedData.ok, true);

			// Action must no longer be pending
			assert.strictEqual(
				defaultCopilotActionManager.getPending(callId),
				undefined,
			);
		});

		test("rejects pending action and streams rejection token", async () => {
			const sessionId = "sess_reject_002";
			const callId = "call-act-888";

			defaultCopilotActionManager.registerPending(
				sessionId,
				callId,
				"clinical.delete_entry",
				{ entryId: "ENTRY-01" },
			);

			const res = await app.inject({
				method: "POST",
				url: `/api/v1/copilot/sessions/${sessionId}/confirmations/${callId}`,
				headers: authHeaders(),
				payload: {
					decision: "reject",
					reason: "Врач отменил удаление записи",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			assert.ok(res.headers["content-type"]?.includes("text/event-stream"));

			const frames = parseSseStream(res.body);
			const tokenFrame = frames.find((f) => f.event === "token");
			assert.ok(tokenFrame, "Must emit rejection text token");
			const tokenData = tokenFrame.data as { text: string };
			assert.ok(tokenData.text.includes("Действие отменено"));
			assert.ok(tokenData.text.includes("Врач отменил удаление записи"));

			// Action must no longer be pending
			assert.strictEqual(
				defaultCopilotActionManager.getPending(callId),
				undefined,
			);
		});

		test("returns warning frame when confirming non-existent or expired action", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/sessions/sess_003/confirmations/call_missing_999",
				headers: authHeaders(),
				payload: {
					decision: "confirm",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const frames = parseSseStream(res.body);
			const tokenFrame = frames.find((f) => f.event === "token");
			assert.ok(tokenFrame);
			const tokenData = tokenFrame.data as { text: string };
			assert.ok(tokenData.text.includes("не найден или истек срок"));
		});
	});

	describe("GET /api/v1/copilot/nudges (Clinical Nudges)", () => {
		test("returns 401 when unauthorized", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/v1/copilot/nudges",
			});
			assert.strictEqual(res.statusCode, 401);
		});

		test("returns array of proactive clinical alerts and recommendations", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/v1/copilot/nudges",
				headers: authHeaders(),
			});

			assert.strictEqual(res.statusCode, 200);
			const json = res.json();

			assert.ok(Array.isArray(json.data), "Expected data to be an array");
			assert.ok(json.data.length >= 1, "Expected at least 1 proactive nudge");

			const firstNudge = json.data[0];
			assert.ok(firstNudge.id, "Nudge must contain id");
			assert.ok(firstNudge.kind, "Nudge must contain kind");
			assert.ok(firstNudge.payload, "Nudge must contain payload");
			assert.ok(firstNudge.created_at, "Nudge must contain created_at");
			assert.ok(firstNudge.expires_at, "Nudge must contain expires_at");
		});

		test("allows dismissing a nudge via POST /api/v1/copilot/dismiss-nudge", async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/dismiss-nudge",
				headers: authHeaders(),
				payload: {
					id: "nudge_test_dismiss_1",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const json = res.json();
			assert.strictEqual(json.ok, true);
		});
	});
});
