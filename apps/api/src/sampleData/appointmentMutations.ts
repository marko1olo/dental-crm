/**
 * @file appointmentMutations.ts
 * @description Layer 3: Appointment creation, update and schedule concurrency mutations.
 */
import { randomUUID } from "node:crypto";
import { activeVisit } from "./clinicalRecords.js";
import { recordAuditEvent } from "./audit.js";
import { organizationId } from "./fixtureIds.js";


import type {
	Appointment,
	AppointmentStatus,
	CreateAppointmentInput,
	UpdateAppointmentInput,
} from "@dental/shared";
import { appointments, scheduleBlockingAppointmentStatuses } from "./appointments.js";
import {
	assertActiveVisitAppointmentStatusChangeIsSafe,
	assertAppointmentReferenceExists,
	assertAppointmentCanBeScheduled,
	assertAppointmentWithinOperationalHours,
	assertNoAppointmentResourceOverlap,
	mergedAppointmentTimes,
} from "./scheduleValidation.js";
import { persistMutableState } from "./stateNotifier.js";
import { nullableTrimmed } from "./types.js";

export function updateAppointment(
	appointmentId: string,
	input: UpdateAppointmentInput,
): Appointment {
	const appointment = appointments.find(
		(candidate) => candidate.id === appointmentId,
	);
	if (!appointment) {
		throw new Error("Запись не найдена");
	}
	if (
		input.expectedCurrentStatus &&
		input.expectedCurrentStatus.length > 0 &&
		!input.expectedCurrentStatus.includes(appointment.status)
	) {
		throw new Error(
			`Слот уже занят другим администратором или приём больше не свободен (текущий статус: ${appointment.status}).`,
		);
	}
	if (
		input.patientId !== undefined &&
		input.patientId !== appointment.patientId &&
		activeVisit.appointmentId === appointment.id
	) {
		throw new Error(
			"Нельзя менять пациента у записи, к которой уже привязан текущий прием",
		);
	}
	assertActiveVisitAppointmentStatusChangeIsSafe(appointment, input);

	assertAppointmentReferenceExists(input);
	const { startsAt, endsAt } = mergedAppointmentTimes(appointment, input);
	const candidate: Appointment = {
		...appointment,
		patientId:
			input.patientId !== undefined ? input.patientId : appointment.patientId,
		doctorUserId:
			input.doctorUserId !== undefined
				? input.doctorUserId
				: appointment.doctorUserId,
		assistantUserId:
			input.assistantUserId !== undefined
				? input.assistantUserId
				: appointment.assistantUserId,
		chairId: input.chairId !== undefined ? input.chairId : appointment.chairId,
		status: input.status !== undefined ? input.status : appointment.status,
		startsAt,
		endsAt,
	};
	assertAppointmentCanBeScheduled(candidate);
	if (input.patientId !== undefined) appointment.patientId = input.patientId;
	if (input.doctorUserId !== undefined)
		appointment.doctorUserId = input.doctorUserId;
	if (input.assistantUserId !== undefined)
		appointment.assistantUserId = input.assistantUserId;
	if (input.chairId !== undefined) appointment.chairId = input.chairId;
	if (input.status !== undefined) appointment.status = input.status;
	if (input.reason !== undefined)
		appointment.reason = nullableTrimmed(input.reason);
	if (input.comment !== undefined)
		appointment.comment = nullableTrimmed(input.comment);
	appointment.startsAt = startsAt;
	appointment.endsAt = endsAt;

	recordAuditEvent({
		entityType: "appointment",
		entityId: appointment.id,
		action: "appointment_updated",
		reason:
			"Запись обновлена из расписания: время, пациент, врач, ассистент, кресло или статус.",
	});
	return appointment;
}

export function createAppointment(input: CreateAppointmentInput): Appointment {
	assertAppointmentReferenceExists(input);
	const startsAtMs = Date.parse(input.startsAt);
	const endsAtMs = Date.parse(input.endsAt);
	if (
		!Number.isFinite(startsAtMs) ||
		!Number.isFinite(endsAtMs) ||
		endsAtMs <= startsAtMs
	) {
		throw new Error("Время окончания записи должно быть позже времени начала");
	}
	const appointment: Appointment = {
		id: randomUUID(),
		organizationId,
		patientId: input.patientId ?? null,
		doctorUserId: input.doctorUserId,
		assistantUserId: input.assistantUserId ?? null,
		chairId: input.chairId,
		status: input.status,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		reason: nullableTrimmed(input.reason),
		comment: nullableTrimmed(input.comment),
	};
	assertAppointmentCanBeScheduled(appointment);
	appointments.push(appointment);
	recordAuditEvent({
		entityType: "appointment",
		entityId: appointment.id,
		action: "appointment_created",
		reason:
			"Запись создана из расписания: пациент, врач, ассистент, кресло и время прошли проверку доступности.",
	});
	return appointment;
}

