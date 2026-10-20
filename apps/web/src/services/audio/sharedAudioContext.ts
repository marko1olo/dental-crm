/**
 * apps/web/src/services/audio/sharedAudioContext.ts
 *
 * DENTE CRM — Единый общий Web Audio API AudioContext синглтон для клиники.
 * Исключает утечки дескрипторов аудио-устройств ОС и конфликты параллельных контекстов на iOS Safari.
 */

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
			// biome-ignore lint/suspicious/noExplicitAny: webkitAudioContext fallback for Safari
			(window as any).webkitAudioContext;

		if (AudioCtxClass) {
			try {
				sharedContext = new AudioCtxClass();
			} catch (err) {
				console.warn("[SharedAudioContext] Failed to initialize AudioContext:", err);
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
				sharedContext.close().catch(() => {});
			}
		} catch {
			// Non-blocking
		}
		sharedContext = null;
	}
}
