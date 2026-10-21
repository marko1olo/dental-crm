import { Check, ShieldCheck } from "lucide-react";
import React from "react";

export interface PatientSomaticNormCardProps {
	readonly isSomaticNorm: boolean;
	readonly onToggleSomaticNorm: () => void;
}

export function PatientSomaticNormCard({
	isSomaticNorm,
	onToggleSomaticNorm,
}: PatientSomaticNormCardProps) {
	return (
		<div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
			<div
				className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
					isSomaticNorm
						? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
						: "bg-[var(--paper-soft)] border-[var(--glass-border)] text-[var(--muted)]"
				}`}
				data-testid="patient-creation-somatic-norm-banner"
			>
				<div className="flex items-center gap-2 min-w-0">
					<ShieldCheck
						size={16}
						className={isSomaticNorm ? "text-emerald-600 shrink-0" : "text-[var(--muted)] shrink-0"}
					/>
					<div className="text-xs font-medium truncate min-w-0">
						<span className="font-bold">Соматический статус:</span>{" "}
						{isSomaticNorm
							? "Физиологическая норма по умолчанию (соматически здоров)"
							: "Требуется ручное заполнение анкеты"}
					</div>
				</div>
				<button
					type="button"
					onClick={onToggleSomaticNorm}
					data-testid="btn-somatic-healthy-norm"
					className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
						isSomaticNorm
							? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
							: "bg-[var(--paper-strong)] hover:bg-[var(--glass-hover,var(--paper-soft))] text-[var(--ink)] border border-[var(--glass-border)] shadow-2xs"
					}`}
					title="✓ Соматически здоров / Аллергий нет (1 клик)"
				>
					<Check size={13} className="shrink-0" />
					<span>✓ Соматически здоров / Аллергий нет</span>
				</button>
			</div>
		</div>
	);
}
