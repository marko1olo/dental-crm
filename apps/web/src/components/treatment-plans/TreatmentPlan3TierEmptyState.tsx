import React from "react";
import { Layers } from "lucide-react";

export interface TreatmentPlan3TierEmptyStateProps {
	readonly className?: string | undefined;
}

export const TreatmentPlan3TierEmptyState: React.FC<TreatmentPlan3TierEmptyStateProps> = ({
	className = "",
}) => {
	return (
		<div
			className={`treatment-3tier-empty p-8 rounded-2xl border border-dashed border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-center text-xs text-[var(--muted,#64748b)] space-y-3 w-full ${className}`.trim()}
			data-testid="treatment-plan-empty-state"
		>
			<Layers className="w-10 h-10 mx-auto text-[var(--muted,#64748b)] opacity-40" />
			<div className="font-bold text-sm text-[var(--ink,#0f172a)]">
				План лечения ещё не составлен
			</div>
			<p className="max-w-md mx-auto m-0 text-xs text-[var(--muted,#64748b)]">
				В одонтограмме пациента нет патологий или план лечения пуст. Добавьте услуги из каталога или примените клинический пакет.
			</p>
		</div>
	);
};
