import React from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import type { TreatmentPlanTier } from "../types";

export interface PresenterInstallment0PercentCardProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly installmentMonths: 3 | 6 | 12 | 24;
	readonly setInstallmentMonths: (months: 3 | 6 | 12 | 24) => void;
}

export const PresenterInstallment0PercentCard: React.FC<
	PresenterInstallment0PercentCardProps
> = ({ selectedTier, installmentMonths, setInstallmentMonths }) => {
	const monthlyPayment =
		selectedTier.installments[installmentMonths]?.monthlyPaymentRub ?? 0;

	return (
		<div className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col justify-between gap-4">
			<div>
				<div className="flex items-center gap-2 text-[var(--tp-primary)] mb-2">
					<CreditCard size={20} />
					<h4 className="text-sm font-bold text-[var(--tp-text-main)] m-0">
						Рассрочка 0% без первого взноса и переплат
					</h4>
				</div>
				<p className="text-xs text-[var(--tp-text-muted)] leading-relaxed">
					Оплата лечения равными частями без процентов. Равномерное копеечное распределение.
				</p>

				<div className="flex items-center gap-2 my-4">
					{([3, 6, 12, 24] as const).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => setInstallmentMonths(m)}
							className={
								"flex-1 min-h-[38px] py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer " +
								(installmentMonths === m
									? "bg-[var(--tp-primary)] text-white border-[var(--tp-primary)] shadow-sm"
									: "bg-[var(--tp-surface-soft)] text-[var(--tp-text-muted)] border-[var(--tp-border)] hover:text-[var(--tp-text-main)]")
							}
						>
							{m} мес.
						</button>
					))}
				</div>

				<div className="p-4 rounded-xl bg-[var(--tp-bg)] border border-[var(--tp-border)] flex flex-col gap-2">
					<div className="flex items-center justify-between text-xs text-[var(--tp-text-muted)]">
						<span>Сумма плана:</span>
						<span className="font-bold text-[var(--tp-text-main)]">
							{selectedTier.totalRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="flex items-center justify-between text-xs text-[var(--tp-text-muted)]">
						<span>Срок рассрочки:</span>
						<span className="font-bold text-[var(--tp-text-main)]">
							{installmentMonths} месяцев
						</span>
					</div>
					<div className="pt-2 border-t border-[var(--tp-border)] flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--tp-text-main)]">
							Ежемесячный платёж:
						</span>
						<span className="text-base font-extrabold text-[var(--tp-primary)]">
							{monthlyPayment.toLocaleString("ru-RU")} ₽/мес
						</span>
					</div>
				</div>
			</div>

			<div className="text-[11px] text-[var(--tp-text-muted)] flex items-center gap-1.5 opacity-80">
				<ShieldCheck size={14} className="text-teal-500 shrink-0" />
				<span>Оформление у администратора клиники за 5 минут без справок о доходах</span>
			</div>
		</div>
	);
};
