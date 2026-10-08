/**
 * @file statePersistence.ts
 * @description Layer 4: State snapshots, persistence flush, and reset to demo/zero.
 */
import { registerLiveDomainState } from "./domainState.js";
import { doctorUserId, activeVisitId, marinaPatientId, organizationId } from "./fixtureIds.js";


import type {
	ClinicMode,
	ClinicProfile,
	ClinicSettings,
	ClinicWorkspaceProfile,
	DenteTelegramVisualCardUrls,
	IntegrationPreset,
	PostVisitCareTopic,
	StaffMember,
	StaffRole,
	UiPreferences,
} from "@dental/shared";
import {
	type DentalMutableState,
	loadPersistentState,
	savePersistentState,
} from "../persistentState.js";
import type { DomainState } from "../types/domainState.js";
import {
	denteTelegramBotSettings,
	denteTelegramChatLinks,
	denteTelegramLinkCodes,
	denteTelegramOutboxDeliveryReceipts,
	denteTelegramWebhookEvents,
	normalizeDenteTelegramBotScopedLedgers,
	normalizeExistingDenteTelegramVisualCardUrls,
	normalizeReviewRequestDelayHours,
	syncDenteTelegramOutboxDeliveryReceiptsMap,
} from "../services/telegram/telegramLegacyMemoryStore.js";

import { chairs, clinicProfile, defaultClinicScheduleDefaults, normalizeClinicScheduleDefaults } from "./organizations.js";
import { normalizeStaffWorkingHours } from "./staff.js";
import { uiPreferencesSchema } from "@dental/shared";
import { serviceCatalog } from "./priceList.js";
import { staffMembers } from "./staff.js";
import { normalizePatientAdministrativeProfiles, patients } from "./patients.js";
import { appointments } from "./appointments.js";
import {
	activeVisit,
	protocolTemplates,
	treatmentPlanItems,
	treatmentPlanScenarios,
} from "./clinicalRecords.js";
import { documents } from "./documents.js";
import { visitDraftAutosaves, visitSaveReceipts } from "./visitDrafts.js";
import { clinicalRules } from "./clinicalRules.js";
import { payments } from "./billing.js";
import {
	communicationEvents,
	communicationTasks,
	communicationTemplates,
} from "./communications.js";
import {
	dicomWorkbenchBundles,
	imagingStudies,
	imagingViewerSessions,
	sanitizeDicomWorkbenchBundleForServerStorage,
} from "./imaging.js";
import {
	aiRecognitionJobs,
	speechTranscriptionChunks,
} from "./speechRecognition.js";
import { speechProviders } from "./speechProviders.js";
import { auditEvents, importBatches } from "./audit.js";
import { integrationPresets, modeHints, workspaceProfiles } from "./integrationPresets.js";
import { replaceCollection } from "./types.js";

import { registerPersistenceFlushHandler, persistMutableState } from "./stateNotifier.js";

const concreteDomainState: DomainState = {
	get clinicProfile() {
		return clinicProfile;
	},
	staffMembers,
	chairs,
	patients,
	appointments,
	get activeVisit() {
		return activeVisit;
	},
	documents,
	serviceCatalog,
	treatmentPlanItems,
	treatmentPlanScenarios,
	clinicalRules,
	payments,
	communicationTemplates,
	communicationTasks,
	communicationEvents,
	imagingStudies,
	aiRecognitionJobs,
	importBatches,
	get protocolTemplates() {
		return protocolTemplates;
	},
	auditEvents,
	unavailableSlices: [],
};

registerLiveDomainState(concreteDomainState);

let uiPreferences: UiPreferences | null = null;

export function getUiPreferencesInternal(): UiPreferences | null {
	return uiPreferences;
}

export function setUiPreferencesInternal(val: UiPreferences | null): void {
	uiPreferences = val;
}

function mutableStateSnapshot(): DentalMutableState {
	return {
		clinicProfile,
		staffMembers,
		chairs,
		appointments,
		patients,
		documents,
		clinicalRules,
		payments,
		communicationTasks,
		communicationEvents,
		imagingStudies,
		imagingViewerSessions,
		dicomWorkbenchBundles,
		importBatches,
		auditEvents,
		aiRecognitionJobs,
		speechTranscriptionChunks,
		visitDraftAutosaves,
		visitSaveReceipts,
		denteTelegramBotSettings,
		denteTelegramLinkCodes,
		denteTelegramChatLinks,
		denteTelegramWebhookEvents,
		denteTelegramOutboxDeliveryReceipts,
		uiPreferences,
		activeVisit,
	};
}

/**
 * Сохранение снимка состояния: одна запись на пачку изменений, а не на каждое.
 *
 * БЫЛО. persistMutableState() из 31 места вызывал savePersistentState()
 * синхронно, прямо в обработчике запроса. Одна такая запись — это два полных
 * JSON.stringify всего состояния (первый ради контрольной суммы, второй ради
 * файла), копия предыдущего файла в каталог резервных копий, чтение этого
 * каталога, удаление устаревших копий, запись и переименование. Замерено на
 * этом репозитории (медиана из 10 прогонов, повтор алгоритма
 * persistentState.ts:242 в каталог вне репозитория):
 *   • 3 пациента, файл 236 648 Б      → 4,61 мс на один вызов;
 *   • 10 000 пациентов, 5 803 929 Б   → 49,54 мс на один вызов и 11,6 МБ
 *     дискового ввода-вывода (сам файл плюс его резервная копия).
 * Один вебхук Telegram или одно сохранение приёма дают три-пять таких вызовов
 * подряд, и каждый блокировал цикл событий до ответа клиенту.
 *
 * СТАЛО. Вызов помечает состояние изменённым и заводит один таймер. Все
 * вызовы, пришедшие до его срабатывания, сливаются в одну запись, и запись
 * происходит уже после ответа клиенту. Окно фиксированное, а не продлеваемое
 * при каждом изменении: устаревание снимка ограничено сверху окном при любой
 * нагрузке, тогда как продлеваемое окно при непрерывном потоке изменений не
 * записало бы файл вообще никогда.
 *
 * Окно по умолчанию — 250 мс, то есть пятикратная стоимость одной записи на
 * клинике в 10 000 пациентов по замеру выше: даже при непрерывных изменениях
 * на сохранение состояния уходит не больше пятой части времени цикла
 * событий. Переопределяется DENTAL_STATE_FLUSH_DELAY_MS, значение 0
 * возвращает синхронную запись на каждое изменение.
 */
const defaultStateFlushDelayMs = 250;

function stateFlushDelayMs(): number {
	const raw = process.env.DENTAL_STATE_FLUSH_DELAY_MS?.trim();
	if (!raw) return defaultStateFlushDelayMs;
	const parsed = Number(raw);
	// Мусор в переменной окружения не должен молча превращаться в ноль: это
	// вернуло бы синхронную запись на каждое действие, и никто бы не заметил.
	if (!Number.isFinite(parsed) || parsed < 0) return defaultStateFlushDelayMs;
	return Math.floor(parsed);
}

let pendingStateFlushTimer: NodeJS.Timeout | null = null;
let mutableStateDirty = false;

/**
 * Немедленно записать отложенный снимок, если он есть.
 *
 * Нужен на завершении процесса: gracefulShutdown в server.ts:531 доходит до
 * process.exit(0), поэтому обработчик exit ниже дописывает последние
 * изменения, и корректная остановка сервера ничего не теряет.
 */
export function flushPersistentStateNow(): void {
	if (pendingStateFlushTimer) {
		clearTimeout(pendingStateFlushTimer);
		pendingStateFlushTimer = null;
	}
	if (!mutableStateDirty) return;
	mutableStateDirty = false;
	savePersistentState(mutableStateSnapshot());
}


function persistMutableStateSchedule(): void {
	mutableStateDirty = true;
	const delayMs = stateFlushDelayMs();
	if (delayMs === 0) {
		flushPersistentStateNow();
		return;
	}
	if (pendingStateFlushTimer) return;
	pendingStateFlushTimer = setTimeout(() => {
		pendingStateFlushTimer = null;
		if (mutableStateDirty) {
			mutableStateDirty = false;
			savePersistentState(mutableStateSnapshot());
		}
	}, delayMs);
	pendingStateFlushTimer.unref();
}

registerPersistenceFlushHandler(persistMutableStateSchedule);

function normalizeMutableScheduleState(): void {
	clinicProfile.scheduleDefaults = normalizeClinicScheduleDefaults(
		clinicProfile.scheduleDefaults,
	);
	staffMembers.forEach((member) => {
		member.workingHours = normalizeStaffWorkingHours(
			member.workingHours ?? null,
		);
	});
	chairs.forEach((chair) => {
		chair.workingHours = normalizeStaffWorkingHours(chair.workingHours ?? null);
	});
	if (uiPreferences) {
		uiPreferences = uiPreferencesSchema.parse({
			...uiPreferences,
			savedAt: uiPreferences.savedAt || new Date().toISOString(),
		});
	}
}


export { normalizeMutableScheduleState };


process.on("exit", flushPersistentStateNow);

const defaultPostVisitCheckupDelayHoursByTopic: DenteTelegramBotSettings["postVisitCheckupDelayHoursByTopic"] =
	{
		extraction: 24,
		implantation: 24,
		filling_restoration: 48,
		endo: 48,
		surgery: 24,
		local_anesthesia: 24,
		hygiene: 72,
		prosthetics: 48,
		orthodontics: 72,
		periodontology: 72,
		other: 48,
		surgery_aftercare: 24,
		fixation_aftercare: 48,
	};

function normalizePostVisitCheckupDelayHoursByTopic(
	input: unknown,
): DenteTelegramBotSettings["postVisitCheckupDelayHoursByTopic"] {
	const source =
		input && typeof input === "object" && !Array.isArray(input)
			? (input as Partial<
					Record<keyof typeof defaultPostVisitCheckupDelayHoursByTopic, unknown>
				>)
			: {};
	const normalized = { ...defaultPostVisitCheckupDelayHoursByTopic };
	for (const key of Object.keys(
		defaultPostVisitCheckupDelayHoursByTopic,
	) as Array<keyof typeof defaultPostVisitCheckupDelayHoursByTopic>) {
		const value =
			typeof source[key] === "number"
				? source[key]
				: typeof source[key] === "string"
					? Number.parseInt(source[key], 10)
					: NaN;
		if (Number.isFinite(value)) {
			normalized[key] = Math.max(1, Math.min(720, Math.floor(value)));
		}
	}
	return normalized;
}

const originalDemoData = JSON.parse(JSON.stringify(mutableStateSnapshot()));

function _resetToDemo(): void {
	replaceCollection(patients, originalDemoData.patients);
	replaceCollection(appointments, originalDemoData.appointments);
	replaceCollection(payments, originalDemoData.payments);
	replaceCollection(documents, originalDemoData.documents);
	replaceCollection(clinicalRules, originalDemoData.clinicalRules);
	replaceCollection(imagingStudies, originalDemoData.imagingStudies);
	replaceCollection(importBatches, originalDemoData.importBatches);
	replaceCollection(aiRecognitionJobs, originalDemoData.aiRecognitionJobs);
	replaceCollection(
		imagingViewerSessions,
		originalDemoData.imagingViewerSessions,
	);
	replaceCollection(
		dicomWorkbenchBundles,
		originalDemoData.dicomWorkbenchBundles,
	);
	replaceCollection(
		speechTranscriptionChunks,
		originalDemoData.speechTranscriptionChunks,
	);
	replaceCollection(visitSaveReceipts, originalDemoData.visitSaveReceipts);
	replaceCollection(visitDraftAutosaves, originalDemoData.visitDraftAutosaves);
	replaceCollection(communicationTasks, originalDemoData.communicationTasks);
	replaceCollection(communicationEvents, originalDemoData.communicationEvents);
	replaceCollection(chairs, originalDemoData.chairs);
	replaceCollection(staffMembers, originalDemoData.staffMembers);
	replaceCollection(
		denteTelegramLinkCodes,
		originalDemoData.denteTelegramLinkCodes,
	);
	replaceCollection(
		denteTelegramChatLinks,
		originalDemoData.denteTelegramChatLinks,
	);
	replaceCollection(
		denteTelegramWebhookEvents,
		originalDemoData.denteTelegramWebhookEvents,
	);
	replaceCollection(
		denteTelegramOutboxDeliveryReceipts,
		originalDemoData.denteTelegramOutboxDeliveryReceipts,
	);
	syncDenteTelegramOutboxDeliveryReceiptsMap();
	Object.assign(clinicProfile, originalDemoData.clinicProfile);
	Object.assign(activeVisit, originalDemoData.activeVisit);
	Object.assign(
		denteTelegramBotSettings,
		originalDemoData.denteTelegramBotSettings,
	);
	persistMutableState();
}

function _resetToZeroMode(role: StaffRole): void {
	patients.length = 0;
	appointments.length = 0;
	payments.length = 0;
	documents.length = 0;
	clinicalRules.length = 0;
	imagingStudies.length = 0;
	importBatches.length = 0;
	aiRecognitionJobs.length = 0;
	imagingViewerSessions.length = 0;
	dicomWorkbenchBundles.length = 0;
	speechTranscriptionChunks.length = 0;
	visitSaveReceipts.length = 0;
	visitDraftAutosaves.length = 0;
	communicationTasks.length = 0;
	communicationEvents.length = 0;
	chairs.length = 0;
	denteTelegramLinkCodes.length = 0;
	denteTelegramChatLinks.length = 0;
	denteTelegramWebhookEvents.length = 0;
	denteTelegramOutboxDeliveryReceipts.length = 0;
	syncDenteTelegramOutboxDeliveryReceiptsMap();

	Object.assign(clinicProfile, {
		organizationId,
		clinicName: "",
		legalName: null,
		inn: null,
		kpp: null,
		ogrn: null,
		address: null,
		phone: null,
		email: null,
		website: null,
		medicalLicenseNumber: null,
		medicalLicenseIssuedAt: null,
		medicalLicenseIssuer: null,
		bankDetails: null,
		signatoryName: null,
		signatoryTitle: null,
		mode: "solo_doctor",
		timezone: "Europe/Moscow",
		defaultVisitMinutes: 45,
		scheduleDefaults: defaultClinicScheduleDefaults,
		networkEnabled: false,
		egiszEnabled: false,
		updatedAt: new Date().toISOString(),
	});

	staffMembers.length = 0;
	const defaultMember: StaffMember = {
		id: doctorUserId,
		organizationId,
		fullName: role === "doctor" ? "Врач-Организатор" : "Администратор",
		role: role,
		specialties: role === "doctor" ? ["therapist"] : [],
		phone: "+79999999999",
		email: "clinic@example.com",
		active: true,
		canSignMedicalRecords: true,
		canManageMoney:
			role === "owner" || role === "manager" || role === "administrator",
		canManageImports:
			role === "owner" || role === "manager" || role === "administrator",
		color: "#0f766e",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
	staffMembers.push(defaultMember);

	Object.assign(activeVisit, {
		id: activeVisitId,
		organizationId,
		patientId: marinaPatientId,
		appointmentId: null,
		doctorId: doctorUserId,
		chairId: null,
		status: "draft",
		diagnoses: [],
		complaints: "",
		anamnesis: "",
		objectiveStatus: "",
		treatmentDone: "",
		toothCardState: "{}",
		protocolText: "",
		revision: 1,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	});

	persistMutableState();
}

function applyPersistentState(): void {
	const state = loadPersistentState();
	if (!state) return;

	if (state.clinicProfile) {
		Object.assign(clinicProfile, state.clinicProfile);
	}
	replaceCollection(staffMembers, state.staffMembers);
	replaceCollection(chairs, state.chairs);
	replaceCollection(appointments, state.appointments);
	replaceCollection(patients, state.patients);
	normalizePatientAdministrativeProfiles();
	replaceCollection(documents, state.documents);
	replaceCollection(clinicalRules, state.clinicalRules);
	replaceCollection(payments, state.payments);
	replaceCollection(communicationTasks, state.communicationTasks);
	replaceCollection(communicationEvents, state.communicationEvents);
	replaceCollection(imagingStudies, state.imagingStudies);
	replaceCollection(imagingViewerSessions, state.imagingViewerSessions);
	replaceCollection(
		dicomWorkbenchBundles,
		state.dicomWorkbenchBundles?.map(
			sanitizeDicomWorkbenchBundleForServerStorage,
		),
	);
	replaceCollection(importBatches, state.importBatches);
	replaceCollection(auditEvents, state.auditEvents);
	replaceCollection(aiRecognitionJobs, state.aiRecognitionJobs);
	replaceCollection(speechTranscriptionChunks, state.speechTranscriptionChunks);
	replaceCollection(visitDraftAutosaves, state.visitDraftAutosaves);
	replaceCollection(visitSaveReceipts, state.visitSaveReceipts);
	if (state.denteTelegramBotSettings) {
		Object.assign(denteTelegramBotSettings, state.denteTelegramBotSettings);
		denteTelegramBotSettings.visualCardUrls =
			normalizeExistingDenteTelegramVisualCardUrls(
				denteTelegramBotSettings.visualCardUrls,
			);
		if (!denteTelegramBotSettings.appointmentReminderLeadTimesHours?.length) {
			denteTelegramBotSettings.appointmentReminderLeadTimesHours = [24];
		}
		denteTelegramBotSettings.reviewRequestDelayHours =
			normalizeReviewRequestDelayHours(
				denteTelegramBotSettings.reviewRequestDelayHours,
			);
		denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic =
			normalizePostVisitCheckupDelayHoursByTopic(
				denteTelegramBotSettings.postVisitCheckupDelayHoursByTopic,
			);
	}
	replaceCollection(denteTelegramLinkCodes, state.denteTelegramLinkCodes);
	replaceCollection(denteTelegramChatLinks, state.denteTelegramChatLinks);
	normalizeDenteTelegramBotScopedLedgers();
	replaceCollection(
		denteTelegramWebhookEvents,
		state.denteTelegramWebhookEvents,
	);
	replaceCollection(
		denteTelegramOutboxDeliveryReceipts,
		state.denteTelegramOutboxDeliveryReceipts,
	);
	syncDenteTelegramOutboxDeliveryReceiptsMap();
	uiPreferences = state.uiPreferences ?? null;
	if (state.activeVisit) {
		Object.assign(activeVisit, state.activeVisit);
		activeVisit.revision = activeVisit.revision ?? 1;
	}
	normalizeMutableScheduleState();
}


export { applyPersistentState };
