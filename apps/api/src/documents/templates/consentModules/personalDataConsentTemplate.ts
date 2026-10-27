import {
	type GeneratedDocument,
	type Patient,
	type PersonalDataProcessingConsentPayload,
} from "@dental/shared";
import {
	compactParts,
	escapeHtml,
	legalRepresentativeDocument,
	legalRepresentativeName,
	legalRepresentativeRelationship,
	patientDataProcessingBasisNote,
	patientIdentityDocument,
	patientInsurancePolicyNumber,
	patientRegistrationAddress,
	patientResidentialAddress,
	patientSnils,
	patientTaxpayerInn,
	representativeIdentityLine,
	row,
} from "../baseRenderUtils.js";
import {
	bulletList,
	checkList,
	signatureBlock,
} from "../signatureRenderUtils.js";

export function personalDataConsent(document: GeneratedDocument, patient: Patient): string {
	const payload = document.payload?.personalDataProcessingConsent as
		| PersonalDataProcessingConsentPayload
		| undefined;

	if (payload) {
		const representativeIdentity = compactParts([
			legalRepresentativeName(patient),
			legalRepresentativeDocument(patient),
			legalRepresentativeRelationship(patient),
		]);

		return `<h2>Согласие на обработку персональных данных</h2>
      <p>Пациент дает добровольное, конкретное и информированное согласие оператору на обработку персональных данных, включая сведения о здоровье, в пределах целей и правил, указанных ниже.</p>
      <table>
        ${row("Оператор персональных данных", payload.operatorLegalName)}
        ${row("ИНН оператора", payload.operatorInn)}
        ${row("Адрес оператора", payload.operatorAddress)}
        ${row("Субъект персональных данных", patient.fullName)}
        ${patient.birthDate ? row("Дата рождения пациента", patient.birthDate) : ""}
        ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
        ${patientTaxpayerInn(patient) ? row("ИНН пациента", patientTaxpayerInn(patient) ?? "") : ""}
        ${patientRegistrationAddress(patient) ? row("Адрес регистрации", patientRegistrationAddress(patient) ?? "") : ""}
        ${patientResidentialAddress(patient) ? row("Адрес проживания", patientResidentialAddress(patient) ?? "") : ""}
        ${patientInsurancePolicyNumber(patient) ? row("Полис/ДМС", patientInsurancePolicyNumber(patient) ?? "") : ""}
        ${patientSnils(patient) ? row("СНИЛС", patientSnils(patient) ?? "") : ""}
        ${representativeIdentity ? row("Законный представитель/получатель", representativeIdentity) : ""}
        ${patientDataProcessingBasisNote(patient) ? row("Основание/комментарий клиники", patientDataProcessingBasisNote(patient) ?? "") : ""}
        ${row("Трансграничная передача", payload.crossBorderTransferAllowed ? "разрешена в пределах указанных целей и получателей" : "не разрешена")}
        ${row("Автоматизированные решения", payload.automatedDecisionMakingAllowed ? "разрешены только без юридически значимых решений без участия сотрудника" : "не разрешены")}
        ${row("Срок хранения", payload.retentionPeriod)}
        ${row("Порядок отзыва согласия", payload.revocationChannel)}
        ${row("Дата и время согласия", payload.consentGivenAt)}
      </table>
      <h2>Цели обработки</h2>
      ${bulletList(payload.processingPurposes)}
      <h2>Категории персональных данных</h2>
      ${bulletList(payload.personalDataCategories)}
      <h2>Действия с данными</h2>
      ${bulletList(payload.processingActions)}
      <h2>Передача третьим лицам</h2>
      <p>${escapeHtml(payload.thirdPartyTransferRules)}</p>
      ${checkList([
				"пациент подтвердил добровольное согласие без принуждения",
				"пациент отдельно уведомлен об обработке медицинских данных и сведений о здоровье",
				"оператор обязан прекратить новые необязательные обработки после отзыва согласия, если нет законного основания продолжать хранение",
				"маркетинг, публикации и передача вне медицинского процесса требуют отдельного основания или отдельной отметки пациента",
			])}
      ${signatureBlock("Пациент/законный представитель", "Оператор/представитель клиники")}`;
	}

	return `<h2>Согласие на обработку персональных данных</h2>
    <p>Пациент дает согласие на обработку персональных данных и медицинской информации в целях оказания медицинской помощи, ведения медицинской документации, расчетов, связи и выполнения требований законодательства.</p>
    <table>
      ${row("Субъект персональных данных", patient.fullName)}
      ${patientIdentityDocument(patient) ? row("Документ пациента", patientIdentityDocument(patient) ?? "") : ""}
      ${patientTaxpayerInn(patient) ? row("ИНН пациента", patientTaxpayerInn(patient) ?? "") : ""}
      ${patientRegistrationAddress(patient) ? row("Адрес регистрации", patientRegistrationAddress(patient) ?? "") : ""}
      ${patientResidentialAddress(patient) ? row("Адрес проживания", patientResidentialAddress(patient) ?? "") : ""}
      ${patientInsurancePolicyNumber(patient) ? row("Полис/ДМС", patientInsurancePolicyNumber(patient) ?? "") : ""}
      ${patientSnils(patient) ? row("СНИЛС", patientSnils(patient) ?? "") : ""}
      ${row("Законный представитель/получатель", representativeIdentityLine(patient))}
      ${patientDataProcessingBasisNote(patient) ? row("Основание/комментарий клиники", patientDataProcessingBasisNote(patient) ?? "") : ""}
    </table>
    <h2>Категории данных</h2>
    ${checkList([
			"ФИО, дата рождения, контакты, документы, адрес",
			"медицинские сведения, диагнозы, снимки, планы лечения, назначения",
			"платежи, договоры, акты, налоговые документы",
			"история обращений, коммуникации и записи согласий",
		])}
    <h2>Ограничения</h2>
    <p>Перед использованием шаблона клиника должна указать оператора ПДн, цели, сроки хранения, способы обработки, передачу третьим лицам и порядок отзыва согласия.</p>
    ${signatureBlock("Пациент/законный представитель", "Оператор/представитель клиники")}`;
}
