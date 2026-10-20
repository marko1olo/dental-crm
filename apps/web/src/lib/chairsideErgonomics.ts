/**
 * chairsideErgonomics.ts — Elite Clinical Ergonomics & Hardware Integration Suite.
 *
 * Implements 4 non-obvious chairside superpowers for desktop runtime and web app:
 * 1. Global Clipboard Image Interception ("Ctrl+V Paste Anywhere") [via chairsideClipboardAndBarcode]
 * 2. Privacy Shield Quick Toggle ("Alt+H / Ctrl+Shift+H / Alt+Р" Show Monitor to Patient)
 * 3. Hardware Barcode & DataMatrix Sniffer ("Честный Знак" Protection) [via chairsideClipboardAndBarcode]
 * 4. Procedural Tactile Acoustic Earcons (Web Audio API synthesis, 0 bytes assets)
 *
 * Constitution: THE_HAMMER_MASTER_PROMPT.md, AGENTS.md, DESIGNER_VISUAL_INQUISITION_BIBLE.md
 */

// ============================================================================
// 1. TACTILE ACOUSTIC EARCONS (Web Audio API Synthesizer)
// ============================================================================

export type TactileEarconType =
	| "save"
	| "norm"
	| "pay"
	| "warning"
	| "scan"
	| "privacy";

let audioCtx: AudioContext | null = null;

function getErgonomicsAudioContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	try {
		const AudioContextClass =
			window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AudioContextClass) return null;
		if (!audioCtx) {
			audioCtx = new AudioContextClass();
		}
		if (audioCtx.state === "suspended") {
			audioCtx.resume().catch(() => {});
		}
		return audioCtx;
	} catch {
		return null;
	}
}

/**
 * Procedural Web Audio Earcons for chairside operations.
 * Guaranteed 0 byte assets, 0 network requests, soft exponential envelope to eliminate audio clicks.
 */
export function playTactileEarcon(type: TactileEarconType): void {
	const ctx = getErgonomicsAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;

		switch (type) {
			case "norm": {
				// 1-клик Норма: Кристальный щелчок подтверждения (A5 880Hz -> C6 1046Hz, 75мс)
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
		// Silent catch for autoplay policy
	}
}

// ============================================================================
// 2. PRIVACY SHIELD QUICK TOGGLE ("Alt+H / Ctrl+Shift+H" Show Monitor to Patient)
// ============================================================================

export const DENTE_PRIVACY_SHIELD_STORAGE_KEY = "dente_patient_privacy_active";
export const DENTE_PRIVACY_SHIELD_LOCKED_KEY = "dente_privacy_shield_locked";
export const DENTE_PRIVACY_SHIELD_ATTR = "data-dente-privacy-shield";

/**
 * Checks whether Patient Privacy Shield is currently active.
 */
export function isPatientPrivacyShieldActive(): boolean {
	if (typeof document === "undefined") return false;
	const isAttrActive =
		document.documentElement.getAttribute(DENTE_PRIVACY_SHIELD_ATTR) === "active" ||
		document.documentElement.getAttribute("data-patient-privacy") === "true";
	if (isAttrActive) return true;
	try {
		return typeof localStorage !== "undefined" && localStorage.getItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY) === "true";
	} catch {
		return false;
	}
}

/**
 * Toggles Patient Privacy Shield state.
 * When active, masks financial debts, wholesale cost prices, and private notes.
 */
export function togglePatientPrivacyShield(forceState?: boolean): boolean {
	if (typeof document === "undefined") return false;

	const currentState = isPatientPrivacyShieldActive();
	const nextState = typeof forceState === "boolean" ? forceState : !currentState;

	if (nextState) {
		document.documentElement.setAttribute(DENTE_PRIVACY_SHIELD_ATTR, "active");
		document.documentElement.setAttribute("data-patient-privacy", "true");
		try {
			localStorage.setItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY, "true");
			sessionStorage.setItem(DENTE_PRIVACY_SHIELD_STORAGE_KEY, "true");
			const candidateNodes = document.querySelectorAll("span, td, div, strong, b, p");
			candidateNodes.forEach((node) => {
				if (
					node.children.length === 0 &&
					node.textContent &&
					/[₽]|руб/i.test(node.textContent) &&
					!node.closest("button, input, textarea, .chairside-toast-card, .chairside-privacy-bottom-badge")
				) {
					node.setAttribute("data-privacy-auto-masked", "true");
				}
			});
		} catch {
			// ignore quota
		}
	} else {
		document.documentElement.removeAttribute(DENTE_PRIVACY_SHIELD_ATTR);
		document.documentElement.removeAttribute("data-patient-privacy");
		try {
			localStorage.removeItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY);
			sessionStorage.removeItem(DENTE_PRIVACY_SHIELD_STORAGE_KEY);
			document.querySelectorAll('[data-privacy-auto-masked="true"]').forEach((node) => {
				node.removeAttribute("data-privacy-auto-masked");
			});
		} catch {
			// ignore quota
		}
	}

	playTactileEarcon("privacy");

	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent<{ active: boolean; timestamp: number }>("dente:privacy-shield-toggled", {
				detail: { active: nextState, timestamp: Date.now() },
				bubbles: true,
			}),
		);
	}

	return nextState;
}

export interface PrivacyShieldHotkeyOptions {
	onToggle?: (active: boolean) => void;
}

/**
 * Global keyboard listener for Alt+H, Alt+Р, Ctrl+Shift+H.
 * Doctor can flip monitor towards patient with 1 hotkey without exposing sensitive figures.
 */
export function setupPrivacyShieldHotkey(options: PrivacyShieldHotkeyOptions = {}): () => void {
	if (typeof window === "undefined") return () => {};

	const handleKeyDown = (e: KeyboardEvent): void => {
		if (e.repeat) return;

		const keyLower = e.key.toLowerCase();
		// Alt+H or Alt+Р (Russian layout) or Ctrl+Shift+H
		const isAltH =
			e.altKey && !e.ctrlKey && !e.metaKey && (keyLower === "h" || keyLower === "р" || e.code === "KeyH");
		const isCtrlShiftH =
			(e.ctrlKey || e.metaKey) && e.shiftKey && (keyLower === "h" || keyLower === "р" || e.code === "KeyH");

		if (isAltH || isCtrlShiftH) {
			e.preventDefault();
			e.stopPropagation();
			const newState = togglePatientPrivacyShield();
			if (options.onToggle) {
				options.onToggle(newState);
			}
		}
	};

	window.addEventListener("keydown", handleKeyDown, { capture: true });
	return () => {
		window.removeEventListener("keydown", handleKeyDown, { capture: true });
	};
}

// ============================================================================
// 3. RE-EXPORTS FROM CLIPBOARD & BARCODE SUBMODULE
// ============================================================================

export {
	MAX_CLIPBOARD_IMAGE_BYTES,
	classifyBarcode,
	setupClipboardImagePaste,
	setupHardwareBarcodeSniffer,
	type BarcodeKind,
	type BarcodeSnifferOptions,
	type ClipboardPasteOptions,
	type PastedImageDetail,
	type ScannedBarcodeDetail,
} from "./chairsideClipboardAndBarcode";
