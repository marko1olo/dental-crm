import React from "react";
import { DoctorShiftControlBar } from "../components/shift";
import type { ShiftMetricsHeaderProps } from "./shiftViewTypes";

export const ShiftViewMetricsHeader: React.FC<ShiftMetricsHeaderProps> = ({
	doctorName,
	cabinetName,
	isShiftOpen,
	onToggleShift,
	onOpenPayrollModal,
	onOpenT13Timesheet,
	shiftStats,
	financialMode,
	onChangeFinancialMode,
	chairRentalNetIncomeRub,
	chairRentalRentExpenseRub,
	onOpenChairRentalAct,
}) => {
	return (
		<div className="shift-view-metrics-header-wrap" data-testid="shift-metrics-header">
			<DoctorShiftControlBar
				doctorName={doctorName}
				cabinetName={cabinetName}
				isShiftOpen={isShiftOpen}
				onToggleShift={onToggleShift}
				onOpenPayrollModal={onOpenPayrollModal}
				onOpenT13Timesheet={onOpenT13Timesheet}
				shiftStats={shiftStats}
				financialMode={financialMode}
				onChangeFinancialMode={onChangeFinancialMode}
				chairRentalNetIncomeRub={chairRentalNetIncomeRub}
				chairRentalRentExpenseRub={chairRentalRentExpenseRub}
				onOpenChairRentalAct={onOpenChairRentalAct}
			/>
		</div>
	);
};
