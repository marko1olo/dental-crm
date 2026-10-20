/**
 * demoSimulationTypes.ts
 *
 * Layer 0: Типы, константы и профили клинических ролей для демо-симулятора.
 */

import type { StaffRole } from "@dental/shared";
import {
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_ADMIN_ID,
} from "../demoConstants.js";

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

export const DENTE_LIVE_CLINIC_TOKEN_BACKUP_KEY = "dente_live_clinic_token_backup";
export const DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY = "dente_live_staff_token_backup";
export const DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY = "dente_live_active_staff_user_backup";

export function getSimulationStorage(): Storage | null {
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
