/**
 * StudioInstallmentTab.tsx — Вкладка рассрочки 0% и налогового вычета 13% НДФЛ в Студии планов лечения.
 * Мандаты 8b, 8zi: Компактный модульный компонент (100–140 строк).
 * Мандат 8e: Автономия врача и пациента — выбор срока рассрочки, честные расчеты в копейках.
 * Мандат 8bm: Копеечная целостность через splitKopecks, отсутствие потери копеек нечетного деления.
 * Apple HIG: Тач-таргеты >= 44x44px, карточки 16px, нулевой горизонтальный скролл.
 */

import React, { useState, useMemo } from "react";
import { CreditCard, ShieldCheck, CheckCircle2, Sparkles, CalendarDays } from "lucide-react";
import { splitKopecks, formatKopecksToRub, rublesToKopecks, kopecksToRubles, percentageOfKopecks, type Kopecks } from "@dental/shared";
import type { TreatmentPlanTier } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";

export interface StudioInstallmentTabProps {
	readonly activeTier: TreatmentPlanTier;
	readonly patientName?: string | undefined;
	readonly onSelectInstallmentMonths?: ((months: number) => void) | undefined;
}

const INSTALLMENT_TERMS = [3, 6, 12, 24] as const;

export const StudioInstallmentTab: React.FC<StudioInstallmentTabProps> = ({
	activeTier,
	patientName: _patientName,
	onSelectInstallmentMonths,
}) => {
	const [selectedMonths, setSelectedMonths] = useState<number>(6);

	const handleTermSelect = (m: number) => {
		setSelectedMonths(m);
		if (onSelectInstallmentMonths) {
			onSelectInstallmentMonths(m);
		}
	};

	const totalKopecks: Kopecks = (activeTier.totalKopecks ?? rublesToKopecks(activeTier.totalRub)) as Kopecks;
	const totalRub = activeTier.totalRub;

	// Расчет вычета НДФЛ 13%
	const isExpensiveTreatment = totalRub > 150000;
	const ndflRefundKopecks = percentageOfKopecks(totalKopecks, 1300);
	const ndflRefundRub = Math.round(kopecksToRubles(ndflRefundKopecks));
	const netCostAfterNdfl = Math.max(0, totalRub - ndflRefundRub);

	const selectedParts = useMemo(
		() => splitKopecks(totalKopecks, selectedMonths),
		[totalKopecks, selectedMonths],
	);
	const firstPaymentKopecks = selectedParts[0] ?? 0;
	const regularPaymentKopecks = selectedParts[1] ?? firstPaymentKopecks;
	const hasRemainder = firstPaymentKopecks !== regularPaymentKopecks;

	return (
		<div className="space-y-6" data-testid="studio-installment-tab">
			{/* Верхний баннер тарифа */}
			<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between flex-wrap gap-3">
				<div>
					<span className="text-xs font-medium text-[var(--ink-muted)] block">Рассрочка по выбранному варианту:</span>
					<h3 className="text-base sm:text-lg font-semibold text-[var(--ink)] m-0">
						«{activeTier.title}» — {formatRubles(totalRub)}
					</h3>
				</div>
				<span className="px-3 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-medium text-xs flex items-center gap-1.5">
					<Sparkles className="w-3.5 h-3.5" />
					0% переплат клинике
				</span>
			</div>

			{/* Сетка выбора срока рассрочки */}
			<div>
				<h4 className="text-xs font-semibold text-[var(--ink-muted)] tracking-wider mb-3 flex items-center gap-1.5">
					<CreditCard className="w-4 h-4 text-[var(--primary)]" />
					<span>Срок беспроцентной рассрочки</span>
				</h4>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					{INSTALLMENT_TERMS.map((months) => {
						const parts = splitKopecks(totalKopecks, months);
						const monthlyRub = Math.round(kopecksToRubles(parts[0] ?? 0));
						const isSelected = selectedMonths === months;

						return (
							<button
								key={months}
								type="button"
								onClick={() => handleTermSelect(months)}
								className={`p-4 rounded-xl border text-left transition-all cursor-pointer min-h-[52px] flex flex-col justify-between ${
									isSelected
										? "border-[var(--primary)] bg-[var(--primary-soft)] ring-1 ring-[var(--primary)] shadow-xs"
										: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`installment-term-${months}-btn`}
							>
								<div className="flex items-center justify-between w-full mb-1">
									<span className="text-xs font-semibold text-[var(--ink)]">{months} месяцев</span>
									{isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />}
								</div>
								<div className="text-base sm:text-lg font-mono font-medium tracking-tight text-[var(--ink)]">
									{formatRubles(monthlyRub)}
									<span className="text-[10px] font-normal text-[var(--ink-muted)]">/мес</span>
								</div>
								<span className="text-[10px] font-medium text-[var(--primary)] mt-1">0% взнос</span>
							</button>
						);
					})}
				</div>

				{/* График и целостность копеек (Мандат 8bm) */}
				<div className="mt-3 p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between flex-wrap gap-2 text-xs">
					<div className="flex items-center gap-2 text-[var(--ink-muted)]">
						<CalendarDays className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span>
							График ({selectedMonths} мес.):{" "}
							{hasRemainder ? (
								<strong className="text-[var(--ink)] font-mono">
									1-й платёж {formatKopecksToRub(firstPaymentKopecks)}, далее {selectedMonths - 1} по{" "}
									{formatKopecksToRub(regularPaymentKopecks)}
								</strong>
							) : (
								<strong className="text-[var(--ink)] font-mono">
									{selectedMonths} платежей по {formatKopecksToRub(firstPaymentKopecks)}
								</strong>
							)}
						</span>
					</div>
					<span className="font-mono text-[var(--ink)] font-medium">
						Итого: {formatKopecksToRub(totalKopecks)}
					</span>
				</div>
			</div>

			{/* Блок налогового вычета 13% НДФЛ */}
			<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-3 shadow-2xs">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div>
							<h4 className="text-sm font-semibold text-[var(--ink)] m-0">Налоговый вычет 13% НДФЛ</h4>
							<span className="text-xs text-[var(--ink-muted)]">
								{isExpensiveTreatment
									? "Код услуги 02 (Дорогостоящее лечение — без лимита)"
									: "Код услуги 01 (Стандартное стоматологическое лечение)"}
							</span>
						</div>
					</div>
					<div className="text-right">
						<span className="text-xs text-[var(--ink-muted)] block">Возврат пациенту:</span>
						<span className="text-base sm:text-lg font-semibold text-[var(--primary)] font-mono tracking-tight">
							+{formatRubles(ndflRefundRub)}
						</span>
					</div>
				</div>

				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between text-xs sm:text-sm">
					<span className="font-medium text-[var(--ink)]">Фактическая стоимость лечения с учетом вычета:</span>
					<strong className="font-semibold text-[var(--primary)] text-sm sm:text-base font-mono tracking-tight">
						{formatRubles(netCostAfterNdfl)}
					</strong>
				</div>

				<p className="text-[11px] text-[var(--ink-muted)] m-0 leading-relaxed">
					Справку об оплате медицинских услуг для оформления налогового вычета клиника выдает бесплатно в день обращения или онлайн по завершении приёма.
				</p>
			</div>
		</div>
	);
};

export default StudioInstallmentTab;
