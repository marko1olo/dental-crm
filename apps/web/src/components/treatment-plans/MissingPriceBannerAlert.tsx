import React from "react";
import { AlertTriangle } from "lucide-react";
import type { TreatmentPlanItem } from "./types";
import type { useMissingPriceAlert } from "./useMissingPriceAlert";
import { MissingPriceBannerActions } from "./MissingPriceBannerActions";

export interface MissingPriceBannerAlertProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
	readonly className?: string | undefined;
}

export const MissingPriceBannerAlert: React.FC<MissingPriceBannerAlertProps> = ({
	item,
	state,
	className = "",
}) => {
	const { error } = state;

	return (
		<div
			className={`missing-price-alert-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100 text-xs transition-all ${className}`.trim()}
			data-testid={`missing-price-alert-${item.id}`}
		>
			<div className="flex items-start sm:items-center gap-2.5 min-w-0">
				<div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
					<AlertTriangle size={16} />
				</div>
				<div className="flex flex-col min-w-0">
					<div className="font-bold text-amber-900 dark:text-amber-200 leading-snug">
						Требуется ручная оценка: услуга не найдена в прайс-листе клиники (укажите цену)
					</div>
					<div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 truncate">
						{item.code804n ? `${item.code804n} · ` : ""}{item.name}
					</div>
				</div>
			</div>

			<MissingPriceBannerActions item={item} state={state} />

			{error && (
				<div className="w-full text-[11px] text-rose-600 font-bold sm:hidden">{error}</div>
			)}
		</div>
	);
};
