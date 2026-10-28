import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";
import { ToothSurfacesAndEndoMatrix } from "../ToothSurfacesAndEndoMatrix";
import type { ToothData } from "../../odontogram/ToothChart";
import type { WarmAccordionSection } from "./toothDrawerTypes";

interface ToothDrawerSurfacesAccordionProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	activeSection: WarmAccordionSection;
	toggleSection: (section: WarmAccordionSection) => void;
	onUpdateTooth?: ((num: number, updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
}

export const ToothDrawerSurfacesAccordion: React.FC<ToothDrawerSurfacesAccordionProps> = ({
	toothNumber,
	toothData,
	activeSection,
	toggleSection,
	onUpdateTooth,
	onInsertToProtocol,
}) => {
	const isExpanded = activeSection === "surfaces_endo";

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
					<ToothSurfacesAndEndoMatrix
						toothNumber={toothNumber}
						toothData={toothData}
						onUpdateTooth={(updates) => onUpdateTooth?.(toothNumber, updates)}
						onInsertToProtocol={onInsertToProtocol}
					/>
				</div>
			)}
		</section>
	);
};
