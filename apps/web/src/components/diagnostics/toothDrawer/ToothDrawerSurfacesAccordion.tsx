import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";
import { ToothSurfacesHeader } from "../surfaces/ToothSurfacesHeader";
import { ToothStateChipsRow } from "../surfaces/ToothStateChipsRow";
import { ToothSurfacesCrossDiagram } from "../surfaces/ToothSurfacesCrossDiagram";
import { ToothMaterialSelector } from "../surfaces/ToothMaterialSelector";
import { useToothSurfacesState } from "../surfaces/useToothSurfacesState";
import { ChairsideEndoQuickBar } from "../../endo/ChairsideEndoQuickBar";
import type { ToothData } from "../../odontogram/ToothChart";
import type { WarmAccordionSection } from "./toothDrawerTypes";

export interface ToothDrawerSurfacesAccordionProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	patientId?: string | undefined;
	activeSection: WarmAccordionSection;
	toggleSection: (section: WarmAccordionSection) => void;
	onUpdateTooth?: ((num: number, updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onOpenEndo?: ((toothNumber: number) => void) | undefined;
}

export const ToothDrawerSurfacesAccordion: React.FC<ToothDrawerSurfacesAccordionProps> = ({
	toothNumber,
	toothData,
	patientId,
	activeSection,
	toggleSection,
	onUpdateTooth,
	onInsertToProtocol,
	onOpenEndo,
}) => {
	const isExpanded = activeSection === "surfaces_endo";
	const {
		currentSurfaces,
		iropzCalculated,
		handleToggleSurface,
		handleSetSurfaces,
		handleClearSurfaces,
		handleApplyMacro,
		handleStateChange,
		handleMaterialChange,
	} = useToothSurfacesState({
		toothData,
		onUpdateTooth: (updates) => onUpdateTooth?.(toothNumber, updates),
	});

	const isFrontal = (toothNumber % 10) <= 3;

	return (
		<section className="dente-accordion-item">
			<button
				type="button"
				onClick={() => toggleSection("surfaces_endo")}
				className={`dente-accordion-trigger ${isExpanded ? "expanded" : ""}`}
			>
				<div className="trigger-left min-w-0 flex-1">
					<div className="flex items-center gap-2 min-w-0">
						<ToothMolar size={16} className="shrink-0" style={{ color: "var(--brand-primary, var(--teal))" }} />
						<span className="trigger-title truncate">1. Поверхности MOD & Каналы</span>
					</div>
					<span className="trigger-summary text-[11px] text-teal-600 dark:text-teal-400 font-semibold pl-6 block sm:inline sm:pl-2">
						Поверхности: {toothData?.surfaces?.length ? toothData.surfaces.join("") : "Интактно"}
					</span>
				</div>
				<div className="trigger-right shrink-0">
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</div>
			</button>

			{isExpanded && (
				<div className="dente-accordion-content animate-in">
					<div className="dente-warm-tool-card" data-testid="tooth-surfaces-endo-matrix">
						<ToothSurfacesHeader iropzCalculated={iropzCalculated} />
						<ToothStateChipsRow toothData={toothData} onStateChange={handleStateChange} />
						<ToothSurfacesCrossDiagram
							currentSurfaces={currentSurfaces}
							isFrontal={isFrontal}
							onToggleSurface={handleToggleSurface}
							onSetSurfaces={handleSetSurfaces}
							onClearSurfaces={handleClearSurfaces}
							onApplyMacro={handleApplyMacro}
						/>
						<ToothMaterialSelector toothData={toothData} onMaterialChange={handleMaterialChange} />
						<ChairsideEndoQuickBar
							activeTooth={toothNumber}
							toothState={toothData?.state}
							patientId={patientId}
							onInsertToDiary={(soapText) => onInsertToProtocol?.(soapText)}
							onOpenFullModal={onOpenEndo ? () => onOpenEndo(toothNumber) : undefined}
						/>
					</div>
				</div>
			)}
		</section>
	);
};
