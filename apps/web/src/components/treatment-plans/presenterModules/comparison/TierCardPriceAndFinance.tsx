import React from "react";
import { Percent } from "lucide-react";
import type { TreatmentPlanTier } from "../../types";

export interface TierCardPriceAndFinanceProps {
	readonly tier: TreatmentPlanTier;
	readonly setActiveTab?: ((tab: "comparison" | "stages" | "finance" | "print" | "aiAudit") => void) | undefined;
}

export const TierCardPriceAndFinance: React.FC<TierCardPriceAndFinanceProps> = ({
	tier,
	setActiveTab,
}) => {
	return (
		<div className="treatment-tier-price-box">
			<div className="text-[11px] font-extrabold text-[var(--tp-text-muted)] uppercase tracking-wider">
				Итоговая стоимость
			</div>
			<div className="treatment-tier-total-amount">
				<span>{(tier.totalRub || 0).toLocaleString("ru-RU")}</span>
				<span className="treatment-tier-rub-sign">₽</span>
			</div>
			<div className="treatment-tier-finance-chips">
				<div className="treatment-tier-chip-row text-xs sm:text-[13px]">
					<span className="font-semibold text-[var(--tp-text-muted)]">Рассрочка 0% (12 мес):</span>
					<span className="treatment-tier-chip-highlight text-sm sm:text-base font-extrabold font-mono text-[var(--tp-primary)]">
						{(tier.monthlyInstallment12Rub || 0).toLocaleString("ru-RU")} ₽/мес
					</span>
				</div>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setActiveTab?.("finance");
					}}
					className="treatment-tier-ndfl-calc-btn cursor-pointer"
					title="Расчет налогового вычета 13% НДФЛ и справка ФНС"
					data-testid={"calc-ndfl-btn-" + tier.tierId}
				>
					<div className="flex items-center justify-between w-full">
						<span className="flex items-center gap-1 font-bold text-xs sm:text-[13px] text-emerald-700 dark:text-emerald-300">
							<Percent size={13} />
							<span>Вычет 13% НДФЛ:</span>
						</span>
						<span className="font-black text-sm sm:text-base font-mono text-emerald-700 dark:text-emerald-300">
							−{(tier.ndflRefundRub || 0).toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="text-[11px] font-medium text-emerald-700/90 dark:text-emerald-300/90 text-left mt-0.5">
						Итого с вычетом: {(tier.priceWithNdflRefundRub || 0).toLocaleString("ru-RU")} ₽ ({tier.ndflDetails.code === "02" ? "Код 02 без лимита" : "Код 01 лимит 150к"})
					</div>
				</button>
			</div>
		</div>
	);
};
