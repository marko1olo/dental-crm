/**
 * DicomQuickAccessActions.tsx — Правая панель действий (ИИ-анализ, кнопка Норма, метаданные, полный экран)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Loader2, Maximize2, Minimize2, Sparkles, X, Zap } from "lucide-react";

export interface DicomQuickAccessActionsProps {
	onAiAnalyze?: (() => void) | undefined;
	isAiAnalyzing?: boolean | undefined;
	aiReport?: unknown;
	hasAiFindings?: boolean | undefined;
	onToggleFindingsDrawer?: (() => void) | undefined;
	onNormaClick?: (() => void) | undefined;
	isNormaApplied?: boolean | undefined;
	patientName?: string | undefined;
	isFullscreen?: boolean | undefined;
	onToggleFullscreen: () => void;
	onClose?: (() => void) | undefined;
}

export const DicomQuickAccessActions: React.FC<DicomQuickAccessActionsProps> = ({
	onAiAnalyze,
	isAiAnalyzing = false,
	aiReport,
	hasAiFindings = false,
	onToggleFindingsDrawer,
	onNormaClick,
	isNormaApplied = false,
	patientName,
	isFullscreen = false,
	onToggleFullscreen,
	onClose,
}) => {
	return (
		<div className="flex items-center gap-1.5 shrink-0">
			{onAiAnalyze && (
				<button
					type="button"
					data-testid="btn-dicom-run-ai"
					onClick={onAiAnalyze}
					disabled={isAiAnalyzing}
					className="primary-button h-8 px-3 rounded-lg border border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal,white)] text-[13px] font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
					title="Запустить ИИ-анализ снимка на кариес, периодонтит и пломбы"
				>
					{isAiAnalyzing ? (
						<>
							<Loader2 size={13} className="animate-spin" />
							<span>Анализ...</span>
						</>
					) : (
						<>
							<Sparkles size={13} />
							<span>{aiReport ? "ИИ-повтор" : "ИИ-анализ"}</span>
						</>
					)}
				</button>
			)}
			{hasAiFindings && onToggleFindingsDrawer && (
				<button
					type="button"
					onClick={onToggleFindingsDrawer}
					className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--primary)] hover:bg-[var(--paper)] text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors"
					title="Показать / скрыть панель находок ИИ"
				>
					<Sparkles size={13} />
					<span>Находки ИИ</span>
				</button>
			)}
			{onNormaClick && (
				<button
					type="button"
					data-testid="btn-dicom-norma-043"
					onClick={onNormaClick}
					className={`h-8 px-3 rounded-lg border text-[13px] font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
						isNormaApplied
							? "border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)]"
							: "border-[var(--primary-soft)] bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--paper-soft)]"
					}`}
					title="Внести заключение «Рентген-норма» в дневник приёма"
				>
					<Zap size={13} className="text-[var(--primary)]" />
					<span>{isNormaApplied ? "Норма внесена" : "Норма: патологии нет"}</span>
				</button>
			)}
			<div className="text-xs text-[var(--ink)] font-medium font-mono px-2.5 py-1 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]">
				{patientName || "Пациент"}
			</div>
			<button
				type="button"
				onClick={onToggleFullscreen}
				className="h-8 w-8 rounded-lg flex items-center justify-center border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] cursor-pointer transition-colors"
				title="Полноэкранный режим (F11)"
			>
				{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
			</button>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="h-8 w-8 rounded-lg flex items-center justify-center border-none bg-transparent text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
					title="Закрыть (Esc)"
				>
					<X size={17} />
				</button>
			)}
		</div>
	);
};
