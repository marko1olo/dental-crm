import {
	type ConsentPackageKey,
	type ConsentSubstitutionContext,
	type ConsentTemplateKey,
	getConsentPackage,
	getConsentTemplate,
} from "./consentTemplates.js";
import type { SignatureVectorData } from "./signaturePadMath.js";
import { STATUTORY_CONSENT_KEY_LABELS } from "./consentSsotEngine.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";

export interface SignedConsentPayload {
	templateKey: ConsentTemplateKey;
	code: string;
	title: string;
	fullTextContent: string;
	patientName: string;
	birthDate: string;
	passport: string;
	doctorName: string;
	clinicName: string;
	diagnosisIcd: string;
	toothNumbers: string;
	signatureSvg: string;
	signaturePngBase64: string;
	vectorData: SignatureVectorData;
	integrityHash: string;
	signedAt: string;
	verificationMethod: "tablet_stylus" | "sms_otp" | "paper_physical";
	smsOtpCode?: string | null;
	attachedToForm043u: boolean;
	paperOriginalStored?: boolean;
	scanFileName?: string | null | undefined;
	statusText?: string;
	note?: string;
	auditTrail?: unknown;
}

export interface PatientConsentSummaryParams {
	activeMode: "packages" | "single";
	patientName?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicLegalName?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	toothNumbers?: string | null | undefined;
	customDiagnosis?: string | null | undefined;
	diagnosisIcd?: string | null | undefined;
	packageKey?: ConsentPackageKey | undefined;
	templateKey?: ConsentTemplateKey | undefined;
	integrityHash?: string | undefined;
}

export { STATUTORY_CONSENT_KEY_LABELS } from "./consentSsotEngine.js";

/**
 * Очищает значение поля документа от системного мусора (null, undefined, id: 804n-undefined, NaN).
 */
export function sanitizeConsentFieldValue(value: string | null | undefined, fallback = "—"): string {
	if (value === null || value === undefined) {
		return fallback;
	}
	let str = String(value).trim();
	if (!str) return fallback;

	// Проверка на строковые артефакты JavaScript
	if (
		str === "null" ||
		str === "undefined" ||
		str === "NaN" ||
		str === "[object Object]" ||
		str.toLowerCase() === "undefined" ||
		str.toLowerCase() === "null"
	) {
		return fallback;
	}

	// Очистка от сырых префиксов 804н и системных ID
	if (/^id:\s*804n-undefined$/i.test(str) || /^804n-undefined$/i.test(str)) {
		return "По клиническим показаниям (Приказ Минздрава РФ № 1051н)";
	}

	str = str.replace(/\bid:\s*804n-undefined\b/gi, "клинические показания");
	str = str.replace(/\b804n-undefined\b/gi, "клинические стандарты");
	str = str.replace(/\bundefined\b/g, fallback);
	str = str.replace(/\bnull\b/g, fallback);

	// Перевод английских ключей в официальную русскую терминологию
	const statutoryLabel = (STATUTORY_CONSENT_KEY_LABELS as Record<string, string | undefined>)[str];
	if (statutoryLabel) {
		return statutoryLabel;
	}

	return str;
}

/**
 * Очищает произвольный текст бланка ИДС от системного мусора и заменяет английские коды на русский язык.
 */
export function cleanPrintableConsentText(text: string): string {
	if (!text) return "";
	let cleaned = text;

	for (const [key, label] of Object.entries(STATUTORY_CONSENT_KEY_LABELS)) {
		const regex = new RegExp(`\\b${key}\\b`, "g");
		cleaned = cleaned.replace(regex, label);
	}

	cleaned = cleaned.replace(/\bid:\s*804n-undefined\b/gi, "Медицинская услуга по номенклатуре");
	cleaned = cleaned.replace(/\b804n-undefined\b/gi, "По клиническим стандартам");
	cleaned = cleaned.replace(/\bundefined\b/g, "—");
	cleaned = cleaned.replace(/\bnull\b/g, "—");
	cleaned = cleaned.replace(/\bNaN\b/g, "—");
	cleaned = cleaned.replace(/\[object Object\]/g, "—");

	return cleaned;
}

/**
 * Валидирует и нормализует контекст подстановки, гарантируя отсутствие мусора в распечатываемом бланке.
 */
export function sanitizeConsentContext(context: ConsentSubstitutionContext): ConsentSubstitutionContext {
	const isDemo = isDemoShowcaseMode();
	return {
		patientName: sanitizeConsentFieldValue(context.patientName, "________________________________________"),
		birthDate: sanitizeConsentFieldValue(context.birthDate, "«___» _________ _____ г."),
		passport: sanitizeConsentFieldValue(context.passport, "серия ______ № ________ выдан ____________________"),
		doctorName: sanitizeConsentFieldValue(context.doctorName, "Лечащий врач-стоматолог"),
		clinicName: sanitizeConsentFieldValue(context.clinicName, isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
		clinicLegalName: sanitizeConsentFieldValue(context.clinicLegalName, isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
		clinicAddress: sanitizeConsentFieldValue(context.clinicAddress, isDemo ? "г. Москва, ул. Большая Стоматологическая, д. 12" : "«________________________________________»"),
		clinicOgrn: sanitizeConsentFieldValue(context.clinicOgrn, isDemo ? "1217700123456" : "«________________»"),
		licenseNumber: sanitizeConsentFieldValue(context.licenseNumber, isDemo ? "ЛО41-01137-77/00368421" : "«________________________________________»"),
		diagnosisIcd: sanitizeConsentFieldValue(context.diagnosisIcd, isDemo ? "Первичный осмотр и обследование" : "________________________________________"),
		toothNumbers: sanitizeConsentFieldValue(context.toothNumbers, isDemo ? "Полость рта (зубной ряд)" : "________________________"),
		date: sanitizeConsentFieldValue(context.date, new Date().toLocaleDateString("ru-RU")),
		snils: sanitizeConsentFieldValue(context.snils, "___-___-___ __"),
		phone: sanitizeConsentFieldValue(context.phone, "+7 (___) ___-__-__"),
		guardianName: context.guardianName ? sanitizeConsentFieldValue(context.guardianName, "") : undefined,
		guardianRelation: context.guardianRelation ? sanitizeConsentFieldValue(context.guardianRelation, "") : undefined,
		guardianDocument: context.guardianDocument ? sanitizeConsentFieldValue(context.guardianDocument, "") : undefined,
		guardianPhone: context.guardianPhone ? sanitizeConsentFieldValue(context.guardianPhone, "") : undefined,
		patientAgeYears: context.patientAgeYears,
	};
}

export {
	type ConsentScopeMismatchParams,
	type ConsentScopeMismatchItem,
	type ConsentScopeMismatchResult,
	detectConsentScopeMismatch,
} from "./consentSsotEngine.js";

/**
 * Формирует выжимку дополнительного согласия для отправки пациенту или подшивки к протоколу.
 */
export function buildAddendumConsentSummary(params: {
	patientName?: string | null | undefined;
	doctorName?: string | null | undefined;
	clinicName?: string | null | undefined;
	uncoveredTemplates?: ConsentTemplateKey[];
	uncoveredTemplateKeys?: ConsentTemplateKey[];
	toothNumbers?: string | null | undefined;
}): string {
	const effectivePatientName = sanitizeConsentFieldValue(params.patientName, "Пациент");
	const effectiveDoctorName = sanitizeConsentFieldValue(params.doctorName, "Лечащий врач-стоматолог");
	const effectiveClinicName = sanitizeConsentFieldValue(params.clinicName, "ООО «Стоматологическая клиника ДЕНТЕ»");
	const effectiveTeeth = sanitizeConsentFieldValue(params.toothNumbers, "Полость рта");
	const templates = params.uncoveredTemplates || params.uncoveredTemplateKeys || [];

	const titles = templates.map((k) => {
		try {
			const t = getConsentTemplate(k);
			return `${t.title} (${t.code})`;
		} catch {
			return (STATUTORY_CONSENT_KEY_LABELS as Record<string, string | undefined>)[k] || k;
		}
	});

	return [
		`ДОПОЛНИТЕЛЬНОЕ ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (клиника «${effectiveClinicName}»):`,
		`Пациент: ${effectivePatientName}`,
		`Лечащий врач: ${effectiveDoctorName}`,
		`Добавленные процедуры: ${titles.length > 0 ? titles.join(", ") : "По клиническим показаниям"}`,
		`Область вмешательства: ${effectiveTeeth}`,
		`Правовое основание: Федеральный закон № 323-ФЗ (ст. 20), Приказ Минздрава РФ № 1051н.`,
		`Врачебная автономия сохранена (экстренная помощь оказывается безотлагательно).`,
		`Памятка: пациент проинформирован о целях, методах, возможных рисках и альтернативах добавленных вмешательств.`,
	].join("\n");
}

/**
 * Формирует выжимку согласия и памятку для пациента без эмодзи (Мандаты 8d п. 7, 8e п. 5, 8i, 8k, 8n).
 * Готова для 1-клик отправки в WhatsApp / Telegram / SMS.
 */
export function buildPatientConsentSummary(params: PatientConsentSummaryParams): string {
	const effectivePatientName = sanitizeConsentFieldValue(params.patientName, "Пациент");
	const effectiveDoctorName = sanitizeConsentFieldValue(
		params.doctorName ||
			(params.doctorSpecialty ? `Врач-стоматолог (${params.doctorSpecialty})` : null) ||
			"Лечащий врач",
		"Лечащий врач",
	);
	const effectiveClinicName = sanitizeConsentFieldValue(
		params.clinicName || params.clinicLegalName || "ООО «Стоматологическая клиника ДЕНТЕ»",
		"ООО «Стоматологическая клиника ДЕНТЕ»",
	);
	const effectiveClinicPhone = (params.clinicPhone || "").trim();
	const effectiveTeeth = sanitizeConsentFieldValue(
		params.toothNumbers,
		params.activeMode === "single" ? "По показаниям" : "По плану лечения",
	);
	const hashPrefix = (params.integrityHash || "0000000000000000").slice(0, 16);

	if (params.activeMode === "packages") {
		const pkg = getConsentPackage(params.packageKey || "PACKAGE_PRIMARY_VISIT");
		const docList = pkg.templateKeys
			.map((key) => {
				const tpl = getConsentTemplate(key);
				return `${tpl.title} (${tpl.code})`;
			})
			.join(", ");

		const memoLines = [
			`Информированные согласия на лечение (клиника «${effectiveClinicName}»):`,
			`Пациент: ${effectivePatientName}`,
			`Пакет: ${pkg.title}`,
			`Документы: ${docList}`,
			`Врач: ${effectiveDoctorName}`,
			`Область лечения: ${effectiveTeeth}`,
			`Хеш целостности SHA-256: ${hashPrefix}...`,
		];
		if (effectiveClinicPhone) {
			memoLines.push(`Памятка: перед приёмом ознакомьтесь с противопоказаниями. При возникновении вопросов звоните в клинику: ${effectiveClinicPhone}.`);
		} else {
			memoLines.push(`Памятка: перед приёмом ознакомьтесь с противопоказаниями.`);
		}
		return memoLines.join("\n");
	}

	const tpl = getConsentTemplate(params.templateKey || "CONSENT_THERAPY");
	const effectiveDiagnosis = sanitizeConsentFieldValue(
		params.customDiagnosis || params.diagnosisIcd || "По плану лечения",
		"По плану лечения",
	);

	const memoLines = [
		`Информированное добровольное согласие (клиника «${effectiveClinicName}»):`,
		`Пациент: ${effectivePatientName}`,
		`Медицинское вмешательство: ${tpl.title} (${tpl.code})`,
		`Врач: ${effectiveDoctorName}`,
		`Область лечения: ${effectiveTeeth}`,
		`Диагноз МКБ: ${effectiveDiagnosis}`,
		`Ключевые риски и памятка: после вмешательства возможно появление локальной болезненности, отёка и чувствительности (1-3 дня). Строго соблюдайте назначения лечащего врача.`,
		`Хеш целостности SHA-256: ${hashPrefix}...`,
	];
	if (effectiveClinicPhone) {
		memoLines.push(`Телефон клиники: ${effectiveClinicPhone}.`);
	}
	return memoLines.join("\n");
}
