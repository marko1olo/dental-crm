import React from "react";
import { User } from "lucide-react";
import type { TreatmentPlanTier } from "../types";

export interface SignaturePlanSummaryProps {
	readonly tier: TreatmentPlanTier;
	readonly patientName: string;
}

export const SignaturePlanSummary: React.FC<SignaturePlanSummaryProps> = ({ tier, patientName }) => {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#e2e8f0)]">
			<div className="space-y-0.5">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--teal-dark,var(--teal,#0d9488))]">
						Выбранный вариант:
					</span>
					<span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-[var(--teal-soft,rgba(20,184,166,0.1))] text-[var(--teal-dark,var(--teal,#0d9488))] border border-[var(--teal,rgba(20,184,166,0.3))]">
						{tier.title}
					</span>
				</div>
				<p className="text-xs text-[var(--muted,#64748b)] flex items-center gap-1.5 pt-1 m-0">
					<User size={13} /> Пациент: <strong>{patientName}</strong>
				</p>
			</div>

			<div className="text-right">
				<span className="text-xs text-[var(--muted,#64748b)]">Сумма по смете:</span>
				<div className="text-lg font-black text-teal-600 dark:text-teal-400 font-mono">
					{tier.totalRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>
		</div>
	);
};
