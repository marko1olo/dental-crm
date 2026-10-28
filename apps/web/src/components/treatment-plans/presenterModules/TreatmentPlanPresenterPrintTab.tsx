import React from "react";
import type { TreatmentPlanTier } from "../treatmentPlanTypes";
import { formatRubles } from "../treatmentPlanTypes";

export interface TreatmentPlanPresenterPrintTabProps {
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly activeTier: TreatmentPlanTier | null;
}

export const TreatmentPlanPresenterPrintTab: React.FC<TreatmentPlanPresenterPrintTabProps> = ({
	patientName,
	doctorFullName,
	activeTier,
}) => {
	return (
		<div className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-4 max-w-3xl mx-auto print:border-0 print:p-0">
			<div className="text-center pb-3 border-b border-[var(--line)]">
				<h3 className="text-lg font-black text-[var(--ink)] uppercase tracking-wider m-0">
					Приложение к Договору на оказание стоматологических услуг
				</h3>
				<p className="text-xs text-[var(--muted)] m-0 mt-1">
					План стоматологического лечения и смета процедур клиники
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
					<strong className="text-[var(--teal)] font-bold">{activeTier?.title}</strong>
				</div>
				<div>
					<span className="text-[var(--muted)] block">Гарантийные обязательства:</span>
					<strong className="text-[var(--ink)]">{activeTier?.warrantyYears || 2} года</strong>
				</div>
			</div>

			<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between">
				<span className="text-sm font-bold text-[var(--ink)]">Итоговая стоимость плана:</span>
				<span className="text-2xl font-black text-[var(--ink)]">
					{formatRubles(activeTier?.totalRub || 0)}
				</span>
			</div>
		</div>
	);
};

export default TreatmentPlanPresenterPrintTab;
