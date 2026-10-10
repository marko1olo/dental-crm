/**
 * @file apps/web/src/helpers/dateHelpers.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	type Appointment,
	type CreateAppointmentInput,
	type Dashboard,
	type DentalSpecialty,
	type UpdateAppointmentInput,
} from "@dental/shared";
import {
	defaultAppointmentStartLocal,
} from "../utils/clinicProfileUtils";
import {
	addMinutesToClinicDateTimeLocal,
	fromDateTimeLocalValue,
} from "../utils/dateTimeUtils";
export {
	addMinutesToClinicDateTimeLocal,
	fromDateTimeLocalValue,
};
import {
	type UiPreferences,
	type UiPreferencesInput,
	defaultUiPreferences,
} from "../utils/preferencesUtils";
import {
	appointmentLabels,
} from "../workspaceUiLabels";
import {
	isRecordKey,
} from "./guardUtils";
import {
	type AppointmentScheduleDraft,
	type OnboardingStep,
} from "./types";

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

export function isAppointmentStatusFilterPreference(
	value: unknown,
): value is Appointment["status"] | "all" {
	return value === "all" || isRecordKey(value, appointmentLabels);
}

export function isOnboardingStepPreference(
	value: unknown,
): value is OnboardingStep {
	return (
		typeof value === "string" &&
		onboardingStepValues.includes(value as OnboardingStep)
	);
}

export function normalizedAppointmentStatus(
	value: unknown,
	fallback: Appointment["status"] = "planned",
): Appointment["status"] {
	return isRecordKey(value, appointmentLabels) ? value : fallback;
}

export function normalizedAppointmentStatusFilter(
	value: unknown,
): Appointment["status"] | "all" {
	return isAppointmentStatusFilterPreference(value)
		? value
		: defaultUiPreferences.scheduleStatusFilter;
}

export function withSavedUiPreferenceTimestamp(
	preferences: UiPreferencesInput,
): UiPreferences {
	return {
		version: 1,
		...preferences,
		savedAt: new Date().toISOString(),
	};
}

export const weekdayOptions = [
	{ value: 1, label: "Пн" },
	{ value: 2, label: "Вт" },
	{ value: 3, label: "Ср" },
	{ value: 4, label: "Чт" },
	{ value: 5, label: "Пт" },
	{ value: 6, label: "Сб" },
	{ value: 0, label: "Вс" },
];

export function appointmentScheduleDraftFromAppointment(
	appointment: Appointment,
): AppointmentScheduleDraft {
	return {
		patientId: appointment.patientId ?? "",
		doctorUserId: appointment.doctorUserId ?? "",
		assistantUserId: appointment.assistantUserId ?? "",
		chairId: appointment.chairId ?? "",
		status: appointment.status,
		startsAt: appointment.startsAt,
		endsAt: appointment.endsAt,
		reason: appointment.reason ?? "",
		comment: appointment.comment ?? "",
	};
}

export function newAppointmentDraftFromDashboard(
	dashboard: Dashboard,
	preferences: {
		selectedPatientId?: string | null;
		selectedSpecialty?: DentalSpecialty;
		scheduleDefaultDoctorUserId?: string | null;
		scheduleDefaultAssistantUserId?: string | null;
		scheduleDefaultChairId?: string | null;
	} = {},
): AppointmentScheduleDraft {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const profile = dashboard?.clinicSettings?.profile || ({} as any);
	const staff = dashboard?.clinicSettings?.staff || [];
	const chairs = dashboard?.clinicSettings?.chairs || [];
	const patients = dashboard?.patients || [];
	const timezone = profile?.timezone || "Europe/Samara";
	const startsAtLocal = defaultAppointmentStartLocal(profile);
	const endsAtLocal = addMinutesToClinicDateTimeLocal(
		startsAtLocal,
		profile?.defaultVisitMinutes || 45,
		timezone,
	);
	const selectedSpecialty = preferences.selectedSpecialty ?? "universal";
	const specialtyMatches = (specialties?: DentalSpecialty[]) =>
		selectedSpecialty === "universal" ||
		(Array.isArray(specialties) &&
			(specialties.includes(selectedSpecialty) ||
				specialties.includes("universal")));
	const savedDoctor = preferences.scheduleDefaultDoctorUserId
		? staff.find(
				(member) =>
					member.id === preferences.scheduleDefaultDoctorUserId &&
					member.active &&
					(member.role === "doctor" || member.role === "owner"),
			)
		: null;
	const doctor =
		savedDoctor ??
		staff.find(
			(member) =>
				member.active &&
				(member.role === "doctor" || member.role === "owner") &&
				specialtyMatches(member.specialties),
		) ??
		staff.find(
			(member) =>
				member.active && (member.role === "doctor" || member.role === "owner"),
		);
	const savedAssistant =
		profile?.mode === "solo_doctor" ||
		!preferences.scheduleDefaultAssistantUserId
			? null
			: staff.find(
					(member) =>
						member.id === preferences.scheduleDefaultAssistantUserId &&
						member.active &&
						member.role === "assistant",
				);
	const assistant =
		savedAssistant ??
		staff.find((member) => member.active && member.role === "assistant");
	const savedChair = preferences.scheduleDefaultChairId
		? chairs.find(
				(candidate) =>
					candidate.id === preferences.scheduleDefaultChairId &&
					candidate.active,
			)
		: null;
	const chair =
		savedChair ??
		chairs.find(
			(candidate) =>
				candidate.active &&
				(!candidate.specialization ||
					selectedSpecialty === "universal" ||
					candidate.specialization === selectedSpecialty),
		) ??
		chairs.find((candidate) => candidate.active);
	const selectedPatient = preferences.selectedPatientId
		? patients.find(
				(candidate) =>
					candidate.id === preferences.selectedPatientId &&
					candidate.status === "active",
			)
		: null;
	const patient =
		selectedPatient ??
		patients.find((candidate) => candidate.status === "active");
	return {
		patientId: patient?.id ?? "",
		doctorUserId: doctor?.id ?? "",
		assistantUserId:
			profile.mode === "solo_doctor" ? "" : (assistant?.id ?? ""),
		chairId: chair?.id ?? "",
		status: "planned",
		startsAt: fromDateTimeLocalValue(startsAtLocal, timezone),
		endsAt: fromDateTimeLocalValue(endsAtLocal, timezone),
		reason: "Первичная консультация",
		comment: "",
	};
}

export function nullableAppointmentDraftValue(value?: string | null): string | null {
	const trimmed = (value ?? "").trim();
	return trimmed ? trimmed : null;
}

export function appointmentUpdateInputFromDraft(
	draft: AppointmentScheduleDraft,
): UpdateAppointmentInput {
	return {
		patientId: draft.patientId || null,
		doctorUserId: draft.doctorUserId || null,
		assistantUserId: draft.assistantUserId || null,
		chairId: draft.chairId || null,
		status: draft.status,
		startsAt: draft.startsAt.trim(),
		endsAt: draft.endsAt.trim(),
		reason: nullableAppointmentDraftValue(draft.reason),
		comment: nullableAppointmentDraftValue(draft.comment),
	};
}

export function appointmentCreateInputFromDraft(
	draft: AppointmentScheduleDraft,
): CreateAppointmentInput {
	return {
		patientId: draft.patientId,
		doctorUserId: draft.doctorUserId,
		assistantUserId: draft.assistantUserId || null,
		chairId: draft.chairId,
		status: draft.status,
		startsAt: draft.startsAt.trim(),
		endsAt: draft.endsAt.trim(),
		reason: nullableAppointmentDraftValue(draft.reason),
		comment: nullableAppointmentDraftValue(draft.comment),
	};
}

export function appointmentScheduleDraftSignature(
	draft: AppointmentScheduleDraft,
): string {
	return JSON.stringify(appointmentUpdateInputFromDraft(draft));
}

export function appointmentScheduleDateMissingSteps(
	draft: AppointmentScheduleDraft,
): string[] {
	const startsAt = (draft?.startsAt ?? "").trim();
	const endsAt = (draft?.endsAt ?? "").trim();
	const startsAtMs = Date.parse(startsAt);
	const endsAtMs = Date.parse(endsAt);
	return [
		!startsAt ? "укажите начало приема" : null,
		startsAt && !Number.isFinite(startsAtMs)
			? "проверьте дату начала приема"
			: null,
		!endsAt ? "укажите окончание приема" : null,
		endsAt && !Number.isFinite(endsAtMs)
			? "проверьте дату окончания приема"
			: null,
		Number.isFinite(startsAtMs) &&
		Number.isFinite(endsAtMs) &&
		endsAtMs <= startsAtMs
			? "окончание приема должно быть позже начала"
			: null,
	].filter((step): step is string => Boolean(step));
}

export function isTechnicalBreakAppointment(
	item: { reason?: string | null; comment?: string | null } | null | undefined,
): boolean {
	if (!item) return false;
	const r = String(item.reason || "").toLowerCase();
	const c = String(item.comment || "").toLowerCase();
	return (
		r.includes("служебный перерыв") ||
		r.includes("технический перерыв") ||
		r.includes("служебная бронь") ||
		r.includes("служебная блокировка") ||
		r.includes("санобработка") ||
		r.includes("обед") ||
		r.includes("перерыв") ||
		r.includes("отпуск") ||
		r.includes("учеба") ||
		r.includes("учёба") ||
		r.includes("отсутствует") ||
		r.includes("консилиум") ||
		r.includes("другое (блокировка)") ||
		r.includes("другое (служебное)") ||
		r.includes("блокировка") ||
		c.includes("служебная бронь") ||
		c.includes("служебная блокировка") ||
		c.includes("технический интервал") ||
		c.includes("блокировка")
	);
}

export function appointmentScheduleMissingFields(
	draft: AppointmentScheduleDraft,
	clinicMode: Dashboard["clinicSettings"]["profile"]["mode"] | null | undefined,
	staff: Dashboard["clinicSettings"]["staff"] | null | undefined,
	resources?: {
		chairs?: Dashboard["clinicSettings"]["chairs"] | null;
		patients?: Dashboard["patients"] | null;
	},
): string[] {
	const missing: string[] = [];
	const activeStaff = (staff || []).filter((member) => member.active);
	const hasDoctor = activeStaff.some(
		(member) => member.role === "doctor" || member.role === "owner",
	);
	const activeChairs = resources?.chairs
		? resources.chairs.filter((chair) => chair.active)
		: null;
	const patients = resources?.patients ?? null;

	const isTechnicalBreak = isTechnicalBreakAppointment(draft);
	if (!draft.patientId && !isTechnicalBreak) {
		missing.push(
			patients && patients.length === 0
				? "в клинике ещё нет пациентов — создайте карточку в разделе «Пациенты»"
				: "выберите пациента",
		);
	}
	if (!draft.doctorUserId) {
		missing.push(
			staff && !hasDoctor
				? "в клинике нет врача — добавьте сотрудника в настройках"
				: "выберите врача",
		);
	}
	if (!draft.chairId) {
		missing.push(
			activeChairs && activeChairs.length === 0
				? "в клинике нет кресел — добавьте кресло в настройках"
				: "выберите кресло",
		);
	}
	missing.push(...appointmentScheduleDateMissingSteps(draft));
	return missing;
}

export const appointmentReadinessLabels: Record<
	Dashboard["appointmentReadiness"][number]["state"],
	string
> = {
	ready: "готово",
	needs_attention: "проверить",
	blocked: "важно",
};
