/**
 * MaterialDeductionRulesCard.tsx
 *
 * Карточка прозрачных правил вычета зуботехнической лаборатории (ЗТЛ) и материалов.
 * Разъясняет логику расчёта базы гонорара врача и предотвращает споры «клиника — доктор».
 *
 * Инварианты:
 * - Мандат 8e: Автономия врача и обоснованные вычеты.
 * - Чистые CSS-токены (var(--paper), var(--line), var(--teal)).
 */

import React from "react";
import { AlertCircle, Calculator, CheckCircle2, ShieldCheck } from "lucide-react";

export const MaterialDeductionRulesCard: React.FC = () => {
	return (
		<div
			className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] mb-4"
			data-testid="material-deduction-rules-card"
		>
			<div className="flex items-center gap-2 mb-2.5">
				<ShieldCheck size={16} className="text-[var(--teal-dark)]" />
				<h5 className="m-0 text-xs font-bold text-[var(--ink)]">
					Правила удержания ЗТЛ и расходных материалов (Формула выплат)
				</h5>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
				{/* Правило ЗТЛ */}
				<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between shadow-2xs">
					<div>
						<div className="flex items-center gap-1.5 font-bold text-[var(--ink)] mb-1">
							<CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
							<span>Зуботехническая лаборатория (ЗТЛ)</span>
						</div>
						<p className="m-0 text-[11px] text-[var(--muted)] leading-relaxed">
							По умолчанию <strong>100% стоимости заказ-наряда</strong> вычитается из стоимости коронки/протеза до начисления процента ортопеду.
						</p>
					</div>
					<div className="mt-2 pt-1.5 border-t border-[var(--line)] text-[10px] text-[var(--muted)]">
						Пример: Коронка 25 000 ₽ − ЗТЛ 6 000 ₽ = База 19 000 ₽. Гонорар 22% = 4 180 ₽.
					</div>
				</div>

				{/* Правило материалов */}
				<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between shadow-2xs">
					<div>
						<div className="flex items-center gap-1.5 font-bold text-[var(--ink)] mb-1">
							<AlertCircle size={13} className="text-blue-600 dark:text-blue-400" />
							<span>Расходные материалы клиники</span>
						</div>
						<p className="m-0 text-[11px] text-[var(--muted)] leading-relaxed">
							Базовый стандарт РФ: <strong>0% удержания</strong> с врача (списываются в накладные расходы клиники по техкартам).
						</p>
					</div>
					<div className="mt-2 pt-1.5 border-t border-[var(--line)] text-[10px] text-[var(--muted)]">
						При дорогостоящих имплантатах клиника может установить удержание 5–10% титановой базы.
					</div>
				</div>

				{/* Формула расчета */}
				<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between shadow-2xs">
					<div>
						<div className="flex items-center gap-1.5 font-bold text-[var(--ink)] mb-1">
							<Calculator size={13} className="text-[var(--teal-dark)]" />
							<span>Итоговая формула расчета</span>
						</div>
						<p className="m-0 text-[11px] text-[var(--ink)] font-mono bg-[var(--paper-soft)] p-1.5 rounded-lg border border-[var(--line-subtle)] leading-relaxed">
							База = Оплата − (ЗТЛ × %уд) − (Мат × %уд)
							<br />
							Гонорар = База × Ставка% + Оклад
						</p>
					</div>
					<div className="mt-2 pt-1.5 border-t border-[var(--line)] text-[10px] text-teal-700 dark:text-teal-300 font-medium">
						Детерминированный расчёт с точностью до 1 копейки без скрытых округлений.
					</div>
				</div>
			</div>
		</div>
	);
};
