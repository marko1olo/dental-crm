import {
	type ConsentPackageKey,
	type ConsentSubstitutionContext,
	type ConsentTemplateKey,
	getConsentPackage,
	getConsentTemplate,
} from "./consentTemplates.js";
import type { SignatureVectorData } from "./signaturePadMath.js";

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
	statusText?: string;
	note?: string;
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

/**
 * Словарь официальных наименований Приказа Минздрава 1051н и 323-ФЗ
 * для исключения утечек английских служебных ключей и ID в распечатываемые документы.
 */
export const STATUTORY_CONSENT_KEY_LABELS: Record<string, string> = {
	CONSENT_INSPECTION_1051N: "Информированное добровольное согласие на первичный осмотр и обследование (Приказ Минздрава РФ № 1051н)",
	CONSENT_ANESTHESIA: "Информированное добровольное согласие на местное обезболивание (анестезию)",
	CONSENT_THERAPY: "Информированное добровольное согласие на терапевтическое лечение и эндодонтию",
	CONSENT_SURGERY_IMPLANT: "Информированное добровольное согласие на хирургическое вмешательство, удаление зубов и дентальную имплантацию",
	CONSENT_ORTHOPEDICS: "Информированное добровольное согласие на ортопедическое лечение и протезирование",
	CONSENT_ORTHODONTICS: "Информированное добровольное согласие на ортодонтическое лечение",
	CONSENT_HYGIENE_BLEACHING: "Информированное добровольное согласие на профессиональную гигиену и отбеливание",
	CONSENT_PERSONAL_DATA: "Согласие на обработку персональных данных (Федеральный закон № 152-ФЗ)",
	CONSENT_PEDIATRIC: "Информированное добровольное согласие законного представителя на детское стоматологическое лечение",
	PACKAGE_PRIMARY_VISIT: "Первичный стоматологический приём (комплекс ИДС)",
	PACKAGE_SURGERY: "Хирургический комплекс (удаление и имплантация)",
	PACKAGE_ORTHOPEDICS: "Ортопедический комплекс (протезирование)",
	tablet_stylus: "Стилусная touch-подпись на планшете",
	paper_physical: "Личная подпись на бумажном носителе",
	sms_otp: "Подтверждение кодом из SMS",
	therapy_endo_restoration: "Терапевтическое лечение и эндодонтия",
	therapy_general: "Терапевтическое лечение (кариес, пульпит, периодонтит)",
	surgery_extraction: "Хирургическое удаление зубов и ревизия лунки",
	surgery_implant: "Хирургическое вмешательство и имплантация",
	implantation_bone_graft: "Дентальная имплантация и костная пластика",
	local_anesthesia: "Местная анестезия",
	prosthetics: "Ортопедическое лечение и протезирование",
	orthopedics: "Ортопедическое лечение и протезирование",
	orthodontics: "Ортодонтическое лечение",
	hygiene_whitening: "Профессиональная гигиена и отбеливание",
	therapy: "Терапевтическое лечение",
	surgery: "Хирургическое лечение",
	hygiene: "Профессиональная гигиена",
	periodontology: "Пародонтологическое лечение",
};

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
	const statutoryLabel = STATUTORY_CONSENT_KEY_LABELS[str];
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
	return {
		patientName: sanitizeConsentFieldValue(context.patientName, "________________________________________"),
		birthDate: sanitizeConsentFieldValue(context.birthDate, "«___» _________ _____ г."),
		passport: sanitizeConsentFieldValue(context.passport, "серия ______ № ________ выдан ____________________"),
		doctorName: sanitizeConsentFieldValue(context.doctorName, "Лечащий врач-стоматолог"),
		clinicName: sanitizeConsentFieldValue(context.clinicName, "ООО «Стоматологическая клиника ДЕНТЕ»"),
		clinicLegalName: sanitizeConsentFieldValue(context.clinicLegalName, "ООО «Стоматологическая клиника ДЕНТЕ»"),
		clinicAddress: sanitizeConsentFieldValue(context.clinicAddress, "г. Москва, ул. Большая Стоматологическая, д. 12"),
		clinicOgrn: sanitizeConsentFieldValue(context.clinicOgrn, "1217700123456"),
		licenseNumber: sanitizeConsentFieldValue(context.licenseNumber, "ЛО41-01137-77/00368421"),
		diagnosisIcd: sanitizeConsentFieldValue(context.diagnosisIcd, "Первичный осмотр и обследование"),
		toothNumbers: sanitizeConsentFieldValue(context.toothNumbers, "Полость рта (зубной ряд)"),
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

/* ==========================================================================
   DYNAMIC CONSENT SCOPE MISMATCH DETECTION (Consent Scope Invalidation)
   ========================================================================== */

export interface ConsentScopeMismatchParams {
	signedConsentKeys: readonly string[];
	treatmentPlanText?: string | null | undefined;
	diagnosisText?: string | null | undefined;
	complaintText?: string | null | undefined;
	anamnesisText?: string | null | undefined;
	objectiveStatusText?: string | null | undefined;
	additionalProcedures?: readonly string[] | null | undefined;
}

export interface ConsentScopeMismatchItem {
	domainKey: ConsentTemplateKey;
	domainTitle: string;
	detectedKeywords: string[];
	procedureDescription: string;
	urgencyLevel: "invasive_surgery" | "invasive_orthopedics" | "invasive_orthodontics" | "therapy_uncovered";
}

export interface ConsentScopeMismatchResult {
	hasMismatch: boolean;
	hasSignedConsents: boolean;
	mismatchedItems: ConsentScopeMismatchItem[];
	uncoveredTemplateKeys: ConsentTemplateKey[];
	uncoveredProcedureNames: string[];
	warningTitle: string;
	warningMessage: string;
	legalRiskNotice: string;
	suggestedActionLabel: string;
}

/**
 * Динамическая детекция изменений в плане лечения (Consent Scope Mismatch).
 * Выявляет добавление инвазивных процедур (хирургия, удаление, имплантация, препарирование под коронку),
 * не покрытых ранее подписанным ИДС 1051н.
 *
 * Инвариант Врачебной Автономии (Мандат 8e):
 * Программа НИКОГДА не блокирует спасение жизни и экстренную помощь, но подсвечивает юридический риск
 * и предоставляет 1-клик действие для оформления доп. согласия.
 */
export function detectConsentScopeMismatch(params: ConsentScopeMismatchParams): ConsentScopeMismatchResult {
	const signedKeys = new Set(params.signedConsentKeys || []);
	const hasSignedConsents = signedKeys.size > 0;

	const clinicalCorpus = [
		params.treatmentPlanText || "",
		params.diagnosisText || "",
		params.complaintText || "",
		params.anamnesisText || "",
		params.objectiveStatusText || "",
		...(params.additionalProcedures || []),
	]
		.join(" ")
		.toLowerCase();

	const mismatchedItems: ConsentScopeMismatchItem[] = [];

	// 1. Хирургия и имплантация (CONSENT_SURGERY_IMPLANT)
	const surgeryKeywords = [
		"удал", "экстракц", "хирург", "имплант", "синус", "лунк", "резекц",
		"дистоп", "ретинир", "альвеол", "костн", "аугментац", "перикорон", "k01", "k05.2"
	];
	const detectedSurgery = surgeryKeywords.filter((kw) => clinicalCorpus.includes(kw));
	if (detectedSurgery.length > 0 && !signedKeys.has("CONSENT_SURGERY_IMPLANT")) {
		mismatchedItems.push({
			domainKey: "CONSENT_SURGERY_IMPLANT",
			domainTitle: "Хирургическое вмешательство, удаление зубов и дентальная имплантация",
			detectedKeywords: detectedSurgery,
			procedureDescription: "Инвазивное хирургическое вмешательство (удаление, синус-лифтинг или имплантация)",
			urgencyLevel: "invasive_surgery",
		});
	}

	// 2. Ортопедия и протезирование (CONSENT_ORTHOPEDICS)
	const orthoKeywords = [
		"коронк", "протез", "слепок", "винир", "ортопед", "вкладк", "мост",
		"абатмент", "препарирован", "обточк", "сканирован", "металлокерамик", "диоксид циркони", "k08"
	];
	const detectedOrtho = orthoKeywords.filter((kw) => clinicalCorpus.includes(kw));
	if (detectedOrtho.length > 0 && !signedKeys.has("CONSENT_ORTHOPEDICS")) {
		mismatchedItems.push({
			domainKey: "CONSENT_ORTHOPEDICS",
			domainTitle: "Ортопедическое лечение, препарирование и протезирование",
			detectedKeywords: detectedOrtho,
			procedureDescription: "Инвазивное ортопедическое вмешательство (препарирование под коронку, слепки, протезирование)",
			urgencyLevel: "invasive_orthopedics",
		});
	}

	// 3. Ортодонтия (CONSENT_ORTHODONTICS)
	const orthoDontKeywords = ["брекет", "элайнер", "ортодонт", "исправление прикуса", "ретейнер", "k07"];
	const detectedOrthoDont = orthoDontKeywords.filter((kw) => clinicalCorpus.includes(kw));
	if (detectedOrthoDont.length > 0 && !signedKeys.has("CONSENT_ORTHODONTICS")) {
		mismatchedItems.push({
			domainKey: "CONSENT_ORTHODONTICS",
			domainTitle: "Ортодонтическое лечение",
			detectedKeywords: detectedOrthoDont,
			procedureDescription: "Ортодонтическое перемещение зубов и фиксация аппаратуры",
			urgencyLevel: "invasive_orthodontics",
		});
	}

	// 4. Терапия / эндодонтия (CONSENT_THERAPY) — если подписан только первичный осмотр, а назначена эндодонтия/пломбирование
	const therapyKeywords = ["кариес", "пульпит", "периодонтит", "пломб", "реставрац", "эндо", "депульп", "канал", "коффердам", "k02", "k04"];
	const detectedTherapy = therapyKeywords.filter((kw) => clinicalCorpus.includes(kw));
	if (detectedTherapy.length > 0 && !signedKeys.has("CONSENT_THERAPY")) {
		mismatchedItems.push({
			domainKey: "CONSENT_THERAPY",
			domainTitle: "Терапевтическое лечение и эндодонтия",
			detectedKeywords: detectedTherapy,
			procedureDescription: "Терапевтическое препарирование полостей или эндодонтическая обработка корневых каналов",
			urgencyLevel: "therapy_uncovered",
		});
	}

	const hasMismatch = mismatchedItems.length > 0;
	const uncoveredTemplateKeys = mismatchedItems.map((i) => i.domainKey);
	const uncoveredProcedureNames = mismatchedItems.map((i) => i.domainTitle);

	const warningTitle = "Внимание: добавлены процедуры, не покрытые текущим ИДС 1051н";
	const warningMessage = hasMismatch
		? `В план лечения или дневник приёма добавлены процедуры (${uncoveredProcedureNames.join("; ")}), на которые отсутствует подписанное информированное добровольное согласие.`
		: "Все запланированные клинические процедуры покрыты действующими информированными согласиями.";

	const legalRiskNotice =
		"В соответствии со ст. 20 Федерального закона № 323-ФЗ и Приказом Минздрава РФ № 1051н, любое инвазивное вмешательство требует оформленного информированного добровольного согласия. Отсутствие ИДС при возникновении осложнений лишает клинику юридической защиты. Программа не блокирует оказание экстренной помощи (Мандат Врачебной Автономии), но рекомендует зафиксировать согласие пациента.";

	const suggestedActionLabel = "Сформировать доп. согласие на новые процедуры";

	return {
		hasMismatch,
		hasSignedConsents,
		mismatchedItems,
		uncoveredTemplateKeys,
		uncoveredProcedureNames,
		warningTitle,
		warningMessage,
		legalRiskNotice,
		suggestedActionLabel,
	};
}

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
			return STATUTORY_CONSENT_KEY_LABELS[k] || k;
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
