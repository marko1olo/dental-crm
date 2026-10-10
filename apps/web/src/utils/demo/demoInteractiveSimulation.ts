/**
 * demoInteractiveSimulation.ts
 *
 * Интерактивный симулятор действий в демо-режиме (МАНДАТ 8n: ZERO DEAD-ENDS & МАНДАТ 8e: DOCTOR AUTONOMY):
 * - Мгновенное переключение между 5 клиническими ролями в 1 клик без перезагрузки и разлогина.
 * - Интерактивная смена статусов расписания (planned -> in_treatment -> completed).
 * - Клик по зубу в одонтограмме с открытием или мутацией клинического статуса.
 * - Добавление услуги в смету и расчет чека по 54-ФЗ без обращения к удаленному бэкенду.
 * - Генерация и печать медицинской карты 043/у, согласий и диплома за храбрость без падений TypeError.
 */

import type { Appointment, StaffRole } from "@dental/shared";
import {
	DEMO_SHOWCASE_ORG_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_ADMIN_ID,
} from "./demoConstants.js";
import {
	getDemoShowcaseAppointments,
	enableDemoShowcaseMode,
	isDemoShowcaseMode,
	isDemoPatientId,
	isDemoTenant,
} from "../demoModeEngine.js";
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
	type DemoEstimateItem,
	type DemoEstimate,
} from "./demoClinicalCases.js";
export { generateDemoDiplomaForBravery } from "./demoClinicalCases.js";

export interface DemoRoleProfile {
	id: string;
	title: string;
	role: StaffRole;
	doctorName: string;
	specialization: string;
	targetView: string;
	targetPatientId: string;
	staffId: string;
	badge: string;
	description: string;
}

export const DEMO_CLINICAL_ROLE_PROFILES: Record<string, DemoRoleProfile> = {
	therapist: {
		id: "therapist",
		title: "Терапевт",
		role: "doctor",
		doctorName: "Д-р Соколов А. В.",
		specialization: "Терапевт",
		targetView: "patients",
		targetPatientId: "01a00000-0000-0000-0000-000000000001",
		staffId: DEMO_DOCTOR_1_ID,
		badge: "Клинический Hot Path",
		description: "Лечение кариеса 16 (MOD), коффердам, реставрация Ceram.x, форма 043/у",
	},
	orthopedist: {
		id: "orthopedist",
		title: "Ортопед",
		role: "doctor",
		doctorName: "Д-р Орлов А. В.",
		specialization: "Ортопед",
		targetView: "patients",
		targetPatientId: "01a00000-0000-0000-0000-000000000002",
		staffId: DEMO_DOCTOR_ORTHOPEDIST_ID,
		badge: "Лаборатория ЗТЛ",
		description: "Заказ-наряд ЗТЛ: коронка ZrO2 Katana на 11, шкала VITA A2, 7 этапов",
	},
	orthodontist: {
		id: "orthodontist",
		title: "Ортодонт",
		role: "doctor",
		doctorName: "Д-р Морозова Е. И.",
		specialization: "Ортодонт",
		targetView: "patients",
		targetPatientId: "01a00000-0000-0000-0000-000000000003",
		staffId: DEMO_DOCTOR_2_ID,
		badge: "Элайнеры и прикус",
		description: "Дистальный прикус, элайнеры Spark 12/30, фиксация аттачментов на 14, 13, 23, 24",
	},
	surgeon: {
		id: "surgeon",
		title: "Хирург-имплантолог",
		role: "doctor",
		doctorName: "Д-р Громов К. Д.",
		specialization: "Хирург-имплантолог",
		targetView: "patients",
		targetPatientId: "01a00000-0000-0000-0000-000000000004",
		staffId: DEMO_DOCTOR_SURGEON_ID,
		badge: "Хирургия и шаблоны",
		description: "Имплантация зуба 46 Straumann BLX 4.5x10, торк 35 Н·см, ИДС 1051н",
	},
	owner: {
		id: "owner",
		title: "Главврач / Владелец",
		role: "owner",
		doctorName: "Д-р Воронов М. С.",
		specialization: "Главврач / Владелец",
		targetView: "analytics",
		targetPatientId: "01a00000-0000-0000-0000-000000000001",
		staffId: DEMO_OWNER_ID,
		badge: "Финансы и KPI",
		description: "Выручка 2.45М ₽, загрузка 78%, средний чек 6 200 ₽, сдельная зарплата врачей",
	},
	admin: {
		id: "admin",
		title: "Старший администратор",
		role: "administrator",
		doctorName: "Смирнова А. П.",
		specialization: "Старший администратор",
		targetView: "schedule",
		targetPatientId: "01a00000-0000-0000-0000-000000000001",
		staffId: DEMO_ADMIN_ID,
		badge: "Ресепшен и касса",
		description: "Плотная шахматка расписания, быстрый чек 54-ФЗ, звонки и WhatsApp",
	},
};

// In-memory runtime state for interactive demo mutations
class DemoInteractiveState {
	private appointments: Appointment[] = [];
	private odontogramStates: Map<string, DemoOdontogramToothState[]> = new Map();
	private estimates: Map<string, DemoEstimate> = new Map();
	private activeRoleId = "therapist";
	private initialized = false;

	private ensureInitialized() {
		if (!this.initialized) {
			this.resetToDefaults();
		}
	}

	public resetToDefaults() {
		this.initialized = true;
		try {
			if (typeof getDemoShowcaseAppointments === "function") {
				this.appointments = getDemoShowcaseAppointments();
			} else {
				this.appointments = [];
			}
		} catch {
			this.appointments = [];
		}
		this.odontogramStates.set(
			"01a00000-0000-0000-0000-000000000001",
			[...DEMO_THERAPIST_ODONTOGRAM],
		);
		this.estimates.set(
			"01a00000-0000-0000-0000-000000000001",
			JSON.parse(JSON.stringify(DEMO_THERAPIST_ESTIMATE)),
		);
	}

	public getAppointments(): Appointment[] {
		this.ensureInitialized();
		if (this.appointments.length === 0 && typeof getDemoShowcaseAppointments === "function") {
			try {
				this.appointments = getDemoShowcaseAppointments();
			} catch {
				this.appointments = [];
			}
		}
		return [...this.appointments];
	}

	public updateAppointmentStatus(
		appointmentId: string,
		newStatus: Appointment["status"],
	): { success: boolean; appointment?: Appointment } {
		this.ensureInitialized();
		if (this.appointments.length === 0 && typeof getDemoShowcaseAppointments === "function") {
			try {
				this.appointments = getDemoShowcaseAppointments();
			} catch {
				this.appointments = [];
			}
		}
		const apt = this.appointments.find((a) => a.id === appointmentId);
		if (!apt) {
			return { success: false };
		}
		apt.status = newStatus;
		return { success: true, appointment: { ...apt } };
	}

	public getOdontogram(patientId: string): DemoOdontogramToothState[] {
		this.ensureInitialized();
		const existing = this.odontogramStates.get(patientId);
		if (existing) return [...existing];
		// default to therapist odontogram
		return [...DEMO_THERAPIST_ODONTOGRAM];
	}

	public applyToothState(
		patientId: string,
		toothNumber: number,
		patch: Partial<DemoOdontogramToothState>,
	): DemoOdontogramToothState[] {
		this.ensureInitialized();
		const current = this.getOdontogram(patientId);
		const idx = current.findIndex((t) => t.toothNumber === toothNumber);
		if (idx >= 0) {
			current[idx] = { ...current[idx]!, ...patch };
		} else {
			current.push({
				toothNumber,
				state: patch.state || "caries",
				titleRu: patch.titleRu || `Зуб ${toothNumber}`,
				clinicalNote: patch.clinicalNote || "Клинический осмотр",
				color: patch.color || "var(--danger, #ef4444)",
				surfaces: patch.surfaces || ["O"],
			});
		}
		this.odontogramStates.set(patientId, current);
		return [...current];
	}

	public getEstimate(patientId: string): DemoEstimate {
		this.ensureInitialized();
		const existing = this.estimates.get(patientId);
		if (existing) return existing;
		return JSON.parse(JSON.stringify(DEMO_THERAPIST_ESTIMATE));
	}

	public addServiceToEstimate(
		patientId: string,
		item: DemoEstimateItem,
	): DemoEstimate {
		this.ensureInitialized();
		const est = this.getEstimate(patientId);
		est.items.push(item);
		est.totalGrossRub = est.items.reduce((sum, i) => sum + i.totalRub, 0);
		est.totalNetRub = Math.max(0, est.totalGrossRub - est.totalDiscountRub);
		this.estimates.set(patientId, est);
		return { ...est };
	}

	public getActiveRoleId(): string {
		return this.activeRoleId;
	}

	public setActiveRoleId(roleId: string) {
		this.activeRoleId = roleId;
	}
}

const _demoStateInstance = new DemoInteractiveState();

export const DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY = "dente_live_staff_token_backup";
export const DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY = "dente_live_active_staff_user_backup";

function getSimulationStorage(): Storage | null {
	try {
		if (typeof window !== "undefined" && window.localStorage) {
			return window.localStorage;
		}
	} catch {
		// ignore
	}
	try {
		if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
			return (globalThis as unknown as { localStorage?: Storage }).localStorage ?? null;
		}
	} catch {
		// ignore
	}
	return null;
}

/**
 * Проверяет, разрешена ли симуляция (строго в демо-режиме / Мандат 8c Zero Mocks & 8y Fail-Closed).
 */
export function isSimulationAllowed(): boolean {
	return isDemoShowcaseMode();
}

/**
 * Восстанавливает боевую сессию сотрудника после выхода из демо-режима.
 */
export function restoreLiveStaffSessionAfterDemo(): boolean {
	const storage = getSimulationStorage();
	if (!storage) return false;
	try {
		const backupToken = storage.getItem(DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY);
		const backupUser = storage.getItem(DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY);

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
 * Получить интерактивные приёмы демо-режима (изолировано: пустой массив в боевом режиме).
 */
export function getLiveDemoAppointments(): Appointment[] {
	if (!isDemoShowcaseMode()) {
		return [];
	}
	return _demoStateInstance.getAppointments();
}

/**
 * Мгновенная симуляция смены статуса приёма («В кресле» -> «Завершен») без сетевых ошибок.
 * В боевом режиме отклоняется (Fail-Closed) для защиты реального расписания врача,
 * если прием не является изолированным демо-приемом.
 */
export function simulateDemoAppointmentStatusChange(
	appointmentId: string,
	newStatus: Appointment["status"],
): { success: boolean; appointment?: Appointment; error?: string } {
	const isDemo = isDemoShowcaseMode() || isDemoTenant(appointmentId) || appointmentId.startsWith("01a0");
	if (!isDemo) {
		return { success: false, error: "Simulation rejected: live production appointment is protected" };
	}
	return _demoStateInstance.updateAppointmentStatus(appointmentId, newStatus);
}

/**
 * Получить зубную формулу пациента в демо-режиме (изолировано: пустой массив для реального пациента в боевом режиме).
 */
export function getLiveDemoOdontogram(patientId: string): DemoOdontogramToothState[] {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
	if (!isDemo) {
		return [];
	}
	return _demoStateInstance.getOdontogram(patientId);
}

/**
 * Клик по зубу в одонтограмме: мгновенная мутация состояния в демо-режиме.
 * В боевом режиме отклоняется для реальных пациентов без вмешательства в их медкарту.
 */
export function simulateDemoToothClick(
	patientId: string,
	toothNumber: number,
	patch: Partial<DemoOdontogramToothState>,
): DemoOdontogramToothState[] {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
	if (!isDemo) {
		return [];
	}
	return _demoStateInstance.applyToothState(patientId, toothNumber, patch);
}

/**
 * Добавление услуги в смету в демо-режиме.
 * В боевом режиме для реального пациента возвращает пустую смету без мутации боевой кассы.
 */
export function simulateDemoAddServiceToEstimate(
	patientId: string,
	item: DemoEstimateItem,
): DemoEstimate {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
	if (!isDemo) {
		return {
			estimateNumber: "СМЕТА-ПУСТО",
			patientId,
			patientName: "Реальный пациент",
			doctorId: "",
			doctorName: "",
			dateIso: new Date().toISOString(),
			items: [],
			totalGrossRub: 0,
			totalDiscountRub: 0,
			totalNetRub: 0,
			status: "draft",
		};
	}
	return _demoStateInstance.addServiceToEstimate(patientId, item);
}

/**
 * Получить текущую смету пациента в демо-режиме.
 */
export function getLiveDemoEstimate(patientId: string): DemoEstimate {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);
	if (!isDemo) {
		return {
			estimateNumber: "СМЕТА-ПУСТО",
			patientId,
			patientName: "Реальный пациент",
			doctorId: "",
			doctorName: "",
			dateIso: new Date().toISOString(),
			items: [],
			totalGrossRub: 0,
			totalDiscountRub: 0,
			totalNetRub: 0,
			status: "draft",
		};
	}
	return _demoStateInstance.getEstimate(patientId);
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
				if (liveToken && !liveToken.startsWith("demo-") && !liveToken.startsWith("test-")) {
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
			const existingToken = storage.getItem("dente_staff_token");
			const existingUser = storage.getItem("dente_active_staff_user");
			if (existingToken && !existingToken.startsWith("demo-") && !existingToken.startsWith("test-")) {
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

			storage.setItem("dente_demo_active_role", roleKey);
			storage.setItem("dente_staff_token", `demo-token-${profile.id}`);
			storage.setItem("dente_active_staff_user", JSON.stringify(userProfile));

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
	const profile = DEMO_CLINICAL_ROLE_PROFILES[roleKey] || DEMO_CLINICAL_ROLE_PROFILES.therapist!;

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
