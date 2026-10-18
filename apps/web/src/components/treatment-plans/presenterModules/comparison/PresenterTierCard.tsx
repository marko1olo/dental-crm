import React from "react";
import { Check, CheckCircle2, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { formatWarrantyYearsText, type TreatmentPlanTier, type TreatmentPlanTierId } from "../../types";
import { TierCardPriceAndFinance } from "./TierCardPriceAndFinance";
import { TierCardAdvantagesAndStages } from "./TierCardAdvantagesAndStages";

export interface PresenterTierCardProps {
	readonly tier: TreatmentPlanTier;
	readonly isSelected: boolean;
	readonly isRecommended: boolean;
	readonly variantLetter: string;
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
	readonly onConfirmPatientChoice: (tier?: TreatmentPlanTier) => void;
	readonly setActiveTab?: ((tab: "comparison" | "stages" | "finance" | "print" | "aiAudit") => void) | undefined;
}

export const PresenterTierCard: React.FC<PresenterTierCardProps> = ({
	tier,
	isSelected,
	isRecommended,
	variantLetter,
	onSelectTier,
	onConfirmPatientChoice,
	setActiveTab,
}) => {
	return (
		<div
			onClick={() => onSelectTier(tier)}
			className={"treatment-tier-card " + (isSelected ? "selected " : "") + (isRecommended ? "recommended " : "") + tier.tierId + " cursor-pointer"}
			data-testid={"tier-card-" + tier.tierId}
		>
			{isRecommended && (
				<div className="treatment-doctor-ribbon" data-testid="doctor-recommendation-badge">
					<Sparkles size={13} className="shrink-0" />
					<span>Рекомендация врача</span>
				</div>
			)}

			<div className="treatment-tier-header">
				<div className="treatment-tier-badge-row">
					<span className={"treatment-tier-badge " + tier.tierId}>{variantLetter}</span>
					{isSelected && (
						<span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-300">
							<CheckCircle2 size={15} />
							<span>Выбран</span>
						</span>
					)}
				</div>
				<h3 className="treatment-tier-name text-[17px] font-extrabold text-[var(--tp-text-main)] break-words leading-snug">
					{tier.title}
				</h3>
				<p className="treatment-tier-desc text-xs text-[var(--tp-text-muted)] line-clamp-2 leading-relaxed">
					{tier.subtitle}
				</p>

				<TierCardPriceAndFinance tier={tier} setActiveTab={setActiveTab} />
			</div>

			<div className="treatment-tier-metrics">
				<div className="treatment-metric-item text-xs sm:text-[12.5px]">
					<Clock size={14} className="shrink-0" />
					<span>Срок:</span>
					<span className="treatment-metric-val font-bold text-[var(--tp-text-main)]">
						{tier.durationWeeks} нед. ({tier.durationVisits} виз.)
					</span>
				</div>
				<div className="treatment-metric-item text-xs sm:text-[12.5px]">
					<ShieldCheck size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
					<span>Гарантия:</span>
					<span className="treatment-metric-val font-bold text-[var(--tp-text-main)]">
						{formatWarrantyYearsText(tier.warrantyYears)}
					</span>
				</div>
			</div>

			<TierCardAdvantagesAndStages tier={tier} />

			<div className="p-3.5 pt-0">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onSelectTier(tier);
						onConfirmPatientChoice(tier);
					}}
					className={"treatment-tier-select-btn w-full cursor-pointer m-0 " + (isSelected ? "selected" : "")}
					data-testid={"apply-tier-btn-" + tier.tierId}
					aria-pressed={isSelected}
					title="Выбрать этот вариант и утвердить план лечения"
				>
					{isSelected ? (
						<>
							<CheckCircle2 size={16} className="shrink-0" />
							<span>Выбранный вариант — Начать лечение</span>
						</>
					) : (
						<>
							<Check size={16} className="shrink-0" />
							<span>Применить: выбрать этот вариант и начать лечение ({(tier.totalRub || 0).toLocaleString("ru-RU")} ₽)</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};
