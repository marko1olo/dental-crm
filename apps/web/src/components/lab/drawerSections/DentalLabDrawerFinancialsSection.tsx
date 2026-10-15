import React from "react";
import { parseFdiTeethString, calculateZtlWageFinancials } from "../dentalLabOrderEngine";
import { money } from "../../../AppHelpers";

export interface DentalLabDrawerFinancialsSectionProps {
	readonly formTeethInput: string;
	readonly formPatientPriceRub: number;
	readonly setFormPatientPriceRub: (val: number) => void;
	readonly formZtlCostRub: number;
	readonly setFormZtlCostRub: (val: number) => void;
	readonly formDoctorPercent: number;
	readonly setFormDoctorPercent: (val: number) => void;
}

export function DentalLabDrawerFinancialsSection({
	formTeethInput,
	formPatientPriceRub,
	setFormPatientPriceRub,
	formZtlCostRub,
	setFormZtlCostRub,
	formDoctorPercent,
	setFormDoctorPercent,
}: DentalLabDrawerFinancialsSectionProps) {
	const count = Math.max(1, parseFdiTeethString(formTeethInput).length);
	const fin = calculateZtlWageFinancials({
		unitsCount: count,
		patientPriceRub: formPatientPriceRub,
		ztlCostRub: formZtlCostRub,
		doctorSharePercent: formDoctorPercent,
	});

	return (
		<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-2">
			<div className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center justify-between">
				<span>Финансовый расчет наряда ЗТЛ</span>
				<span className="text-[11px] text-[var(--muted,#64748b)]">Вычет ЗТЛ из вала</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				<div>
					<label className="text-[11px] block mb-0.5">Пациент (₽/ед):</label>
					<input
						type="number"
						min={0}
						step={100}
						value={formPatientPriceRub}
						onChange={(e) => setFormPatientPriceRub(Number(e.target.value))}
						className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
						data-testid="form-patient-price-input"
					/>
				</div>
				<div>
					<label className="text-[11px] block mb-0.5">ЗТЛ себест. (₽/ед):</label>
					<input
						type="number"
						min={0}
						step={100}
						value={formZtlCostRub}
						onChange={(e) => setFormZtlCostRub(Number(e.target.value))}
						className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-teal-800 dark:text-teal-200"
						data-testid="form-ztl-cost-input"
					/>
				</div>
				<div>
					<label className="text-[11px] block mb-0.5">Доля врача (%):</label>
					<input
						type="number"
						min={0}
						max={100}
						value={formDoctorPercent}
						onChange={(e) => setFormDoctorPercent(Number(e.target.value))}
						className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono"
					/>
				</div>
			</div>

			<div className="pt-1.5 border-t border-teal-500/20 flex items-center justify-between text-[11px] font-mono">
				<span>
					База врача: <strong>{money(fin.doctorWageBaseRub)}</strong>
				</span>
				<span className="text-emerald-700 dark:text-emerald-300 font-bold">
					ЗП врача: {money(fin.doctorWageRub)}
				</span>
				<span className="text-[var(--muted,#64748b)]">
					Клиника: {money(fin.clinicMarginRub)}
				</span>
			</div>
		</div>
	);
}
