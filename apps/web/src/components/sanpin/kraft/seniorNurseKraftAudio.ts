/**
 * ============================================================================
 * SENIOR NURSE KRAFT AUDIO FEEDBACK ENGINE (WEB AUDIO API)
 * "БАБУШКА-PROOF" / Звуковая сигнализация стерильности крафт-пакетов
 * ============================================================================
 */

import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";

let sharedAudioContext: AudioContext | null = null;
let idleSuspendTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleKraftAudioIdleSuspend(ctx: AudioContext): void {
	if (idleSuspendTimer) {
		clearTimeout(idleSuspendTimer);
	}
	idleSuspendTimer = setTimeout(() => {
		if (ctx && ctx.state === "running") {
			ctx.suspend().catch(() => {});
		}
		idleSuspendTimer = null;
	}, 5000);
}

export function disposeSeniorNurseKraftAudio(): void {
	if (idleSuspendTimer) {
		clearTimeout(idleSuspendTimer);
		idleSuspendTimer = null;
	}
	if (sharedAudioContext && sharedAudioContext.state !== "closed") {
		sharedAudioContext.close().catch(() => {});
		sharedAudioContext = null;
	}
}

function getAudioContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	try {
		const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AudioCtx) return null;
		if (!sharedAudioContext || sharedAudioContext.state === "closed") {
			sharedAudioContext = new AudioCtx();
		}
		if (idleSuspendTimer) {
			clearTimeout(idleSuspendTimer);
			idleSuspendTimer = null;
		}
		if (sharedAudioContext.state === "suspended") {
			void sharedAudioContext.resume();
		}
		return sharedAudioContext;
	} catch {
		return null;
	}
}

/**
 * Чистый, приятный мажорный звуковой сигнал (Бип-Успех / Стерильно OK)
 * C5 (523 Hz) -> E5 (659 Hz) -> G5 (784 Hz)
 */
export function playSterileSuccessTone(force = false): void {
	if (typeof window === "undefined") return;
	if (!force) {
		try {
			if (!SoundFeedbackService.getInstance().isEnabled()) return;
		} catch {
			return;
		}
	}

	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;
		const tones = [
			{ freq: 523.25, time: now, dur: 0.12 },
			{ freq: 659.25, time: now + 0.08, dur: 0.14 },
			{ freq: 783.99, time: now + 0.16, dur: 0.22 },
		];

		tones.forEach(({ freq, time, dur }) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, time);

			// Smooth attack & decay with comfortable clinic volume
			gain.gain.setValueAtTime(0.001, time);
			gain.gain.exponentialRampToValueAtTime(0.08, time + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(time);
			osc.stop(time + dur);
		});
		scheduleKraftAudioIdleSuspend(ctx);
	} catch (err) {
		console.warn("[Dente Audio] Sterile tone fallback", err);
	}
}

/**
 * Предупреждающий тональный сигнал (Гудок-Ошибка / ПРОСРОЧЕНО!)
 * Мягкий синусоидальный тон с 2 пульсами (220 Hz -> 180 Hz) вместо резкой пилы
 */
export function playExpiredErrorTone(force = false): void {
	if (typeof window === "undefined") return;
	if (!force) {
		try {
			if (!SoundFeedbackService.getInstance().isEnabled()) return;
		} catch {
			return;
		}
	}

	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;
		const pulses = [
			{ time: now, dur: 0.16 },
			{ time: now + 0.2, dur: 0.22 },
		];

		pulses.forEach(({ time, dur }) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sine";
			osc.frequency.setValueAtTime(220, time);
			osc.frequency.linearRampToValueAtTime(180, time + dur);

			gain.gain.setValueAtTime(0.001, time);
			gain.gain.exponentialRampToValueAtTime(0.06, time + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(time);
			osc.stop(time + dur);
		});
		scheduleKraftAudioIdleSuspend(ctx);
	} catch (err) {
		console.warn("[Dente Audio] Expired tone fallback", err);
	}
}
