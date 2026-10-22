import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ToothDeciduous } from "../../icons/DentalIcons";
import { ToothPediatricContext } from "../ToothPediatricContext";
import type { ToothData } from "../../odontogram/ToothChart";
import type { WarmAccordionSection } from "./toothDrawerTypes";

interface ToothDrawerPediatricAccordionProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	patientName?: string | undefined;
	patientAgeYears: number;
	doctorName: string;
	activeSection: WarmAccordionSection;
	toggleSection: (section: WarmAccordionSection) => void;
	onUpdateTooth?: ((num: number, updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onOpenParentMemo?: (() => void) | undefined;
}

export const ToothDrawerPediatricAccordion: React.FC<ToothDrawerPediatricAccordionProps> = ({
	toothNumber,
	toothData,
	patientName,
	patientAgeYears,
	doctorName,
	activeSection,
	toggleSection,
	onUpdateTooth,
	onInsertToProtocol,
	onOpenParentMemo,
}) => {
	const isExpanded = activeSection === "pediatric";

	return (
		<section className="dente-accordion-item">
			<button
				type="button"
				onClick={() => toggleSection("pediatric")}
				className={`dente-accordion-trigger ${isExpanded ? "expanded" : ""}`}
			>
				<div className="trigger-left">
					<ToothDeciduous size={16} style={{ color: "#ec4899" }} />
					<span className="trigger-title">5. Детский прием (Шкала Франкла & Резорбция)</span>
				</div>
				<div className="trigger-right">
					<span className="trigger-summary">Психологическая адаптация</span>
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</div>
			</button>

			{isExpanded && (
				<div className="dente-accordion-content animate-in">
					<ToothPediatricContext
						toothNumber={toothNumber}
						toothData={toothData}
						patientName={patientName}
						patientAgeYears={patientAgeYears}
						doctorName={doctorName}
						onUpdateTooth={(updates) => onUpdateTooth?.(toothNumber, updates)}
						onInsertToProtocol={onInsertToProtocol}
						onOpenParentMemo={onOpenParentMemo}
					/>
				</div>
			)}
		</section>
	);
};
