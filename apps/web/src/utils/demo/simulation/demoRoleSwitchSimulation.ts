/**
 * demoRoleSwitchSimulation.ts
 *
 * Layer 3: Переключение клинических ролей, бэкап боевых токенов и сводки демо-кейсов.
 */

import { DEMO_SHOWCASE_ORG_ID } from "../demoConstants.js";
import {
	enableDemoShowcaseMode,
	isDemoShowcaseMode,
} from "../../demoModeEngine.js";
import {
	DEMO_THERAPIST_ODONTOGRAM,
	DEMO_THERAPIST_SOAP_DIARY,
	DEMO_THERAPIST_ESTIMATE,
	DEMO_ORTHOPEDIST_LAB_ORDER,
	DEMO_ORTHODONTIST_CASE,
	DEMO_SURGEON_CASE,
	DEMO_EXECUTIVE_KPI_CASE,
	generateDemoDiplomaForBravery,
	type DemoOdontogramToothState,
} from "../demoClinicalCases.js";
import {
	type DemoRoleProfile,
	DEMO_CLINICAL_ROLE_PROFILES,
	DENTE_LIVE_CLINIC_TOKEN_BACKUP_KEY,
	DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY,
	DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY,
	getSimulationStorage,
} from "./demoSimulationTypes.js";
import { _demoStateInstance } from "./demoSimulationState.js";

/**
 * Восстанавливает боевую сессию сотрудника и кабинета после выхода из демо-режима.
 */
export function restoreLiveStaffSessionAfterDemo(): boolean {
	const storage = getSimulationStorage();
	if (!storage) return false;
	try {
		const backupClinicToken = storage.getItem(DENTE_LIVE_CLINIC_TOKEN_BACKUP_KEY);
		const backupToken = storage.getItem(DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY);
		const backupUser = storage.getItem(DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY);

		if (backupClinicToken) {
			storage.setItem("dente_clinic_token", backupClinicToken);
			storage.removeItem(DENTE_LIVE_CLINIC_TOKEN_BACKUP_KEY);
		} else {
			const currentClinicToken = storage.getItem("dente_clinic_token");
			if (currentClinicToken?.startsWith("demo-")) {
				storage.removeItem("dente_clinic_token");
			}
		}

		if (backupToken) {
			storage.setItem("dente_staff_token", backupToken);
			storage.removeItem(DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY);
		} else {
			const currentToken = storage.getItem("dente_staff_token");
			if (currentToken?.startsWith("demo-")) {
				storage.removeItem("dente_staff_token");
			}
		}

		if (backupUser) {
			storage.setItem("dente_active_staff_user", backupUser);
			storage.removeItem(DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY);
		} else {
			const currentUser = storage.getItem("dente_active_staff_user");
			if (currentUser?.includes("dente-demo.ru")) {
				storage.removeItem("dente_active_staff_user");
			}
		}
		return true;
	} catch {
		return false;
	}
}

/**
 * Быстрое 1-клик переключение между 5 ролями прямо в интерфейсе демо-режима.
 * Гарантия изоляции: сохраняет резервную копию живого токена и защищает боевое рабочее место.
 */
export function switchDemoRole(
	roleKey: string,
	options?: { allowInLiveMode?: boolean },
): {
	success: boolean;
	profile?: DemoRoleProfile;
	error?: string;
} {
	const profile = DEMO_CLINICAL_ROLE_PROFILES[roleKey];
	if (!profile) {
		return { success: false, error: "Profile not found" };
	}

	// Защита рабочего места врача (МАНДАТ 8y: Fail-Closed):
	// Если активен боевой режим (isDemoShowcaseMode() === false) и в хранилище лежит реальный токен врача
	// (не demo-), переключение блокируется без явного флага allowInLiveMode!
	const currentlyInDemo = isDemoShowcaseMode();
	const storage = getSimulationStorage();
	if (!currentlyInDemo && !options?.allowInLiveMode) {
		if (storage) {
			try {
				const liveToken = storage.getItem("dente_staff_token");
				if (
					liveToken &&
					!liveToken.startsWith("demo-") &&
					!liveToken.startsWith("test-")
				) {
					return {
						success: false,
						error: "Simulation blocked: live doctor workstation is protected",
					};
				}
			} catch {
				// ignore
			}
		}
	}

	// Сохраняем резервную копию живого токена перед переключением
	if (storage) {
		try {
			const existingClinicToken = storage.getItem("dente_clinic_token");
			const existingToken = storage.getItem("dente_staff_token");
			const existingUser = storage.getItem("dente_active_staff_user");
			if (
				existingClinicToken &&
				!existingClinicToken.startsWith("demo-") &&
				!existingClinicToken.startsWith("test-")
			) {
				storage.setItem(DENTE_LIVE_CLINIC_TOKEN_BACKUP_KEY, existingClinicToken);
			}
			if (
				existingToken &&
				!existingToken.startsWith("demo-") &&
				!existingToken.startsWith("test-")
			) {
				storage.setItem(DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY, existingToken);
			}
			if (existingUser && !existingUser.includes("dente-demo.ru")) {
				storage.setItem(DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY, existingUser);
			}
		} catch {
			// ignore
		}
	}

	enableDemoShowcaseMode();
	_demoStateInstance.setActiveRoleId(roleKey);

	if (storage) {
		try {
			// Локальное кэширование активного профиля
			const userProfile = {
				id: profile.staffId,
				fullName: profile.doctorName,
				role: profile.role,
				email: `${profile.id}@dente-demo.ru`,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				specialization: profile.specialization,
			};

			const clinicToken = `demo-showcase-token-${profile.id}`;
			const staffToken = `demo-token-${profile.id}`;

			storage.setItem("dente_demo_active_role", roleKey);
			storage.setItem("dente_clinic_token", clinicToken);
			storage.setItem("dente_staff_token", staffToken);
			storage.setItem("dente_active_staff_user", JSON.stringify(userProfile));

			// Синхронизируем демо-контур на бэкенде в PostgreSQL 18
			if (typeof window !== "undefined" && typeof window.fetch === "function") {
				try {
					void window
						.fetch("/api/demo/switch-role", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								"x-dente-clinic-token": clinicToken,
								"x-dente-staff-token": staffToken,
							},
							body: JSON.stringify({ role: roleKey }),
						})
						.catch(() => {});
				} catch {
					// non-blocking
				}
			}

			// Обновление роута / хэша в браузере
			if (typeof window !== "undefined" && window.location) {
				window.location.hash = `#${profile.targetView}`;
			}

			// Диспатч события для синхронизации Zustand и React компонентов
			if (typeof window !== "undefined" && window.dispatchEvent) {
				window.dispatchEvent(
					new CustomEvent("dente-demo-role-switched", {
						detail: {
							roleKey,
							profile,
						},
					}),
				);
			}
		} catch {
			// restricted storage
		}
	}

	return { success: true, profile };
}

/**
 * Получить детальную сводку текущей роли для модалки/шторки демонстрации.
 */
export function getDemoRoleClinicalDetails(roleKey: string): {
	profile: DemoRoleProfile;
	odontogram?: DemoOdontogramToothState[] | undefined;
	soapDiary?: typeof DEMO_THERAPIST_SOAP_DIARY | undefined;
	estimate?: typeof DEMO_THERAPIST_ESTIMATE | undefined;
	labOrder?: typeof DEMO_ORTHOPEDIST_LAB_ORDER | undefined;
	orthoCase?: typeof DEMO_ORTHODONTIST_CASE | undefined;
	surgeonCase?: typeof DEMO_SURGEON_CASE | undefined;
	executiveKpis?: typeof DEMO_EXECUTIVE_KPI_CASE | undefined;
	braveryDiploma?: ReturnType<typeof generateDemoDiplomaForBravery> | undefined;
} {
	const profile =
		DEMO_CLINICAL_ROLE_PROFILES[roleKey] ||
		DEMO_CLINICAL_ROLE_PROFILES.therapist!;

	return {
		profile,
		odontogram: roleKey === "therapist" ? DEMO_THERAPIST_ODONTOGRAM : undefined,
		soapDiary: roleKey === "therapist" ? DEMO_THERAPIST_SOAP_DIARY : undefined,
		estimate: roleKey === "therapist" ? DEMO_THERAPIST_ESTIMATE : undefined,
		labOrder: roleKey === "orthopedist" ? DEMO_ORTHOPEDIST_LAB_ORDER : undefined,
		orthoCase: roleKey === "orthodontist" ? DEMO_ORTHODONTIST_CASE : undefined,
		surgeonCase: roleKey === "surgeon" ? DEMO_SURGEON_CASE : undefined,
		executiveKpis: roleKey === "owner" ? DEMO_EXECUTIVE_KPI_CASE : undefined,
		braveryDiploma: generateDemoDiplomaForBravery(
			profile.targetPatientId === "01a00000-0000-0000-0000-000000000001"
				? "Смирнова Анна Сергеевна"
				: profile.doctorName,
		),
	};
}
