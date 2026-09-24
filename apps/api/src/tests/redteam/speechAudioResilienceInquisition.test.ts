/**
 * apps/api/src/tests/redteam/speechAudioResilienceInquisition.test.ts
 *
 * 🔴 RED TEAM INQUISITION: SPEECH GATEWAY & AUDIO PIPELINE RESILIENCE 🔴
 *
 * Strict adversarial inquisition covering:
 * 1. Anti-RAM-Hog Memory Ceilings (Base64 pre-allocation guard, Bidi bridge queue limit, storage cache ceiling).
 * 2. Tenant Isolation (Mandate 8p): Zero cross-tenant leakage in chunk listing, recovery assembly, and undurable counts.
 * 3. Fastify & Node.js Crash Resilience: WebSocket drops, quota errors, unhandled event-emitter crashes.
 * 4. Whisper Cascade 413 & Timeout Protection: Rejection of oversized payloads before expensive network roundtrips.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it, beforeEach, afterEach } from "node:test";
import type { SpeechTranscriptionChunk } from "@dental/shared";
import {
	decodeBase64Audio,
	SpeechChunkPayloadError,
} from "../../speech/gateway.js";
import {
	GeminiBidiBridge,
	MAX_SINGLE_AUDIO_CHUNK_BYTES,
} from "../../speech/geminiBidiBridge.js";
import {
	getUndurableCachedChunkCountForTesting,
	listSpeechRecordingRecoveries,
	listSpeechTranscriptionChunks,
	resetSpeechTranscriptionCacheForRestart,
	seedSpeechTranscriptionChunkForTesting,
	trimSpeechTranscriptionChunkRetentionForTesting,
} from "../../speech/storage.js";
import {
	transcribeWhisperCascade,
} from "../../speech/whisperCascade.js";
import {
	SpeechProviderRequestError,
} from "../../speech/keyPool.js";

function createMockChunk(overrides: Partial<SpeechTranscriptionChunk> = {}): SpeechTranscriptionChunk {
	const id = overrides.id ?? randomUUID();
	const organizationId = overrides.organizationId ?? randomUUID();
	const recordingId = overrides.recordingId ?? "rec-default";
	const chunkIndex = overrides.chunkIndex ?? 0;

	return {
		id,
		organizationId,
		recordingId,
		chunkIndex,
		source: "visit",
		patientId: randomUUID(),
		visitId: randomUUID(),
		providerId: "none",
		providerLabel: "Red Team Test Provider",
		mimeType: "audio/webm",
		byteLength: 1024,
		durationMs: 2000,
		language: "ru",
		transcript: `Тестовая реплика фрагмента ${chunkIndex}`,
		confidence: 0.95,
		status: "transcribed",
		quality: {
			level: "clear",
			confidence: 0.95,
			wordCount: 4,
			charCount: 30,
			durationMs: 2000,
			bytesPerSecond: 512,
			providerWarnings: [],
			signals: ["red_team_test"],
			nextAction: "Проверка изоляции тенантов",
		},
		warnings: [],
		clientRecordedAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

describe("🔴 RED TEAM: Speech Audio Pipeline & Gateway Inquisition 🔴", () => {
	beforeEach(() => {
		resetSpeechTranscriptionCacheForRestart();
	});

	afterEach(() => {
		resetSpeechTranscriptionCacheForRestart();
	});

	describe("1. Anti-RAM-Hog Base64 Pre-Allocation Check & Corrupt Payload Defense", () => {
		it("rejects oversized base64 string BEFORE allocating Buffer in V8 heap", () => {
			const maxChunkBytes = 1000;
			// Base64 limit is Math.ceil((1000 * 4) / 3) + 8 = 1334 + 8 = 1342 chars.
			const oversizedBase64 = "A".repeat(1500);

			assert.throws(
				() => decodeBase64Audio(oversizedBase64, maxChunkBytes),
				(err: unknown) => {
					assert.ok(err instanceof SpeechChunkPayloadError);
					assert.strictEqual(err.statusCode, 400);
					assert.ok(err.message.includes("Аудиофрагмент слишком большой"));
					return true;
				},
				"Must throw SpeechChunkPayloadError without calling Buffer.from",
			);
		});

		it("rejects corrupt payloads containing non-base64 characters without crashing process", () => {
			const maxChunkBytes = 10000;
			const maliciousPayload = "AAAA%%%INVALID_CHARS$$$====";

			assert.throws(
				() => decodeBase64Audio(maliciousPayload, maxChunkBytes),
				(err: unknown) => {
					assert.ok(err instanceof SpeechChunkPayloadError);
					assert.strictEqual(err.statusCode, 400);
					assert.ok(err.message.includes("поврежден или передан не как файл записи"));
					return true;
				},
			);
		});

		it("returns empty buffer for undefined or whitespace payloads", () => {
			assert.strictEqual(decodeBase64Audio(undefined, 1000).byteLength, 0);
			assert.strictEqual(decodeBase64Audio("", 1000).byteLength, 0);
			assert.strictEqual(decodeBase64Audio("   \n\t  ", 1000).byteLength, 0);
		});

		it("successfully decodes valid base64 audio payload within limits", () => {
			const originalBytes = Buffer.from([1, 2, 3, 4, 5, 10, 20, 30, 40, 50]);
			const b64 = originalBytes.toString("base64");
			const decoded = decodeBase64Audio(b64, 1000);
			assert.deepStrictEqual(decoded, originalBytes);
		});
	});

	describe("2. Anti-RAM-Hog Streaming Queue & Single Chunk Limits (GeminiBidiBridge)", () => {
		it("rejects single chunk exceeding MAX_SINGLE_AUDIO_CHUNK_BYTES (2MB)", () => {
			const bridge = new GeminiBidiBridge();
			const oversizedBuffer = Buffer.alloc(MAX_SINGLE_AUDIO_CHUNK_BYTES + 1024);

			assert.throws(
				() => bridge.sendAudio(oversizedBuffer),
				(err: Error) => {
					assert.ok(err.message.includes("Single audio chunk exceeds maximum allowed size"));
					return true;
				},
			);

			bridge.close();
		});

		it("rejects oversized base64 chunk string exceeding single chunk ceiling before Buffer allocation", () => {
			const bridge = new GeminiBidiBridge();
			const maxAllowedB64 = Math.ceil((MAX_SINGLE_AUDIO_CHUNK_BYTES * 4) / 3) + 8;
			const oversizedB64 = "A".repeat(maxAllowedB64 + 100);

			assert.throws(
				() => bridge.sendAudio(oversizedB64),
				(err: Error) => {
					assert.ok(err.message.includes("Single audio chunk exceeds maximum allowed size"));
					return true;
				},
			);

			bridge.close();
		});

		it("enforces maxBufferSizeBytes ceiling on queue by dropping oldest frames (FIFO)", () => {
			const bridge = new GeminiBidiBridge({
				maxBufferSizeBytes: 4096, // 4KB limit
			});

			const chunk1 = Buffer.alloc(2000, 1);
			const chunk2 = Buffer.alloc(2000, 2);
			const chunk3 = Buffer.alloc(2000, 3);

			bridge.sendAudio(chunk1);
			assert.strictEqual(bridge.queuedBytes, 2000);
			assert.strictEqual(bridge.queuedChunksCount, 1);

			bridge.sendAudio(chunk2);
			assert.strictEqual(bridge.queuedBytes, 4000);
			assert.strictEqual(bridge.queuedChunksCount, 2);

			// Adding chunk3 (2000 bytes) would push queue to 6000 > 4096 bytes.
			// FIFO drop must discard chunk1 (2000 bytes) so queue has chunk2 + chunk3 (4000 bytes).
			bridge.sendAudio(chunk3);
			assert.strictEqual(bridge.queuedBytes, 4000);
			assert.strictEqual(bridge.queuedChunksCount, 2);

			bridge.close();
		});

		it("close() immediately purges queue and frees memory", () => {
			const bridge = new GeminiBidiBridge();
			bridge.sendAudio(Buffer.alloc(1024));
			bridge.sendAudio(Buffer.alloc(1024));
			assert.strictEqual(bridge.queuedChunksCount, 2);
			assert.strictEqual(bridge.queuedBytes, 2048);

			bridge.close();
			assert.strictEqual(bridge.queuedChunksCount, 0);
			assert.strictEqual(bridge.queuedBytes, 0);
		});

		it("safeEmitError does not crash the Node.js event loop when 0 error listeners are attached", () => {
			const bridge = new GeminiBidiBridge();
			assert.strictEqual(bridge.listenerCount("error"), 0);

			// Calling private safeEmitError must not throw unhandled 'error' exception
			assert.doesNotThrow(() => {
				(bridge as any).safeEmitError(new Error("Simulated unhandled bridge error"));
			});

			bridge.close();
		});
	});

	describe("3. Tenant Isolation & Cache Retention Ceiling (storage.ts - Mandate 8p)", () => {
		const ORG_A = randomUUID();
		const ORG_B = randomUUID(); // Adversary / adjacent tenant
		const SHARED_RECORDING_ID = "rec-collision-001";

		it("listSpeechTranscriptionChunks strictly isolates chunks by organizationId", () => {
			// Seed chunk 0 for Org A
			seedSpeechTranscriptionChunkForTesting(
				createMockChunk({
					organizationId: ORG_A,
					recordingId: SHARED_RECORDING_ID,
					chunkIndex: 0,
					transcript: "Текст врача Клиники А",
				}),
			);

			// Seed chunk 1 for Org A
			seedSpeechTranscriptionChunkForTesting(
				createMockChunk({
					organizationId: ORG_A,
					recordingId: SHARED_RECORDING_ID,
					chunkIndex: 1,
					transcript: "Продолжение диктовки Клиники А",
				}),
			);

			// Seed chunk 0 for Org B with the EXACT SAME recordingId
			seedSpeechTranscriptionChunkForTesting(
				createMockChunk({
					organizationId: ORG_B,
					recordingId: SHARED_RECORDING_ID,
					chunkIndex: 0,
					transcript: "Текст врача Клиники Б — строгая тайна",
				}),
			);

			// Query Org A: must receive ONLY Org A chunks (2 items)
			const chunksA = listSpeechTranscriptionChunks(SHARED_RECORDING_ID, {
				organizationId: ORG_A,
			});
			assert.strictEqual(chunksA.length, 2, "Org A must see exactly its own 2 chunks");
			assert.ok(chunksA.every((c) => c.organizationId === ORG_A));
			assert.strictEqual(chunksA[0]?.transcript, "Текст врача Клиники А");
			assert.strictEqual(chunksA[1]?.transcript, "Продолжение диктовки Клиники А");

			// Query Org B: must receive ONLY Org B chunk (1 item)
			const chunksB = listSpeechTranscriptionChunks(SHARED_RECORDING_ID, {
				organizationId: ORG_B,
			});
			assert.strictEqual(chunksB.length, 1, "Org B must see exactly its own 1 chunk");
			assert.strictEqual(chunksB[0]?.organizationId, ORG_B);
			assert.strictEqual(chunksB[0]?.transcript, "Текст врача Клиники Б — строгая тайна");
		});

		it("listSpeechRecordingRecoveries strictly excludes foreign tenant recordings", () => {
			seedSpeechTranscriptionChunkForTesting(
				createMockChunk({
					organizationId: ORG_A,
					recordingId: "rec-org-a",
					transcript: "Запись Клиники А",
				}),
			);
			seedSpeechTranscriptionChunkForTesting(
				createMockChunk({
					organizationId: ORG_B,
					recordingId: "rec-org-b",
					transcript: "Запись Клиники Б",
				}),
			);

			const recoveriesA = listSpeechRecordingRecoveries({ organizationId: ORG_A });
			assert.strictEqual(recoveriesA.recordings.length, 1);
			assert.strictEqual(recoveriesA.recordings[0]?.recordingId, "rec-org-a");

			const recoveriesB = listSpeechRecordingRecoveries({ organizationId: ORG_B });
			assert.strictEqual(recoveriesB.recordings.length, 1);
			assert.strictEqual(recoveriesB.recordings[0]?.recordingId, "rec-org-b");
		});

		it("getUndurableCachedChunkCount strictly isolates counters between tenants", () => {
			seedSpeechTranscriptionChunkForTesting(
				createMockChunk({
					organizationId: ORG_A,
					recordingId: "rec-a",
					chunkIndex: 0,
				}),
				false, // undurable
			);
			seedSpeechTranscriptionChunkForTesting(
				createMockChunk({
					organizationId: ORG_A,
					recordingId: "rec-a",
					chunkIndex: 1,
				}),
				false, // undurable
			);
			seedSpeechTranscriptionChunkForTesting(
				createMockChunk({
					organizationId: ORG_B,
					recordingId: "rec-b",
					chunkIndex: 0,
				}),
				false, // undurable
			);

			assert.strictEqual(getUndurableCachedChunkCountForTesting(ORG_A), 2);
			assert.strictEqual(getUndurableCachedChunkCountForTesting(ORG_B), 1);
		});

		it("Anti-RAM-Hog ceiling: trimSpeechTranscriptionChunkRetention caps undurable chunks under DB outage", () => {
			const recordingId = "rec-flood-001";
			// Seed 1,500 undurable chunks for a single recording (simulating high-speed streaming during DB failure)
			for (let i = 0; i < 1500; i++) {
				seedSpeechTranscriptionChunkForTesting(
					createMockChunk({
						organizationId: ORG_A,
						recordingId,
						chunkIndex: i,
					}),
					false, // undurable
				);
			}

			// Run retention trim
			trimSpeechTranscriptionChunkRetentionForTesting();

			const remaining = listSpeechTranscriptionChunks(recordingId, {
				organizationId: ORG_A,
			});

			// Default maxUndurableChunksPerRecording is 1,200. Must not retain 1,500!
			assert.ok(
				remaining.length <= 1200,
				`Remaining chunks (${remaining.length}) must not exceed hard ceiling of 1200`,
			);
		});
	});

	describe("4. Whisper Cascade 413 & Timeout Protection (whisperCascade.ts)", () => {
		it("rejects audio exceeding 25MB ceiling with HTTP 413 before attempting network cascade", async () => {
			const oversized26Mb = Buffer.alloc(26 * 1024 * 1024);

			await assert.rejects(
				async () => {
					await transcribeWhisperCascade({
						audio: oversized26Mb,
						mimeType: "audio/wav",
					});
				},
				(err: unknown) => {
					assert.ok(err instanceof SpeechProviderRequestError);
					assert.strictEqual(err.statusCode, 413);
					assert.strictEqual(err.retryable, false);
					assert.ok(err.message.includes("превышает максимальный лимит"));
					return true;
				},
				"Must reject with 413 Payload Too Large without hitting cloud providers",
			);
		});
	});
});
