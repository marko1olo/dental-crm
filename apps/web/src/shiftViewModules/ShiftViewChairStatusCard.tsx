import React from "react";
import {
	DoctorCabinetHandoverCard,
	DoctorShiftHeroCard,
	formatClockTime as defaultFormatClockTime,
} from "../components/shift";
import type { ShiftChairStatusCardProps } from "./shiftViewTypes";

export const ShiftViewChairStatusCard: React.FC<ShiftChairStatusCardProps> = ({
	inChairAppointment,
	doctorFullName,
	cabinetName,
	nextDoctorName = "Сменяющий врач",
	currentPatient,
	currentPatientHasCallablePhone = false,
	currentPatientCallablePhone = null,
	currentAppointmentReason = "",
	nextAppointment = null,
	nextAppointmentPatient = null,
	todayAppointmentsCount = 0,
	formatClockTime = defaultFormatClockTime,
	onOpenVisit,
	onOpenImaging,
	onCallPatientError,
	onStartNextAppointment,
	onOpenSchedule,
}) => {
	const resolvedCabinet =
		cabinetName ||
		inChairAppointment?.cabinetName ||
		inChairAppointment?.room ||
		"Кабинет №1";

	return (
		<div className="shift-chair-status-card-container space-y-4" data-testid="shift-chair-status-card">
			{/* Карточка пациента в кресле и следующего визита */}
			<DoctorShiftHeroCard
				currentPatient={currentPatient}
				currentPatientHasCallablePhone={currentPatientHasCallablePhone}
				currentPatientCallablePhone={currentPatientCallablePhone || ""}
				currentAppointmentReason={currentAppointmentReason}
				nextAppointment={nextAppointment}
				nextAppointmentPatient={nextAppointmentPatient}
				todayAppointmentsCount={todayAppointmentsCount}
				formatClockTime={(value: unknown) => formatClockTime(typeof value === "string" ? value : undefined)}
				onOpenVisit={(patientId) => {
					onOpenVisit?.(patientId);
				}}
				onOpenImaging={(patientId) => {
					onOpenImaging?.(patientId);
				}}
				onCallPatientError={(msg) => {
					onCallPatientError?.(msg);
				}}
				onStartNextAppointment={(patientId) => {
					onStartNextAppointment?.(patientId);
				}}
				onOpenSchedule={() => {
					onOpenSchedule?.();
				}}
			/>

			{/* Чек-лист передачи кабинета и готовности стерилизации (СанПиН 3.3686-21) */}
			<DoctorCabinetHandoverCard
				cabinetName={resolvedCabinet}
				doctorFullName={doctorFullName}
				nextDoctorName={nextDoctorName}
			/>
		</div>
	);
};
