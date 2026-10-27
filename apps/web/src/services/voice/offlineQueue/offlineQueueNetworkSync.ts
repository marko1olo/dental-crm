/**
 * offlineQueueNetworkSync.ts — Обработчик сетевой синхронизации с Speech API Fastify
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { PendingTranscriptionRecord } from "./types";

export async function executeDefaultSyncHandler(
	record: PendingTranscriptionRecord,
	syncEndpoint: string,
): Promise<{ success: boolean; text?: string; error?: string }> {
	if (typeof fetch === "undefined") {
		return { success: false, error: "fetch API is not available" };
	}

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...denteAdminSecretRequestHeaders({}, record.context?.adminSecret ?? undefined),
	};

	if (record.audioBase64) {
		const payload = {
			recordingId: record.id,
			chunkIndex: 0,
			mimeType: "audio/wav",
			audioBase64: record.audioBase64,
			durationMs: record.durationMs,
			organizationId: record.context.organizationId || null,
			patientId: record.context.patientId || null,
			visitId: record.context.visitId || null,
			specialty: record.specialty || "therapy",
			language: "ru",
		};

		const response = await fetch(syncEndpoint, {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			return {
				success: false,
				error: `Бэкенд вернул статус ${response.status}`,
			};
		}

		const data = (await response.json()) as { text?: string };
		const textResult = data?.text || record.rawText;
		return {
			success: true,
			...(textResult ? { text: textResult } : {}),
		};
	}

	if (record.rawText && record.rawText.trim()) {
		const polishPayload = {
			transcript: record.rawText,
			specialty: record.specialty || "therapy",
			patientId: record.context.patientId || null,
			visitId: record.context.visitId || null,
			organizationId: record.context.organizationId || null,
		};

		try {
			const response = await fetch("/api/speech/polish-transcript", {
				method: "POST",
				headers,
				body: JSON.stringify(polishPayload),
			});

			if (response.ok) {
				const data = (await response.json()) as { polishedTranscript?: string };
				return {
					success: true,
					text: data?.polishedTranscript || record.rawText,
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
