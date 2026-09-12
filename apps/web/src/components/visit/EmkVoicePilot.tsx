/**
 * EmkVoicePilot.tsx — Touch-First HUD голосовой пилот для врача за креслом в перчатках.
 * 0-1 клик: мгновенно распознает речь, раскладывает по зубам, МКБ-10, анестетикам,
 * услугам 804н и протоколу SOAP Формы 043/у.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
	Activity,
	Check,
	CheckCheck,
	ClipboardList,
	Coins,
	FileText,
	LayoutGrid,
	Mic,
	MicOff,
	Sliders,
	Sparkles,
	Syringe,
	Trash2,
	Volume2,
	X,
	Zap,
} from "lucide-react";
import {
	globalDentalVoiceEngine,
	parseDentalVoiceSpeech,
	type DentalVoiceIntent,
	type ToothUpdateVoiceItem,
	type EndoCanalVoiceItem,
} from "../../services/voice";
import { showToast } from "../GlobalToast";
import type { OdontogramQuadrantId } from "../odontogram/ToothChart";
import { getQuadrantTitle } from "../odontogram/ToothChart";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";

export interface EmkVoicePilotProps {
	readonly onApplyToothState?: (toothNumber: number, state: any, surfaces?: string[]) => void;
	readonly onApplySoapNotes?: (notes: Record<string, string>) => void;
	readonly onApplyAnesthesia?: (anesthesia: any) => void;
	readonly onApplyProcedures?: (procedures: any[]) => void;
	readonly onApplyQuadrant?: (quadrant: OdontogramQuadrantId) => void;
	readonly onApplyEndoMeasurements?: (measurements: readonly EndoCanalVoiceItem[]) => void;
	readonly activeSelectedTooth?: number | null;
	readonly className?: string;
}

export const EmkVoicePilot: React.FC<EmkVoicePilotProps> = ({
	onApplyToothState,
	onApplySoapNotes,
	onApplyAnesthesia,
	onApplyProcedures,
	onApplyQuadrant,
	onApplyEndoMeasurements,
	activeSelectedTooth,
	className = "",
}) => {
	const [isListening, setIsListening] = useState(false);
	const [volume, setVolume] = useState(0);
	const [transcript, setTranscript] = useState("");
	const [interimText, setInterimText] = useState("");
	const [finalTranscript, setFinalTranscript] = useState("");
	const [intent, setIntent] = useState<DentalVoiceIntent | null>(null);
	const [isApplied, setIsApplied] = useState(false);
	const [isExpanded, setIsExpanded] = useState(true);

	useEffect(() => {
		const unsub = globalDentalVoiceEngine.addListener({
			onListeningChange: (isL) => {
				setIsListening(isL);
				if (!isL) setInterimText("");
			},
			onVolumeChange: (vol) => setVolume(vol),
			onTranscriptChange: (interim, final) => {
				setInterimText(interim);
				setFinalTranscript(final);
				const full = (final + " " + interim).trim();
				setTranscript(full);
				if (full) {
					setIsApplied(false);
				}
			},
			onIntentParsed: (parsedIntent) => {
				setIntent(parsedIntent);
				if (parsedIntent.targetQuadrant !== undefined && onApplyQuadrant) {
					onApplyQuadrant(parsedIntent.targetQuadrant);
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast(`Голос: ${getQuadrantTitle(parsedIntent.targetQuadrant)}`, "info");
				} else if (parsedIntent.teethUpdates.length > 0) {
					void SoundFeedbackService.getInstance().playSpeechCaptured();
				}
			},
			onError: (err) => {
				showToast(err, "warning");
			},
		});

		// Hotkey listener: Spacebar with Ctrl/Shift or standalone
		const handleKeyDown = (e: KeyboardEvent) => {
			// Do not trigger if typing in an input/textarea
			const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
			if (tag === "input" || tag === "textarea") return;

			if (e.code === "Space" && (e.ctrlKey || e.altKey)) {
				e.preventDefault();
				globalDentalVoiceEngine.toggle();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			unsub();
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [onApplyQuadrant]);

	const handleToggleMic = useCallback(() => {
		globalDentalVoiceEngine.toggle();
	}, []);

	const handleClear = useCallback(() => {
		globalDentalVoiceEngine.clear();
		setTranscript("");
		setInterimText("");
		setFinalTranscript("");
		setIntent(null);
		setIsApplied(false);
	}, []);

	const handleApplyAll = useCallback(() => {
		if (!intent) return;

		let appliedCount = 0;

		// 0. Применяем квадрант
		if (intent.targetQuadrant !== undefined && onApplyQuadrant) {
			onApplyQuadrant(intent.targetQuadrant);
		}

		// 1. Применяем одонтограмму
		if (intent.teethUpdates.length > 0 && onApplyToothState) {
			for (const t of intent.teethUpdates) {
				onApplyToothState(t.toothNumber, t.state, t.surfaces);
				appliedCount++;
			}
		}

		// 2. Применяем SOAP протокол
		if (intent.soapNotes && Object.keys(intent.soapNotes).length > 0 && onApplySoapNotes) {
			onApplySoapNotes(intent.soapNotes as Record<string, string>);
		}

		// 3. Применяем анестезию
		if (intent.anesthesia && onApplyAnesthesia) {
			onApplyAnesthesia(intent.anesthesia);
		}

		// 4. Применяем процедуры 804н в смету
		if (intent.procedures804n.length > 0 && onApplyProcedures) {
			onApplyProcedures([...intent.procedures804n]);
		}

		// 5. Применяем эндодонтические измерения каналов
		if (intent.endoCanalMeasurements && intent.endoCanalMeasurements.length > 0 && onApplyEndoMeasurements) {
			onApplyEndoMeasurements(intent.endoCanalMeasurements);
			appliedCount++;
		}

		setIsApplied(true);
		void SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`Голосовой протокол применён: ${intent.teethUpdates.length} зуб(ов), ${intent.procedures804n.length} услуг(и)`,
			"success",
		);
	}, [intent, onApplyToothState, onApplySoapNotes, onApplyAnesthesia, onApplyProcedures, onApplyQuadrant, onApplyEndoMeasurements]);

	const vuHeight = isListening ? Math.min(100, Math.max(15, (volume / 128) * 100)) : 10;

	return (
		<div
			className={`emk-voice-pilot-hud rounded-xl border transition-all select-none shadow-xs overflow-hidden ${
				isListening
					? "bg-rose-500/10 border-rose-500/40 dark:bg-rose-950/20"
					: "bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border-[var(--border,#e2e8f0)] dark:border-zinc-800"
			} ${className}`.trim()}
			data-testid="emk-voice-pilot-hud"
		>
			{/* Header Bar — Сверхкомпактный 32–36px тулбар по Мандату 8p */}
			<div className={`flex items-center justify-between px-2.5 py-1 sm:py-1.5 gap-2 min-h-[36px] ${transcript ? "border-b border-[var(--border-subtle,#e2e8f0)] dark:border-zinc-800" : ""}`}>
				<div className="flex items-center gap-2 min-w-0">
					{/* Компактная кнопка микрофона (min-h-[32px] h-8 touch-target) */}
					<button
						type="button"
						onClick={handleToggleMic}
						className={`min-h-[32px] h-8 px-2.5 rounded-lg flex items-center justify-center font-bold text-xs gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 touch-manipulation shrink-0 ${
							isListening
								? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-500/40"
								: "bg-[var(--teal,#0d9488)] hover:opacity-90 text-white"
						}`}
						title={isListening ? "Остановить диктовку (Ctrl+Space)" : "Начать диктовку (Ctrl+Space)"}
						aria-label={isListening ? "Остановить диктовку" : "Начать диктовку"}
						aria-pressed={isListening}
					>
						{isListening ? <MicOff size={15} /> : <Mic size={15} />}
						<span className="hidden sm:inline">{isListening ? "Стоп" : "Диктовка"}</span>
					</button>

					<div className="flex items-center gap-1.5 min-w-0">
						<span className="text-xs font-black text-[var(--ink,#0f172a)] dark:text-zinc-100 flex items-center gap-1 shrink-0">
							<Sparkles size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
							AI-Пилот
						</span>
						<span
							className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
								isListening
									? "bg-rose-500 text-white animate-pulse"
									: "bg-[var(--surface-hover,#f1f5f9)] dark:bg-zinc-800 text-[var(--muted,#64748b)]"
							}`}
						>
							{isListening ? (
								"Слушаю..."
							) : (
								<>
									<span className="hidden sm:inline">Готов к диктовке</span>
									<span className="sm:hidden">Готов</span>
								</>
							)}
						</span>
						<span className="text-[11px] text-[var(--muted,#64748b)] truncate hidden xl:inline">
							{isListening ? "Диктуйте формулу и манипуляции" : "Дневник 043/у и формула голосом"}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					{/* Live VU meter indicator */}
					<div className="hidden md:flex items-center gap-1 h-5 px-1.5 rounded bg-[var(--surface-hover,#f1f5f9)] dark:bg-zinc-800 border border-[var(--border-subtle,#e2e8f0)] dark:border-zinc-700">
						<Volume2 size={12} className={isListening ? "text-rose-500 animate-pulse" : "text-zinc-400"} />
						<div className="w-10 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden flex items-center">
							<div
								className="h-full bg-rose-500 transition-all duration-75 rounded-full"
								style={{ width: `${vuHeight}%` }}
							/>
						</div>
					</div>

					{transcript && (
						<button
							type="button"
							onClick={handleClear}
							className="min-h-[32px] h-8 w-8 p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center justify-center"
							title="Очистить распознанный текст"
							aria-label="Очистить"
						>
							<Trash2 size={15} />
						</button>
					)}

					{intent && (
						<button
							type="button"
							onClick={handleApplyAll}
							disabled={isApplied}
							className={`min-h-[32px] h-8 px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation shadow-xs ${
								isApplied
									? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
									: "bg-[var(--teal,#0d9488)] hover:opacity-90 text-white hover:scale-[1.02] active:scale-95"
							}`}
						>
							{isApplied ? (
								<>
									<CheckCheck size={14} />
									<span>Применено</span>
								</>
							) : (
								<>
									<Zap size={14} />
									<span>Заполнить карту</span>
								</>
							)}
						</button>
					)}
				</div>
			</div>

			{/* Parsed Live Intent Badges Bar */}
			{transcript && (
				<div className="p-3 bg-[var(--surface-hover,#f1f5f9)]/50 dark:bg-zinc-950/30 flex flex-col gap-2 border-t border-[var(--border-subtle,#e2e8f0)] dark:border-zinc-800">
					{/* Live Raw Transcript */}
					<div className="text-xs font-medium text-[var(--ink,#0f172a)] dark:text-zinc-200 bg-[var(--paper,#ffffff)] dark:bg-zinc-900 p-2.5 rounded-xl border border-[var(--border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-wrap items-center gap-1.5 leading-relaxed">
						{finalTranscript && <span>«{finalTranscript}»</span>}
						{interimText && (
							<span className="text-blue-600 dark:text-blue-400 font-bold italic animate-pulse">
								{finalTranscript ? `+ «${interimText}»` : `«${interimText}»`}
							</span>
						)}
					</div>

					{/* Structured Badges */}
					{intent && (
						<div className="flex flex-wrap items-center gap-1.5 text-xs">
							{/* Quadrant switch badge */}
							{intent.targetQuadrant && (
								<span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-800 dark:text-blue-200 border border-blue-500/30 font-bold flex items-center gap-1">
									<LayoutGrid size={13} className="shrink-0" />
									<span>
										{intent.targetQuadrant === "all"
											? "Все квадранты"
											: `Квадрант ${intent.targetQuadrant}`}
									</span>
								</span>
							)}

							{/* Teeth updates */}
							{intent.teethUpdates.map((t) => (
								<span
									key={`tooth-${t.toothNumber}`}
									className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border border-indigo-500/30 font-bold flex items-center gap-1"
								>
									<span className="font-mono font-black">Зуб {t.toothNumber}:</span>
									<span>{t.icd10Title} [{t.icd10Code}]</span>
									{t.surfaces && (
										<span className="font-mono text-[10px] bg-indigo-600 text-white px-1 rounded">
											{t.surfaces.join("")}
										</span>
									)}
								</span>
							))}

							{/* Anesthesia */}
							{intent.anesthesia && (
								<span className="px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30 font-bold flex items-center gap-1">
									<Syringe size={13} className="shrink-0" />
									<span>{intent.anesthesia.displayName}</span>
								</span>
							)}

							{/* Manipulations */}
							{intent.procedures804n.map((p, idx) => (
								<span
									key={`proc-${idx}`}
									className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 font-bold flex items-center gap-1"
								>
									<Sliders size={13} className="shrink-0" />
									<span>{p.name}</span>
								</span>
							))}

							{/* Endo Canal Measurements */}
							{intent.endoCanalMeasurements && intent.endoCanalMeasurements.length > 0 && (
								<span className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-800 dark:text-red-200 border border-red-500/30 font-bold flex items-center gap-1">
									<Sparkles size={13} className="shrink-0 text-red-500" />
									<span>
										Эндо: {intent.endoCanalMeasurements.map((c) => `${c.canalName} ${c.workingLengthMm ? `${c.workingLengthMm}мм` : ""}`).join(", ")}
									</span>
								</span>
							)}

							{/* SOAP Summary */}
							{intent.soapNotes.assessment && (
								<span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/30 font-bold flex items-center gap-1">
									<ClipboardList size={13} className="shrink-0" />
									<span>{intent.soapNotes.assessment}</span>
								</span>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
