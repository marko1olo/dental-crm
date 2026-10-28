/**
 * deepseekSseParser.ts — SSE Parser and stream delta generator for direct DeepSeek API calls.
 */

import type { LlmStreamChunk } from "../../omniGatewayTypes.js";
import { parseSseStream } from "../../omniGatewayTypes.js";

export interface PendingToolCall {
	id: string;
	name: string;
	args: string;
	started: boolean;
}

export async function* parseDeepSeekSseChunks(
	body: ReadableStream<Uint8Array>,
	signal: AbortSignal,
	onEmitted?: () => void,
): AsyncIterable<LlmStreamChunk> {
	const pendingToolCalls = new Map<number, PendingToolCall>();
	const sseStream = parseSseStream(body, signal);

	for await (const frame of sseStream) {
		if (frame.data === "[DONE]") {
			for (const [index, tc] of pendingToolCalls.entries()) {
				let parsedArgs: Record<string, unknown> | string = {};
				try {
					parsedArgs = JSON.parse(tc.args || "{}");
				} catch {
					parsedArgs = tc.args;
				}
				onEmitted?.();
				yield {
					type: "tool_call_end",
					id: tc.id || `call_${index}`,
					name: tc.name,
					arguments: parsedArgs,
					index,
				};
			}
			pendingToolCalls.clear();
			onEmitted?.();
			yield { type: "done", stopReason: "stop" };
			return;
		}

		let parsed: any;
		try {
			parsed = JSON.parse(frame.data);
		} catch {
			continue;
		}

		if (parsed.usage) {
			onEmitted?.();
			yield {
				type: "usage",
				inputTokens: parsed.usage.prompt_tokens ?? 0,
				outputTokens: parsed.usage.completion_tokens ?? 0,
				totalTokens: parsed.usage.total_tokens,
			};
		}

		const choice = parsed.choices?.[0];
		if (!choice) continue;

		const delta = choice.delta;
		if (delta) {
			// DeepSeek R1 reasoning_content thinking streaming
			if (delta.reasoning_content) {
				onEmitted?.();
				yield {
					type: "thinking_delta",
					text: delta.reasoning_content,
				};
			}

			if (delta.content) {
				onEmitted?.();
				yield {
					type: "text_delta",
					text: delta.content,
				};
			}

			if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
				for (const tc of delta.tool_calls) {
					const index = tc.index ?? 0;
					const existing = pendingToolCalls.get(index) ?? {
						id: "",
						name: "",
						args: "",
						started: false,
					};

					if (tc.id) existing.id = tc.id;
					if (tc.function?.name) existing.name = tc.function.name;

					if (!existing.started && (existing.id || existing.name)) {
						existing.started = true;
						onEmitted?.();
						yield {
							type: "tool_call_start",
							id: existing.id || `call_${index}`,
							name: existing.name,
							index,
						};
					}

					if (tc.function?.arguments) {
						existing.args += tc.function.arguments;
						onEmitted?.();
						yield {
							type: "tool_call_delta",
							id: existing.id,
							name: existing.name,
							argumentsDelta: tc.function.arguments,
							index,
						};
					}

					pendingToolCalls.set(index, existing);
				}
			}
		}

		if (choice.finish_reason) {
			for (const [index, tc] of pendingToolCalls.entries()) {
				let parsedArgs: Record<string, unknown> | string = {};
				try {
					parsedArgs = JSON.parse(tc.args || "{}");
				} catch {
					parsedArgs = tc.args;
				}
				onEmitted?.();
				yield {
					type: "tool_call_end",
					id: tc.id || `call_${index}`,
					name: tc.name,
					arguments: parsedArgs,
					index,
				};
			}
			pendingToolCalls.clear();
			onEmitted?.();
			yield {
				type: "done",
				stopReason: choice.finish_reason,
			};
			return;
		}
	}
}
