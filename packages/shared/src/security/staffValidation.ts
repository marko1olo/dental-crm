/**
 * staffValidation.ts — Валидация реквизитов сотрудников, защита от дублирования и разграничение заметок.
 *
 * Нормативная база РФ:
 * - СНИЛС (Федеральный закон № 27-ФЗ, контрольное число ПФР/СФР, интеграция с ЕГИСЗ/ФРМР).
 * - ИНН (Приказ ФНС РФ № БГ-3-09/178, контрольные суммы для 10 и 12 знаков).
 * - Личная медицинская книжка (ЛМК / Приказ Минздрава РФ № 29н, ежегодный медосмотр и санминимум).
 * - Периодическая аккредитация специалистов Минздрава РФ (Приказ № 709н, 5-летний цикл непрерывного медицинского образования).
 * - Защита от дублей персонала по СНИЛС, ИНН, email и телефону.
 * - Разделение клинических комментариев и внутренних заметок руководства (доступ только у Главврача и Директора).
 */

import { z } from "zod";

export const staffRoleEnumValues = [
	"owner",
	"doctor",
	"administrator",
	"assistant",
	"manager",
	"curator",
] as const;
export const staffRoleSchema = z.enum(staffRoleEnumValues);

export const dentalSpecialtyEnumValues = [
	"therapist",
	"orthopedist",
	"surgeon",
	"orthodontist",
	"periodontist",
	"pediatric",
	"hygienist",
	"implantologist",
	"radiologist",
	"universal",
	"general",
] as const;
export const dentalSpecialtySchema = z.enum(dentalSpecialtyEnumValues);

/**
 * Очистка строки от нечисловых символов
 */
export function cleanStaffDigits(raw: string | null | undefined): string {
	return String(raw ?? "").replace(/\D/g, "");
}

/**
 * Форматирование СНИЛС: XXX-XXX-XXX YY
 */
export function formatStaffSnils(raw: string | null | undefined): string {
	const digits = cleanStaffDigits(raw);
	if (digits.length === 0) return "";
	if (digits.length <= 3) return digits;
	if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
	if (digits.length <= 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
	return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)} ${digits.slice(9, 11)}`;
}

/**
 * Валидация СНИЛС по алгоритму ПФР / СФР / ЕГИСЗ
 */
export function validateStaffSnils(raw: string | null | undefined): {
	isValid: boolean;
	formatted: string;
	error?: string;
} {
	const digits = cleanStaffDigits(raw);
	if (!digits) {
		return { isValid: false, formatted: "", error: "СНИЛС не указан" };
	}
	if (digits.length !== 11) {
		return {
			isValid: false,
			formatted: formatStaffSnils(digits),
			error: `СНИЛС должен содержать ровно 11 цифр (введено ${digits.length})`,
		};
	}

	// СНИЛС номеров до 001-001-998 не имеют контрольного числа
	const numberPart = Number.parseInt(digits.slice(0, 9), 10);
	if (numberPart <= 1001998) {
		return { isValid: true, formatted: formatStaffSnils(digits) };
	}

	// Расчет контрольного числа
	let checkSum = 0;
	for (let i = 0; i < 9; i++) {
		const charVal = digits[i];
		const digitNum = charVal ? Number.parseInt(charVal, 10) : 0;
		checkSum += digitNum * (9 - i);
	}

	let expectedCheckDigit = 0;
	if (checkSum < 100) {
		expectedCheckDigit = checkSum;
	} else if (checkSum === 100 || checkSum === 101) {
		expectedCheckDigit = 0;
	} else {
		const rem = checkSum % 101;
		expectedCheckDigit = rem === 100 || rem === 101 ? 0 : rem;
	}

	const actualCheckDigit = Number.parseInt(digits.slice(9, 11), 10);
	if (expectedCheckDigit !== actualCheckDigit) {
		return {
			isValid: false,
			formatted: formatStaffSnils(digits),
			error: `Неверное контрольное число СНИЛС (ожидалось ${String(expectedCheckDigit).padStart(2, "0")}, указано ${String(actualCheckDigit).padStart(2, "0")})`,
		};
	}

	return { isValid: true, formatted: formatStaffSnils(digits) };
}

/**
 * Форматирование ИНН с группировкой цифр для удобства чтения
 */
export function formatStaffInn(raw: string | null | undefined): string {
	const digits = cleanStaffDigits(raw);
	if (!digits) return "";
	if (digits.length === 12) {
		return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
	}
	if (digits.length === 10) {
		return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
	}
	return digits;
}

/**
 * Валидация ИНН (10 цифр для юрлиц, 12 цифр для физлиц / врачей / ИП)
 */
export function validateStaffInn(raw: string | null | undefined): {
	isValid: boolean;
	formatted: string;
	type?: "individual" | "legal_entity";
	error?: string;
} {
	const digits = cleanStaffDigits(raw);
	if (!digits) {
		return { isValid: false, formatted: "", error: "ИНН не указан" };
	}

	if (digits.length !== 10 && digits.length !== 12) {
		return {
			isValid: false,
			formatted: digits,
			error: `ИНН должен содержать 10 или 12 цифр (введено ${digits.length})`,
		};
	}

	if (digits.length === 10) {
		const coeffs = [2, 4, 10, 3, 5, 9, 4, 6, 8];
		let sum = 0;
		for (let i = 0; i < 9; i++) {
			const charVal = digits[i];
			const digitNum = charVal ? Number.parseInt(charVal, 10) : 0;
			const coeff = coeffs[i] ?? 0;
			sum += digitNum * coeff;
		}
		const checkDigit = (sum % 11) % 10;
		const checkChar = digits[9];
		const expectedDigit = checkChar ? Number.parseInt(checkChar, 10) : -1;
		if (checkDigit !== expectedDigit) {
			return {
				isValid: false,
				formatted: digits,
				type: "legal_entity",
				error: "Контрольное число 10-значного ИНН не совпадает",
			};
		}
		return { isValid: true, formatted: digits, type: "legal_entity" };
	}

	// 12-значный ИНН физлица / врача
	const coeffs11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
	let sum11 = 0;
	for (let i = 0; i < 10; i++) {
		const charVal = digits[i];
		const digitNum = charVal ? Number.parseInt(charVal, 10) : 0;
		const coeff = coeffs11[i] ?? 0;
		sum11 += digitNum * coeff;
	}
	const checkDigit11 = (sum11 % 11) % 10;

	const coeffs12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
	let sum12 = 0;
	for (let i = 0; i < 11; i++) {
		const charVal = digits[i];
		const digitNum = charVal ? Number.parseInt(charVal, 10) : 0;
		const coeff = coeffs12[i] ?? 0;
		sum12 += digitNum * coeff;
	}
	const checkDigit12 = (sum12 % 11) % 10;

	const char10 = digits[10];
	const actualDigit11 = char10 ? Number.parseInt(char10, 10) : -1;
	const char11 = digits[11];
	const actualDigit12 = char11 ? Number.parseInt(char11, 10) : -1;

	if (checkDigit11 !== actualDigit11 || checkDigit12 !== actualDigit12) {
		return {
			isValid: false,
			formatted: digits,
			type: "individual",
			error: "Контрольные суммы 12-значного ИНН физлица не совпадают",
		};
	}

	return { isValid: true, formatted: digits, type: "individual" };
}


/**
 * Валидация Личной медицинской книжки (ЛМК)
 */
export function validateMedicalBook(
	medicalBookNumber: string | null | undefined,
	checkupDate?: string | null,
): {
	isValid: boolean;
	status: "valid" | "expiring_soon" | "expired" | "not_provided";
	daysUntilCheckup?: number;
	message: string;
} {
	const num = String(medicalBookNumber ?? "").trim();
	if (!num) {
		return {
			isValid: false,
			status: "not_provided",
			message: "Медкнижка не внесена в систему",
		};
	}

	if (!checkupDate) {
		return {
			isValid: true,
			status: "valid",
			message: `Медкнижка № ${num} внесена (дата следующего медосмотра не указана)`,
		};
	}

	const date = new Date(checkupDate);
	if (Number.isNaN(date.getTime())) {
		return {
			isValid: false,
			status: "not_provided",
			message: "Некорректный формат даты медосмотра (требуется ГГГГ-ММ-ДД)",
		};
	}

	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	if (daysRemaining < 0) {
		return {
			isValid: false,
			status: "expired",
			daysUntilCheckup: daysRemaining,
			message: `Медосмотр просрочен на ${Math.abs(daysRemaining)} дн. Допуск к приёму приостановлен (СанПиН).`,
		};
	}

	if (daysRemaining <= 30) {
		return {
			isValid: true,
			status: "expiring_soon",
			daysUntilCheckup: daysRemaining,
			message: `Срок действия медосмотра истекает через ${daysRemaining} дн. Направьте сотрудника на обследование.`,
		};
	}

	return {
		isValid: true,
		status: "valid",
		daysUntilCheckup: daysRemaining,
		message: `Медосмотр действителен ещё ${daysRemaining} дн. (до ${date.toLocaleDateString("ru-RU")}).`,
	};
}

/**
 * Валидация периодической аккредитации Минздрава РФ (срок действия 5 лет)
 */
export function validateMinzdravAccreditation(accreditationDate?: string | null): {
	isValid: boolean;
	status: "valid" | "expiring_soon" | "expired" | "not_accredited";
	daysRemaining: number;
	expiryDate: string | null;
	message: string;
} {
	if (!accreditationDate) {
		return {
			isValid: false,
			status: "not_accredited",
			daysRemaining: 0,
			expiryDate: null,
			message: "Сведения об аккредитации Минздрава РФ отсутствуют",
		};
	}

	const issuedDate = new Date(accreditationDate);
	if (Number.isNaN(issuedDate.getTime())) {
		return {
			isValid: false,
			status: "not_accredited",
			daysRemaining: 0,
			expiryDate: null,
			message: "Некорректная дата выдачи аккредитации",
		};
	}

	// Действует 5 лет
	const expiry = new Date(issuedDate);
	expiry.setFullYear(expiry.getFullYear() + 5);

	const now = new Date();
	const diffMs = expiry.getTime() - now.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	const formattedExpiry = expiry.toLocaleDateString("ru-RU");

	if (daysRemaining < 0) {
		return {
			isValid: false,
			status: "expired",
			daysRemaining,
			expiryDate: expiry.toISOString(),
			message: `Аккредитация Минздрава истекла ${formattedExpiry} (${Math.abs(daysRemaining)} дн. назад). Требуется подача портфолио в ФАЦ.`,
		};
	}

	if (daysRemaining <= 90) {
		return {
			isValid: true,
			status: "expiring_soon",
			daysRemaining,
			expiryDate: expiry.toISOString(),
			message: `Аккредитация истекает через ${daysRemaining} дн. (${formattedExpiry}). Рекомендуется проверить набор 144 ЗЕТ в НМО.`,
		};
	}

	return {
		isValid: true,
		status: "valid",
		daysRemaining,
		expiryDate: expiry.toISOString(),
		message: `Аккредитация Минздрава РФ действительна до ${formattedExpiry} (осталось ${daysRemaining} дн.).`,
	};
}

/**
 * Права на просмотр внутренних комментариев руководства
 */
export function canViewManagementNotes(role: string | null | undefined): boolean {
	const r = String(role ?? "").toLowerCase();
	return r === "owner" || r === "head_doctor" || r === "chief_doctor" || r === "director";
}

/**
 * Права на редактирование заметок руководства
 */
export function canEditManagementNotes(role: string | null | undefined): boolean {
	return canViewManagementNotes(role);
}

export interface StaffDuplicateConflict {
	readonly field: "snils" | "inn" | "email" | "phone";
	readonly conflictingStaffId: string;
	readonly conflictingStaffName: string;
	readonly message: string;
}

export interface StaffMemberSearchCandidate {
	readonly id?: string;
	readonly fullName?: string;
	readonly snils?: string | null;
	readonly inn?: string | null;
	readonly email?: string | null;
	readonly phone?: string | null;
}

/**
 * Проверка кандидатов на дубликаты по СНИЛС, ИНН, Email и Телефону
 */
export function checkStaffDuplicates(
	existingStaff: readonly StaffMemberSearchCandidate[],
	candidate: StaffMemberSearchCandidate,
): StaffDuplicateConflict | null {
	const candId = candidate.id;
	const candSnils = cleanStaffDigits(candidate.snils);
	const candInn = cleanStaffDigits(candidate.inn);
	const candEmail = candidate.email ? candidate.email.trim().toLowerCase() : "";
	const candPhone = cleanStaffDigits(candidate.phone);

	for (const member of existingStaff) {
		if (candId && member.id === candId) {
			continue;
		}
		const memberName = member.fullName || "Сотрудник";

		// 1. Проверка по СНИЛС
		if (candSnils && candSnils.length === 11) {
			const memberSnils = cleanStaffDigits(member.snils);
			if (memberSnils === candSnils) {
				return {
					field: "snils",
					conflictingStaffId: member.id || "",
					conflictingStaffName: memberName,
					message: `Сотрудник со СНИЛС ${formatStaffSnils(candSnils)} уже зарегистрирован: «${memberName}». Дублирование запрещено.`,
				};
			}
		}

		// 2. Проверка по ИНН
		if (candInn && (candInn.length === 10 || candInn.length === 12)) {
			const memberInn = cleanStaffDigits(member.inn);
			if (memberInn === candInn) {
				return {
					field: "inn",
					conflictingStaffId: member.id || "",
					conflictingStaffName: memberName,
					message: `Сотрудник с ИНН ${candInn} уже зарегистрирован: «${memberName}».`,
				};
			}
		}

		// 3. Проверка по Email
		if (candEmail && candEmail.length > 3) {
			const memberEmail = member.email ? member.email.trim().toLowerCase() : "";
			if (memberEmail && memberEmail === candEmail) {
				return {
					field: "email",
					conflictingStaffId: member.id || "",
					conflictingStaffName: memberName,
					message: `Сотрудник с email ${candEmail} уже зарегистрирован: «${memberName}».`,
				};
			}
		}

		// 4. Проверка по Телефону (последние 10 цифр)
		if (candPhone && candPhone.length >= 10) {
			const memberPhone = cleanStaffDigits(member.phone);
			const candPhoneTail = candPhone.slice(-10);
			const memberPhoneTail = memberPhone.slice(-10);
			if (memberPhoneTail && candPhoneTail === memberPhoneTail) {
				return {
					field: "phone",
					conflictingStaffId: member.id || "",
					conflictingStaffName: memberName,
					message: `Сотрудник с телефоном +7...${candPhoneTail.slice(-4)} уже зарегистрирован: «${memberName}».`,
				};
			}
		}
	}

	return null;
}

/**
 * Схема расширенного профиля сотрудника (Фича №51)
 */
export const staffProfileExtendedSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	fullName: z.string().min(1),
	role: staffRoleSchema,
	specialties: z.array(dentalSpecialtySchema).default(["general" as const]),
	phone: z.string().nullable().optional(),
	email: z.string().email().nullable().optional(),
	active: z.boolean().default(true),
	color: z.string().default("#3b82f6"),
	avatarUrl: z.string().nullable().optional(),

	// Колонка 1: Реквизиты и документы РФ
	snils: z.string().nullable().optional(),
	inn: z.string().nullable().optional(),
	medicalBookNumber: z.string().nullable().optional(),
	medicalBookCheckupDate: z.string().nullable().optional(),
	minzdravAccreditationDate: z.string().nullable().optional(),
	minzdravAccreditationSpecialty: z.string().nullable().optional(),
	clinicalNotes: z.string().nullable().optional(),
	managementNotes: z.string().nullable().optional(),

	// Колонка 2: Назначения, филиалы, кабинеты и тарификация
	assignedBranches: z.array(z.string().uuid()).default([]),
	assignedCabinetRooms: z.array(z.string()).default([]),
	assignedChairIds: z.array(z.string().uuid()).default([]),
	priceCategory: z.string().default("standard"),
	baseSalaryRub: z.number().nonnegative().default(0),
	commissionPct: z.number().min(0).max(100).default(25),
	materialCostDeductionPct: z.number().min(0).max(100).default(0),
	labCostDeductionPct: z.number().min(0).max(100).default(0),

	// Колонка 3: Безопасность и полномочия
	canSignMedicalRecords: z.boolean().default(false),
	canManageMoney: z.boolean().default(false),
	canManageImports: z.boolean().default(false),
	hasPinCode: z.boolean().default(false),
	hasPassword: z.boolean().default(false),
	passwordEntropyBits: z.number().default(0),
	lastLoginAt: z.string().nullable().optional(),
	currentSessionIp: z.string().nullable().optional(),
	currentSessionUserAgent: z.string().nullable().optional(),
	isSessionActive: z.boolean().default(false),

	createdAt: z.string().default(() => new Date().toISOString()),
	updatedAt: z.string().default(() => new Date().toISOString()),
});

export type StaffProfileExtended = z.infer<typeof staffProfileExtendedSchema>;

/**
 * Схема обновления расширенной карточки сотрудника
 */
export const updateStaffProfileExtendedSchema = z.object({
	fullName: z.string().trim().min(1).max(240).optional(),
	role: staffRoleSchema.optional(),
	specialties: z.array(dentalSpecialtySchema).optional(),
	phone: z.string().trim().max(80).nullable().optional(),
	email: z.string().trim().email().max(240).nullable().optional(),
	active: z.boolean().optional(),
	color: z.string().optional(),
	avatarUrl: z.string().nullable().optional(),

	snils: z.string().trim().max(30).nullable().optional(),
	inn: z.string().trim().max(30).nullable().optional(),
	medicalBookNumber: z.string().trim().max(50).nullable().optional(),
	medicalBookCheckupDate: z.string().trim().max(30).nullable().optional(),
	minzdravAccreditationDate: z.string().trim().max(30).nullable().optional(),
	minzdravAccreditationSpecialty: z.string().trim().max(120).nullable().optional(),
	clinicalNotes: z.string().max(2000).nullable().optional(),
	managementNotes: z.string().max(2000).nullable().optional(),

	assignedBranches: z.array(z.string().uuid()).optional(),
	assignedCabinetRooms: z.array(z.string().max(100)).optional(),
	assignedChairIds: z.array(z.string().uuid()).optional(),
	priceCategory: z.string().max(50).optional(),
	baseSalaryRub: z.number().nonnegative().optional(),
	commissionPct: z.number().min(0).max(100).optional(),
	materialCostDeductionPct: z.number().min(0).max(100).optional(),
	labCostDeductionPct: z.number().min(0).max(100).optional(),

	canSignMedicalRecords: z.boolean().optional(),
	canManageMoney: z.boolean().optional(),
	canManageImports: z.boolean().optional(),
});

export type UpdateStaffProfileExtendedInput = z.infer<
	typeof updateStaffProfileExtendedSchema
>;
