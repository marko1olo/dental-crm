/**
 * PieceRateSummaryCard.tsx
 *
 * Итоговая ведомость начисления сдельной оплаты и финансового баланса клиники.
 * Все расчеты ведутся строго с точностью до 1 копейки (integer kopecks).
 */

import React from "react";
import { formatKopecksToRublesDisplay, type DoctorPieceRatePayoutResult } from "@dental/shared";

export interface PieceRateSummaryCardProps {
	readonly calculation: DoctorPieceRatePayoutResult;
}

export const PieceRateSummaryCard: React.FC<PieceRateSummaryCardProps> = ({
	calculation,
}) => {
	return (
		<div className="p-4 rounded-xl bg-gradient-to-br from-[var(--paper-soft)] to-[var(--paper)] border border-[var(--line)] shadow-2xs space-y-3">
			<span className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
				<span>Ведомость начисления</span>
				<span className="text-[11px] font-mono text-[var(--muted)]">Точность: 1 копейка</span>
			</span>

			<div className="space-y-1.5 text-xs text-[var(--ink)]">
				<div className="flex justify-between py-1 border-b border-[var(--line)]">
					<span className="text-[var(--muted)]">Общая выручка врача:</span>
					<span className="font-bold">
						{formatKopecksToRublesDisplay(calculation.totalRevenueKopecks)}
					</span>
				</div>

				<div className="flex justify-between py-0.5 text-[11px]">
					<span className="text-[var(--muted)]">Начислено комиссионных:</span>
					<span className="font-semibold text-emerald-600 dark:text-emerald-400">
						+{formatKopecksToRublesDisplay(calculation.grossAccruedCommissionKopecks)}
					</span>
				</div>

				{calculation.baseShiftSalaryKopecks > 0 && (
					<div className="flex justify-between py-0.5 text-[11px]">
						<span className="text-[var(--muted)]">Окладная часть за смены:</span>
						<span className="font-semibold text-emerald-600 dark:text-emerald-400">
							+{formatKopecksToRublesDisplay(calculation.baseShiftSalaryKopecks)}
						</span>
					</div>
				)}

				{calculation.withheldLabKopecks > 0 && (
					<div className="flex justify-between py-0.5 text-[11px]">
						<span className="text-[var(--muted)]">Удержание за ЗТЛ:</span>
						<span className="font-semibold text-amber-600 dark:text-amber-400">
							−{formatKopecksToRublesDisplay(calculation.withheldLabKopecks)}
						</span>
					</div>
				)}

				{calculation.withheldMaterialKopecks > 0 && (
					<div className="flex justify-between py-0.5 text-[11px]">
						<span className="text-[var(--muted)]">Удержание за материалы:</span>
						<span className="font-semibold text-amber-600 dark:text-amber-400">
							−{formatKopecksToRublesDisplay(calculation.withheldMaterialKopecks)}
						</span>
					</div>
				)}
			</div>

			{/* К выплате врачу */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-card)] border border-[var(--teal)] shadow-xs flex items-center justify-between">
				<div>
					<span className="text-[11px] font-bold text-[var(--ink)] block">
						К выплате врачу на руки
					</span>
					<span className="text-[10px] text-[var(--muted)] block">
						После всех вычетов и надбавок
					</span>
				</div>
				<span className="text-base font-extrabold text-[var(--teal)]">
					{formatKopecksToRublesDisplay(calculation.netPayoutKopecks)}
				</span>
			</div>

			{/* Доход клиники */}
			<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
				<div>
					<span className="text-[11px] font-bold text-[var(--ink)] block">
						Маржинальный доход клиники
					</span>
					<span className="text-[10px] text-[var(--muted)] block">
						Эффективная доля клиники
					</span>
				</div>
				<div className="text-right">
					<span className="text-sm font-bold text-[var(--ink)] block">
						{formatKopecksToRublesDisplay(
							calculation.totalRevenueKopecks - calculation.netPayoutKopecks,
						)}
					</span>
					<span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
						{calculation.clinicMarginPct}% маржа
					</span>
				</div>
			</div>
		</div>
	);
};
