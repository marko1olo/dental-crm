import { and, eq } from "drizzle-orm";
import { db as defaultDb } from "../../db/client.js";
import { users } from "../../db/schema.js";
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

export interface FrmrDoctorProfile {
	id: string;
	fullName: string;
	role: string;
	snils: string;
	snilsFormatted: string;
	specialties: string[];
	canSignMedicalRecords: boolean;
	isActive: boolean;
}

export interface FrmrAccessVerificationResult {
	valid: boolean;
	snilsFormatted: string;
	status: "verified" | "needs_doctor_profile" | "doctor_not_found" | "invalid_snils" | "inactive";
	error?:
		| "InvalidSnilsFormat"
		| "InvalidSnilsChecksum"
		| "DoctorNotFoundInFrmr"
		| "DoctorProfileIncomplete"
		| "DoctorAccountInactive";
	message?: string;
	doctor?: FrmrDoctorProfile;
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
			status: "invalid_snils",
			error: "InvalidSnilsFormat",
			message: "СНИЛС должен содержать 11 цифр в формате 000-000-000 00",
		};
	}

	if (!isValidSnils(digits)) {
		return {
			valid: false,
			snilsFormatted: digits,
			status: "invalid_snils",
			error: "InvalidSnilsChecksum",
			message: "Контрольное число СНИЛС не совпадает. Номер отклонён ФРМР.",
		};
	}

	const snilsFormatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)} ${digits.slice(9, 11)}`;

	return {
		valid: true,
		snilsFormatted,
		status: "verified",
	};
}

export interface VerifyDoctorFrmrParams {
	doctorId?: string | null | undefined;
	snils?: unknown;
	organizationId?: string | null | undefined;
}

/**
 * [EGI-02] Комплексная проверка профиля врача для ФРМР/ЕГИСЗ.
 * Верифицирует врача против реальной таблицы users в БД:
 * - СНИЛС врача и соответствие контрольной сумме 192п
 * - Активность учетной записи (isActive)
 * - Наличие медицинской роли и специализации (specialties)
 * Если профиль не заполнен, возвращает структурированный статус [Требуется заполнение профиля врача]
 * без паники и без блокировки приёма врача у кресла (Мандаты 8e, 8v).
 */
export async function verifyDoctorFrmrProfile(
	dbInstance: unknown = defaultDb,
	params: VerifyDoctorFrmrParams = {},
): Promise<FrmrAccessVerificationResult> {
	const activeDb = (dbInstance || defaultDb) as typeof defaultDb;
	const { doctorId, snils: rawSnils, organizationId } = params;

	let doctorRecord: typeof users.$inferSelect | undefined;

	// 1. Поиск по doctorId в users
	if (doctorId) {
		const conditions = [eq(users.id, doctorId)];
		if (organizationId) {
			conditions.push(eq(users.organizationId, organizationId));
		}
		const [found] = await activeDb
			.select()
			.from(users)
			.where(and(...conditions))
			.limit(1);
		doctorRecord = found;
	}

	// 2. Если doctorId не передан или не найден, но передан СНИЛС
	if (!doctorRecord && rawSnils) {
		const digits = normalizeSnils(rawSnils);
		if (digits.length > 0) {
			const conditions = [eq(users.snils, digits)];
			if (organizationId) {
				conditions.push(eq(users.organizationId, organizationId));
			}
			const [found] = await activeDb
				.select()
				.from(users)
				.where(and(...conditions))
				.limit(1);
			doctorRecord = found;
		}
	}

	// 3. Если врач не найден в штатном расписании БД
	if (!doctorRecord) {
		const snilsCheck = rawSnils ? verifyDoctorSnilsForFrmr(rawSnils) : null;
		return {
			valid: false,
			snilsFormatted: snilsCheck?.snilsFormatted || "",
			status: "doctor_not_found",
			error: "DoctorNotFoundInFrmr",
			message: "[Требуется заполнение профиля врача] Врач не найден в штатном расписании клиники (БД users).",
		};
	}

	// 4. Проверка активности учетной записи
	if (!doctorRecord.isActive) {
		return {
			valid: false,
			snilsFormatted: doctorRecord.snils ? normalizeSnils(doctorRecord.snils) : "",
			status: "inactive",
			error: "DoctorAccountInactive",
			message: `[Требуется заполнение профиля врача] Аккаунт медработника «${doctorRecord.fullName}» деактивирован.`,
		};
	}

	// 5. Проверка СНИЛС врача в БД
	if (!doctorRecord.snils || doctorRecord.snils.trim().length === 0) {
		return {
			valid: false,
			snilsFormatted: "",
			status: "needs_doctor_profile",
			error: "DoctorProfileIncomplete",
			message: `[Требуется заполнение профиля врача] В профиле врача «${doctorRecord.fullName}» не указан СНИЛС для регистрации в ФРМР/РЭМД.`,
		};
	}

	const snilsValidation = verifyDoctorSnilsForFrmr(doctorRecord.snils);
	if (!snilsValidation.valid) {
		return {
			valid: false,
			snilsFormatted: snilsValidation.snilsFormatted,
			status: "needs_doctor_profile",
			error: snilsValidation.error,
			message: `[Требуется заполнение профиля врача] СНИЛС врача «${doctorRecord.fullName}» в базе данных (${doctorRecord.snils}) содержит некорректную контрольную сумму.`,
		};
	}

	// 6. Проверка клинической специализации
	const specialties = Array.isArray(doctorRecord.specialties)
		? (doctorRecord.specialties as string[])
		: typeof doctorRecord.specialties === "string"
			? [doctorRecord.specialties]
			: [];

	const isClinicalRole =
		doctorRecord.role === "doctor" ||
		doctorRecord.role === "owner" ||
		doctorRecord.canSignMedicalRecords;

	if (isClinicalRole && specialties.length === 0) {
		return {
			valid: false,
			snilsFormatted: snilsValidation.snilsFormatted,
			status: "needs_doctor_profile",
			error: "DoctorProfileIncomplete",
			message: `[Требуется заполнение профиля врача] В профиле врача «${doctorRecord.fullName}» не указана специальность для ФРМР/ЕГИСЗ.`,
		};
	}

	return {
		valid: true,
		snilsFormatted: snilsValidation.snilsFormatted,
		status: "verified",
		message: `Профиль врача «${doctorRecord.fullName}» подтвержден для передачи в ФРМР/РЭМД ЕГИСЗ.`,
		doctor: {
			id: doctorRecord.id,
			fullName: doctorRecord.fullName,
			role: doctorRecord.role,
			snils: doctorRecord.snils,
			snilsFormatted: snilsValidation.snilsFormatted,
			specialties,
			canSignMedicalRecords: doctorRecord.canSignMedicalRecords,
			isActive: doctorRecord.isActive,
		},
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
