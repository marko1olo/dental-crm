/**
 * consentSsotEngine.ts
 *
 * Единый источник правды (SSOT) для информированных добровольных согласий (ИДС):
 * 1. 323-ФЗ (ст. 20, 84 — медицинская помощь и согласие).
 * 2. Приказ Минздрава России от 12.11.2021 № 1051н.
 * 3. 152-ФЗ (обработка персональных данных и передача в ЕГИСЗ).
 * 4. Мандат 8e (Врачебная автономия: 0 блокирующих тупиков).
 * 5. Мандат 8n (Zero Dead-Ends: при острой боли CITO спасение пациента приоритетнее бумаг).
 *
 * Объединяет разрозненные проверки из:
 * - useVisitConsentsLogic.ts
 * - consentSummaryHelper.ts
 * - informedConsentBlockers.ts
 * - chairsideConsentEngine.ts
 */

import type { ConsentTemplateKey } from "./templates/types";

/**
 * Официальные юридические наименования согласий по Номенклатуре и Приказу 1051н.
 */
export const STATUTORY_CONSENT_KEY_LABELS = {
	CONSENT_INSPECTION_1051N: "Информированное добровольное согласие на первичный осмотр и обследование (Приказ Минздрава РФ № 1051н)",
	CONSENT_ANESTHESIA: "Информированное добровольное согласие на местное обезболивание (анестезию)",
	CONSENT_THERAPY: "Информированное добровольное согласие на терапевтическое лечение и эндодонтию",
	CONSENT_SURGERY_IMPLANT: "Информированное добровольное согласие на хирургическое вмешательство, удаление зубов и дентальную имплантацию",
	CONSENT_ORTHOPEDICS: "Информированное добровольное согласие на ортопедическое лечение и протезирование",
	CONSENT_ORTHODONTICS: "Информированное добровольное согласие на ортодонтическое лечение",
	CONSENT_HYGIENE_BLEACHING: "Информированное добровольное согласие на профессиональную гигиену и отбеливание",
	CONSENT_PERSONAL_DATA: "Согласие на обработку персональных данных (Федеральный закон № 152-ФЗ)",
	CONSENT_PEDIATRIC: "Информированное добровольное согласие законного представителя на детское стоматологическое лечение",
	CONSENT_PHOTOPROTOCOL: "Согласие на проведение фото- и видеопротокола (152-ФЗ)",
	PACKAGE_PRIMARY_VISIT: "Первичный стоматологический приём (комплекс ИДС)",
	PACKAGE_SURGERY: "Хирургический комплекс (удаление и имплантация)",
	PACKAGE_ORTHOPEDICS: "Ортопедический комплекс (протезирование)",
	tablet_stylus: "Стилусная touch-подпись на планшете",
	paper_physical: "Личная подпись на бумажном носителе",
	sms_otp: "Подтверждение кодом из SMS (ПЭП по 63-ФЗ)",
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
} as const;

/**
 * Единый словарь клинических ключевых слов и маркеров МКБ-10 по доменам вмешательств.
 */
export const CLINICAL_DOMAIN_KEYWORDS: Record<
	"anesthesia" | "surgery" | "orthopedics" | "orthodontics" | "therapy" | "hygiene",
	readonly string[]
> = {
	anesthesia: [
		"анестез", "замороз", "карпул", "артикаин", "мепивакаин", "скандонест", "убистезин",
		"удал", "кариес", "пульпит", "периодонт", "пломб", "препар", "коронк", "имплант",
	],
	surgery: [
		"удал", "экстракц", "хирург", "имплант", "синус", "лунк", "резекц",
		"дистоп", "ретинир", "альвеол", "костн", "аугментац", "перикорон",
		"кюретаж", "гемисекц", "цистэктоми", "k01", "k05.2",
	],
	orthopedics: [
		"коронк", "протез", "слепок", "винир", "ортопед", "вкладк", "мост",
		"абатмент", "препарирован", "обточк", "сканирован", "металлокерамик",
		"циркони", "диоксид", "культев", "бюгел", "k08",
	],
	orthodontics: [
		"брекет", "элайнер", "ортодонт", "исправление прикуса", "ретейнер",
		"дистализац", "спрэд", "дуг", "k07",
	],
	therapy: [
		"кариес", "пульпит", "периодонтит", "пломб", "реставрац", "эндо",
		"депульп", "канал", "коффердам", "гуттаперч", "штифт", "k02", "k04",
	],
	hygiene: [
		"гигиен", "чистк", "air-flow", "airflow", "айрфло", "ультразвук",
		"отбеливан", "zoom", "зум", "пародонт", "скейлинг", "k03.6", "k05",
	],
} as const;

export interface ConsentScopeMismatchItem {
	domainKey: ConsentTemplateKey;
	domainTitle: string;
	detectedKeywords: string[];
	procedureDescription: string;
	urgencyLevel: "invasive_surgery" | "invasive_orthopedics" | "invasive_orthodontics" | "therapy_uncovered";
}

export interface ConsentScopeMismatchParams {
	signedConsentKeys: readonly string[];
	treatmentPlanText?: string | null | undefined;
	diagnosisText?: string | null | undefined;
	complaintText?: string | null | undefined;
	anamnesisText?: string | null | undefined;
	objectiveStatusText?: string | null | undefined;
	additionalProcedures?: readonly string[] | null | undefined;
	isCito?: boolean | undefined;
}

export interface ConsentScopeMismatchResult {
	hasMismatch: boolean;
	hasSignedConsents: boolean;
	isCito: boolean;
	canProceed: boolean;
	mismatchedItems: ConsentScopeMismatchItem[];
	uncoveredTemplateKeys: ConsentTemplateKey[];
	uncoveredProcedureNames: string[];
	warningTitle: string;
	warningMessage: string;
	legalRiskNotice: string;
	suggestedActionLabel: string;
}

/**
 * Проверяет, покрыт ли конкретный домен подписанными ключами согласий.
 */
export function isConsentCovered(domain: ConsentTemplateKey, signedKeys: Iterable<string>): boolean {
	const set = signedKeys instanceof Set ? signedKeys : new Set(signedKeys);
	return set.has(domain);
}

/**
 * Возвращает официальное регламентное наименование согласия по ключу.
 */
export function getConsentStatutoryTitle(key: string): string {
	return (STATUTORY_CONSENT_KEY_LABELS as Record<string, string | undefined>)[key] || key;
}

/**
 * Проверяет наличие клинических маркеров домена в тексте (корпусе приема).
 */
export function detectDomainKeywords(
	corpus: string,
	domain: keyof typeof CLINICAL_DOMAIN_KEYWORDS,
): string[] {
	if (!corpus) return [];
	const lower = corpus.toLowerCase();
	const keywords = CLINICAL_DOMAIN_KEYWORDS[domain] || [];
	return keywords.filter((kw) => lower.includes(kw));
}

/**
 * SSOT-детекция необходимых согласий для формы визита.
 * Заменяет разрозненные массивы ключевых слов в useVisitConsentsLogic.
 */
export function detectRequiredVisitConsents(params: {
	textContext: string;
	signedConsentKeys?: Iterable<string>;
	isVisitClosed?: boolean;
	hasInspectionSigned?: boolean;
}): Record<string, boolean> {
	const { textContext, isVisitClosed = false, hasInspectionSigned = false } = params;
	const lower = textContext.toLowerCase();
	const isBlankAndOpen = !lower.trim() && !isVisitClosed;

	const flags: Record<string, boolean> = {};

	// Первичный осмотр 1051н обязателен, если еще не подписан
	if (!hasInspectionSigned) {
		flags.CONSENT_INSPECTION_1051N = true;
	}

	// Анестезия
	const detectedAnesthesia = detectDomainKeywords(lower, "anesthesia");
	if (detectedAnesthesia.length > 0 || isBlankAndOpen) {
		flags.CONSENT_ANESTHESIA = true;
	}

	// Терапия
	const detectedTherapy = detectDomainKeywords(lower, "therapy");
	if (detectedTherapy.length > 0 || isBlankAndOpen) {
		flags.CONSENT_THERAPY = true;
	}

	// Хирургия и имплантация
	const detectedSurgery = detectDomainKeywords(lower, "surgery");
	if (detectedSurgery.length > 0) {
		flags.CONSENT_SURGERY_IMPLANT = true;
	}

	// Ортопедия
	const detectedOrtho = detectDomainKeywords(lower, "orthopedics");
	if (detectedOrtho.length > 0) {
		flags.CONSENT_ORTHOPEDICS = true;
	}

	// Ортодонтия
	const detectedOrthoDont = detectDomainKeywords(lower, "orthodontics");
	if (detectedOrthoDont.length > 0) {
		flags.CONSENT_ORTHODONTICS = true;
	}

	// Гигиена
	const detectedHygiene = detectDomainKeywords(lower, "hygiene");
	if (detectedHygiene.length > 0) {
		flags.CONSENT_HYGIENE_BLEACHING = true;
	}

	return flags;
}

/**
 * Динамическая детекция изменений в плане лечения (Consent Scope Mismatch).
 * Единая каноническая реализация с полной поддержкой Мандата 8n (Zero Dead-Ends при CITO).
 */
export function detectConsentScopeMismatch(params: ConsentScopeMismatchParams): ConsentScopeMismatchResult {
	const signedKeys = new Set(params.signedConsentKeys || []);
	const hasSignedConsents = signedKeys.size > 0;
	const isCito = Boolean(params.isCito);

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

	// 1. Хирургия и имплантация
	const detectedSurgery = detectDomainKeywords(clinicalCorpus, "surgery");
	if (detectedSurgery.length > 0 && !signedKeys.has("CONSENT_SURGERY_IMPLANT")) {
		mismatchedItems.push({
			domainKey: "CONSENT_SURGERY_IMPLANT",
			domainTitle: getConsentStatutoryTitle("CONSENT_SURGERY_IMPLANT"),
			detectedKeywords: detectedSurgery,
			procedureDescription: "Инвазивное хирургическое вмешательство (удаление, синус-лифтинг или имплантация)",
			urgencyLevel: "invasive_surgery",
		});
	}

	// 2. Ортопедия и протезирование
	const detectedOrtho = detectDomainKeywords(clinicalCorpus, "orthopedics");
	if (detectedOrtho.length > 0 && !signedKeys.has("CONSENT_ORTHOPEDICS")) {
		mismatchedItems.push({
			domainKey: "CONSENT_ORTHOPEDICS",
			domainTitle: getConsentStatutoryTitle("CONSENT_ORTHOPEDICS"),
			detectedKeywords: detectedOrtho,
			procedureDescription: "Инвазивное ортопедическое вмешательство (препарирование под коронку, слепки, протезирование)",
			urgencyLevel: "invasive_orthopedics",
		});
	}

	// 3. Ортодонтия
	const detectedOrthoDont = detectDomainKeywords(clinicalCorpus, "orthodontics");
	if (detectedOrthoDont.length > 0 && !signedKeys.has("CONSENT_ORTHODONTICS")) {
		mismatchedItems.push({
			domainKey: "CONSENT_ORTHODONTICS",
			domainTitle: getConsentStatutoryTitle("CONSENT_ORTHODONTICS"),
			detectedKeywords: detectedOrthoDont,
			procedureDescription: "Ортодонтическое перемещение зубов и фиксация аппаратуры",
			urgencyLevel: "invasive_orthodontics",
		});
	}

	// 4. Терапия / эндодонтия
	const detectedTherapy = detectDomainKeywords(clinicalCorpus, "therapy");
	if (detectedTherapy.length > 0 && !signedKeys.has("CONSENT_THERAPY")) {
		mismatchedItems.push({
			domainKey: "CONSENT_THERAPY",
			domainTitle: getConsentStatutoryTitle("CONSENT_THERAPY"),
			detectedKeywords: detectedTherapy,
			procedureDescription: "Терапевтическое препарирование полостей или эндодонтическая обработка корневых каналов",
			urgencyLevel: "therapy_uncovered",
		});
	}

	const hasMismatch = mismatchedItems.length > 0;
	const uncoveredTemplateKeys = mismatchedItems.map((i) => i.domainKey);
	const uncoveredProcedureNames = mismatchedItems.map((i) => i.domainTitle);

	const warningTitle = isCito
		? "Острая боль (CITO): лечение проводится незамедлительно, оформление согласий допускается параллельно"
		: "Внимание: добавлены процедуры, не покрытые текущим ИДС 1051н";

	const warningMessage = hasMismatch
		? isCito
			? `Пациент с острой болью (CITO). Обнаружены процедуры (${uncoveredProcedureNames.join("; ")}). Оказание неотложной помощи не блокируется (Мандат 8n). Оформите ИДС при первой возможности.`
			: `В план лечения или дневник приёма добавлены процедуры (${uncoveredProcedureNames.join("; ")}), на которые отсутствует подписанное информированное добровольное согласие.`
		: "Все запланированные клинические процедуры покрыты действующими информированными согласиями.";

	const legalRiskNotice = isCito
		? "В соответствии с ч. 9 ст. 20 ФЗ № 323-ФЗ при неотложных состояниях медицинское вмешательство допускается без предварительного согласия по решению консилиума/врача с последующим уведомлением. Блокировка действий врача категорически запрещена (Мандат 8n)."
		: "В соответствии со ст. 20 Федерального закона № 323-ФЗ и Приказом Минздрава РФ № 1051н, любое инвазивное вмешательство требует оформленного информированного добровольного согласия. Отсутствие ИДС при возникновении осложнений лишает клинику юридической защиты. Программа не блокирует оказание экстренной помощи (Мандат Врачебной Автономии), но рекомендует зафиксировать согласие пациента.";

	const suggestedActionLabel = isCito
		? "Оформить ИДС после снятия острой боли"
		: "Сформировать доп. согласие на новые процедуры";

	return {
		hasMismatch,
		hasSignedConsents,
		isCito,
		canProceed: isCito ? true : !hasMismatch,
		mismatchedItems,
		uncoveredTemplateKeys,
		uncoveredProcedureNames,
		warningTitle,
		warningMessage,
		legalRiskNotice,
		suggestedActionLabel,
	};
}
