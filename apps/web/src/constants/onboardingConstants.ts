import type {
	Appointment,
	PatientAdministrativeProfile,
	StaffRole,
	StaffWorkingHours,
} from "@dental/shared";

export const onboardingStorageKey = "dental-crm:onboarding:v1";

export const clinicProfileEndpoint = "/api/settings/clinic/profile";

export type OnboardingStep =
	| "intro"
	| "role"
	| "clinic"
	| "legal"
	| "team"
	| "sources"
	| "telegram"
	| "done";

export const onboardingStepValues: readonly OnboardingStep[] = [
	"intro",
	"role",
	"clinic",
	"legal",
	"team",
	"sources",
	"telegram",
	"done",
];

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

export type ClinicProfileSaveState = "idle" | "saving" | "saved" | "error";

export type PatientCoreDraft = {
	fullName: string;
	birthDate: string;
	phone: string;
	email: string;
	notes: string;
};

export type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";

export type PatientAdministrativeProfileDraft = {
	[K in Exclude<
		keyof PatientAdministrativeProfile,
		"preferredAppointmentWeekdays" | "isAnonymous" | "anonymousCode" | "decree659Compliance"
	>]: string;
} & {
	preferredAppointmentWeekdays: number[];
	isAnonymous?: boolean | null;
	anonymousCode?: string | null;
	decree659Compliance?: Record<string, unknown> | null;
};

export type PatientAdministrativeProfileSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

export type StaffScheduleDraft = {
	start: string;
	end: string;
	workingDays: number[];
	perDay: StaffWorkingHours;
};

export type StaffScheduleSaveState = "idle" | "saving" | "saved" | "error";

export type AppointmentScheduleDraft = {
	patientId: string;
	doctorUserId: string;
	assistantUserId?: string | null;
	chairId: string;
	status: Appointment["status"];
	startsAt: string;
	endsAt: string;
	reason?: string;
	comment?: string;
	notes?: string;
	cancellationReason?: string;
};

export type AppointmentScheduleSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

export type OnboardingDismissalState = {
	dismissed: boolean;
	savedAt: string;
	draftMode: boolean;
};

export const weekdayOptions = [
	{ value: 1, label: "Пн" },
	{ value: 2, label: "Вт" },
	{ value: 3, label: "Ср" },
	{ value: 4, label: "Чт" },
	{ value: 5, label: "Пт" },
	{ value: 6, label: "Сб" },
	{ value: 0, label: "Вс" },
];

export const defaultWorkingDays = [1, 2, 3, 4, 5];

export const onboardingSteps: Array<{
	id: OnboardingStep;
	title: string;
	detail: string;
}> = [
	{ id: "intro", title: "Режим запуска", detail: "демо или чистая" },
	{ id: "clinic", title: "Клиника", detail: "название и телефон" },
	{ id: "team", title: "Команда", detail: "первый врач и кресло" },
	{ id: "telegram", title: "ТГ-бот", detail: "бот, QR и отзывы" },
	{ id: "done", title: "Готово", detail: "проверка и старт" },
];

export const roleFocusOrder: StaffRole[] = [
	"doctor",
	"administrator",
	"assistant",
	"manager",
	"owner",
];
