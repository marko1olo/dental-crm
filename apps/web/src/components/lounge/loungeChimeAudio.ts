/**
 * loungeChimeAudio.ts — Звуковой сигнализатор вызова (Web Audio API)
 * Воспроизводит мягкий двухтональный сигнал вызова (D5 -> A5)
 * с автоматическим освобождением AudioContext во избежание утечек памяти.
 */

export function playCallingChime(): void {
	if (typeof window === "undefined") return;

	try {
		const AudioCtx =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext;
		if (!AudioCtx) return;

		const ctx = new AudioCtx();
		const now = ctx.currentTime;

		// Первый тон (D5: 587.33 Гц)
		const osc1 = ctx.createOscillator();
		const gain1 = ctx.createGain();
		osc1.type = "sine";
		osc1.frequency.setValueAtTime(587.33, now);
		gain1.gain.setValueAtTime(0.08, now);
		gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
		osc1.connect(gain1);
		gain1.connect(ctx.destination);
		osc1.start(now);
		osc1.stop(now + 0.45);

		// Второй гармоничный тон (A5: 880 Гц)
		const osc2 = ctx.createOscillator();
		const gain2 = ctx.createGain();
		osc2.type = "sine";
		osc2.frequency.setValueAtTime(880, now + 0.22);
		gain2.gain.setValueAtTime(0.08, now + 0.22);
		gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
		osc2.connect(gain2);
		gain2.connect(ctx.destination);
		osc2.start(now + 0.22);
		osc2.stop(now + 0.8);

		// Автоматически закрываем AudioContext после звучания
		setTimeout(() => {
			try {
				if (ctx.state !== "closed") {
					void ctx.close();
				}
			} catch {
				// контекст уже утилизирован
			}
		}, 1200);
	} catch {
		// AudioContext заблокирован браузером до первого жеста пользователя
	}
}
