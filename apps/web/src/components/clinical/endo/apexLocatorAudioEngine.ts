/**
 * DENTE Dental CRM — Electronic Apex Locator (EAL) Telemetry & Audio Engine
 *
 * Implements:
 * - Precise distance-to-apex mapping across standard clinical zones:
 *   1. Coronal / Approaching: 2.0 – 1.0 mm (Blue / Cyan, slow intermittent beeps)
 *   2. Apical: 0.9 – 0.1 mm (Yellow-Green, rapidly accelerating pulse)
 *   3. Apex / Foramen: 0.0 mm (Vibrant Green, continuous 1800 Hz tone — Target WL!)
 *   4. Over Apex / Perforation: < 0.0 mm / Over (Flashing Red, urgent dual-tone siren)
 * - Safe Web Audio API generator with browser autoplay handling & headless fallback
 * - Probe movement simulation & precision calibration helpers
 */

export type ApexZone = "far" | "coronal" | "apical" | "apex" | "over";

export interface ApexTelemetryState {
	readonly distanceMm: number; // e.g. 2.5, 1.5, 0.5, 0.0, -0.4 (over)
	readonly zone: ApexZone;
	readonly zoneLabelRu: string;
	readonly zoneDescriptionRu: string;
	readonly zoneColorHex: string;
	readonly zoneBadgeClass: string;
	readonly audioFrequencyHz: number;
	readonly beepIntervalMs: number; // Interval between beeps (0 if continuous)
	readonly isContinuousTone: boolean;
	readonly isAlarmSiren: boolean;
	readonly isApexReached: boolean; // distance === 0.0
	readonly isOverApex: boolean; // distance < 0.0 or marked over
	readonly progressPercent: number; // 0% (at 2.0+ mm) to 100% (at 0.0 mm), >100% (over)
	readonly guidanceTextRu: string;
}

/**
 * Maps a numeric distance reading in millimeters to the clinical Apex Locator telemetry state.
 *
 * Distance conventions:
 * - >= 2.0 mm: Coronal / Far (Вне апикальной зоны)
 * - 1.9 - 1.0 mm: Coronal approaching (Вход в апикальную треть)
 * - 0.9 - 0.1 mm: Apical zone (Приближение к физиологическому сужению)
 * - 0.0 mm: APEX (Физиологический апекс / Апикальный упор / Foramen apicale)
 * - < 0.0 mm: OVER (Выход файла за пределы верхушки корня в периодонт)
 */
export function evaluateApexDistance(distanceMm: number): ApexTelemetryState {
	const roundedDist = Math.round(distanceMm * 10) / 10;

	if (roundedDist < -0.01) {
		// Over apex (Perforation / Overextension)
		const overAmount = Math.abs(roundedDist);
		return {
			distanceMm: roundedDist,
			zone: "over",
			zoneLabelRu: `OVER +${overAmount.toFixed(1)} мм (ЗА АПЕКСОМ!)`,
			zoneDescriptionRu: "Внимание! Выход инструмента за пределы верхушки корня в ткани периодонта.",
			zoneColorHex: "#ef4444",
			zoneBadgeClass: "bg-red-500 text-white font-bold animate-pulse",
			audioFrequencyHz: 2200,
			beepIntervalMs: 80,
			isContinuousTone: false,
			isAlarmSiren: true,
			isApexReached: false,
			isOverApex: true,
			progressPercent: Math.min(130, 100 + Math.round(overAmount * 30)),
			guidanceTextRu: "Остановитесь! Немедленно подтяните инструмент назад на 0.5–1.0 мм до отметки 0.0.",
		};
	}

	if (Math.abs(roundedDist) <= 0.05) {
		// Exact Apex 0.0
		return {
			distanceMm: 0.0,
			zone: "apex",
			zoneLabelRu: "APEX 0.0 (Апикальный упор)",
			zoneDescriptionRu: "Физиологическое апикальное отверстие достигнуто. Фиксация рабочей длины (WL).",
			zoneColorHex: "#22c55e",
			zoneBadgeClass: "bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30",
			audioFrequencyHz: 1800,
			beepIntervalMs: 0,
			isContinuousTone: true,
			isAlarmSiren: false,
			isApexReached: true,
			isOverApex: false,
			progressPercent: 100,
			guidanceTextRu: "Оптимальная точка рабочей длины. Зафиксируйте стоппер на файле по анатомическому ориентиру.",
		};
	}

	if (roundedDist <= 0.95) {
		// Apical Zone: 0.9 mm to 0.1 mm
		// Calculate frequency: from 1000 Hz at 0.9 mm to 1600 Hz at 0.1 mm
		// Calculate beep interval: from 400 ms (2.5 Hz) at 0.9 mm to 70 ms (14 Hz) at 0.1 mm
		const fraction = (0.9 - roundedDist) / 0.8; // 0 at 0.9, 1.0 at 0.1
		const freq = Math.round(1000 + fraction * 600);
		const interval = Math.round(400 - fraction * 330);
		const progress = Math.round(50 + fraction * 48);

		return {
			distanceMm: roundedDist,
			zone: "apical",
			zoneLabelRu: `0.${Math.round(roundedDist * 10)} (Апикальная зона)`,
			zoneDescriptionRu: "Апикальная треть корневого канала. Плавное продвижение инструмента.",
			zoneColorHex: "#eab308",
			zoneBadgeClass: "bg-amber-500 text-white font-semibold",
			audioFrequencyHz: freq,
			beepIntervalMs: interval,
			isContinuousTone: false,
			isAlarmSiren: false,
			isApexReached: false,
			isOverApex: false,
			progressPercent: progress,
			guidanceTextRu: "Медленное продвижение с легким апикальным давлением до непрерывного сигнала 0.0.",
		};
	}

	if (roundedDist <= 2.05) {
		// Coronal approaching: 2.0 mm to 1.0 mm
		const fraction = (2.0 - roundedDist) / 1.0; // 0 at 2.0, 1.0 at 1.0
		const freq = Math.round(750 + fraction * 250);
		const interval = Math.round(700 - fraction * 250);
		const progress = Math.round(15 + fraction * 35);

		return {
			distanceMm: roundedDist,
			zone: "coronal",
			zoneLabelRu: `${roundedDist.toFixed(1)} мм (Коронковая зона)`,
			zoneDescriptionRu: "Средняя / верхняя треть канала. Файл приближается к апикальной зоне.",
			zoneColorHex: "#3b82f6",
			zoneBadgeClass: "bg-blue-500 text-white font-medium",
			audioFrequencyHz: freq,
			beepIntervalMs: interval,
			isContinuousTone: false,
			isAlarmSiren: false,
			isApexReached: false,
			isOverApex: false,
			progressPercent: progress,
			guidanceTextRu: "Канал проходим. Продвигайтесь глубже к апикальному сужению.",
		};
	}

	// Far (> 2.0 mm)
	return {
		distanceMm: roundedDist,
		zone: "far",
		zoneLabelRu: `> 2.0 мм (${roundedDist.toFixed(1)} мм)`,
		zoneDescriptionRu: "Файл находится в коронковой части канала.",
		zoneColorHex: "#64748b",
		zoneBadgeClass: "bg-slate-400 text-white",
		audioFrequencyHz: 600,
		beepIntervalMs: 1200,
		isContinuousTone: false,
		isAlarmSiren: false,
		isApexReached: false,
		isOverApex: false,
		progressPercent: Math.max(0, Math.round((5.0 - roundedDist) * 5)),
		guidanceTextRu: "Введение эндодонтического файла в устье канала.",
	};
}

/**
 * Web Audio Engine for Electronic Apex Locator sound synthesis
 */
export class ApexLocatorAudioEngine {
	private audioCtx: AudioContext | null = null;
	private oscillator: OscillatorNode | null = null;
	private gainNode: GainNode | null = null;
	private isRunning = false;
	private isMuted = false;
	private volume = 0.3; // Safe default volume
	private beepTimer: ReturnType<typeof setInterval> | null = null;
	private currentTelemetry: ApexTelemetryState = evaluateApexDistance(2.0);

	constructor() {
		// Lazy init on first user interaction
	}

	public init(): boolean {
		if (typeof window === "undefined") return false;
		try {
			const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (!AudioContextClass) return false;

			if (!this.audioCtx) {
				this.audioCtx = new AudioContextClass();
			}

			if (this.audioCtx.state === "suspended") {
				void this.audioCtx.resume();
			}

			return true;
		} catch {
			return false;
		}
	}

	public start(): void {
		if (this.isRunning) return;
		this.init();
		this.isRunning = true;
		this.applyTelemetrySound();
	}

	public stop(): void {
		this.isRunning = false;
		this.clearBeepSchedule();
		this.stopOscillator();
	}

	public setMuted(muted: boolean): void {
		this.isMuted = muted;
		if (this.gainNode && this.audioCtx) {
			this.gainNode.gain.setValueAtTime(muted ? 0 : this.volume, this.audioCtx.currentTime);
		}
	}

	public setVolume(vol: number): void {
		this.volume = Math.max(0, Math.min(1, vol));
		if (this.gainNode && this.audioCtx && !this.isMuted) {
			this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
		}
	}

	public updateDistance(distanceMm: number): ApexTelemetryState {
		this.currentTelemetry = evaluateApexDistance(distanceMm);
		if (this.isRunning) {
			this.applyTelemetrySound();
		}
		return this.currentTelemetry;
	}

	public getCurrentTelemetry(): ApexTelemetryState {
		return this.currentTelemetry;
	}

	private applyTelemetrySound(): void {
		if (!this.isRunning || typeof window === "undefined" || !this.audioCtx) return;

		this.clearBeepSchedule();

		if (this.isMuted) {
			this.stopOscillator();
			return;
		}

		if (this.audioCtx.state === "suspended") {
			void this.audioCtx.resume();
		}

		const telemetry = this.currentTelemetry;

		if (telemetry.isContinuousTone) {
			// Continuous steady tone on APEX 0.0
			this.playTone(telemetry.audioFrequencyHz, "sine");
		} else if (telemetry.isAlarmSiren) {
			// Alternating high/low warble siren on OVER
			let stateHigh = true;
			this.playShortBeep(2200, 50, "sawtooth");
			this.beepTimer = setInterval(() => {
				stateHigh = !stateHigh;
				this.playShortBeep(stateHigh ? 2200 : 1200, 50, "sawtooth");
			}, telemetry.beepIntervalMs);
		} else {
			// Periodic short beeps
			this.playShortBeep(telemetry.audioFrequencyHz, 45, "sine");
			this.beepTimer = setInterval(() => {
				this.playShortBeep(telemetry.audioFrequencyHz, 45, "sine");
			}, telemetry.beepIntervalMs);
		}
	}

	private playTone(frequencyHz: number, type: OscillatorType = "sine"): void {
		if (!this.audioCtx) return;
		this.stopOscillator();

		try {
			const osc = this.audioCtx.createOscillator();
			const gain = this.audioCtx.createGain();

			osc.type = type;
			osc.frequency.setValueAtTime(frequencyHz, this.audioCtx.currentTime);

			const effectiveVol = this.isMuted ? 0 : this.volume;
			gain.gain.setValueAtTime(effectiveVol, this.audioCtx.currentTime);

			osc.connect(gain);
			gain.connect(this.audioCtx.destination);

			osc.start();
			this.oscillator = osc;
			this.gainNode = gain;
		} catch {
			// Audio context failure gracefully handled
		}
	}

	private playShortBeep(frequencyHz: number, durationMs: number, type: OscillatorType = "sine"): void {
		if (!this.audioCtx || this.isMuted) return;

		try {
			const osc = this.audioCtx.createOscillator();
			const gain = this.audioCtx.createGain();

			const now = this.audioCtx.currentTime;
			const durationSec = durationMs / 1000;

			osc.type = type;
			osc.frequency.setValueAtTime(frequencyHz, now);

			// Envelope for soft click / beep
			const effectiveVol = this.volume;
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(effectiveVol, now + 0.005);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

			osc.connect(gain);
			gain.connect(this.audioCtx.destination);

			osc.start(now);
			osc.stop(now + durationSec + 0.01);
		} catch {
			// Audio context failure gracefully handled
		}
	}

	private stopOscillator(): void {
		if (this.oscillator) {
			try {
				this.oscillator.stop();
				this.oscillator.disconnect();
			} catch {
				// already stopped
			}
			this.oscillator = null;
		}
		if (this.gainNode) {
			try {
				this.gainNode.disconnect();
			} catch {
				// ignore
			}
			this.gainNode = null;
		}
	}

	private clearBeepSchedule(): void {
		if (this.beepTimer !== null) {
			clearInterval(this.beepTimer);
			this.beepTimer = null;
		}
	}

	public destroy(): void {
		this.stop();
		if (this.audioCtx) {
			try {
				void this.audioCtx.close();
			} catch {
				// ignore
			}
			this.audioCtx = null;
		}
	}
}
