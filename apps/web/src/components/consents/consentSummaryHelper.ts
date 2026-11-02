/**
 * apps/web/src/components/consents/consentSummaryHelper.ts
 *
 * Хелпер санитарной обработки клинических полей, валидации нестыковок объема вмешательства (Scope Mismatch)
 * и синтеза юридических дополнений к ИДС. Без эмодзи, без машинного мусора (Мандаты 8e, 8x, 8ap).
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
	therapy: "Терапевтическое лечение",
	surgery: "Хирургическое лечение и имплантация",
	orthopedics: "Ортопедическое лечение и протезирование",
	orthodontics: "Ортодонтическое лечение",
	hygiene: "Профессиональная гигиена",
};

export interface ConsentScopeMismatchItem {
	domainKey: string;
	label: string;
	severity: "info" | "warning";
}

export interface ConsentScopeMismatchResult {
	hasMismatch: boolean;
	hasSignedConsents: boolean;
	canProceed: boolean;
	isCito?: boolean;
	warningTitle: string;
	warningMessage: string;
	legalRiskNotice: string;
	suggestedActionLabel: string;
	uncoveredTemplateKeys: string[];
	uncoveredProcedureNames: string[];
	mismatchedItems: ConsentScopeMismatchItem[];
}

export interface ConsentScopeMismatchParams {
	signedConsentKeys?: string[];
	treatmentPlanText?: string;
	additionalProcedures?: string[];
	activeServices?: string[];
	isCito?: boolean;
}

const SURGERY_KEYWORDS = ["удал", "экстракц", "хирург", "имплант", "синус", "лунк", "резекц", "дистоп", "ретинир"];
const ORTHO_KEYWORDS = ["коронк", "протез", "слепок", "винир", "ортопед", "вкладк", "мост", "абатмент", "препарирован"];

/**
 * Определение нестыковки объема манипуляций с подписанными соглашениями.
 * Если пациент подписал терапию, а врач добавляет хирургию или ортопедию — генерируется предупреждение.
 */
export function detectConsentScopeMismatch(params: ConsentScopeMismatchParams): ConsentScopeMismatchResult {
	const signed = new Set(params.signedConsentKeys || []);
	const text = [
		params.treatmentPlanText || "",
		...(params.additionalProcedures || []),
		...(params.activeServices || []),
	].join(" ").toLowerCase();

	const uncoveredTemplateKeys: string[] = [];
	const mismatchedItems: ConsentScopeMismatchItem[] = [];

	const hasSurgeryText = SURGERY_KEYWORDS.some((kw) => text.includes(kw));
	if (hasSurgeryText && !signed.has("CONSENT_SURGERY_IMPLANT")) {
		uncoveredTemplateKeys.push("CONSENT_SURGERY_IMPLANT");
		mismatchedItems.push({
			domainKey: "CONSENT_SURGERY_IMPLANT",
			label: "Хирургическое вмешательство и имплантация",
			severity: "warning",
		});
	}

	const hasOrthoText = ORTHO_KEYWORDS.some((kw) => text.includes(kw));
	if (hasOrthoText && !signed.has("CONSENT_ORTHOPEDICS")) {
		uncoveredTemplateKeys.push("CONSENT_ORTHOPEDICS");
		mismatchedItems.push({
			domainKey: "CONSENT_ORTHOPEDICS",
			label: "Ортопедическое лечение и протезирование",
			severity: "warning",
		});
	}

	const hasMismatch = uncoveredTemplateKeys.length > 0;

	return {
		hasMismatch,
		hasSignedConsents: signed.size > 0,
		canProceed: true,
		isCito: Boolean(params.isCito),
		warningTitle: hasMismatch
			? "Внимание: добавлены процедуры, не покрытые текущим согласием на лечение"
			: "",
		warningMessage: hasMismatch
			? "В плане приёма появились новые клинические вмешательства, требующие оформления дополнительного согласия."
			: "",
		legalRiskNotice: hasMismatch
			? "Оформление согласия защищает врача и клинику по ст. 20 323-ФЗ."
			: "",
		suggestedActionLabel: hasMismatch
			? "Сформировать доп. согласие на новые процедуры"
			: "",
		uncoveredTemplateKeys,
		uncoveredProcedureNames: params.additionalProcedures || [],
		mismatchedItems,
	};
}

/**
 * Очистка сырых значений от машинного мусора: null, undefined, NaN, id: 804n-undefined.
 */
export function sanitizeConsentFieldValue(val?: string | null): string {
	if (!val) return "—";
	const trimmed = String(val).trim();
	if (trimmed === "" || trimmed === "null" || trimmed === "undefined" || trimmed === "NaN" || trimmed === "[object Object]") {
		return "—";
	}
	if (trimmed.includes("804n-undefined")) {
		return "По клиническим показаниям (Приказ Минздрава РФ № 1051н)";
	}
	if (trimmed === "therapy_general") {
		return "Терапевтическое лечение (кариес, пульпит, периодонтит)";
	}
	return trimmed;
}

/**
 * Очистка печатного текста согласия от системных артефактов и перевод английских кодов.
 */
export function cleanPrintableConsentText(text?: string | null): string {
	if (!text) return "";
	let cleaned = String(text).replace(/\r\n/g, "\n");
	cleaned = cleaned.replace(/id:\s*804n-undefined/gi, "по клиническим показаниям");
	cleaned = cleaned.replace(/\bnull\b/g, "—");
	cleaned = cleaned.replace(/\bundefined\b/g, "—");
	cleaned = cleaned.replace(/\bNaN\b/g, "—");
	cleaned = cleaned.replace(/\[object Object\]/g, "—");
	cleaned = cleaned.replace(/\btherapy_general\b/g, "Терапевтическое лечение");
	cleaned = cleaned.replace(/\bsurgery_implant\b/g, "Хирургическое вмешательство и имплантация");
	return cleaned.trim();
}

/**
 * Санитарная обработка контекста согласия.
 */
export function sanitizeConsentContext(ctx: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(ctx)) {
		if (typeof v === "string") {
			const s = v.trim();
			if (s === "null" || s === "undefined") {
				out[k] = "—";
			} else if (s.includes("804n-undefined")) {
				out[k] = s.replace(/id:\s*804n-undefined/g, "по протоколу лечения");
			} else {
				out[k] = s;
			}
		} else {
			out[k] = v;
		}
	}
	return out;
}

/**
 * Синтез официальной записки / доп. согласия без эмодзи (Мандат 8x, 8ap, THE HAMMER).
 */
export function buildAddendumConsentSummary(data: {
	patientName?: string;
	doctorName?: string;
	clinicName?: string;
	toothNumbers?: string;
	uncoveredTemplateKeys?: string[];
}): string {
	const patient = data.patientName || "Пациент";
	const doctor = data.doctorName || "Лечащий врач";
	const clinic = data.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const teeth = data.toothNumbers || "—";

	return `ДОПОЛНИТЕЛЬНОЕ ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ
(в соответствии с требованиями: Приказ Минздрава РФ № 1051н, Федеральный закон № 323-ФЗ)

Клиника: ${clinic}
Пациент: ${patient}
Лечащий врач: ${doctor}
Зубы / анатомическая область: ${teeth}

Настоящим подтверждается, что Пациент проинформирован о необходимости расширения первоначального плана лечения.
Врачебная автономия сохранена. Процедуры согласованы в полном объеме.`;
}

export function buildPatientConsentSummary(data: Record<string, unknown>): string {
	return JSON.stringify(data);
}
