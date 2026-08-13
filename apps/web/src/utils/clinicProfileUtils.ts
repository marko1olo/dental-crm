import type {
	ClinicProfile,
	DentalSpecialty,
	Patient,
	PatientAdministrativeProfile,
	StaffRole,
	StaffWorkingHours,
	UpdateClinicProfileInput,
	UpdatePatientAdministrativeProfileInput,
} from "@dental/shared";
import { specialtyLabels, staffRoleLabels } from "../workspaceUiLabels";
import {
	fromDateTimeLocalValue,
	normalizeClockTime,
	weekdayFromDateInput,
} from "./dateTimeUtils";
import { toDateTimeLocalValue } from "./dateUtils";
import { isRecordKey } from "./typeGuards";

export const clinicProfileEndpoint = "/api/settings/clinic/profile";

export function isDentalSpecialty(value: unknown): value is DentalSpecialty {
	return typeof value === "string" && value in specialtyLabels;
}

export function isStaffRole(value: unknown): value is StaffRole {
	return isRecordKey(value, staffRoleLabels);
}

export function normalizedStaffRole(value: unknown): StaffRole {
	return isStaffRole(value) ? value : "doctor";
}

export function normalizedDentalSpecialty(value: unknown): DentalSpecialty {
	return isDentalSpecialty(value) ? value : "therapist";
}

export function staffWorkingHoursFromSimpleDraft(
	startValue: string,
	endValue: string,
	workingDayValue: readonly number[] | undefined,
): StaffWorkingHours {
	const start = normalizeClockTime(startValue, "09:00");
	const end = normalizeClockTime(endValue, "18:00");
	const workingDays = normalizeWorkingDaysDraft(workingDayValue);
	return Array.from({ length: 7 }, (_, weekday) => ({
		weekday,
		enabled: workingDays.includes(weekday),
		start,
		end,
	}));
}

export function staffScheduleDraftFromWorkingHours(
	workingHours: StaffWorkingHours | null | undefined,
): StaffScheduleDraft {
	const enabledDays = (workingHours ?? []).filter((day) => day.enabled);
	const firstEnabledDay = enabledDays[0] ?? workingHours?.[0];
	const fallbackPerDay = staffWorkingHoursFromSimpleDraft(
		firstEnabledDay?.start ?? "09:00",
		firstEnabledDay?.end ?? "18:00",
		enabledDays.map((day) => day.weekday),
	);
	const perDay = Array.from({ length: 7 }, (_, weekday) => {
		const configured = workingHours?.find((day) => day.weekday === weekday);
		return (
			configured ??
			fallbackPerDay[weekday] ?? {
				weekday,
				enabled: defaultWorkingDays.includes(weekday),
				start: "09:00",
				end: "18:00",
			}
		);
	});
	return {
		start: firstEnabledDay?.start ?? "09:00",
		end: firstEnabledDay?.end ?? "18:00",
		workingDays: normalizeWorkingDaysDraft(
			enabledDays.map((day) => day.weekday),
		),
		perDay,
	};
}

export function defaultAppointmentStartLocal(profile: ClinicProfile): string {
	const schedule = profile.scheduleDefaults ?? {
		workdayStart: "09:00",
		workdayEnd: "18:00",
		workingDays: [1, 2, 3, 4, 5],
		appointmentBufferMinutes: 10,
	};
	const timezone = profile.timezone || "Europe/Samara";
	const now = new Date();
	for (let offset = 0; offset < 21; offset += 1) {
		const candidateDate = new Date(now.getTime() + offset * 86_400_000);
		const datePart = toDateTimeLocalValue(
			candidateDate.toISOString(),
			timezone,
		).slice(0, 10);
		if (!schedule.workingDays.includes(weekdayFromDateInput(datePart)))
			continue;
		const candidate = `${datePart}T${schedule.workdayStart}`;
		if (
			Date.parse(fromDateTimeLocalValue(candidate, timezone)) >
			now.getTime() + 30 * 60_000
		)
			return candidate;
	}
	return `${toDateTimeLocalValue(new Date(now.getTime() + 86_400_000).toISOString(), timezone).slice(0, 10)}T${schedule.workdayStart}`;
}

export function staffWorkingHoursFromDraft(
	draft: StaffScheduleDraft,
): StaffWorkingHours {
	const start = normalizeClockTime(draft.start, "09:00");
	const end = normalizeClockTime(draft.end, "18:00");
	const workingDays = normalizeWorkingDaysDraft(draft.workingDays);
	const perDay =
		draft.perDay ?? staffWorkingHoursFromSimpleDraft(start, end, workingDays);
	return Array.from({ length: 7 }, (_, weekday) => ({
		weekday,
		enabled: workingDays.includes(weekday),
		start: normalizeClockTime(perDay[weekday]?.start ?? start, start),
		end: normalizeClockTime(perDay[weekday]?.end ?? end, end),
	}));
}

export function staffScheduleDraftSignature(draft: StaffScheduleDraft): string {
	return JSON.stringify(staffWorkingHoursFromDraft(draft));
}

export function defaultStaffScheduleDraft(): StaffScheduleDraft {
	return staffScheduleDraftFromWorkingHours(null);
}

export function emptyClinicProfileDraft(): ClinicProfileDraft {
	return {
		clinicName: "",
		legalName: "",
		inn: "",
		kpp: "",
		ogrn: "",
		address: "",
		phone: "",
		email: "",
		website: "",
		medicalLicenseNumber: "",
		medicalLicenseIssuedAt: "",
		medicalLicenseIssuer: "",
		bankDetails: "",
		signatoryName: "",
		signatoryTitle: "",
		timezone: "Europe/Samara",
		defaultVisitMinutes: "45",
		workdayStart: "09:00",
		workdayEnd: "18:00",
		workingDays: defaultWorkingDays,
		appointmentBufferMinutes: "10",
		egiszEnabled: false,
	};
}

export function clinicProfileDraftFromProfile(
	profile: ClinicProfile,
): ClinicProfileDraft {
	const schedule = profile.scheduleDefaults ?? {
		workdayStart: "09:00",
		workdayEnd: "18:00",
		workingDays: defaultWorkingDays,
		appointmentBufferMinutes: 10,
	};
	return {
		clinicName: profile.clinicName ?? "",
		legalName: profile.legalName ?? "",
		inn: profile.inn ?? "",
		kpp: profile.kpp ?? "",
		ogrn: profile.ogrn ?? "",
		address: profile.address ?? "",
		phone: profile.phone ?? "",
		email: profile.email ?? "",
		website: profile.website ?? "",
		medicalLicenseNumber: profile.medicalLicenseNumber ?? "",
		medicalLicenseIssuedAt: profile.medicalLicenseIssuedAt ?? "",
		medicalLicenseIssuer: profile.medicalLicenseIssuer ?? "",
		bankDetails: profile.bankDetails ?? "",
		signatoryName: profile.signatoryName ?? "",
		signatoryTitle: profile.signatoryTitle ?? "",
		timezone: profile.timezone ?? "Europe/Samara",
		defaultVisitMinutes: String(profile.defaultVisitMinutes ?? 45),
		workdayStart: schedule.workdayStart ?? "09:00",
		workdayEnd: schedule.workdayEnd ?? "18:00",
		workingDays: normalizeWorkingDaysDraft(schedule.workingDays),
		appointmentBufferMinutes: String(schedule.appointmentBufferMinutes ?? 10),
		egiszEnabled: profile.egiszEnabled ?? false,
	};
}

export function nullableClinicDraftValue(value: string): string | null {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export function patientAdministrativeProfileDraftFromPatient(
	patient: Patient | null,
): PatientAdministrativeProfileDraft {
	const profile = patient?.administrativeProfile;
	return {
		identityDocument: profile?.identityDocument ?? "",
		taxpayerInn: profile?.taxpayerInn ?? "",
		registrationAddress: profile?.registrationAddress ?? "",
		residentialAddress: profile?.residentialAddress ?? "",
		insurancePolicyNumber: profile?.insurancePolicyNumber ?? "",
		snils: profile?.snils ?? "",
		legalRepresentativeFullName: profile?.legalRepresentativeFullName ?? "",
		legalRepresentativeRelationship:
			profile?.legalRepresentativeRelationship ?? "",
		legalRepresentativeIdentityDocument:
			profile?.legalRepresentativeIdentityDocument ?? "",
		legalRepresentativePhone: profile?.legalRepresentativePhone ?? "",
		preferredDocumentRecipient: profile?.preferredDocumentRecipient ?? "",
		preferredAppointmentWeekdays: normalizeOptionalWorkingDaysDraft(
			profile?.preferredAppointmentWeekdays ?? [],
		),
		preferredAppointmentStart: profile?.preferredAppointmentStart ?? "",
		preferredAppointmentEnd: profile?.preferredAppointmentEnd ?? "",
		preferredAppointmentNote: profile?.preferredAppointmentNote ?? "",
		dataProcessingBasisNote: profile?.dataProcessingBasisNote ?? "",
		orthodonticProgress: profile?.orthodonticProgress ?? "",
		loyaltyTier:
			profile?.loyaltyTier === "silver" ||
			profile?.loyaltyTier === "gold" ||
			profile?.loyaltyTier === "platinum" ||
			profile?.loyaltyTier === "standard"
				? profile.loyaltyTier
				: "standard",
	};
}

export function buildPatientAdministrativeProfilePayload(
	draft: PatientAdministrativeProfileDraft,
): UpdatePatientAdministrativeProfileInput {
	return {
		identityDocument: nullablePatientDraftValue(draft.identityDocument),
		taxpayerInn: nullablePatientDraftValue(draft.taxpayerInn),
		registrationAddress: nullablePatientDraftValue(draft.registrationAddress),
		residentialAddress: nullablePatientDraftValue(draft.residentialAddress),
		insurancePolicyNumber: nullablePatientDraftValue(
			draft.insurancePolicyNumber,
		),
		snils: nullablePatientDraftValue(draft.snils),
		legalRepresentativeFullName: nullablePatientDraftValue(
			draft.legalRepresentativeFullName,
		),
		legalRepresentativeRelationship: nullablePatientDraftValue(
			draft.legalRepresentativeRelationship,
		),
		legalRepresentativeIdentityDocument: nullablePatientDraftValue(
			draft.legalRepresentativeIdentityDocument,
		),
		legalRepresentativePhone: nullablePatientDraftValue(
			draft.legalRepresentativePhone,
		),
		preferredDocumentRecipient: nullablePatientDraftValue(
			draft.preferredDocumentRecipient,
		),
		preferredAppointmentWeekdays: draft.preferredAppointmentWeekdays,
		preferredAppointmentStart: nullablePatientDraftValue(
			draft.preferredAppointmentStart,
		),
		preferredAppointmentEnd: nullablePatientDraftValue(
			draft.preferredAppointmentEnd,
		),
		preferredAppointmentNote: nullablePatientDraftValue(
			draft.preferredAppointmentNote,
		),
		dataProcessingBasisNote: nullablePatientDraftValue(
			draft.dataProcessingBasisNote,
		),
		orthodonticProgress: nullablePatientDraftValue(draft.orthodonticProgress),
		loyaltyTier:
			draft.loyaltyTier === "silver" ||
			draft.loyaltyTier === "gold" ||
			draft.loyaltyTier === "platinum" ||
			draft.loyaltyTier === "standard"
				? draft.loyaltyTier
				: "standard",
	};
}

export function patientAdministrativeProfileDraftSignature(
	draft: PatientAdministrativeProfileDraft,
): string {
	return JSON.stringify(buildPatientAdministrativeProfilePayload(draft));
}

export function patientAdministrativeProfileDraftIssue(
	draft: PatientAdministrativeProfileDraft,
): string | null {
	const inn = draft.taxpayerInn.trim();
	if (inn && !/^\d{10}$|^\d{12}$/.test(inn)) {
		return "ИНН можно сохранить только в формате 10 или 12 цифр. Пока это локальный черновик.";
	}
	if (draft.preferredAppointmentStart && !draft.preferredAppointmentEnd) {
		return "Укажите конец удобного времени приема или очистите начало.";
	}
	if (!draft.preferredAppointmentStart && draft.preferredAppointmentEnd) {
		return "Укажите начало удобного времени приема или очистите конец.";
	}
	if (
		draft.preferredAppointmentStart &&
		draft.preferredAppointmentEnd &&
		draft.preferredAppointmentEnd <= draft.preferredAppointmentStart
	) {
		return "Конец удобного времени приема должен быть позже начала.";
	}
	return null;
}

export function buildClinicProfileUpdatePayload(
	draft: ClinicProfileDraft,
): UpdateClinicProfileInput {
	const defaultVisitMinutes = Number.parseInt(draft.defaultVisitMinutes, 10);
	const appointmentBufferMinutes = Number.parseInt(
		draft.appointmentBufferMinutes,
		10,
	);
	return {
		clinicName: draft.clinicName.trim(),
		legalName: nullableClinicDraftValue(draft.legalName),
		inn: nullableClinicDraftValue(draft.inn),
		kpp: nullableClinicDraftValue(draft.kpp),
		ogrn: nullableClinicDraftValue(draft.ogrn),
		address: nullableClinicDraftValue(draft.address),
		phone: nullableClinicDraftValue(draft.phone),
		email: nullableClinicDraftValue(draft.email),
		website: nullableClinicDraftValue(draft.website),
		medicalLicenseNumber: nullableClinicDraftValue(draft.medicalLicenseNumber),
		medicalLicenseIssuedAt: nullableClinicDraftValue(
			draft.medicalLicenseIssuedAt,
		),
		medicalLicenseIssuer: nullableClinicDraftValue(draft.medicalLicenseIssuer),
		bankDetails: nullableClinicDraftValue(draft.bankDetails),
		signatoryName: nullableClinicDraftValue(draft.signatoryName),
		signatoryTitle: nullableClinicDraftValue(draft.signatoryTitle),
		timezone: draft.timezone.trim() || "Europe/Samara",
		defaultVisitMinutes: Number.isFinite(defaultVisitMinutes)
			? Math.max(5, Math.min(defaultVisitMinutes, 480))
			: 45,
		scheduleDefaults: {
			workdayStart: normalizeClockTime(draft.workdayStart, "09:00"),
			workdayEnd: normalizeClockTime(draft.workdayEnd, "18:00"),
			workingDays: normalizeWorkingDaysDraft(draft.workingDays),
			appointmentBufferMinutes: Number.isFinite(appointmentBufferMinutes)
				? Math.max(0, Math.min(appointmentBufferMinutes, 180))
				: 10,
		},
		egiszEnabled: draft.egiszEnabled,
	};
}

export function clinicProfileDraftSignature(draft: ClinicProfileDraft): string {
	return JSON.stringify(buildClinicProfileUpdatePayload(draft));
}

export function clinicLegalMissingFields(
	profile?: ClinicProfile | null,
): string[] {
	if (!profile)
		return [
			"Юр. лицо",
			"ИНН",
			"Адрес",
			"Телефон",
			"Номер лицензии",
			"Дата лицензии",
			"Кем выдана лицензия",
		];

	const required: Array<[string, string | null | undefined]> = [
		["Юр. лицо", profile.legalName],
		["ИНН", profile.inn],
		["Адрес", profile.address],
		["Телефон", profile.phone],
		["Номер лицензии", profile.medicalLicenseNumber],
		["Дата лицензии", profile.medicalLicenseIssuedAt],
		["Кем выдана лицензия", profile.medicalLicenseIssuer],
	];
	return required.filter(([, value]) => !value?.trim()).map(([label]) => label);
}

export function clinicLegalReadinessPercent(
	profile?: ClinicProfile | null,
): number {
	const missing = clinicLegalMissingFields(profile).length;
	return Math.round(((7 - missing) / 7) * 100);
}

export const roleFocusOrder: StaffRole[] = [
	"doctor",
	"administrator",
	"assistant",
	"manager",
	"owner",
];

export type StaffScheduleDraft = {
	start: string;
	end: string;
	workingDays: number[];
	perDay: StaffWorkingHours;
};

export function normalizeWorkingDaysDraft(
	value: readonly number[] | undefined,
): number[] {
	// БЫЛО: пустой массив приравнивался к "не задано" и подменялся на Пн–Пт.
	// Администратор снимал все галочки, чтобы отправить врача в отпуск или вывести
	// кресло из строя, — галочки возвращались на Пн–Пт и сохранялись в базу.
	// Отсутствующий врач оставался доступным для записи.
	// Теперь Пн–Пт подставляются только когда значение вообще не задано.
	if (value === undefined || value === null) return [...defaultWorkingDays];
	return Array.from(
		new Set(
			value.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
		),
	).sort((left, right) => left - right);
}

export const defaultWorkingDays = [1, 2, 3, 4, 5];

export type ClinicProfileDraft = {
	clinicName: string;
	legalName: string;
	inn: string;
	kpp: string;
	ogrn: string;
	address: string;
	phone: string;
	email: string;
	website: string;
	medicalLicenseNumber: string;
	medicalLicenseIssuedAt: string;
	medicalLicenseIssuer: string;
	bankDetails: string;
	signatoryName: string;
	signatoryTitle: string;
	timezone: string;
	defaultVisitMinutes: string;
	workdayStart: string;
	workdayEnd: string;
	workingDays: number[];
	appointmentBufferMinutes: string;
	egiszEnabled: boolean;
};

export function normalizeOptionalWorkingDaysDraft(
	value: readonly number[] | undefined,
): number[] {
	return Array.from(
		new Set(
			(value ?? []).filter(
				(day) => Number.isInteger(day) && day >= 0 && day <= 6,
			),
		),
	).sort((left, right) => left - right);
}

export type PatientAdministrativeProfileDraft = {
	[K in Exclude<
		keyof PatientAdministrativeProfile,
		"preferredAppointmentWeekdays"
	>]: string;
} & {
	preferredAppointmentWeekdays: number[];
};

export function nullablePatientDraftValue(value: string): string | null {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}
