import React from "react";
import type { DoctorShiftCompensationModel } from "./doctorShiftCloseTypes";

export interface DoctorShiftCompensationInputsProps {
	readonly compensationModel: DoctorShiftCompensationModel;
	readonly commissionPct: number;
	readonly onSetCommissionPct: (pct: number) => void;
	readonly labDeductionsRub: number;
	readonly onSetLabDeductionsRub: (rub: number) => void;
	readonly fixedRentRub: number;
	readonly onSetFixedRentRub: (rub: number) => void;
	readonly baseSalaryRub: number;
	readonly onSetBaseSalaryRub: (rub: number) => void;
}

const Row: React.FC<{ label: string; value: number; onChange: (v: number) => void; unit: string; min?: number; max?: number; step?: number; width?: string; ariaLabel: string }> = ({
	label, value, onChange, unit, min = 0, max, step = 500, width = "w-20", ariaLabel,
}) => (
	<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between">
		<span className="text-[var(--muted,#64748b)]">{label}</span>
		<div className="flex items-center gap-1">
			<input
				type="number"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value) || 0)}
				className={`${width} px-1.5 py-0.5 text-right font-bold bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded text-xs`}
				aria-label={ariaLabel}
			/>
			<span className="text-[var(--muted,#64748b)]">{unit}</span>
		</div>
	</div>
);

export const DoctorShiftCompensationInputs: React.FC<DoctorShiftCompensationInputsProps> = ({
	compensationModel,
	commissionPct,
	onSetCommissionPct,
	labDeductionsRub,
	onSetLabDeductionsRub,
	fixedRentRub,
	onSetFixedRentRub,
	baseSalaryRub,
	onSetBaseSalaryRub,
}) => (
	<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
		{compensationModel === "piece_rate" && (
			<>
				<Row label="Вычет лаборатории ЗТЛ:" value={labDeductionsRub} onChange={onSetLabDeductionsRub} unit="₽" ariaLabel="Вычет ЗТЛ" />
				<Row label="Сдельная ставка врача:" value={commissionPct} onChange={onSetCommissionPct} unit="%" max={100} step={1} width="w-14" ariaLabel="Процентная ставка" />
			</>
		)}
		{compensationModel === "chair_rental" && (
			<>
				<Row label="Стоимость аренды смены:" value={fixedRentRub} onChange={onSetFixedRentRub} unit="₽" ariaLabel="Фиксированная аренда смены" />
				<Row label="Вычет ЗТЛ / материалов:" value={labDeductionsRub} onChange={onSetLabDeductionsRub} unit="₽" ariaLabel="Вычет ЗТЛ и материалов" />
			</>
		)}
		{compensationModel === "salary_plus_bonus" && (
			<>
				<Row label="Оклад за выход:" value={baseSalaryRub} onChange={onSetBaseSalaryRub} unit="₽" ariaLabel="Базовый оклад за выход" />
				<Row label="Бонус от услуг:" value={commissionPct} onChange={onSetCommissionPct} unit="%" max={100} step={1} width="w-14" ariaLabel="Процент бонуса" />
			</>
		)}
	</div>
);
