/**
 * offlineQueueNetworkSync.ts — Обработчик сетевой синхронизации с Speech API Fastify
 */

import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import type { PendingTranscriptionRecord } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toCleanUuid(value?: string | null): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

function unwrapEnvelope<T>(json: unknown): T {
	if (json && typeof json === "object" && "data" in json && (json as Record<string, unknown>).data !== undefined) {
		return (json as Record<string, unknown>).data as T;
	}
	return json as T;
}

export async function executeDefaultSyncHandler(
	record: PendingTranscriptionRecord,
	syncEndpoint: string,
): Promise<{ success: boolean; text?: string; error?: string }> {
	if (typeof fetch === "undefined") {
		return { success: false, error: "fetch API is not available" };
	}

	const headers: Record<string, string> = denteClinicalMutationHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": generateUuidV7(),
	});

	if (record.audioBase64) {
		const visitId = toCleanUuid(record.context?.visitId);
		const patientId = toCleanUuid(record.context?.patientId);
		const organizationId = toCleanUuid(record.context?.organizationId);
		const payload = {
			recordingId: record.id,
			chunkIndex: 0,
			mimeType: "audio/wav" as const,
			audioBase64: record.audioBase64,
			durationMs: record.durationMs,
			source: visitId ? ("visit" as const) : ("document" as const),
			...(organizationId ? { organizationId } : {}),
			patientId,
			visitId,
			specialty: record.specialty || "therapy",
			language: "ru",
		};

		const response = await fetch(syncEndpoint, {
			method: "POST",
			credentials: "include",
			headers,
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			return {
				success: false,
				error: `Бэкенд вернул статус ${response.status}`,
			};
		}

		const rawJson: unknown = await response.json();
		const data = unwrapEnvelope<{ chunk?: { transcript?: string }; text?: string }>(rawJson);
		const textResult = data?.chunk?.transcript ?? data?.text ?? record.rawText;
		return {
			success: true,
			...(textResult ? { text: textResult } : {}),
		};
	}

	if (record.rawText && record.rawText.trim()) {
		const polishPayload = {
			transcript: record.rawText.trim(),
			specialty: record.specialty || "universal",
			source: "recording_chunk" as const,
		};

		try {
			const response = await fetch("/api/speech/polish-transcript", {
				method: "POST",
				credentials: "include",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify(polishPayload),
			});

			if (response.ok) {
				const rawJson: unknown = await response.json();
				const data = unwrapEnvelope<{ normalizedTranscript?: string; polishedTranscript?: string; text?: string }>(rawJson);
				return {
					success: true,
					text: data?.normalizedTranscript || data?.polishedTranscript || data?.text || record.rawText,
				};
			}
		} catch {
			// Если полировка недоступна, сохраняем исходный распознанный текст
		}

		return {
			success: true,
			text: record.rawText,
		};
	}

	return {
		success: true,
		text: record.rawText || "",
	};
}
