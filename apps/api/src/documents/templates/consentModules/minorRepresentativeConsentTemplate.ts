import {
	type GeneratedDocument,
	type MinorLegalRepresentativeConsentPayload,
	type Patient,
} from "@dental/shared";
import {
	documentRecipientLine,
	representativeAuthorityLine,
	representativeContactLine,
	representativeDisplayLine,
	row,
} from "../baseRenderUtils.js";
import {
	bulletList,
	checkList,
	signatureBlock,
	signatureParty,
} from "../signatureRenderUtils.js";

export function consentFlag(value: boolean): string {
	return value ? "разрешено" : "не разрешено";
}

export function minorLegalRepresentativeConsent(
	document: GeneratedDocument,
	patient: Patient,
): string {
	const payload = document.payload?.minorLegalRepresentativeConsent as
		| MinorLegalRepresentativeConsentPayload
		| undefined;
	if (payload) {
		return `<h2>Согласие законного представителя несовершеннолетнего</h2>
      <div class="notice">
        Документ фиксирует согласие законного представителя на конкретное стоматологическое вмешательство.
        Основание: информирование о целях, методах, рисках, альтернативах и предполагаемом результате медицинской помощи.
      </div>
      <table>
        ${row("Несовершеннолетний пациент", `${payload.minorFullName}, дата рождения: ${payload.minorBirthDate}`)}
        ${row("Законный представитель", payload.representativeFullName)}
        ${row("Родство/статус", payload.representativeRelationship)}
        ${row("Документ представителя", payload.representativeIdentityDocument)}
        ${row("Основание полномочий", payload.authorityDocument)}
        ${row("Контакт представителя", payload.representativePhone?.trim() || "контакт хранится в карте пациента")}
        ${row("Вмешательство", payload.interventionScope)}
        ${row("Диагноз/показание", payload.diagnosisOrIndication)}
        ${row("Врач", payload.doctorFullName)}
        ${row("Дата и время согласия", payload.signedAt)}
      </table>
      <h2>Разъясненные риски</h2>
      ${bulletList(payload.explainedRisks)}
      <h2>Альтернативы</h2>
      ${bulletList(payload.alternativesExplained)}
      ${checkList([
				"личность законного представителя проверена",
				"полномочия представителя подтверждены документом",
				"представитель получил понятное объяснение плана, рисков, альтернатив и ожидаемого результата",
				"согласие будет храниться в медицинской документации пациента",
				"ребенку дано объяснение по возрасту и состоянию",
			])}
      ${signatureBlock("Законный представитель", signatureParty("Администратор/врач", payload.doctorFullName))}`;
	}
	return `<h2>Согласие законного представителя</h2>
    <table>
      ${row("Пациент", patient.fullName)}
      ${row("Законный представитель", representativeDisplayLine(patient))}
      ${row("Основание полномочий", representativeAuthorityLine(patient))}
      ${row("Контакт представителя", representativeContactLine(patient))}
      ${row("Кому выдавать документы", documentRecipientLine(patient))}
    </table>
    ${checkList([
			"личность представителя проверена",
			"полномочия представителя подтверждены",
			"анамнез ребенка заполнен отдельно: аллергии, лекарства, хронические заболевания, прививки/инфекции по необходимости",
			"представитель получил объяснение плана лечения, рисков, альтернатив и стоимости",
			"при необходимости ребенок получил понятное возрасту объяснение процедуры",
		])}
    ${signatureBlock("Законный представитель", "Администратор/врач")}`;
}
