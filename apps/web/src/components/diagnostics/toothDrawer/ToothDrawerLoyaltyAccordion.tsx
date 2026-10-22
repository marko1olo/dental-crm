import React from "react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { ToothFamilyLoyaltyAccordion } from "../ToothFamilyLoyaltyAccordion";
import type { WarmAccordionSection } from "./toothDrawerTypes";

interface ToothDrawerLoyaltyAccordionProps {
	toothNumber: number;
	patientId?: string | undefined;
	patientName?: string | undefined;
	activeSection: WarmAccordionSection;
	toggleSection: (section: WarmAccordionSection) => void;
	onOpenFamilyBilling?: (() => void) | undefined;
}

export const ToothDrawerLoyaltyAccordion: React.FC<ToothDrawerLoyaltyAccordionProps> = ({
	toothNumber,
	patientId,
	patientName,
	activeSection,
	toggleSection,
	onOpenFamilyBilling,
}) => {
	const isExpanded = activeSection === "family_loyalty";

	return (
		<section className="dente-accordion-item">
			<button
				type="button"
				onClick={() => toggleSection("family_loyalty")}
				className={`dente-accordion-trigger ${isExpanded ? "expanded" : ""}`}
			>
				<div className="trigger-left">
					<Wallet size={16} color="var(--brand-primary, var(--teal))" />
					<span className="trigger-title">4. Семейный депозит & Кешбэк (Сплит оплаты)</span>
				</div>
				<div className="trigger-right">
					<span className="trigger-summary">Единый счет семьи</span>
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</div>
			</button>

			{isExpanded && (
				<div className="dente-accordion-content animate-in">
					<ToothFamilyLoyaltyAccordion
						toothNumber={toothNumber}
						patientId={patientId}
						patientName={patientName}
						onOpenFullFamilyBilling={onOpenFamilyBilling}
					/>
				</div>
			)}
		</section>
	);
};
