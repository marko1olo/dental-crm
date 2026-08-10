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
import { PendingVisitSave, pendingVisitSaveQueueLocalKey, sortPendingVisitSaves, localQueueOrganizationMatches, sensitiveLocalDraftRetentionMs, sortPendingSpeechChunks, pendingVisitSaveStoreName, assertSpeechChunkDbStores } from "./CommonHelpers";
import { normalizedLocalOrganizationId } from "./AuthOnboardingHelpers";
import { dicomWorkbenchDraftStoreName, mprWorkbenchDraftStoreName } from "./ImagingHelpers";

export function speechGatewayCanUpload(
	status: SpeechGatewayStatus | null,
): boolean {
	return Boolean(
		status?.serverTranscriptionCurrentlyAvailable ??
			status?.serverTranscriptionEnabled,
	);
}

export const speechAudioQueueRetentionMs = 48 * 60 * 60 * 1000;

export type BrowserSpeechRecognition = {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onend: (() => void) | null;
	onerror: (() => void) | null;
	onresult:
		| ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void)
		| null;
	start: () => void;
};

export type BrowserWindowWithSpeech = Window &
	typeof globalThis & {
		SpeechRecognition?: new () => BrowserSpeechRecognition;
		webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
		webkitAudioContext?: typeof AudioContext;
	};

export type VisitNoteField =
	| "complaint"
	| "anamnesis"
	| "objectiveStatus"
	| "diagnosis"
	| "treatmentPlan";

export type VisitNoteForm = Record<VisitNoteField, string>;

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

export const speechQualityLabels: Record<
	SpeechTranscriptionResponse["chunk"]["quality"]["level"],
	string
> = {
	clear: "чисто",
	review: "проверить",
	empty: "пусто",
	failed: "сбой",
};

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

export type PendingSpeechChunk = SpeechChunkUploadInput & {
	version: 1;
	id: string;
	organizationId: string | null;
	queuedAt: string;
};

export const pendingSpeechChunkQueueKey = "dental-crm:pending-speech-chunks";

export const speechChunkDbName = "dental-crm-offline";

export const speechChunkDbVersion = 4;

export const speechChunkStoreName = "pendingSpeechChunks";

export const speechLocalStorageFallbackMaxBytes = 4_000_000;

export let speechChunkDbPromise: Promise<IDBDatabase> | null = null;

export function pendingSpeechChunkQueueLocalKey(
	organizationId: string | null | undefined = null,
): string {
	return organizationScopedLocalStorageKey(
		pendingSpeechChunkQueueKey,
		organizationId,
	);
}

export function normalizeSpeechAppendText(value: string): string {
	return value
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function appendSpeechTextWithoutDuplicateTail(
	current: string,
	next: string,
	dedupeWindowChars = 600,
): string {
	const cleanNext = next.trim();
	const cleanCurrent = current.trim();
	if (!cleanNext) return current;
	if (!cleanCurrent) return cleanNext;

	const currentTail = cleanCurrent.slice(-dedupeWindowChars);
	const normalizedCurrent = normalizeSpeechAppendText(currentTail);
	const normalizedNext = normalizeSpeechAppendText(cleanNext);
	if (!normalizedNext) return current;
	if (
		normalizedCurrent.endsWith(normalizedNext) ||
		normalizedCurrent.includes(normalizedNext)
	)
		return current;

	const currentWords = (normalizedCurrent ?? "").split(" ").filter(Boolean);
	const nextWords = (normalizedNext ?? "").split(" ").filter(Boolean);
	const originalNextWords = (cleanNext ?? "").split(/\s+/).filter(Boolean);
	const maxOverlap = Math.min(
		14,
		currentWords.length,
		nextWords.length,
		originalNextWords.length,
	);
	for (let size = maxOverlap; size >= 3; size -= 1) {
		const currentSuffix = currentWords.slice(-size).join(" ");
		const nextPrefix = nextWords.slice(0, size).join(" ");
		if (currentSuffix === nextPrefix) {
			const remainingNext = originalNextWords.slice(size).join(" ").trim();
			return remainingNext ? `${cleanCurrent}\n${remainingNext}` : cleanCurrent;
		}
	}

	return `${cleanCurrent}\n${cleanNext}`;
}

export function savePendingVisitSavesToLocalStorage(
	queue: PendingVisitSave[],
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	const localKey = pendingVisitSaveQueueLocalKey(organizationId);
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const scopedQueue = sortPendingVisitSaves(
		queue
			.map((item) => ({
				...item,
				organizationId:
					normalizedLocalOrganizationId(item.organizationId) ??
					normalizedOrganizationId,
			}))
			.filter(
				(item) =>
					localQueueOrganizationMatches(
						item.organizationId,
						normalizedOrganizationId,
					) && localSavedAtFresh(item.queuedAt, sensitiveLocalDraftRetentionMs),
			),
	);
	if (!scopedQueue.length) {
		safeLocalStorageRemoveItem(localKey);
		return;
	}
	safeLocalStorageSetItem(localKey, JSON.stringify(scopedQueue));
}

export function savePendingSpeechChunksToLocalStorage(
	queue: PendingSpeechChunk[],
	organizationId: string | null | undefined = null,
): void {
	if (typeof window === "undefined") return;
	const normalizedOrganizationId =
		normalizedLocalOrganizationId(organizationId);
	const localKey = pendingSpeechChunkQueueLocalKey(normalizedOrganizationId);
	const scopedQueue = sortPendingSpeechChunks(
		queue
			.map((item) => ({
				...item,
				organizationId:
					normalizedLocalOrganizationId(item.organizationId) ??
					normalizedOrganizationId,
			}))
			.filter(
				(item) =>
					localQueueOrganizationMatches(
						item.organizationId,
						normalizedOrganizationId,
					) && localSavedAtFresh(item.queuedAt, speechAudioQueueRetentionMs),
			),
	);
	if (!scopedQueue.length) {
		safeLocalStorageRemoveItem(localKey);
		return;
	}
	const payload = JSON.stringify(scopedQueue);
	if (payload.length > speechLocalStorageFallbackMaxBytes) {
		throw new Error(
			"Память для аудио на этом устройстве переполнена; освободите место или отправьте текущую запись.",
		);
	}
	safeLocalStorageSetItem(localKey, payload);
}

export function speechChunkIndexedDbAvailable(): boolean {
	return typeof window !== "undefined" && "indexedDB" in window;
}

export function openSpeechChunkDb(): Promise<IDBDatabase> {
	if (!speechChunkIndexedDbAvailable())
		return Promise.reject(
			new Error("Браузер не дает сохранить аудио для отправки позже"),
		);
	if (speechChunkDbPromise) return speechChunkDbPromise;
	speechChunkDbPromise = new Promise((resolve, reject) => {
		const request = window.indexedDB.open(
			speechChunkDbName,
			speechChunkDbVersion,
		);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(pendingVisitSaveStoreName)) {
				const store = db.createObjectStore(pendingVisitSaveStoreName, {
					keyPath: "id",
				});
				store.createIndex("queuedAt", "queuedAt");
				store.createIndex("organizationId", "organizationId");
				store.createIndex("visitId", "visitId");
			}
			if (!db.objectStoreNames.contains(dicomWorkbenchDraftStoreName)) {
				const store = db.createObjectStore(dicomWorkbenchDraftStoreName, {
					keyPath: "storageKey",
				});
				store.createIndex("organizationId", "organizationId");
				store.createIndex("seriesKey", "seriesKey");
				store.createIndex("clientSavedAt", "clientSavedAt");
			}
			if (!db.objectStoreNames.contains(mprWorkbenchDraftStoreName)) {
				const store = db.createObjectStore(mprWorkbenchDraftStoreName, {
					keyPath: "storageKey",
				});
				store.createIndex("organizationId", "organizationId");
				store.createIndex("seriesKey", "seriesKey");
				store.createIndex("clientSavedAt", "clientSavedAt");
			}
			if (!db.objectStoreNames.contains(speechChunkStoreName)) {
				const store = db.createObjectStore(speechChunkStoreName, {
					keyPath: "id",
				});
				store.createIndex("queuedAt", "queuedAt");
			}
		};
		request.onsuccess = () => {
			const db = request.result;
			// БЫЛО: при смене версии соединение закрывалось, но КЭШ промиса оставался
			// указывать на закрытый дескриптор. Сценарий: открыта вторая вкладка после
			// обновления версии хранилища — первая закрывала своё соединение, а все
			// последующие db.transaction(...) бросали InvalidStateError. Сохранение
			// приёма падало на запасной путь в localStorage, который к тому моменту
			// уже очищен, и очередь неотправленных записей приёма перезаписывалась
			// пустой — при том, что интерфейс сообщал «сохранено локально».
			// Сбрасываем кэш, чтобы следующий вызов открыл соединение заново.
			db.onversionchange = () => {
				speechChunkDbPromise = null;
				db.close();
			};
			db.onclose = () => {
				speechChunkDbPromise = null;
			};
			try {
				assertSpeechChunkDbStores(db);
				resolve(db);
			} catch (error) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(error as { status?: number })?.status ?? null,
					),
					"error",
				);
				db.close();
				speechChunkDbPromise = null;
				reject(
					error instanceof Error
						? error
						: new Error("Offline IndexedDB schema is incomplete"),
				);
			}
		};
		request.onerror = () => {
			speechChunkDbPromise = null;
			reject(request.error ?? new Error("Хранилище аудио не открылось"));
		};
		request.onblocked = () => {
			speechChunkDbPromise = null;
			reject(new Error("Хранилище аудио заблокировано другой вкладкой"));
		};
	});
	return speechChunkDbPromise;
}

export function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () =>
			reject(new Error("Аудиофрагмент не удалось прочитать"));
		reader.onload = () => {
			const result = typeof reader.result === "string" ? reader.result : "";
			resolve(result.split(",")[1] ?? "");
		};
		reader.readAsDataURL(blob);
	});
}

export function buildOfflineVisitDraftFromTranscript(
	transcript: string,
	specialty: DentalSpecialty,
): VisitNoteDraft {
	return buildRuleBasedVisitDraftFromTranscript(transcript, specialty, {
		sourceLabel: "Локальный разбор диктовки",
	});
}

export const speechProviderConnectorLabels: Record<
	SpeechProviderConnector,
	string
> = {
	client_only: "браузер",
	server_wired: "сервер",
	server_cataloged: "каталог",
	local_bridge: "локальный модуль",
	local_planned: "локально",
};

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
