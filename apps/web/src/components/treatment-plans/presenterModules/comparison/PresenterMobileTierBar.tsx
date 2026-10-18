import React from "react";
import { Sparkles, Star } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../../types";

export interface PresenterMobileTierBarProps {
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
}

export const PresenterMobileTierBar: React.FC<PresenterMobileTierBarProps> = ({
	allTiers,
	selectedTierId,
	onSelectTier,
}) => {
	return (
		<div className="treatment-mobile-tier-bar" data-testid="mobile-tier-tabs">
			{allTiers.map((t) => {
				const isCurrent = selectedTierId === t.tierId;
				return (
					<button
						key={t.tierId}
						type="button"
						onClick={() => onSelectTier(t)}
						className={"treatment-mobile-tier-btn " + (isCurrent ? "active " : "") + t.tierId}
						data-testid={"mobile-tier-btn-" + t.tierId}
						aria-pressed={isCurrent}
					>
						<div className="flex items-center gap-1.5 font-extrabold text-[13px]">
							{t.tierId === "standard" && <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />}
							<span>
								{t.tierId === "economy"
									? "Эконом"
									: t.tierId === "standard"
										? "Оптимум"
										: "Премиум"}
							</span>
							{t.tierId === "standard" && <Sparkles size={12} className="text-amber-400 shrink-0" />}
						</div>
						<div className="text-[11px] font-mono opacity-90 font-bold">
							{t.totalRub.toLocaleString("ru-RU")} ₽
						</div>
					</button>
				);
			})}
		</div>
	);
};
