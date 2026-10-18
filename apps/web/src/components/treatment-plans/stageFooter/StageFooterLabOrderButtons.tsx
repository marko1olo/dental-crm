import React from "react";
import { Zap } from "lucide-react";
import { DentalLabOrder } from "../../icons/DentalIcons.js";
import type { TreatmentPlanStage } from "../types";
import type { StageFooterActionFlags } from "./stageFooterHelpers";

export interface StageFooterLabOrderButtonsProps {
	readonly stage: TreatmentPlanStage;
	readonly flags: StageFooterActionFlags;
	readonly onClose: () => void;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
}

export const StageFooterLabOrderButtons: React.FC<StageFooterLabOrderButtonsProps> = ({
	stage,
	flags,
	onClose,
	onOpenLabOrder,
	onOneClickLabOrder,
}) => {
	const stageTeeth = stage.items
		.map((it) => it.toothNumber)
		.filter((t): t is number => typeof t === "number" && t > 0);

	return (
		<>
			{onOpenLabOrder && flags.isLabOrderEligible && (
				<button
					type="button"
					onClick={() => {
						onClose();
						onOpenLabOrder(stageTeeth.length > 0 ? stageTeeth : undefined, {
							selectedTeeth: stageTeeth.length > 0 ? stageTeeth : undefined,
							stageId: stage.id,
							stageNumber: stage.stageNumber,
							stageTitle: stage.title,
							priceRub: stage.totalRub,
							doctorId: (stage as any).assignedDoctorId,
							doctorName: (stage as any).assignedDoctorName,
						});
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
					title="Оформить наряд-заказ в зуботехническую лабораторию"
					data-testid={`stage-${stage.stageNumber}-lab-order-btn`}
					role="menuitem"
				>
					<DentalLabOrder size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>Наряд-заказ в ЗТЛ</span>
				</button>
			)}

			{onOneClickLabOrder && flags.isLabOrderEligible && (
				<button
					type="button"
					onClick={() => {
						onClose();
						onOneClickLabOrder(stageTeeth.length > 0 ? stageTeeth : undefined);
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-500/15 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
					title="Оформить наряд в ЗТЛ (Диоксид циркония / E.max, цвет VITA A2, +7 раб. дней)"
					data-testid={`stage-${stage.stageNumber}-lab-order-one-click-btn`}
					role="menuitem"
				>
					<Zap size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>Наряд ЗТЛ (Цирконий A2)</span>
				</button>
			)}
		</>
	);
};
