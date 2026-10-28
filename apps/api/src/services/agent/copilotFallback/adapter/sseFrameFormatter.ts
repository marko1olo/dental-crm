/**
 * sseFrameFormatter.ts — Server-Sent Events (SSE) Frame Serialization & Protocol Formatting.
 *
 * Formats stream events into HTTP standard SSE frames (data, event, id, retry, ping).
 */

import type { LLMStreamEvent } from "../../types.js";

/**
 * Serializes arbitrary data payload as an SSE data frame.
 */
export function formatSseData(data: unknown): string {
	const payload = typeof data === "string" ? data : JSON.stringify(data);
	return `data: ${payload}\n\n`;
}

/**
 * Serializes an SSE event with explicit event type and payload.
 */
export function formatSseEvent(
	event: string,
	data: unknown,
	id?: string,
): string {
	let frame = `event: ${event}\n`;
	if (id) {
		frame += `id: ${id}\n`;
	}
	const payload = typeof data === "string" ? data : JSON.stringify(data);
	frame += `data: ${payload}\n\n`;
	return frame;
}

/**
 * Returns an SSE keep-alive ping frame.
 */
export function formatSsePing(): string {
	return ": ping\n\n";
}

/**
 * Formats an SSE error frame.
 */
export function formatSseError(message: string, code = "STREAM_ERROR"): string {
	return formatSseEvent("error", {
		error: message,
		code,
		timestamp: new Date().toISOString(),
	});
}

/**
 * Formats standard LLMStreamEvent as an SSE data payload.
 */
export function formatStreamEventAsSse(event: LLMStreamEvent): string {
	return formatSseData(event);
}
