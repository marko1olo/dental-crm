import React from "react";
import type { Dashboard } from "@dental/shared";
import { ShiftDesktopCockpitGrid } from "./ShiftDesktopCockpitGrid";
import { ShiftSecondaryAccordion } from "./ShiftSecondaryAccordion";
import { ShiftViewMetricsHeader } from "./ShiftViewMetricsHeader";
import type { ShiftFinancialMode } from "./shiftViewTypes";

export interface ShiftDesktopViewWrapProps {
	dashboard?: Dashboard;
	activeDoctorFullName: string;
	cabinetName: string;
	isShiftOpen: boolean;
	handleToggleShift: () => void;
	setIsPayrollModalOpen: (open: boolean) => void;
	setIsTimesheetT13ModalOpen: (open: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: generic
	shiftData: any;
	shiftFinancialMode: ShiftFinancialMode;
	handleChangeFinancialMode: (mode: ShiftFinancialMode) => void;
	chairRentalNetIncomeRub: number;
	chairRentalRentExpenseRub: number;
	setChairRentalActTrigger: React.Dispatch<React.SetStateAction<number>>;
	chairRentalActTrigger: number;
	// biome-ignore lint/suspicious/noExplicitAny: generic
	visibleRecommendedActions?: any[];
	recommendedActionPriorityLabels?: Record<string, string>;
	setSelectedPatientId?: (id: string | null) => void;
	setError?: (err: unknown) => void;
	setIsQueueBoardModalOpen: (open: boolean) => void;
	setIsShiftCloseModalOpen: (open: boolean) => void;
	setChairRentalNetIncomeRub: (val: number) => void;
	setChairRentalRentExpenseRub: (val: number) => void;
	// biome-ignore lint/suspicious/noExplicitAny: generic
	runRecommendedAction: (action: any) => void;
	mostLoadedResource?: string;
	activeQueueRole?: string;
	staffRoleLabels?: Record<string, string>;
	modalsNode: React.ReactNode;
	userRole?: string | undefined;
}

export const ShiftDesktopViewWrap: React.FC<ShiftDesktopViewWrapProps> = (p) => (
	<div className="shift-view-scroll-container min-w-0" data-testid="shift-view-desktop">
		<ShiftViewMetricsHeader
			doctorName={p.activeDoctorFullName}
			cabinetName={p.cabinetName}
			isShiftOpen={p.isShiftOpen}
			onToggleShift={p.handleToggleShift}
			onOpenPayrollModal={() => p.setIsPayrollModalOpen(true)}
			onOpenT13Timesheet={() => p.setIsTimesheetT13ModalOpen(true)}
			shiftStats={p.shiftData.shiftStats}
			financialMode={p.shiftFinancialMode}
			onChangeFinancialMode={p.handleChangeFinancialMode}
			chairRentalNetIncomeRub={p.chairRentalNetIncomeRub}
			chairRentalRentExpenseRub={p.chairRentalRentExpenseRub}
			onOpenChairRentalAct={() => p.setChairRentalActTrigger((n) => n + 1)}
		/>

		<ShiftDesktopCockpitGrid
			dashboard={p.dashboard as any}
			activeDoctorFullName={p.activeDoctorFullName}
			inChairAppointment={p.shiftData.inChairAppointment}
			currentPatient={p.shiftData.currentPatient}
			currentPatientHasCallablePhone={p.shiftData.currentPatientHasCallablePhone}
			currentPatientCallablePhone={p.shiftData.currentPatientCallablePhone}
			currentAppointmentReason={p.shiftData.currentAppointmentReason}
			nextAppointment={p.shiftData.nextAppointment}
			nextAppointmentPatient={p.shiftData.nextAppointmentPatient}
			todayAppointments={p.shiftData.todayAppointments}
			inChairAppointments={p.shiftData.inChairAppointments}
			waitingAppointments={p.shiftData.waitingAppointments}
			awaitingPaymentAppointments={p.shiftData.awaitingPaymentAppointments}
			patientsById={p.shiftData.patientsById}
			staffById={p.shiftData.staffById}
			manyDoctors={p.shiftData.manyDoctors}
			shiftStats={p.shiftData.shiftStats}
			shiftFinancialMode={p.shiftFinancialMode}
			chairRentalNetIncomeRub={p.chairRentalNetIncomeRub}
			chairRentalRentExpenseRub={p.chairRentalRentExpenseRub}
			chairRentalActTrigger={p.chairRentalActTrigger}
			visibleRecommendedActions={p.visibleRecommendedActions}
			recommendedActionPriorityLabels={p.recommendedActionPriorityLabels}
			setSelectedPatientId={p.setSelectedPatientId}
			setError={p.setError}
			setIsQueueBoardModalOpen={p.setIsQueueBoardModalOpen}
			setIsShiftCloseModalOpen={p.setIsShiftCloseModalOpen}
			setChairRentalNetIncomeRub={p.setChairRentalNetIncomeRub}
			setChairRentalRentExpenseRub={p.setChairRentalRentExpenseRub}
			runRecommendedAction={p.runRecommendedAction}
			userRole={p.userRole}
		/>

		<ShiftSecondaryAccordion
			dashboard={p.dashboard as any}
			mostLoadedResource={p.mostLoadedResource}
			activeQueueRole={p.activeQueueRole}
			rolesWorthShowing={p.shiftData.rolesWorthShowing}
			staffRoleLabels={p.staffRoleLabels || {}}
		/>

		{p.modalsNode}
	</div>
);
