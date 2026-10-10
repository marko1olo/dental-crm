import type {
	AppointmentScheduleDraft,
	AppointmentScheduleSaveState,
	VisitLocalDraft,
	VisitNoteField,
	VisitNoteForm,
} from "./types.js";
import type {
	Appointment,
	CreateAppointmentInput,
	Dashboard,
	DentalSpecialty,
	PatientIntakePregnancyStatus,
	UpdateAppointmentInput,
	VisitNoteDraft,
	Patient,
	PostVisitCareTopic,
	AcceptVisitDraftResponse,
} from "@dental/shared";
import { buildRuleBasedVisitDraftFromTranscript } from "@dental/shared";
import { defaultUiPreferences } from "../utils/preferencesUtils";
import {
	defaultAppointmentStartLocal,
	isDentalSpecialty,
} from "../utils/clinicProfileUtils";
import {
	addMinutesToClinicDateTimeLocal,
	fromDateTimeLocalValue,
	formatTime,
} from "../utils/dateTimeUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../utils/localStorageHelpers";
import { postVisitCareTopicOptions } from "../workspaceStaticOptions";
import {
	appointmentLabels,
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	paymentMethodLabels,
	recognitionTargetLabels,
	serviceCategoryLabels,
} from "../workspaceUiLabels";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	offlineDraftOrganizationKey,
	sensitiveLocalDraftRetentionMs,
	isRecordKey,
	isOptionValue,
	isNullableString,
	WorkflowResponseError,
} from "./uiFormatters.js";
import { isPostVisitCareTopicPreference } from "./documentHelpers.js";

export {
	defaultClinicalToothRowsText,
	defaultDicomFirstFrameViewerState,
	defaultImagingViewerState,
	emptyAppointmentScheduleDraft,
	emptyPatientAdministrativeProfileDraft,
	emptyPatientCoreDraft,
	emptyTelegramVisualCardUrlDrafts,
	emptyVisitNoteForm,
} from "../utils/draftDefaults";

export const toothRows = [
	[
		"18",
		"17",
		"16",
		"15",
		"14",
		"13",
		"12",
		"11",
		"21",
		"22",
		"23",
		"24",
		"25",
		"26",
		"27",
		"28",
	],
	[
		"48",
		"47",
		"46",
		"45",
		"44",
		"43",
		"42",
		"41",
		"31",
		"32",
		"33",
		"34",
		"35",
		"36",
		"37",
		"38",
	],
] as const;

export const toothStateByCode: Record<
	string,
	"watch" | "planned" | "done" | "missing"
> = {
	"16": "watch",
	"26": "done",
	"36": "planned",
	"46": "watch",
	"48": "missing",
};

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

export const visitNoteFieldDefinitions: Array<{
	key: VisitNoteField;
	label: string;
}> = [
	{ key: "complaint", label: "Жалобы" },
	{ key: "anamnesis", label: "Анамнез" },
	{ key: "objectiveStatus", label: "Объективно" },
	{ key: "diagnosis", label: "Диагноз" },
	{ key: "treatmentPlan", label: "План" },
];

export const visitDraftQualityLabels: Record<
	NonNullable<VisitNoteDraft["quality"]>["level"],
	string
> = {
	ready: "Черновик плотный",
	review: "Нужна проверка",
	needs_more_dictation: "Нужно дописать",
};

export const visitDraftSignalLabels: Record<string, string> = {
	complaint_detected: "жалобы есть",
	anamnesis_detected: "анамнез есть",
	objective_detected: "осмотр есть",
	diagnosis_mentioned: "диагноз есть",
	plan_detected: "план есть",
	tooth_codes_detected: "зуб указан",
	imaging_mentioned: "снимки упомянуты",
	consent_mentioned: "согласие упомянуто",
	medical_risk_mentioned: "есть медриск",
	procedure_mentioned: "процедура упомянута",
};

export const visitDraftMissingFieldLabels: Record<string, string> = {
	complaint: "жалобы",
	anamnesis: "анамнез",
	objective_status: "объективный статус",
	diagnosis_review: "диагноз",
	treatment_plan: "план лечения",
	tooth_or_region: "зуб или область",
};

export function visitDraftSignalLabel(signal: string) {
	return visitDraftSignalLabels[signal] ?? signal.replace(/_/g, " ");
}

export function visitDraftMissingFieldLabel(field: string) {
	return visitDraftMissingFieldLabels[field] ?? field.replace(/_/g, " ");
}

export function visitNoteFormFromVisit(
	visit: Dashboard["activeVisit"],
): VisitNoteForm {
	return {
		complaint: visit?.complaint ?? "",
		anamnesis: visit?.anamnesis ?? "",
		objectiveStatus: visit?.objectiveStatus ?? "",
		diagnosis: visit?.diagnosis ?? "",
		treatmentPlan: visit?.treatmentPlan ?? "",
	};
}

export function visitNoteFormFromDraft(draft: VisitNoteDraft): VisitNoteForm {
	return {
		complaint: draft.complaint ?? "",
		anamnesis: draft.anamnesis ?? "",
		objectiveStatus: draft.objectiveStatus ?? "",
		diagnosis: draft.diagnosis ?? "",
		treatmentPlan: draft.treatmentPlan ?? "",
	};
}

export function visitNoteDraftFromForm(
	form: VisitNoteForm,
	warnings: string[],
): VisitNoteDraft {
	return {
		complaint: form.complaint,
		anamnesis: form.anamnesis,
		objectiveStatus: form.objectiveStatus,
		diagnosis: form.diagnosis,
		treatmentPlan: form.treatmentPlan,
		warnings,
	};
}

export function visitLocalDraftKey(
	visitId: string,
	organizationId: string | null | undefined = null,
) {
	return organizationScopedLocalStorageKey(
		`dental-crm:visit-draft:${visitId}`,
		organizationId,
	);
}

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

export function isAppointmentStatusFilterPreference(
	value: unknown,
): value is Appointment["status"] | "all" {
	return value === "all" || isRecordKey(value, appointmentLabels);
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

export function normalizedPatientIntakePregnancyStatus(
	value: unknown,
): PatientIntakePregnancyStatus {
	return isOptionValue(value, patientIntakePregnancyStatusOptions)
		? value
		: "unknown";
}

export function normalizedPostVisitCareTopic(
	value: unknown,
): PostVisitCareTopic {
	return isPostVisitCareTopicPreference(value)
		? value
		: defaultUiPreferences.postVisitCareTopic;
}

export function normalizedServiceCategory(
	value: unknown,
): Dashboard["serviceCatalog"][number]["category"] {
	return isRecordKey(value, serviceCategoryLabels) ? value : "therapy";
}

export function acceptedVisitSaveFailureIsRetryable(error: unknown): boolean {
	if (!(error instanceof WorkflowResponseError)) return true;
	return (
		error.status === 0 ||
		error.status === 408 ||
		error.status === 429 ||
		error.status >= 500
	);
}

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

export function isVisitNoteForm(value: unknown): value is VisitNoteForm {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<Record<VisitNoteField, unknown>>;
	return visitNoteFieldDefinitions.every(
		({ key }) => typeof candidate[key] === "string",
	);
}

export function loadVisitLocalDraft(
	visitId: string,
	organizationId: string | null | undefined = null,
): VisitLocalDraft | null {
	if (typeof window === "undefined") return null;
	try {
		const raw =
			safeLocalStorageGetItem(visitLocalDraftKey(visitId, organizationId)) ??
			(organizationId
				? safeLocalStorageGetItem(visitLocalDraftKey(visitId))
				: null);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<VisitLocalDraft>;
		if (
			parsed.version !== 1 ||
			parsed.visitId !== visitId ||
			typeof parsed.savedAt !== "string" ||
			typeof parsed.transcript !== "string" ||
			!isDentalSpecialty(parsed.selectedSpecialty) ||
			!isVisitNoteForm(parsed.visitNoteForm)
		) {
			return null;
		}
		if (!localSavedAtFresh(parsed.savedAt, sensitiveLocalDraftRetentionMs)) {
			safeLocalStorageRemoveItem(visitLocalDraftKey(visitId, organizationId));
			if (organizationId)
				safeLocalStorageRemoveItem(visitLocalDraftKey(visitId));
			return null;
		}
		return parsed as VisitLocalDraft;
	} catch {
		return null;
	}
}

export function saveVisitLocalDraft(
	draft: VisitLocalDraft,
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	safeLocalStorageSetItem(
		visitLocalDraftKey(draft.visitId, organizationId),
		JSON.stringify(draft),
	);
}

export function isVisitNoteDraft(value: unknown): value is VisitNoteDraft {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<VisitNoteDraft>;
	return (
		isNullableString(candidate.complaint) &&
		isNullableString(candidate.anamnesis) &&
		isNullableString(candidate.objectiveStatus) &&
		isNullableString(candidate.diagnosis) &&
		isNullableString(candidate.treatmentPlan) &&
		Array.isArray(candidate.warnings) &&
		candidate.warnings.every((warning) => typeof warning === "string")
	);
}

export function visitSaveReceiptText(
	receipt: AcceptVisitDraftResponse["saveReceipt"],
): string {
	if (receipt.status === "duplicate") {
		return `Повторная отправка распознана: дубль не создан, серверная версия ${receipt.serverRevision}.`;
	}
	if (receipt.warning) {
		return `${receipt.warning} Серверная версия ${receipt.serverRevision}.`;
	}
	return `Сервер подтвердил сохранение ${formatTime(receipt.savedAt)}, версия карты ${receipt.serverRevision}.`;
}

export function buildOfflineVisitDraftFromTranscript(
	transcript: string,
	specialty: DentalSpecialty,
): VisitNoteDraft {
	return buildRuleBasedVisitDraftFromTranscript(transcript, specialty, {
		sourceLabel: "Локальный разбор диктовки",
	});
}

export const patientInsightRiskLabels: Record<
	Dashboard["patientInsights"][number]["riskLevel"],
	string
> = {
	low: "спокойно",
	watch: "контроль",
	high: "срочно",
};

export const recommendedActionPriorityLabels: Record<
	Dashboard["recommendedActions"][number]["priority"],
	string
> = {
	routine: "план",
	important: "важно",
	urgent: "срочно",
};

export const appointmentReadinessLabels: Record<
	Dashboard["appointmentReadiness"][number]["state"],
	string
> = {
	ready: "готово",
	needs_attention: "проверить",
	blocked: "важно",
};
