/**
 * audioSessionManager.ts — Layer 3: Audio session lifecycle, sample buffering, and tab visibility management.
 */

import type { AudioRecordingState } from "./types";

export interface AudioSessionCallbacks {
	onSampleCeilingExceeded?: () => void;
	onVisibilityChange?: (hidden: boolean) => void;
}

export class AudioSessionManager {
	public state: AudioRecordingState = "idle";
	public isRunning = false;
	public isPaused = false;
	public sessionPcmChunks: Int16Array[] = [];
	public totalSessionSamples = 0;

	// Защита от бесконечного накопления сэмплов в оперативной памяти (Anti-RAM-Hog)
	// 9 600 000 сэмплов @ 16kHz = 10 минут непрерывной записи без пауз (~19.2 МБ)
	public readonly sampleCeiling = 9_600_000;
	private callbacks: AudioSessionCallbacks;
	private visibilityHandler: (() => void) | null = null;

	constructor(callbacks: AudioSessionCallbacks = {}) {
		this.callbacks = callbacks;
		this.setupVisibilityListener();
	}

	private setupVisibilityListener(): void {
		if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
			this.visibilityHandler = () => {
				this.callbacks.onVisibilityChange?.(document.hidden);
			};
			document.addEventListener("visibilitychange", this.visibilityHandler);
		}
	}

	public start(): void {
		this.state = "recording";
		this.isRunning = true;
		this.isPaused = false;
		this.sessionPcmChunks = [];
		this.totalSessionSamples = 0;
	}

	public pause(): void {
		this.state = "paused";
		this.isPaused = true;
	}

	public resume(): void {
		this.state = "recording";
		this.isPaused = false;
	}

	public stop(): void {
		this.state = "stopped";
		this.isRunning = false;
		this.isPaused = false;
	}

	public reset(): void {
		this.state = "idle";
		this.isRunning = false;
		this.isPaused = false;
		this.sessionPcmChunks = [];
		this.totalSessionSamples = 0;
	}

	public appendChunk(pcm: Int16Array): boolean {
		this.sessionPcmChunks.push(pcm);
		this.totalSessionSamples += pcm.length;

		if (this.totalSessionSamples > this.sampleCeiling) {
			this.callbacks.onSampleCeilingExceeded?.();
			return true;
		}
		return false;
	}

	public clearChunks(): void {
		this.sessionPcmChunks = [];
		this.totalSessionSamples = 0;
	}

	public dispose(): void {
		this.reset();
		if (
			this.visibilityHandler &&
			typeof document !== "undefined" &&
			typeof document.removeEventListener === "function"
		) {
			document.removeEventListener("visibilitychange", this.visibilityHandler);
			this.visibilityHandler = null;
		}
	}
}
