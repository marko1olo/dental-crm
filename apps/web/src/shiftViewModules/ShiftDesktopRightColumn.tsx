import React from "react";
import type { RecommendedAction } from "@dental/shared";
import {
	DoctorShiftCashSection,
	ShiftTodoListSection,
} from "../components/shift";
import type { ShiftFinancialMode, ShiftRecommendedAction, ShiftViewStats, ShiftVisitPatient } from "./shiftViewTypes";

export interface ShiftDesktopRightColumnProps {
	shiftFinancialMode: ShiftFinancialMode;
	activeDoctorFullName: string;
	clinicName?: string | undefined;
	shiftStats: ShiftViewStats;
	chairRentalActTrigger: number;
	setChairRentalNetIncomeRub: (val: number) => void;
	setChairRentalRentExpenseRub: (val: number) => void;
	setIsShiftCloseModalOpen: (open: boolean) => void;
	visibleRecommendedActions?: readonly RecommendedAction[] | undefined;
	recommendedActionPriorityLabels?: Record<string, string> | undefined;
	patientsById: ReadonlyMap<string, ShiftVisitPatient>;
	runRecommendedAction: (action: ShiftRecommendedAction) => void;
	userRole?: string | undefined;
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
	userRole,
}) => (
	<div className="space-y-3 min-w-0" data-testid="shift-right-column">
		<DoctorShiftCashSection
			cashSummary={
				shiftStats?.cashBreakdown
					? {
							cashRub: shiftStats.cashBreakdown.cashRub ?? 0,
							cardRub: shiftStats.cashBreakdown.cardRub ?? 0,
							sbpRub: shiftStats.cashBreakdown.sbpRub ?? 0,
							depositRub: shiftStats.cashBreakdown.depositRub ?? 0,
							totalRevenueRub: shiftStats.totalRevenueRub ?? 0,
						}
					: undefined
			}
			totalRevenueRub={shiftStats?.totalRevenueRub ?? 0}
			doctorCommissionPct={shiftStats?.doctorCommissionPct ?? 30}
			estimatedDoctorPayoutRub={shiftStats?.estimatedDoctorPayoutRub ?? 0}
			doctorFullName={activeDoctorFullName}
			clinicName={clinicName ?? ""}
			userRole={userRole}
			completedPatientsCount={shiftStats?.completedCount ?? 0}
			totalAppointmentsCount={shiftStats?.totalAppointments ?? 0}
			onPrintStatement={() => setIsShiftCloseModalOpen(true)}
		/>

		<ShiftTodoListSection
			visibleRecommendedActions={visibleRecommendedActions}
			recommendedActionPriorityLabels={recommendedActionPriorityLabels}
			patientsById={patientsById}
			onRunRecommendedAction={runRecommendedAction}
		/>
	</div>
);
