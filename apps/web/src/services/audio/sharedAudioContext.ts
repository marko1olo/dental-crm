/**
 * apps/web/src/services/audio/sharedAudioContext.ts
 *
 * DENTE CRM — Единый общий Web Audio API AudioContext синглтон для клиники.
 * Исключает утечки дескрипторов аудио-устройств ОС и конфликты параллельных контекстов на iOS Safari.
 */

import { logger } from "../../utils/logger.js";

interface WindowWithWebkitAudio {
	webkitAudioContext?: typeof AudioContext;
}

let sharedContext: AudioContext | null = null;

/**
 * Получение единого экземпляра AudioContext для всех звуковых сервисов приложения
 */
export function getSharedAudioContext(): AudioContext | null {
	if (typeof window === "undefined") {
		return null;
	}

	if (!sharedContext || sharedContext.state === "closed") {
		const AudioCtxClass =
			window.AudioContext ||
			(window as Window & WindowWithWebkitAudio).webkitAudioContext;

		if (AudioCtxClass) {
			try {
				sharedContext = new AudioCtxClass();
			} catch (err) {
				logger.warn("[SharedAudioContext] Failed to initialize AudioContext:", err);
			}
		}
	}

	return sharedContext;
}

/**
 * Ручная установка AudioContext (для юнит-тестов и моков)
 */
export function setSharedAudioContext(ctx: AudioContext | null): void {
	sharedContext = ctx;
}

/**
 * Сброс общего аудиоконтекста
 */
export function resetSharedAudioContext(): void {
	if (sharedContext) {
		try {
			if (typeof sharedContext.close === "function") {
				sharedContext.close().catch((err: unknown) => {
					logger.debug("[SharedAudioContext] AudioContext close rejected:", err);
				});
			}
		} catch (err: unknown) {
			logger.debug("[SharedAudioContext] AudioContext close failed:", err);
		}
		sharedContext = null;
	}
}
