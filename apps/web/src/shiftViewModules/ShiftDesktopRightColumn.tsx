import React from "react";
import {
	ChairRentalShiftWidget,
	DoctorShiftCashSection,
	ShiftTodoListSection,
} from "../components/shift";
import type { ShiftFinancialMode } from "./shiftViewTypes";

export interface ShiftDesktopRightColumnProps {
	shiftFinancialMode: ShiftFinancialMode;
	activeDoctorFullName: string;
	clinicName?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: stats
	shiftStats: any;
	chairRentalActTrigger: number;
	setChairRentalNetIncomeRub: (val: number) => void;
	setChairRentalRentExpenseRub: (val: number) => void;
	setIsShiftCloseModalOpen: (open: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: actions
	visibleRecommendedActions?: any[] | undefined;
	recommendedActionPriorityLabels?: Record<string, string> | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: patients
	patientsById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: action
	runRecommendedAction: (action: any) => void;
}

export const ShiftDesktopRightColumn: React.FC<ShiftDesktopRightColumnProps> = ({
	shiftFinancialMode,
	activeDoctorFullName,
	clinicName,
	shiftStats,
	chairRentalActTrigger,
	setChairRentalNetIncomeRub,
	setChairRentalRentExpenseRub,
	setIsShiftCloseModalOpen,
	visibleRecommendedActions,
	recommendedActionPriorityLabels,
	patientsById,
	runRecommendedAction,
}) => (
	<div className="space-y-4 min-w-0" data-testid="shift-right-column">
		{shiftFinancialMode === "chair_rental" ? (
			<ChairRentalShiftWidget
				doctorFullName={activeDoctorFullName}
				clinicName={clinicName || "ООО «Денте Стоматология»"}
				initialGrossRevenueRub={shiftStats.totalRevenueRub}
				externalOpenActTrigger={chairRentalActTrigger}
				onEconomicsChange={(econ) => {
					setChairRentalNetIncomeRub(econ.netProfitRub);
					setChairRentalRentExpenseRub(econ.rentExpenseRub);
				}}
			/>
		) : (
			<DoctorShiftCashSection
				totalRevenueRub={shiftStats.totalRevenueRub}
				doctorCommissionPct={shiftStats.doctorCommissionPct}
				estimatedDoctorPayoutRub={shiftStats.estimatedDoctorPayoutRub}
				doctorFullName={activeDoctorFullName}
				clinicName={clinicName ?? ""}
				onPrintStatement={() => setIsShiftCloseModalOpen(true)}
			/>
		)}

		<ShiftTodoListSection
			visibleRecommendedActions={visibleRecommendedActions}
			recommendedActionPriorityLabels={recommendedActionPriorityLabels}
			patientsById={patientsById}
			onRunRecommendedAction={runRecommendedAction}
		/>
	</div>
);
