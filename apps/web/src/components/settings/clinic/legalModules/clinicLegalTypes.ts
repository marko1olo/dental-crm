/**
 * apps/web/src/components/settings/clinic/legalModules/clinicLegalTypes.ts
 *
 * Types, interfaces, and strict validation algorithms for Russian Federation legal requisites,
 * medical licenses (Roszdravnadzor L041), EGISZ (FRMO/FRMR OID), and CBR banking requisites (BIK/Account).
 *
 * Supports Scale Sovereignty: Solo Doctor (IP without KPP) and Large Clinic (OOO with branches).
 * Mandates: 8b, 8c, 8d, 8e, 8n (Zero Dead-Ends).
 */

export type ClinicLegalEntityType = "ooo" | "ip" | "ao" | "self_employed";

export interface ClinicLegalProfile {
	legalName?: string;
	entityType?: ClinicLegalEntityType;
	inn?: string;
	kpp?: string;
	ogrn?: string;
	email?: string;
	website?: string;
	medicalLicenseNumber?: string;
	medicalLicenseIssuedAt?: string;
	medicalLicenseIssuer?: string;
	medicalLicenseActivities?: string[];
	signatoryName?: string;
	signatoryTitle?: string;
	bankDetails?: string;
	bik?: string;
	checkingAccount?: string;
	corrAccount?: string;
	bankName?: string;
	egiszEnabled?: boolean;
	egiszOid?: string;
	egiszTestMode?: boolean;
	egiszCertThumbprint?: string;
	[key: string]: any;
}

export interface RequisiteValidationResult {
	isValid: boolean;
	message?: string;
	type?: string;
}

export interface SettingsClinicLegalSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
	saveClinicProfileFromDraft: () => Promise<void> | void;
	clinicProfileSaveState: string;
	lookupClinicPublicProfile: () => Promise<void> | void;
	isClinicPublicLookupLoading: boolean;
	clinicPublicLookup: any;
	applyClinicLookupSuggestion: (fields: any) => void;
	legalReadinessPercent: number;
	legalMissingFields: string[];
	humanizeMigrationText: (txt: string) => string;
	clinicLookupSuggestionFieldEntries: (fields: any) => [string, any][];
	clinicPublicLookupFieldLabels: Record<string, string>;
	clinicPublicLookupWarningText: (warning: string) => string;
	clinicLookupSuggestionApplySummary: (fields: any) => string;
	uiLanguage: string;
	setUiLanguage: (lang: string) => void;
	normalizeUiLanguageInput: (input: string) => string;
	typedUiLanguageOptions: Array<{ value: string; label: string; detail: string }>;
	selectedUiLanguageOption: { detail: string };
	odontogramViewMode: any;
	setOdontogramViewMode: (mode: any) => void;
	odontogramViewModeOptions: ReadonlyArray<{ value: any; label: string; detail: string }>;
	selectedOdontogramOption?: { detail: string };
	artSettings: { enabled: boolean; pack: "nature" | "dental-epic" | "abstract" | "all"; dynamicByTimeOfDay: boolean };
	updateArtSettings: (partial: Partial<{ enabled: boolean; pack: "nature" | "dental-epic" | "abstract" | "all"; dynamicByTimeOfDay: boolean }>) => void;
	saveUiPreferences: (prefs: any) => void;
	loadUiPreferences: () => any;
	showToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

/**
 * Валидация ИНН по контрольным коэффициентам ФНС РФ:
 * - 10 знаков для юридических лиц (ООО, АО).
 * - 12 знаков для физических лиц и ИП (соло-врач).
 */
export function validateInn(inn: string | undefined | null): RequisiteValidationResult {
	if (!inn) {
		return { isValid: false, message: "ИНН не указан" };
	}
	const clean = inn.trim().replace(/[^\d]/g, "");
	if (clean.length === 0) {
		return { isValid: false, message: "ИНН должен содержать только цифры" };
	}

	if (clean.length === 10) {
		// Юридическое лицо (ООО, АО)
		const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8];
		let sum = 0;
		for (let i = 0; i < 9; i++) {
			sum += Number(clean[i] ?? "0") * (coefficients[i] ?? 0);
		}
		const checkDigit = (sum % 11) % 10;
		const actualDigit = Number(clean[9] ?? "0");
		if (checkDigit === actualDigit) {
			return { isValid: true, type: "juridical" };
		}
		return { isValid: false, message: "Неверная контрольная сумма ИНН юрлица", type: "juridical" };
	}

	if (clean.length === 12) {
		// ИП или физлицо (соло-врач)
		const coeff11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
		let sum11 = 0;
		for (let i = 0; i < 10; i++) {
			sum11 += Number(clean[i] ?? "0") * (coeff11[i] ?? 0);
		}
		const checkDigit11 = (sum11 % 11) % 10;
		if (checkDigit11 !== Number(clean[10] ?? "0")) {
			return { isValid: false, message: "Неверная контрольная сумма 11-й цифры ИНН ИП", type: "physical" };
		}

		const coeff12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
		let sum12 = 0;
		for (let i = 0; i < 11; i++) {
			sum12 += Number(clean[i] ?? "0") * (coeff12[i] ?? 0);
		}
		const checkDigit12 = (sum12 % 11) % 10;
		if (checkDigit12 !== Number(clean[11] ?? "0")) {
			return { isValid: false, message: "Неверная контрольная сумма 12-й цифры ИНН ИП", type: "physical" };
		}

		return { isValid: true, type: "physical" };
	}

	return {
		isValid: false,
		message: `Длина ИНН должна быть 10 (для ООО) или 12 (для ИП) цифр (сейчас ${clean.length})`,
	};
}

/**
 * Валидация КПП (9 цифр, первые 4 — код налоговой, 5-6 — причина постановки).
 * Для ИП КПП отсутствует по закону РФ!
 */
export function validateKpp(kpp: string | undefined | null, isIp = false): RequisiteValidationResult {
	if (isIp) {
		// У ИП нет КПП
		return { isValid: true, message: "У индивидуальных предпринимателей КПП отсутствует" };
	}
	if (!kpp || !kpp.trim()) {
		return { isValid: true, message: "КПП не указан (допустимо для ИП)" };
	}
	const clean = kpp.trim();
	if (/^[0-9]{4}[0-9A-Z]{2}[0-9]{3}$/.test(clean)) {
		return { isValid: true };
	}
	return { isValid: false, message: "КПП должен состоять из 9 символов (например, 770101001)" };
}

/**
 * Валидация ОГРН / ОГРНИП:
 * - 13 цифр для ОГРН (ООО)
 * - 15 цифр для ОГРНИП (ИП)
 */
export function validateOgrn(ogrn: string | undefined | null): RequisiteValidationResult {
	if (!ogrn) {
		return { isValid: false, message: "ОГРН/ОГРНИП не указан" };
	}
	const clean = ogrn.trim().replace(/[^\d]/g, "");
	if (clean.length === 13) {
		// ОГРН юрлица
		const num = BigInt(clean.slice(0, 12));
		const checkDigit = Number(num % 11n % 10n);
		if (checkDigit === Number(clean[12])) {
			return { isValid: true, type: "ogrn" };
		}
		return { isValid: false, message: "Неверная контрольная сумма ОГРН юрлица", type: "ogrn" };
	}

	if (clean.length === 15) {
		// ОГРНИП
		const num = BigInt(clean.slice(0, 14));
		const checkDigit = Number(num % 13n % 10n);
		if (checkDigit === Number(clean[14])) {
			return { isValid: true, type: "ogrnip" };
		}
		return { isValid: false, message: "Неверная контрольная сумма ОГРНИП", type: "ogrnip" };
	}

	return {
		isValid: false,
		message: `Длина ОГРН должна быть 13 цифр (ООО) или 15 цифр (ОГРНИП для ИП) (сейчас ${clean.length})`,
	};
}

/**
 * Валидация БИК Банка РФ по справочнику ЦБ РФ:
 * - 9 цифр, начинается с "04".
 */
export function validateBik(bik: string | undefined | null): RequisiteValidationResult {
	if (!bik) {
		return { isValid: false, message: "БИК не указан" };
	}
	const clean = bik.trim().replace(/[^\d]/g, "");
	if (clean.length !== 9) {
		return { isValid: false, message: `БИК должен состоять из 9 цифр (сейчас ${clean.length})` };
	}
	if (!clean.startsWith("04")) {
		return { isValid: false, message: "БИК банков РФ должен начинаться с 04" };
	}
	return { isValid: true };
}

/**
 * Валидация расчетного счета (20 цифр) с учетом БИК банка.
 */
export function validateCheckingAccount(account: string | undefined | null, bik?: string | null): RequisiteValidationResult {
	if (!account) {
		return { isValid: false, message: "Расчетный счет не указан" };
	}
	const cleanAcc = account.trim().replace(/[^\d]/g, "");
	if (cleanAcc.length !== 20) {
		return { isValid: false, message: `Расчетный счет должен содержать 20 цифр (сейчас ${cleanAcc.length})` };
	}

	if (bik && bik.trim().length === 9) {
		const cleanBik = bik.trim().replace(/[^\d]/g, "");
		const bikAccountPart = cleanBik.slice(6, 9) + cleanAcc;
		const weights = [7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1];
		let sum = 0;
		for (let i = 0; i < 23; i++) {
			sum += (Number(bikAccountPart[i] ?? "0") * (weights[i] ?? 0)) % 10;
		}
		if (sum % 10 === 0) {
			return { isValid: true };
		}
		return { isValid: false, message: "Контрольный ключ расчетного счета не совпадает с БИК" };
	}

	return { isValid: true };
}

/**
 * Валидация медицинской лицензии Росздравнадзора:
 * Канонический формат нового реестра: Л041-XXXXX-XX/XXXXXXXX или ЛО-XX-XX-XXXXXX
 */
export function validateMedicalLicense(license: string | undefined | null): RequisiteValidationResult {
	if (!license || !license.trim()) {
		return { isValid: false, message: "Лицензия не указана" };
	}
	const val = license.trim();
	// Новый формат Росздравнадзора Л041 или классический ЛО-
	const isL041 = /^Л041-[0-9]{5}-[0-9]{2}\/[0-9]{8}$/i.test(val);
	const isClassic = /^ЛО-[0-9]{2}-[0-9]{2}-[0-9]{6}$/i.test(val);
	const isFreeNumber = val.length >= 6;

	if (isL041 || isClassic) {
		return { isValid: true, type: isL041 ? "L041_Roszdravnadzor" : "Classic_LO" };
	}
	if (isFreeNumber) {
		return { isValid: true, message: "Номер лицензии введен в свободном формате" };
	}
	return { isValid: false, message: "Номер лицензии слишком короткий (минимум 6 знаков)" };
}

/**
 * Валидация OID медицинской организации в реестре ЕГИСЗ (ФРМО):
 * Формат OID: 1.2.643.5.1.13.1.1.1...
 */
export function validateEgiszOid(oid: string | undefined | null): RequisiteValidationResult {
	if (!oid || !oid.trim()) {
		return { isValid: false, message: "OID организации ЕГИСЗ не указан" };
	}
	const clean = oid.trim();
	if (/^1\.2\.643\.5\.1\.13\.[0-9.]+$/.test(clean)) {
		return { isValid: true };
	}
	return { isValid: false, message: "OID ЕГИСЗ должен начинаться с 1.2.643.5.1.13." };
}

/**
 * Номенклатурные медицинские виды деятельности клиники по приказу Минздрава РФ:
 */
export const CLINICAL_LICENSE_ACTIVITIES = [
	{ id: "therapy", label: "Стоматология терапевтическая", code: "stoma_therapy" },
	{ id: "surgery", label: "Стоматология хирургическая", code: "stoma_surgery" },
	{ id: "orthopedics", label: "Стоматология ортопедическая", code: "stoma_orthopedics" },
	{ id: "orthodontics", label: "Ортодонтия", code: "stoma_orthodontics" },
	{ id: "pediatric", label: "Стоматология детская", code: "stoma_pediatric" },
	{ id: "hygiene", label: "Стоматология общей практики / Гигиена", code: "stoma_general" },
	{ id: "radiology", label: "Рентгенология (прицельные снимки, ОПТГ, КЛКТ)", code: "stoma_xray" },
	{ id: "anesthesiology", label: "Анестезиология и реаниматология", code: "stoma_anesthesia" },
] as const;
