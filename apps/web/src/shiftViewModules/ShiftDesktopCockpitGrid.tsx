import type { Dashboard } from "@dental/shared";
import React from "react";
import {
	ChairRentalShiftWidget,
	DoctorShiftCashSection,
	ShiftTodoListSection,
} from "../components/shift";
import { ShiftViewChairStatusCard } from "./ShiftViewChairStatusCard";
import type { ShiftFinancialMode } from "./shiftViewTypes";
import { ShiftViewVisitsQueue } from "./ShiftViewVisitsQueue";

export interface ShiftDesktopCockpitGridProps {
	dashboard?: Dashboard;
	activeDoctorFullName: string;
	inChairAppointment: any;
	currentPatient: any;
	currentPatientHasCallablePhone: boolean;
	currentPatientCallablePhone: string | null;
	currentAppointmentReason: string;
	nextAppointment: any;
	nextAppointmentPatient: any;
	todayAppointments: any[];
	inChairAppointments: any[];
	waitingAppointments: any[];
	awaitingPaymentAppointments: any[];
	patientsById: Map<string, any>;
	staffById: Map<string, any>;
	manyDoctors: boolean;
	shiftStats: any;
	shiftFinancialMode: ShiftFinancialMode;
	chairRentalNetIncomeRub: number;
	chairRentalRentExpenseRub: number;
	chairRentalActTrigger: number;
	visibleRecommendedActions?: any[];
	recommendedActionPriorityLabels?: Record<string, string>;
	setSelectedPatientId?: (id: string | null) => void;
	setError?: (err: unknown) => void;
	setIsQueueBoardModalOpen: (open: boolean) => void;
	setIsShiftCloseModalOpen: (open: boolean) => void;
	setChairRentalNetIncomeRub: (val: number) => void;
	setChairRentalRentExpenseRub: (val: number) => void;
	runRecommendedAction: (action: any) => void;
}

export const ShiftDesktopCockpitGrid: React.FC<ShiftDesktopCockpitGridProps> = ({
	dashboard,
	activeDoctorFullName,
	inChairAppointment,
	currentPatient,
	currentPatientHasCallablePhone,
	currentPatientCallablePhone,
	currentAppointmentReason,
	nextAppointment,
	nextAppointmentPatient,
	todayAppointments,
	inChairAppointments,
	waitingAppointments,
	awaitingPaymentAppointments,
	patientsById,
	staffById,
	manyDoctors,
	shiftStats,
	shiftFinancialMode,
	chairRentalNetIncomeRub,
	chairRentalRentExpenseRub,
	chairRentalActTrigger,
	visibleRecommendedActions,
	recommendedActionPriorityLabels,
	setSelectedPatientId,
	setError,
	setIsQueueBoardModalOpen,
	setIsShiftCloseModalOpen,
	setChairRentalNetIncomeRub,
	setChairRentalRentExpenseRub,
	runRecommendedAction,
}) => {
	return (
		<div className="shift-cockpit-split-grid grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 mt-3" style={{ alignItems: "start" }}>
			<div className="space-y-4 min-w-0" data-testid="shift-left-column">
				<ShiftViewChairStatusCard
					inChairAppointment={inChairAppointment}
					doctorFullName={activeDoctorFullName}
					currentPatient={currentPatient}
					currentPatientHasCallablePhone={currentPatientHasCallablePhone}
					currentPatientCallablePhone={currentPatientCallablePhone}
					currentAppointmentReason={currentAppointmentReason}
					nextAppointment={nextAppointment}
					nextAppointmentPatient={nextAppointmentPatient}
					todayAppointmentsCount={todayAppointments.length}
					onOpenVisit={(pId) => { setSelectedPatientId?.(pId); window.location.hash = "visit"; }}
					onOpenImaging={(pId) => { setSelectedPatientId?.(pId); window.location.hash = "imaging"; }}
					onCallPatientError={(msg) => setError?.(msg)}
					onStartNextAppointment={(pId) => { setSelectedPatientId?.(pId); window.location.hash = "visit"; }}
					onOpenSchedule={() => { window.location.hash = "schedule"; }}
				/>

				<ShiftViewVisitsQueue
					todayAppointments={todayAppointments}
					inChairAppointments={inChairAppointments}
					waitingAppointments={waitingAppointments}
					awaitingPaymentAppointments={awaitingPaymentAppointments}
					patientsById={patientsById}
					staffById={staffById}
					currentPatient={currentPatient}
					inChairAppointment={inChairAppointment}
					manyDoctors={manyDoctors}
					onSelectPatient={(pId) => setSelectedPatientId?.(pId)}
					onOpenAppointmentEmk={(pId) => { setSelectedPatientId?.(pId); window.location.hash = "visit"; }}
					onOpenCashier={(pId) => { setSelectedPatientId?.(pId); window.location.hash = "finance"; }}
					onOpenQueueBoardModal={() => setIsQueueBoardModalOpen(true)}
					onOpenSchedule={() => { window.location.hash = "schedule"; }}
				/>
			</div>

			<div className="space-y-4 min-w-0" data-testid="shift-right-column">
				{shiftFinancialMode === "chair_rental" ? (
					<ChairRentalShiftWidget
						doctorFullName={activeDoctorFullName}
						clinicName={dashboard?.clinicName || "ООО «Денте Стоматология»"}
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
						clinicName={dashboard?.clinicName ?? ""}
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
		</div>
	);
};
