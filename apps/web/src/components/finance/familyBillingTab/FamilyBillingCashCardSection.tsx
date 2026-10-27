import React from "react";
import { Banknote, CreditCard } from "lucide-react";
import type { CombinedFamilyBillingResult } from "@dental/shared";

export interface FamilyBillingCashCardSectionProps {
	readonly additionalPaymentMethod: "card" | "cash";
	readonly billingResult: CombinedFamilyBillingResult;
	readonly cashReceivedRub: number;
	readonly setCashReceivedRub: (val: number) => void;
}

export const FamilyBillingCashCardSection: React.FC<FamilyBillingCashCardSectionProps> = ({
	additionalPaymentMethod,
	billingResult,
	cashReceivedRub,
	setCashReceivedRub,
}) => {
	if (additionalPaymentMethod === "card") {
		return (
			<div className="p-4 sm:p-5 rounded-xl bg-[var(--paper,#ffffff)] border border-blue-500/30 space-y-4">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<CreditCard size={20} className="text-blue-600" />
						<h4 className="font-extrabold text-sm sm:text-base m-0 text-[var(--ink,#0f172a)]">
							Оплата банковской картой ({billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU")} ₽)
						</h4>
					</div>
					<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
						Безналичный расчет
					</span>
				</div>

				<div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-950 dark:text-blue-200 flex items-center gap-3">
					<CreditCard size={28} className="text-blue-600 shrink-0" />
					<div>
						<div className="font-bold text-sm">Приложите карту к банковскому POS-терминалу</div>
						<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
							Принимаются карты МИР, Visa, Mastercard, Maestro. При подтверждении эквайринга единый чек регистрирует безналичную оплату.
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (additionalPaymentMethod === "cash") {
		return (
			<div className="p-4 sm:p-5 rounded-xl bg-[var(--paper,#ffffff)] border border-emerald-500/30 space-y-4">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<Banknote size={20} className="text-emerald-600" />
						<h4 className="font-extrabold text-sm sm:text-base m-0 text-[var(--ink,#0f172a)]">
							Оплата наличными ({billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU")} ₽)
						</h4>
					</div>
					<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
						Наличный расчет
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
							Получено от пациента (руб.):
						</label>
						<input
							type="number"
							min="0"
							step="10"
							value={cashReceivedRub || ""}
							placeholder={billingResult.defaultSplit.remainingDueRub.toString()}
							onChange={(e) => setCashReceivedRub(Math.max(0, Number(e.target.value) || 0))}
							className="w-full h-11 px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] font-mono font-bold text-base bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
						/>
						<div className="flex gap-1.5 mt-2 flex-wrap">
							<button
								type="button"
								onClick={() => setCashReceivedRub(billingResult.defaultSplit.remainingDueRub)}
								className="min-h-[44px] inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] cursor-pointer"
							>
								Без сдачи ({billingResult.defaultSplit.remainingDueRub} ₽)
							</button>
							{[500, 1000, 2000, 5000].map((preset) => (
								<button
									key={preset}
									type="button"
									onClick={() => setCashReceivedRub(preset)}
									className="min-h-[44px] inline-flex items-center px-2 py-1 rounded-lg text-xs font-mono font-semibold border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] cursor-pointer"
								>
									{preset.toLocaleString("ru-RU")} ₽
								</button>
							))}
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--line,#e2e8f0)] flex flex-col justify-center">
						<span className="text-xs text-[var(--muted,#64748b)] font-bold">Расчет сдачи:</span>
						<div className={`text-2xl font-mono font-black mt-1 ${
							cashReceivedRub >= billingResult.defaultSplit.remainingDueRub
								? "text-emerald-600 dark:text-emerald-400"
								: "text-amber-600 dark:text-amber-400"
						}`}>
							{cashReceivedRub >= billingResult.defaultSplit.remainingDueRub
								? `${(cashReceivedRub - billingResult.defaultSplit.remainingDueRub).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`
								: `Недостает ${(billingResult.defaultSplit.remainingDueRub - (cashReceivedRub || 0)).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`}
						</div>
						<div className="text-[11px] text-[var(--muted,#64748b)] mt-1">
							Сдача рассчитывается автоматически в кассовом чеке
						</div>
					</div>
				</div>
			</div>
		);
	}

	return null;
};
