/**
 * ============================================================================
 * CHAIRSIDE CONSENT ENGINE - CONSTANTS & CLINICAL DEFAULTS (LAYER 0)
 * Константы и базовые профили подсистемы согласий у кресла
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
	"Электронная подпись • Информированное добровольное согласие";

export const STATUTORY_LEGAL_BASIS_PAPER =
	"Письменная форма • Личная подпись пациента в медицинской карте";

export const STATUTORY_LEGAL_BASIS_TOUCH =
	"Подписано на планшете врача (стилус / сенсорный экран)";

export const STATUTORY_LEGAL_BASIS_IN_PERSON =
	"Подтверждено лично пациентом у кресла";
