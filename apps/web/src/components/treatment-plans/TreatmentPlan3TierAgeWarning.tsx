import React from "react";
import { Clock } from "lucide-react";

export interface TreatmentPlan3TierAgeWarningProps {
	readonly effectivePlanAgeDays: number;
}

export const TreatmentPlan3TierAgeWarning: React.FC<TreatmentPlan3TierAgeWarningProps> = ({
	effectivePlanAgeDays,
}) => {
	if (effectivePlanAgeDays <= 30) return null;

	return (
		<div
			className="flex items-center gap-2.5 p-3 rounded-2xl bg-[var(--warning-soft)] border border-[var(--warning-line,#fde68a)] text-[var(--warning-ink,#92400e)] text-xs font-semibold shadow-2xs"
			data-testid="comparison-expired-unblocked-badge"
		>
			<Clock size={15} className="text-[var(--warning,#d97706)] shrink-0" />
			<span>
				План составлен более 30 дней назад ({effectivePlanAgeDays} дн.), цены могут быть скорректированы. Стоимость зафиксирована по согласованию с врачом. Оказание услуг, оформление нарядов ЗТЛ и оплата производятся без ограничений.
			</span>
		</div>
	);
};
