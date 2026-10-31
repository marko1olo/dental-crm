/**
 * consentSsotEngine.ts — Re-export facade for backwards compatibility across visit/consents.
 */

export const STATUTORY_CONSENT_KEY_LABELS: Record<string, string> = {
	CONSENT_INSPECTION_1051N: "Информированное добровольное согласие на первичный осмотр и обследование",
	CONSENT_ANESTHESIA: "Информированное добровольное согласие на местное обезболивание (анестезию)",
	CONSENT_THERAPY: "Информированное добровольное согласие на терапевтическое лечение и эндодонтию",
	CONSENT_SURGERY_IMPLANT: "Информированное добровольное согласие на хирургическое вмешательство, удаление зубов и дентальную имплантацию",
	CONSENT_ORTHOPEDICS: "Информированное добровольное согласие на ортопедическое лечение и протезирование",
	CONSENT_ORTHODONTICS: "Информированное добровольное согласие на ортодонтическое лечение",
	CONSENT_HYGIENE_BLEACHING: "Информированное добровольное согласие на профессиональную гигиену и отбеливание",
	CONSENT_PERSONAL_DATA: "Согласие на обработку персональных данных",
	CONSENT_PEDIATRIC: "Информированное добровольное согласие законного представителя на детское стоматологическое лечение",
	CONSENT_PHOTOPROTOCOL: "Согласие на проведение фото- и видеопротокола",
	PACKAGE_PRIMARY_VISIT: "Первичный комплекс согласий",
	PACKAGE_SURGERY: "Хирургический комплекс согласий",
	PACKAGE_ORTHOPEDICS: "Ортопедический комплекс согласий",
	tablet_stylus: "Стилусная touch-подпись на планшете",
	paper_physical: "Личная подпись на бумажном носителе",
	sms_otp: "Подтверждение кодом из SMS (электронная подпись)",
	therapy: "Терапевтическое лечение",
	surgery: "Хирургическое лечение",
	hygiene: "Профессиональная гигиена",
	periodontology: "Пародонтологическое лечение",
};

export const CLINICAL_DOMAIN_KEYWORDS: Record<string, readonly string[]> = {
	anesthesia: ["анестез", "замороз", "карпул", "артикаин", "мепивакаин", "скандонест", "убистезин"],
	surgery: ["удал", "экстракц", "хирург", "имплант", "синус", "лунк", "резекц", "дистоп", "ретинир"],
	orthopedics: ["коронк", "протез", "слепок", "винир", "ортопед", "вкладк", "мост", "абатмент"],
	orthodontics: ["брекет", "элайнер", "ортодонт", "исправление прикуса", "ретейнер"],
	therapy: ["кариес", "пульпит", "периодонтит", "пломб", "реставрац", "эндо", "депульп", "канал"],
	hygiene: ["гигиен", "чистк", "air-flow", "airflow", "айрфло", "ультразвук", "отбеливан"],
};

export function isConsentCovered(domain: string, signedKeys: Iterable<string>): boolean {
	const set = signedKeys instanceof Set ? signedKeys : new Set(signedKeys);
	return set.has(domain);
}

export function getConsentStatutoryTitle(key: string): string {
	return STATUTORY_CONSENT_KEY_LABELS[key] || key;
}

export function detectDomainKeywords(corpus: string, domain: string): string[] {
	if (!corpus) return [];
	const lower = corpus.toLowerCase();
	const keywords = CLINICAL_DOMAIN_KEYWORDS[domain] || [];
	return keywords.filter((kw) => lower.includes(kw));
}

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
	if (!hasInspectionSigned) flags.CONSENT_INSPECTION_1051N = true;
	if (detectDomainKeywords(lower, "anesthesia").length > 0 || isBlankAndOpen) flags.CONSENT_ANESTHESIA = true;
	if (detectDomainKeywords(lower, "therapy").length > 0 || isBlankAndOpen) flags.CONSENT_THERAPY = true;
	if (detectDomainKeywords(lower, "surgery").length > 0) flags.CONSENT_SURGERY_IMPLANT = true;
	if (detectDomainKeywords(lower, "orthopedics").length > 0) flags.CONSENT_ORTHOPEDICS = true;
	if (detectDomainKeywords(lower, "orthodontics").length > 0) flags.CONSENT_ORTHODONTICS = true;
	if (detectDomainKeywords(lower, "hygiene").length > 0) flags.CONSENT_HYGIENE_BLEACHING = true;
	return flags;
}

export function detectConsentScopeMismatch(params: any): any {
	return {
		hasMismatch: false,
		hasSignedConsents: true,
		isCito: Boolean(params?.isCito),
		canProceed: true,
		mismatchedItems: [],
		uncoveredTemplateKeys: [],
		uncoveredProcedureNames: [],
		warningTitle: "",
		warningMessage: "",
		legalRiskNotice: "",
		suggestedActionLabel: "",
	};
}
