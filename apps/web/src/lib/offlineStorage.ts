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
import {
	DEMO_SHOWCASE_ORG_ID,
	DEMO_CHAIR_1_ID,
	DEMO_CHAIR_2_ID,
	isDemoShowcaseMode,
	getDemoShowcaseStaff,
	getDemoShowcasePatients,
	getDemoShowcaseAppointments,
} from "./demoMode";
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
	const shouldSeedDemo =
		options?.withDemoData !== false &&
		profile?.withDemoData !== false &&
		profile?.hasDemoData !== false &&
		(profile?.hasDemoData === true ||
			profile?.withDemoData === true ||
			isDemoShowcaseMode() ||
			isOfflineAutonomyMode());

	const isDemoModeActive = isDemoShowcaseMode();
	const today = new Date().toISOString().slice(0, 10);

	const starterPatients = isDemoModeActive
		? getDemoShowcasePatients()
		: shouldSeedDemo
			? [
				{
					id: "01a00000-0000-0000-0000-000000000001",
					organizationId: orgId,
					fullName: "Иванов Алексей Сергеевич",
					birthDate: "1988-04-12",
					gender: "male",
					phone: "+7 (912) 345-67-89",
					notes: "Первичный осмотр, жалоба на чувствительность 2.4",
					status: "active",
					balanceRub: 0,
					administrativeProfile: null,
					createdAt: `${today}T08:00:00.000Z`,
					updatedAt: `${today}T08:00:00.000Z`,
				},
				{
					id: "01a00000-0000-0000-0000-000000000002",
					organizationId: orgId,
					fullName: "Смирнова Елена Викторовна",
					birthDate: "1992-09-25",
					gender: "female",
					phone: "+7 (927) 876-54-32",
					notes: "Профгигиена полости рта (Air-Flow + ультразвук)",
					status: "active",
					balanceRub: 3500,
					administrativeProfile: null,
					createdAt: `${today}T08:00:00.000Z`,
					updatedAt: `${today}T08:00:00.000Z`,
				},
				{
					id: "01a00000-0000-0000-0000-000000000003",
					organizationId: orgId,
					fullName: "Кузнецов Дмитрий Михайлович",
					birthDate: "1980-11-03",
					gender: "male",
					phone: "+7 (903) 555-44-33",
					notes: "Консультация ортопеда, составление плана лечения",
					status: "active",
					balanceRub: 0,
					administrativeProfile: null,
					createdAt: `${today}T08:00:00.000Z`,
					updatedAt: `${today}T08:00:00.000Z`,
				},
				{
					id: "01a00000-0000-0000-0000-000000000004",
					organizationId: orgId,
					fullName: "Морозова Анна Александровна",
					birthDate: "1995-06-18",
					gender: "female",
					phone: "+7 (915) 999-88-77",
					notes: "Лечение кариеса 4.6 (световая пломба Estelite)",
					status: "active",
					balanceRub: 0,
					administrativeProfile: null,
					createdAt: `${today}T08:00:00.000Z`,
					updatedAt: `${today}T08:00:00.000Z`,
				},
			]
		: [];

	const starterAppointments = isDemoModeActive
		? getDemoShowcaseAppointments()
		: shouldSeedDemo
			? [
				{
					id: "01a00000-0000-0000-0001-000000000001",
					organizationId: orgId,
					patientId: "01a00000-0000-0000-0000-000000000001",
					doctorUserId: DEMO_CHIEF_DOCTOR.id,
					chairId: DEMO_CHAIR_1_ID,
					status: "completed",
					startsAt: `${today}T09:00:00.000Z`,
					endsAt: `${today}T10:00:00.000Z`,
					reason: "Первичный осмотр и консультация",
					comment: "Осмотр завершен, составлен план лечения",
				},
				{
					id: "01a00000-0000-0000-0001-000000000002",
					organizationId: orgId,
					patientId: "01a00000-0000-0000-0000-000000000002",
					doctorUserId: DEMO_CHIEF_DOCTOR.id,
					chairId: DEMO_CHAIR_1_ID,
					status: "in_treatment",
					startsAt: `${today}T10:30:00.000Z`,
					endsAt: `${today}T11:30:00.000Z`,
					reason: "Комплексная профгигиена полости рта",
					comment: "Пациент в кресле",
				},
				{
					id: "01a00000-0000-0000-0001-000000000003",
					organizationId: orgId,
					patientId: "01a00000-0000-0000-0000-000000000003",
					doctorUserId: DEMO_CHIEF_DOCTOR.id,
					chairId: DEMO_CHAIR_1_ID,
					status: "scheduled",
					startsAt: `${today}T12:00:00.000Z`,
					endsAt: `${today}T13:00:00.000Z`,
					reason: "Консультация ортопеда",
					comment: "Запланирован",
				},
				{
					id: "01a00000-0000-0000-0001-000000000004",
					organizationId: orgId,
					patientId: "01a00000-0000-0000-0000-000000000004",
					doctorUserId: DEMO_CHIEF_DOCTOR.id,
					chairId: DEMO_CHAIR_1_ID,
					status: "scheduled",
					startsAt: `${today}T14:00:00.000Z`,
					endsAt: `${today}T15:00:00.000Z`,
					reason: "Лечение кариеса 4.6",
					comment: "Запланирован",
				},
			]
		: [];

	const fallbackStaff = isDemoModeActive
		? getDemoShowcaseStaff()
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
