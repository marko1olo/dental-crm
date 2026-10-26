import { ShieldAlert, ShieldCheck } from "lucide-react";
import React from "react";
import type { PatientSafetyEvaluationResult } from "../../patients/safetyMath";

export interface SomaticCardTopBarProps {
	readonly isNorm: boolean;
	readonly evaluation: PatientSafetyEvaluationResult;
	readonly patientName?: string | null | undefined;
	readonly onApplyNorm: () => void;
}

export const SomaticCardTopBar: React.FC<SomaticCardTopBarProps> = ({
	isNorm,
	evaluation,
	patientName,
	onApplyNorm,
}) => {
	const iconBg = isNorm
		? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
		: evaluation.hasCriticalStopFlags
			? "bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] border-2 border-[#ef4444]"
			: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 pb-3">
			<div className="flex items-center gap-2.5">
				<div className={`flex items-center justify-center w-8 h-8 rounded-xl border ${iconBg}`}>
					{isNorm ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
				</div>
				<div>
					<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white m-0">
						Соматический анамнез и факторы риска
					</h4>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">
						{patientName ? `Пациент: ${patientName} • ` : ""}
						Амбулаторная безопасность: норма по умолчанию, правка только патологии
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onApplyNorm}
					className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer active:scale-98 select-none"
					data-testid="mark-somatic-norm-btn"
					title="Соматически здоров, без отягощенного анамнеза (физиологическая норма)"
					aria-label="Физиологическая норма"
				>
					<ShieldCheck className="w-4 h-4 shrink-0" />
					<span>Соматически здоров / норма (1-клик)</span>
				</button>
			</div>
		</div>
	);
};
