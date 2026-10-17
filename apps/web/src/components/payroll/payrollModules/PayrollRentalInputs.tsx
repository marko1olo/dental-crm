import React from "react";
import { Building2 } from "lucide-react";

export interface PayrollRentalInputsProps {
	readonly shiftsCount: number;
	readonly shiftRateRub: number;
	readonly chairRentalRub: number;
	readonly onSetChairRentalRub: (val: number) => void;
	readonly onSetShiftsCount: (val: number) => void;
	readonly onSetShiftRateRub: (val: number) => void;
}

export const PayrollRentalInputs: React.FC<PayrollRentalInputsProps> = ({
	shiftsCount,
	shiftRateRub,
	chairRentalRub,
	onSetChairRentalRub,
	onSetShiftsCount,
	onSetShiftRateRub,
}) => {
	const handleShiftsCountChange = (count: number) => {
		const safeCount = Math.max(0, count);
		onSetShiftsCount(safeCount);
		onSetChairRentalRub(safeCount * shiftRateRub);
	};

	const handleShiftRateChange = (rate: number) => {
		const safeRate = Math.max(0, rate);
		onSetShiftRateRub(safeRate);
		onSetChairRentalRub(shiftsCount * safeRate);
	};

	return (
		<div className="flex flex-col gap-2 flex-1" data-testid="doctor-payroll-chair-rental-panel">
			<div className="flex items-center gap-2 flex-wrap">
				<Building2 className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				<span className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
					Аренда кресла (Соло):
				</span>
				<div className="flex items-center gap-1.5 flex-wrap">
					<div className="flex items-center gap-1">
						<input
							type="number"
							min={0}
							max={31}
							value={shiftsCount}
							onChange={(e) => handleShiftsCountChange(Number(e.target.value) || 0)}
							className="w-14 h-8 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-center font-bold text-xs"
							title="Количество отработанных смен"
							data-testid="doctor-payroll-shifts-count-input"
						/>
						<span className="text-[var(--muted,#64748b)]">смен ×</span>
					</div>
					<div className="flex items-center gap-1">
						<input
							type="number"
							min={0}
							step={500}
							value={shiftRateRub}
							onChange={(e) => handleShiftRateChange(Number(e.target.value) || 0)}
							className="w-20 h-8 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-right font-bold text-xs"
							title="Ставка субаренды за 1 смену"
							data-testid="doctor-payroll-shift-rate-input"
						/>
						<span className="text-[var(--muted,#64748b)]">₽/смена =</span>
					</div>
					<div className="flex items-center gap-1">
						<input
							type="number"
							min={0}
							value={chairRentalRub}
							onChange={(e) => onSetChairRentalRub(Math.max(0, Number(e.target.value) || 0))}
							className="w-24 h-8 px-2 rounded-lg border border-[var(--teal,#0d9488)]/40 bg-[var(--paper,#ffffff)] text-right font-black text-xs text-[var(--teal,#0d9488)]"
							title="Итоговая сумма аренды кресла за расчетный месяц"
							data-testid="doctor-payroll-chair-rental-input"
						/>
						<span className="font-bold text-[var(--ink,#0f172a)]">₽</span>
					</div>
				</div>
			</div>
			<div className="text-[11px] text-[var(--teal,#0d9488)] font-medium">
				Прозрачная соло-экономика: Выручка (касса 54-ФЗ) − Аренда ({shiftsCount} см × {shiftRateRub.toLocaleString("ru-RU")} ₽) − ЗТЛ − Материалы = 100% чистый доход
			</div>
		</div>
	);
};
