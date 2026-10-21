import { formatKopecksRu, type Kopecks } from "@dental/shared";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import type React from "react";

export interface BankInstallmentFooterProps {
	readonly isApprovedState: boolean;
	readonly stageAmountKopecks: Kopecks;
	readonly onClose: () => void;
}

export const BankInstallmentFooter: React.FC<BankInstallmentFooterProps> = ({
	isApprovedState,
	stageAmountKopecks,
	onClose,
}) => {
	if (isApprovedState) {
		return (
			<div
				className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-3"
				data-testid="installment-approved-banner"
			>
				<div className="flex items-center gap-2.5">
					<CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
					<div>
						<h4 className="font-bold text-sm">Рассрочка одобрена банком!</h4>
						<p className="text-[11px] mt-0.5">
							Средства в размере {formatKopecksRu(stageAmountKopecks)} зачислены
							на эскроу-депозит пациента. Наряд в ЗТЛ разблокирован.
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition cursor-pointer shrink-0"
				>
					Готово
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border,#cbd5e1)]">
			<div className="text-[11px] text-[var(--muted,#64748b)] flex items-center gap-1.5">
				<ShieldCheck size={14} className="text-emerald-500 shrink-0" />
				<span>
					Деньги поступают на счет клиники сразу после подтверждения банком
				</span>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-[var(--border,#cbd5e1)] transition cursor-pointer"
			>
				Закрыть
			</button>
		</div>
	);
};
