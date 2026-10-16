import React from "react";
import { ShieldCheck, X } from "lucide-react";
import type { PatientSafetyEvaluationResult } from "../safetyMath";

export interface AnamnesisModalHeaderProps {
	readonly patientName?: string | null | undefined;
	readonly evaluation: PatientSafetyEvaluationResult;
	readonly onApplyNorm: () => void;
	readonly onClose: () => void;
}

export const AnamnesisModalHeader: React.FC<AnamnesisModalHeaderProps> = React.memo(({
	patientName,
	evaluation,
	onApplyNorm,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] select-none">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--teal)]">
					<ShieldCheck size={22} />
				</div>
				<div>
					<h3 className="m-0 text-base font-bold text-[var(--ink)]">
						Анкета соматического здоровья и стоп-факторов
					</h3>
					<div className="text-xs text-[var(--muted)]">
						{patientName || "Пациент не выбран"} • {evaluation.hasCriticalStopFlags ? "Выявлены критические стоп-факторы" : "Профиль в норме"}
					</div>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onApplyNorm}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1.5 text-xs cursor-pointer"
					data-testid="btn-anamnesis-apply-norm"
				>
					<ShieldCheck size={14} className="text-emerald-500" />
					<span>✓ Соматически здоров (норма)</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg p-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer"
					aria-label="Закрыть"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
});
