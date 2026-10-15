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
			className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs font-semibold shadow-2xs"
			data-testid="comparison-expired-unblocked-badge"
		>
			<Clock size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
			<span>
				План составлен более 30 дней назад ({effectivePlanAgeDays} дн.), цены могут быть скорректированы. Стоимость зафиксирована по согласованию с врачом. Оказание услуг, оформление нарядов ЗТЛ и оплата производятся без ограничений.
			</span>
		</div>
	);
};
