/**
 * @file apps/web/src/helpers/patientFormatters.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	type Dashboard,
	type Patient,
	type PatientIntakePregnancyStatus,
	type UiLanguage,
	type UpdatePatientInput,
} from "@dental/shared";
import {
	nullablePatientDraftValue,
} from "../utils/clinicProfileUtils";
import {
	isOptionValue,
	isRecordKey,
} from "./guardUtils";
import {
	type PatientCoreDraft,
	type UiLanguageOption,
} from "./types";

export function patientName(patients: Patient[] | undefined | null, patientId: string | null) {
	if (!patientId) return "Новый пациент";
	if (!Array.isArray(patients)) return "Пациент";
	return (
		patients.find((patient) => patient.id === patientId)?.fullName ?? "Пациент"
	);
}

export function findPatient(patients: Patient[] | undefined | null, patientId: string | null) {
	if (!patientId || !Array.isArray(patients)) return null;
	return patients.find((patient) => patient.id === patientId) ?? null;
}

export const uiLanguageLabels: Record<UiLanguage, string> = {
	ru: "Русский",
	en: "English",
};

export const defaultUiLanguageOption: UiLanguageOption = {
	value: "ru",
	label: uiLanguageLabels.ru,
	detail:
		"Русский интерфейс включен сейчас. Выбор сохраняется автоматически и остается до смены языка.",
};

export const uiLanguageOptions: UiLanguageOption[] = [defaultUiLanguageOption];

export const patientIntakePregnancyStatusOptions: Array<{
	value: PatientIntakePregnancyStatus;
	label: string;
}> = [
	{ value: "not_applicable", label: "Не применимо" },
	{ value: "denied", label: "Со слов пациента нет" },
	{ value: "possible", label: "Возможна беременность" },
	{ value: "confirmed", label: "Беременность подтверждена" },
	{ value: "lactation", label: "Лактация" },
	{ value: "unknown", label: "Не уточнено" },
];

export function isUiLanguage(value: unknown): value is UiLanguage {
	return isRecordKey(value, uiLanguageLabels);
}

export function normalizeUiLanguageInput(value: unknown): UiLanguage {
	return isUiLanguage(value) ? value : "ru";
}

export function normalizedPatientIntakePregnancyStatus(
	value: unknown,
): PatientIntakePregnancyStatus {
	return isOptionValue(value, patientIntakePregnancyStatusOptions)
		? value
		: "unknown";
}

export function uiPreferencesSyncErrorMessage(_error: unknown): string {
	return "Настройки интерфейса сохранены только на этом устройстве. Серверная синхронизация повторится автоматически.";
}

export function patientCoreDraftFromPatient(
	patient: Patient | null,
): PatientCoreDraft {
	return {
		fullName: patient?.fullName ?? "",
		birthDate: patient?.birthDate ?? "",
		phone: patient?.phone ?? "",
		email: patient?.email ?? "",
		notes: patient?.notes ?? "",
	};
}

export function buildPatientCorePayload(
	draft: PatientCoreDraft,
): UpdatePatientInput {
	const rawEmail = nullablePatientDraftValue(draft.email);
	// МАНДАТ 8e: если e-mail указан не по формату, санируем в null чтобы не блокировать сохранение телефона, ФИО и заметок
	const email =
		rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;
	return {
		fullName: draft.fullName.trim(),
		birthDate: nullablePatientDraftValue(draft.birthDate),
		phone: nullablePatientDraftValue(draft.phone),
		email,
		notes: nullablePatientDraftValue(draft.notes),
	};
}

export function patientCoreDraftSignature(draft: PatientCoreDraft): string {
	return JSON.stringify(buildPatientCorePayload(draft));
}



export const patientInsightRiskLabels: Record<
	Dashboard["patientInsights"][number]["riskLevel"],
	string
> = {
	low: "спокойно",
	watch: "контроль",
	high: "срочно",
};
