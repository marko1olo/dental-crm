/**
 * TreatmentPlanPaymentSchedule.tsx — Прозрачный график платежей и рассрочки
 * (Wave 19 / Chairside Cashflow Protection & Installments).
 *
 * Защита от кассовых разрывов клиники:
 * - Сплит 30% / 40% / 30% (Аванс на материалы -> Промежуточный -> Финал)
 * - Беспроцентная рассрочка 0% на 3, 6, 12 или 24 месяца
 * - Государственный возврат 13% НДФЛ по справке КНД 1151156
 */

import React, { useMemo } from "react";
import {
	CreditCard,
	ShieldCheck,
	Receipt,
	ArrowRight,
	Percent,
	Calendar,
	CheckCircle,
} from "lucide-react";
import {
	parseKopecks,
	calculateStaged304030Schedule,
	calculatePlanTaxDeductionBreakdown,
} from "@dental/shared";
import type { TreatmentPlanTier } from "./treatmentPlanPresenterTypes";

export interface TreatmentPlanPaymentScheduleProps {
	readonly tier: TreatmentPlanTier;
	readonly selectedMonths: 3 | 6 | 12 | 24;
	readonly onSelectMonths: (months: 3 | 6 | 12 | 24) => void;
	readonly isPrepaymentEnabled?: boolean;
}

export const TreatmentPlanPaymentSchedule: React.FC<TreatmentPlanPaymentScheduleProps> = ({
	tier,
	selectedMonths,
	onSelectMonths,
	isPrepaymentEnabled = true,
}) => {
	const totalKopecks = parseKopecks(tier.totalRub);

	// Канонический расчет этапов 30/40/30 из @dental/shared
	const schedule304030 = useMemo(() => {
		return calculateStaged304030Schedule(totalKopecks);
	}, [totalKopecks]);

	// Расчет налогового вычета 13% НДФЛ из @dental/shared
	const taxBreakdown = useMemo(() => {
		const planItemsForTax = tier.stages.flatMap((s) =>
			s.items.map((it) => ({
				id: it.id,
				name: it.name,
				serviceName: it.name,
				code804n: it.code804n,
				priceRub: it.unitPriceRub || it.priceRub,
				quantity: it.quantity || 1,
			})),
		);
		return calculatePlanTaxDeductionBreakdown(planItemsForTax);
	}, [tier.stages]);

	const monthlyRub = Math.round(tier.totalRub / selectedMonths);
	const deductionRub = taxBreakdown.grandTotalRefund13Rub;
	const netCostWithDeductionRub = Math.max(0, tier.totalRub - deductionRub);

	return (
		<div
			className="treatment-payment-schedule-container flex flex-col gap-4"
			data-testid="treatment-plan-payment-schedule"
		>
			{/* Карточка комфортной рассрочки 0% */}
			<section className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
				<div className="flex items-center justify-between gap-3 flex-wrap mb-4">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
							<Percent size={18} />
						</div>
						<div>
							<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">
								Беспроцентная рассрочка 0%
							</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Оплата равными частями без переплат и скрытых комиссий
							</p>
						</div>
					</div>

					{/* Выбор периода рассрочки (Segmented Control по Apple HIG) */}
					<div
						className="inline-flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)]"
						role="group"
						aria-label="Срок рассрочки"
					>
						{([3, 6, 12, 24] as const).map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => onSelectMonths(m)}
								className={`min-h-[36px] min-w-[48px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									selectedMonths === m
										? "bg-[var(--paper)] text-[var(--teal)] shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{m} мес.
							</button>
						))}
					</div>
				</div>

				{/* Итоговый комфортный платеж */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)]">
					<div>
						<span className="text-[11px] text-[var(--muted)] block">Платеж в месяц</span>
						<span className="text-lg sm:text-xl font-black text-[var(--teal)] font-mono">
							{monthlyRub.toLocaleString("ru-RU")} ₽/мес
						</span>
					</div>
					<div>
						<span className="text-[11px] text-[var(--muted)] block">Общая сумма плана</span>
						<span className="text-base sm:text-lg font-bold text-[var(--ink)] font-mono">
							{tier.totalRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div>
						<span className="text-[11px] text-[var(--muted)] block">Переплата банку / клинике</span>
						<span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
							0 ₽ (0%)
						</span>
					</div>
				</div>
			</section>

			{/* График поэтапной оплаты 30/40/30 (Защита клиники от разрывов) */}
			{isPrepaymentEnabled && (
				<section className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
					<div className="flex items-center gap-2.5 mb-3">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
							<ShieldCheck size={18} />
						</div>
						<div>
							<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">
								Поэтапная оплата по факту визитов
							</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Деньги списываются поэтапно, защищая бюджет пациента и материалы клиники
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						{/* Шаг 1: Аванс 30% */}
						<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col justify-between">
							<div>
								<div className="flex items-center justify-between mb-1.5">
									<span className="text-xs font-bold text-[var(--teal)]">Этап 1: Аванс 30%</span>
									<span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal)] font-medium">
										Перед стартом
									</span>
								</div>
								<div className="text-base sm:text-lg font-extrabold text-[var(--ink)] font-mono mb-1">
									{schedule304030.stage1AdvanceTherapyRub.toLocaleString("ru-RU")} ₽
								</div>
								<p className="text-[11.5px] text-[var(--muted)] m-0">
									Санация полости рта, бронь расходных материалов и имплантов
								</p>
							</div>
						</div>

						{/* Шаг 2: Промежуточный 40% */}
						<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col justify-between">
							<div>
								<div className="flex items-center justify-between mb-1.5">
									<span className="text-xs font-bold text-purple-600 dark:text-purple-400">
										Этап 2: Хирургия 40%
									</span>
									<span className="text-[10.5px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
										День операции
									</span>
								</div>
								<div className="text-base sm:text-lg font-extrabold text-[var(--ink)] font-mono mb-1">
									{schedule304030.stage2SurgeryImplantRub.toLocaleString("ru-RU")} ₽
								</div>
								<p className="text-[11.5px] text-[var(--muted)] m-0">
									Установка дентальных имплантатов и костно-пластические работы
								</p>
							</div>
						</div>

						{/* Шаг 3: Финал 30% */}
						<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col justify-between">
							<div>
								<div className="flex items-center justify-between mb-1.5">
									<span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
										Этап 3: Финал 30%
									</span>
									<span className="text-[10.5px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
										При сдаче работы
									</span>
								</div>
								<div className="text-base sm:text-lg font-extrabold text-[var(--ink)] font-mono mb-1">
									{schedule304030.stage3OrthopedicsRub.toLocaleString("ru-RU")} ₽
								</div>
								<p className="text-[11.5px] text-[var(--muted)] m-0">
									Постоянная фиксация коронок и оформление гарантийного талона
								</p>
							</div>
						</div>
					</div>
				</section>
			)}

			{/* Государственный налоговый вычет 13% */}
			<section className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
						<Receipt size={17} />
					</div>
					<div>
						<div className="text-xs sm:text-sm font-bold text-[var(--ink)]">
							Возврат 13% НДФЛ через ФНС (Справка КНД 1151156)
						</div>
						<div className="text-xs text-[var(--muted)]">
							Клиника подготовит полный пакет документов для налоговой в 1 клик
						</div>
					</div>
				</div>

				<div className="text-right">
					<span className="text-xs text-[var(--muted)] block">Экономия пациента:</span>
					<span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
						-{deductionRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>
			</section>
		</div>
	);
};
