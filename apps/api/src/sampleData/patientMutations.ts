/**
 * @file patientMutations.ts
 * @description Layer 3: Patient creation, profile and administrative mutations.
 */
import { randomUUID } from "node:crypto";
import { activeVisit } from "./clinicalRecords.js";
import { normalizeDateOnlyInput } from "./organizations.js";
import { organizationId } from "./fixtureIds.js";
import { normalizePatientAdministrativeProfile } from "./patients.js";
import { appointments } from "./appointments.js";
import { recordAuditEvent } from "./audit.js";


import type {
	Patient,
	UpdatePatientAdministrativeProfileInput,
	UpdatePatientInput,
} from "@dental/shared";
import { patientInsightDebt, patients } from "./patients.js";
import { persistMutableState } from "./stateNotifier.js";
import { type PatientAdministrativeProfilePatch, nullableTrimmed } from "./types.js";

export function createPatient(input: {
	fullName: string;
	birthDate?: string | null | undefined;
	gender?: "male" | "female" | "other" | null | undefined;
	phone?: string | null | undefined;
	email?: string | null | undefined;
	notes?: string | null | undefined;
	weightKg?: number | null | undefined;
	administrativeProfile?: PatientAdministrativeProfilePatch | null | undefined;
}): Patient {
	const createdAt = new Date().toISOString();
	const activeVisitPatientExists = patients.some(
		(candidate) =>
			candidate.id === activeVisit.patientId && candidate.status === "active",
	);
	const fullName = input.fullName.trim();
	if (!fullName) {
		throw new Error("ФИО пациента обязательно");
	}
	const birthDate = normalizeDateOnlyInput(
		input.birthDate,
		"Дата рождения пациента",
	);
	const patient: Patient = {
		id: randomUUID(),
		organizationId,
		status: "active",
		fullName,
		birthDate,
		gender: input.gender ?? null,
		phone: nullableTrimmed(input.phone),
		email: nullableTrimmed(input.email),
		notes: nullableTrimmed(input.notes),
		weightKg: input.weightKg ?? null,
		isAnonymous: false,
		anonymousCode: null,
		administrativeProfile: normalizePatientAdministrativeProfile(
			input.administrativeProfile,
		),
		balanceRub: 0,
		createdAt,
		updatedAt: createdAt,
	};
	patients.unshift(patient);
	if (!activeVisitPatientExists) {
		activeVisit.patientId = patient.id;
		activeVisit.updatedAt = createdAt;
		const activeAppointment = appointments.find(
			(appointment) => appointment.id === activeVisit.appointmentId,
		);
		if (activeAppointment) activeAppointment.patientId = patient.id;
	}
	recordAuditEvent({
		entityType: "patient",
		entityId: patient.id,
		action: "patient_created",
		reason: `${patient.fullName} добавлен из рабочего экрана.`,
	});
	return patient;
}

export function updatePatient(
	patientId: string,
	input: UpdatePatientInput,
): Patient {
	const patient = patients.find((candidate) => candidate.id === patientId);
	if (!patient) {
		throw new Error("Пациент не найден");
	}
	const fullName = input.fullName?.trim();
	if (input.fullName !== undefined && !fullName) {
		throw new Error("ФИО пациента обязательно");
	}
	if (fullName !== undefined) patient.fullName = fullName;
	if (input.birthDate !== undefined)
		patient.birthDate = normalizeDateOnlyInput(
			input.birthDate,
			"Дата рождения пациента",
		);
	if (input.phone !== undefined) patient.phone = nullableTrimmed(input.phone);
	if (input.email !== undefined) patient.email = nullableTrimmed(input.email);
	if (input.notes !== undefined) patient.notes = nullableTrimmed(input.notes);
	if (input.weightKg !== undefined) patient.weightKg = input.weightKg ?? null;
	/*
	 * Привязка к семейной группе (общий кошелёк).
	 * БЫЛО: поле игнорировалось — UI слал familyGroupId, ответ 200, а в памяти
	 * patients.familyGroupId не менялся. Семья создавалась пустой; оплата с
	 * семейного счёта отказывала «пациент не в группе».
	 * СТАЛО: null — отвязать; UUID — привязать (проверка существования группы
	 * в org-режиме БД; в in-memory одна организация процесса).
	 */
	if (input.familyGroupId !== undefined) {
		(patient as { familyGroupId?: string | null }).familyGroupId =
			input.familyGroupId;
	}
	patient.updatedAt = new Date().toISOString();
	recordAuditEvent({
		entityType: "patient",
		entityId: patient.id,
		action: "patient_core_updated",
		reason:
			"Core patient identity and contact facts updated for scheduling, documents, tax, and communication.",
	});
	return patient;
}

export function updatePatientAdministrativeProfile(
	patientId: string,
	input: UpdatePatientAdministrativeProfileInput,
): Patient {
	const patient = patients.find((candidate) => candidate.id === patientId);
	if (!patient) {
		throw new Error("Пациент не найден");
	}
	const updatedAt = new Date().toISOString();
	patient.administrativeProfile = normalizePatientAdministrativeProfile({
		...(patient.administrativeProfile ?? {}),
		...input,
	});
	patient.updatedAt = updatedAt;
	recordAuditEvent({
		entityType: "patient",
		entityId: patient.id,
		action: "patient_administrative_profile_updated",
		reason:
			"Administrative identity, address, representative, and document-recipient facts updated for legal forms.",
	});
	return patient;
}

