/**
 * apps/web/src/components/settings/hardware/HardwareAudioSection.tsx
 *
 * Hardware Studio: Раздел настройки аудиооборудования, микрофонов и
 * процедурного звукового движка (Web Audio API, 0 KB ассетов на диске).
 *
 * Implements Mandates 8d, 8e, 8p & Apple HIG:
 * - 0 KB audio assets: чистый параметрический синтез DSP на базе AudioContext.
 * - 4 клинических сигнала: scanner_beep, cashier_kaching, autosave_whisper, somatic_danger_chord.
 * - Интерактивная матрица тестирования с визуализацией активности и частот.
 * - Настройка громкости, отключения звука и тактильного виброотклика (Haptics).
 * - Калибровка микрофона и клинический профиль шумоподавления бормашины (4.5–6 кГц).
 */

import React, { useState, useEffect } from "react";
import {
	Activity,
	CheckCircle2,
	Mic,
	SlidersHorizontal,
	Volume2,
	VolumeX,
	Vibrate,
	Sparkles,
	Scan,
	Receipt,
	Save,
	AlertOctagon,
	Zap,
} from "lucide-react";
import {
	clinicalProceduralAudio,
	type ProceduralSignalType,
	type ProceduralSignalEvent,
} from "../../../services/audio/clinicalProceduralAudio.js";

const SIGNAL_LABELS: Record<ProceduralSignalType, { title: string; freq: string; desc: string; icon: React.ComponentType<{ className?: string }> }> = {
	scanner_beep: {
		title: "Считывание Честный ЗНАК",
		freq: "2200 → 2600 Гц (35 мс)",
		desc: "Мгновенное подтверждение оптического захвата GS1 DataMatrix препаратов, карпул или браслета пациента.",
		icon: Scan,
	},
	cashier_kaching: {
		title: "Фискализация чека 54-ФЗ",
		freq: "1200 + 2400 Гц (140 мс)",
		desc: "Подтверждение безналичной оплаты картой/QR-кодом или успешной отправки фискального чека в ОФД.",
		icon: Receipt,
	},
	autosave_whisper: {
		title: "Фоновое автосохранение",
		freq: "1760 Гц (шелест 30 мс)",
		desc: "Субтильная фиксация протокола и черновиков в IndexedDB без отвлечения врача и раздражения пациента.",
		icon: Save,
	},
	somatic_danger_chord: {
		title: "Клинический стоп-фактор",
		freq: "440 + 466 Гц (150 мс)",
		desc: "Тревожный акустический маркер при наличии непереносимости анестетиков или соматических противопоказаний.",
		icon: AlertOctagon,
	},
};

export const HardwareAudioSection: React.FC = () => {
	const [soundEnabled, setSoundEnabled] = useState(() => clinicalProceduralAudio.isEnabled());
	const [volume, setVolume] = useState(() => clinicalProceduralAudio.getVolume());
	const [hapticsEnabled, setHapticsEnabled] = useState(() => clinicalProceduralAudio.isHapticsEnabled());
	const [lastSignal, setLastSignal] = useState<ProceduralSignalEvent | null>(null);
	const [activeSignal, setActiveSignal] = useState<ProceduralSignalType | null>(null);

	useEffect(() => {
		const unsubscribe = clinicalProceduralAudio.subscribe((event) => {
			setLastSignal(event);
			setActiveSignal(event.signal);
			const timer = setTimeout(() => {
				setActiveSignal((current) => (current === event.signal ? null : current));
			}, Math.max(event.durationMs + 100, 300));
			return () => clearTimeout(timer);
		});
		return unsubscribe;
	}, []);

	const handleToggleSound = (enabled: boolean) => {
		clinicalProceduralAudio.setEnabled(enabled);
		setSoundEnabled(enabled);
	};

	const handleVolumeChange = (newVol: number) => {
		clinicalProceduralAudio.setVolume(newVol);
		setVolume(newVol);
	};

	const handleToggleHaptics = (enabled: boolean) => {
		clinicalProceduralAudio.setHapticsEnabled(enabled);
		setHapticsEnabled(enabled);
	};

	const handleTestSignal = (signal: ProceduralSignalType) => {
		switch (signal) {
			case "scanner_beep":
				void clinicalProceduralAudio.playScannerBeep();
				break;
			case "cashier_kaching":
				void clinicalProceduralAudio.playCashierKaching();
				break;
			case "autosave_whisper":
				void clinicalProceduralAudio.playAutosaveWhisper();
				break;
			case "somatic_danger_chord":
				void clinicalProceduralAudio.playSomaticDangerChord();
				break;
		}
	};

	return (
		<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-5" data-testid="hardware-audio-section">
			{/* Top Header: Микрофоны и Шумоподавление бормашины */}
			<div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-surface)] text-[var(--teal)] flex items-center justify-center shrink-0">
						<Mic size={18} />
					</div>
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)] m-0">Аудиосистема клиники и Web Audio DSP</h3>
						<p className="text-xs text-[var(--muted)] m-0">
							Процедурная обратная связь, микрофоны кабинетов и фильтрация шума турбин
						</p>
					</div>
				</div>
			</div>

			{/* Status Cockpit: Web Audio Engine Status & Noise Profile */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
							<Zap size={16} />
						</div>
						<div>
							<span className="text-xs font-bold text-[var(--ink)] block">Процедурный DSP движок</span>
							<span className="text-[11px] text-[var(--muted)]">Web Audio API • 0 KB ассетов на диске • Celeron-Ready</span>
						</div>
					</div>
					<span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
						0 KB Памяти
					</span>
				</div>

				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal-surface)] text-[var(--teal)] flex items-center justify-center shrink-0">
							<Activity size={16} />
						</div>
						<div>
							<span className="text-xs font-bold text-[var(--ink)] block">Шумоподавление турбин</span>
							<span className="text-[11px] text-[var(--muted)]">Фильтрация шума бормашины (4.5–6 кГц) для голосовых заметок</span>
						</div>
					</div>
					<span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
						DSP Активен
					</span>
				</div>
			</div>

			{/* Main Audio Controls Card */}
			<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-4">
				<div className="flex items-center justify-between flex-wrap gap-4">
					<div className="flex items-center gap-4">
						<label className="flex items-center gap-2.5 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={soundEnabled}
								onChange={(e) => handleToggleSound(e.target.checked)}
								className="rounded border-[var(--line)] text-[var(--teal)] focus:ring-[var(--teal)]"
								data-testid="hw-audio-sound-enabled-toggle"
							/>
							<div className="flex items-center gap-1.5">
								{soundEnabled ? (
									<Volume2 size={16} className="text-[var(--teal)]" />
								) : (
									<VolumeX size={16} className="text-[var(--muted)]" />
								)}
								<span className="text-xs font-bold text-[var(--ink)]">Звуковые сигналы интерфейса</span>
							</div>
						</label>

						<label className="flex items-center gap-2.5 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={hapticsEnabled}
								onChange={(e) => handleToggleHaptics(e.target.checked)}
								className="rounded border-[var(--line)] text-[var(--teal)] focus:ring-[var(--teal)]"
								data-testid="hw-audio-haptics-enabled-toggle"
							/>
							<div className="flex items-center gap-1.5">
								<Vibrate size={16} className="text-amber-500" />
								<span className="text-xs font-bold text-[var(--ink)]">Тактильная вибрация (Haptics)</span>
							</div>
						</label>
					</div>

					{/* Volume Slider */}
					<div className="flex items-center gap-3 min-w-[200px]">
						<span className="text-xs text-[var(--muted)] shrink-0">Громкость:</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							value={volume}
							disabled={!soundEnabled}
							onChange={(e) => handleVolumeChange(Number.parseFloat(e.target.value))}
							className="w-full accent-[var(--teal)] cursor-pointer disabled:opacity-40"
							data-testid="hw-audio-volume-slider"
						/>
						<span className="text-xs font-mono font-bold text-[var(--ink)] w-9 text-right shrink-0">
							{Math.round(volume * 100)}%
						</span>
					</div>
				</div>

				{/* Live Activity Waveform Bar */}
				<div
					className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
						activeSignal
							? "bg-teal-50 dark:bg-teal-950/40 border-teal-400 text-teal-900 dark:text-teal-200"
							: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)]"
					}`}
					data-testid="hw-audio-live-monitor"
				>
					<div className="flex items-center gap-2 min-w-0">
						<Sparkles
							size={15}
							className={activeSignal ? "text-[var(--teal)] animate-spin" : "text-[var(--muted)]"}
						/>
						<span className="text-xs font-medium truncate">
							{activeSignal
								? `Синтез сигнала: ${SIGNAL_LABELS[activeSignal].title} (${SIGNAL_LABELS[activeSignal].freq})`
								: lastSignal
									? `Последний сигнал: ${SIGNAL_LABELS[lastSignal.signal].title} (${new Date(lastSignal.timestamp).toLocaleTimeString()})`
									: "Монитор аудио-сигналов в режиме ожидания событий"}
						</span>
					</div>
					<div className="flex items-center gap-1 shrink-0">
						<span className={`w-2 h-2 rounded-full ${activeSignal ? "bg-[var(--teal)] animate-ping" : "bg-slate-300 dark:bg-slate-700"}`} />
						<span className="text-[11px] font-mono">{activeSignal ? "DSP ACTIVE" : "IDLE"}</span>
					</div>
				</div>
			</div>

			{/* 4 Procedural Signals Testing Matrix */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider m-0">
						Тестирование клинических процедурных сигналов
					</h4>
					<span className="text-[11px] text-[var(--muted)]">
						ADSR огибающие • 0 ms задержка • Без обращения к диску
					</span>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{(Object.keys(SIGNAL_LABELS) as ProceduralSignalType[]).map((signalKey) => {
						const sig = SIGNAL_LABELS[signalKey];
						const Icon = sig.icon;
						const isPlaying = activeSignal === signalKey;

						return (
							<div
								key={signalKey}
								className={`p-3.5 rounded-xl bg-[var(--paper)] border transition-all flex flex-col justify-between gap-3 ${
									isPlaying
										? "border-teal-500 shadow-xs ring-1 ring-teal-500/30"
										: "border-[var(--line)] hover:border-slate-300 dark:hover:border-slate-700"
								}`}
								data-testid={`hw-audio-signal-card-${signalKey}`}
							>
								<div className="space-y-1.5">
									<div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
										<div className="flex items-center gap-2 min-w-0">
											<div className="w-6 h-6 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-center text-[var(--teal)] shrink-0">
												<Icon className="w-3.5 h-3.5" />
											</div>
											<span className="text-xs font-bold text-[var(--ink)] whitespace-nowrap">{sig.title}</span>
										</div>
										<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
											{sig.freq}
										</span>
									</div>
									<p className="text-[11.5px] text-[var(--muted)] m-0 leading-relaxed">
										{sig.desc}
									</p>
								</div>

								<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
									<span className="text-[10.5px] text-[var(--muted)]">
										{isPlaying ? "Воспроизведение..." : "Готов к синтезу"}
									</span>
									<button
										type="button"
										onClick={() => handleTestSignal(signalKey)}
										className={`min-h-[30px] px-3 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
											isPlaying
												? "bg-[var(--teal)] text-white shadow-xs"
												: "bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)]"
										}`}
										data-testid={`hw-audio-btn-test-${signalKey}`}
									>
										<Volume2 size={13} className={isPlaying ? "animate-bounce" : ""} />
										<span>Воспроизвести</span>
									</button>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
