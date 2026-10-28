/**
 * tokenStreamEmitter.ts — LLM Stream Event Emitter & Async Generators.
 *
 * Produces structured LLMStreamEvents (text_delta, tool_use, done)
 * and provides chunk/character streaming for natural responsiveness.
 */

import type { LLMStreamEvent } from "../../types.js";

/**
 * Creates a text_delta stream event.
 */
export function emitTextDelta(text: string): LLMStreamEvent {
	return {
		type: "text_delta",
		text,
	};
}

/**
 * Creates a tool_use stream event.
 */
export function emitToolUse(
	name: string,
	input: Record<string, unknown>,
	idPrefix = "call",
): LLMStreamEvent {
	return {
		type: "tool_use",
		id: `${idPrefix}_${Date.now()}`,
		name,
		input,
	};
}

/**
 * Creates a stream termination event.
 */
export function emitDone(
	stopReason: "stop" | "tool_use" | "max_tokens" | "error" = "stop",
): LLMStreamEvent {
	return {
		type: "done",
		stopReason,
	};
}

/**
 * Streams characters one by one with a final done event.
 */
export async function* streamCharacters(
	text: string,
): AsyncIterable<LLMStreamEvent> {
	for (const char of text) {
		yield emitTextDelta(char);
	}
	yield emitDone("stop");
}

/**
 * Streams text in chunks of words for high-throughput responses.
 */
export async function* streamChunks(
	text: string,
	chunkWords = 3,
): AsyncIterable<LLMStreamEvent> {
	const words = text.split(" ");
	for (let i = 0; i < words.length; i += chunkWords) {
		const chunk = words.slice(i, i + chunkWords).join(" ");
		const isLast = i + chunkWords >= words.length;
		yield emitTextDelta(isLast ? chunk : `${chunk} `);
	}
	yield emitDone("stop");
}
