/**
 * @file geminiBidiModular.test.ts
 * @description Dedicated unit test suite verifying decomposed submodules:
 * types.ts, dentalVocabulary.ts, audioStreamer.ts, and bidiConnectionManager.ts.
 */

import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { describe, it } from "node:test";
import {
	BidiAudioStreamer,
	buildBidiMediaChunkFrame,
	buildBidiSetupFrame,
	buildDentalBidiSystemInstruction,
	DEFAULT_GEMINI_BIDI_ENDPOINT,
	DEFAULT_GEMINI_BIDI_MODEL,
	DEFAULT_MAX_BIDI_BUFFER_BYTES,
	DEFAULT_MIME_TYPE,
	DEFAULT_SAMPLE_RATE,
	DENTAL_804N_TERMS,
	DENTAL_ICD10_NOSOLOGY,
	DENTAL_PHARMACOLOGY_AND_MATERIALS,
	DENTAL_SURFACES_ODMVSH,
	isBidiKeyRotationError,
	MANDATORY_DENTAL_BIDI_TERMS,
	MAX_SINGLE_AUDIO_CHUNK_BYTES,
	parseBidiServerMessage,
} from "./index.js";
import * as FacadeExports from "../geminiBidiBridge.js";

describe("geminiBidi Modular Domain Architecture", () => {
	describe("1. types.ts Constants & Protocol Definitions", () => {
		it("exports valid canonical endpoints and defaults", () => {
			assert.equal(
				DEFAULT_GEMINI_BIDI_ENDPOINT,
				"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent",
			);
			assert.equal(
				DEFAULT_GEMINI_BIDI_MODEL,
				"models/gemini-3.5-transcribe-live",
			);
			assert.equal(DEFAULT_SAMPLE_RATE, 16000);
			assert.equal(DEFAULT_MIME_TYPE, "audio/pcm;rate=16000");
			assert.equal(DEFAULT_MAX_BIDI_BUFFER_BYTES, 8 * 1024 * 1024);
			assert.equal(MAX_SINGLE_AUDIO_CHUNK_BYTES, 2 * 1024 * 1024);
		});

		it("contains complete FDI 11-48 and 51-85 notation in mandatory vocabulary", () => {
			assert.ok(MANDATORY_DENTAL_BIDI_TERMS.includes("11"));
			assert.ok(MANDATORY_DENTAL_BIDI_TERMS.includes("48"));
			assert.ok(MANDATORY_DENTAL_BIDI_TERMS.includes("51"));
			assert.ok(MANDATORY_DENTAL_BIDI_TERMS.includes("85"));
			assert.ok(MANDATORY_DENTAL_BIDI_TERMS.includes("апекслокатор"));
			assert.ok(MANDATORY_DENTAL_BIDI_TERMS.includes("коффердам"));
			assert.ok(MANDATORY_DENTAL_BIDI_TERMS.includes("СанПиН 3.3686-21"));
		});
	});

	describe("2. dentalVocabulary.ts & Speech Biasing Prompts", () => {
		it("includes ODMVSh anatomical surfaces and ICD-10 nosologies", () => {
			assert.ok(DENTAL_SURFACES_ODMVSH.includes("окклюзионная"));
			assert.ok(DENTAL_SURFACES_ODMVSH.includes("вестибулярная"));
			assert.ok(DENTAL_SURFACES_ODMVSH.includes("МОД"));
			assert.ok(DENTAL_ICD10_NOSOLOGY.includes("К02.1"));
			assert.ok(DENTAL_ICD10_NOSOLOGY.includes("К04.0"));
			assert.ok(DENTAL_PHARMACOLOGY_AND_MATERIALS.includes("ультракаин"));
			assert.ok(DENTAL_PHARMACOLOGY_AND_MATERIALS.includes("E.max"));
			assert.ok(DENTAL_804N_TERMS.includes("анестезия инфильтрационная"));
		});

		it("constructs system instruction with anti-hallucination and clinical terms", () => {
			const instruction = buildDentalBidiSystemInstruction("therapy", [
				"интраоральный сканер",
			]);
			assert.match(instruction, /ассистент ДЕНТА/);
			assert.match(instruction, /КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать/);
			assert.match(instruction, /окклюзионная/);
			assert.match(instruction, /ультракаин/);
			assert.match(instruction, /интраоральный сканер/);
		});

		it("builds standard Gemini Live setup frame with TEXT response modality", () => {
			const frame = buildBidiSetupFrame({
				model: "models/test-model",
				specialty: "surgery",
			});
			assert.equal(frame.setup.model, "models/test-model");
			assert.deepEqual(frame.setup.generationConfig.responseModalities, [
				"TEXT",
			]);
			assert.equal(frame.setup.systemInstruction.parts.length, 1);
		});
	});

	describe("3. audioStreamer.ts Audio Queue & Anti-RAM-Hog Ceilings", () => {
		it("formats media chunks with 16kHz rate from Buffer and ArrayBuffer", () => {
			const pcmBuf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
			const frame1 = buildBidiMediaChunkFrame(pcmBuf, 16000);
			assert.equal(frame1.realtimeInput.mediaChunks[0].mimeType, "audio/pcm;rate=16000");
			assert.equal(frame1.realtimeInput.mediaChunks[0].data, pcmBuf.toString("base64"));

			const ab = new ArrayBuffer(4);
			const frame2 = buildBidiMediaChunkFrame(ab, 16000);
			assert.equal(frame2.realtimeInput.mediaChunks[0].mimeType, "audio/pcm;rate=16000");
		});

		it("enforces chunk size ceiling and validates base64 strings before Buffer allocation", () => {
			const streamer = new BidiAudioStreamer(1024 * 1024);

			// Valid chunk
			const validBuf = streamer.validateAndConvertChunk(Buffer.alloc(100));
			assert.equal(validBuf.byteLength, 100);

			// Oversized chunk
			assert.throws(
				() => streamer.validateAndConvertChunk(Buffer.alloc(MAX_SINGLE_AUDIO_CHUNK_BYTES + 1)),
				/Single audio chunk exceeds maximum allowed size/,
			);

			// Oversized base64 string
			const oversizedB64 = "A".repeat(Math.ceil((MAX_SINGLE_AUDIO_CHUNK_BYTES * 4) / 3) + 20);
			assert.throws(
				() => streamer.validateAndConvertChunk(oversizedB64),
				/Single audio chunk exceeds maximum allowed size/,
			);
		});

		it("drops oldest frames (FIFO) when total buffer size ceiling is reached", () => {
			const streamer = new BidiAudioStreamer(1000); // 1000 bytes max
			const chunk1 = Buffer.alloc(600, 1);
			const chunk2 = Buffer.alloc(600, 2);

			streamer.enqueue(chunk1);
			assert.equal(streamer.queuedChunksCount, 1);
			assert.equal(streamer.queuedBytes, 600);

			// Enqueuing chunk2 pushes total to 1200 > 1000, so chunk1 is dropped
			streamer.enqueue(chunk2);
			assert.equal(streamer.queuedChunksCount, 1);
			assert.equal(streamer.queuedBytes, 600);

			// Clear purges queue
			streamer.clear();
			assert.equal(streamer.queuedChunksCount, 0);
			assert.equal(streamer.queuedBytes, 0);
		});

		it("flushes queued frames to consumer properly", () => {
			const streamer = new BidiAudioStreamer(5000);
			streamer.enqueue(Buffer.from("frame1"));
			streamer.enqueue(Buffer.from("frame2"));

			const received: string[] = [];
			streamer.flush((chunk) => {
				received.push(chunk.toString());
				return true;
			});

			assert.deepEqual(received, ["frame1", "frame2"]);
			assert.equal(streamer.queuedChunksCount, 0);
		});
	});

	describe("4. bidiConnectionManager.ts Parsing & Facade Parity", () => {
		it("parses interim and final transcripts without checking modelTurn.parts", () => {
			const interimMsg = JSON.stringify({
				serverContent: {
					interimInputTranscription: { text: "глубокий кариес" },
				},
			});
			const parsedInterim = parseBidiServerMessage(interimMsg);
			assert.ok(parsedInterim?.transcript);
			assert.equal(parsedInterim.transcript.type, "interim");
			assert.equal(parsedInterim.transcript.text, "глубокий кариес");

			const finalMsg = JSON.stringify({
				serverContent: {
					inputTranscription: { text: "глубокий кариес зуба 16" },
					turnComplete: true,
				},
			});
			const parsedFinal = parseBidiServerMessage(finalMsg);
			assert.ok(parsedFinal?.transcript);
			assert.equal(parsedFinal.transcript.type, "final");
			assert.equal(parsedFinal.transcript.text, "глубокий кариес зуба 16");
			assert.equal(parsedFinal.turnComplete, true);
		});

		it("identifies all key rotation error conditions", () => {
			assert.equal(isBidiKeyRotationError(1008), true);
			assert.equal(isBidiKeyRotationError(403), true);
			assert.equal(isBidiKeyRotationError(429), true);
			assert.equal(isBidiKeyRotationError(401), true);
			assert.equal(isBidiKeyRotationError(1000), false);

			assert.equal(isBidiKeyRotationError({ code: 429 }), true);
			assert.equal(isBidiKeyRotationError({ status: "RESOURCE_EXHAUSTED" }), true);
			assert.equal(isBidiKeyRotationError({ status: "UNAUTHENTICATED" }), true);
			assert.equal(isBidiKeyRotationError({ message: "Quota exceeded for quota metric" }), true);
			assert.equal(isBidiKeyRotationError({ message: "Normal client closure" }), false);
		});

		it("verifies 100% export parity in thin canonical facade", () => {
			assert.ok(FacadeExports.GeminiBidiBridge);
			assert.ok(FacadeExports.DEFAULT_GEMINI_BIDI_ENDPOINT);
			assert.ok(FacadeExports.DEFAULT_GEMINI_BIDI_MODEL);
			assert.ok(FacadeExports.DEFAULT_SAMPLE_RATE);
			assert.ok(FacadeExports.DEFAULT_MIME_TYPE);
			assert.ok(FacadeExports.MANDATORY_DENTAL_BIDI_TERMS);
			assert.ok(FacadeExports.DEFAULT_MAX_BIDI_BUFFER_BYTES);
			assert.ok(FacadeExports.MAX_SINGLE_AUDIO_CHUNK_BYTES);
			assert.ok(FacadeExports.buildDentalBidiSystemInstruction);
			assert.ok(FacadeExports.buildBidiSetupFrame);
			assert.ok(FacadeExports.buildBidiMediaChunkFrame);
			assert.ok(FacadeExports.parseBidiServerMessage);
			assert.ok(FacadeExports.isBidiKeyRotationError);
		});
	});
});
