/**
 * @file appointments.ts
 * @description Layer 1: Appointments, active appointment fixture, schedule blocking statuses.
 */

import type { Appointment, AppointmentStatus } from "@dental/shared";

import { organizationId, marinaPatientId, alexeyPatientId, elmiraPatientId, doctorUserId, assistantUserId, chairId, activeAppointmentId } from "./fixtureIds.js";

export const appointments: Appointment[] = [
	{
		id: activeAppointmentId,
		organizationId,
		patientId: marinaPatientId,
		doctorUserId,
		assistantUserId,
		chairId,
		status: "confirmed",
		startsAt: "2026-05-12T09:00:00+04:00",
		endsAt: "2026-05-12T10:00:00+04:00",
		reason: "Лечение 36",
		comment: "Подготовить согласие и акт.",
	},
	{
		id: "59d16574-5f6e-4cc7-9f49-2da2f126e11d",
		organizationId,
		patientId: alexeyPatientId,
		doctorUserId,
		assistantUserId,
		chairId,
		status: "planned",
		startsAt: "2026-05-12T10:30:00+04:00",
		endsAt: "2026-05-12T11:15:00+04:00",
		reason: "Профгигиена",
		comment: "После оплаты выдать справку для вычета.",
	},
	{
		id: "286c0899-f2cc-4e72-833d-a1e89036e319",
		organizationId,
		patientId: elmiraPatientId,
		doctorUserId,
		assistantUserId: null,
		chairId,
		status: "planned",
		startsAt: "2026-05-12T12:00:00+04:00",
		endsAt: "2026-05-12T12:30:00+04:00",
		reason: "Первичная консультация",
		comment: null,
	},
];

const scheduleBlockingAppointmentStatuses = new Set<Appointment["status"]>([
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
]);
const terminalAppointmentStatuses = new Set<Appointment["status"]>([
	"completed",
	"cancelled",
	"no_show",
]);


export { scheduleBlockingAppointmentStatuses, terminalAppointmentStatuses };
