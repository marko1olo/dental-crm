/**
 * Empty Patient Cabinet Factory (Production Default)
 * (DOMAIN: PORTAL PATIENT CABINET - LAYER 1 PRESETS)
 */

import type { PatientPersonalCabinetData } from "./patientCabinetProfileTypes.js";

/**
 * Создает пустую структуру персонального кабинета для боевого продакшена (Мандат 8y).
 * Без синтетических заглушек и чужих персональных данных.
 */
export function createEmptyPatientCabinetData(
	patientId = "",
	fullName = "Пациент",
	phone = "",
): PatientPersonalCabinetData {
	return {
		patientId,
		fullName,
		phone,
		cardNumber: "",
		curatingDoctor: "Врач-куратор не назначен",
		loyaltyBonusBalance: 0,
		loyaltyTierRu: "Базовый",
		cashbackEarnedRub: 0,
		invoices: [],
		appointments: [],
		treatmentPlans: [],
		warranties: [],
		consents: [],
		familyMembers: [],
		teeth: [],
	};
}
