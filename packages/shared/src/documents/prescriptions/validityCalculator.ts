import type { PrescriptionFormType } from "./types.js";

/** ═══════════════════════════════════════════════════════════════════════════
 * СТАТУТОРНЫЙ ДВИЖОК ПРОВЕРКИ СРОКА ДЕЙСТВИЯ И ПРАВИЛ ВЫПИСКИ (ПРИКАЗ № 1094н)
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PrescriptionValidityResult {
	readonly isValid: boolean;
	readonly status: "active" | "expiring_soon" | "expired";
	readonly validityDays: number;
	readonly issuedAtIso: string;
	readonly expiresAtIso: string;
	readonly daysRemaining: number;
	readonly isExpired: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

export const PRESCRIPTION_VALIDITY_RULES = {
	"107-1u": {
		maxItemsCount: 3,
		allowedValidityPeriods: ["15", "60", "365"] as const,
		defaultValidityPeriod: "60",
		chronicCareAllowed: true,
	},
	"148-1u-88": {
		maxItemsCount: 1,
		allowedValidityPeriods: ["15"] as const,
		defaultValidityPeriod: "15",
		chronicCareAllowed: false,
	},
} as const;

/** Расчет точной даты истечения срока действия рецепта */
export function calculatePrescriptionExpiration(
	issueDateIso: string,
	validityDays: "15" | "30" | "60" | "365" | number,
): string {
	const date = new Date(issueDateIso);
	if (Number.isNaN(date.getTime())) {
		const fallback = new Date();
		fallback.setDate(fallback.getDate() + Number(validityDays));
		return fallback.toISOString().slice(0, 10);
	}
	const daysToAdd = typeof validityDays === "number" ? validityDays : Number.parseInt(validityDays, 10);
	date.setDate(date.getDate() + daysToAdd);
	return date.toISOString().slice(0, 10);
}

/** Проверка соответствия рецепта нормам Приказа Минздрава РФ № 1094н */
export function verifyPrescriptionStatutoryValidity(
	prescription: {
		readonly formNumber?: "107-1/у" | "148-1/у-88" | "148-1/у-04(л)" | string | undefined;
		readonly formType?: PrescriptionFormType | string | undefined;
		readonly prescriptionDate: string;
		readonly validityDays: "15" | "30" | "60" | "365" | string | number;
		readonly isChronicSpecialCare?: boolean | undefined;
		readonly chronicPeriodicity?: string | null | undefined;
		readonly items: readonly { readonly latinName?: string | undefined; readonly tradeName?: string | undefined; readonly category?: string | undefined }[];
		readonly patientAddress?: string | null | undefined;
		readonly preferentialDetails?: { readonly patientSnils?: string | undefined; readonly patientOmsPolicy?: string | undefined } | null | undefined;
	},
	referenceDateIso?: string,
): PrescriptionValidityResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Нормализация типа формы
	let form: PrescriptionFormType = "107-1u";
	if (prescription.formNumber === "148-1/у-88" || prescription.formType === "148-1u-88" || prescription.formType === "148-1u") {
		form = "148-1u-88";
	}

	const rules = PRESCRIPTION_VALIDITY_RULES[form];
	const validityStr = String(prescription.validityDays);
	const validityDaysNum = Number.parseInt(validityStr, 10) || 60;

	// 1. Проверка лимита количества препаратов на один бланк
	if (prescription.items.length === 0) {
		errors.push("Рецептурный бланк не содержит выписанных лекарственных препаратов.");
	} else if (prescription.items.length > rules.maxItemsCount) {
		errors.push(
			`Превышено максимальное количество препаратов для формы ${form === "148-1u-88" ? "№ 148-1/у-88 (максимум 1)" : "№ 107-1/у (максимум 3)"}: выписано ${prescription.items.length}.`,
		);
	}

	// 2. Проверка срока действия в зависимости от формы
	if (form === "148-1u-88") {
		if (validityDaysNum !== 15) {
			errors.push("Срок действия рецептурного бланка № 148-1/у-88 (ПКУ) по закону составляет строго 15 дней.");
		}
		if (!prescription.patientAddress || prescription.patientAddress.trim().length < 5) {
			errors.push("Для рецептурного бланка № 148-1/у-88 обязательно указание полного адреса места жительства (пребывания) пациента.");
		}
	} else if (form === "107-1u") {
		if (validityDaysNum === 365) {
			if (!prescription.isChronicSpecialCare) {
				errors.push("Срок действия 1 год на бланке 107-1/у разрешен только с обязательной пометкой «По специальному назначению».");
			}
			if (!prescription.chronicPeriodicity || prescription.chronicPeriodicity.trim().length === 0) {
				warnings.push("Для рецепта на 1 год рекомендуется указать периодичность отпуска (например, «ежемесячно»).");
			}
		}
	}

	// 3. Расчет срока истечения и остатка дней
	const issuedAtIso = prescription.prescriptionDate || new Date().toISOString().slice(0, 10);
	const expiresAtIso = calculatePrescriptionExpiration(issuedAtIso, validityDaysNum);
	
	const refDate = referenceDateIso ? new Date(referenceDateIso) : new Date();
	const expDate = new Date(expiresAtIso);
	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	const isExpired = daysRemaining < 0;

	let status: "active" | "expiring_soon" | "expired" = "active";
	if (isExpired) {
		status = "expired";
	} else if (daysRemaining <= 3) {
		status = "expiring_soon";
		warnings.push(`Срок действия рецепта истекает через ${daysRemaining} дн.`);
	}

	return {
		isValid: errors.length === 0,
		status,
		validityDays: validityDaysNum,
		issuedAtIso,
		expiresAtIso,
		daysRemaining,
		isExpired,
		errors,
		warnings,
	};
}

