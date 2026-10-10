/**
 * @file dashboard.ts
 * @description Layer 3: Clinic settings builder, UI preferences, and dashboard summary views.
 */
import { integrationPresets, workspaceProfiles, modeHints } from "./integrationPresets.js";
import { roleAccessPolicies } from "./staff.js";
import { protocolTemplates, treatmentPlanScenarios } from "./clinicalRecords.js";
import { serviceCatalog } from "./priceList.js";
import { communicationTemplates, communicationEvents } from "./communications.js";
import { importBatches, auditEvents } from "./audit.js";
import { clinicTodayIso } from "./scheduleTimeHelpers.js";
import { visitCloseChecklistFactsFor, buildBillingSummary } from "./billing.js";
import { buildVisitCloseChecklist } from "../visitCloseChecklist.js";
import { speechProviders } from "./speechProviders.js";
import { inMemoryDomainState } from "./domainState.js";
import { repairMojibakeDeep, repairMojibakeText } from "../text/repairMojibake.js";


import type {
	ClinicMode,
	ClinicProfile,
	ClinicSettings,
	Dashboard,
	DocumentChainSummary,
	GeneratedDocument,
	StaffRole,
	UiPreferences,
	UiPreferencesInput,
} from "@dental/shared";
import { uiPreferencesSchema } from "@dental/shared";
import type { DomainState } from "../types/domainState.js";
import { chairs, clinicProfile, defaultClinicScheduleDefaults } from "./organizations.js";
import { staffMembers } from "./staff.js";
import { patients, buildPatientInsights } from "./patients.js";
import { appointments } from "./appointments.js";
import { activeVisit, treatmentPlanItems, NIL_VISIT_UUID } from "./clinicalRecords.js";
import { documents } from "./documents.js";
import { payments } from "./billing.js";
import { clinicalRules, buildClinicalRuleEvaluations, buildClinicalRuleSummary } from "./clinicalRules.js";
import { communicationTasks, buildCommunicationSummary } from "./communications.js";
import { imagingStudies } from "./imaging.js";
import { buildAppointmentReadiness, buildRoleQueues, buildShiftIntelligence } from "./scheduleIntelligence.js";
import { buildRecommendedActions, buildScheduleSuggestions } from "./scheduleSuggestions.js";
import { getUiPreferencesInternal, setUiPreferencesInternal } from "./statePersistence.js";
import { persistMutableState } from "./stateNotifier.js";

export function getUiPreferences(): UiPreferences | null {
	return getUiPreferencesInternal();
}

export function saveUiPreferences(input: UiPreferencesInput): UiPreferences {
	const parsed = uiPreferencesSchema.parse(input);
	const next: UiPreferences = {
		...(getUiPreferencesInternal() ?? {}),
		...parsed,
	};
	setUiPreferencesInternal(next);
	persistMutableState();
	return next;
}

export function buildClinicSettings(
	state: DomainState = inMemoryDomainState,
): ClinicSettings {
	const { clinicProfile, staffMembers, chairs } = state;
	const activeDoctors = staffMembers.filter(
		(s) => s.active && (s.role === "doctor" || (s.role as string) === "universal"),
	);
	const activeChairs = chairs.filter((c) => c.active);
	const isSoloDoctor =
		clinicProfile.mode === "solo_doctor" ||
		clinicProfile.mode === "one_chair" ||
		activeChairs.length <= 1 ||
		activeDoctors.length <= 1;

	const adjustedStaff = staffMembers.map((s) => {
		if (isSoloDoctor && s.role === "doctor") {
			return {
				...s,
				canSignMedicalRecords: true,
				canManageMoney: true,
				canManageImports: true,
			};
		}
		return s;
	});

	return {
		profile: repairMojibakeDeep(clinicProfile),
		staff: repairMojibakeDeep(adjustedStaff),
		chairs: repairMojibakeDeep(chairs),
		integrationPresets: repairMojibakeDeep(integrationPresets),
		workspaceProfiles: repairMojibakeDeep(workspaceProfiles),
		roleAccessPolicies: repairMojibakeDeep(roleAccessPolicies),
		modeHints: repairMojibakeDeep(modeHints[clinicProfile.mode]),
		soloDoctorMode: isSoloDoctor,
	};
}


function buildDocumentChainSummary(
	document: GeneratedDocument,
): DocumentChainSummary | null {
	const paidContract = document.payload?.paidMedicalServicesContract;
	if (paidContract) {
		return {
			paidMedicalServicesContract: {
				contractNumber: paidContract.contractNumber,
				contractDate: paidContract.contractDate,
			},
		};
	}

	const copyRequest = document.payload?.medicalRecordCopyRequest;
	if (copyRequest) {
		return {
			medicalRecordCopyRequest: {
				requestedDocumentTypes: copyRequest.requestedDocumentTypes,
				periodStart: copyRequest.periodStart ?? null,
				periodEnd: copyRequest.periodEnd ?? null,
				requestedFormat: copyRequest.requestedFormat,
				recipientFullName: copyRequest.recipientFullName,
				recipientIdentityDocument: copyRequest.recipientIdentityDocument,
				recipientAuthority: copyRequest.recipientAuthority,
				representativeAuthorityDocument:
					copyRequest.representativeAuthorityDocument ?? null,
			},
		};
	}

	return null;
}

function buildDashboardDocuments(state: DomainState = inMemoryDomainState) {
	return state.documents.map((document) => ({
		...document,
		chainSummary: buildDocumentChainSummary(document),
	}));
}

export function buildDashboard(
	state: DomainState = inMemoryDomainState,
): Dashboard {
	const {
		clinicProfile,
		patients,
		appointments,
		activeVisit,
		imagingStudies,
		protocolTemplates,
		serviceCatalog,
		treatmentPlanItems,
		treatmentPlanScenarios,
		clinicalRules,
		payments,
		communicationTemplates,
		communicationTasks,
		communicationEvents,
		importBatches,
		auditEvents,
	} = state;
	const patientInsights = buildPatientInsights(state);
	const appointmentReadiness = buildAppointmentReadiness(
		patientInsights,
		state,
	);

	return {
		clinicName: repairMojibakeText(clinicProfile.clinicName),
		// БЫЛО: "2026-05-12" — жёстко зашитая дата. Вкладка «Смена» всегда
		// показывала приёмы за 12 мая 2026 года, а реальный день был пуст.
		todayIso: clinicTodayIso(clinicProfile.timezone),
		clinicSettings: buildClinicSettings(state),
		shiftIntelligence: repairMojibakeDeep(buildShiftIntelligence(state)),
		patients: repairMojibakeDeep(patients),
		patientInsights: repairMojibakeDeep(patientInsights),
		recommendedActions: repairMojibakeDeep(
			buildRecommendedActions(patientInsights, state),
		),
		appointments: repairMojibakeDeep(appointments),
		appointmentReadiness: repairMojibakeDeep(appointmentReadiness),
		scheduleSuggestions: repairMojibakeDeep(
			buildScheduleSuggestions(appointmentReadiness, state),
		),
		/*
		 * ОТКРЫТОГО ПРИЁМА НЕТ — ТАК И СКАЗАНО, `null`, А НЕ НУЛЕВОЙ УУИД.
		 *
		 * `activeVisit` — общий на процесс объект, и гидратация базы кладёт в него
		 * заготовку с `id = NIL_VISIT_UUID`, когда у клиники нет ни одного приёма
		 * (`db/domainStateHydration.ts`, noVisitSkeleton). До этой строки заготовка
		 * уходила в ответ как есть, и главный экран называл администратору
		 * идентификатор приёма, строки которого в базе нет ни одной — замерено на
		 * четырёх клиниках с нулём визитов.
		 *
		 * Нулевой ууид — НЕПУСТАЯ строка, то есть правдивая в булевом смысле, и
		 * клиентские сторожа вида `if (!dashboard?.activeVisit?.id) return;` её
		 * пропускали. Цена записана рядом с каждой заплаткой на клиенте: касса
		 * отвечала «Прием для оплаты не найден» на нажатие «Принять оплату», а лента
		 * снимков была пуста ВСЕГДА, пока приём не начат.
		 *
		 * Почему `null`, а не отсутствие поля: `null` — это утверждение «открытого
		 * приёма нет», а отсутствие поля — молчание, которое не отличить от «сервер
		 * не считал». Поле остаётся обязательным (`visitSchema.nullable()`).
		 *
		 * Охраняется `tests/routes/dashboardActiveVisitIsNotFabricated.test.ts`.
		 * Остальные поля сводки ниже по-прежнему считаются от общего объекта: они
		 * читают пациента заготовки и дают пустые наборы, это прежнее поведение и
		 * оно правильное.
		 */
		activeVisit:
			activeVisit.id === NIL_VISIT_UUID
				? null
				: repairMojibakeDeep(activeVisit),
		visitCloseChecklist: repairMojibakeDeep(
			buildVisitCloseChecklist(visitCloseChecklistFactsFor(activeVisit, state)),
		),
		documents: repairMojibakeDeep(buildDashboardDocuments(state)),
		imagingStudies: repairMojibakeDeep(imagingStudies),
		protocolTemplates: repairMojibakeDeep(protocolTemplates),
		serviceCatalog: repairMojibakeDeep(serviceCatalog),
		treatmentPlanItems: repairMojibakeDeep(treatmentPlanItems),
		treatmentPlanScenarios: repairMojibakeDeep(treatmentPlanScenarios),
		clinicalRules: repairMojibakeDeep(clinicalRules),
		clinicalRuleEvaluations: repairMojibakeDeep(
			buildClinicalRuleEvaluations(activeVisit.patientId, state),
		),
		clinicalRuleSummary: repairMojibakeDeep(
			buildClinicalRuleSummary(activeVisit.patientId, state),
		),
		payments: repairMojibakeDeep(payments),
		billingSummary: repairMojibakeDeep(buildBillingSummary(state)),
		communicationTemplates: repairMojibakeDeep(communicationTemplates),
		communicationTasks: repairMojibakeDeep(communicationTasks),
		communicationEvents: repairMojibakeDeep(communicationEvents.slice(0, 20)),
		communicationSummary: repairMojibakeDeep(buildCommunicationSummary(state)),
		importBatches: repairMojibakeDeep(importBatches),
		speechProviders: repairMojibakeDeep(speechProviders),
		auditEvents: repairMojibakeDeep(auditEvents.slice(0, 12)),
		complianceWarnings: repairMojibakeDeep([
			"AI-ответы являются черновиками и требуют подтверждения врача.",
			"Медицинские данные требуют 152-ФЗ, врачебной тайны и аудита доступа.",
			"Для продажи клиникам нужен отдельный EGISZ-адаптер и юридическая проверка шаблонов.",
		]),
	};
}

