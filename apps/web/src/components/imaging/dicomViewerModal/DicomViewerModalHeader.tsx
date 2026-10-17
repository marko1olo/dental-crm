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
	readonly onInsertNormaTo043: () => void;
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
	isNormaApplied, onInsertNormaTo043, isProtocolsDropdownOpen, setIsProtocolsDropdownOpen,
	appliedProtocolId, onApplyProtocol, protocolsDropdownRef, isAnalyzing, aiReport,
	onRunAiAnalysis, hasAiFindings, selectedFindingCodesCount, onToggleFindingsDrawer,
	quickFilterState, onQuickFilterChange, onReset, onClose,
}) => {
	const btnStyle = "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs cursor-pointer inline-flex items-center gap-1.5 shrink-0";

	return (
		<div className="h-[42px] min-h-[42px] bg-slate-950 border-b border-slate-800 flex items-center justify-between px-3 gap-2 select-none flex-nowrap shrink-0 overflow-x-auto">
			<div className="flex items-center gap-2 shrink-0">
				<span className="bg-[var(--teal)] text-white font-extrabold text-[11px] px-2 py-0.5 rounded">RVG / DICOM</span>
				<div className="flex items-center gap-0.5 bg-slate-900 rounded-lg p-0.5 border border-slate-700">
					<button type="button" onClick={() => onSwitchViewMode("2d")} className={`h-6 px-2 text-[11px] font-bold rounded cursor-pointer ${viewMode === "2d" ? "bg-teal-900 text-teal-300" : "text-slate-400"}`}>2D Срез</button>
					<button type="button" data-testid="btn-dicom-switch-mpr" onClick={() => onSwitchViewMode("3d_mpr")} className={`h-6 px-2 text-[11px] font-bold rounded cursor-pointer inline-flex items-center gap-1 ${viewMode === "3d_mpr" ? "bg-teal-900 text-teal-300" : "text-slate-400"}`}><Layers size={11} /> 4-MPR</button>
					<button type="button" data-testid="btn-dicom-switch-sectioning" onClick={() => onSwitchViewMode("sectioning")} className={`h-6 px-2 text-[11px] font-bold rounded cursor-pointer ${viewMode === "sectioning" ? "bg-teal-900 text-teal-300" : "text-slate-400"}`}>РАЗДЕЛ</button>
				</div>
				<div className="hidden sm:flex flex-col ml-1 max-w-[200px]">
					<div className="text-[11px] font-bold text-slate-100 truncate">{title} {toothFdiCode ? `· Зуб ${toothFdiCode}` : ""}</div>
					<div className="text-[10px] text-slate-400 truncate">{patientName ? `${patientName} · ` : ""}{studyDate || "сегодня"}</div>
				</div>
			</div>

			<div className="hidden md:flex items-center shrink-0">
				<RadiologyQuickFiltersPanel filterState={quickFilterState} onFilterChange={onQuickFilterChange} onReset={onReset} orientation="horizontal" />
			</div>

			<div className="flex items-center gap-1.5 shrink-0">
				<button type="button" data-testid="btn-dicom-norma-043" onClick={onInsertNormaTo043} className={`h-7 px-2.5 text-xs font-bold rounded-lg border cursor-pointer inline-flex items-center gap-1.5 ${isNormaApplied ? "border-emerald-500 bg-emerald-950/40 text-emerald-300" : "border-emerald-600 bg-emerald-900 text-emerald-200"}`}>
					{isNormaApplied ? <CheckCircle2 size={13} /> : <Zap size={13} className="text-emerald-400" />}
					<span>{isNormaApplied ? "Норма внесена" : "Норма: патологии нет"}</span>
				</button>

				<div className="relative" ref={protocolsDropdownRef as any}>
					<button type="button" data-testid="btn-dicom-protocols-menu" onClick={() => setIsProtocolsDropdownOpen((p) => !p)} className={btnStyle}>
						<FileText size={13} className="text-[var(--teal)]" /> <span>Протоколы</span> <ChevronDown size={11} />
					</button>
					{isProtocolsDropdownOpen && (
						<div className="absolute top-full right-0 mt-1 min-w-[240px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-[10002] p-1 flex flex-col gap-0.5">
							{RADIOLOGY_STANDARD_PROTOCOLS.map((preset) => (
								<button key={preset.id} type="button" onClick={() => onApplyProtocol(preset)} data-testid={`btn-dicom-protocol-${preset.id}`} className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 cursor-pointer ${appliedProtocolId === preset.id ? "bg-teal-900 text-teal-200" : "text-slate-200 hover:bg-slate-800"}`}>
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
