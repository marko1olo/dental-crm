import type React from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../types.js";

interface StagesTabHeaderProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly selectedTierId: TreatmentPlanTierId;
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
}

export const StagesTabHeader: React.FC<StagesTabHeaderProps> = ({
	selectedTier,
	selectedTierId,
	allTiers,
	onSelectTier,
}) => {
	return (
		<div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex-wrap gap-3">
			<div>
				<h3 className="text-base font-bold text-[var(--tp-text-main)] m-0">
					Развернутая смета клинических этапов лечения
				</h3>
				<p className="text-xs text-[var(--tp-text-muted)] m-0">
					Выбранный вариант: <strong>{selectedTier.title}</strong> · Итого по смете:{" "}
					<strong className="text-[var(--tp-primary)]">
						{selectedTier.totalRub.toLocaleString("ru-RU")} ₽
					</strong>
				</p>
			</div>

			<div className="inline-flex items-center p-[3px] rounded-[10px] bg-[var(--paper-soft,var(--tp-surface-soft))] border border-[var(--line-subtle,var(--tp-border))] shadow-2xs">
				{allTiers.map((t) => (
					<button
						key={t.tierId}
						type="button"
						onClick={() => onSelectTier(t)}
						className={`h-7 px-3 rounded-[7px] text-[12.5px] cursor-pointer transition-all whitespace-nowrap ${
							selectedTierId === t.tierId
								? "bg-[var(--paper,var(--tp-surface,#ffffff))] text-[var(--teal,var(--tp-primary))] font-semibold shadow-xs"
								: "text-[var(--muted,var(--tp-text-muted))] font-medium hover:text-[var(--ink,var(--tp-text-main))] hover:bg-black/5 dark:hover:bg-white/5"
						}`}
						data-testid={`stages-tab-tier-btn-${t.tierId}`}
					>
						{t.badge}
					</button>
				))}
			</div>
		</div>
	);
};
