import React from "react";
import { Zap } from "lucide-react";
import { DentalLabOrder } from "../../icons/DentalIcons.js";
import type { TreatmentPlanItem } from "../types";

export interface StageItemLabOrderButtonsProps {
	readonly item: TreatmentPlanItem;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
}

export const StageItemLabOrderButtons: React.FC<StageItemLabOrderButtonsProps> = ({
	item,
	onOpenLabOrder,
	onOneClickLabOrder,
}) => {
	if (!onOpenLabOrder) return null;

	const itemTeeth = item.toothNumber ? [item.toothNumber] : undefined;

	return (
		<div className="flex items-center gap-1.5">
			<button
				type="button"
				onClick={() => {
					onOpenLabOrder(itemTeeth, {
						selectedTeeth: itemTeeth,
						itemName: item.name,
						priceRub: (item as any).totalPriceRub || item.unitPriceRub,
						doctorId: (item as any).assignedDoctorId,
						doctorName: (item as any).assignedDoctorName,
					});
				}}
				className="h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] px-2.5 py-1 rounded-md text-[11px] font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal)]/20 border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer transition-colors shrink-0 touch-manipulation flex items-center gap-1.5"
				title={`Оформить наряд-заказ в зуботехническую лабораторию для ${item.name}`}
				data-testid={`item-lab-order-btn-${item.id}`}
			>
				<DentalLabOrder size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
				<span>Наряд в ЗТЛ</span>
			</button>
			{onOneClickLabOrder && (
				<button
					type="button"
					onClick={() => onOneClickLabOrder(itemTeeth)}
					className="h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] px-2 py-1 rounded-md text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer transition-colors shrink-0 touch-manipulation shadow-2xs flex items-center gap-1"
					title={`Наряд ЗТЛ: Коронка цирконий VITA A2 (+7 раб. дн.) для ${item.name}`}
					data-testid={`item-lab-order-one-click-btn-${item.id}`}
				>
					<Zap size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>Экспресс</span>
				</button>
			)}
		</div>
	);
};
