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
						? "bg-[var(--success-soft)] border-[var(--success)]/30 text-[var(--ink)]"
						: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink-muted)]"
				}`}
				data-testid="patient-creation-somatic-norm-banner"
			>
				<div className="flex items-center gap-2 min-w-0">
					<ShieldCheck
						size={16}
						className={isSomaticNorm ? "text-[var(--success)] shrink-0" : "text-[var(--ink-muted)] shrink-0"}
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
					className={`min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
						isSomaticNorm
							? "bg-[var(--success)] hover:bg-[var(--success)]/90 text-white shadow-xs"
							: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] shadow-2xs"
					}`}
					title="Соматически здоров / Аллергий нет"
				>
					<Check size={14} className="shrink-0" />
					<span>Соматически здоров / Аллергий нет</span>
				</button>
			</div>
		</div>
	);
}
