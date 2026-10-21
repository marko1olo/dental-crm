import { Sparkles } from "lucide-react";
import type React from "react";
import type {
	BankInstallmentCalculationResult,
	BankInstallmentProviderConfig,
	BankInstallmentProviderId,
} from "../bankInstallmentEngine";

export interface BankInstallmentBreakdownCardProps {
	readonly calculation: BankInstallmentCalculationResult;
	readonly selectedProvider: BankInstallmentProviderId;
	readonly activeProviderConfig: BankInstallmentProviderConfig;
}

export const BankInstallmentBreakdownCard: React.FC<
	BankInstallmentBreakdownCardProps
> = ({ calculation, selectedProvider, activeProviderConfig }) => {
	return (
		<div className="space-y-4">
			<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-xs text-[var(--muted,#64748b)]">
						Сумма этапа:
					</span>
					<strong className="text-sm text-[var(--ink,#0f172a)] font-mono">
						{calculation.totalRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>

				<div className="flex items-center justify-between pb-2 border-b border-[var(--border,#cbd5e1)]">
					<span className="text-xs text-[var(--muted,#64748b)]">
						Переплата:
					</span>
					<span className="font-bold text-emerald-600 dark:text-emerald-400">
						0 ₽ (0%)
					</span>
				</div>

				<div className="flex items-baseline justify-between pt-1">
					<div>
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
							{selectedProvider === "podeli"
								? "Платеж раз в 2 недели:"
								: "Ежемесячный платеж:"}
						</span>
						<span className="text-[11px] text-[var(--muted,#64748b)]">
							{selectedProvider === "podeli"
								? "4 равных части по 25%"
								: `На ${calculation.termMonths} мес`}
						</span>
					</div>
					<div className="text-right">
						<span className="text-xl font-black text-[var(--teal-dark,var(--brand-primary))] font-mono">
							{calculation.monthlyPaymentRub.toLocaleString("ru-RU")} ₽
						</span>
						<span className="text-[11px] text-[var(--muted,#64748b)] block">
							{selectedProvider === "podeli" ? "/ 2 нед." : "/ мес."}
						</span>
					</div>
				</div>
			</div>

			{/* Provider Advantages */}
			<div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
				<div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
					<Sparkles size={14} className="text-emerald-600" />
					<span>Преимущества {activeProviderConfig.name}:</span>
				</div>
				<ul className="space-y-1 text-emerald-900/80 dark:text-emerald-300 text-[11px] pl-4 list-disc">
					{activeProviderConfig.advantages.map((adv) => (
						<li key={adv}>{adv}</li>
					))}
				</ul>
			</div>

			{/* Payment Schedule Breakdown */}
			<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] p-4 space-y-2">
				<span className="font-bold text-xs text-[var(--ink,#0f172a)] block">
					График списаний:
				</span>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
					{calculation.schedule.slice(0, 4).map((item) => (
						<div
							key={item.paymentNumber}
							className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)]"
						>
							<span className="text-[10px] text-[var(--muted,#64748b)] block truncate">
								{item.dueDateText}
							</span>
							<strong className="text-xs font-mono text-[var(--ink,#0f172a)] block mt-0.5">
								{item.amountRub.toLocaleString("ru-RU")} ₽
							</strong>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
