/**
 * DENTE CRM — Haptics & Clinical Web Audio Feedback (Layer 1)
 *
 * Provides tactile vibration feedback and synthesized soft acoustic tones for clinical operatory.
 */

import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import type {
	HapticFeedbackType,
	ClinicalAudioFeedbackType,
} from "./types";
import { getMobileNativeApi } from "./platform";

/**
 * Safe haptic feedback trigger for touch-first clinical operations.
 * - `light` / `selection`: 15ms tap for tooth formula clicks, status toggles, keypad entries.
 * - `medium`: 35ms pulse for modal transitions, tab switching.
 * - `heavy`: 60ms pulse for destructive confirmations.
 * - `success`: [30ms, 50ms, 30ms] double-tick for DataMatrix/Passport scan, payment confirmation.
 * - `warning`: [40ms, 60ms, 40ms] warning buzz for allergy alerts, unsaved drafts.
 * - `error`: [80ms, 50ms, 80ms, 50ms, 100ms] triple vibration for lockout, wrong PIN, validation failure.
 */
export function triggerHaptic(type: HapticFeedbackType = "light"): void {
	if (typeof window === "undefined") return;

	const api = getMobileNativeApi();
	if (api?.hapticFeedback) {
		try {
			api.hapticFeedback(type);
			return;
		} catch (err: unknown) {
			console.warn("[mobileBridge] native hapticFeedback failed, falling back:", err);
			// Fall through to Web Vibration API
		}
	}

	// Web Vibration API fallback
	if (typeof navigator !== "undefined" && "vibrate" in navigator && typeof navigator.vibrate === "function") {
		try {
			switch (type) {
				case "light":
				case "selection":
					navigator.vibrate(15);
					break;
				case "medium":
				case "impact":
					navigator.vibrate(35);
					break;
				case "heavy":
					navigator.vibrate(60);
					break;
				case "success":
					navigator.vibrate([30, 50, 30]);
					break;
				case "warning":
					navigator.vibrate([40, 60, 40]);
					break;
				case "error":
					navigator.vibrate([80, 50, 80, 50, 100]);
					break;
				default:
					navigator.vibrate(20);
			}
		} catch (err: unknown) {
			console.warn("[mobileBridge] navigator.vibrate failed:", err);
			// Ignore vibration restrictions on web
		}
	}
}

let isAudioMutedState = false;
let audioContextInstance: AudioContext | null = null;

const MUTE_STORAGE_KEY = "dente_clinical_audio_muted";

/**
 * Gets or sets the global clinical audio mute state.
 */
export function isClinicalAudioMuted(): boolean {
	const stored = safeLocalStorageGetItem(MUTE_STORAGE_KEY);
	if (stored !== null) {
		return stored === "true";
	}
	return isAudioMutedState;
}

export function setClinicalAudioMuted(muted: boolean): void {
	isAudioMutedState = muted;
	safeLocalStorageSetItem(MUTE_STORAGE_KEY, String(muted));
}

function getOrCreateAudioContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	const AudioContextClass =
		window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!AudioContextClass) return null;

	if (!audioContextInstance || audioContextInstance.state === "closed") {
		try {
			audioContextInstance = new AudioContextClass();
		} catch (err: unknown) {
			console.warn("[mobileBridge] AudioContext instantiation failed:", err);
			return null;
		}
	}
	if (audioContextInstance.state === "suspended") {
		audioContextInstance.resume().catch((err: unknown) => {
			console.warn("[mobileBridge] audioContextInstance.resume failed:", err);
		});
	}
	return audioContextInstance;
}

/**
 * Synthesizes soft clinical audio cues using pure Web Audio API without external asset requests.
 */
export function playClinicalAudioFeedback(
	type: ClinicalAudioFeedbackType = "scan_success",
): boolean {
	if (isClinicalAudioMuted()) {
		return false;
	}

	const ctx = getOrCreateAudioContext();
	if (!ctx) {
		return false;
	}

	try {
		const now = ctx.currentTime;

		if (type === "scan_success") {
			// 880 Hz (A5), 80ms gentle scan confirmation
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(880, now);

			gain.gain.setValueAtTime(0.001, now);
			gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now);
			osc.stop(now + 0.08);
			return true;
		}

		if (type === "save_success" || type === "pay_success") {
			// Two-tone rising major third chord (C5 523Hz -> E5 659Hz)
			const osc1 = ctx.createOscillator();
			const osc2 = ctx.createOscillator();
			const gain = ctx.createGain();

			osc1.type = "sine";
			osc2.type = "sine";
			osc1.frequency.setValueAtTime(523.25, now);
			osc2.frequency.setValueAtTime(659.25, now + 0.08);

			gain.gain.setValueAtTime(0.001, now);
			gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.15, now + 0.12);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

			osc1.connect(gain);
			osc2.connect(gain);
			gain.connect(ctx.destination);

			osc1.start(now);
			osc1.stop(now + 0.1);
			osc2.start(now + 0.08);
			osc2.stop(now + 0.22);
			return true;
		}

		if (type === "warning" || type === "error") {
			// Double descending warning pulse (330 Hz -> 220 Hz)
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "triangle";
			osc.frequency.setValueAtTime(330, now);
			osc.frequency.setValueAtTime(220, now + 0.09);

			gain.gain.setValueAtTime(0.001, now);
			gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
			gain.gain.setValueAtTime(0.001, now + 0.08);
			gain.gain.exponentialRampToValueAtTime(0.2, now + 0.09);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now);
			osc.stop(now + 0.16);
			return true;
		}

		if (type === "click") {
			// 1046 Hz micro-tap, 25ms
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(1046, now);

			gain.gain.setValueAtTime(0.001, now);
			gain.gain.exponentialRampToValueAtTime(0.1, now + 0.005);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now);
			osc.stop(now + 0.025);
			return true;
		}

		return false;
	} catch (err: unknown) {
		console.warn("[mobileBridge] playClinicalAudioFeedback synthesis failed:", err);
		return false;
	}
}
