/**
 * apps/web/src/services/audio/clinicalProceduralAudio.ts
 *
 * DENTE CRM — Процедурный Web Audio API движок клинической акустической и тактильной обратной связи.
 * 4 сигнала: scanner_beep, cashier_kaching, autosave_whisper, somatic_danger_chord.
 */

import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage.js";
import { getSharedAudioContext, resetSharedAudioContext } from "./sharedAudioContext.js";

export type ProceduralSignalType =
	| "scanner_beep"
	| "cashier_kaching"
	| "autosave_whisper"
	| "somatic_danger_chord";

export interface ProceduralSignalEvent {
	signal: ProceduralSignalType;
	timestamp: number;
	durationMs: number;
}

export type ProceduralAudioListener = (event: ProceduralSignalEvent) => void;

// Канонические константы частот и таймингов
export const PROCEDURAL_AUDIO_CONSTANTS = {
	SCANNER_CHIRP_START_HZ: 2200,
	SCANNER_CHIRP_END_HZ: 2600,
	SCANNER_CHIRP_DURATION_S: 0.035, // 35ms
	SCANNER_CHIRP_GAP_S: 0.015, // 15ms пауза между импульсами

	CASHIER_FUNDAMENTAL_HZ: 1200,
	CASHIER_OVERTONE_HZ: 2400,
	CASHIER_DURATION_S: 0.140, // 140ms

	AUTOSAVE_WHISPER_HZ: 1760, // A6
	AUTOSAVE_WHISPER_DURATION_S: 0.030, // 30ms
	AUTOSAVE_WHISPER_MAX_GAIN: 0.05, // Тихий незаметный шелест

	SOMATIC_DANGER_ROOT_HZ: 440.0, // A4
	SOMATIC_DANGER_SECOND_HZ: 466.16, // Bb4 (малая секунда)
	SOMATIC_DANGER_DURATION_S: 0.150, // 150ms
} as const;

export const PROCEDURAL_STORAGE_KEYS = {
	ENABLED: "dente_sound_feedback_enabled",
	VOLUME: "dente_sound_feedback_volume",
	HAPTICS: "dente_sound_feedback_haptics",
} as const;

export class ClinicalProceduralAudioEngine {
	private static instance: ClinicalProceduralAudioEngine | null = null;

	private customAudioContext: AudioContext | null = null;
	private idleSuspendTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly idleTimeoutMs = 5000;

	private enabled = true;
	private volume = 0.7;
	private hapticsEnabled = true;
	private isDisposed = false;

	private listeners = new Set<ProceduralAudioListener>();

	constructor(customAudioContext?: AudioContext | null) {
		if (customAudioContext) {
			this.customAudioContext = customAudioContext;
		}
		this.loadSettings();
	}

	public static getInstance(): ClinicalProceduralAudioEngine {
		if (!ClinicalProceduralAudioEngine.instance) {
			ClinicalProceduralAudioEngine.instance = new ClinicalProceduralAudioEngine();
		}
		return ClinicalProceduralAudioEngine.instance;
	}

	public static resetInstance(): void {
		if (ClinicalProceduralAudioEngine.instance) {
			ClinicalProceduralAudioEngine.instance.dispose();
			ClinicalProceduralAudioEngine.instance = null;
		}
		resetSharedAudioContext();
	}

	private loadSettings(): void {
		const storedEnabled = safeLocalStorageGetItem(PROCEDURAL_STORAGE_KEYS.ENABLED);
		if (storedEnabled !== null) {
			this.enabled = storedEnabled === "true";
		}

		const storedVolume = safeLocalStorageGetItem(PROCEDURAL_STORAGE_KEYS.VOLUME);
		if (storedVolume !== null) {
			const parsed = Number.parseFloat(storedVolume);
			if (!Number.isNaN(parsed)) {
				this.volume = Math.max(0.0, Math.min(1.0, parsed));
			}
		}

		const storedHaptics = safeLocalStorageGetItem(PROCEDURAL_STORAGE_KEYS.HAPTICS);
		if (storedHaptics !== null) {
			this.hapticsEnabled = storedHaptics === "true";
		}
	}

	public getAudioContext(): AudioContext | null {
		if (this.isDisposed) return null;
		if (this.customAudioContext) {
			return this.customAudioContext;
		}
		return getSharedAudioContext();
	}

	public isAudioSupported(): boolean {
		if (this.customAudioContext) return true;
		if (typeof window === "undefined") return false;
		return Boolean(
			window.AudioContext ||
			// biome-ignore lint/suspicious/noExplicitAny: Safari fallback
			(window as any).webkitAudioContext,
		);
	}

	public isEnabled(): boolean {
		return this.enabled;
	}

	public setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		safeLocalStorageSetItem(PROCEDURAL_STORAGE_KEYS.ENABLED, enabled ? "true" : "false", true);
	}

	public getVolume(): number {
		return this.volume;
	}

	public setVolume(volume: number): void {
		const clamped = Math.max(0.0, Math.min(1.0, volume));
		this.volume = clamped;
		safeLocalStorageSetItem(PROCEDURAL_STORAGE_KEYS.VOLUME, clamped.toString(), true);
	}

	public isHapticsEnabled(): boolean {
		return this.hapticsEnabled;
	}

	public setHapticsEnabled(enabled: boolean): void {
		this.hapticsEnabled = enabled;
		safeLocalStorageSetItem(PROCEDURAL_STORAGE_KEYS.HAPTICS, enabled ? "true" : "false", true);
	}

	public subscribe(listener: ProceduralAudioListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notifyListeners(signal: ProceduralSignalType, durationMs: number): void {
		const event: ProceduralSignalEvent = {
			signal,
			timestamp: Date.now(),
			durationMs,
		};
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch {
				// Ignore listener errors
			}
		}
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:procedural-audio-played", { detail: event }),
			);
		}
	}

	private triggerHaptic(pattern: number | number[]): void {
		if (!this.hapticsEnabled) return;
		if (typeof navigator !== "undefined" && "vibrate" in navigator && typeof navigator.vibrate === "function") {
			try {
				navigator.vibrate(pattern);
			} catch {
				// Non-blocking
			}
		}
	}

	private async ensureActive(): Promise<AudioContext | null> {
		const ctx = this.getAudioContext();
		if (!ctx) return null;

		if (this.idleSuspendTimer) {
			clearTimeout(this.idleSuspendTimer);
			this.idleSuspendTimer = null;
		}

		if (ctx.state === "suspended") {
			try {
				await ctx.resume();
			} catch {
				// Non-blocking resume
			}
		}

		return ctx;
	}

	private scheduleIdleSuspend(): void {
		if (this.idleSuspendTimer) {
			clearTimeout(this.idleSuspendTimer);
		}

		this.idleSuspendTimer = setTimeout(() => {
			const ctx = this.getAudioContext();
			if (ctx && ctx.state === "running") {
				ctx.suspend().catch(() => {});
			}
			this.idleSuspendTimer = null;
		}, this.idleTimeoutMs);

		if (this.idleSuspendTimer && typeof (this.idleSuspendTimer as any).unref === "function") {
			(this.idleSuspendTimer as any).unref();
		}
	}

	/**
	 * 1. scanner_beep: двойной чик-чик (2200Hz -> 2600Hz, 35ms)
	 * Считывание штрихкода партии материалов (DataMatrix МДЛП) или браслета пациента.
	 */
	public async playScannerBeep(): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.triggerHaptic([15, 12, 15]);
		this.notifyListeners("scanner_beep", 85);

		const ctx = await this.ensureActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const {
				SCANNER_CHIRP_START_HZ,
				SCANNER_CHIRP_END_HZ,
				SCANNER_CHIRP_DURATION_S,
				SCANNER_CHIRP_GAP_S,
			} = PROCEDURAL_AUDIO_CONSTANTS;

			const masterGain = ctx.createGain();
			const peakMaster = this.volume * 0.35;
			masterGain.connect(ctx.destination);

			// Первый чик: 0 .. 35ms
			const osc1 = ctx.createOscillator();
			const gain1 = ctx.createGain();
			osc1.type = "sine";
			osc1.frequency.setValueAtTime(SCANNER_CHIRP_START_HZ, now);
			osc1.frequency.exponentialRampToValueAtTime(SCANNER_CHIRP_END_HZ, now + SCANNER_CHIRP_DURATION_S);

			gain1.gain.setValueAtTime(0.0001, now);
			gain1.gain.linearRampToValueAtTime(peakMaster, now + 0.003);
			gain1.gain.exponentialRampToValueAtTime(0.0001, now + SCANNER_CHIRP_DURATION_S);

			osc1.connect(gain1);
			gain1.connect(masterGain);
			osc1.start(now);
			osc1.stop(now + SCANNER_CHIRP_DURATION_S + 0.005);

			// Второй чик: 50 .. 85ms
			const t2 = now + SCANNER_CHIRP_DURATION_S + SCANNER_CHIRP_GAP_S;
			const osc2 = ctx.createOscillator();
			const gain2 = ctx.createGain();
			osc2.type = "sine";
			osc2.frequency.setValueAtTime(SCANNER_CHIRP_START_HZ, t2);
			osc2.frequency.exponentialRampToValueAtTime(SCANNER_CHIRP_END_HZ, t2 + SCANNER_CHIRP_DURATION_S);

			gain2.gain.setValueAtTime(0.0001, t2);
			gain2.gain.linearRampToValueAtTime(peakMaster, t2 + 0.003);
			gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + SCANNER_CHIRP_DURATION_S);

			osc2.connect(gain2);
			gain2.connect(masterGain);
			osc2.start(t2);
			osc2.stop(t2 + SCANNER_CHIRP_DURATION_S + 0.005);
		} catch (err) {
			console.warn("[ClinicalProceduralAudio] playScannerBeep error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	/**
	 * 2. cashier_kaching: гармонический кассовый отклик (1200Hz + 2400Hz, 140ms)
	 * Успешная 54-ФЗ фискализация чека или безналичная СБП оплата.
	 */
	public async playCashierKaching(): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.triggerHaptic([30, 20, 40]);
		this.notifyListeners("cashier_kaching", 140);

		const ctx = await this.ensureActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const { CASHIER_FUNDAMENTAL_HZ, CASHIER_OVERTONE_HZ, CASHIER_DURATION_S } =
				PROCEDURAL_AUDIO_CONSTANTS;

			const masterGain = ctx.createGain();
			const peakMaster = this.volume * 0.40;
			masterGain.connect(ctx.destination);

			// Основной тон 1200 Гц (фундаментальный колокольчик)
			const osc1 = ctx.createOscillator();
			const gain1 = ctx.createGain();
			osc1.type = "sine";
			osc1.frequency.setValueAtTime(CASHIER_FUNDAMENTAL_HZ, now);

			gain1.gain.setValueAtTime(0.0001, now);
			gain1.gain.linearRampToValueAtTime(peakMaster * 0.65, now + 0.005);
			gain1.gain.exponentialRampToValueAtTime(0.0001, now + CASHIER_DURATION_S);

			osc1.connect(gain1);
			gain1.connect(masterGain);
			osc1.start(now);
			osc1.stop(now + CASHIER_DURATION_S + 0.01);

			// Октавный обертон 2400 Гц (хрустящий металлический звон монеты)
			const osc2 = ctx.createOscillator();
			const gain2 = ctx.createGain();
			osc2.type = "sine";
			osc2.frequency.setValueAtTime(CASHIER_OVERTONE_HZ, now + 0.008);

			gain2.gain.setValueAtTime(0.0001, now);
			gain2.gain.setValueAtTime(0.0001, now + 0.008);
			gain2.gain.linearRampToValueAtTime(peakMaster * 0.35, now + 0.014);
			gain2.gain.exponentialRampToValueAtTime(0.0001, now + CASHIER_DURATION_S);

			osc2.connect(gain2);
			gain2.connect(masterGain);
			osc2.start(now + 0.008);
			osc2.stop(now + CASHIER_DURATION_S + 0.01);
		} catch (err) {
			console.warn("[ClinicalProceduralAudio] playCashierKaching error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	/**
	 * 3. autosave_whisper: тихий мягкий шелест (1760Hz, спад 30ms, громкость 0.05)
	 * Фоновое сохранение черновика карты 043/у в L1/L2 кэш без отвлечения врача.
	 */
	public async playAutosaveWhisper(): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.notifyListeners("autosave_whisper", 30);

		const ctx = await this.ensureActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const {
				AUTOSAVE_WHISPER_HZ,
				AUTOSAVE_WHISPER_DURATION_S,
				AUTOSAVE_WHISPER_MAX_GAIN,
			} = PROCEDURAL_AUDIO_CONSTANTS;

			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sine";
			osc.frequency.setValueAtTime(AUTOSAVE_WHISPER_HZ, now);

			// Фиксированный шелест с жестким потолком 0.05
			const whisperPeak = Math.min(AUTOSAVE_WHISPER_MAX_GAIN, this.volume * AUTOSAVE_WHISPER_MAX_GAIN);
			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.linearRampToValueAtTime(whisperPeak, now + 0.003);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + AUTOSAVE_WHISPER_DURATION_S);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now);
			osc.stop(now + AUTOSAVE_WHISPER_DURATION_S + 0.005);
		} catch (err) {
			console.warn("[ClinicalProceduralAudio] playAutosaveWhisper error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	/**
	 * 4. somatic_danger_chord: мягкий тревожный интервал (малая секунда 440Hz + 466Hz, спад 150ms)
	 * Клинический стоп-фактор безопасности (критическая аллергия на анестетик / риск анафилаксии).
	 */
	public async playSomaticDangerChord(): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.triggerHaptic([50, 30, 50]);
		this.notifyListeners("somatic_danger_chord", 150);

		const ctx = await this.ensureActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const {
				SOMATIC_DANGER_ROOT_HZ,
				SOMATIC_DANGER_SECOND_HZ,
				SOMATIC_DANGER_DURATION_S,
			} = PROCEDURAL_AUDIO_CONSTANTS;

			// Low-pass фильтр для мягкого, но тревожного окраса
			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.setValueAtTime(800, now);
			filter.Q.setValueAtTime(1.2, now);

			const masterGain = ctx.createGain();
			const peakMaster = this.volume * 0.40;
			masterGain.gain.setValueAtTime(0.0001, now);
			masterGain.gain.linearRampToValueAtTime(peakMaster, now + 0.008);
			masterGain.gain.exponentialRampToValueAtTime(0.0001, now + SOMATIC_DANGER_DURATION_S);

			filter.connect(masterGain);
			masterGain.connect(ctx.destination);

			// Тон 1: A4 (440 Гц)
			const osc1 = ctx.createOscillator();
			osc1.type = "triangle";
			osc1.frequency.setValueAtTime(SOMATIC_DANGER_ROOT_HZ, now);
			osc1.connect(filter);
			osc1.start(now);
			osc1.stop(now + SOMATIC_DANGER_DURATION_S + 0.01);

			// Тон 2: Bb4 (466.16 Гц) — малая секунда, вызывающая биологическое ощущение осторожности
			const osc2 = ctx.createOscillator();
			osc2.type = "triangle";
			osc2.frequency.setValueAtTime(SOMATIC_DANGER_SECOND_HZ, now);
			osc2.connect(filter);
			osc2.start(now);
			osc2.stop(now + SOMATIC_DANGER_DURATION_S + 0.01);
		} catch (err) {
			console.warn("[ClinicalProceduralAudio] playSomaticDangerChord error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	public async playSignal(signal: ProceduralSignalType): Promise<void> {
		switch (signal) {
			case "scanner_beep": return this.playScannerBeep();
			case "cashier_kaching": return this.playCashierKaching();
			case "autosave_whisper": return this.playAutosaveWhisper();
			case "somatic_danger_chord": return this.playSomaticDangerChord();
		}
	}

	public dispose(): void {
		this.isDisposed = true;
		this.listeners.clear();
		if (this.idleSuspendTimer) { clearTimeout(this.idleSuspendTimer); this.idleSuspendTimer = null; }
		if (this.customAudioContext) {
			try {
				if (typeof this.customAudioContext.close === "function") {
					this.customAudioContext.close().catch(() => {});
				}
			} catch { /* Non-blocking */ }
			this.customAudioContext = null;
		}
	}
}

export const clinicalProceduralAudio: ClinicalProceduralAudioEngine = new Proxy(
	{} as ClinicalProceduralAudioEngine,
	{
		get(_target, prop, receiver) {
			const instance = ClinicalProceduralAudioEngine.getInstance();
			const val = Reflect.get(instance, prop, receiver);
			if (typeof val === "function") {
				return val.bind(instance);
			}
			return val;
		},
	},
);
