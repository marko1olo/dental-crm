/**
 * @file scheduleValidation.ts
 * @description Layer 2: Schedule validation, overlap checks, working hours coverage assertions.
 */
import { patients } from "./patients.js";
import { appointmentWithinClinicSchedule } from "./scheduleTimeHelpers.js";
import { organizationId } from "./fixtureIds.js";


import type {
	Appointment,
	AppointmentStatus,
	Chair,
	ChairWorkingHours,
	ClinicScheduleDefaults,
	StaffMember,
	StaffWorkingHours,
	UpdateAppointmentInput,
} from "@dental/shared";
import { appointments, scheduleBlockingAppointmentStatuses } from "./appointments.js";
import { chairs, clinicProfile } from "./organizations.js";
import { staffMembers } from "./staff.js";
import { activeVisit } from "./clinicalRecords.js";
import {
	appointmentClinicDateKey,
	appointmentEndMinute,
	appointmentIntervalsOverlap,
	appointmentStartMinute,
	appointmentWithinChairSchedule,
	appointmentWithinClinicScheduleDefaults,
	appointmentWithinStaffSchedule,
	validScheduleTimeZone,
} from "./scheduleTimeHelpers.js";

function assertAppointmentReferenceExists(input: UpdateAppointmentInput): void {
	if (input.patientId !== undefined && input.patientId !== null) {
		const patient = patients.find(
			(candidate) =>
				candidate.id === input.patientId && candidate.status === "active",
		);
		if (!patient)
			throw new Error("Пациент для записи не найден или не активен");
	}
	if (input.doctorUserId !== undefined && input.doctorUserId !== null) {
		const doctor = staffMembers.find(
			(member) =>
				member.id === input.doctorUserId &&
				member.active &&
				(member.role === "doctor" || member.role === "owner"),
		);
		if (!doctor) throw new Error("Врач для записи не найден или не активен");
	}
	if (input.assistantUserId !== undefined && input.assistantUserId !== null) {
		const assistant = staffMembers.find(
			(member) =>
				member.id === input.assistantUserId &&
				member.active &&
				member.role === "assistant",
		);
		if (!assistant)
			throw new Error("Ассистент для записи не найден или не активен");
	}
	if (input.chairId !== undefined && input.chairId !== null) {
		const chair = chairs.find(
			(candidate) => candidate.id === input.chairId && candidate.active,
		);
		if (!chair) throw new Error("Кресло для записи не найдено или не активно");
	}
}

function mergedAppointmentTimes(
	appointment: Appointment,
	input: UpdateAppointmentInput,
): { startsAt: string; endsAt: string } {
	const startsAt = input.startsAt ?? appointment.startsAt;
	const endsAt = input.endsAt ?? appointment.endsAt;
	const startsAtMs = Date.parse(startsAt);
	const endsAtMs = Date.parse(endsAt);
	if (
		!Number.isFinite(startsAtMs) ||
		!Number.isFinite(endsAtMs) ||
		endsAtMs <= startsAtMs
	) {
		throw new Error("Время окончания записи должно быть позже времени начала");
	}
	return { startsAt, endsAt };
}


function assertActiveVisitAppointmentStatusChangeIsSafe(
	appointment: Appointment,
	input: UpdateAppointmentInput,
): void {
	if (
		activeVisit.appointmentId !== appointment.id ||
		activeVisit.status !== "draft"
	)
		return;
	if (input.status === undefined || input.status === appointment.status) return;
	if (!terminalAppointmentStatuses.has(input.status)) return;
	throw new Error(
		"Нельзя закрыть, отменить или отметить неявку записи, пока связанный прием открыт как черновик",
	);
}

function appointmentRequiresHardScheduleValidation(
	appointment: Appointment,
): boolean {
	const endsAtMs = Date.parse(appointment.endsAt);
	return (
		scheduleBlockingAppointmentStatuses.has(appointment.status) &&
		Number.isFinite(endsAtMs) &&
		endsAtMs >= Date.now()
	);
}


function assertNoAppointmentResourceOverlap(candidate: Appointment): void {
	if (!appointmentRequiresHardScheduleValidation(candidate)) return;
	const overlapping = appointments.find(
		(appointment) =>
			appointment.id !== candidate.id &&
			appointment.organizationId === candidate.organizationId &&
			appointmentRequiresHardScheduleValidation(appointment) &&
			appointmentIntervalsOverlap(candidate, appointment) &&
			((candidate.patientId && appointment.patientId === candidate.patientId) ||
				(candidate.doctorUserId &&
					appointment.doctorUserId === candidate.doctorUserId) ||
				(candidate.assistantUserId &&
					appointment.assistantUserId === candidate.assistantUserId) ||
				(candidate.chairId && appointment.chairId === candidate.chairId)),
	);
	if (!overlapping) return;
	if (candidate.patientId && overlapping.patientId === candidate.patientId) {
		throw new Error("У пациента уже есть запись в это время");
	}
	if (
		candidate.doctorUserId &&
		overlapping.doctorUserId === candidate.doctorUserId
	) {
		throw new Error("У врача уже есть запись в это время");
	}
	if (
		candidate.assistantUserId &&
		overlapping.assistantUserId === candidate.assistantUserId
	) {
		throw new Error("У ассистента уже есть запись в это время");
	}
	throw new Error("Кресло уже занято другой записью в это время");
}

function assertAppointmentWithinOperationalHours(candidate: Appointment): void {
	if (!appointmentRequiresHardScheduleValidation(candidate)) return;
	const isTechnicalBreak =
		/служебный перерыв|технический перерыв|служебная бронь|санобработка|обед|консилиум/i.test(
			candidate.reason || "",
		) ||
		/служебная бронь/i.test(candidate.comment || "");
	if (!candidate.patientId && !isTechnicalBreak) {
		throw new Error("Для активной будущей записи нужно выбрать пациента");
	}
	if (!candidate.doctorUserId) {
		throw new Error("Для активной будущей записи нужно выбрать врача");
	}
	if (!candidate.chairId) {
		throw new Error("Для активной будущей записи нужно выбрать кресло");
	}
	const patient = candidate.patientId
		? patients.find(
				(item) => item.id === candidate.patientId && item.status === "active",
			)
		: null;
	if (!patient && !isTechnicalBreak) {
		throw new Error("Для активной будущей записи нужен активный пациент");
	}
	const clinicScheduleCheck = appointmentWithinClinicSchedule(candidate);
	if (!clinicScheduleCheck.ready) {
		throw new Error(
			`Запись вне расписания клиники: ${clinicScheduleCheck.detail}`,
		);
	}
	const doctor = candidate.doctorUserId
		? staffMembers.find(
				(member) => member.id === candidate.doctorUserId && member.active,
			)
		: null;
	if (doctor) {
		const doctorScheduleCheck = appointmentWithinStaffSchedule(
			candidate,
			doctor,
			"врача",
		);
		if (!doctorScheduleCheck.ready) {
			throw new Error(
				`Запись вне расписания врача: ${doctorScheduleCheck.detail}`,
			);
		}
	}
	const assistant = candidate.assistantUserId
		? staffMembers.find(
				(member) =>
					member.id === candidate.assistantUserId &&
					member.active &&
					member.role === "assistant",
			)
		: null;
	if (assistant) {
		const assistantScheduleCheck = appointmentWithinStaffSchedule(
			candidate,
			assistant,
			"ассистента",
		);
		if (!assistantScheduleCheck.ready) {
			throw new Error(
				`Запись вне расписания ассистента: ${assistantScheduleCheck.detail}`,
			);
		}
	}
	const chair = candidate.chairId
		? chairs.find((item) => item.id === candidate.chairId && item.active)
		: null;
	const chairScheduleCheck = appointmentWithinChairSchedule(candidate, chair);
	if (!chairScheduleCheck.ready) {
		throw new Error(
			`Запись вне расписания кресла: ${chairScheduleCheck.detail}`,
		);
	}
}

function assertAppointmentCanBeScheduled(candidate: Appointment): void {
	assertAppointmentWithinOperationalHours(candidate);
	assertNoAppointmentResourceOverlap(candidate);
}

function assertStaffWorkingHoursCoverExistingAppointments(
	member: StaffMember,
	workingHours: StaffWorkingHours,
): void {
	const candidateStaff: StaffMember = { ...member, workingHours };
	const blockingAppointment = appointments.find(
		(appointment) =>
			scheduleBlockingAppointmentStatuses.has(appointment.status) &&
			appointmentRequiresHardScheduleValidation(appointment) &&
			(appointment.doctorUserId === member.id ||
				appointment.assistantUserId === member.id) &&
			!appointmentWithinStaffSchedule(
				appointment,
				candidateStaff,
				member.role === "assistant" ? "ассистента" : "врача",
			).ready,
	);
	if (blockingAppointment) {
		throw new Error(
			"Нельзя сократить рабочие часы: есть активная запись за пределами нового расписания",
		);
	}
}

function assertChairWorkingHoursCoverExistingAppointments(
	chair: Chair,
	workingHours: StaffWorkingHours,
): void {
	const candidateChair: Chair = { ...chair, workingHours };
	const blockingAppointment = appointments.find(
		(appointment) =>
			scheduleBlockingAppointmentStatuses.has(appointment.status) &&
			appointmentRequiresHardScheduleValidation(appointment) &&
			appointment.chairId === chair.id &&
			!appointmentWithinChairSchedule(appointment, candidateChair).ready,
	);
	if (blockingAppointment) {
		throw new Error(
			"Нельзя сократить рабочие часы кресла: есть активная запись за пределами нового расписания",
		);
	}
}

function assertClinicScheduleDefaultsCoverExistingAppointments(
	scheduleDefaults: ClinicScheduleDefaults,
	timezone: string,
): void {
	const blockingAppointment = appointments.find(
		(appointment) =>
			appointment.organizationId === organizationId &&
			appointmentRequiresHardScheduleValidation(appointment) &&
			!appointmentWithinClinicScheduleDefaults(
				appointment,
				scheduleDefaults,
				timezone,
			).ready,
	);
	if (blockingAppointment) {
		throw new Error(
			`Нельзя сократить расписание клиники: активная запись ${blockingAppointment.id} выходит за пределы нового окна или рабочих дней`,
		);
	}
}


export { assertActiveVisitAppointmentStatusChangeIsSafe, assertAppointmentReferenceExists, assertAppointmentCanBeScheduled, assertAppointmentWithinOperationalHours, assertNoAppointmentResourceOverlap, mergedAppointmentTimes, assertChairWorkingHoursCoverExistingAppointments, assertClinicScheduleDefaultsCoverExistingAppointments, assertStaffWorkingHoursCoverExistingAppointments };
