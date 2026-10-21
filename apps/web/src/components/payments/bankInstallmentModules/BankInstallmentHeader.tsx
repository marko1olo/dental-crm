import { formatKopecksRu, type Kopecks } from "@dental/shared";
import { CreditCard, X } from "lucide-react";
import type React from "react";

export interface BankInstallmentHeaderProps {
	readonly stageTitle?: string | undefined;
	readonly stageAmountKopecks: Kopecks;
	readonly patientName?: string | undefined;
	readonly onClose: () => void;
}

export const BankInstallmentHeader: React.FC<BankInstallmentHeaderProps> = ({
	stageTitle = "Комплексный этап лечения",
	stageAmountKopecks,
	patientName = "",
	onClose,
}) => {
	return (
		<header className="bank-installment-header">
			<div className="flex items-center gap-3">
				<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20">
					<CreditCard className="h-6 w-6" />
				</div>
				<div>
					<h3
						id="bank-installment-title"
						className="text-base font-bold text-[var(--ink,#0f172a)] flex items-center gap-2 m-0"
					>
						Оформление банковской рассрочки
						<span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
							0% переплат
						</span>
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
						{patientName} · {stageTitle} (
						<strong className="text-[var(--ink,#0f172a)]">
							{formatKopecksRu(stageAmountKopecks)}
						</strong>
						)
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
				aria-label="Закрыть"
				data-testid="bank-installment-close-btn"
			>
				<X className="h-5 w-5" />
			</button>
		</header>
	);
};
