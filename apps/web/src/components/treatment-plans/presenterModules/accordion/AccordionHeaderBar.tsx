import React from "react";
import { Clock } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../../types";

export interface AccordionHeaderBarProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly onToggleAllStages: (expand: boolean) => void;
}

export const AccordionHeaderBar: React.FC<AccordionHeaderBarProps> = ({
	selectedTier,
	getTierLetter,
	onToggleAllStages,
}) => {
	return (
		<div className="treatment-stages-accordion-header">
			<div className="flex items-center gap-2">
				<Clock className="text-[var(--tp-primary)] w-5 h-5" />
				<div>
					<h4 className="text-sm font-bold text-[var(--tp-text-main)] m-0">
						Клинические этапы плана: {selectedTier.title} ({getTierLetter(selectedTier.tierId)})
					</h4>
					<p className="text-xs text-[var(--tp-text-muted)] m-0">
						Клинический протокол медицинских услуг и анатомические зоны FDI (11–48)
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onToggleAllStages(true)}
					className="min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--tp-surface-soft)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] border border-[var(--tp-border)] cursor-pointer inline-flex items-center justify-center"
					data-testid="expand-all-stages-btn"
				>
					Развернуть все
				</button>
				<button
					type="button"
					onClick={() => onToggleAllStages(false)}
					className="min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--tp-surface-soft)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] border border-[var(--tp-border)] cursor-pointer inline-flex items-center justify-center"
					data-testid="collapse-all-stages-btn"
				>
					Свернуть все
				</button>
			</div>
		</div>
	);
};
