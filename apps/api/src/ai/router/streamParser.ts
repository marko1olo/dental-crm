/**
 * streamParser.ts — Server-Sent Events (SSE) Stream Reader & Tool-Call Accumulator
 */

import type {
	AgentRouterChatResponse,
	AgentRouterStreamCallbacks,
	AgentRouterToolCall,
} from "./routerTypes.js";

/**
 * Reads and accumulates Server-Sent Events (SSE) stream from response body.
 */
export async function readSseStream(
	body: ReadableStream<Uint8Array>,
	targetModel: string,
	callbacks: AgentRouterStreamCallbacks,
): Promise<AgentRouterChatResponse> {
	const reader = body.getReader();
	const decoder = new TextDecoder("utf-8");

	let buffer = "";
	let responseId = `agentrouter-${Date.now()}`;
	let createdTime = Math.floor(Date.now() / 1000);
	let responseModel = targetModel;
	let finishReason: string | null = null;
	let fullContent = "";
	let fullReasoning = "";

	// Tool calls accumulator indexed by tool call index
	const toolCallsMap = new Map<
		number,
		{
			id: string;
			name: string;
			arguments: string;
		}
	>();

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const rawLine of lines) {
				const line = rawLine.trim();
				if (!line || line.startsWith(":")) continue; // comment or empty
				if (!line.startsWith("data:")) continue;

				const dataStr = line.slice(5).trim();
				if (dataStr === "[DONE]") {
					break;
				}

				let parsedChunk: any;
				try {
					parsedChunk = JSON.parse(dataStr);
				} catch {
					// Incomplete or malformed JSON in SSE chunk, ignore
					continue;
				}

				if (!parsedChunk || typeof parsedChunk !== "object") {
					continue;
				}

				if (parsedChunk.id) responseId = parsedChunk.id;
				if (parsedChunk.created) createdTime = parsedChunk.created;
				if (parsedChunk.model) responseModel = parsedChunk.model;

				const choice = parsedChunk.choices?.[0];
				if (!choice) continue;

				if (choice.finish_reason) {
					finishReason = choice.finish_reason;
				}

				const delta = choice.delta;
				if (!delta) continue;

				// 1. Text content delta
				if (delta.content) {
					fullContent += delta.content;
					callbacks.onChunk?.(delta.content);
				}

				// 2. DeepSeek reasoning content delta
				if (delta.reasoning_content) {
					fullReasoning += delta.reasoning_content;
					callbacks.onReasoningChunk?.(delta.reasoning_content);
				}

				// 3. Tool call deltas
				if (Array.isArray(delta.tool_calls)) {
					for (const tcDelta of delta.tool_calls) {
						const idx = tcDelta.index ?? 0;
						let current = toolCallsMap.get(idx);
						if (!current) {
							current = {
								id: tcDelta.id || `call_${idx}_${Date.now()}`,
								name: "",
								arguments: "",
							};
							toolCallsMap.set(idx, current);
						}

						if (tcDelta.id) {
							current.id = tcDelta.id;
						}
						if (tcDelta.function?.name) {
							current.name += tcDelta.function.name;
						}
						if (tcDelta.function?.arguments) {
							current.arguments += tcDelta.function.arguments;
						}

						callbacks.onToolCallDelta?.({
							index: idx,
							id: tcDelta.id,
							type: "function",
							function: tcDelta.function,
						});
					}
				}
			}
		}
	} finally {
		reader.releaseLock();
	}

	const aggregatedToolCalls: AgentRouterToolCall[] = Array.from(
		toolCallsMap.entries(),
	)
		.sort(([a], [b]) => a - b)
		.map(([, tc]) => ({
			id: tc.id,
			type: "function" as const,
			function: {
				name: tc.name,
				arguments: tc.arguments,
			},
		}));

	return {
		id: responseId,
		object: "chat.completion",
		created: createdTime,
		model: responseModel,
		choices: [
			{
				index: 0,
				message: {
					role: "assistant",
					content: fullContent.length > 0 ? fullContent : null,
					tool_calls:
						aggregatedToolCalls.length > 0 ? aggregatedToolCalls : undefined,
					reasoning_content:
						fullReasoning.length > 0 ? fullReasoning : undefined,
				},
				finish_reason: finishReason || "stop",
			},
		],
	};
}
