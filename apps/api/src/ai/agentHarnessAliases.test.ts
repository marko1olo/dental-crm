/**
 * agentHarnessAliases.test.ts — Verification of Universal Workstation Aliases in DENTE Agent Harness.
 *
 * Verifies that universal tool names (write_file, read_file, search_files, run_command)
 * resolve seamlessly to underlying desktop_native implementations when allowLocalExecution is enabled.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runAgentHarness } from "./agentHarness.js";
import type {
	AgentRouterChatParams,
	AgentRouterChatResponse,
	AgentRouterClient,
	AgentRouterStreamCallbacks,
} from "./agentRouterClient.js";
import type { DentalToolContext } from "./dentalTools.js";

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
			if (!resp) throw new Error(`Mock client exhausted responses at turn ${turn}`);
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
			if (!resp) throw new Error(`Mock client exhausted responses at turn ${turn}`);
			turn++;

			const msg = resp.choices[0]?.message;
			if (msg?.content) {
				callbacks?.onChunk?.(msg.content);
			}
			callbacks?.onComplete?.(resp);
			return resp;
		},
	};

	return mock as AgentRouterClient;
}

test("runAgentHarness: Universal workstation aliases (write_file, read_file, search_files, run_command) resolve in desktop_native mode", async () => {
	const desktopContext: DentalToolContext = {
		organizationId: "11111111-1111-1111-1111-111111111111",
		patientId: "22222222-2222-2222-2222-222222222222",
		runtimeMode: "desktop_native",
		allowLocalExecution: true,
	};

	const testDir = path.resolve(os.tmpdir(), `dente_test_alias_dir_${Date.now()}`);
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
			model: "gemini-2.5-flash",
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
			model: "gemini-2.5-flash",
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
			model: "gemini-2.5-flash",
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
			model: "gemini-2.5-flash",
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
			model: "gemini-2.5-flash",
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
