import type {
	ClinicProfileDraft,
	ClinicProfileSaveState,
	PatientAdministrativeProfileDraft,
	PatientAdministrativeProfileSaveState,
	PatientCoreDraft,
	PatientCoreSaveState,
	StaffScheduleDraft,
	StaffScheduleSaveState,
	ClinicalToothSurface,
} from "./types.js";
import {
	CANONICAL_TOOTH_STATUS_ALIASES,
	type CanonicalToothState,
	type Dashboard,
	type DentalSpecialty,
	type Patient,
	type UpdatePatientInput,
} from "@dental/shared";
import {
	buildClinicProfileUpdatePayload,
	buildPatientAdministrativeProfilePayload,
	clinicLegalMissingFields,
	clinicLegalReadinessPercent,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	clinicProfileEndpoint,
	defaultAppointmentStartLocal,
	defaultStaffScheduleDraft,
	defaultWorkingDays,
	emptyClinicProfileDraft,
	isDentalSpecialty,
	isStaffRole,
	normalizedDentalSpecialty,
	normalizedStaffRole,
	normalizeOptionalWorkingDaysDraft,
	normalizeWorkingDaysDraft,
	nullableClinicDraftValue,
	nullablePatientDraftValue,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	patientAdministrativeProfileTimeWarning,
	roleFocusOrder,
	staffScheduleDraftFromWorkingHours,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
	staffWorkingHoursFromSimpleDraft,
} from "../utils/clinicProfileUtils";
import {
	emptyPatientAdministrativeProfileDraft,
	emptyPatientCoreDraft,
} from "../utils/draftDefaults";
import {
	addMinutesToClinicDateTimeLocal,
	calendarDayInTimeZone,
	dateInputValuePlusDays,
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	isDateInputValue,
	isDateTimeLocalInputValue,
	isoDateLabel,
	isValidDateParts,
	minutesLabel,
	normalizeClockTime,
	shiftCalendarDay,
	timeZoneDateParts,
	timeZoneOffsetMinutes,
	timeZoneOffsetSuffix,
	toDateInputValue,
	todayDateInputValue,
	validClockTime,
	weekdayFromDateInput,
} from "../utils/dateTimeUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import {
	collectDicomWorkstationClientFacts,
	isBrowserImagingScanAbortError,
	localImagingFolderFingerprint,
} from "../utils/browserScanUtils";
import {
	SettingsTab,
	settingsTabFromHash,
	settingsTabs,
	viewFromHash,
} from "../utils/routeUtils";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
} from "../workspaceUiLabels";
import { offlineDraftOrganizationKey, isRecordKey } from "./uiFormatters.js";

export {
	type SettingsTab,
	settingsTabFromHash,
	settingsTabs,
	viewFromHash,
} from "../utils/routeUtils";

export const clinicalToothSurfaceAliases: Record<string, ClinicalToothSurface> =
	{
		o: "occlusal",
		окклюзионная: "occlusal",
		окклюзионно: "occlusal",
		жевательная: "occlusal",
		жевательно: "occlusal",
		m: "mesial",
		медиальная: "mesial",
		мезиальная: "mesial",
		медиально: "mesial",
		мезиально: "mesial",
		d: "distal",
		дистальная: "distal",
		дистально: "distal",
		b: "buccal",
		щечная: "buccal",
		щечно: "buccal",
		вестибулярная: "buccal",
		l: "lingual",
		язычная: "lingual",
		язычно: "lingual",
		p: "palatal",
		небная: "palatal",
		небно: "palatal",
		i: "incisal",
		режущий: "incisal",
		"режущий край": "incisal",
		корень: "root",
		корневая: "root",
		root: "root",
		имплантация: "implant_site",
		"зона имплантации": "implant_site",
		"implant site": "implant_site",
		"не применимо": "not_applicable",
		нет: "not_applicable",
		"-": "not_applicable",
	};

export const clinicalToothStatusAliases: Record<string, CanonicalToothState> = {
	...CANONICAL_TOOTH_STATUS_ALIASES,
	норма: "Healthy",
	"без патологии": "Healthy",
	наблюдение: "Caries",
	контроль: "Caries",
	кариес: "Caries",
	caries: "Caries",
	пульпит: "Pulpitis",
	периодонтит: "Periodontitis",
	эндо: "Pulpitis",
	пародонт: "Periodontitis",
	пародонтология: "Periodontitis",
	отсутствует: "Missing",
	удален: "Missing",
	удаленый: "Missing",
	удаленный: "Missing",
	имплант: "Implant",
	имплантат: "Implant",
	ортопедия: "Crown",
	коронка: "Crown",
	протез: "Crown",
	ортодонтия: "Crown",
	брекеты: "Crown",
	элайнеры: "Crown",
	план: "Caries",
	planned: "Caries",
	запланировано: "Caries",
	выполнено: "Filled",
	completed: "Filled",
	готово: "Filled",
	иное: "Caries",
	другое: "Caries",
};

export function normalizedClinicalRuleAction(
	value: unknown,
): Dashboard["clinicalRules"][number]["action"] {
	return isRecordKey(value, clinicalRuleActionLabels)
		? value
		: "add_required_service";
}

export function normalizedClinicalRuleSeverity(
	value: unknown,
): Dashboard["clinicalRules"][number]["severity"] {
	return isRecordKey(value, clinicalRuleSeverityLabels) ? value : "warning";
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

export const settingsTabGroups = [
	{ id: "account", title: "Мой аккаунт" },
	{ id: "main", title: "Основные" },
	{ id: "clinical", title: "Клинические" },
	{ id: "stock", title: "Учёт" },
	{ id: "marketing", title: "Маркетинг" },
	{ id: "system", title: "Системные" },
] as const;

export type SettingsTabGroup = (typeof settingsTabGroups)[number]["id"];

export {
	addMinutesToClinicDateTimeLocal,
	buildClinicProfileUpdatePayload,
	buildPatientAdministrativeProfilePayload,
	calendarDayInTimeZone,
	clinicLegalMissingFields,
	clinicLegalReadinessPercent,
	clinicProfileDraftFromProfile,
	clinicProfileDraftSignature,
	clinicProfileEndpoint,
	collectDicomWorkstationClientFacts,
	dateInputValuePlusDays,
	defaultAppointmentStartLocal,
	defaultStaffScheduleDraft,
	defaultWorkingDays,
	emptyClinicProfileDraft,
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	isBrowserImagingScanAbortError,
	isDateInputValue,
	isDateTimeLocalInputValue,
	isDentalSpecialty,
	isoDateLabel,
	isStaffRole,
	isValidDateParts,
	localConvenienceRetentionMs,
	localImagingFolderFingerprint,
	localSavedAtFresh,
	minutesLabel,
	normalizeClockTime,
	normalizedDentalSpecialty,
	normalizedStaffRole,
	normalizeOptionalWorkingDaysDraft,
	normalizeWorkingDaysDraft,
	nullableClinicDraftValue,
	nullablePatientDraftValue,
	organizationScopedLocalStorageKey,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	patientAdministrativeProfileTimeWarning,
	roleFocusOrder,
	shiftCalendarDay,
	staffScheduleDraftFromWorkingHours,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
	staffWorkingHoursFromSimpleDraft,
	timeZoneDateParts,
	timeZoneOffsetMinutes,
	timeZoneOffsetSuffix,
	toDateInputValue,
	todayDateInputValue,
	validClockTime,
	weekdayFromDateInput,
};
