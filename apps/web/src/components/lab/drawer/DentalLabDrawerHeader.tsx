import React from "react";
import { Layers, X } from "lucide-react";

export interface DentalLabDrawerHeaderProps {
	readonly isEditing: boolean;
	readonly orderNumber?: string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly onClose: () => void;
}

export const DentalLabDrawerHeader: React.FC<DentalLabDrawerHeaderProps> = ({
	isEditing,
	orderNumber,
	treatmentPlanId,
	stageNumber,
	stageTitle,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shrink-0 gap-2">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 flex-wrap">
					<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
						{isEditing ? `Наряд-заказ № ${orderNumber}` : "Новый наряд-заказ в лабораторию"}
					</h3>
					<span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
						Ортопедия
					</span>
				</div>
				{(treatmentPlanId || stageNumber != null || stageTitle) && (
					<div className="mt-1 flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300 font-medium">
						<Layers size={12} className="shrink-0" />
						<span className="truncate" data-testid="drawer-treatment-stage-chip">
							План лечения: Этап {stageNumber ?? 3} · {stageTitle || "Ортопедический этап"}
						</span>
					</div>
				)}
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:border-[var(--teal)] flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs"
				data-testid="drawer-close-btn"
				aria-label="Закрыть шторку"
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	);
};
