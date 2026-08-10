import {
	type AcceptVisitDraftResponse,
	type AiJobKind,
	type AiRecognitionTarget,
	type Appointment,
	buildRuleBasedVisitDraftFromTranscript,
	type ClinicalToothRow,
	type CreateAppointmentInput,
	type Dashboard,
	type DentalSpecialty,
	type DenteTelegramBotMode,
	type DenteTelegramFeature,
	type DenteTelegramLinkCodePublic,
	type DenteTelegramMessagePreview,
	type DenteTelegramOutboxResponse,
	type DenteTelegramPrivacyMode,
	type DenteTelegramVisualCardKey,
	type DenteTelegramVisualCardUrls,
	type DicomSeriesPreviewGroup,
	type DicomViewerToolStateBundleResponse,
	type DicomViewerWorkbenchManifestResponse,
	type DocumentIngestionResponse,
	type DocumentIngestionTarget,
	type DocumentIssueSignatureMode,
	type DocumentVoidReasonCode,
	documentKindMetadata,
	type GeneratedDocument,
	type ImagingSourceKind,
	type ImagingStudyKind,
	type ImagingViewerAnnotation,
	type ImagingViewerImplantPlan,
	type ImagingViewerSessionState,
	type ImagingViewerWindowPreset,
	type ImportSourceKind,
	type InstallmentPaymentStatus,
	type Patient,
	type PatientIntakePregnancyStatus,
	type PaymentMethod,
	type PhotoVideoConsentMaterial,
	type PostVisitCareTopic,
	type PricelistSourceKind,
	type ProcedureSpecificConsentProcedure,
	type SmartImportMode,
	type SpeechChunkUploadInput,
	type SpeechGatewayStatus,
	type SpeechProviderConnector,
	type SpeechTranscriptionResponse,
	type TaxDeductionApplicationDeliveryChannel,
	type TaxDeductionApplicationForm,
	type TaxDeductionApplicationRelationship,
	type TreatmentPlanAcceptanceVariant,
	type UiLanguage,
	type UpdateAppointmentInput,
	type UpdatePatientInput,
	type VisitNoteDraft,
	type XrayCbctReferralPregnancyStatus,
	type XrayCbctReferralPriority,
	type XrayCbctReferralStudyType,
} from "@dental/shared";
import type { CSSProperties } from "react";
import { showToast } from "../components/GlobalToast";
import type { CtImplantLibraryItem } from "../ctPlanningTools";
import {
	imagingKindLabels,
	imagingSourceLabels,
	type MprProjection,
	type MprWindowPreset,
} from "../imagingUiLabels";
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import { actionFailureToast } from "../lib/panelStateText";
import {
	readDenteClinicToken,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
} from "../mprControlMath";
import { pricelistSourceKindLabels } from "../pricelistUiMeta";
import {
	collectDicomWorkstationClientFacts,
	isBrowserImagingScanAbortError,
	isBrowserMigrationScanAbortError,
	localImagingFolderFingerprint,
} from "./browserScanUtils";
import {
	buildClinicProfileUpdatePayload,
	buildPatientAdministrativeProfilePayload,
	type ClinicProfileDraft,
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
	type PatientAdministrativeProfileDraft,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	roleFocusOrder,
	type StaffScheduleDraft,
	staffScheduleDraftFromWorkingHours,
	staffScheduleDraftSignature,
	staffWorkingHoursFromDraft,
	staffWorkingHoursFromSimpleDraft,
} from "./clinicProfileUtils";
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
} from "./dateTimeUtils";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "./localStorageHelpers";
import type { AppView } from "./routeUtils";
import {
	postVisitCareTopicOptions,
	telegramVisualCardFields,
} from "../workspaceStaticOptions";
import {
	defaultUiPreferences,
	type UiPreferences,
	type UiPreferencesInput,
	uiPreferencesStorageKey,
} from "./preferencesUtils";
import {
	appointmentLabels,
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	paymentMethodLabels,
	recognitionTargetLabels,
	serviceCategoryLabels,
} from "../workspaceUiLabels";
import { money, moneyUnknownLabel } from "./financeUtils";
import { countLabel } from "../lib/russianPlural.js";
import { logger } from "./logger";
import { isRecordKey, isAppointmentStatusFilterPreference, nullableAppointmentDraftValue } from "./CommonHelpers";

export type AppointmentScheduleDraft = {
	patientId: string;
	doctorUserId: string;
	assistantUserId: string;
	chairId: string;
	status: Appointment["status"];
	startsAt: string;
	endsAt: string;
	reason: string;
	comment: string;
};

export type AppointmentScheduleSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

export const treatmentAcceptanceVariantOptions: readonly TreatmentPlanAcceptanceVariant[] =
	["urgent", "standard", "optimal", "staged", "maintenance", "other"];

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
	const startsAt = draft.startsAt.trim();
	const endsAt = draft.endsAt.trim();
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

/**
 * Чего не хватает записи, человеческими словами.
 *
 * Различает «не выбрано» и «в клинике вообще нет». Раньше клиника без кресел
 * получала подсказку «выберите кресло» при пустом списке кресел: указание,
 * которое невозможно выполнить, и кнопка создания заперта без объяснения, куда
 * идти. То же с врачом и пациентами у только что заведённой клиники.
 *
 * `resources` необязателен: без него поведение прежнее.
 */

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
	const hasAssistant = activeStaff.some(
		(member) => member.role === "assistant",
	);
	const activeChairs = resources?.chairs
		? resources.chairs.filter((chair) => chair.active)
		: null;
	const patients = resources?.patients ?? null;

	if (!draft.patientId) {
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
	if (clinicMode !== "solo_doctor" && hasAssistant && !draft.assistantUserId) {
		missing.push("выберите ассистента");
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

/*
 * Вкладки настроек.
 *
 * Семь панелей были смонтированы в SettingsView под идентификаторы, которых в
 * этом списке не было: inventory, modules, insurance, reporting, marketing,
 * bpmn и messengers. Кнопки не рисовались (панель строится из этого массива),
 * setSettingsTab с такими значениями нигде не звался, а ручной переход по
 * адресу вида #settings/inventory откидывало на «Клинику»
 * (settingsTabFromHash пропускает только то, что здесь перечислено).
 *
 * То есть 2713 строк готовых экранов и рабочие маршруты сервера были
 * недоступны пользователю целиком. Рядом стояли фильтры вида
 * `if (!flags.hasInventoryModule) ... filter(t => t.id !== "inventory")` —
 * они отсеивали элемент, которого в списке нет, и работали вхолостую.
 *
 * Лишнего маленькая клиника по-прежнему не увидит: показ каждой новой вкладки
 * решает свой признак модуля в SettingsView, а не этот список.
 *
 * Вкладка мессенджеров переименована из «ТГ-бот»: за ней давно живут ещё
 * WhatsApp и MAX, но по названию об этом никто не догадывался.
 */
/*
 * Разделы левого списка настроек.
 *
 * Группа объявлена прямо у вкладки, а не отдельным списком в разметке. Так
 * было: SettingsView раскладывал вкладки по группам своими списками
 * идентификаторов вида `["clinic", "staff", "access"].includes(t.id)`. Любая
 * вкладка, не упомянутая ни в одном таком списке, просто исчезала из левого
 * меню — молча, потому что забыть дописать идентификатор в четвёртом по счёту
 * месте ничего не стоит. Именно так пропала кнопка настроек Telegram: раздел
 * работал и открывался по адресу, но нажать на него было негде.
 */
