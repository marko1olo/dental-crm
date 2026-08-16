/**
 * PiiAnonymizationVault.ts — Сервис обезличивания, маскирования и криптографического удаления ПДн (152-ФЗ / 54-ФЗ / 402-ФЗ).
 *
 * Feature #96 (FEATURES_REGISTRY.md): «Обезличивание персональных данных (152-ФЗ),
 * маскирование ПДн при экспорте и криптографическое удаление по заявлению субъекта».
 *
 * ЮРИДИЧЕСКИЙ И НОРМАТИВНЫЙ БАЗИС:
 * 1. 152-ФЗ «О персональных данных», ст. 21, ч. 4 и 5:
 *    При отзыве субъектом согласия на обработку ПДн оператор обязан прекратить их обработку
 *    и уничтожить (или необратимо обезличить) данные в срок, не превышающий 30 дней.
 * 2. 54-ФЗ «О применении контрольно-кассовой техники» & 402-ФЗ «О бухгалтерском учете»:
 *    Первичные учетные документы, фискальные чеки и кассовые регистры обязаны храниться
 *    не менее 5 лет для налогового контроля. Полное удаление фискальных транзакций недопустимо.
 *    Решение: Crypto-shredding ПДн плательщика с сохранением неизменных фискальных сумм и признаков.
 * 3. 323-ФЗ «Об основах охраны здоровья граждан в РФ»:
 *    Обезличивание медицинской документации для статистического учета и экспертизы качества.
 *
 * АРХИТЕКТУРНЫЕ ПРИНЦИПЫ:
 * - Zero Mocks / Production Ready: полностью готовый к эксплуатации криптографический сервис.
 * - Deterministic Pseudonymization: HMAC-SHA256 с солью организации для безопасных связей без раскрытия ПДн.
 * - Constant-Time Verification: защита от Timing Attacks при верификации сертификатов уничтожения.
 * - Fail Safe & Idempotent: устойчивость к null/undefined, невалидным форматам и повторным вызовам.
 */

import crypto from "node:crypto";

// ============================================================================
// 1. ТИПЫ И КОНСТРАКТЫ ДАННЫХ
// ============================================================================

export type FullNameMaskStyle =
	| "initials" // "Иванов И. И."
	| "redacted" // "И****в И. И." (или "И*****в И. И.")
	| "asterisks" // "И****в"
	| "initials_only"; // "И. И."

export interface FullNameMaskOptions {
	/** Стиль маскирования (по умолчанию 'initials') */
	readonly style?: FullNameMaskStyle | undefined;
	/** Символ маскирования (по умолчанию '*') */
	readonly maskChar?: string | undefined;
	/** Сохранять ли инициалы имени и отчества */
	readonly preserveInitials?: boolean | undefined;
	/** Фиксированное количество символов маски (если задано) */
	readonly fixedMaskLength?: number | undefined;
}

export interface PhoneMaskOptions {
	/** Символ маскирования (по умолчанию '*') */
	readonly maskChar?: string | undefined;
	/** Стандартный код страны (по умолчанию '+7') */
	readonly countryCode?: string | undefined;
	/** Форматировать ли в каноничный вид '+7 (XXX) ***-**-YY' */
	readonly formatStandard?: boolean | undefined;
}

export interface SnilsMaskOptions {
	/** Символ маскирования (по умолчанию '*') */
	readonly maskChar?: string | undefined;
	/** Количество открытых цифр в конце (по умолчанию 2) */
	readonly showLastDigits?: number | undefined;
}

export interface PassportMaskOptions {
	/** Символ маскирования (по умолчанию '*') */
	readonly maskChar?: string | undefined;
	/** Показывать ли последние N цифр номера (по умолчанию 3) */
	readonly showLastDigits?: number | undefined;
	/** Показывать ли код региона (первые 2 цифры серии) */
	readonly showRegionCode?: boolean | undefined;
}

export interface EmailMaskOptions {
	/** Символ маскирования (по умолчанию '*') */
	readonly maskChar?: string | undefined;
	/** Сохранять ли доменную часть полностью */
	readonly preserveDomain?: boolean | undefined;
}

export type ExportSanitizerProfile =
	| "standard_mask" // ФИО с инициалами, телефон маскирован, паспорт/СНИЛС скрыты
	| "strong_redaction" // ФИО со звездочками, строгая маскировка всех идентификаторов
	| "pseudonymized" // Все идентификаторы заменены на HMAC-псевдонимы
	| "statistical_anonymization"; // Полное удаление ПДн для клинической статистики

export interface ExportSanitizerOptions {
	/** Профиль маскирования (по умолчанию 'standard_mask') */
	readonly profile?: ExportSanitizerProfile | undefined;
	/** Соль клиники для профиля 'pseudonymized' */
	readonly clinicSalt?: string | undefined;
	/** Стиль маскирования ФИО */
	readonly maskStyle?: FullNameMaskStyle | undefined;
}

/**
 * Входные данные пациента для процедуры крипто-уничтожения.
 */
export interface PatientRecordForShredding {
	readonly id: string;
	readonly organizationId: string;
	readonly fullName: string;
	readonly birthDate?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly email?: string | null | undefined;
	readonly notes?: string | null | undefined;
	readonly administrativeProfile?: Record<string, unknown> | null | undefined;
	readonly familyGroupId?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly passportSeries?: string | null | undefined;
	readonly passportNumber?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly status?: string | undefined;
	readonly version?: number | undefined;
	readonly [key: string]: unknown;
}

/**
 * Бухгалтерская / кассовая запись (54-ФЗ) для процедуры крипто-уничтожения.
 */
export interface PaymentRecordForShredding {
	readonly id: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly visitId?: string | null | undefined;
	readonly documentId?: string | null | undefined;
	readonly clientMutationId?: string | null | undefined;
	readonly amountRub: number;
	readonly method: string;
	readonly status: string;
	readonly paidAt: Date | string;
	readonly fiscalReceiptNumber?: string | null | undefined;
	readonly fiscalReceiptIssuedAt?: string | null | undefined;
	readonly fiscalReceiptUrl?: string | null | undefined;
	readonly fiscalReceipt?: Record<string, unknown> | null | undefined;
	readonly payerFullName?: string | null | undefined;
	readonly payerInn?: string | null | undefined;
	readonly payerBirthDate?: string | null | undefined;
	readonly payerIdentityDocument?: string | null | undefined;
	readonly payerRelationship?: string | null | undefined;
	readonly taxDeductionCode?: string | null | undefined;
	readonly note?: string | null | undefined;
	readonly createdAt?: Date | string | undefined;
	readonly updatedAt?: Date | string | undefined;
	readonly [key: string]: unknown;
}

/**
 * Обезличенная запись пациента после Crypto-shredding.
 */
export interface AnonymizedPatientRecord {
	readonly id: string;
	readonly organizationId: string;
	readonly fullName: string;
	readonly birthDate: string | null;
	readonly phone: null;
	readonly email: null;
	readonly notes: null;
	readonly administrativeProfile: null;
	readonly familyGroupId: null;
	readonly snils: null;
	readonly passportSeries: null;
	readonly passportNumber: null;
	readonly address: null;
	readonly status: "archived";
	readonly isAnonymized: true;
	readonly anonymizedAt: string;
	readonly version: number;
	readonly pseudonym: string;
}

/**
 * Обезличенная бухгалтерская запись (54-ФЗ), сохраненная для налогового учета.
 */
export interface AnonymizedPaymentRecord {
	readonly id: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly visitId: string | null;
	readonly documentId: string | null;
	readonly clientMutationId: string | null;
	readonly amountRub: number;
	readonly method: string;
	readonly status: string;
	readonly paidAt: string;
	readonly fiscalReceiptNumber: string | null;
	readonly fiscalReceiptIssuedAt: string | null;
	readonly fiscalReceiptUrl: string | null;
	readonly fiscalReceipt: Record<string, unknown> | null;
	readonly payerFullName: string;
	readonly payerInn: string | null;
	readonly payerBirthDate: null;
	readonly payerIdentityDocument: null;
	readonly payerRelationship: null;
	readonly taxDeductionCode: string | null;
	readonly note: null;
	readonly isAnonymized: true;
	readonly anonymizedAt: string;
}

/**
 * Криптографический Акт (Сертификат) об уничтожении / обезличивании ПДн по 152-ФЗ.
 */
export interface CryptoShreddingCertificate {
	readonly certificateId: string;
	readonly statute: string;
	readonly patientId: string;
	readonly organizationId: string;
	readonly pseudonym: string;
	readonly shreddedFields: readonly string[];
	readonly retained54FzRecordCount: number;
	readonly shreddedAt: string;
	readonly reason: string;
	readonly operatorUserId: string;
	readonly operatorFullName: string;
	readonly complianceStandards: readonly string[];
	readonly cryptographicProofSignature: string;
}

/**
 * Параметры операции криптографического удаления.
 */
export interface CryptoShredParams {
	readonly patient: PatientRecordForShredding;
	readonly payments?: readonly PaymentRecordForShredding[] | undefined;
	readonly clinicSalt: string;
	readonly reason?: string | undefined;
	readonly operatorUserId?: string | undefined;
	readonly operatorFullName?: string | undefined;
	readonly anonymizedAt?: Date | string | undefined;
	readonly retainEpidemiologicalYear?: boolean | undefined;
}

/**
 * Результат выполнения процедуры криптографического удаления.
 */
export interface CryptoShredResult {
	readonly anonymizedPatient: AnonymizedPatientRecord;
	readonly anonymizedPayments: readonly AnonymizedPaymentRecord[];
	readonly certificate: CryptoShreddingCertificate;
}

// ============================================================================
// 2. СЕРВИСНЫЙ КЛАСС PiiAnonymizationVault
// ============================================================================

export class PiiAnonymizationVault {
	public static readonly ANONYMIZED_FULL_NAME_MARKER = "ОБЕЗЛИЧЕНО (152-ФЗ)";
	public static readonly ANONYMIZED_PAYER_NAME_MARKER = "ФЛ (152-ФЗ обезличено)";
	public static readonly STATUTE_REFERENCE = "152-FZ, Art. 21 / 54-FZ / 402-FZ / 323-FZ";

	public static readonly DEFAULT_SHREDDED_FIELDS: readonly string[] = [
		"fullName",
		"phone",
		"email",
		"birthDate",
		"notes",
		"administrativeProfile",
		"familyGroupId",
		"snils",
		"passportSeries",
		"passportNumber",
		"address",
		"payerFullName",
		"payerInn",
		"payerBirthDate",
		"payerIdentityDocument",
		"payerRelationship",
		"note",
	] as const;

	public static readonly COMPLIANCE_STANDARDS: readonly string[] = [
		"152-FZ",
		"54-FZ",
		"402-FZ",
		"323-FZ",
	] as const;

	// --------------------------------------------------------------------------
	// 2.1. МАСКИРОВАНИЕ ФИО
	// --------------------------------------------------------------------------

	/**
	 * Маскирование ФИО пациента или сотрудника.
	 *
	 * Стили:
	 * - 'initials': "Иванов Иван Иванович" -> "Иванов И. И."
	 * - 'redacted': "И****в И. И." (или "И*****в И. И.")
	 * - 'asterisks': "И****в"
	 * - 'initials_only': "И. И."
	 */
	public static maskFullName(
		fullName: string | null | undefined,
		options: FullNameMaskOptions = {},
	): string {
		if (!fullName || typeof fullName !== "string") {
			return "";
		}

		const trimmed = fullName.trim().replace(/\s+/g, " ");
		if (!trimmed) {
			return "";
		}

		const style = options.style ?? "initials";
		const maskChar = options.maskChar ?? "*";
		const fixedMaskLen = options.fixedMaskLength;
		const parts = trimmed.split(" ");

		if (parts.length === 0) {
			return "";
		}

		const firstPart = parts[0];
		if (!firstPart) {
			return "";
		}

		// Обработка одного слова (только фамилия / никнейм)
		if (parts.length === 1) {
			if (style === "initials" || style === "initials_only") {
				return firstPart;
			}
			return this.redactWord(firstPart, maskChar, fixedMaskLen);
		}

		const lastName: string = firstPart;
		const firstNames = parts.slice(1);

		// Формирование инициалов
		const initials = firstNames
			.filter((part): part is string => typeof part === "string" && part.length > 0)
			.map((part) => `${part.charAt(0).toUpperCase()}.`)
			.join(" ");

		switch (style) {
			case "initials":
				return initials ? `${lastName} ${initials}` : lastName;

			case "redacted": {
				const redactedSurname = this.redactWord(lastName, maskChar, fixedMaskLen);
				return initials ? `${redactedSurname} ${initials}` : redactedSurname;
			}

			case "asterisks":
				return this.redactWord(lastName, maskChar, fixedMaskLen);

			case "initials_only":
				return initials || `${lastName.charAt(0).toUpperCase()}.`;

			default:
				return initials ? `${lastName} ${initials}` : lastName;
		}
	}

	/**
	 * Сокращенный алиас для маскирования ФИО до инициалов: "Иванов Иван Иванович" -> "Иванов И. И."
	 */
	public static maskFullNameInitials(fullName: string | null | undefined): string {
		return this.maskFullName(fullName, { style: "initials" });
	}

	/**
	 * Сокращенный алиас для строгого маскирования ФИО: "Иванов Иван Иванович" -> "И****в И. И."
	 */
	public static maskFullNameRedacted(
		fullName: string | null | undefined,
		maskChar = "*",
		fixedMaskLength?: number | undefined,
	): string {
		const opts: FullNameMaskOptions = {
			style: "redacted",
			maskChar,
			fixedMaskLength,
		};
		return this.maskFullName(fullName, opts);
	}

	/**
	 * Вспомогательное маскирование одного слова/фамилии (в т.ч. с дефисом: Мамин-Сибиряк -> М***н-С*****к).
	 */
	private static redactWord(
		word: string,
		maskChar: string,
		fixedMaskLength?: number | undefined,
	): string {
		if (!word) return "";
		if (word.includes("-")) {
			return word
				.split("-")
				.map((subWord) => this.redactSingleWord(subWord, maskChar, fixedMaskLength))
				.join("-");
		}
		return this.redactSingleWord(word, maskChar, fixedMaskLength);
	}

	private static redactSingleWord(
		word: string,
		maskChar: string,
		fixedMaskLength?: number | undefined,
	): string {
		const len = word.length;
		if (len <= 1) {
			return maskChar;
		}
		if (len === 2) {
			return `${word.charAt(0)}${maskChar}`;
		}
		const first = word.charAt(0);
		const last = word.charAt(len - 1);
		const maskCount =
			typeof fixedMaskLength === "number" && fixedMaskLength > 0
				? fixedMaskLength
				: Math.max(1, len - 2);
		const middleMask = maskChar.repeat(maskCount);
		return `${first}${middleMask}${last}`;
	}

	// --------------------------------------------------------------------------
	// 2.2. МАСКИРОВАНИЕ ТЕЛЕФОНА
	// --------------------------------------------------------------------------

	/**
	 * Маскирование номера телефона.
	 * Примеры:
	 * - "+7 (999) 123-45-67" -> "+7 (999) ***-**-67"
	 * - "89991234567" -> "+7 (999) ***-**-67"
	 * - "79991234567" -> "+7 (999) ***-**-67"
	 * - "+79991234567" -> "+7 (999) ***-**-67"
	 */
	public static maskPhoneNumber(
		phone: string | null | undefined,
		options: PhoneMaskOptions = {},
	): string {
		if (!phone || typeof phone !== "string") {
			return "";
		}

		const maskChar = options.maskChar ?? "*";
		const digits = phone.replace(/\D/g, "");

		if (!digits) {
			return "";
		}

		// 11 цифр (РФ: 7 или 8 в начале)
		if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
			const areaCode = digits.slice(1, 4); // 999
			const lastTwo = digits.slice(9, 11); // 67
			const maskMiddle = `${maskChar.repeat(3)}-${maskChar.repeat(2)}`;
			return `+7 (${areaCode}) ${maskMiddle}-${lastTwo}`;
		}

		// 10 цифр (без префикса страны)
		if (digits.length === 10) {
			const areaCode = digits.slice(0, 3);
			const lastTwo = digits.slice(8, 10);
			const maskMiddle = `${maskChar.repeat(3)}-${maskChar.repeat(2)}`;
			return `+7 (${areaCode}) ${maskMiddle}-${lastTwo}`;
		}

		// Нестандартный номер: сохраняем префикс (до 4 цифр) и последние 2 цифры
		if (digits.length > 4) {
			const prefixLen = Math.min(3, Math.floor(digits.length / 3));
			const prefix = digits.slice(0, prefixLen);
			const suffix = digits.slice(-2);
			const maskedCount = digits.length - prefixLen - 2;
			return `+${prefix} ${maskChar.repeat(maskedCount)}${suffix}`;
		}

		// Слишком короткий номер
		return maskChar.repeat(digits.length);
	}

	// --------------------------------------------------------------------------
	// 2.3. ХЕШИРОВАНИЕ И ПСЕВДОНИМИЗАЦИЯ СНИЛС И ПАСПОРТА (HMAC-SHA256)
	// --------------------------------------------------------------------------

	/**
	 * Хеширование / псевдонимизация СНИЛС через HMAC-SHA256 с солью клиники.
	 * Нормализует строку (только 11 цифр).
	 */
	public static hashSnils(
		snils: string | null | undefined,
		clinicSalt: string,
	): string {
		if (!snils || typeof snils !== "string") {
			throw new Error("PiiAnonymizationVault: SNILS value is required for hashing");
		}
		if (!clinicSalt || typeof clinicSalt !== "string" || clinicSalt.length < 8) {
			throw new Error(
				"PiiAnonymizationVault: Valid clinicSalt (min 8 chars) is required for HMAC",
			);
		}

		const normalizedDigits = snils.replace(/\D/g, "");
		if (normalizedDigits.length !== 11) {
			throw new Error(
				`PiiAnonymizationVault: Invalid SNILS format (expected 11 digits, got ${normalizedDigits.length})`,
			);
		}

		const hmacDigest = crypto
			.createHmac("sha256", clinicSalt)
			.update(`snils:${normalizedDigits}`)
			.digest("hex");

		return `snils_hmac_${hmacDigest}`;
	}

	/**
	 * Маскирование СНИЛС для вывода на экран или экспорт:
	 * "123-456-789 01" -> "***-***-*** 01"
	 */
	public static maskSnils(
		snils: string | null | undefined,
		options: SnilsMaskOptions = {},
	): string {
		if (!snils || typeof snils !== "string") {
			return "";
		}
		const digits = snils.replace(/\D/g, "");
		if (digits.length !== 11) {
			return "***-***-*** **";
		}
		const maskChar = options.maskChar ?? "*";
		const showLast = options.showLastDigits ?? 2;
		const checkDigits = digits.slice(-showLast);
		return `${maskChar.repeat(3)}-${maskChar.repeat(3)}-${maskChar.repeat(3)} ${checkDigits}`;
	}

	/**
	 * Хеширование / псевдонимизация паспортных данных РФ через HMAC-SHA256 с солью клиники.
	 * Принимает как строку ("45 15 123456"), так и объект { series, number }.
	 */
	public static hashPassport(
		passport:
			| string
			| { series?: string | null | undefined; number?: string | null | undefined }
			| null
			| undefined,
		clinicSalt: string,
	): string {
		if (!passport) {
			throw new Error(
				"PiiAnonymizationVault: Passport value is required for hashing",
			);
		}
		if (!clinicSalt || typeof clinicSalt !== "string" || clinicSalt.length < 8) {
			throw new Error(
				"PiiAnonymizationVault: Valid clinicSalt (min 8 chars) is required for HMAC",
			);
		}

		let rawPassport = "";
		if (typeof passport === "string") {
			rawPassport = passport.replace(/\D/g, "");
		} else {
			const s = (passport.series ?? "").replace(/\D/g, "");
			const n = (passport.number ?? "").replace(/\D/g, "");
			rawPassport = `${s}${n}`;
		}

		if (rawPassport.length !== 10) {
			throw new Error(
				`PiiAnonymizationVault: Invalid Russian passport format (expected 10 digits series+number, got ${rawPassport.length})`,
			);
		}

		const hmacDigest = crypto
			.createHmac("sha256", clinicSalt)
			.update(`passport:${rawPassport}`)
			.digest("hex");

		return `passport_hmac_${hmacDigest}`;
	}

	/**
	 * Маскирование серии и номера паспорта РФ:
	 * "45 15 123456" -> "** ** ***456" (или "45 ** ***456" при showRegionCode=true)
	 */
	public static maskPassport(
		passport:
			| string
			| { series?: string | null | undefined; number?: string | null | undefined }
			| null
			| undefined,
		options: PassportMaskOptions = {},
	): string {
		if (!passport) {
			return "";
		}

		let digits = "";
		if (typeof passport === "string") {
			digits = passport.replace(/\D/g, "");
		} else {
			const s = (passport.series ?? "").replace(/\D/g, "");
			const n = (passport.number ?? "").replace(/\D/g, "");
			digits = `${s}${n}`;
		}

		if (digits.length !== 10) {
			return "** ** ******";
		}

		const maskChar = options.maskChar ?? "*";
		const showLast = options.showLastDigits ?? 3;
		const showRegion = options.showRegionCode ?? false;

		const seriesPart1 = showRegion ? digits.slice(0, 2) : maskChar.repeat(2);
		const seriesPart2 = maskChar.repeat(2);
		const numberMask = maskChar.repeat(6 - showLast);
		const numberSuffix = digits.slice(-showLast);

		return `${seriesPart1} ${seriesPart2} ${numberMask}${numberSuffix}`;
	}

	/**
	 * Универсальное детерминированное хеширование произвольного поля ПДн (Email, адрес, ОМС).
	 */
	public static hashPiiField(
		fieldValue: string | null | undefined,
		clinicSalt: string,
		domainPrefix = "pii",
	): string {
		if (!fieldValue || typeof fieldValue !== "string") {
			return "";
		}
		if (!clinicSalt || typeof clinicSalt !== "string") {
			throw new Error("PiiAnonymizationVault: clinicSalt is required");
		}
		const normalized = fieldValue.trim().toLowerCase();
		const digest = crypto
			.createHmac("sha256", clinicSalt)
			.update(`${domainPrefix}:${normalized}`)
			.digest("hex");
		return `${domainPrefix}_hmac_${digest}`;
	}

	/**
	 * Маскирование Email:
	 * "ivanov.doctor@clinic.ru" -> "i***********r@clinic.ru"
	 */
	public static maskEmail(
		email: string | null | undefined,
		options: EmailMaskOptions = {},
	): string {
		if (!email || typeof email !== "string" || !email.includes("@")) {
			return "";
		}
		const maskChar = options.maskChar ?? "*";
		const atIndex = email.indexOf("@");
		const localPart = email.slice(0, atIndex).trim();
		const domainPart = email.slice(atIndex + 1).trim();

		if (!localPart || !domainPart) {
			return "";
		}

		const redactedLocal = this.redactSingleWord(localPart, maskChar);
		return `${redactedLocal}@${domainPart}`;
	}

	/**
	 * Генерация криптографического псевдонима пациента для 152-ФЗ.
	 * Формат: ANON-152FZ-<16 HEX SIMBOLS>
	 */
	public static generatePatientPseudonym(
		patientId: string,
		clinicSalt: string,
	): string {
		if (!patientId || typeof patientId !== "string") {
			throw new Error("PiiAnonymizationVault: patientId is required");
		}
		if (!clinicSalt || typeof clinicSalt !== "string") {
			throw new Error("PiiAnonymizationVault: clinicSalt is required");
		}

		const hashPrefix = crypto
			.createHmac("sha256", clinicSalt)
			.update(`patient_pseudonym:${patientId}`)
			.digest("hex")
			.substring(0, 16)
			.toUpperCase();

		return `ANON-152FZ-${hashPrefix}`;
	}

	// --------------------------------------------------------------------------
	// 2.4. ПРОЦЕДУРА КРИПТОГРАФИЧЕСКОГО УДАЛЕНИЯ (CRYPTO-SHREDDING) ПО 152-ФЗ & 54-ФЗ
	// --------------------------------------------------------------------------

	/**
	 * Полное криптографическое удаление (Crypto-shredding) ПДн пациента с генерацией
	 * подписанного сертификата уничтожения и сохранением фискальных регистров 54-ФЗ.
	 *
	 * Что делает:
	 * 1. Необратимо затирает все прямые и косвенные ПДн (ФИО, контакты, паспорта, СНИЛС, адрес).
	 * 2. Сохраняет финансовые проводки для ФНС (суммы, даты, номера чеков, фискальные признаки).
	 * 3. Создает подписанный HMAC-SHA256 акт уничтожения персональных данных по ст. 21 152-ФЗ.
	 */
	public static cryptoShredPatientData(
		params: CryptoShredParams,
	): CryptoShredResult {
		const {
			patient,
			payments = [],
			clinicSalt,
			reason = "Заявление субъекта персональных данных об отзыве согласия (152-ФЗ ст. 21)",
			operatorUserId = "SYSTEM_SECURITY_VAULT",
			operatorFullName = "Специалист по информационной безопасности (152-ФЗ)",
			anonymizedAt = new Date().toISOString(),
			retainEpidemiologicalYear = false,
		} = params;

		if (!patient || !patient.id || !patient.organizationId) {
			throw new Error(
				"PiiAnonymizationVault: Patient record with valid id and organizationId is required",
			);
		}
		if (!clinicSalt || typeof clinicSalt !== "string" || clinicSalt.length < 8) {
			throw new Error(
				"PiiAnonymizationVault: Valid clinicSalt (min 8 characters) is required for crypto-shredding",
			);
		}

		const isoTimestamp =
			typeof anonymizedAt === "string"
				? anonymizedAt
				: anonymizedAt.toISOString();

		// 1. Создаем детерминированный псевдоним
		const pseudonym = this.generatePatientPseudonym(patient.id, clinicSalt);

		// 2. Год рождения для эпидемиологического учета (если разрешено)
		let sanitizedBirthDate: string | null = null;
		if (retainEpidemiologicalYear && patient.birthDate) {
			const match = String(patient.birthDate).match(/^(\d{4})/);
			if (match && match[1]) {
				sanitizedBirthDate = `${match[1]}-01-01`;
			}
		}

		// 3. Формируем обезличенную запись пациента
		const nextVersion = (typeof patient.version === "number" ? patient.version : 1) + 1;
		const anonymizedPatient: AnonymizedPatientRecord = {
			id: patient.id,
			organizationId: patient.organizationId,
			fullName: this.ANONYMIZED_FULL_NAME_MARKER,
			birthDate: sanitizedBirthDate,
			phone: null,
			email: null,
			notes: null,
			administrativeProfile: null,
			familyGroupId: null,
			snils: null,
			passportSeries: null,
			passportNumber: null,
			address: null,
			status: "archived",
			isAnonymized: true,
			anonymizedAt: isoTimestamp,
			version: nextVersion,
			pseudonym,
		};

		// 4. Обезличиваем бухгалтерские записи 54-ФЗ
		const anonymizedPayments: AnonymizedPaymentRecord[] = payments.map(
			(payment): AnonymizedPaymentRecord => {
				const paidAtIso =
					payment.paidAt instanceof Date
						? payment.paidAt.toISOString()
						: String(payment.paidAt);

				return {
					id: payment.id,
					organizationId: payment.organizationId,
					patientId: payment.patientId,
					visitId: payment.visitId ?? null,
					documentId: payment.documentId ?? null,
					clientMutationId: payment.clientMutationId ?? null,
					// 54-ФЗ фискальные показатели — неизменны с точностью до копейки
					amountRub: payment.amountRub,
					method: payment.method,
					status: payment.status,
					paidAt: paidAtIso,
					fiscalReceiptNumber: payment.fiscalReceiptNumber ?? null,
					fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt ?? null,
					fiscalReceiptUrl: payment.fiscalReceiptUrl ?? null,
					fiscalReceipt: payment.fiscalReceipt ? { ...payment.fiscalReceipt } : null,
					taxDeductionCode: payment.taxDeductionCode ?? null,
					// ПДн плательщика — затерты
					payerFullName: this.ANONYMIZED_PAYER_NAME_MARKER,
					payerInn: null,
					payerBirthDate: null,
					payerIdentityDocument: null,
					payerRelationship: null,
					note: null,
					isAnonymized: true,
					anonymizedAt: isoTimestamp,
				};
			},
		);

		// 5. Генерируем криптографический сертификат уничтожения
		const certificateId = crypto.randomUUID();
		const canonicalPayload = [
			certificateId,
			this.STATUTE_REFERENCE,
			patient.id,
			patient.organizationId,
			pseudonym,
			payments.length,
			isoTimestamp,
			reason,
			operatorUserId,
		].join("::");

		const proofSignature = crypto
			.createHmac("sha256", clinicSalt)
			.update(`certificate_proof:${canonicalPayload}`)
			.digest("hex");

		const certificate: CryptoShreddingCertificate = {
			certificateId,
			statute: this.STATUTE_REFERENCE,
			patientId: patient.id,
			organizationId: patient.organizationId,
			pseudonym,
			shreddedFields: this.DEFAULT_SHREDDED_FIELDS,
			retained54FzRecordCount: payments.length,
			shreddedAt: isoTimestamp,
			reason,
			operatorUserId,
			operatorFullName,
			complianceStandards: this.COMPLIANCE_STANDARDS,
			cryptographicProofSignature: proofSignature,
		};

		return {
			anonymizedPatient,
			anonymizedPayments,
			certificate,
		};
	}

	/**
	 * Верификация подлинности Сертификата об уничтожении ПДн с защитой от Timing Attacks.
	 */
	public static verifyShreddingCertificate(
		certificate: CryptoShreddingCertificate,
		clinicSalt: string,
	): boolean {
		if (!certificate || !clinicSalt) {
			return false;
		}

		try {
			const canonicalPayload = [
				certificate.certificateId,
				certificate.statute,
				certificate.patientId,
				certificate.organizationId,
				certificate.pseudonym,
				certificate.retained54FzRecordCount,
				certificate.shreddedAt,
				certificate.reason,
				certificate.operatorUserId,
			].join("::");

			const expectedSignature = crypto
				.createHmac("sha256", clinicSalt)
				.update(`certificate_proof:${canonicalPayload}`)
				.digest("hex");

			const expectedBuf = Buffer.from(expectedSignature, "utf8");
			const actualBuf = Buffer.from(certificate.cryptographicProofSignature, "utf8");

			if (expectedBuf.length !== actualBuf.length) {
				return false;
			}

			return crypto.timingSafeEqual(expectedBuf, actualBuf);
		} catch {
			return false;
		}
	}

	// --------------------------------------------------------------------------
	// 2.5. МАСКИРОВАНИЕ ПДн ДЛЯ ЭКСПОРТА (EXPORT SANITIZER)
	// --------------------------------------------------------------------------

	/**
	 * Санитизация карточки пациента для выгрузки в Excel/CSV/PDF отчеты.
	 */
	public static sanitizePatientForExport<T extends Record<string, any>>(
		patientData: T,
		options: ExportSanitizerOptions = {},
	): T {
		const profile = options.profile ?? "standard_mask";
		const salt = options.clinicSalt ?? "dente_default_export_salt_v1";
		const sanitized: Record<string, any> = { ...patientData };

		switch (profile) {
			case "standard_mask": {
				if ("fullName" in sanitized && typeof sanitized.fullName === "string") {
					sanitized.fullName = this.maskFullNameInitials(sanitized.fullName);
				}
				if ("phone" in sanitized && typeof sanitized.phone === "string") {
					sanitized.phone = this.maskPhoneNumber(sanitized.phone);
				}
				if ("email" in sanitized && typeof sanitized.email === "string") {
					sanitized.email = this.maskEmail(sanitized.email);
				}
				if ("snils" in sanitized && typeof sanitized.snils === "string") {
					sanitized.snils = this.maskSnils(sanitized.snils);
				}
				if ("passportSeries" in sanitized || "passportNumber" in sanitized) {
					sanitized.passportSeries = "** **";
					sanitized.passportNumber = "***" + String(sanitized.passportNumber ?? "").slice(-3);
				}
				break;
			}

			case "strong_redaction": {
				if ("fullName" in sanitized && typeof sanitized.fullName === "string") {
					sanitized.fullName = this.maskFullNameRedacted(sanitized.fullName);
				}
				if ("phone" in sanitized && typeof sanitized.phone === "string") {
					sanitized.phone = this.maskPhoneNumber(sanitized.phone);
				}
				if ("email" in sanitized && typeof sanitized.email === "string") {
					sanitized.email = this.maskEmail(sanitized.email);
				}
				if ("snils" in sanitized && typeof sanitized.snils === "string") {
					sanitized.snils = "***-***-*** **";
				}
				if ("passportSeries" in sanitized || "passportNumber" in sanitized) {
					sanitized.passportSeries = "** **";
					sanitized.passportNumber = "******";
				}
				break;
			}

			case "pseudonymized": {
				const pid = String(sanitized.id ?? "export_patient");
				sanitized.fullName = this.generatePatientPseudonym(pid, salt);
				if ("phone" in sanitized && sanitized.phone) {
					sanitized.phone = this.hashPiiField(sanitized.phone, salt, "phone");
				}
				if ("email" in sanitized && sanitized.email) {
					sanitized.email = this.hashPiiField(sanitized.email, salt, "email");
				}
				if ("snils" in sanitized && sanitized.snils) {
					sanitized.snils = this.hashSnils(sanitized.snils, salt);
				}
				break;
			}

			case "statistical_anonymization": {
				sanitized.fullName = this.ANONYMIZED_FULL_NAME_MARKER;
				if ("phone" in sanitized) sanitized.phone = null;
				if ("email" in sanitized) sanitized.email = null;
				if ("snils" in sanitized) sanitized.snils = null;
				if ("passportSeries" in sanitized) sanitized.passportSeries = null;
				if ("passportNumber" in sanitized) sanitized.passportNumber = null;
				if ("address" in sanitized) sanitized.address = null;
				break;
			}
		}

		return sanitized as T;
	}

	/**
	 * Санитизация массива записей для безопасного табличного экспорта.
	 */
	public static sanitizeDatasetForExport<T extends Record<string, any>>(
		dataset: readonly T[],
		options: ExportSanitizerOptions = {},
	): T[] {
		if (!Array.isArray(dataset)) {
			return [];
		}
		return dataset.map((item) => this.sanitizePatientForExport(item, options));
	}
}

/**
 * Синглтон-экземпляр сервиса.
 */
export const piiAnonymizationVault = new PiiAnonymizationVault();

/**
 * Именованный экспорт функций-утилит для быстрого прямого импорта.
 */
export const maskFullName = PiiAnonymizationVault.maskFullName.bind(PiiAnonymizationVault);
export const maskFullNameInitials = PiiAnonymizationVault.maskFullNameInitials.bind(PiiAnonymizationVault);
export const maskFullNameRedacted = PiiAnonymizationVault.maskFullNameRedacted.bind(PiiAnonymizationVault);
export const maskPhoneNumber = PiiAnonymizationVault.maskPhoneNumber.bind(PiiAnonymizationVault);
export const hashSnils = PiiAnonymizationVault.hashSnils.bind(PiiAnonymizationVault);
export const maskSnils = PiiAnonymizationVault.maskSnils.bind(PiiAnonymizationVault);
export const hashPassport = PiiAnonymizationVault.hashPassport.bind(PiiAnonymizationVault);
export const maskPassport = PiiAnonymizationVault.maskPassport.bind(PiiAnonymizationVault);
export const hashPiiField = PiiAnonymizationVault.hashPiiField.bind(PiiAnonymizationVault);
export const maskEmail = PiiAnonymizationVault.maskEmail.bind(PiiAnonymizationVault);
export const generatePatientPseudonym = PiiAnonymizationVault.generatePatientPseudonym.bind(PiiAnonymizationVault);
export const cryptoShredPatientData = PiiAnonymizationVault.cryptoShredPatientData.bind(PiiAnonymizationVault);
export const verifyShreddingCertificate = PiiAnonymizationVault.verifyShreddingCertificate.bind(PiiAnonymizationVault);
export const sanitizePatientForExport = PiiAnonymizationVault.sanitizePatientForExport.bind(PiiAnonymizationVault);
export const sanitizeDatasetForExport = PiiAnonymizationVault.sanitizeDatasetForExport.bind(PiiAnonymizationVault);
