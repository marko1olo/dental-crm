import React from "react";
import { Clock, CreditCard, ShieldCheck } from "lucide-react";
import { type Kopecks, splitKopecks, kopecksToRubles } from "@dental/shared";
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
				<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2 shadow-2xs">
					<div className="flex items-center justify-between flex-wrap gap-1">
						<div className="flex items-center gap-1.5 font-bold text-[var(--primary)] text-[11px]">
							<CreditCard size={13} />
							<span>Программа беспроцентной рассрочки 0% ({installmentMonths} мес.):</span>
						</div>
						<span className="px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success-ink,#166534)] border border-[var(--success-line,#bbf7d0)] font-semibold text-[9px]">
							0% переплат
						</span>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
						{([3, 6, 12, 24] as const).map((m) => {
							const parts = splitKopecks(finalTotalKopecks, m);
							const monthly = Math.round(kopecksToRubles(parts[0] ?? 0));
							const isCurrent = m === installmentMonths;
							return (
								<div key={m} className={`p-1.5 rounded-lg border ${isCurrent ? "bg-[var(--primary-soft)] border-[var(--primary)] ring-1 ring-[var(--primary)]/30" : "bg-[var(--paper-soft)] border-[var(--line)]"}`}>
									<div className="text-[9px] text-[var(--ink-muted)] font-semibold">{m} мес.</div>
									<div className="text-[11px] font-mono font-bold text-[var(--ink)]">{monthly.toLocaleString("ru-RU")} ₽</div>
								</div>
							);
						})}
					</div>
					<p className="text-[var(--ink-muted)] text-[9.5px] m-0">
						Без первого взноса и скрытых комиссий. Ежемесячный платеж при рассрочке на {installmentMonths} мес.: <strong>{(tier.installments?.[installmentMonths as 3 | 6 | 12 | 24]?.monthlyPaymentRub ?? Math.round(finalTotalRub / installmentMonths)).toLocaleString("ru-RU")} ₽/мес</strong>.
					</p>
				</div>

				<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2 shadow-2xs">
					<div className="flex items-center justify-between flex-wrap gap-1">
						<div className="flex items-center gap-1.5 font-bold text-[var(--success-ink,#166534)] text-[11px]">
							<ShieldCheck size={13} />
							<span>Налоговый вычет 13% ({tier.ndflDetails?.code === "02" ? "Дорогостоящее лечение" : "Стандартное лечение"}):</span>
						</div>
						<span className="font-mono font-bold text-[var(--success-ink,#15803d)] text-xs">+{(tier.ndflRefundRub ?? Math.round(finalTotalRub * 0.13)).toLocaleString("ru-RU")} ₽ к возврату</span>
					</div>
					<div className="flex items-baseline justify-between text-[10.5px] text-[var(--ink-muted)]">
						<span>Чистая стоимость с учетом вычета:</span>
						<strong className="font-mono text-[var(--ink)] text-xs">{Math.max(0, finalTotalRub - (tier.ndflRefundRub ?? Math.round(finalTotalRub * 0.13))).toLocaleString("ru-RU")} ₽</strong>
					</div>
					<p className="text-[var(--ink-muted)] text-[9.5px] m-0">
						Справку об оплате медицинских услуг для налогового органа клиника оформляет и выдает бесплатно.
					</p>
				</div>
			</div>

			{planAgeDays !== undefined && planAgeDays > 30 && (
				<div className="p-2.5 rounded-xl bg-[var(--warning-soft)] border border-[var(--warning-line,#fde68a)] text-[var(--warning-ink,#92400e)] text-[10px] flex items-center gap-2">
					<Clock size={13} className="text-[var(--warning,#d97706)] shrink-0" />
					<span>
						<strong>Примечание:</strong> План составлен более 30 дней назад ({planAgeDays} дн.), цены могут быть скорректированы. Стоимость зафиксирована и утверждена лечащим врачом. Оказание услуг, оформление нарядов ЗТЛ и оплата производятся без ограничений.
					</span>
				</div>
			)}
		</>
	);
};
