import React from "react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import {
	CLINICAL_PRESETS,
	CLINICAL_SOAP_PRESETS,
	type ClinicalPresetCategory,
	type ClinicalQuickPreset,
	type ClinicalSoapPreset,
	type ToothClinicalState,
} from "./clinicalSoapPresets";
import { CLINICAL_SPECIALTY_SECTIONS } from "./clinicalSpecialtySections";
import { getDynamicPatientTeeth, getQuadrantForTooth, INTACT_QUADRANTS, type QuadrantId } from "./dynamicTeethSelector";
import { ClinicalAllPresetsGrid } from "./presets/ClinicalAllPresetsGrid";
import { ClinicalTopScenariosSubbar } from "./presets/ClinicalTopScenariosSubbar";
import { ClinicalSpecialtySectionPanel } from "./presets/ClinicalSpecialtySectionPanel";
import { ClinicalQuickToothSelectorStrip } from "./presets/ClinicalQuickToothSelectorStrip";
import { ClinicalPresetsHeader } from "./presets/ClinicalPresetsHeader";
import { ClinicalPresetsModeTabs } from "./presets/ClinicalPresetsModeTabs";

export type { ClinicalPresetCategory, ClinicalQuickPreset, ClinicalSoapPreset, ToothClinicalState };
export { CLINICAL_PRESETS, CLINICAL_SOAP_PRESETS };

export interface ClinicalQuickPresetsBarProps {
	readonly onSelectPreset: (preset: ClinicalQuickPreset, targetTooth?: number | null) => void;
	readonly isLocked?: boolean;
	readonly className?: string;
	readonly onOpenPriceSearch?: () => void;
	readonly onOpenTemplatesModal?: () => void;
	readonly activeTooth?: number | null;
	readonly onSelectActiveTooth?: (tooth: number) => void;
	readonly defaultCollapsed?: boolean;
}

export const ClinicalQuickPresetsBar: React.FC<ClinicalQuickPresetsBarProps> = ({
	onSelectPreset, className = "", onOpenPriceSearch, onOpenTemplatesModal,
	activeTooth = null, onSelectActiveTooth, defaultCollapsed = true,
}) => {
	const [isCollapsed, setIsCollapsed] = React.useState<boolean>(defaultCollapsed);
	const [presetViewMode, setPresetViewMode] = React.useState<"specialty" | "express" | "all">("specialty");
	const [activeSpecialtyCategory, setActiveSpecialtyCategory] = React.useState<string>("therapy");
	const [localTooth, setLocalTooth] = React.useState<number | null>(activeTooth ?? 16);
	const [showAllQuads, setShowAllQuads] = React.useState<boolean>(false);

	React.useEffect(() => {
		if (activeTooth && activeTooth !== localTooth) setLocalTooth(activeTooth);
	}, [activeTooth, localTooth]);

	const currentTooth = activeTooth ?? localTooth;
	const toothStates = useVisitStore((s) => s.visitToothStateByCode);
	const toothRecords = useVisitStore((s) => s.visitToothRecordsByCode);

	const dynamicTeethData = React.useMemo(
		() => getDynamicPatientTeeth({ toothStates, toothRecords, activeTooth: currentTooth }),
		[toothStates, toothRecords, currentTooth],
	);

	const [selectedQuad, setSelectedQuad] = React.useState<QuadrantId>(() => getQuadrantForTooth(currentTooth));
	const activeQuadDef = React.useMemo(() => INTACT_QUADRANTS.find((q) => q.id === selectedQuad) ?? INTACT_QUADRANTS[0], [selectedQuad]);

	const handleToothSelect = (t: number) => {
		setLocalTooth(t);
		try { useVisitStore.getState().setActiveToothNumber(t); } catch { /* test env */ }
		onSelectActiveTooth?.(t);
	};

	const handlePresetClick = (preset: ClinicalQuickPreset) => {
		const isFullMouth = preset.category === "hygiene" || preset.id === "norm_healthy";
		const effTooth = !isFullMouth ? currentTooth || preset.defaultTooth || 16 : null;
		onSelectPreset(preset, effTooth);
		showToast(`Применен протокол: «${preset.title}»${effTooth ? ` (Зуб ${effTooth})` : ""}`, "success", 3000);
	};

	const currentSection = React.useMemo(
		() => CLINICAL_SPECIALTY_SECTIONS.find((s) => s.id === activeSpecialtyCategory) || CLINICAL_SPECIALTY_SECTIONS[0],
		[activeSpecialtyCategory],
	);

	return (
		<div className={`clinical-quick-presets-bar grid-cols-2 min-h-[50px] ${isCollapsed ? "py-1.5 px-3" : "p-3 space-y-2.5"} rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] ${className}`.trim()} data-testid="clinical-quick-presets-bar">
			<ClinicalPresetsHeader
				currentTooth={currentTooth} isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed((p) => !p)}
				onOpenTemplatesModal={onOpenTemplatesModal} onOpenPriceSearch={onOpenPriceSearch} protocolsCount={currentSection?.items?.length ?? 10}
				rightNode={<div className={isCollapsed ? "hidden" : "contents"}><ClinicalPresetsModeTabs presetViewMode={presetViewMode} onSelectMode={setPresetViewMode} /></div>}
			/>
			{!isCollapsed && (
				<div className="space-y-2 pt-1 border-t border-[var(--line-subtle)] animate-in fade-in duration-150">
					<ClinicalQuickToothSelectorStrip
						currentTooth={currentTooth} dynamicTeethData={dynamicTeethData}
						showAllQuadrantsView={showAllQuads} setShowAllQuadrantsView={setShowAllQuads}
						selectedIntactQuadrant={selectedQuad} setSelectedIntactQuadrant={setSelectedQuad}
						activeQuadrantDef={activeQuadDef} handleToothSelect={handleToothSelect}
					/>
					{presetViewMode === "specialty" && (
						<ClinicalSpecialtySectionPanel
							activeSpecialtyCategory={activeSpecialtyCategory} setActiveSpecialtyCategory={setActiveSpecialtyCategory}
							currentSpecialtySection={currentSection} currentTooth={currentTooth} onSelectPreset={handlePresetClick} showCategoryChips={true}
						/>
					)}
					{presetViewMode === "express" && <ClinicalTopScenariosSubbar currentTooth={currentTooth} onSelectPreset={handlePresetClick} />}
					{presetViewMode === "all" && <ClinicalAllPresetsGrid currentTooth={currentTooth} onSelectPreset={handlePresetClick} onOpenProtocolsCatalog={onOpenTemplatesModal} />}
				</div>
			)}
		</div>
	);
};
