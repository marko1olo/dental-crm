import type { MedicalStaffRole, StaffRoleDefinition } from "./types";

/**
 * Medical staff roles and labor requirements
 */
export const MEDICAL_STAFF_ROLES: Record<MedicalStaffRole, StaffRoleDefinition> = {
	therapist: {
		role: "therapist",
		code: "ВСТ",
		nameRu: "Врач стоматолог-терапевт",
		isDoctor: true,
		isAssistant: false,
		standardWeeklyHours: 33,
		requiresAssistant: false,
	},
	surgeon: {
		role: "surgeon",
		code: "ВСХ",
		nameRu: "Врач стоматолог-хирург / имплантолог",
		isDoctor: true,
		isAssistant: false,
		standardWeeklyHours: 33,
		// MANDATE 8n: Соло-практика первична. Ассистент рекомендован, но не блокирует работу врача в соло.
		requiresAssistant: false,
	},
	orthopedist: {
		role: "orthopedist",
		code: "ВСО",
		nameRu: "Врач стоматолог-ортопед",
		isDoctor: true,
		isAssistant: false,
		standardWeeklyHours: 33,
		requiresAssistant: false,
	},
	orthodontist: {
		role: "orthodontist",
		code: "ВОР",
		nameRu: "Врач-ортодонт",
		isDoctor: true,
		isAssistant: false,
		standardWeeklyHours: 33,
		requiresAssistant: false,
	},
	pediatric: {
		role: "pediatric",
		code: "ДВС",
		nameRu: "Детский врач-стоматолог",
		isDoctor: true,
		isAssistant: false,
		standardWeeklyHours: 33,
		requiresAssistant: false,
	},
	hygienist: {
		role: "hygienist",
		code: "ГС",
		nameRu: "Гигиенист стоматологический",
		isDoctor: false,
		isAssistant: false,
		standardWeeklyHours: 39,
		requiresAssistant: false,
	},
	assistant: {
		role: "assistant",
		code: "МСА",
		nameRu: "Ассистент врача / Медсестра",
		isDoctor: false,
		isAssistant: true,
		standardWeeklyHours: 39,
		requiresAssistant: false,
	},
};
