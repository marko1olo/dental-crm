import React from "react";
import {
	INTACT_QUADRANTS,
	UPPER_JAW_FDI_TEETH,
	LOWER_JAW_FDI_TEETH,
	type QuadrantId,
	type DynamicTeethResult,
	type IntactQuadrant,
} from "../../dynamicTeethSelector";

export interface VisitDiaryToothQuickStripProps {
	readonly currentTooth: number | null;
	readonly dynamicTeethData: DynamicTeethResult;
	readonly showAllQuadrantsView: boolean;
	readonly setShowAllQuadrantsView: (val: boolean) => void;
	readonly selectedIntactQuadrant: QuadrantId;
	readonly setSelectedIntactQuadrant: (val: QuadrantId) => void;
	readonly activeQuadrantDef: IntactQuadrant | undefined;
	readonly handleToothSelect: (tooth: number) => void;
}

export const VisitDiaryToothQuickStrip: React.FC<VisitDiaryToothQuickStripProps> = ({
	currentTooth, dynamicTeethData, showAllQuadrantsView, setShowAllQuadrantsView,
	selectedIntactQuadrant, setSelectedIntactQuadrant, activeQuadrantDef, handleToothSelect,
}) => {
	const isPathologyMode = !dynamicTeethData.isIntact && !showAllQuadrantsView;
	const btn = (sel: boolean) =>
		`text-xs font-bold rounded-lg px-2.5 py-1 shadow-2xs border transition-colors cursor-pointer select-none ${
			sel ? "bg-[var(--teal)] text-white border-[var(--teal-dark,#0f766e)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
		}`;

	return (
		<div className="flex items-center gap-2 flex-wrap min-h-[34px] py-1 text-[var(--ink)]" data-testid="clinical-quick-active-tooth-bar">
			<span className="sr-only" data-testid={isPathologyMode ? "badge-patient-teeth-pathologies" : "badge-patient-teeth-intact"}>
				{isPathologyMode ? `Патологии: ${dynamicTeethData.totalPathologies}` : "Интактно"}
			</span>
			{isPathologyMode ? (
				<div className="flex items-center gap-1.5 flex-wrap">
					{dynamicTeethData.teeth.map((t) => (
						<button key={t.tooth} type="button" onClick={() => handleToothSelect(t.tooth)} data-active={currentTooth === t.tooth} className={`inline-flex items-center gap-1.5 ${btn(currentTooth === t.tooth)}`} title={`Зуб ${t.tooth}: ${t.label}`} data-testid={`btn-select-active-tooth-${t.tooth}`}>
							<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentTooth === t.tooth ? "bg-white" : "bg-[var(--teal)]"}`} />
							<span>{t.tooth}</span>
						</button>
					))}
					<button type="button" onClick={() => setShowAllQuadrantsView(true)} className="text-xs font-bold rounded-lg px-2 py-1 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]" data-testid="btn-toggle-quadrants-view">
						По квадрантам
					</button>
				</div>
			) : (
				<div className="flex items-center gap-1.5 flex-wrap">
					<div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 gap-0.5">
						{INTACT_QUADRANTS.map((quad) => (
							<button key={quad.id} type="button" onClick={() => { setSelectedIntactQuadrant(quad.id); if (quad.teeth && !quad.teeth.includes(currentTooth ?? -1)) handleToothSelect(quad.teeth[2] ?? quad.teeth[0] ?? 11); }} data-active={selectedIntactQuadrant === quad.id} className={`text-xs font-bold rounded-md px-2 py-0.5 transition-colors ${selectedIntactQuadrant === quad.id ? "bg-[var(--paper)] text-[var(--teal)] shadow-2xs border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`} data-testid={`btn-select-quadrant-${quad.id}`} title={`${quad.label} (${quad.rangeText})`}>
								{quad.shortLabel}
							</button>
						))}
					</div>
					<div className="flex items-center gap-1 flex-wrap">
						{activeQuadrantDef?.teeth.map((t) => (
							<button key={t} type="button" onClick={() => handleToothSelect(t)} data-active={currentTooth === t} className={btn(currentTooth === t)} title={`Выбрать активным зуб ${t}`} data-testid={`btn-select-active-tooth-${t}`}>{t}</button>
						))}
					</div>
					{!dynamicTeethData.isIntact && (
						<button type="button" onClick={() => setShowAllQuadrantsView(false)} className="text-xs font-bold rounded-lg px-2 py-1 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]" data-testid="btn-back-to-pathologies">
							К патологиям ({dynamicTeethData.totalPathologies})
						</button>
					)}
				</div>
			)}
			<select value={currentTooth ?? 16} onChange={(e) => handleToothSelect(Number(e.target.value))} className="sr-only" aria-hidden="true" tabIndex={-1} title="Выбрать зуб из формулы FDI" data-testid="select-active-tooth-fdi">
				<optgroup label="Верх">{UPPER_JAW_FDI_TEETH.map((t) => (<option key={t} value={t}>Зуб {t}</option>))}</optgroup>
				<optgroup label="Низ">{LOWER_JAW_FDI_TEETH.map((t) => (<option key={t} value={t}>Зуб {t}</option>))}</optgroup>
			</select>
		</div>
	);
};
