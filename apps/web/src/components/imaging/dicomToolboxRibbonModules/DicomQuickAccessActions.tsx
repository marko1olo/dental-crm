/**
 * DicomQuickAccessActions.tsx — Правая панель действий (ИИ-анализ, кнопка Норма, метаданные, полный экран)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Loader2, Maximize2, Minimize2, Sparkles, X, Zap } from "lucide-react";

export interface DicomQuickAccessActionsProps {
	onAiAnalyze?: (() => void) | undefined;
	isAiAnalyzing?: boolean | undefined;
	aiReport?: any;
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
					className="h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-800 text-teal-300 hover:bg-slate-700 text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors"
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
							? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
							: "border-emerald-500/40 bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900/60"
					}`}
					title="Внести заключение «Рентген-норма» в дневник приёма"
				>
					<Zap size={13} className="text-emerald-400" />
					<span>{isNormaApplied ? "Норма внесена" : "Норма: патологии нет"}</span>
				</button>
			)}
			<div className="text-xs text-teal-300 font-bold font-mono px-2 py-1 rounded bg-slate-800/80 border border-slate-700">
				{patientName ? patientName.toUpperCase() : "PID2026-CLINIC"}
			</div>
			<button
				type="button"
				onClick={onToggleFullscreen}
				className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors"
				title="Полноэкранный режим (F11)"
			>
				{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
			</button>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="h-8 w-8 rounded-lg flex items-center justify-center border-none bg-transparent text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 cursor-pointer transition-colors"
					title="Закрыть (Esc)"
				>
					<X size={17} />
				</button>
			)}
		</div>
	);
};
