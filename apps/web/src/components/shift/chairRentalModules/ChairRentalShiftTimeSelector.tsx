import React from "react";
import type { ChairRentalModel } from "@dental/shared";

export interface ChairRentalShiftTimeSelectorProps {
	readonly model: ChairRentalModel;
	readonly hoursWorked: number;
	readonly onChangeHoursWorked: (val: number) => void;
	readonly shiftsCount: number;
	readonly onChangeShiftsCount: (val: number) => void;
	readonly workingDaysInMonth: number;
	readonly onChangeWorkingDaysInMonth: (val: number) => void;
	readonly widgetId: string;
}

export const ChairRentalShiftTimeSelector: React.FC<ChairRentalShiftTimeSelectorProps> = ({
	model,
	hoursWorked,
	onChangeHoursWorked,
	shiftsCount,
	onChangeShiftsCount,
	workingDaysInMonth,
	onChangeWorkingDaysInMonth,
	widgetId,
}) => {
	if (model === "hourly") {
		return (
			<div className="chair-rental-input-cell">
				<label htmlFor={`${widgetId}-hours-worked`} className="chair-rental-input-label">
					Часов смены
				</label>
				<input
					id={`${widgetId}-hours-worked`}
					type="number"
					min="0.5"
					max="24"
					step="0.5"
					value={hoursWorked}
					onChange={(e) => onChangeHoursWorked(Number(e.target.value))}
					className="chair-rental-input-field"
					data-testid="input-hours-worked"
				/>
			</div>
		);
	}

	if (model === "per_shift") {
		return (
			<div className="chair-rental-input-cell">
				<label htmlFor={`${widgetId}-shifts-count`} className="chair-rental-input-label">
					Кол-во смен
				</label>
				<input
					id={`${widgetId}-shifts-count`}
					type="number"
					min="1"
					step="1"
					value={shiftsCount}
					onChange={(e) => onChangeShiftsCount(Number(e.target.value))}
					className="chair-rental-input-field"
					data-testid="input-shifts-count"
				/>
			</div>
		);
	}

	if (model === "fixed_monthly") {
		return (
			<div className="chair-rental-input-cell">
				<label htmlFor={`${widgetId}-working-days`} className="chair-rental-input-label">
					Дней в мес.
				</label>
				<input
					id={`${widgetId}-working-days`}
					type="number"
					min="1"
					max="31"
					value={workingDaysInMonth}
					onChange={(e) => onChangeWorkingDaysInMonth(Number(e.target.value))}
					className="chair-rental-input-field"
					data-testid="input-working-days"
				/>
			</div>
		);
	}

	return null;
};
