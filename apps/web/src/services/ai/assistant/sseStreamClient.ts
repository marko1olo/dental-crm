/**
 * sseStreamClient.ts — HTTP клиент потокового SSE ответа ассистента
 */

import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";
import type {
	AssistantEventCallbacks,
	AssistantMessage,
	AssistantPhase,
	CompactionTriggeredData,
} from "./types";
import { processSseEventFrame } from "./sseEventProcessor";

export async function requestAssistantStream(
	apiBaseUrl: string,
	sessionId: string,
	promptWithContext: string,
	msg: AssistantMessage,
	signal: AbortSignal,
	setPhase: (phase: AssistantPhase) => void,
	callbacks: AssistantEventCallbacks,
	onCompaction: (stats: CompactionTriggeredData & { timestamp: number }) => void,
): Promise<boolean> {
	const token = readDenteClinicToken() || readDenteStaffToken() || "";

	const endpoints = [
		`${apiBaseUrl}/api/v1/copilot/chat`,
		`${apiBaseUrl}/api/v1/ai/stream`,
		`${apiBaseUrl}/api/v1/ai/chat`,
	];

	for (const url of endpoints) {
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "text/event-stream",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({
					conversationId: sessionId,
					sessionId,
					message: promptWithContext,
					prompt: promptWithContext,
				}),
				signal,
			});

			if (!response.ok || !response.body) continue;

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				let boundary = buffer.indexOf("\n\n");

				while (boundary >= 0) {
					const chunk = buffer.slice(0, boundary);
					buffer = buffer.slice(boundary + 2);

					let eventName = "message";
					let dataString = "";

					for (const line of chunk.split("\n")) {
						if (line.startsWith("event:")) {
							eventName = line.slice(6).trim();
						} else if (line.startsWith("data:")) {
							dataString += line.slice(5).trim();
						}
					}

					if (dataString) {
						try {
							const parsed = JSON.parse(dataString);
							await processSseEventFrame(eventName, parsed, msg, apiBaseUrl, setPhase, callbacks, onCompaction);
						} catch {
							await processSseEventFrame(eventName, { text: dataString }, msg, apiBaseUrl, setPhase, callbacks, onCompaction);
						}
					}

					boundary = buffer.indexOf("\n\n");
				}
			}

			return true;
		} catch (err: unknown) {
			if ((err as Error).name === "AbortError") return true;
		}
	}

	return false;
}
