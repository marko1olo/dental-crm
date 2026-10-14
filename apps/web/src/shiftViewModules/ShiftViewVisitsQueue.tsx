import React from "react";
import { DoctorShiftVisitsKpiSection } from "../components/shift";
import type { ShiftVisitsQueueProps } from "./shiftViewTypes";

export const ShiftViewVisitsQueue: React.FC<ShiftVisitsQueueProps> = ({
	todayAppointments,
	inChairAppointments,
	waitingAppointments,
	awaitingPaymentAppointments,
	patientsById,
	staffById,
	currentPatient,
	inChairAppointment,
	manyDoctors,
	onSelectPatient,
	onOpenAppointmentEmk,
	onOpenCashier,
	onOpenQueueBoardModal,
	onOpenSchedule,
}) => {
	return (
		<div className="shift-view-visits-queue-wrap" data-testid="shift-visits-queue">
			<DoctorShiftVisitsKpiSection
				todayAppointments={todayAppointments}
				inChairAppointments={inChairAppointments}
				waitingAppointments={waitingAppointments}
				awaitingPaymentAppointments={awaitingPaymentAppointments}
				patientsById={patientsById}
				staffById={staffById}
				currentPatient={currentPatient}
				inChairAppointment={inChairAppointment}
				manyDoctors={manyDoctors}
				onSelectPatient={onSelectPatient}
				onOpenAppointmentEmk={onOpenAppointmentEmk}
				onOpenCashier={onOpenCashier}
				onOpenQueueBoardModal={onOpenQueueBoardModal}
				onOpenSchedule={onOpenSchedule}
			/>
		</div>
	);
};
