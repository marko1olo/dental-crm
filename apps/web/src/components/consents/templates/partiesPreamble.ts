import type {
	ConsentSubstitutionContext,
	ConsentTemplateKey,
} from "./types";

/**
 * Формирование преамбулы сторон с учетом правового статуса документа (согласие / отказ / гарантия / несовершеннолетний)
 */
export function buildPartiesPreambleHtml(
	templateKey: ConsentTemplateKey,
	context: ConsentSubstitutionContext,
	ptName: string,
	ptBirth: string,
	ptPassport: string,
	ptSnils: string,
	ptPhone: string,
	docName: string,
	clinicName: string,
): string {
	const isMinor =
		(typeof context.patientAgeYears === "number" && context.patientAgeYears < 15) ||
		(Boolean(context.guardianName?.trim()) && context.guardianName !== "________________________");

	let subjectLine = `Я, <strong>${ptName}</strong>, дата рождения: ${ptBirth}, документ, удостоверяющий личность: ${ptPassport}, СНИЛС: ${ptSnils}, тел.: ${ptPhone}`;
	if (isMinor) {
		const repName = context.guardianName?.trim() || "________________________";
		const repRel = context.guardianRelation?.trim() || "мать / отец / опекун";
		const repDoc = context.guardianDocument?.trim() || "паспорт серия ______ № ________";
		subjectLine = `Я, <strong>${repName}</strong> (статус / родство: ${repRel}, документ: ${repDoc}), действуя в качестве законного представителя несовершеннолетнего <strong>${ptName}</strong> (дата рождения: ${ptBirth}, документ: ${ptPassport})`;
	}

	let statement = `настоящим даю информированное добровольное согласие лечащему врачу <strong>${docName}</strong> в медицинской организации <strong>${clinicName}</strong>.`;

	if (templateKey === "CONSENT_TREATMENT_REFUSAL") {
		statement = `настоящим заявляю об отказе от предложенного медицинского вмешательства (стоматологического лечения) лечащего врача <strong>${docName}</strong> в медицинской организации <strong>${clinicName}</strong> в соответствии с частью 3 статьи 20 Федерального закона № 323-ФЗ и Приказом Минздрава РФ № 1051н (Приложение № 2).`;
	} else if (templateKey === "CONSENT_EGISZ_REFUSAL") {
		statement = `настоящим заявляю об отказе от передачи персональных данных и сведений о состоянии моего здоровья в ЕГИСЗ из медицинской организации <strong>${clinicName}</strong> в соответствии со статьей 13 Федерального закона № 323-ФЗ.`;
	} else if (templateKey === "CONSENT_WARRANTY_PASSPORT" || templateKey === "CONSENT_WARRANTY_POLICY") {
		statement = `настоящим подтверждаю ознакомление и согласие с гарантийными обязательствами и сроками службы при оказании медицинских услуг в медицинской организации <strong>${clinicName}</strong>.`;
	}

	return `
      <div class="parties-block">
        ${subjectLine},<br>
        ${statement}
      </div>`;
}
