import { Sparkles } from "lucide-react";
import React from "react";

export interface TelephonyDrawerTreatmentPlanProps {
	activeTreatmentPlan?: {
		hasActivePlan: boolean;
		formattedTotalCost: string;
		planTitle: string | null;
		completedCount: number;
		itemsCount: number;
		progressPercent: number;
	} | null | undefined;
}

export function TelephonyDrawerTreatmentPlan({
	activeTreatmentPlan,
}: TelephonyDrawerTreatmentPlanProps): React.JSX.Element | null {
	if (!activeTreatmentPlan || !activeTreatmentPlan.hasActivePlan) return null;

	return (
		<div
			className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal-soft)] space-y-2 shadow-xs"
			data-testid="telephony-drawer-active-plan-card"
		>
			<div className="flex items-center justify-between gap-1">
				<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
					<Sparkles size={13} className="text-amber-500 shrink-0" />
					<span>План лечения:</span>
				</span>
				<span className="text-[11px] font-bold text-[var(--ink)]">
					{activeTreatmentPlan.formattedTotalCost}
				</span>
			</div>
			<div className="text-xs font-semibold text-[var(--ink)]">
				{activeTreatmentPlan.planTitle}
			</div>
			<div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
				<span>
					Выполнено: {activeTreatmentPlan.completedCount} из {activeTreatmentPlan.itemsCount} ({activeTreatmentPlan.progressPercent}%)
				</span>
			</div>
			<div className="w-full h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
				<div
					className="h-full bg-[var(--teal)] rounded-full transition-all"
					style={{ width: `${Math.min(100, Math.max(0, activeTreatmentPlan.progressPercent))}%` }}
				/>
			</div>
		</div>
	);
}
