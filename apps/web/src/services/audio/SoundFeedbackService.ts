/**
 * SoundFeedbackService.ts — Нативный аппаратный синтезатор звуковых эффектов и тактильной отдачи (Haptics)
 * для работы врача-стоматолога в перчатках (DENTE CRM).
 *
 * ИНВАРИАНТЫ:
 * 1. Чистый Web Audio API (AudioContext + OscillatorNode + BiquadFilterNode + GainNode).
 *    - НОЛЬ внешних mp3/wav файлов — нулевой трафик, мгновенный отклик (<2ms), полная автономность.
 * 2. Аппаратные пресеты звуков:
 *    - `playMicStart()`: мягкий восходящий тон (880Hz -> 1760Hz, 80ms, sine, fade-out) — старт микрофона.
 *    - `playMicStop()`: нисходящий тон (1760Hz -> 440Hz, 80ms, sine) — выключение микрофона.
 *    - `playSpeechCaptured()`: короткий мягкий клик (1200Hz, 40ms, soft exponential decay) — захват речи VAD.
 *    - `playActionSuccess()`: мажорный медицинский аккорд (C6 1046.5Hz, E6 1318.5Hz, G6 1568.0Hz, 120ms) — действие сохранено.
 *    - `playWarningAlert()`: низкий двойной предупреждающий тон (220Hz + 180Hz, 150ms, sawtooth filtered) — аллергия / конфликт.
 * 3. Энергоэффективность и безопасность (Battery & Autoplay Safe):
 *    - Ленивая инициализация AudioContext по первому пользовательскому жесту.
 *    - Автоматический suspend() после 5 секунд бездействия для экономии батареи планшета/ноутбука.
 *    - Мгновенный resume() перед воспроизведением.
 * 4. Настройки и персистентность:
 *    - Master Volume (0.0 .. 1.0) и переключатель звуков в localStorage.
 *    - Вибрация (Haptic feedback) через navigator.vibrate при наличии поддержки устройства.
 */

import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";

export type SoundEffectType =
	| "mic_start"
	| "mic_stop"
	| "speech_captured"
	| "action_success"
	| "warning_alert"
	| "emergency_alarm"
	| "metronome_click";

export interface SoundFeedbackConfig {
	enabled: boolean;
	volume: number; // 0.0 to 1.0
	hapticsEnabled: boolean;
}

export const SOUND_STORAGE_KEYS = {
	ENABLED: "dente_sound_feedback_enabled",
	VOLUME: "dente_sound_feedback_volume",
	HAPTICS: "dente_sound_feedback_haptics",
} as const;

// Канонические частоты мажорного медицинского трезвучия C6-E6-G6
export const CHORD_C6_HZ = 1046.5;
export const CHORD_E6_HZ = 1318.51;
export const CHORD_G6_HZ = 1567.98;

export class SoundFeedbackService {
	private static instance: SoundFeedbackService | null = null;

	private audioContext: AudioContext | null = null;
	private idleSuspendTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly idleTimeoutMs = 5000;

	private enabled = false;
	private volume = 0.0;
	private hapticsEnabled = true;
	private isDisposed = false;

	constructor(customAudioContext?: AudioContext | null) {
		if (customAudioContext) {
			this.audioContext = customAudioContext;
		}
		this.loadSettings();
	}

	public static getInstance(): SoundFeedbackService {
		if (!SoundFeedbackService.instance) {
			SoundFeedbackService.instance = new SoundFeedbackService();
		}
		return SoundFeedbackService.instance;
	}

	/**
	 * Сброс синглтона (для изолированных unit-тестов)
	 */
	public static resetInstance(): void {
		if (SoundFeedbackService.instance) {
			SoundFeedbackService.instance.dispose();
			SoundFeedbackService.instance = null;
		}
	}

	/**
	 * Загрузка сохраненных параметров громкости и доступности звуков
	 */
	private loadSettings(): void {
		const storedEnabled = safeLocalStorageGetItem(SOUND_STORAGE_KEYS.ENABLED);
		if (storedEnabled !== null) {
			this.enabled = storedEnabled === "true";
		}

		const storedVolume = safeLocalStorageGetItem(SOUND_STORAGE_KEYS.VOLUME);
		if (storedVolume !== null) {
			const parsed = Number.parseFloat(storedVolume);
			if (!Number.isNaN(parsed)) {
				this.volume = Math.max(0.0, Math.min(1.0, parsed));
			}
		}

		const storedHaptics = safeLocalStorageGetItem(SOUND_STORAGE_KEYS.HAPTICS);
		if (storedHaptics !== null) {
			this.hapticsEnabled = storedHaptics === "true";
		}
	}

	/**
	 * Получение или ленивая инициализация AudioContext
	 */
	public getAudioContext(): AudioContext | null {
		if (this.isDisposed) return null;

		if (!this.audioContext && typeof window !== "undefined") {
			const AudioCtxClass =
				window.AudioContext ||
				// biome-ignore lint/suspicious/noExplicitAny: webkitAudioContext fallback for Safari
				(window as any).webkitAudioContext;

			if (AudioCtxClass) {
				try {
					this.audioContext = new AudioCtxClass();
				} catch (err) {
					console.warn("[SoundFeedbackService] Failed to initialize AudioContext:", err);
				}
			}
		}

		return this.audioContext;
	}

	/**
	 * Проверка поддержки Web Audio API в текущей среде
	 */
	public isAudioSupported(): boolean {
		if (this.audioContext) return true;
		if (typeof window === "undefined") return false;
		return Boolean(
			window.AudioContext ||
			// biome-ignore lint/suspicious/noExplicitAny: webkitAudioContext fallback
			(window as any).webkitAudioContext,
		);
	}

	public isEnabled(): boolean {
		return this.enabled;
	}

	public setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		safeLocalStorageSetItem(
			SOUND_STORAGE_KEYS.ENABLED,
			enabled ? "true" : "false",
		);
	}

	public getVolume(): number {
		return this.volume;
	}

	public setVolume(volume: number): void {
		const clamped = Math.max(0.0, Math.min(1.0, volume));
		this.volume = clamped;
		safeLocalStorageSetItem(
			SOUND_STORAGE_KEYS.VOLUME,
			clamped.toString(),
		);
	}

	public isHapticsEnabled(): boolean {
		return this.hapticsEnabled;
	}

	public setHapticsEnabled(enabled: boolean): void {
		this.hapticsEnabled = enabled;
		safeLocalStorageSetItem(
			SOUND_STORAGE_KEYS.HAPTICS,
			enabled ? "true" : "false",
		);
	}

	/**
	 * Тактильная вибрация (Haptics)
	 */
	private triggerHaptic(pattern: number | number[]): void {
		if (!this.hapticsEnabled) return;
		if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
			try {
				navigator.vibrate(pattern);
			} catch {}
		}
	}

	/**
	 * Пробуждение аудиоконтекста и сброс таймера засыпания
	 */
	private async ensureContextActive(): Promise<AudioContext | null> {
		const ctx = this.getAudioContext();
		if (!ctx) return null;

		if (this.idleSuspendTimer) {
			clearTimeout(this.idleSuspendTimer);
			this.idleSuspendTimer = null;
		}

		if (ctx.state === "suspended") {
			try {
				await ctx.resume();
			} catch (err) {
				console.warn("[SoundFeedbackService] AudioContext resume blocked:", err);
			}
		}

		return ctx;
	}

	/**
	 * Планирование перевода AudioContext в режим сна (suspend) для экономии заряда
	 */
	private scheduleIdleSuspend(): void {
		if (this.idleSuspendTimer) {
			clearTimeout(this.idleSuspendTimer);
		}

		this.idleSuspendTimer = setTimeout(() => {
			if (this.audioContext && this.audioContext.state === "running") {
				this.audioContext.suspend().catch(() => {});
			}
			this.idleSuspendTimer = null;
		}, this.idleTimeoutMs);
		if (this.idleSuspendTimer && typeof (this.idleSuspendTimer as any).unref === "function") {
			(this.idleSuspendTimer as any).unref();
		}
	}

	/**
	 * 1. playMicStart(): мягкий высокий тон (880Hz -> 1760Hz, 80ms, sine, fade-out)
	 * Подтверждение включения микрофона ДЕНТЫ.
	 */
	public async playMicStart(): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.triggerHaptic(30);

		const ctx = await this.ensureContextActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const duration = 0.08; // 80ms

			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sine";
			osc.frequency.setValueAtTime(880, now);
			osc.frequency.exponentialRampToValueAtTime(1760, now + duration);

			const peakGain = this.volume * 0.35;
			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.linearRampToValueAtTime(peakGain, now + 0.008);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now);
			osc.stop(now + duration + 0.01);
		} catch (err) {
			console.warn("[SoundFeedbackService] playMicStart error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	/**
	 * 2. playMicStop(): нисходящий тон (1760Hz -> 440Hz, 80ms, sine)
	 * Микрофон выключен.
	 */
	public async playMicStop(): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.triggerHaptic(20);

		const ctx = await this.ensureContextActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const duration = 0.08; // 80ms

			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sine";
			osc.frequency.setValueAtTime(1760, now);
			osc.frequency.exponentialRampToValueAtTime(440, now + duration);

			const peakGain = this.volume * 0.3;
			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.linearRampToValueAtTime(peakGain, now + 0.006);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now);
			osc.stop(now + duration + 0.01);
		} catch (err) {
			console.warn("[SoundFeedbackService] playMicStop error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	/**
	 * 3. playSpeechCaptured(): короткий мягкий клик (1200Hz, 40ms, soft exponential decay)
	 * Фраза принята VAD / промежуточный речевой токен зафиксирован.
	 */
	public async playSpeechCaptured(): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.triggerHaptic(15);

		const ctx = await this.ensureContextActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const duration = 0.04; // 40ms

			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sine";
			osc.frequency.setValueAtTime(1200, now);

			const peakGain = this.volume * 0.2;
			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.linearRampToValueAtTime(peakGain, now + 0.004);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now);
			osc.stop(now + duration + 0.005);
		} catch (err) {
			console.warn("[SoundFeedbackService] playSpeechCaptured error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	/**
	 * 4. playActionSuccess(): красивый мажорный медицинский аккорд (C6-E6-G6, 120ms)
	 * Действие применено / статус зуба сохранен / команда выполнена.
	 */
	public async playActionSuccess(): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.triggerHaptic([40, 30, 40]);

		const ctx = await this.ensureContextActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const duration = 0.12; // 120ms
			const frequencies = [CHORD_C6_HZ, CHORD_E6_HZ, CHORD_G6_HZ];

			const masterGain = ctx.createGain();
			const peakMaster = this.volume * 0.4;
			masterGain.gain.setValueAtTime(0.0001, now);
			masterGain.gain.linearRampToValueAtTime(peakMaster, now + 0.01);
			masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
			masterGain.connect(ctx.destination);

			for (let i = 0; i < frequencies.length; i++) {
				const freq = frequencies[i] ?? CHORD_C6_HZ;
				const osc = ctx.createOscillator();
				const noteGain = ctx.createGain();

				osc.type = "sine";
				osc.frequency.setValueAtTime(freq, now);

				// Небольшое арпеджио-смещение на 15мс для кристальной прозрачности
				const noteOffset = i * 0.015;
				const voiceGain = 0.33;

				noteGain.gain.setValueAtTime(0.0001, now);
				noteGain.gain.setValueAtTime(0.0001, now + noteOffset);
				noteGain.gain.linearRampToValueAtTime(voiceGain, now + noteOffset + 0.006);
				noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

				osc.connect(noteGain);
				noteGain.connect(masterGain);

				osc.start(now + noteOffset);
				osc.stop(now + duration + 0.01);
			}
		} catch (err) {
			console.warn("[SoundFeedbackService] playActionSuccess error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	/**
	 * 5. playWarningAlert(): низкий двойной предупреждающий тон (220Hz + 180Hz, 150ms, sawtooth filtered)
	 * Аллергия в анамнезе / DDI конфликт препаратов / блокирующее правило.
	 */
	public async playWarningAlert(): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.triggerHaptic([60, 40, 60]);

		const ctx = await this.ensureContextActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const duration = 0.15; // 150ms

			// Low-pass фильтр для сглаживания резкости пилы (медицинский строгий тембр)
			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.setValueAtTime(650, now);
			filter.Q.setValueAtTime(1.5, now);

			const masterGain = ctx.createGain();
			const peakMaster = this.volume * 0.45;

			// Двойной пульсирующий конверт (2 предупреждающих импульса)
			masterGain.gain.setValueAtTime(0.0001, now);
			// Импульс 1: 0..60ms
			masterGain.gain.linearRampToValueAtTime(peakMaster, now + 0.01);
			masterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
			// Пауза 60..75ms
			masterGain.gain.setValueAtTime(0.0001, now + 0.075);
			// Импульс 2: 75..150ms
			masterGain.gain.linearRampToValueAtTime(peakMaster, now + 0.085);
			masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

			filter.connect(masterGain);
			masterGain.connect(ctx.destination);

			// Два взаимоусиливающих осциллятора (220Hz и 180Hz)
			const freqs = [220, 180];
			for (const freq of freqs) {
				const osc = ctx.createOscillator();
				osc.type = "sawtooth";
				osc.frequency.setValueAtTime(freq, now);
				osc.connect(filter);
				osc.start(now);
				osc.stop(now + duration + 0.01);
			}
		} catch (err) {
			console.warn("[SoundFeedbackService] playWarningAlert error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	/**
	 * Универсальный вызов звука по его типу
	 */
	public async playSound(type: SoundEffectType): Promise<void> {
		switch (type) {
			case "mic_start":
				return this.playMicStart();
			case "mic_stop":
				return this.playMicStop();
			case "speech_captured":
				return this.playSpeechCaptured();
			case "action_success":
				return this.playActionSuccess();
			case "warning_alert":
				return this.playWarningAlert();
			case "emergency_alarm":
				return this.playEmergencyAlarm();
			case "metronome_click":
				return this.playMetronomeClick();
		}
	}

	/**
	 * 6. playEmergencyAlarm(): срочный 2-тональный сигнал тревоги (960Hz / 770Hz)
	 * Неотложное состояние: анафилаксия, LAST-токсичность, клиническая смерть.
	 */
	public async playEmergencyAlarm(): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.triggerHaptic([100, 50, 100, 50, 200]);

		const ctx = await this.ensureContextActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const duration = 0.35; // 350ms

			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(960, now);
			osc.frequency.setValueAtTime(960, now + 0.15);
			osc.frequency.setValueAtTime(770, now + 0.16);
			osc.frequency.setValueAtTime(770, now + duration);

			const peakGain = this.volume * 0.5;
			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.linearRampToValueAtTime(peakGain, now + 0.02);
			gain.gain.setValueAtTime(peakGain, now + duration - 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now);
			osc.stop(now + duration + 0.01);
		} catch (err) {
			console.warn("[SoundFeedbackService] playEmergencyAlarm error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	/**
	 * 7. playMetronomeClick(): четкий метроном 100-120 bpm для СЛР (непрямой массаж сердца)
	 */
	public async playMetronomeClick(accent = false): Promise<void> {
		if (!this.enabled || this.volume <= 0) return;
		this.triggerHaptic(accent ? 35 : 15);

		const ctx = await this.ensureContextActive();
		if (!ctx) return;

		try {
			const now = ctx.currentTime;
			const duration = 0.03; // 30ms

			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sine";
			osc.frequency.setValueAtTime(accent ? 1600 : 1000, now);
			osc.frequency.exponentialRampToValueAtTime(300, now + duration);

			const peakGain = this.volume * (accent ? 0.45 : 0.25);
			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.linearRampToValueAtTime(peakGain, now + 0.002);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now);
			osc.stop(now + duration + 0.005);
		} catch (err) {
			console.warn("[SoundFeedbackService] playMetronomeClick error:", err);
		} finally {
			this.scheduleIdleSuspend();
		}
	}

	/**
	 * Очистка ресурсов и остановка таймеров
	 */
	public dispose(): void {
		this.isDisposed = true;
		if (this.idleSuspendTimer) {
			clearTimeout(this.idleSuspendTimer);
			this.idleSuspendTimer = null;
		}
		if (this.audioContext) {
			try {
				this.audioContext.close().catch(() => {});
			} catch {}
			this.audioContext = null;
		}
	}
}

export const soundFeedback = SoundFeedbackService.getInstance();
