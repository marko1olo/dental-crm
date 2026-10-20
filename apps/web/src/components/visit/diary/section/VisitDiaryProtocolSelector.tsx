import { BookOpen, ChevronDown, ChevronUp, PlusCircle, Zap } from "lucide-react";
import React from "react";
import { type ClinicalQuickPreset } from "../../clinicalSoapPresets";
import { CLINICAL_SPECIALTY_SECTIONS } from "../../clinicalSpecialtySections";
import { VisitDiaryProtocolCards } from "./VisitDiaryProtocolCards";
import { VisitDiarySpecialtyFilter } from "./VisitDiarySpecialtyFilter";
import { VisitDiaryToothQuickStrip } from "./VisitDiaryToothQuickStrip";
import type { DynamicTeethResult, QuadrantId, IntactQuadrant } from "../../dynamicTeethSelector";

export interface VisitDiaryProtocolSelectorProps {
	readonly currentTooth: number | null;
	readonly dynamicTeethData: DynamicTeethResult;
	readonly showAllQuadrantsView: boolean;
	readonly setShowAllQuadrantsView: (val: boolean) => void;
	readonly selectedIntactQuadrant: QuadrantId;
	readonly setSelectedIntactQuadrant: (val: QuadrantId) => void;
	readonly activeQuadrantDef: IntactQuadrant | undefined;
	readonly handleToothSelect: (tooth: number) => void;
	readonly onSelectPreset: (preset: ClinicalQuickPreset) => void;
	readonly onOpenTemplatesModal?: (() => void) | undefined;
	readonly onOpenPriceSearch?: (() => void) | undefined;
	readonly defaultCollapsed?: boolean | undefined;
}

export const VisitDiaryProtocolSelector: React.FC<VisitDiaryProtocolSelectorProps> = ({
	currentTooth, dynamicTeethData, showAllQuadrantsView, setShowAllQuadrantsView,
	selectedIntactQuadrant, setSelectedIntactQuadrant, activeQuadrantDef, handleToothSelect,
	onSelectPreset, onOpenTemplatesModal, onOpenPriceSearch, defaultCollapsed = true,
}) => {
	const [isCollapsed, setIsCollapsed] = React.useState<boolean>(defaultCollapsed);
	const [activeSpecialtyCategory, setActiveSpecialtyCategory] = React.useState<string>("therapy");
	const currentSection = React.useMemo(
		() => CLINICAL_SPECIALTY_SECTIONS.find((s) => s.id === activeSpecialtyCategory) || CLINICAL_SPECIALTY_SECTIONS[0],
		[activeSpecialtyCategory],
	);
	const btn = "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1 text-xs shadow-2xs hover:border-[var(--teal)] hover:bg-[var(--paper-soft)] transition-colors inline-flex items-center gap-1.5 cursor-pointer";

	return (
		<div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-2.5 text-[var(--ink)]" data-testid="clinical-quick-presets-bar">
			<div className="flex items-center justify-between gap-2 min-w-0 h-8">
				<div className="flex items-center gap-2 shrink-0">
					<div className="w-6 h-6 rounded-md bg-[var(--teal-soft,rgba(13,148,136,0.14))] text-[var(--teal)] flex items-center justify-center shrink-0">
						<Zap size={14} />
					</div>
					<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] tracking-tight whitespace-nowrap">Клинические протоколы</h4>
					{currentTooth && (
						<span className="text-xs font-bold px-2 py-0.5 rounded-md border border-[var(--teal)] bg-[var(--teal-soft,rgba(13,148,136,0.14))] text-[var(--teal-dark,var(--teal,#0f766e))]" data-testid="badge-collapsed-active-tooth">
							Зуб {currentTooth}
						</span>
					)}
					<span className="text-[11px] font-medium text-[var(--muted)] hidden sm:inline">({currentSection?.items?.length ?? 10} протоколов)</span>
				</div>
				<div className="flex items-center gap-1.5 shrink-0 ml-auto">
					{onOpenTemplatesModal && (
						<button type="button" onClick={onOpenTemplatesModal} className={btn} data-testid="btn-open-soap-templates-modal-bar" title="Реестр федеральных протоколов (1 142)">
							<BookOpen size={13} className="text-[var(--teal)] shrink-0" />
							<span className="hidden md:inline">Реестр протоколов (1 142)</span>
						</button>
					)}
					{onOpenPriceSearch && (
						<button type="button" onClick={onOpenPriceSearch} className={btn} data-testid="btn-quick-add-from-pricelist">
							<PlusCircle size={13} className="text-[var(--muted)] shrink-0" />
							<span className="hidden md:inline">Каталог услуг</span>
						</button>
					)}
					<button type="button" onClick={() => setIsCollapsed((p) => !p)} className={btn} data-testid="btn-toggle-presets-bar-collapse">
						{isCollapsed ? <ChevronDown size={13} className="text-[var(--teal)]" /> : <ChevronUp size={13} className="text-[var(--muted)]" />}
						<span>{isCollapsed ? "Развернуть" : "Свернуть"}</span>
					</button>
				</div>
			</div>
			{!isCollapsed && (
				<div className="pt-1.5 space-y-2 border-t border-[var(--line-subtle)] animate-in fade-in duration-150">
					<VisitDiaryToothQuickStrip
						currentTooth={currentTooth} dynamicTeethData={dynamicTeethData}
						showAllQuadrantsView={showAllQuadrantsView} setShowAllQuadrantsView={setShowAllQuadrantsView}
						selectedIntactQuadrant={selectedIntactQuadrant} setSelectedIntactQuadrant={setSelectedIntactQuadrant}
						activeQuadrantDef={activeQuadrantDef} handleToothSelect={handleToothSelect}
					/>
					<VisitDiarySpecialtyFilter activeSpecialtyCategory={activeSpecialtyCategory} onSelectSpecialty={setActiveSpecialtyCategory} />
					<VisitDiaryProtocolCards currentSpecialtySection={currentSection} currentTooth={currentTooth} onSelectPreset={onSelectPreset} />
				</div>
			)}
		</div>
	);
};
