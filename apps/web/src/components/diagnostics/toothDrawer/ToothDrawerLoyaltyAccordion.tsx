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
				<div className="trigger-left min-w-0 flex-1">
					<div className="flex items-center gap-2 min-w-0">
						<Wallet size={16} className="shrink-0" color="var(--brand-primary, var(--teal))" />
						<span className="trigger-title truncate">4. Депозит & Бонусы</span>
					</div>
					<span className="trigger-summary text-[11px] text-[var(--muted)] font-medium pl-6 block sm:inline sm:pl-2">
						Единый счет семьи
					</span>
				</div>
				<div className="trigger-right shrink-0">
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
