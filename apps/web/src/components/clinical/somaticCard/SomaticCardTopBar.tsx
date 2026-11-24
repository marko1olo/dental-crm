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
		? "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]/30"
		: evaluation.hasCriticalStopFlags
			? "bg-[var(--danger-soft)] text-[var(--danger)] border-2 border-[var(--danger)]"
			: "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/30";

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
			<div className="flex items-center gap-2.5">
				<div className={`flex items-center justify-center w-8 h-8 rounded-xl border ${iconBg}`}>
					{isNorm ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
				</div>
				<div>
					<h4 className="text-sm font-semibold text-[var(--ink)] m-0">
						Соматический анамнез и факторы риска
					</h4>
					<p className="text-xs text-[var(--ink-muted)] m-0">
						{patientName ? `Пациент: ${patientName} • ` : ""}
						Амбулаторная безопасность: норма по умолчанию, правка только патологии
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onApplyNorm}
					className="inline-flex items-center justify-center gap-2 px-3.5 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] rounded-xl font-medium text-sm bg-[var(--success)] hover:bg-[var(--success)]/90 text-white shadow-xs transition-all cursor-pointer active:scale-98 select-none shrink-0"
					data-testid="mark-somatic-norm-btn"
					title="Соматически здоров, без отягощенного анамнеза (физиологическая норма)"
					aria-label="Физиологическая норма"
				>
					<ShieldCheck className="w-4 h-4 shrink-0" />
					<span>Соматически здоров / норма</span>
				</button>
			</div>
		</div>
	);
};
