/**
 * workstationToolsAndAgentRouter.test.ts — Comprehensive Test Suite for
 * 1. Workstation Tools (launch_workstation_app, open_patient_dropzone_folder, capture_workstation_screen)
 *    and their Cloud Guard invariants.
 * 2. Wiring of DeepSeekProviderAdapter to AgentRouterClient with deepseek-v4-flash.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import {
	createDefaultToolRegistry,
	defaultToolRegistry,
} from "../services/agent/tools/registry.js";
import {
	CLOUD_GUARD_DENIAL,
	captureWorkstationScreenTool,
	isCloudEnvironment,
	launchWorkstationAppTool,
	openPatientDropzoneFolderTool,
} from "../services/agent/tools/workstationTools.js";
import { DeepSeekProviderAdapter } from "../services/agent/providers/deepseek.js";
import { OmniLlmGateway } from "../services/agent/omniGateway.js";
import { createDefaultLlmProvider } from "../services/agent/copilotService.js";
import type { AgentContext } from "../services/agent/context.js";
import type { LlmStreamChunk } from "../services/agent/omniGatewayTypes.js";

const mockContext: AgentContext = {
	organizationId: "org_00000000-0000-7000-8000-000000000001",
	clinicId: "clinic_00000000-0000-7000-8000-000000000001",
	userId: "user_00000000-0000-7000-8000-000000000001",
	sessionId: "sess_test_workstation",
	mode: "supervised",
	role: "doctor",
	permissions: ["clinical.read", "clinical.write", "patients.read"],
	tools: defaultToolRegistry,
	db: null,
};

describe("1. Workstation Tools & Cloud Guard Suite", () => {
	test("workstation tools are registered in defaultToolRegistry", () => {
		const registry = createDefaultToolRegistry();
		const list = registry.list();

		assert.ok(
			list.includes("workstation.launch_workstation_app"),
			"Should contain workstation.launch_workstation_app",
		);
		assert.ok(
			list.includes("workstation.open_patient_dropzone_folder"),
			"Should contain workstation.open_patient_dropzone_folder",
		);
		assert.ok(
			list.includes("workstation.capture_workstation_screen"),
			"Should contain workstation.capture_workstation_screen",
		);

		// Short name lookups should also resolve
		assert.ok(
			registry.get("launch_workstation_app"),
			"Short name lookup for launch_workstation_app should succeed",
		);
		assert.ok(
			registry.get("open_patient_dropzone_folder"),
			"Short name lookup for open_patient_dropzone_folder should succeed",
		);
		assert.ok(
			registry.get("capture_workstation_screen"),
			"Short name lookup for capture_workstation_screen should succeed",
		);
	});

	test("Cloud Guard rejects workstation execution when CLOUD_ENV is true", async () => {
		const origEnv = process.env.CLOUD_ENV;
		try {
			process.env.CLOUD_ENV = "true";

			assert.strictEqual(isCloudEnvironment(), true);

			// 1. launch_workstation_app
			const launchRes = await launchWorkstationAppTool.handler(mockContext, {
				appType: "vatech_ezdent",
			});
			assert.deepStrictEqual(launchRes, CLOUD_GUARD_DENIAL);

			// 2. open_patient_dropzone_folder
			const dropzoneRes = await openPatientDropzoneFolderTool.handler(
				mockContext,
				{
					patientId: "00000000-0000-7000-8000-000000000001",
					patientName: "Иванов Иван",
				},
			);
			assert.deepStrictEqual(dropzoneRes, CLOUD_GUARD_DENIAL);

			// 3. capture_workstation_screen
			const screenRes = await captureWorkstationScreenTool.handler(
				mockContext,
				{
					diagnosticReason: "Проверка визиографа",
				},
			);
			assert.deepStrictEqual(screenRes, CLOUD_GUARD_DENIAL);
		} finally {
			if (origEnv !== undefined) {
				process.env.CLOUD_ENV = origEnv;
			} else {
				delete process.env.CLOUD_ENV;
			}
		}
	});

	test("launch_workstation_app handles explorer_custom safely", async () => {
		const origEnv = process.env.CLOUD_ENV;
		try {
			delete process.env.CLOUD_ENV;

			if (process.platform === "win32") {
				const res = await launchWorkstationAppTool.handler(mockContext, {
					appType: "explorer_custom",
					targetPatientFolder: process.cwd(),
				});
				assert.strictEqual(res.success, true);
				assert.strictEqual(res.appType, "explorer_custom");
			} else {
				// On non-Windows OS, Cloud Guard triggers
				const res = await launchWorkstationAppTool.handler(mockContext, {
					appType: "explorer_custom",
				});
				assert.strictEqual(res.success, false);
				assert.strictEqual(
					res.reason,
					"cloud_environment_no_direct_hardware_access",
				);
			}
		} finally {
			if (origEnv !== undefined) process.env.CLOUD_ENV = origEnv;
		}
	});
});

describe("2. DeepSeekProviderAdapter & AgentRouter Integration Suite", () => {
	test("DeepSeekProviderAdapter includes deepseek-v4-flash in supported models", () => {
		const adapter = new DeepSeekProviderAdapter();
		assert.ok(adapter.supportedModels.includes("deepseek-v4-flash"));
	});

	test("DeepSeekProviderAdapter streams via AgentRouter with reasoning deltas and tool calls", async () => {
		const adapter = new DeepSeekProviderAdapter();

		const sseChunks = [
			'data: {"id":"chatcmpl-test","choices":[{"delta":{"reasoning_content":"Анализирую дозировку артикаина..."}}]}\n\n',
			'data: {"choices":[{"delta":{"content":"Рекомендую 1 карпулу Убистезина."}}]}\n\n',
			'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_123","function":{"name":"calculate_anesthesia","arguments":"{\\"patientWeightKg\\":70}"}}]}}]}\n\n',
			'data: {"choices":[{"finish_reason":"stop"}],"usage":{"prompt_tokens":30,"completion_tokens":25,"total_tokens":55}}\n\n',
			"data: [DONE]\n\n",
		];

		const mockFetch: typeof fetch = async (url, init) => {
			const headers = (init?.headers ?? {}) as Record<string, string>;
			// Check User-Agent requirement
			assert.strictEqual(
				headers["User-Agent"],
				"opencode/1.18.25",
				"Must include User-Agent: opencode/1.18.25 header",
			);
			assert.ok(
				String(url).includes("agentrouter.org"),
				"Must route to agentrouter.org",
			);

			const encoder = new TextEncoder();
			const stream = new ReadableStream({
				start(controller) {
					for (const chunk of sseChunks) {
						controller.enqueue(encoder.encode(chunk));
					}
					controller.close();
				},
			});

			return new Response(stream, {
				status: 200,
				headers: { "Content-Type": "text/event-stream" },
			});
		};

		const origKeys = process.env.AGENTROUTER_API_KEYS;
		try {
			process.env.AGENTROUTER_API_KEYS = "sk-test-key-1,sk-test-key-2";

			const chunks: LlmStreamChunk[] = [];
			for await (const chunk of adapter.chatStream(
				[{ role: "user", content: "Какая дозировка анестезии?" }],
				[
					{
						name: "calculate_anesthesia",
						description: "Расчет дозировки",
						parameters: { type: "object", properties: {} },
					},
				],
				{
					fetchFn: mockFetch,
				},
			)) {
				chunks.push(chunk);
			}

			// Verify reasoning chunk
			const reasoning = chunks.find((c) => c.type === "thinking_delta");
			assert.ok(reasoning && reasoning.type === "thinking_delta");
			assert.strictEqual(reasoning.text, "Анализирую дозировку артикаина...");

			// Verify text chunk
			const text = chunks.find((c) => c.type === "text_delta");
			assert.ok(text && text.type === "text_delta");
			assert.strictEqual(text.text, "Рекомендую 1 карпулу Убистезина.");

			// Verify tool call
			const toolEnd = chunks.find((c) => c.type === "tool_call_end");
			assert.ok(toolEnd && toolEnd.type === "tool_call_end");
			assert.strictEqual(toolEnd.name, "calculate_anesthesia");
			assert.deepStrictEqual(toolEnd.arguments, { patientWeightKg: 70 });

			// Verify done
			const done = chunks.find((c) => c.type === "done");
			assert.ok(done && done.type === "done");
		} finally {
			if (origKeys !== undefined) {
				process.env.AGENTROUTER_API_KEYS = origKeys;
			} else {
				delete process.env.AGENTROUTER_API_KEYS;
			}
		}
	});

	test("OmniLlmGateway prioritizes deepseek when AGENTROUTER_API_KEYS is configured", () => {
		const origKeys = process.env.AGENTROUTER_API_KEYS;
		try {
			process.env.AGENTROUTER_API_KEYS = "sk-test-key";
			const gateway = new OmniLlmGateway();
			const chain = gateway.resolveFallbackChain({});

			assert.strictEqual(
				chain[0],
				"deepseek",
				"DeepSeek must be prioritized first in fallback chain",
			);
		} finally {
			if (origKeys !== undefined) {
				process.env.AGENTROUTER_API_KEYS = origKeys;
			} else {
				delete process.env.AGENTROUTER_API_KEYS;
			}
		}
	});

	test("createDefaultLlmProvider initializes with deepseek-v4-flash when AGENTROUTER_API_KEYS is present", () => {
		const origKeys = process.env.AGENTROUTER_API_KEYS;
		try {
			process.env.AGENTROUTER_API_KEYS = "sk-test-key";
			const provider = createDefaultLlmProvider();
			assert.ok(provider, "Should create provider successfully");
			assert.strictEqual(typeof provider.complete, "function");
		} finally {
			if (origKeys !== undefined) {
				process.env.AGENTROUTER_API_KEYS = origKeys;
			} else {
				delete process.env.AGENTROUTER_API_KEYS;
			}
		}
	});
});
