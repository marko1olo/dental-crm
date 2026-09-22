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
	ChevronDown,
	ChevronUp,
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
	const [isExpanded, setIsExpanded] = useState(false);

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

	// Свернутое состояние: компактный инлайн-виджет для единого тулбара (Мандаты 8c, 8d, 8p)
	if (!isExpanded && !isListening && !transcript) {
		return (
			<div
				className={`emk-voice-pilot-hud emk-voice-pilot-collapsed inline-flex items-center gap-1.5 select-none shrink-0 ${className}`.trim()}
				data-testid="emk-voice-pilot-hud"
			>
				<button
					type="button"
					onClick={handleToggleMic}
					className="min-h-[26px] sm:min-h-[28px] h-6.5 sm:h-7 px-2 rounded-lg bg-[var(--teal,#0d9488)] hover:opacity-90 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0 shadow-2xs"
					title="Начать диктовку (Ctrl+Space)"
					aria-label="Начать диктовку"
				>
					<Mic size={12} />
					<span className="hidden sm:inline">Диктовка</span>
				</button>
				<span className="text-xs font-bold text-[var(--ink)] hidden md:inline-flex items-center gap-1 shrink-0">
					<Sparkles size={12} className="text-[var(--teal,#0d9488)]" />
					<span className="hidden xl:inline">AI-Пилот</span>
				</span>
				<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] hidden 2xl:inline shrink-0">
					Готов
				</span>
				<button
					type="button"
					onClick={() => setIsExpanded(true)}
					className="min-h-[26px] sm:min-h-[28px] h-6.5 sm:h-7 px-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-all inline-flex items-center gap-0.5 shrink-0"
					title="Развернуть подсказки и пульт AI-Пилота"
					aria-label="Развернуть пульт AI-Пилота"
				>
					<span className="hidden sm:inline text-[10px]">Пульт</span>
					<ChevronDown size={11} />
				</button>
			</div>
		);
	}

	return (
		<div
			className={`emk-voice-pilot-hud relative inline-flex items-center gap-1.5 select-none shrink-0 ${className}`.trim()}
			data-testid="emk-voice-pilot-hud"
		>
			<button
				type="button"
				onClick={handleToggleMic}
				className={`min-h-[26px] sm:min-h-[28px] h-6.5 sm:h-7 px-2 rounded-lg flex items-center justify-center font-bold text-xs gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
					isListening
						? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-500/40"
						: "bg-[var(--teal,#0d9488)] hover:opacity-90 text-white"
				}`}
				title={isListening ? "Остановить диктовку (Ctrl+Space)" : "Начать диктовку (Ctrl+Space)"}
				aria-label={isListening ? "Остановить диктовку" : "Начать диктовку"}
				aria-pressed={isListening}
			>
				{isListening ? <MicOff size={12} /> : <Mic size={12} />}
				<span className="hidden sm:inline text-xs">{isListening ? "Стоп" : "Диктовка"}</span>
			</button>

			<span className="text-xs font-bold text-[var(--ink)] hidden md:inline-flex items-center gap-1 shrink-0">
				<Sparkles size={12} className="text-[var(--teal,#0d9488)]" />
				<span className="hidden xl:inline">AI-Пилот</span>
			</span>

			<span
				className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 ${
					isListening
						? "bg-rose-500 text-white animate-pulse"
						: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
				}`}
			>
				{isListening ? "Слушаю..." : "Готов"}
			</span>

			{intent && (
				<button
					type="button"
					onClick={handleApplyAll}
					disabled={isApplied}
					className={`min-h-[26px] sm:min-h-[28px] h-6.5 sm:h-7 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0 ${
						isApplied
							? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
							: "bg-[var(--teal,#0d9488)] hover:opacity-90 text-white"
					}`}
				>
					{isApplied ? <CheckCheck size={13} /> : <Zap size={13} />}
					<span className="hidden sm:inline">{isApplied ? "Применено" : "В карту"}</span>
				</button>
			)}

			<button
				type="button"
				onClick={() => setIsExpanded((v) => !v)}
				className="min-h-[26px] sm:min-h-[28px] h-6.5 sm:h-7 px-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-all inline-flex items-center gap-0.5 shrink-0"
				title={isExpanded ? "Свернуть панель AI-Пилота" : "Развернуть панель AI-Пилота"}
				aria-label="Переключить пульт AI-Пилота"
			>
				<span className="hidden sm:inline text-[10px]">Пульт</span>
				<ChevronDown size={11} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
			</button>

			{/* Выпадающая панель транскрипта и распознанных бейджей */}
			{(isExpanded || transcript || isListening) && (
				<div className="absolute left-0 top-full mt-1 z-50 flex flex-col gap-2 p-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[280px] sm:min-w-[380px] max-w-[500px] animate-in fade-in zoom-in-95 duration-100 text-xs">
					<div className="flex items-center justify-between gap-1 pb-1 border-b border-[var(--line)]">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1">
							<Sparkles size={12} className="text-[var(--teal)]" />
							<span>Пульт AI-Пилота</span>
						</span>
						<div className="flex items-center gap-1">
							{transcript && (
								<button
									type="button"
									onClick={handleClear}
									className="p-1 rounded text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
									title="Очистить"
								>
									<Trash2 size={12} />
								</button>
							)}
							<button
								type="button"
								onClick={() => setIsExpanded(false)}
								className="p-1 rounded text-zinc-500 hover:text-[var(--ink)] cursor-pointer"
								title="Свернуть"
							>
								<X size={12} />
							</button>
						</div>
					</div>

					{/* Live Raw Transcript */}
					{transcript ? (
						<div className="text-xs font-medium text-[var(--ink)] bg-[var(--paper-soft)] p-2 rounded-lg border border-[var(--line)] flex flex-wrap items-center gap-1 leading-relaxed">
							{finalTranscript && <span>«{finalTranscript}»</span>}
							{interimText && (
								<span className="text-blue-600 dark:text-blue-400 font-bold italic animate-pulse">
									{finalTranscript ? `+ «${interimText}»` : `«${interimText}»`}
								</span>
							)}
						</div>
					) : (
						<div className="text-[11px] text-[var(--muted)] py-1">
							Говорите в микрофон: зубную формулу, МКБ-10, анестетики или манипуляции...
						</div>
					)}

					{/* Structured Badges */}
					{intent && (
						<div className="flex flex-wrap items-center gap-1 text-[11px]">
							{intent.targetQuadrant && (
								<span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-800 dark:text-blue-200 border border-blue-500/30 font-bold flex items-center gap-1">
									<LayoutGrid size={11} className="shrink-0" />
									<span>
										{intent.targetQuadrant === "all"
											? "Все квадранты"
											: `Квадрант ${intent.targetQuadrant}`}
									</span>
								</span>
							)}
							{intent.teethUpdates.map((t) => (
								<span
									key={`tooth-${t.toothNumber}`}
									className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border border-indigo-500/30 font-bold flex items-center gap-1"
								>
									<span className="font-mono font-black">Зуб {t.toothNumber}:</span>
									<span>{t.icd10Title} [{t.icd10Code}]</span>
									{t.surfaces && (
										<span className="font-mono text-[9px] bg-indigo-600 text-white px-1 rounded">
											{t.surfaces.join("")}
										</span>
									)}
								</span>
							))}
							{intent.anesthesia && (
								<span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30 font-bold flex items-center gap-1">
									<Syringe size={11} className="shrink-0" />
									<span>{intent.anesthesia.displayName}</span>
								</span>
							)}
							{intent.procedures804n.map((p, idx) => (
								<span
									key={`proc-${idx}`}
									className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 font-bold flex items-center gap-1"
								>
									<Sliders size={11} className="shrink-0" />
									<span>{p.name}</span>
								</span>
							))}
							{intent.endoCanalMeasurements && intent.endoCanalMeasurements.length > 0 && (
								<span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-800 dark:text-red-200 border border-red-500/30 font-bold flex items-center gap-1">
									<Sparkles size={11} className="shrink-0 text-red-500" />
									<span>
										Эндо: {intent.endoCanalMeasurements.map((c) => `${c.canalName} ${c.workingLengthMm ? `${c.workingLengthMm}мм` : ""}`).join(", ")}
									</span>
								</span>
							)}
							{intent.soapNotes.assessment && (
								<span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/30 font-bold flex items-center gap-1">
									<ClipboardList size={11} className="shrink-0" />
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
