import type { Dashboard } from "@dental/shared";
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
					name: "Кресло 1 (Основное)",
					color: "var(--teal, #0d9488)",
					active: true,
				},
			]
		: [
				{
					id: DEMO_CHAIR_1_ID,
					name: "Кресло 1 (Основное)",
					color: "var(--teal, #0d9488)",
					active: true,
				},
				{
					id: DEMO_CHAIR_2_ID,
					name: "Кресло 2 (Ортопедия / Терапия)",
					color: "var(--accent, #6366f1)",
					active: true,
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

	const fallbackStaff = shouldSeedDemo
		? getDemoShowcaseStaff().map((s) => ({ ...s, organizationId: DEMO_SHOWCASE_ORG_ID }))
		: [
				{
					id: DEMO_CHIEF_DOCTOR.id,
					fullName: DEMO_CHIEF_DOCTOR.fullName,
					role: DEMO_CHIEF_DOCTOR.role,
					active: true,
					color: DEMO_CHIEF_DOCTOR.color,
				},
			];

	return {
		clinicSettings: {
			profile: {
				id: orgId,
				name: clinicName,
				clinicName: clinicName,
				mode: (isSolo ? "solo_doctor" : (profile?.mode as any) || "small_clinic"),
				timezone: "Europe/Moscow",
			},
			chairs: chairsList,
			staff: fallbackStaff,
		},
		appointments: starterAppointments,
		patients: starterPatients,
		finance: {
			dailyRevenueRub: shouldSeedDemo ? 3500 : 0,
			monthlyRevenueRub: shouldSeedDemo ? 18500 : 0,
			cashBalanceRub: 0,
		},
		statistics: {
			totalPatients: starterPatients.length,
			totalAppointments: starterAppointments.length,
			occupancyRatePercent: shouldSeedDemo ? 50 : 0,
		},
	} as unknown as Dashboard;
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
