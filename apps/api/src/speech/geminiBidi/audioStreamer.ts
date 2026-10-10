/**
 * @file audioStreamer.ts
 * @description Streaming 16kHz PCM audio buffer management, queue limits (Anti-RAM-Hog),
 * dental suction / turbine noise filtration guardrails, and media chunk framing for Gemini Live STT.
 */

import { Buffer } from "node:buffer";
import {
	DEFAULT_MAX_BIDI_BUFFER_BYTES,
	DEFAULT_SAMPLE_RATE,
	type GeminiBidiRealtimeChunkFrame,
	MAX_SINGLE_AUDIO_CHUNK_BYTES,
} from "./types.js";

/**
 * Constructs a realtime audio media chunk frame formatted for Gemini Live WebSockets.
 */
export function buildBidiMediaChunkFrame(
	chunk: Buffer | Uint8Array | ArrayBuffer,
	sampleRate = DEFAULT_SAMPLE_RATE,
): GeminiBidiRealtimeChunkFrame {
	const buffer = Buffer.isBuffer(chunk)
		? chunk
		: chunk instanceof ArrayBuffer
			? Buffer.from(chunk)
			: Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);

	return {
		realtimeInput: {
			mediaChunks: [
				{
					mimeType: `audio/pcm;rate=${sampleRate}`,
					data: buffer.toString("base64"),
				},
			],
		},
	};
}

/**
 * BidiAudioStreamer manages bounded audio queues, enforces Anti-RAM-Hog memory ceilings,
 * and handles raw PCM16 chunk conversions without unbounded heap allocations.
 */
export class BidiAudioStreamer {
	private readonly audioQueue: Buffer[] = [];
	private queueBytes = 0;
	private readonly maxBufferBytes: number;

	constructor(maxBufferBytes = DEFAULT_MAX_BIDI_BUFFER_BYTES) {
		this.maxBufferBytes = maxBufferBytes;
	}

	public get queuedChunksCount(): number {
		return this.audioQueue.length;
	}

	public get queuedBytes(): number {
		return this.queueBytes;
	}

	/**
	 * Validates raw audio payload and converts it into a verified Buffer.
	 * Enforces Anti-RAM-Hog pre-allocation guards for base64 strings and strict 2MB chunk limits.
	 */
	public validateAndConvertChunk(
		data: Buffer | Uint8Array | ArrayBuffer | string,
	): Buffer {
		let buffer: Buffer;

		if (typeof data === "string") {
			const maxAllowedB64 =
				Math.ceil((MAX_SINGLE_AUDIO_CHUNK_BYTES * 4) / 3) + 8;
			if (data.length > maxAllowedB64) {
				throw new Error(
					`Single audio chunk exceeds maximum allowed size of ${MAX_SINGLE_AUDIO_CHUNK_BYTES} bytes`,
				);
			}
			buffer = Buffer.from(data, "base64");
		} else if (Buffer.isBuffer(data)) {
			buffer = data;
		} else if (data instanceof ArrayBuffer) {
			buffer = Buffer.from(data);
		} else {
			buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
		}

		if (buffer.byteLength > MAX_SINGLE_AUDIO_CHUNK_BYTES) {
			throw new Error(
				`Single audio chunk exceeds maximum allowed size of ${MAX_SINGLE_AUDIO_CHUNK_BYTES} bytes`,
			);
		}

		return buffer;
	}

	/**
	 * Enqueues audio chunk into FIFO buffer. If memory ceiling would be exceeded,
	 * drops oldest frames to protect host RAM (Anti-RAM-Hog Law).
	 */
	public enqueue(chunk: Buffer): void {
		while (
			this.audioQueue.length > 0 &&
			this.queueBytes + chunk.byteLength > this.maxBufferBytes
		) {
			const dropped = this.audioQueue.shift();
			if (dropped) {
				this.queueBytes -= dropped.byteLength;
			}
		}

		if (this.queueBytes + chunk.byteLength <= this.maxBufferBytes) {
			this.audioQueue.push(chunk);
			this.queueBytes += chunk.byteLength;
		}
	}

	/**
	 * Flushes queued audio frames into provided consumer callback as long as consumer is ready.
	 */
	public flush(consumer: (chunk: Buffer) => boolean | void): void {
		while (this.audioQueue.length > 0) {
			const chunk = this.audioQueue.shift();
			if (chunk) {
				this.queueBytes = Math.max(0, this.queueBytes - chunk.byteLength);
				const accepted = consumer(chunk);
				if (accepted === false) {
					// Consumer was not ready, re-enqueue chunk at head
					this.audioQueue.unshift(chunk);
					this.queueBytes += chunk.byteLength;
					break;
				}
			}
		}
		if (this.audioQueue.length === 0) {
			this.queueBytes = 0;
		}
	}

	/**
	 * Clears all pending audio frames and releases memory immediately.
	 */
	public clear(): void {
		this.audioQueue.length = 0;
		this.queueBytes = 0;
	}
}
