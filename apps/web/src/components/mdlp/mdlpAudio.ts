export function playMdlpBeep(isSuccess = true): void {
	try {
		const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
	} catch {
		// Audio context optional
	}
}
