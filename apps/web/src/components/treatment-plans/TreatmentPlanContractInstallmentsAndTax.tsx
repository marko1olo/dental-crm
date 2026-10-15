import React from "react";
import { Clock, CreditCard, ShieldCheck } from "lucide-react";
import { type Kopecks, splitKopecks } from "@dental/shared";
import type { TreatmentPlanTier } from "./types";

export interface TreatmentPlanContractInstallmentsAndTaxProps {
	readonly tier: TreatmentPlanTier;
	readonly finalTotalKopecks: Kopecks;
	readonly finalTotalRub: number;
	readonly installmentMonths: number;
	readonly planAgeDays?: number | undefined;
}

export const TreatmentPlanContractInstallmentsAndTax: React.FC<TreatmentPlanContractInstallmentsAndTaxProps> = ({
	tier,
	finalTotalKopecks,
	finalTotalRub,
	installmentMonths,
	planAgeDays,
}) => {
	return (
		<>
			{/* Installments & Tax Refund Row */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[10px]">
				<div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
					<div className="flex items-center justify-between flex-wrap gap-1">
						<div className="flex items-center gap-1.5 font-bold text-[var(--teal-dark,var(--teal))] text-[11px]">
							<CreditCard size={13} />
							<span>Программа беспроцентной рассрочки 0% ({installmentMonths} мес.):</span>
						</div>
						<span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase tracking-wider">
							0% переплат
						</span>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
						{([3, 6, 12, 24] as const).map((m) => {
							const parts = splitKopecks(finalTotalKopecks, m);
							const monthly = Math.round((parts[0] ?? 0) / 100);
							const isCurrent = m === installmentMonths;
							return (
								<div key={m} className={`p-1.5 rounded-lg border ${isCurrent ? "bg-teal-50 border-teal-300 ring-1 ring-teal-200" : "bg-slate-50/80 border-slate-200"}`}>
									<div className="text-[9px] text-slate-500 font-semibold">{m} мес.</div>
									<div className="text-[11px] font-mono font-bold text-slate-900">{monthly.toLocaleString("ru-RU")} ₽</div>
								</div>
							);
						})}
					</div>
					<p className="text-slate-500 text-[9.5px] m-0">
						Без первого взноса и скрытых комиссий. Ежемесячный платеж при рассрочке на {installmentMonths} мес.: <strong>{(tier.installments?.[installmentMonths as 3 | 6 | 12 | 24]?.monthlyPaymentRub ?? Math.round(finalTotalRub / installmentMonths)).toLocaleString("ru-RU")} ₽/мес</strong>.
					</p>
				</div>

				<div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
					<div className="flex items-center justify-between flex-wrap gap-1">
						<div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
							<ShieldCheck size={13} />
							<span>Налоговый вычет 13% ({tier.ndflDetails?.code === "02" ? "Дорогостоящее лечение" : "Стандартное лечение"}):</span>
						</div>
						<span className="font-mono font-bold text-emerald-700 text-xs">+{tier.ndflRefundRub.toLocaleString("ru-RU")} ₽ к возврату</span>
					</div>
					<div className="flex items-baseline justify-between text-[10.5px] text-slate-600">
						<span>Чистая стоимость с учетом вычета:</span>
						<strong className="font-mono text-slate-900 text-xs">{Math.max(0, finalTotalRub - tier.ndflRefundRub).toLocaleString("ru-RU")} ₽</strong>
					</div>
					<p className="text-slate-500 text-[9.5px] m-0">
						Справку об оплате медицинских услуг для налогового органа клиника оформляет и выдает бесплатно.
					</p>
				</div>
			</div>

			{planAgeDays !== undefined && planAgeDays > 30 && (
				<div className="p-2.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-[10px] flex items-center gap-2">
					<Clock size={13} className="text-amber-600 shrink-0" />
					<span>
						<strong>Примечание:</strong> План составлен более 30 дней назад ({planAgeDays} дн.), цены могут быть скорректированы. Стоимость зафиксирована и утверждена лечащим врачом. Оказание услуг, оформление нарядов ЗТЛ и оплата производятся без ограничений.
					</span>
				</div>
			)}
		</>
	);
};
