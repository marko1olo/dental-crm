/**
 * VoiceDictationAssistantModal.tsx — Интерактивный Touch-First HUD голосового клинического ассистента
 * для диктовки стоматологических протоколов, зубной формулы и процедур.
 *
 * ВОЗМОЖНОСТИ:
 * 1. Крупная интерактивная кнопка микрофона (>= 56x56px) со световой индикацией и пульсацией.
 * 2. Живой визуализатор уровня звука (VU-Meter / Web Audio API AnalyserNode).
 * 3. Парсинг русской клинической речи в реальном времени (номера зубов FDI, диагнозы МКБ-10, SOAP, анестезия).
 * 4. Превью-карточки распознанных команд (зеленые — высокое доверие, янтарные — требуется проверка).
 * 5. 1-клик применение команд в ЭМК и зубную формулу.
 * 6. Текстовый симулятор диктовки для ручного ввода и проверки.
 */

import {
	Activity,
	AlertCircle,
	Check,
	CheckCheck,
	FileText,
	Mic,
	MicOff,
	Send,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { voiceDictationErrorText } from "../odontogram/voiceDictationText";
import {
	type ClinicalVoiceParseResult,
	type ParsedClinicalVoiceCommand,
	type SoapAggregatedNote,
	parseClinicalVoiceSpeech,
} from "./voiceClinicalCommands";
import { UnifiedAudioClient } from "../../services/voice/UnifiedAudioClient";
import { CanvasWaveform } from "../audio/CanvasWaveform";
import "./voiceAssistant.css";

export interface VoiceDictationAssistantModalProps {
	isOpen: boolean;
	onClose: () => void;
	activeToothNumber?: number | null;
	onApplyCommand?: (command: ParsedClinicalVoiceCommand) => void;
	onApplyAllCommands?: (commands: ParsedClinicalVoiceCommand[]) => void;
	onApplySoapNote?: (soap: SoapAggregatedNote) => void;
}

const QUICK_EXAMPLES = [
	"Зуб 46 кариес дентина",
	"Шестнадцатый зуб острый пульпит",
	"Нижний левый первый моляр пломба",
	"Анестезия убистезин 1.7 мл 1 карпула",
	"Коффердам установлен",
	"Жалобы: ноющая боль от холодного",
	"Объективно: глубокая кариозная полость на окклюзионной поверхности",
	"Лечение: некротомия, медобработка, адгезивный протокол, пломба светового отверждения",
	"Рекомендации: исключить твердую пищу на 2 часа",
];

const VU_BARS_COUNT = 16;

export function VoiceDictationAssistantModal({
	isOpen,
	onClose,
	activeToothNumber,
	onApplyCommand,
	onApplyAllCommands,
	onApplySoapNote,
}: VoiceDictationAssistantModalProps) {
	const [isListening, setIsListening] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [interimText, setInterimText] = useState("");
	const [finalText, setFinalText] = useState("");
	const [manualInput, setManualInput] = useState("");
	const [audioVolume, setAudioVolume] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [parseResult, setParseResult] =
		useState<ClinicalVoiceParseResult | null>(null);
	const [appliedCommandIds, setAppliedCommandIds] = useState<Set<string>>(
		new Set(),
	);

	const clientRef = useRef<UnifiedAudioClient | null>(null);

	// Очистка при закрытии модалки
	const cleanupAudio = useCallback(() => {
		if (clientRef.current) {
			clientRef.current.dispose();
			clientRef.current = null;
		}
		setIsListening(false);
		setIsProcessing(false);
		setInterimText("");
		setAudioVolume(0);
	}, []);

	useEffect(() => {
		if (!isOpen) {
			cleanupAudio();
		}
	}, [isOpen, cleanupAudio]);

	// Старт прослушивания микрофона
	const handleStartListening = async () => {
		setErrorMessage(null);
		setIsProcessing(true);
		setInterimText("");

		try {
			cleanupAudio();

			const client = new UnifiedAudioClient({
				preferredMode: "gemini_live",
				specialty: "therapy",
				autoFallback: true,
			});
			clientRef.current = client;

			client.subscribe({
				onStateChange: (state) => {
					const listening = state === "listening" || state === "connecting";
					setIsListening(listening);
					if (state === "idle" || state === "error") {
						setIsProcessing(false);
					}
				},
				onInterimText: (interim) => {
					setInterimText(interim);
				},
				onFinalText: (_final, accumulated) => {
					const text = (accumulated || _final).trim();
					setFinalText(text);
					setTranscript(text);
					setInterimText("");
					const parsed = parseClinicalVoiceSpeech(text);
					setParseResult(parsed);
				},
				onTwoLayerTranscript: (data) => {
					setInterimText(data.interim);
					setFinalText(data.finalized);
					const full = (data.fullWithInterim || data.finalized).trim();
					setTranscript(full);
					const parsed = parseClinicalVoiceSpeech(full);
					setParseResult(parsed);
				},
				onRmsUpdate: (rms) => {
					setAudioVolume(Math.min(100, Math.round(rms * 250)));
				},
				onError: (err) => {
					const msg = typeof err === "string" ? err : err.message;
					setErrorMessage(msg);
					cleanupAudio();
				},
			});

			await client.start();
			setIsListening(true);
			setIsProcessing(false);
		} catch (err: unknown) {
			const errorTxt = voiceDictationErrorText(err);
			setErrorMessage(errorTxt);
			cleanupAudio();
			setIsProcessing(false);
		}
	};

	// Остановка прослушивания
	const handleStopListening = () => {
		cleanupAudio();
	};

	// Переключение записи
	const handleToggleListening = () => {
		if (isListening) {
			handleStopListening();
		} else {
			void handleStartListening();
		}
	};

	// Ручная симуляция фразы
	const handleSimulateText = (textToSimulate: string) => {
		if (!textToSimulate.trim()) return;
		setTranscript(textToSimulate);
		const parsed = parseClinicalVoiceSpeech(textToSimulate);
		setParseResult(parsed);
		setManualInput("");
	};

	// Применение единичной команды
	const handleApplySingleCommand = (cmd: ParsedClinicalVoiceCommand) => {
		onApplyCommand?.(cmd);
		setAppliedCommandIds((prev) => new Set(prev).add(cmd.id));
	};

	// Удаление команды из списка
	const handleDeleteCommand = (cmdId: string) => {
		if (!parseResult) return;
		setParseResult({
			...parseResult,
			commands: parseResult.commands.filter((c) => c.id !== cmdId),
		});
	};

	// Применение всех команд
	const handleApplyAll = () => {
		if (!parseResult || parseResult.commands.length === 0) return;
		onApplyAllCommands?.(parseResult.commands);
		if (
			parseResult.soapNote &&
			Object.keys(parseResult.soapNote).length > 0 &&
			onApplySoapNote
		) {
			onApplySoapNote(parseResult.soapNote);
		}
		for (const cmd of parseResult.commands) {
			setAppliedCommandIds((prev) => new Set(prev).add(cmd.id));
		}
		onClose();
	};

	if (!isOpen) return null;

	// Расчет высот для полосок индикатора громкости
	const meterBars = Array.from({ length: VU_BARS_COUNT }, (_, index) => {
		const center = (VU_BARS_COUNT - 1) / 2;
		const distance = Math.abs(index - center) / (center || 1);
		const factor = 1 - distance * 0.5;
		const heightPercent = isListening
			? Math.min(100, Math.max(15, (audioVolume / 128) * 100 * factor))
			: 10;
		return heightPercent;
	});

	return (
		<div
			className="dnt-voice-modal-backdrop"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="voice-assistant-title"
		>
			<div className="dnt-voice-modal-dialog">
				{/* Header */}
				<div className="dnt-voice-modal-header">
					<div className="dnt-voice-modal-title-group">
						<div className="dnt-voice-modal-icon-badge">
							<Sparkles size={22} aria-hidden="true" />
						</div>
						<div>
							<h2 id="voice-assistant-title" className="dnt-voice-modal-title">
								Голосовой клинический ассистент
							</h2>
							<p className="dnt-voice-modal-subtitle">
								Диктовка протокола приёма, зубной формулы, диагнозов и манипуляций
								{activeToothNumber ? ` (активен зуб ${activeToothNumber})` : ""}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="dnt-voice-modal-close-btn"
						aria-label="Закрыть голосовой ассистент"
						title="Закрыть"
					>
						<X size={22} aria-hidden="true" />
					</button>
				</div>

				{/* Body */}
				<div className="dnt-voice-modal-body">
					{/* Ошибки микрофона */}
					{errorMessage && (
						<div
							style={{
								padding: "12px 16px",
								borderRadius: "10px",
								background: "var(--bad-bg, #ef444420)",
								border: "1px solid var(--bad-fg, #ef4444)",
								color: "var(--bad-fg, #ef4444)",
								display: "flex",
								alignItems: "center",
								gap: "10px",
								fontSize: "14px",
							}}
							role="alert"
						>
							<AlertCircle size={20} style={{ flexShrink: 0 }} />
							<span>{errorMessage}</span>
						</div>
					)}

					{/* Интерактивная сцена записи */}
					<div className="dnt-voice-rec-stage">
						<button
							type="button"
							onClick={handleToggleListening}
							disabled={isProcessing}
							className={`dnt-voice-mic-button ${
								isListening ? "dnt-voice-mic-button--listening" : ""
							} ${isProcessing ? "dnt-voice-mic-button--processing" : ""}`}
							aria-pressed={isListening}
							aria-label={isListening ? "Остановить запись" : "Начать запись"}
							title={isListening ? "Остановить запись" : "Начать запись"}
						>
							{isListening ? (
								<MicOff size={34} aria-hidden="true" />
							) : (
								<Mic size={34} aria-hidden="true" />
							)}
						</button>

						<div>
							<div className="dnt-voice-rec-status-label">
								{isListening
									? "Слушаю врача..."
									: isProcessing
										? "Подключение микрофона..."
										: "Нажмите для начала голосовой диктовки"}
							</div>
							<div className="dnt-voice-rec-status-sub">
								{isListening
									? "Говорите команды (например: «Зуб 46 кариес дентина, анестезия убистезин»)"
									: "Автоматическое распознавание номеров зубов FDI, диагнозов и протокола SOAP"}
							</div>
						</div>

						{/* Реалтайм-осциллограмма Canvas Waveform */}
						<div style={{ width: "100%", marginTop: "10px" }}>
							<CanvasWaveform
								isRecording={isListening}
								isSpeaking={isListening && audioVolume > 20}
								height={44}
								mode="wave"
								showStatusBadge={false}
							/>
						</div>

						{/* VU-Meter полоски */}
						<div className="dnt-voice-meter-bars" aria-hidden="true">
							{meterBars.map((height, idx) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: fixed static bars
									key={`meter-bar-${idx}`}
									className={`dnt-voice-meter-bar ${
										isListening && height > 25
											? "dnt-voice-meter-bar--active"
											: ""
									}`}
									style={{ height: `${height}%` }}
								/>
							))}
						</div>
					</div>

					{/* Распознанный текст транскрипта */}
					<div className="dnt-voice-transcript-card">
						<div className="dnt-voice-transcript-head">
							<span>Транскрипт речи</span>
							{(transcript || interimText) && (
								<button
									type="button"
									onClick={() => {
										setTranscript("");
										setFinalText("");
										setInterimText("");
										setParseResult(null);
										setAppliedCommandIds(new Set());
									}}
									className="dnt-voice-btn-icon-only"
									style={{ minHeight: "28px", minWidth: "28px", padding: "4px" }}
									title="Очистить транскрипт"
									aria-label="Очистить транскрипт"
								>
									<Trash2 size={14} />
								</button>
							)}
						</div>
						<div className="dnt-voice-transcript-text" aria-live="polite">
							{finalText || interimText || transcript ? (
								<div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
									{(finalText || transcript) && (
										<span>{finalText || transcript}</span>
									)}
									{interimText && (
										<span className="text-blue-600 dark:text-blue-400 font-bold italic animate-pulse">
											{finalText || transcript ? ` ${interimText}` : interimText}
										</span>
									)}
								</div>
							) : (
								<span className="dnt-voice-transcript-placeholder">
									Текст диктовки появится здесь при произнесении...
								</span>
							)}
						</div>
					</div>

					{/* Список распознанных клинических команд */}
					{parseResult && parseResult.commands.length > 0 && (
						<div className="dnt-voice-commands-section">
							<div className="dnt-voice-section-header">
								<div className="dnt-voice-section-title">
									<Activity size={18} />
									<span>Распознанные клинические команды ({parseResult.commands.length})</span>
								</div>
								{parseResult.summary && (
									<span style={{ fontSize: "13px", color: "var(--muted)" }}>
										{parseResult.summary}
									</span>
								)}
							</div>

							<div className="dnt-voice-command-chips-list">
								{parseResult.commands.map((cmd) => {
									const isApplied = appliedCommandIds.has(cmd.id);
									return (
										<div
											key={cmd.id}
											className={`dnt-voice-chip-card dnt-voice-chip-card--${cmd.confidenceLevel} ${
												isApplied ? "dnt-voice-chip-card--applied" : ""
											}`}
										>
											<div className="dnt-voice-chip-info">
												<div className="dnt-voice-chip-meta">
													{cmd.toothNumber && (
														<span className="dnt-voice-badge dnt-voice-badge--tooth">
															Зуб {cmd.toothNumber}
														</span>
													)}
													<span
														className={`dnt-voice-badge dnt-voice-badge--${cmd.confidenceLevel}`}
													>
														{cmd.confidenceLevel === "high"
															? "Высокая точность"
															: "Проверить"}
													</span>
													{cmd.soapSection && (
														<span className="dnt-voice-badge dnt-voice-badge--soap">
															SOAP: {cmd.soapSection}
														</span>
													)}
													{cmd.category === "anesthesia" && (
														<span className="dnt-voice-badge dnt-voice-badge--anesthesia">
															Анестезия
														</span>
													)}
													{cmd.category === "consumable" && (
														<span className="dnt-voice-badge dnt-voice-badge--consumable">
															Материал
														</span>
													)}
												</div>
												<div className="dnt-voice-chip-summary">
													{cmd.summary}
												</div>
												<div className="dnt-voice-chip-raw">
													«{cmd.rawSpeech}»
												</div>
											</div>

											<div className="dnt-voice-chip-actions">
												{isApplied ? (
													<span
														style={{
															display: "flex",
															alignItems: "center",
															gap: "4px",
															color: "var(--good-fg, #10b981)",
															fontSize: "13px",
															fontWeight: 600,
														}}
													>
														<Check size={16} />
														Применено
													</span>
												) : (
													<button
														type="button"
														onClick={() => handleApplySingleCommand(cmd)}
														className="dnt-voice-btn-apply"
														title="Применить команду"
													>
														<Check size={16} />
														<span>Применить</span>
													</button>
												)}
												<button
													type="button"
													onClick={() => handleDeleteCommand(cmd.id)}
													className="dnt-voice-btn-icon-only"
													title="Удалить команду"
													aria-label="Удалить команду"
												>
													<Trash2 size={16} />
												</button>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Сводка секций SOAP */}
					{parseResult &&
						parseResult.soapNote &&
						Object.keys(parseResult.soapNote).length > 0 && (
							<div className="dnt-voice-soap-card">
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontWeight: 700,
										fontSize: "14px",
									}}
								>
									<FileText size={18} />
									<span>Сводка медицинского протокола (SOAP)</span>
								</div>

								<div className="dnt-voice-soap-grid">
									{parseResult.soapNote.subjective && (
										<div className="dnt-voice-soap-item">
											<div className="dnt-voice-soap-item-label">
												Жалобы (Subjective)
											</div>
											<div className="dnt-voice-soap-item-text">
												{parseResult.soapNote.subjective}
											</div>
										</div>
									)}
									{parseResult.soapNote.objective && (
										<div className="dnt-voice-soap-item">
											<div className="dnt-voice-soap-item-label">
												Объективно (Objective)
											</div>
											<div className="dnt-voice-soap-item-text">
												{parseResult.soapNote.objective}
											</div>
										</div>
									)}
									{parseResult.soapNote.plan && (
										<div className="dnt-voice-soap-item">
											<div className="dnt-voice-soap-item-label">
												Лечение / План (Plan)
											</div>
											<div className="dnt-voice-soap-item-text">
												{parseResult.soapNote.plan}
											</div>
										</div>
									)}
									{parseResult.soapNote.recommendations && (
										<div className="dnt-voice-soap-item">
											<div className="dnt-voice-soap-item-label">
												Рекомендации (Recommendations)
											</div>
											<div className="dnt-voice-soap-item-text">
												{parseResult.soapNote.recommendations}
											</div>
										</div>
									)}
								</div>
							</div>
						)}

					{/* Ручной ввод и симулятор команд */}
					<div>
						<div
							style={{
								fontSize: "13px",
								fontWeight: 700,
								color: "var(--muted)",
								marginBottom: "8px",
							}}
						>
							Быстрые примеры и симуляция команд:
						</div>
						<div className="dnt-voice-cheatsheet">
							{QUICK_EXAMPLES.map((example) => (
								<button
									key={example}
									type="button"
									onClick={() => handleSimulateText(example)}
									className="dnt-voice-cheatsheet-pill"
								>
									{example}
								</button>
							))}
						</div>
					</div>

					<form
						className="dnt-voice-fallback-bar"
						onSubmit={(e) => {
							e.preventDefault();
							handleSimulateText(manualInput);
						}}
					>
						<input
							type="text"
							value={manualInput}
							onChange={(e) => setManualInput(e.target.value)}
							placeholder="Введите клиническую команду вручную для симуляции..."
							className="dnt-voice-input"
						/>
						<button
							type="submit"
							disabled={!manualInput.trim()}
							className="dnt-voice-btn-simulate"
						>
							<Send size={16} />
							<span>Распознать</span>
						</button>
					</form>
				</div>

				{/* Footer */}
				<div className="dnt-voice-modal-footer">
					<button
						type="button"
						onClick={onClose}
						className="dnt-voice-btn-secondary"
					>
						Закрыть
					</button>

					<div className="dnt-voice-footer-actions">
						<button
							type="button"
							onClick={handleApplyAll}
							disabled={!parseResult || parseResult.commands.length === 0}
							className="dnt-voice-btn-primary"
						>
							<CheckCheck size={18} />
							<span>
								Применить всё ({parseResult?.commands.length || 0})
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
