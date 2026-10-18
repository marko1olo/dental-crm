import type { Dashboard } from "@dental/shared";
import React from "react";
import { ShiftViewChairStatusCard } from "./ShiftViewChairStatusCard";
import type { ShiftFinancialMode } from "./shiftViewTypes";
import { ShiftViewVisitsQueue } from "./ShiftViewVisitsQueue";
import { ShiftDesktopRightColumn } from "./ShiftDesktopRightColumn";

export interface ShiftDesktopCockpitGridProps {
	dashboard?: Dashboard | undefined;
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
	visibleRecommendedActions?: any[] | undefined;
	recommendedActionPriorityLabels?: Record<string, string> | undefined;
	setSelectedPatientId?: ((id: string | null) => void) | undefined;
	setError?: ((err: unknown) => void) | undefined;
	setIsQueueBoardModalOpen: (open: boolean) => void;
	setIsShiftCloseModalOpen: (open: boolean) => void;
	setChairRentalNetIncomeRub: (val: number) => void;
	setChairRentalRentExpenseRub: (val: number) => void;
	runRecommendedAction: (action: any) => void;
}

export const ShiftDesktopCockpitGrid: React.FC<ShiftDesktopCockpitGridProps> = (p) => (
	<div className="shift-cockpit-split-grid grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 mt-3" style={{ alignItems: "start" }}>
		<div className="space-y-4 min-w-0" data-testid="shift-left-column">
			<ShiftViewChairStatusCard
				inChairAppointment={p.inChairAppointment}
				doctorFullName={p.activeDoctorFullName}
				currentPatient={p.currentPatient}
				currentPatientHasCallablePhone={p.currentPatientHasCallablePhone}
				currentPatientCallablePhone={p.currentPatientCallablePhone}
				currentAppointmentReason={p.currentAppointmentReason}
				nextAppointment={p.nextAppointment}
				nextAppointmentPatient={p.nextAppointmentPatient}
				todayAppointmentsCount={p.todayAppointments.length}
				onOpenVisit={(pId) => { p.setSelectedPatientId?.(pId); window.location.hash = "visit"; }}
				onOpenImaging={(pId) => { p.setSelectedPatientId?.(pId); window.location.hash = "imaging"; }}
				onCallPatientError={(msg) => p.setError?.(msg)}
				onStartNextAppointment={(pId) => { p.setSelectedPatientId?.(pId); window.location.hash = "visit"; }}
				onOpenSchedule={() => { window.location.hash = "schedule"; }}
			/>

			<ShiftViewVisitsQueue
				todayAppointments={p.todayAppointments}
				inChairAppointments={p.inChairAppointments}
				waitingAppointments={p.waitingAppointments}
				awaitingPaymentAppointments={p.awaitingPaymentAppointments}
				patientsById={p.patientsById}
				staffById={p.staffById}
				currentPatient={p.currentPatient}
				inChairAppointment={p.inChairAppointment}
				manyDoctors={p.manyDoctors}
				onSelectPatient={(pId) => p.setSelectedPatientId?.(pId)}
				onOpenAppointmentEmk={(pId) => { p.setSelectedPatientId?.(pId); window.location.hash = "visit"; }}
				onOpenCashier={(pId) => { p.setSelectedPatientId?.(pId); window.location.hash = "finance"; }}
				onOpenQueueBoardModal={() => p.setIsQueueBoardModalOpen(true)}
				onOpenSchedule={() => { window.location.hash = "schedule"; }}
			/>
		</div>

		<ShiftDesktopRightColumn
			shiftFinancialMode={p.shiftFinancialMode}
			activeDoctorFullName={p.activeDoctorFullName}
			clinicName={p.dashboard?.clinicName || ""}
			shiftStats={p.shiftStats}
			chairRentalActTrigger={p.chairRentalActTrigger}
			setChairRentalNetIncomeRub={p.setChairRentalNetIncomeRub}
			setChairRentalRentExpenseRub={p.setChairRentalRentExpenseRub}
			setIsShiftCloseModalOpen={p.setIsShiftCloseModalOpen}
			visibleRecommendedActions={p.visibleRecommendedActions}
			recommendedActionPriorityLabels={p.recommendedActionPriorityLabels}
			patientsById={p.patientsById}
			runRecommendedAction={p.runRecommendedAction}
		/>
	</div>
);
