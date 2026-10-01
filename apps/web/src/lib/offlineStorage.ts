/**
 * offlineStorage.ts
 *
 * Единый шлюз долговечного локального кэширования профиля клиники,
 * снимка рабочего стола (Dashboard), списка сотрудников и активного врача (Мандаты 8e, 8n).
 *
 * ЦЕЛЬ (ZERO DEAD-ENDS / АВТОНОМНОСТЬ КЛИНИКИ БЕЗ СЕТИ):
 * 1. Если клиника уже однажды вошла на этом компьютере (в кабинете есть токен),
 *    программа НИКОГДА не блокирует вход при обрыве сети, отключении интернета
 *    или работе в локальной сети (LAN / Wi-Fi без выхода в глобальный интернет).
 * 2. Полный снимок Dashboard и сотрудников сохраняется в безопасном локальном хранилище.
 * 3. При падении сетевых запросов интерфейс мгновенно поднимает закэшированные данные
 *    и активирует статус «📡 Автономный режим (Локальная сеть / Оффлайн)», позволяя
 *    врачу вести приём, смотреть расписание и историю без задержек.
 */

import type { Dashboard } from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageGetJson,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
	safeLocalStorageSetJson,
} from "./safeLocalStorage";
import { DEMO_SHOWCASE_ORG_ID, DEMO_CHAIR_1_ID, DEMO_CHAIR_2_ID } from "./demoMode";
import { DEMO_CHIEF_DOCTOR } from "../components/auth/staffUnlockState";

export const DENTE_CACHED_DASHBOARD_KEY = "dente_cached_dashboard_v1";
export const DENTE_CACHED_CLINIC_PROFILE_KEY = "dente_cached_clinic_profile";
export const DENTE_CACHED_STAFF_LIST_KEY = "dente_cached_staff_list";
export const DENTE_CACHED_ACTIVE_STAFF_USER_KEY = "dente_cached_active_staff_user";
export const DENTE_OFFLINE_AUTONOMY_MODE_KEY = "dente_offline_autonomy_mode";

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
export function createOfflineFallbackDashboard(existingProfile?: unknown): Dashboard {
	const profile = (existingProfile && typeof existingProfile === "object" ? existingProfile : null) as {
		id?: string;
		name?: string;
		mode?: string;
	} | null;

	const orgId = profile?.id || DEMO_SHOWCASE_ORG_ID;
	const clinicName = profile?.name || "Автономный кабинет врача DENTE";

	return {
		clinicSettings: {
			profile: {
				id: orgId,
				name: clinicName,
				mode: (profile?.mode as any) || "single_doctor",
				timezone: "Europe/Moscow",
			},
			chairs: [
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
			],
			staff: [
				{
					id: DEMO_CHIEF_DOCTOR.id,
					fullName: DEMO_CHIEF_DOCTOR.fullName,
					role: DEMO_CHIEF_DOCTOR.role,
					active: true,
					color: DEMO_CHIEF_DOCTOR.color,
				},
			],
		},
		appointments: [],
		patients: [],
		finance: {
			dailyRevenueRub: 0,
			monthlyRevenueRub: 0,
			cashBalanceRub: 0,
		},
		statistics: {
			totalPatients: 0,
			totalAppointments: 0,
			occupancyRatePercent: 0,
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
