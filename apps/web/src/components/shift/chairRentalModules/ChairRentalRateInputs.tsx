import React from "react";
import type { ChairRentalModel } from "@dental/shared";

export interface ChairRentalRateInputsProps {
	readonly model: ChairRentalModel;
	readonly hourlyRateRub: number;
	readonly onChangeHourlyRateRub: (val: number) => void;
	readonly shiftRateRub: number;
	readonly onChangeShiftRateRub: (val: number) => void;
	readonly landlordPercent: number;
	readonly onChangeLandlordPercent: (val: number) => void;
	readonly monthlyRateRub: number;
	readonly onChangeMonthlyRateRub: (val: number) => void;
	readonly grossRevenueRub: number;
	readonly onChangeGrossRevenueRub: (val: number) => void;
	readonly widgetId: string;
	readonly timeSelector?: React.ReactNode | undefined;
}

export const ChairRentalRateInputs: React.FC<ChairRentalRateInputsProps> = ({
	model,
	hourlyRateRub,
	onChangeHourlyRateRub,
	shiftRateRub,
	onChangeShiftRateRub,
	landlordPercent,
	onChangeLandlordPercent,
	monthlyRateRub,
	onChangeMonthlyRateRub,
	grossRevenueRub,
	onChangeGrossRevenueRub,
	widgetId,
	timeSelector,
}) => (
	<>
		{model === "hourly" && (
			<>
				<div className="chair-rental-input-cell">
					<label htmlFor={`${widgetId}-hourly-rate`} className="chair-rental-input-label">Ставка / час, ₽</label>
					<input id={`${widgetId}-hourly-rate`} type="number" min="0" step="100" value={hourlyRateRub} onChange={(e) => onChangeHourlyRateRub(Number(e.target.value))} className="chair-rental-input-field" data-testid="input-hourly-rate" />
				</div>
				{timeSelector}
			</>
		)}

		{model === "per_shift" && (
			<>
				<div className="chair-rental-input-cell">
					<label htmlFor={`${widgetId}-shift-rate`} className="chair-rental-input-label">Ставка смены, ₽</label>
					<input id={`${widgetId}-shift-rate`} type="number" min="0" step="500" value={shiftRateRub} onChange={(e) => onChangeShiftRateRub(Number(e.target.value))} className="chair-rental-input-field" data-testid="input-shift-rate" />
				</div>
				{timeSelector}
			</>
		)}

		{model === "revenue_percent" && (
			<div className="chair-rental-input-cell">
				<label htmlFor={`${widgetId}-landlord-percent`} className="chair-rental-input-label">Доля клиники, %</label>
				<input id={`${widgetId}-landlord-percent`} type="number" min="0" max="100" step="1" value={landlordPercent} onChange={(e) => onChangeLandlordPercent(Number(e.target.value))} className="chair-rental-input-field" data-testid="input-landlord-percent" />
			</div>
		)}

		{model === "fixed_monthly" && (
			<>
				<div className="chair-rental-input-cell">
					<label htmlFor={`${widgetId}-monthly-rate`} className="chair-rental-input-label">Аренда / мес, ₽</label>
					<input id={`${widgetId}-monthly-rate`} type="number" min="0" step="1000" value={monthlyRateRub} onChange={(e) => onChangeMonthlyRateRub(Number(e.target.value))} className="chair-rental-input-field" data-testid="input-monthly-rate" />
				</div>
				{timeSelector}
			</>
		)}

		<div className="chair-rental-input-cell">
			<label htmlFor={`${widgetId}-gross-rev`} className="chair-rental-input-label">Выручка, ₽</label>
			<input id={`${widgetId}-gross-rev`} type="number" min="0" step="1000" value={grossRevenueRub} onChange={(e) => onChangeGrossRevenueRub(Number(e.target.value))} className="chair-rental-input-field" data-testid="input-gross-revenue" />
		</div>
	</>
);
