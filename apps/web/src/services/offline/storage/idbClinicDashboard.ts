import type { Chair, ClinicMode, Dashboard, StaffMember } from "@dental/shared";
import { DEMO_CHIEF_DOCTOR } from "../../../components/auth/staffUnlockState";
import {
	DEMO_CHAIR_1_ID,
	DEMO_CHAIR_2_ID,
	DEMO_SHOWCASE_ORG_ID,
	getDemoShowcaseAppointments,
	getDemoShowcasePatients,
	getDemoShowcaseStaff,
	isDemoShowcaseMode,
} from "../../../lib/demoMode";
import {
	safeLocalStorageGetItem,
	safeLocalStorageGetJson,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
	safeLocalStorageSetJson,
} from "./idbLocalStorageFallback";

// ============================================================================
// CLINIC PROFILE, STAFF & DASHBOARD CACHING LAYER (MANDATES 8e, 8n, 8s)
// Single Source of Truth for unified offline caching across all subsystems
// ============================================================================
import {
	DENTE_CACHED_ACTIVE_STAFF_USER_KEY,
	DENTE_CACHED_CLINIC_PROFILE_KEY,
	DENTE_CACHED_DASHBOARD_KEY,
	DENTE_CACHED_STAFF_LIST_KEY,
	DENTE_OFFLINE_AUTONOMY_MODE_KEY,
} from "./constants";

/**
 * Кэширует полный снимок Dashboard, профиль клиники и список сотрудников при успешном ответе API.
 */
export function cacheClinicDashboard(dashboard: Dashboard | null | undefined): void {
	if (!dashboard || typeof dashboard !== "object") return;
	try {
		safeLocalStorageSetJson(DENTE_CACHED_DASHBOARD_KEY, dashboard, true);

		if (dashboard.clinicSettings?.profile) {
			safeLocalStorageSetJson(
				DENTE_CACHED_CLINIC_PROFILE_KEY,
				dashboard.clinicSettings.profile,
				true,
			);
		}

		if (Array.isArray(dashboard.clinicSettings?.staff)) {
			safeLocalStorageSetJson(
				DENTE_CACHED_STAFF_LIST_KEY,
				dashboard.clinicSettings.staff,
				true,
			);
		}
	} catch {
		// Ограничение хранилища не должно ронять приложение
	}
}

/**
 * Читает закэшированный снимок Dashboard для автономной работы.
 */
export function getCachedClinicDashboard(): Dashboard | null {
	return safeLocalStorageGetJson<Dashboard | null>(DENTE_CACHED_DASHBOARD_KEY, null);
}

/**
 * Читает закэшированный профиль клиники.
 */
export function getCachedClinicProfile(): unknown | null {
	return safeLocalStorageGetJson<unknown | null>(DENTE_CACHED_CLINIC_PROFILE_KEY, null);
}

/**
 * Читает закэшированный список сотрудников.
 */
export function getCachedStaffList(): unknown[] | null {
	return safeLocalStorageGetJson<unknown[] | null>(DENTE_CACHED_STAFF_LIST_KEY, null);
}

/**
 * Кэширует данные авторизованного активного сотрудника.
 */
export function cacheActiveStaffUser(user: unknown): void {
	if (!user || typeof user !== "object") return;
	try {
		safeLocalStorageSetJson(DENTE_CACHED_ACTIVE_STAFF_USER_KEY, user, true);
	} catch {
		// ignore
	}
}

/**
 * Читает данные закэшированного сотрудника для мгновенного восстановления сессии после перезагрузки.
 */
export function getCachedActiveStaffUser(): unknown | null {
	return safeLocalStorageGetJson<unknown | null>(DENTE_CACHED_ACTIVE_STAFF_USER_KEY, null);
}

/**
 * Устанавливает статус автономного / локального режима.
 */
export function setOfflineAutonomyMode(isOffline: boolean): void {
	if (isOffline) {
		safeLocalStorageSetItem(DENTE_OFFLINE_AUTONOMY_MODE_KEY, "true", true);
	} else {
		safeLocalStorageRemoveItem(DENTE_OFFLINE_AUTONOMY_MODE_KEY);
	}
}

/**
 * Проверяет, находится ли приложение в автономном режиме работы.
 */
export function isOfflineAutonomyMode(): boolean {
	return safeLocalStorageGetItem(DENTE_OFFLINE_AUTONOMY_MODE_KEY) === "true";
}

/**
 * Создаёт гарантированный минимальный автономный Dashboard (Zero Dead-Ends / Mandate 8n),
 * если клиника ещё ни разу не синхронизировалась с сервером, но пользователь должен работать.
 */
export function createOfflineFallbackDashboard(
	existingProfile?: unknown,
	options?: { withDemoData?: boolean },
): Dashboard {
	const profile = (existingProfile && typeof existingProfile === "object" ? existingProfile : null) as {
		id?: string;
		organizationId?: string;
		name?: string;
		mode?: string;
		scale?: string;
		hasDemoData?: boolean;
		withDemoData?: boolean;
	} | null;

	const orgId = profile?.organizationId || profile?.id || DEMO_SHOWCASE_ORG_ID;
	const clinicName = profile?.name || "Автономный кабинет врача DENTE";
	const isSolo =
		profile?.scale === "solo" ||
		profile?.mode === "solo_doctor" ||
		profile?.mode === "single_doctor" ||
		profile?.mode === "solo" ||
		profile?.mode === "one_chair";

	const chairsList = isSolo
		? [
				{
					id: DEMO_CHAIR_1_ID,
					organizationId: orgId,
					name: "Кресло 1 (Основное)",
					color: "var(--teal, #0d9488)",
					active: true,
					room: null,
					notes: null,
					specialization: null,
					hasXraySensor: false,
					hasMicroscope: false,
					hasSurgeryKit: false,
				},
			]
		: [
				{
					id: DEMO_CHAIR_1_ID,
					organizationId: orgId,
					name: "Кресло 1 (Основное)",
					color: "var(--teal, #0d9488)",
					active: true,
					room: null,
					notes: null,
					specialization: null,
					hasXraySensor: false,
					hasMicroscope: false,
					hasSurgeryKit: false,
				},
				{
					id: DEMO_CHAIR_2_ID,
					organizationId: orgId,
					name: "Кресло 2 (Ортопедия / Терапия)",
					color: "var(--accent, #6366f1)",
					active: true,
					room: null,
					notes: null,
					specialization: null,
					hasXraySensor: false,
					hasMicroscope: false,
					hasSurgeryKit: false,
				},
			];

	// Populated when explicitly requested or in demo/offline mode (Zero Dead-Ends, Mandates 8e, 8n)
	// Категорический запрет на инъекцию демо-пациентов в реальные клиники (Мандаты 8e, 8n)
	// Демо-данные разрешены ИСКЛЮЧИТЕЛЬНО для организации DEMO_SHOWCASE_ORG_ID
	const isDemoOrg = orgId === DEMO_SHOWCASE_ORG_ID;
	const isDemoModeActive = isDemoShowcaseMode() && isDemoOrg;
	const shouldSeedDemo = isDemoOrg && (options?.withDemoData === true || profile?.withDemoData === true || profile?.hasDemoData === true || isDemoModeActive);

	const today = new Date().toISOString().slice(0, 10);

	const starterPatients = shouldSeedDemo
		? getDemoShowcasePatients().map((p) => ({ ...p, organizationId: DEMO_SHOWCASE_ORG_ID }))
		: [];

	const starterAppointments = shouldSeedDemo
		? getDemoShowcaseAppointments().map((a) => ({ ...a, organizationId: DEMO_SHOWCASE_ORG_ID }))
		: [];

	const fallbackStaff: StaffMember[] = shouldSeedDemo
		? getDemoShowcaseStaff().map((s) => ({
				id: s.id,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				fullName: s.fullName,
				role: s.role,
				specialties: [],
				phone: s.phone || null,
				email: s.email || null,
				active: s.active,
				canSignMedicalRecords: true,
				canManageMoney: true,
				canManageImports: false,
				color: s.color,
				createdAt: today,
				updatedAt: today,
			}))
		: [
				{
					id: DEMO_CHIEF_DOCTOR.id,
					organizationId: orgId,
					fullName: typeof DEMO_CHIEF_DOCTOR.fullName === "string" ? DEMO_CHIEF_DOCTOR.fullName : "Доктор Демо (Главный врач)",
					role: "doctor",
					specialties: [],
					phone: null,
					email: null,
					active: true,
					canSignMedicalRecords: true,
					canManageMoney: true,
					canManageImports: false,
					color: typeof DEMO_CHIEF_DOCTOR.color === "string" ? DEMO_CHIEF_DOCTOR.color : "var(--teal, #0d9488)",
					createdAt: today,
					updatedAt: today,
				},
			];

	const fallbackDashboard: Dashboard = {
		clinicName,
		todayIso: today,
		clinicSettings: {
			profile: {
				organizationId: orgId,
				clinicName: clinicName,
				legalName: null,
				inn: null,
				address: null,
				phone: null,
				mode: (isSolo ? "solo_doctor" : profile?.mode === "solo_doctor" ? "solo_doctor" : "small_clinic") as ClinicMode,
				timezone: "Europe/Moscow",
				defaultVisitMinutes: 30,
				scheduleDefaults: {
					workdayStart: "09:00",
					workdayEnd: "20:00",
					workingDays: [1, 2, 3, 4, 5],
					appointmentBufferMinutes: 5,
				},
				networkEnabled: false,
				egiszEnabled: false,
				updatedAt: today,
			},
			chairs: chairsList,
			staff: fallbackStaff,
			integrationPresets: [],
			workspaceProfiles: [],
			roleAccessPolicies: [],
			modeHints: [],
		},
		appointments: starterAppointments,
		patients: starterPatients,
		shiftIntelligence: {
			modeFit: {
				title: "Solo Doctor Fit",
				mode: (isSolo ? "solo_doctor" : "small_clinic"),
				fitScore: 100,
				blockers: [],
				upgrades: [],
				lowFrictionNextStep: "Готово к работе",
			},
			doctorLoads: [],
			assistantLoads: [],
			chairLoads: [],
			roleQueues: [],
			scheduleWarnings: [],
		},
		activeVisit: null,
		documents: [],
		imagingStudies: [],
		protocolTemplates: [],
		serviceCatalog: [],
		treatmentPlanItems: [],
		treatmentPlanScenarios: [],
		clinicalRules: [],
		clinicalRuleEvaluations: [],
		clinicalRuleSummary: {
			blockers: 0,
			warnings: 0,
			activeRules: 0,
			evaluatedRules: 0,
			unresolved: 0,
			requiredServices: 0,
			coveredRules: 0,
		},
		payments: [],
		billingSummary: {
			totalPaidRub: 0,
			totalPlannedRub: 0,
			totalDiscountRub: 0,
			totalDueRub: 0,
			taxDeductionEligibleRub: 0,
			draftDocumentAmountRub: 0,
			openTreatmentItems: 0,
			unpaidDocuments: 0,
		},
		communicationTemplates: [],
		communicationTasks: [],
		communicationEvents: [],
		communicationSummary: {
			openTasks: 0,
			overdue: 0,
			urgentTasks: 0,
			dueToday: 0,
			completedToday: 0,
			appointmentConfirmations: 0,
			paymentReminders: 0,
			postVisitInstructions: 0,
		},
		importBatches: [],
		speechProviders: [],
		auditEvents: [],
		complianceWarnings: [],
		patientInsights: [],
		recommendedActions: [],
		appointmentReadiness: [],
		scheduleSuggestions: [],
		visitCloseChecklist: {
			visitId: "00000000-0000-7000-8000-000000000001",
			readyToSign: true,
			score: 100,
			nextAction: "none",
			blockingItems: 0,
			items: [],
		},
	};

	return fallbackDashboard;
}

/**
 * Полная очистка локальных кэшей клиники при явном выходе (Clinic Logout).
 */
export function clearOfflineClinicCaches(): void {
	safeLocalStorageRemoveItem(DENTE_CACHED_DASHBOARD_KEY);
	safeLocalStorageRemoveItem(DENTE_CACHED_CLINIC_PROFILE_KEY);
	safeLocalStorageRemoveItem(DENTE_CACHED_STAFF_LIST_KEY);
	safeLocalStorageRemoveItem(DENTE_CACHED_ACTIVE_STAFF_USER_KEY);
	safeLocalStorageRemoveItem(DENTE_OFFLINE_AUTONOMY_MODE_KEY);
}
