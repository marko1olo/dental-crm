import React from "react";
import { Check, CheckCircle2, ChevronDown, FileText, Layers, Loader2, Sparkles, X, Zap } from "lucide-react";
import { RADIOLOGY_STANDARD_PROTOCOLS } from "../../radiology/radiologyProtocols.js";
import { RadiologyQuickFiltersPanel, type RadiologyQuickFilterState } from "../../radiology/RadiologyQuickFiltersPanel.js";

export interface DicomViewerModalHeaderProps {
	readonly title: string;
	readonly toothFdiCode?: string | undefined;
	readonly patientName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly viewMode: "2d" | "3d_mpr" | "sectioning";
	readonly onSwitchViewMode: (mode: "2d" | "3d_mpr" | "sectioning") => void;
	readonly isNormaApplied: boolean;
	readonly onInsertNormaToEmk?: (() => void) | undefined;
	readonly onInsertNormaTo043?: (() => void) | undefined;
	readonly isProtocolsDropdownOpen: boolean;
	readonly setIsProtocolsDropdownOpen: (updater: (prev: boolean) => boolean) => void;
	readonly appliedProtocolId: string | null;
	readonly onApplyProtocol: (preset: (typeof RADIOLOGY_STANDARD_PROTOCOLS)[number]) => void;
	readonly protocolsDropdownRef: React.RefObject<HTMLDivElement | null>;
	readonly isAnalyzing: boolean;
	readonly aiReport: string | null;
	readonly onRunAiAnalysis: () => void;
	readonly hasAiFindings: boolean;
	readonly selectedFindingCodesCount: number;
	readonly onToggleFindingsDrawer: () => void;
	readonly quickFilterState: RadiologyQuickFilterState;
	readonly onQuickFilterChange: (next: Partial<RadiologyQuickFilterState>) => void;
	readonly onReset: () => void;
	readonly onClose: () => void;
}

export const DicomViewerModalHeader: React.FC<DicomViewerModalHeaderProps> = ({
	title, toothFdiCode, patientName, studyDate, viewMode, onSwitchViewMode,
	isNormaApplied, onInsertNormaToEmk, onInsertNormaTo043, isProtocolsDropdownOpen, setIsProtocolsDropdownOpen,
	appliedProtocolId, onApplyProtocol, protocolsDropdownRef, isAnalyzing, aiReport,
	onRunAiAnalysis, hasAiFindings, selectedFindingCodesCount, onToggleFindingsDrawer,
	quickFilterState, onQuickFilterChange, onReset, onClose,
}) => {
	const btnStyle = "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs cursor-pointer inline-flex items-center gap-1.5 shrink-0";
	const handleNormaClick = onInsertNormaToEmk ?? onInsertNormaTo043 ?? (() => {});

	return (
		<div className="h-[42px] min-h-[42px] bg-[var(--paper)] border-b border-[var(--line)] flex items-center justify-between px-3 gap-2 select-none flex-nowrap shrink-0 overflow-x-auto">
			<div className="flex items-center gap-2 shrink-0">
				<span className="bg-[var(--primary)] text-white font-extrabold text-[11px] px-2 py-0.5 rounded">RVG / DICOM</span>
				<div className="flex items-center gap-0.5 bg-[var(--paper-soft)] rounded-lg p-0.5 border border-[var(--line)]">
					<button type="button" onClick={() => onSwitchViewMode("2d")} className={`h-6 px-2 text-[11px] font-bold rounded cursor-pointer ${viewMode === "2d" ? "bg-[var(--teal-surface)] text-[var(--primary)]" : "text-[var(--ink-muted)]"}`}>2D Срез</button>
					<button type="button" data-testid="btn-dicom-switch-mpr" onClick={() => onSwitchViewMode("3d_mpr")} className="h-6 px-2 text-[11px] font-bold rounded cursor-pointer inline-flex items-center gap-1 text-[var(--ink-muted)] hover:text-[var(--primary)]" title="Открыть каноническую 3D/MPR студию КЛКТ"><Layers size={11} /> 3D/MPR студия</button>
				</div>
				<div className="hidden sm:flex flex-col ml-1 max-w-[200px]">
					<div className="text-[11px] font-bold text-[var(--ink)] truncate">{title} {toothFdiCode ? `· Зуб ${toothFdiCode}` : ""}</div>
					<div className="text-[10px] text-[var(--ink-muted)] truncate">{patientName ? `${patientName} · ` : ""}{studyDate || "сегодня"}</div>
				</div>
			</div>

			<div className="hidden md:flex items-center shrink-0">
				<RadiologyQuickFiltersPanel filterState={quickFilterState} onFilterChange={onQuickFilterChange} onReset={onReset} orientation="horizontal" />
			</div>

			<div className="flex items-center gap-1.5 shrink-0">
				<button type="button" data-testid="btn-dicom-norma-043" data-testid-emk="btn-dicom-norma-emk" onClick={handleNormaClick} className={`h-7 px-2.5 text-xs font-bold rounded-lg border cursor-pointer inline-flex items-center gap-1.5 ${isNormaApplied ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"}`}>
					{isNormaApplied ? <CheckCircle2 size={13} /> : <Zap size={13} className="text-emerald-500" />}
					<span>{isNormaApplied ? "Норма внесена" : "Норма: патологии нет"}</span>
				</button>

				<div className="relative" ref={protocolsDropdownRef}>
					<button type="button" data-testid="btn-dicom-protocols-menu" onClick={() => setIsProtocolsDropdownOpen((p) => !p)} className={btnStyle}>
						<FileText size={13} className="text-[var(--primary)]" /> <span>Протоколы</span> <ChevronDown size={11} />
					</button>
					{isProtocolsDropdownOpen && (
						<div className="absolute top-full right-0 mt-1 min-w-[240px] bg-[var(--paper)] border border-[var(--line)] rounded-lg shadow-2xl z-[40] p-1 flex flex-col gap-0.5">
							{RADIOLOGY_STANDARD_PROTOCOLS.map((preset) => (
								<button key={preset.id} type="button" onClick={() => onApplyProtocol(preset)} data-testid={`btn-dicom-protocol-${preset.id}`} className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 cursor-pointer ${appliedProtocolId === preset.id ? "bg-[var(--teal-surface)] text-[var(--primary)]" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}>
									<Check size={12} className={appliedProtocolId === preset.id ? "opacity-100" : "opacity-0"} />
									<span>{preset.titleRu}</span>
								</button>
							))}
						</div>
					)}
				</div>

				<button type="button" data-testid="btn-dicom-run-ai" onClick={onRunAiAnalysis} disabled={isAnalyzing} className={btnStyle}>
					{isAnalyzing ? <><Loader2 size={13} className="animate-spin" /><span>Анализ...</span></> : <><Sparkles size={13} className="text-[var(--teal)]" /><span>{aiReport ? "ИИ-повтор" : "ИИ-анализ"}</span></>}
				</button>

				{hasAiFindings && (
					<button type="button" onClick={onToggleFindingsDrawer} className={btnStyle}>
						<Sparkles size={12} className="text-teal-400" /> <span>Находки ({selectedFindingCodesCount})</span>
					</button>
				)}

				<button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white cursor-pointer ml-1" title="Закрыть (Esc)"><X size={15} /></button>
			</div>
		</div>
	);
};
