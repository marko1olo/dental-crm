import type {
	ConsentScopeMismatchItem,
	ConsentScopeMismatchParams,
	ConsentScopeMismatchResult,
} from "./types";
import { getConsentStatutoryTitle, detectDomainKeywords } from "./detection";

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
		? "Оказание экстренной помощи по острой боли: лечение проводится незамедлительно, оформление согласий допускается параллельно"
		: "Внимание: добавлены процедуры, не покрытые текущим согласием на лечение";

	const warningMessage = hasMismatch
		? isCito
			? `Оказание экстренной помощи по острой боли. Обнаружены процедуры (${uncoveredProcedureNames.join("; ")}). Оказание неотложной помощи не блокируется. Оформите ИДС при первой возможности.`
			: `В план лечения или дневник приёма добавлены процедуры (${uncoveredProcedureNames.join("; ")}), на которые отсутствует подписанное информированное добровольное согласие.`
		: "Все запланированные клинические процедуры покрыты действующими информированными согласиями.";

	const legalRiskNotice = isCito
		? "В соответствии с ч. 9 ст. 20 ФЗ № 323-ФЗ при неотложных состояниях медицинское вмешательство допускается без предварительного согласия по решению консилиума/врача с последующим уведомлением. Блокировка действий врача не допускается."
		: "В соответствии со ст. 20 Федерального закона № 323-ФЗ и Приказом Минздрава РФ № 1051н, любое инвазивное вмешательство требует оформленного информированного добровольного согласия. Отсутствие ИДС при возникновении осложнений лишает клинику юридической защиты. Программа не блокирует оказание экстренной помощи, но рекомендует зафиксировать согласие пациента.";

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
