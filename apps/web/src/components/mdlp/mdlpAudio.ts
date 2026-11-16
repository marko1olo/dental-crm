interface WindowWithWebkitAudio extends Window {
	AudioContext?: typeof AudioContext;
	webkitAudioContext?: typeof AudioContext;
}

export function playMdlpBeep(isSuccess = true): void {
	if (typeof window === "undefined") return;
	try {
		const win = window as WindowWithWebkitAudio;
		const AudioCtx = win.AudioContext || win.webkitAudioContext;
		if (!AudioCtx) return;
		const ctx = new AudioCtx();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(isSuccess ? 880 : 330, ctx.currentTime);
		gain.gain.setValueAtTime(0.08, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.15);
	} catch (err: unknown) {
		console.debug("[MDLP Audio] Beep playback skipped:", err);
	}
}
