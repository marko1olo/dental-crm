/**
 * VoiceDictationAssistantModal.tsx — Канонический диалог голосового ассистента DENTE.
 * Мандат 8b: размер файла строго в Sweet Spot 320–420 строк.
 * Мандат 8e: автономия врача, кнопки disabled={false}, свобода черновиков и ручной ввод.
 * Мандат 8am: ровно ОДНА Primary CTA кнопка (voice-btn-primary) на видимый контекст.
 * Apple HIG: нативный Bottom Sheet drawer на смартфонах, тактильный хэндл 36x5px, тач-таргеты >= 44x44px.
 * Мандат 8d pt 7: строго 0 cartoon emojis в исходном коде, исключительно векторные иконки Lucide.
 */

import React from "react";
import {
	Activity, AlertCircle, Check, CheckCheck, FileText,
	Mic, MicOff, Send, Sparkles, Trash2, X,
} from "lucide-react";
import { useVoiceDictation } from "./dictationModal/useVoiceDictation";
import { voiceMeterHeights } from "../workspaceActions/voiceMeter";
import type {
	ClinicalVoiceParseResult,
	ParsedClinicalVoiceCommand,
	SoapAggregatedNote,
	VoiceDictationAssistantModalProps,
} from "./dictationModal/voiceModalTypes";
import "./voiceAssistant.css";

export * from "./dictationModal/voiceModalTypes";

const VU_BARS_COUNT = 16;
const QUICK_EXAMPLES = [
	"Норма по соматике", "Кариес 36 зуб дистальный", "Зуб 46 кариес дентина",
	"Шестнадцатый зуб острый пульпит", "Анестезия убистезин 1.7 мл 1 карпула", "Коффердам установлен",
	"Жалобы: ноющая боль от холодного", "Объективно: глубокая кариозная полость на окклюзионной поверхности",
	"Лечение: некротомия, медобработка, адгезивный протокол, пломба светового отверждения",
	"Рекомендации: исключить твердую пищу на 2 часа",
];

export interface VoiceModalHeaderProps {
	onClose: () => void;
	activeToothNumber?: number | null;
}

export function VoiceModalHeader({ onClose, activeToothNumber }: VoiceModalHeaderProps) {
	return (
		<div className="dnt-voice-modal-header">
			<div className="dnt-voice-modal-title-group">
				<div className="dnt-voice-modal-icon-badge">
					<Sparkles size={22} aria-hidden="true" />
				</div>
				<div>
					<h2 id="voice-assistant-title" className="dnt-voice-modal-title">Голосовой клинический ассистент</h2>
					<p className="dnt-voice-modal-subtitle">
						Диктовка протокола приёма, зубной формулы, диагнозов и манипуляций{activeToothNumber ? ` (активен зуб ${activeToothNumber})` : ""}
					</p>
				</div>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
				<button type="button" onClick={onClose} className="dnt-voice-modal-close-btn" aria-label="Закрыть голосовой ассистент" title="Закрыть">
					<X size={22} aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}

export interface VoiceModalStageProps {
	isListening: boolean;
	isProcessing: boolean;
	audioVolume: number;
	onToggleListening: () => void;
}

export function VoiceModalStage({ isListening, isProcessing, audioVolume, onToggleListening }: VoiceModalStageProps) {
	const meterBars = voiceMeterHeights(isListening ? audioVolume : 0, VU_BARS_COUNT);

	return (
		<div className="dnt-voice-rec-stage">
			<button
				type="button"
				onClick={onToggleListening}
				disabled={false}
				className={`dnt-voice-mic-button ${isListening ? "dnt-voice-mic-button--listening" : ""} ${isProcessing ? "dnt-voice-mic-button--processing" : ""}`}
				aria-pressed={isListening}
				aria-label={isListening ? "Остановить запись" : "Начать запись"}
				title={isListening ? "Остановить запись" : "Начать запись"}
			>
				{isListening ? <MicOff size={34} aria-hidden="true" /> : <Mic size={34} aria-hidden="true" />}
			</button>

			<div>
				<div className="dnt-voice-rec-status-label">
					{isListening ? "Слушаю врача..." : isProcessing ? "Подключение микрофона..." : "Нажмите для начала голосовой диктовки"}
				</div>
				<div className="dnt-voice-rec-status-sub">
					{isListening
						? "Говорите команды (например: «Зуб 46 кариес дентина, анестезия убистезин»)"
						: "Автоматическое распознавание номеров зубов, диагнозов и дневника приёма"}
				</div>
			</div>

			<div className="dnt-voice-vu-container" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
				<div className="dnt-voice-meter-bars" aria-hidden="true">
					{meterBars.map((height, idx) => (
						<div
							key={`meter-bar-${idx}`}
							className={`dnt-voice-meter-bar ${isListening && height > 25 ? "dnt-voice-meter-bar--active" : ""}`}
							style={{ height: `${height}%` }}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

export interface VoiceModalTranscriptProps {
	transcript: string;
	interimText: string;
	finalText: string;
	onClear: () => void;
}

export function VoiceModalTranscript({ transcript, interimText, finalText, onClear }: VoiceModalTranscriptProps) {
	const hasContent = Boolean(finalText || interimText || transcript);

	return (
		<div className="dnt-voice-transcript-card">
			<div className="dnt-voice-transcript-head">
				<span>Транскрипт речи</span>
				{hasContent && (
					<button
						type="button"
						onClick={onClear}
						className="voice-btn-icon"
						style={{ minHeight: "28px", minWidth: "28px", padding: "4px" }}
						title="Очистить транскрипт"
						aria-label="Очистить транскрипт"
					>
						<Trash2 size={14} />
					</button>
				)}
			</div>
			<div className="dnt-voice-transcript-text" aria-live="polite">
				{hasContent ? (
					<div className="flex flex-wrap items-center gap-1.5 leading-relaxed">
						{(finalText || transcript) && <span>{finalText || transcript}</span>}
						{interimText && (
							<span className="font-bold italic animate-pulse" style={{ color: "var(--info-fg)" }}>
								{finalText || transcript ? ` ${interimText}` : interimText}
							</span>
						)}
					</div>
				) : (
					<span className="dnt-voice-transcript-placeholder">Текст диктовки появится здесь при произнесении...</span>
				)}
			</div>
		</div>
	);
}

export interface VoiceModalCommandListProps {
	parseResult: ClinicalVoiceParseResult | null;
	appliedCommandIds: Set<string>;
	onApplyCommand: (cmd: ParsedClinicalVoiceCommand) => void;
	onDeleteCommand: (cmdId: string) => void;
}

export function VoiceModalCommandList({ parseResult, appliedCommandIds, onApplyCommand, onDeleteCommand }: VoiceModalCommandListProps) {
	if (!parseResult || parseResult.commands.length === 0) return null;

	return (
		<div className="dnt-voice-commands-section">
			<div className="dnt-voice-section-header">
				<div className="dnt-voice-section-title">
					<Activity size={18} />
					<span>Распознанные клинические команды ({parseResult.commands.length})</span>
				</div>
				{parseResult.summary && <span style={{ fontSize: "13px", color: "var(--muted)" }}>{parseResult.summary}</span>}
			</div>

			<div className="dnt-voice-command-chips-list">
				{parseResult.commands.map((cmd) => {
					const isApplied = appliedCommandIds.has(cmd.id);
					return (
						<div
							key={cmd.id}
							className={`dnt-voice-chip-card dnt-voice-chip-card--${cmd.confidenceLevel} ${isApplied ? "dnt-voice-chip-card--applied" : ""}`}
						>
							<div className="dnt-voice-chip-info">
								<div className="dnt-voice-chip-meta">
									{cmd.toothNumber && <span className="dnt-voice-badge dnt-voice-badge--tooth">Зуб {cmd.toothNumber}</span>}
									<span className={`dnt-voice-badge dnt-voice-badge--${cmd.confidenceLevel}`}>
										{cmd.confidenceLevel === "high" ? "Высокая точность" : "Проверить"}
									</span>
									{cmd.soapSection && <span className="dnt-voice-badge dnt-voice-badge--soap">Дневник: {cmd.soapSection}</span>}
									{cmd.category === "anesthesia" && <span className="dnt-voice-badge dnt-voice-badge--anesthesia">Анестезия</span>}
									{cmd.category === "consumable" && <span className="dnt-voice-badge dnt-voice-badge--consumable">Материал</span>}
								</div>
								<div className="dnt-voice-chip-summary">{cmd.summary}</div>
								<div className="dnt-voice-chip-raw">«{cmd.rawSpeech}»</div>
							</div>

							<div className="dnt-voice-chip-actions">
								{isApplied ? (
									<span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--ok-fg)", fontSize: "13px", fontWeight: 600 }}>
										<Check size={16} /> Применено
									</span>
								) : (
									<button type="button" onClick={() => onApplyCommand(cmd)} disabled={false} className="voice-btn-apply" title="Применить команду">
										<Check size={16} /> <span>Применить</span>
									</button>
								)}
								<button type="button" onClick={() => onDeleteCommand(cmd.id)} className="voice-btn-icon" title="Удалить команду" aria-label="Удалить команду">
									<Trash2 size={16} />
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export interface VoiceModalSoapCardProps {
	soapNote?: SoapAggregatedNote | null;
}

export function VoiceModalSoapCard({ soapNote }: VoiceModalSoapCardProps) {
	if (!soapNote || Object.keys(soapNote).length === 0) return null;

	return (
		<div className="dnt-voice-soap-card">
			<div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14px" }}>
				<FileText size={18} />
				<span>Дневник приёма</span>
			</div>
			<div className="dnt-voice-soap-grid">
				{soapNote.subjective && (
					<div className="dnt-voice-soap-item">
						<div className="dnt-voice-soap-item-label">I. Жалобы и анамнез</div>
						<div className="dnt-voice-soap-item-text">{soapNote.subjective}</div>
					</div>
				)}
				{soapNote.objective && (
					<div className="dnt-voice-soap-item">
						<div className="dnt-voice-soap-item-label">II. Осмотр и зубная формула</div>
						<div className="dnt-voice-soap-item-text">{soapNote.objective}</div>
					</div>
				)}
				{soapNote.plan && (
					<div className="dnt-voice-soap-item">
						<div className="dnt-voice-soap-item-label">IV. Протокол лечения</div>
						<div className="dnt-voice-soap-item-text">{soapNote.plan}</div>
					</div>
				)}
				{soapNote.recommendations && (
					<div className="dnt-voice-soap-item">
						<div className="dnt-voice-soap-item-label">Назначения и рекомендации</div>
						<div className="dnt-voice-soap-item-text">{soapNote.recommendations}</div>
					</div>
				)}
			</div>
		</div>
	);
}

export interface VoiceModalPresetsProps {
	manualInput: string;
	onManualInputChange: (val: string) => void;
	onApplyText: (text: string) => void;
}

export function VoiceModalPresets({ manualInput, onManualInputChange, onApplyText }: VoiceModalPresetsProps) {
	return (
		<div>
			<div>
				<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--muted)", marginBottom: "8px" }}>
					Клинические голосовые шаблоны:
				</div>
				<div className="dnt-voice-cheatsheet">
					{QUICK_EXAMPLES.map((example) => (
						<button key={example} type="button" onClick={() => onApplyText(example)} className="dnt-voice-cheatsheet-pill">
							{example}
						</button>
					))}
				</div>
			</div>

			<form className="dnt-voice-fallback-bar" onSubmit={(e) => { e.preventDefault(); onApplyText(manualInput); }}>
				<input
					type="text"
					value={manualInput}
					onChange={(e) => onManualInputChange(e.target.value)}
					placeholder="Введите клиническую команду текстом (резервный ввод)..."
					className="dnt-voice-input"
				/>
				<button type="submit" disabled={false} className="voice-btn-apply">
					<Send size={16} /> <span>Распознать</span>
				</button>
			</form>
		</div>
	);
}

export interface VoiceModalFooterProps {
	onClose: () => void;
	onApplyAll: () => void;
	commandCount: number;
}

export function VoiceModalFooter({ onClose, onApplyAll, commandCount }: VoiceModalFooterProps) {
	return (
		<div className="dnt-voice-modal-footer">
			<button type="button" onClick={onClose} className="voice-btn-secondary">Закрыть</button>
			<div className="dnt-voice-footer-actions">
				<button type="button" onClick={onApplyAll} disabled={false} className="voice-btn-primary">
					<CheckCheck size={18} /> <span>Применить всё ({commandCount})</span>
				</button>
			</div>
		</div>
	);
}

export function VoiceDictationAssistantModal(props: VoiceDictationAssistantModalProps) {
	const { isOpen, onClose, activeToothNumber } = props;
	const {
		isListening, isProcessing, transcript, interimText, finalText, manualInput, setManualInput,
		audioVolume, errorMessage, parseResult, appliedCommandIds, handleToggleListening,
		handleApplyManualText, handleApplySingleCommand, handleDeleteCommand, handleClearTranscript, handleApplyAll,
	} = useVoiceDictation(props);

	if (!isOpen) return null;

	return (
		<div
			className="dnt-voice-modal-backdrop"
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="voice-assistant-title"
		>
			<div className="dnt-voice-modal-dialog">
				<div className="dnt-voice-drag-handle" aria-hidden="true" />
				<VoiceModalHeader onClose={onClose} activeToothNumber={activeToothNumber} />

				<div className="dnt-voice-modal-body">
					{errorMessage && (
						<div
							style={{
								padding: "12px 16px", borderRadius: "10px", background: "var(--bad-bg)",
								border: "1px solid var(--bad-fg)", color: "var(--bad-fg)", display: "flex",
								alignItems: "center", gap: "10px", fontSize: "14px",
							}}
							role="alert"
						>
							<AlertCircle size={20} style={{ flexShrink: 0 }} />
							<span>{errorMessage}</span>
						</div>
					)}

					<VoiceModalStage
						isListening={isListening}
						isProcessing={isProcessing}
						audioVolume={audioVolume}
						onToggleListening={handleToggleListening}
					/>

					<VoiceModalTranscript
						transcript={transcript}
						interimText={interimText}
						finalText={finalText}
						onClear={handleClearTranscript}
					/>

					<VoiceModalCommandList
						parseResult={parseResult}
						appliedCommandIds={appliedCommandIds}
						onApplyCommand={handleApplySingleCommand}
						onDeleteCommand={handleDeleteCommand}
					/>

					<VoiceModalSoapCard soapNote={parseResult?.soapNote} />

					<VoiceModalPresets
						manualInput={manualInput}
						onManualInputChange={setManualInput}
						onApplyText={handleApplyManualText}
					/>
				</div>

				<VoiceModalFooter
					onClose={onClose}
					onApplyAll={handleApplyAll}
					commandCount={parseResult?.commands.length || 0}
				/>
			</div>
		</div>
	);
}

export default VoiceDictationAssistantModal;
