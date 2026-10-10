/**
 * @file organizations.ts
 * @description Layer 1: Demo clinic organization profiles, branches, chairs, schedule defaults.
 */

import type {
	Chair,
	ClinicProfile,
	ClinicScheduleDefaults,
	StaffWorkingHours,
} from "@dental/shared";

import { organizationId, chairId, defaultClinicTimezone, nowIso } from "./fixtureIds.js";

const defaultClinicScheduleDefaults: ClinicScheduleDefaults = {
	workdayStart: "09:00",
	workdayEnd: "18:00",
	workingDays: [1, 2, 3, 4, 5],
	appointmentBufferMinutes: 10,
};

const clinicProfile: ClinicProfile & Record<string, any> = {
	organizationId,
	clinicName: "Стоматология, 1 кабинет",
	legalName: "ИП Иванова М.С.",
	inn: "631234567890",
	kpp: null,
	ogrn: "318631300000000",
	address: "Самара, ул. Демонстрационная, 12",
	phone: "+7 927 111-22-33",
	email: "clinic@example.com",
	website: "https://example.com",
	medicalLicenseNumber: "Л041-01184-63/00000000",
	medicalLicenseIssuedAt: "2024-01-15",
	medicalLicenseIssuer: "Министерство здравоохранения Самарской области",
	bankDetails: "р/с 40702810000000000000, БИК 043601000, банк ООО «Демо Банк»",
	signatoryName: "Иванова Марина Сергеевна",
	signatoryTitle: "индивидуальный предприниматель",
	mode: "one_chair",
	timezone: defaultClinicTimezone,
	defaultVisitMinutes: 45,
	scheduleDefaults: defaultClinicScheduleDefaults,
	networkEnabled: false,
	egiszEnabled: false,
	updatedAt: nowIso,
	currency: "₽",
	themeColor: "teal",
	logoUrl: null,
	stampUrl: null,
	hasAssistants: true,
	hasMultipleChairs: true,
	hasDentalLab: true,
	hasInsuranceCoPay: true,
	hasInstallments: true,
	hasOrthodontics: true,
	hasGnathology: false,
	hasCsoScanner: false,
	hasLeadsKanban: false,
	hasOmnichannel: false,
	hasTasks: true,
	hasReclamations: true,
	workspacePreset: "enterprise",
	onboardingCompleted: false,
	hasPediatricMode: false,
	isOmniRole: false,
	hasPayrollModule: true,
	hasMarketingModule: true,
	hasAnalyticsModule: true,
	hasInventoryModule: true,
	aiEnableTreatmentPlan: true,
	aiEnableRecommendations: true,
	aiEnableDocuments: true,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
} as any;

const chairs: Chair[] = [
	{
		id: chairId,
		organizationId,
		name: "Кресло 1",
		room: "Кабинет 1",
		specialization: "therapist",
		active: true,
		hasXraySensor: true,
		hasMicroscope: false,
		hasSurgeryKit: false,
		notes: "Основное терапевтическое кресло, RVG рядом.",
		workingHours: null,
	},
];

function rub(value: number): string {
	return `${value.toLocaleString("ru-RU")} ₽`;
}

function isClockTime(value: unknown): value is string {
	return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function clockToMinutes(value: string): number {
	const [hours = "0", minutes = "0"] = value.split(":");
	return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

function normalizeWorkingDays(value: unknown): number[] {
	const rawDays = Array.isArray(value)
		? value
		: defaultClinicScheduleDefaults.workingDays;
	const days = Array.from(
		new Set(
			rawDays
				.filter(
					(day): day is number => Number.isInteger(day) && day >= 0 && day <= 6,
				)
				.sort((left, right) => left - right),
		),
	);
	return days.length ? days : defaultClinicScheduleDefaults.workingDays;
}

function normalizeOptionalWeekdays(value: unknown): number[] {
	const rawDays = Array.isArray(value) ? value : [];
	return Array.from(
		new Set(
			rawDays
				.filter(
					(day): day is number => Number.isInteger(day) && day >= 0 && day <= 6,
				)
				.sort((left, right) => left - right),
		),
	);
}

function normalizeClinicScheduleDefaults(
	input?: Partial<ClinicScheduleDefaults> | null,
): ClinicScheduleDefaults {
	const workdayStart = isClockTime(input?.workdayStart)
		? input.workdayStart
		: defaultClinicScheduleDefaults.workdayStart;
	const requestedEnd = isClockTime(input?.workdayEnd)
		? input.workdayEnd
		: defaultClinicScheduleDefaults.workdayEnd;
	const workdayEnd =
		clockToMinutes(requestedEnd) > clockToMinutes(workdayStart)
			? requestedEnd
			: defaultClinicScheduleDefaults.workdayEnd;
	const requestedBuffer = input?.appointmentBufferMinutes;
	const buffer =
		typeof requestedBuffer === "number" &&
		Number.isInteger(requestedBuffer) &&
		requestedBuffer >= 0
			? Math.min(requestedBuffer, 180)
			: defaultClinicScheduleDefaults.appointmentBufferMinutes;

	return {
		workdayStart,
		workdayEnd,
		workingDays: normalizeWorkingDays(input?.workingDays),
		appointmentBufferMinutes: buffer,
	};
}

function defaultStaffWorkingHours(): StaffWorkingHours {
	return Array.from({ length: 7 }, (_, weekday) => ({
		weekday,
		enabled: defaultClinicScheduleDefaults.workingDays.includes(weekday),
		start: defaultClinicScheduleDefaults.workdayStart,
		end: defaultClinicScheduleDefaults.workdayEnd,
	}));
}

function isValidDateParts(year: number, month: number, day: number): boolean {
	const parsed = new Date(Date.UTC(year, month - 1, day));
	return (
		parsed.getUTCFullYear() === year &&
		parsed.getUTCMonth() === month - 1 &&
		parsed.getUTCDate() === day
	);
}

function todayLocalIsoDateOnly(): string {
	const now = new Date();
	const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 10);
}

function normalizeDateOnlyInput(
	value: string | null | undefined,
	fieldLabel: string,
): string | null {
	const trimmed = value?.trim();
	if (!trimmed) return null;
	const today = todayLocalIsoDateOnly();

	const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	const normalized = iso
		? isValidDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))
			? `${iso[1]}-${iso[2]}-${iso[3]}`
			: null
		: null;
	if (normalized) {
		if (normalized > today) {
			throw new Error(`${fieldLabel} не может быть позже сегодняшнего дня`);
		}
		return normalized;
	}

	const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
	if (ru && isValidDateParts(Number(ru[3]), Number(ru[2]), Number(ru[1]))) {
		const ruNormalized = `${ru[3]}-${ru[2]}-${ru[1]}`;
		if (ruNormalized > today) {
			throw new Error(`${fieldLabel} не может быть позже сегодняшнего дня`);
		}
		return ruNormalized;
	}

	throw new Error(
		`${fieldLabel} должна быть реальной датой в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ`,
	);
}

export { chairs, clinicProfile, defaultClinicScheduleDefaults, normalizeClinicScheduleDefaults, normalizeDateOnlyInput, defaultStaffWorkingHours, isClockTime, clockToMinutes, rub };
