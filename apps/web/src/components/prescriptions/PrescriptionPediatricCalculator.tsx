/**
 * PrescriptionPediatricCalculator.tsx — Child Weight & Dose Calculator
 * Automatically calculates single suspension dose (mg / ml) by weight.
 */

import { Sparkles } from "lucide-react";
import type React from "react";

export interface PrescriptionPediatricCalculatorProps {
	readonly patientWeightKg?: number | undefined;
	readonly onPatientWeightKgChange?:
		| ((val: number | undefined) => void)
		| undefined;
}

export const PrescriptionPediatricCalculator: React.FC<
	PrescriptionPediatricCalculatorProps
> = ({ patientWeightKg, onPatientWeightKgChange }) => {
	const weight = patientWeightKg ?? 15;
	const singleDoseMl = (weight / 2).toFixed(1);
	const singleDoseMg = Math.round(weight * 10);

	return (
		<div
			data-testid="pediatric-dose-calculator-card"
			className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100 flex flex-col gap-2 shrink-0"
		>
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-bold flex items-center gap-1.5 text-sky-800 dark:text-sky-200">
					<Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
					Детская дозировка (Ибупрофен 100 мг / 5 мл):
				</span>
				<span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-600 text-white shrink-0">
					10 мг/кг
				</span>
			</div>
			<div className="flex items-center gap-3 flex-wrap text-xs">
				<div className="flex items-center gap-1.5">
					<label
						htmlFor="pediatric-weight-input"
						className="text-xs text-[var(--muted)] font-medium"
					>
						Вес ребенка:
					</label>
					<input
						id="pediatric-weight-input"
						type="number"
						min="5"
						max="60"
						step="1"
						value={weight}
						onChange={(e) => {
							const val = Number.parseFloat(e.target.value);
							onPatientWeightKgChange?.(Number.isNaN(val) ? undefined : val);
						}}
						className="w-20 px-2 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-bold text-center"
					/>
					<span className="font-semibold text-[var(--ink)]">кг</span>
				</div>
				<div className="text-xs text-sky-800 dark:text-sky-200">
					Разово: <strong>{singleDoseMl} мл</strong> ({singleDoseMg} мг) до 3
					р/д
				</div>
			</div>
		</div>
	);
};
