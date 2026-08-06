import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import { pool } from "../../db/client.js";
import {
	ensureSpeechTranscriptionChunksRestored,
	listSpeechTranscriptionChunks,
	recordSpeechTranscriptionChunk,
	resetSpeechTranscriptionCacheForRestart,
	speechDurableRestoreState,
} from "../storage.js";

/**
 * Граница отказа PostgreSQL для расшифровок диктовки.
 *
 * База «падает» закрытием пула этого процесса: дальше любой запрос отвечает
 * ошибкой, как при недоступной базе, а общий dev-сервер и служба postgres при
 * этом не трогаются. Ревьюер пакета C4 требовал выполнить этот путь, а не
 * описать его словами.
 */

type SpeechChunkInput = Omit<
	SpeechTranscriptionChunk,
	"id" | "organizationId" | "createdAt"
>;

const offlineText =
	"Диктовка при недоступной базе: зуб 36, перкуссия отрицательная.";

function buildOfflineChunkInput(recordingId: string): SpeechChunkInput {
	return {
		recordingId,
		chunkIndex: 0,
		source: "visit",
		patientId: randomUUID(),
		visitId: randomUUID(),
		providerId: "none",
		providerLabel: "Локальный текст браузера",
		mimeType: "audio/webm",
		byteLength: 1024,
		durationMs: 3000,
		language: "ru",
		transcript: offlineText,
		confidence: null,
		status: "fallback_text",
		quality: {
			level: "review",
			confidence: null,
			wordCount: 9,
			charCount: offlineText.length,
			durationMs: 3000,
			bytesPerSecond: 341,
			providerWarnings: [],
			signals: ["unit_test"],
			nextAction: "Проверьте текст перед подписанием приема.",
		},
		warnings: [],
		clientRecordedAt: new Date().toISOString(),
	};
}

async function withEnv(
	values: Record<string, string>,
	run: () => Promise<void>,
): Promise<void> {
	const previous = new Map<string, string | undefined>();
	for (const [key, value] of Object.entries(values)) {
		previous.set(key, process.env[key]);
		process.env[key] = value;
	}
	try {
		await run();
	} finally {
		for (const [key, value] of previous) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
}

before(async () => {
	await pool.end();
});

after(() => {
	resetSpeechTranscriptionCacheForRestart();
});

describe("расшифровки диктовки при недоступной PostgreSQL", () => {
	it("провал восстановления не запоминается навсегда: следующая проверка пробует снова", async () => {
		await withEnv({ DENTAL_SPEECH_RESTORE_RETRY_MS: "1" }, async () => {
			resetSpeechTranscriptionCacheForRestart();

			await ensureSpeechTranscriptionChunksRestored();
			const first = speechDurableRestoreState();
			assert.strictEqual(
				first.failedAttempts,
				1,
				"первая попытка восстановления должна была провалиться",
			);
			assert.ok(first.failureReason, "причина провала не сохранена");
			assert.ok(first.nextRetryAt, "время следующей попытки не назначено");

			await new Promise((resolve) => setTimeout(resolve, 10));
			await ensureSpeechTranscriptionChunksRestored();
			assert.strictEqual(
				speechDurableRestoreState().failedAttempts,
				2,
				"провал запомнен навсегда: повторной попытки восстановления не было",
			);
		});
	});

	it("выдержка после провала не даёт бомбить упавшую базу на каждом фрагменте", async () => {
		await withEnv({ DENTAL_SPEECH_RESTORE_RETRY_MS: "600000" }, async () => {
			resetSpeechTranscriptionCacheForRestart();

			await ensureSpeechTranscriptionChunksRestored();
			assert.strictEqual(speechDurableRestoreState().failedAttempts, 1);

			await ensureSpeechTranscriptionChunksRestored();
			await ensureSpeechTranscriptionChunksRestored();
			assert.strictEqual(
				speechDurableRestoreState().failedAttempts,
				1,
				"выдержки нет: каждая проверка идёт в упавшую базу заново",
			);
		});
	});

	/**
	 * Ревьюер пакета C4 (находка 6) утверждал, что при недоступной базе кэш
	 * фрагментов растёт без предела. Механизм назван неверно: клиника фрагмента
	 * определяется запросом к visits/patients, поэтому при полностью недоступной
	 * базе фрагмент вообще не принимается и в памяти не остаётся. Неограниченный
	 * рост требует работающих чтений и падающих записей в ai_jobs — этот случай
	 * проверяется в storage.test.ts нарушением внешнего ключа.
	 */
	it("при недоступной базе фрагмент отклоняется, а не копится в памяти", async () => {
		await withEnv({ DENTAL_SPEECH_RESTORE_RETRY_MS: "600000" }, async () => {
			resetSpeechTranscriptionCacheForRestart();
			const recordingId = `test-offline-${randomUUID()}`;

			await assert.rejects(
				() =>
					recordSpeechTranscriptionChunk(buildOfflineChunkInput(recordingId)),
				(error: unknown) => {
					assert.ok(
						error instanceof Error,
						"ожидалась ошибка базы, а не молчаливый приём фрагмента",
					);
					// Отказ приходит именно с запроса, определяющего клинику фрагмента:
					// drizzle оборачивает ошибку пула текстом упавшего SELECT.
					assert.match(
						error.message,
						/organization_id|pool/i,
						`неожиданная причина отказа: ${error.message}`,
					);
					return true;
				},
			);
			assert.strictEqual(
				listSpeechTranscriptionChunks(recordingId).length,
				0,
				"непринятый фрагмент остался в памяти",
			);
		});
	});
});
