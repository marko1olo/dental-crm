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

export type TactileEarconType =
	| "save"
	| "norm"
	| "pay"
	| "warning"
	| "scan"
	| "privacy";

/**
 * Procedural Web Audio Earcons for chairside operations:
 * - 'save': affirmative rising chime on visit / draft commit
 * - 'norm': crystal harmonic chime on 1-click physiological norm
 * - 'pay': golden major triad chime on fiscal checkout / payment
 * - 'warning': soft non-intrusive dual pulse on threshold alert
 * - 'scan': high-frequency laser barcode chirp on 2D DataMatrix decode
 * - 'privacy': soft shutter/aperture tone on patient privacy shield toggle
 */
export function playTactileEarcon(type: TactileEarconType): void {
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;

		switch (type) {
			case "norm": {
				// 1-клик Норма: Кристальный, благозвучный щелчок подтверждения (A5 880Hz -> C6 1046Hz, 75мс)
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(880, now);
				osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.05);

				gain.gain.setValueAtTime(0.001, now);
				gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + 0.08);
				break;
			}
			case "save": {
				// Сохранение визита: Восходящий двухтональный аккорд надежности (C5 523Hz -> G5 784Hz)
				const tones = [
					{ freq: 523.25, start: 0, dur: 0.08, vol: 0.12 },
					{ freq: 783.99, start: 0.06, dur: 0.16, vol: 0.14 },
				];
				tones.forEach(({ freq, start, dur, vol }) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = "sine";
					osc.frequency.setValueAtTime(freq, now + start);

					gain.gain.setValueAtTime(0.001, now + start);
					gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.015);
					gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.start(now + start);
					osc.stop(now + start + dur + 0.01);
				});
				break;
			}
			case "pay": {
				// Фиксация оплаты: Мажорный золотой перезвон транзакции (E5 659Hz -> G5 784Hz -> C6 1046Hz)
				const tones = [
					{ freq: 659.25, start: 0, dur: 0.07, vol: 0.10 },
					{ freq: 783.99, start: 0.05, dur: 0.09, vol: 0.12 },
					{ freq: 1046.5, start: 0.11, dur: 0.22, vol: 0.15 },
				];
				tones.forEach(({ freq, start, dur, vol }) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = "sine";
					osc.frequency.setValueAtTime(freq, now + start);

					gain.gain.setValueAtTime(0.001, now + start);
					gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.015);
					gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.start(now + start);
					osc.stop(now + start + dur + 0.01);
				});
				break;
			}
			case "scan": {
				// Лазерный сканер штрихкода: Ультракороткий медицинский чирп (1800Hz -> 2400Hz, 45мс)
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(1800, now);
				osc.frequency.exponentialRampToValueAtTime(2400, now + 0.035);

				gain.gain.setValueAtTime(0.001, now);
				gain.gain.exponentialRampToValueAtTime(0.12, now + 0.008);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + 0.05);
				break;
			}
			case "privacy": {
				// Privacy Shield: Мягкий звук защитной диафрагмы/шторки (D5 587Hz -> A4 440Hz, 100мс)
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(587.33, now);
				osc.frequency.exponentialRampToValueAtTime(440, now + 0.09);

				gain.gain.setValueAtTime(0.001, now);
				gain.gain.exponentialRampToValueAtTime(0.11, now + 0.015);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + 0.11);
				break;
			}
			case "warning": {
				// Предупреждение: Мягкий двойной импульс (392Hz -> 330Hz)
				const tones = [
					{ freq: 392, start: 0, dur: 0.08, vol: 0.12 },
					{ freq: 329.63, start: 0.08, dur: 0.12, vol: 0.12 },
				];
				tones.forEach(({ freq, start, dur, vol }) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					osc.type = "triangle";
					osc.frequency.setValueAtTime(freq, now + start);

					gain.gain.setValueAtTime(0.001, now + start);
					gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.015);
					gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.start(now + start);
					osc.stop(now + start + dur + 0.01);
				});
				break;
			}
		}
	} catch {
		// Silent non-blocking catch on restricted audio policies
	}
}

