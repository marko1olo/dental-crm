/**
 * ============================================================================
 * CHAIRSIDE CONSENT ENGINE - CONSTANTS & STATUTORY DEFAULTS (LAYER 0)
 * 323-ФЗ ст. 20 / 152-ФЗ / 63-ФЗ / 1051н / ПП РФ № 736
 * ============================================================================
 */

import type { ChairsideClinicProfile } from "./types.js";

export const DEFAULT_CHAIRSIDE_CLINIC: ChairsideClinicProfile = {
	legalName: "ООО «Стоматологическая клиника ДЕНТЕ»",
	brandName: "ДЕНТЕ Клиник",
	ogrn: "1217700456789",
	inn: "7701987654",
	address: "г. Москва, ул. Стоматологов, д. 10, корп. 1",
	licenseNumber: "ЛО41-01137-77/00368421",
	licenseDate: "12.10.2021",
	licenseIssuer: "Департамент здравоохранения города Москвы",
};

export const CHAIRSIDE_SMS_OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 минут (300 000 мс)
export const CHAIRSIDE_SMS_OTP_MAX_ATTEMPTS = 3;

export const STATUTORY_LEGAL_BASIS_SMS_PEP =
	"Федеральный закон от 06.04.2011 № 63-ФЗ, ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ, Приказ Минздрава РФ от 12.11.2021 № 1051н";

export const STATUTORY_LEGAL_BASIS_PAPER =
	"ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ, Федеральный закон от 27.07.2006 № 152-ФЗ, Постановление Правительства РФ от 11.05.2023 № 736";

export const STATUTORY_LEGAL_BASIS_TOUCH =
	"ст. 2, 6 Федерального закона от 06.04.2011 № 63-ФЗ, ст. 20 323-ФЗ, Приказ Минздрава РФ от 12.11.2021 № 1051н";

export const STATUTORY_LEGAL_BASIS_IN_PERSON =
	"ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ, Приказ Минздрава РФ от 12.11.2021 № 1051н";
