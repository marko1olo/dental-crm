import React from "react";

export interface PayrollFixedRentalInputsProps {
	readonly shiftsCount: number;
	readonly shiftRateRub: number;
	readonly chairRentalRub: number;
	readonly onSetShiftsCount: (val: number) => void;
	readonly onSetShiftRateRub: (val: number) => void;
	readonly onSetChairRentalRub: (val: number) => void;
}

export const PayrollFixedRentalInputs: React.FC<PayrollFixedRentalInputsProps> = ({
	shiftsCount,
	shiftRateRub,
	chairRentalRub,
	onSetShiftsCount,
	onSetShiftRateRub,
	onSetChairRentalRub,
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
	);
};
