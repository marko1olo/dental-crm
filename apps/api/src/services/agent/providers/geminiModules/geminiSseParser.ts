/**
 * geminiSseParser.ts — SSE Parser and delta emitter for Google Gemini REST stream.
 */

import type { LlmStreamChunk } from "../../omniGatewayTypes.js";
import { parseSseStream } from "../../omniGatewayTypes.js";

export async function* parseGeminiSseChunks(
	body: ReadableStream<Uint8Array>,
	signal: AbortSignal,
	onEmitted?: () => void,
): AsyncIterable<LlmStreamChunk> {
	let toolCallIndex = 0;
	const sseStream = parseSseStream(body, signal);

	for await (const frame of sseStream) {
		let parsed: any;
		try {
			parsed = JSON.parse(frame.data);
		} catch {
			continue;
		}

		if (parsed.usageMetadata) {
			onEmitted?.();
			yield {
				type: "usage",
				inputTokens: parsed.usageMetadata.promptTokenCount ?? 0,
				outputTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
				totalTokens: parsed.usageMetadata.totalTokenCount,
			};
		}

		const candidateObj = parsed.candidates?.[0];
		if (!candidateObj) continue;

		const parts = candidateObj.content?.parts;
		if (Array.isArray(parts)) {
			for (const part of parts) {
				if (part.text) {
					onEmitted?.();
					yield {
						type: "text_delta",
						text: part.text,
					};
				}

				if (part.functionCall) {
					onEmitted?.();
					const callId = `gemini_call_${Date.now()}_${toolCallIndex}`;
					const fnName = part.functionCall.name;
					const fnArgs = part.functionCall.args ?? {};

					yield {
						type: "tool_call_start",
						id: callId,
						name: fnName,
						index: toolCallIndex,
					};

					yield {
						type: "tool_call_delta",
						id: callId,
						name: fnName,
						argumentsDelta: JSON.stringify(fnArgs),
						index: toolCallIndex,
					};

					yield {
						type: "tool_call_end",
						id: callId,
						name: fnName,
						arguments: fnArgs,
						index: toolCallIndex,
					};

					toolCallIndex++;
				}
			}
		}

		if (candidateObj.finishReason) {
			onEmitted?.();
			yield {
				type: "done",
				stopReason: candidateObj.finishReason.toLowerCase(),
			};
			return;
		}
	}
}
