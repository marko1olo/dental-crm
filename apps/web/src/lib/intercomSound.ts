/**
 * intercomSound.ts — Web Audio API Synthesizer for Clinic Intercom & Chairside Pings.
 *
 * Guaranteed 0 external network requests, zero MP3/WAV assets.
 * Pure procedural synthesis with soft gain envelope (anti-click).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	try {
		const AudioContextClass =
			window.AudioContext || (window as any).webkitAudioContext;
		if (!AudioContextClass) return null;
		if (!audioCtx) {
			audioCtx = new AudioContextClass();
		}
		if (audioCtx.state === "suspended") {
			audioCtx.resume().catch(() => {});
		}
		return audioCtx;
	} catch (e) {
		return null;
	}
}

export function playIntercomChime(urgency: "normal" | "urgent" | "critical" = "normal"): void {
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;

		if (urgency === "critical") {
			// Трехтональный SOS-сигнал (880Hz -> 1174Hz -> 880Hz)
			const freqs = [880, 1174, 880];
			freqs.forEach((freq, idx) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(freq, now + idx * 0.12);

				gain.gain.setValueAtTime(0.001, now + idx * 0.12);
				gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.12 + 0.02);
				gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.11);

				osc.connect(gain);
				gain.connect(ctx.destination);

				osc.start(now + idx * 0.12);
				osc.stop(now + idx * 0.12 + 0.12);
			});
		} else if (urgency === "urgent") {
			// Двухтональный интерком-колокольчик (784Hz -> 1046Hz)
			const tones = [
				{ freq: 784, start: 0, dur: 0.1 },
				{ freq: 1046, start: 0.1, dur: 0.2 },
			];
			tones.forEach(({ freq, start, dur }) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(freq, now + start);

				gain.gain.setValueAtTime(0.001, now + start);
				gain.gain.exponentialRampToValueAtTime(0.2, now + start + 0.02);
				gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

				osc.connect(gain);
				gain.connect(ctx.destination);

				osc.start(now + start);
				osc.stop(now + start + dur + 0.01);
			});
		} else {
			// Мягкий двухтональный бип (523Hz -> 659Hz)
			const tones = [
				{ freq: 523, start: 0, dur: 0.1 },
				{ freq: 659, start: 0.09, dur: 0.16 },
			];
			tones.forEach(({ freq, start, dur }) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(freq, now + start);

				gain.gain.setValueAtTime(0.001, now + start);
				gain.gain.exponentialRampToValueAtTime(0.15, now + start + 0.02);
				gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

				osc.connect(gain);
				gain.connect(ctx.destination);

				osc.start(now + start);
				osc.stop(now + start + dur + 0.01);
			});
		}
	} catch (e) {
		// Silent non-blocking catch on restricted audio policies
	}
}
