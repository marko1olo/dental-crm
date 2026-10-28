/**
 * PresenterFinancialSummary.tsx — Сводная калькуляция стоимости и этапов плана для договора/печати (SSOT).
 * Мандат 8b: Золотой стандарт modularity (60–90 строк).
 * Мандат 8e: Точность копеек через @dental/shared без погрешностей округления.
 */

import React from "react";
import type { TreatmentPlanTier } from "../treatmentPlanTypes";
import { formatRubles, kopecksToRub, rubToKopecks } from "../treatmentPlanTypes";

export interface PresenterFinancialSummaryProps {
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly activeTier: TreatmentPlanTier | null;
}

export const PresenterFinancialSummary: React.FC<PresenterFinancialSummaryProps> = ({
	patientName,
	doctorFullName,
	activeTier,
}) => {
	const totalKopecks = activeTier?.totalKopecks ?? rubToKopecks(activeTier?.totalRub || 0);
	const effectiveTotalRub = kopecksToRub(totalKopecks);

	return (
		<div className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-4 max-w-3xl mx-auto print:border-0 print:p-0">
			<div className="text-center pb-3 border-b border-[var(--line)]">
				<h3 className="text-lg font-black text-[var(--ink)] uppercase tracking-wider m-0">
					Приложение № 1 к Договору на оказание стоматологических услуг
				</h3>
				<p className="text-xs text-[var(--muted)] m-0 mt-1">
					План комплексного стоматологического лечения и финансовая смета
				</p>
			</div>

			<div className="grid grid-cols-2 gap-4 text-xs">
				<div>
					<span className="text-[var(--muted)] block">Пациент:</span>
					<strong className="text-[var(--ink)]">{patientName}</strong>
				</div>
				<div>
					<span className="text-[var(--muted)] block">Лечащий врач:</span>
					<strong className="text-[var(--ink)]">{doctorFullName}</strong>
				</div>
				<div>
					<span className="text-[var(--muted)] block">Выбранный вариант:</span>
					<strong className="text-[var(--teal)] font-bold">{activeTier?.title || "План лечения"}</strong>
				</div>
				<div>
					<span className="text-[var(--muted)] block">Гарантийные обязательства:</span>
					<strong className="text-[var(--ink)]">{activeTier?.warrantyYears || 1} года</strong>
				</div>
			</div>

			<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between">
				<span className="text-sm font-bold text-[var(--ink)]">Итоговая стоимость плана:</span>
				<span className="text-2xl font-black text-[var(--ink)]">
					{formatRubles(effectiveTotalRub)}
				</span>
			</div>
		</div>
	);
};

export default PresenterFinancialSummary;
