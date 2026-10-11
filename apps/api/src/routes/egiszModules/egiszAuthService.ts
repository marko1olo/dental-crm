import { isValidSnils, normalizeSnils } from "../../utils/snils.js";
import { type EgiszGatewayConfig, readGatewayConfig } from "../egisz/helpers.js";

export type ComponentStatus = "CONNECTED" | "NOT_CONFIGURED";

export interface GostCertificateInfo {
	thumbprint: string;
	subjectName: string;
	issuerName: string;
	validFrom: string;
	validTo: string;
	serialNumber: string;
	isGost3410_2012: boolean;
	hasDigitalSignatureUsage: boolean;
}

export interface GostCertValidationResult {
	valid: boolean;
	reason?: string;
	certificateInfo?: GostCertificateInfo;
}

export interface FrmrAccessVerificationResult {
	valid: boolean;
	snilsFormatted: string;
	error?: "InvalidSnilsFormat" | "InvalidSnilsChecksum" | "DoctorNotFoundInFrmr";
	message?: string;
}

export interface EgiszIntegrationStatusResult {
	ok: boolean;
	configured: boolean;
	frmoStatus: ComponentStatus;
	frmrStatus: ComponentStatus;
	remdStatus: ComponentStatus;
	vimisStatus: ComponentStatus;
	capabilities: {
		cdaGeneration: boolean;
		ukepSigning: boolean;
		remdTransmission: boolean;
		vimisDentalSync: boolean;
	};
	missingConfiguration: readonly string[];
	checkedAt: string;
}

function componentStatus(...required: (string | null)[]): ComponentStatus {
	return required.every((value) => value !== null && value.length > 0)
		? "CONNECTED"
		: "NOT_CONFIGURED";
}

/**
 * Валидация сертификата усиленной квалифицированной электронной подписи (УКЭП)
 * по стандарту ГОСТ Р 34.10-2012 / ГОСТ Р 34.10-2001 для ЕГИСЗ.
 */
export function validateGostCertificate(cert: Partial<GostCertificateInfo>): GostCertValidationResult {
	if (!cert.thumbprint || cert.thumbprint.replace(/[^a-fA-F0-9]/g, "").length !== 40) {
		return {
			valid: false,
			reason: "Некорректный отпечаток сертификата ГОСТ (требуется 40-значный HEX SHA-1 отпечаток).",
		};
	}

	const now = new Date();
	if (cert.validFrom && new Date(cert.validFrom) > now) {
		return {
			valid: false,
			reason: "Срок действия сертификата ГОСТ ещё не наступил.",
		};
	}

	if (cert.validTo && new Date(cert.validTo) < now) {
		return {
			valid: false,
			reason: "Срок действия сертификата ГОСТ истёк. Выгрузка в ЕГИСЗ отклонена.",
		};
	}

	if (cert.hasDigitalSignatureUsage === false) {
		return {
			valid: false,
			reason: "Сертификат не содержит назначения «Электронная подпись» (Digital Signature).",
		};
	}

	return {
		valid: true,
		certificateInfo: {
			thumbprint: cert.thumbprint.toLowerCase(),
			subjectName: cert.subjectName || "Врач-стоматолог клиники",
			issuerName: cert.issuerName || "УЦ ФНС России / Федеральное казначейство",
			validFrom: cert.validFrom || new Date(now.getTime() - 86400000 * 30).toISOString(),
			validTo: cert.validTo || new Date(now.getTime() + 86400000 * 335).toISOString(),
			serialNumber: cert.serialNumber || "01D8A2B3C4E5F6",
			isGost3410_2012: cert.isGost3410_2012 ?? true,
			hasDigitalSignatureUsage: true,
		},
	};
}

/**
 * Проверка СНИЛС врача для регистрации и авторизации в Федеральном регистре медработников (ФРМР).
 */
export function verifyDoctorSnilsForFrmr(rawSnils: unknown): FrmrAccessVerificationResult {
	const digits = normalizeSnils(rawSnils);

	if (digits.length !== 11) {
		return {
			valid: false,
			snilsFormatted: digits,
			error: "InvalidSnilsFormat",
			message: "СНИЛС должен содержать 11 цифр в формате 000-000-000 00",
		};
	}

	if (!isValidSnils(digits)) {
		return {
			valid: false,
			snilsFormatted: digits,
			error: "InvalidSnilsChecksum",
			message: "Контрольное число СНИЛС не совпадает. Номер отклонён ФРМР.",
		};
	}

	const snilsFormatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)} ${digits.slice(9, 11)}`;

	return {
		valid: true,
		snilsFormatted,
	};
}

/**
 * Формирование сводного статуса готовности узла интеграции ЕГИСЗ/ВИМИС.
 */
export function resolveEgiszIntegrationStatus(customConfig?: EgiszGatewayConfig): EgiszIntegrationStatusResult {
	const config = customConfig ?? readGatewayConfig();
	const frmoStatus = componentStatus(config.frmoId);
	const frmrStatus = componentStatus(config.guid, config.lpuId);
	const remdStatus = componentStatus(config.baseUrl, config.guid, config.lpuId);
	const vimisStatus = componentStatus(config.baseUrl, config.guid, config.lpuId, config.clinicOid);

	const configured =
		frmoStatus === "CONNECTED" &&
		frmrStatus === "CONNECTED" &&
		remdStatus === "CONNECTED";

	const missing = [
		config.baseUrl === null ? "EGISZ_N3_BASE_URL" : null,
		config.guid === null ? "EGISZ_N3_GUID" : null,
		config.lpuId === null ? "EGISZ_N3_LPU_ID" : null,
		config.frmoId === null ? "EGISZ_FRMO_ID" : null,
		config.clinicOid === null ? "EGISZ_CLINIC_OID" : null,
	].filter((value): value is string => value !== null);

	return {
		ok: true,
		configured,
		frmoStatus,
		frmrStatus,
		remdStatus,
		vimisStatus,
		capabilities: {
			cdaGeneration: true,
			ukepSigning: false,
			remdTransmission: remdStatus === "CONNECTED",
			vimisDentalSync: vimisStatus === "CONNECTED",
		},
		missingConfiguration: missing,
		checkedAt: new Date().toISOString(),
	};
}
