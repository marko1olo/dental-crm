/**
 * audioContextLifecycle.ts — Инициализация AudioContext, микрофона и очистка ресурсов.
 */

import { logger } from "../../../utils/logger";

export function getAudioContextClass(): typeof AudioContext {
	return (
		window.AudioContext ||
		// biome-ignore lint/suspicious/noExplicitAny: WebKit AudioContext fallback
		(window as any).webkitAudioContext
	);
}

export function createAudioContext(): AudioContext {
	const AudioCtxClass = getAudioContextClass();
	return new AudioCtxClass();
}

export async function requestMicrophoneStream(): Promise<MediaStream> {
	return navigator.mediaDevices.getUserMedia({
		audio: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
			channelCount: 1,
		},
	});
}

export function disconnectNode(node: AudioNode | null, label: string): void {
	if (!node) return;
	try {
		node.disconnect();
	} catch (err: unknown) {
		logger.warn(`[AudioStreamManager] ${label} disconnect error:`, err);
	}
}

export function stopMediaStreamTracks(stream: MediaStream | null): void {
	if (!stream) return;
	stream.getTracks().forEach((t) => {
		try {
			t.stop();
		} catch (err: unknown) {
			logger.warn("[AudioStreamManager] mediaStream track stop error:", err);
		}
	});
}

export function closeAudioContext(ctx: AudioContext | null): void {
	if (!ctx) return;
	try {
		if (ctx.state !== "closed" && typeof ctx.close === "function") {
			void ctx.close().catch((err: unknown) => {
				logger.warn("[AudioStreamManager] audioContext close async error:", err);
			});
		}
	} catch (err: unknown) {
		logger.warn("[AudioStreamManager] audioContext close error:", err);
	}
}
