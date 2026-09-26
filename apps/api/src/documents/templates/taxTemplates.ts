import {
	type ClinicProfile,
	type GeneratedDocument,
	type Patient,
	type Payment,
	legacyTaxDeductionCertificateMaxYear,
	legacyTaxDeductionCertificateMinYear,
	taxDeductionCertificateMinYear,
} from "@dental/shared";
import {
	DocumentRenderContext,
	escapeHtml,
	present,
	compactParts,
	clinicDisplayName,
	clinicLicenseLine,
	clinicLegalRequisites,
	clinicPaymentRequisites,
	clinicSignatory,
	documentRequiresClinicLegalProfile,
	clinicLegalProfileMissingFields,
	documentPayloadBlockReason,
	documentRecipientLine,
	patientAdministrativeProfile,
	patientIdentityDocument,
	patientTaxpayerInn,
	patientRegistrationAddress,
	patientResidentialAddress,
	representativeDisplayLine,
	representativeAuthorityLine,
	representativeContactLine,
	issuedDate,
	rub,
	row,
} from "./baseRenderUtils.js";
import {
	bulletList,
	checkList,
	signatureBlock,
} from "./signatureRenderUtils.js";
import { baseDocument } from "./baseDocument.js";
import {
	documentTaxYear,
	taxPaymentsForDocument,
	firstTaxPayment,
	taxPaymentCodeLabel,
	namePartsForTax,
	taxPaymentSum,
	taxCertificateNumber,
	officialKnd1151156PrintBlock,
	payerNameForTax,
	payerInnForTax,
	payerBirthDateForTax,
	payerIdentityDocumentForTax,
	payerRelationshipForTax,
	taxpayerPatientSameFlag,
	patientBirthDateForTax,
	patientInnForTax,
	patientIdentityDocumentForTax,
	taxReceiptList,
	paymentFiscalReceiptDetailsLabel,
	paymentReceiptLabel,
	paymentDateLabel,
	taxRegistryRows,
	taxApplicationRelationshipLabels,
	taxApplicationDeliveryChannelLabels,
	taxApplicationFormLabels,
} from "./taxHelpers.js";

export function taxDeductionCertificate(
	document: GeneratedDocument,
	patient: Patient,
	context: DocumentRenderContext,
) {
	const taxPayments = taxPaymentsForDocument(document, context);
	const taxpayerPayment = firstTaxPayment(taxPayments);
	const regularTreatmentRub = taxPayments.length
		? taxPaymentSum(taxPayments, "1")
		: document.totalAmountRub;
	const expensiveTreatmentRub = taxPaymentSum(taxPayments, "2");
	return `<div class="notice">
      <strong>Налоговый документ.</strong>
      С 2024 года для социального вычета используется справка об оплате медицинских услуг по форме КНД 1151156,
      утвержденной приказом ФНС России от 08.11.2023 N ЕА-7-11/824@. Этот HTML - черновик данных, не финальная утвержденная печатная форма.
      Документ выпускается только по фактически оплаченным услугам и на основании заявления пациента/плательщика.
    </div>
    ${officialKnd1151156PrintBlock(
			document,
			patient,
			context,
			taxPayments,
			taxpayerPayment,
			regularTreatmentRub,
			expensiveTreatmentRub,
		)}
    <h2>Данные для справки КНД 1151156</h2>
    <table>
      ${row("ФИО пациента", patient.fullName)}
      ${row("ФИО налогоплательщика", payerNameForTax(taxpayerPayment, patient))}
      ${row("ИНН налогоплательщика", payerInnForTax(taxpayerPayment, patient))}
      ${row("Дата рождения налогоплательщика", payerBirthDateForTax(taxpayerPayment, patient))}
      ${row("Документ налогоплательщика", payerIdentityDocumentForTax(taxpayerPayment, patient))}
      ${row("Налогоплательщик и пациент являются одним лицом", taxpayerPatientSameFlag(taxpayerPayment))}
      ${row("Дата рождения пациента", patientBirthDateForTax(taxpayerPayment, patient))}
      ${row("ИНН пациента", patientInnForTax(taxpayerPayment, patient))}
      ${row("Документ пациента", patientIdentityDocumentForTax(taxpayerPayment, patient))}
      ${row("Налоговый период", documentTaxYear(document))}
      ${row("Сумма обычного лечения, код 1", rub(regularTreatmentRub))}
      ${row("Сумма дорогостоящего лечения, код 2", rub(expensiveTreatmentRub))}
      ${row("Родство с пациентом", payerRelationshipForTax(taxpayerPayment))}
      ${row("Реквизиты клиники", clinicLegalRequisites(context.clinicProfile))}
    </table>
    <h2>Фискальные основания</h2>
    <table>
      <tr><th>Дата фискального чека</th><th>Документ/чек</th><th>Код услуги</th><th>Сумма</th></tr>
      ${taxRegistryRows(taxPayments, document)}
    </table>
    <h2>Проверка администратора</h2>
    ${checkList([
			"есть заявление пациента/плательщика на выдачу справки",
			"сумма совпадает с оплатами и фискальными чеками",
			"плановые и неоплаченные услуги не включены",
			"пациент/плательщик указан корректно",
			"есть заявление плательщика; справка готовится в двух экземплярах, повторная справка по тем же расходам не выдавалась",
			"при исправлении ранее выданных сведений оформляется корректировка/аннулирование по правилам ФНС, а не новый дубликат",
			"код услуги выбран по утвержденному перечню и внутренней политике клиники",
			"справка подписана уполномоченным лицом клиники",
		])}
    ${signatureBlock("Ответственный администратор", "Главный врач/уполномоченное лицо")}`;
}

export function legacyTaxDeductionCertificate(
	document: GeneratedDocument,
	patient: Patient,
	context: DocumentRenderContext,
) {
	const taxPayments = taxPaymentsForDocument(document, context);
	const taxpayerPayment = firstTaxPayment(taxPayments);
	const regularTreatmentRub = taxPayments.length
		? taxPaymentSum(taxPayments, "1")
		: document.totalAmountRub;
	const expensiveTreatmentRub = taxPaymentSum(taxPayments, "2");
	return `<div class="notice">
      <strong>Старая налоговая справка.</strong>
      Для расходов до 2024 года используется прежний порядок справки об оплате медицинских услуг по приказу Минздрава России и МНС России от 25.07.2001 N 289/БГ-3-04/256.
      Этот HTML - черновик данных и контрольный лист для клиники; перед выдачей администратор должен проверить актуальность периода, подпись, печать и локальный бланк клиники.
    </div>
    <h2>Справка об оплате медицинских услуг для налоговой до 2024 года</h2>
    <table>
      ${row("ФИО пациента", patient.fullName)}
      ${row("ФИО налогоплательщика", payerNameForTax(taxpayerPayment, patient))}
      ${row("ИНН налогоплательщика", payerInnForTax(taxpayerPayment, patient))}
      ${row("Документ налогоплательщика", payerIdentityDocumentForTax(taxpayerPayment, patient))}
      ${row("Дата рождения пациента", patientBirthDateForTax(taxpayerPayment, patient))}
      ${row("ИНН пациента", patientInnForTax(taxpayerPayment, patient))}
      ${row("Документ пациента", patientIdentityDocumentForTax(taxpayerPayment, patient))}
      ${row("Налоговый период оплаты", documentTaxYear(document))}
      ${row("Обычные медицинские услуги, код 1", rub(regularTreatmentRub))}
      ${row("Дорогостоящие медицинские услуги, код 2", rub(expensiveTreatmentRub))}
      ${row("Родство с пациентом", payerRelationshipForTax(taxpayerPayment))}
      ${row("Реквизиты клиники", clinicLegalRequisites(context.clinicProfile))}
    </table>
    <h2>Фискальные основания</h2>
    <table>
      <tr><th>Дата оплаты</th><th>Документ/чек</th><th>Код услуги</th><th>Сумма</th></tr>
      ${taxRegistryRows(taxPayments, document)}
    </table>
    <h2>Контроль перед выдачей</h2>
    ${checkList([
			"год оплаты находится в старом порядке 2021-2023, а не в форме КНД 1151156",
			"проверены ФИО, ИНН и документ налогоплательщика",
			"суммы совпадают с фактическими оплатами и фискальными чеками",
			"коды 1/2 разделены по утвержденному перечню и внутренней политике клиники",
			"справка выдается на локальном бланке клиники, подписывается уполномоченным лицом и не включает неоплаченные планы",
		])}
    ${signatureBlock("Ответственный администратор", "Главный врач/уполномоченное лицо")}`;
}

export function taxApplicationFiscalReceiptLine(payment: Payment): string {
	return compactParts([
		payment.fiscalReceiptNumber?.trim()
			? `чек ${payment.fiscalReceiptNumber.trim()}`
			: "чек без номера",
		payment.fiscalReceiptIssuedAt?.trim()
			? `от ${payment.fiscalReceiptIssuedAt.trim()}`
			: payment.paidAt?.trim()
				? `оплата ${payment.paidAt.trim()}`
				: null,
		rub(payment.amountRub),
	]);
}

export function taxApplicationSelectedPaymentsSummary(
	payments: Payment[],
	selectedPaymentCount: number,
): string {
	if (!selectedPaymentCount) {
		return "чеки пока не выбраны: администратор сверит кассу перед выпуском справки";
	}
	if (!payments.length) {
		return "выбранные чеки не найдены в кассе: обновите выбор перед выдачей";
	}
	return payments.map(taxApplicationFiscalReceiptLine).join("; ");
}

export function taxDeductionApplication(
	document: GeneratedDocument,
	patient: Patient,
	context: DocumentRenderContext,
) {
	const payload = document.payload?.taxDeductionApplication;
	const payloadSelectedPaymentIds = payload?.selectedPaymentIds ?? [];
	const selectedPaymentIds = new Set(payloadSelectedPaymentIds);
	const taxPayments = payload
		? selectedPaymentIds.size
			? taxPaymentsForDocument(document, context).filter((payment) =>
					selectedPaymentIds.has(payment.id),
				)
			: []
		: taxPaymentsForDocument(document, context);
	const taxpayerPayment = firstTaxPayment(taxPayments);
	const taxpayerName =
		payload?.taxpayerFullName ?? payerNameForTax(taxpayerPayment, patient);
	const taxpayerInn =
		payload?.taxpayerInn ?? payerInnForTax(taxpayerPayment, patient);
	const taxpayerBirthDate =
		payload?.taxpayerBirthDate ??
		payerBirthDateForTax(taxpayerPayment, patient);
	const taxpayerIdentityDocument =
		payload?.taxpayerIdentityDocument ??
		payerIdentityDocumentForTax(taxpayerPayment, patient);
	const taxpayerRelationship = payload
		? taxApplicationRelationshipLabels[payload.relationshipToPatient]
		: payerRelationshipForTax(taxpayerPayment);
	const requestedTaxYear = payload?.requestedTaxYear ?? document.taxYear;
	const requestedForm =
		payload?.requestedForm ??
		(requestedTaxYear && requestedTaxYear < taxDeductionCertificateMinYear
			? "legacy_2021_2023"
			: "knd_1151156");
	const deliveryChannel = payload
		? taxApplicationDeliveryChannelLabels[payload.deliveryChannel]
		: "бумажно / электронно / через личный кабинет при наличии процесса";
	const recipient =
		payload?.contactForReadyDocument ?? documentRecipientLine(patient);
	const targetCertificate = taxApplicationFormLabels[requestedForm];
	const requestDate = payload?.requestedAt ?? issuedDate(document);
	const authorityDocument =
		payload?.applicantAuthorityDocument?.trim() ||
		"не требуется, если заявитель и налогоплательщик совпадают";
	return `<h2>Заявление на справку для налогового вычета</h2>
    <p>Прошу подготовить ${escapeHtml(targetCertificate)} для представления в налоговый орган.</p>
    <table>
      ${row("Пациент", patient.fullName)}
      ${row("Налогоплательщик/плательщик", taxpayerName)}
      ${row("ИНН налогоплательщика", taxpayerInn)}
      ${row("Дата рождения налогоплательщика", taxpayerBirthDate)}
      ${row("Документ налогоплательщика", taxpayerIdentityDocument)}
      ${row("Налоговый период", requestedTaxYear ? String(requestedTaxYear) : documentTaxYear(document))}
      ${row("Запрошенная форма", targetCertificate)}
      ${payload ? row("Выбранные фискальные чеки", taxApplicationSelectedPaymentsSummary(taxPayments, payloadSelectedPaymentIds.length)) : ""}
      ${row("Родство с пациентом", taxpayerRelationship)}
      ${row("Кому выдать документ", recipient)}
      ${row("Канал получения", deliveryChannel)}
      ${row("Дата заявления", requestDate)}
      ${row("Основание полномочий представителя", authorityDocument)}
    </table>
    ${
			taxPayments.length
				? `<h2>Заявленные оплаты</h2>
    <table>
      <tr><th>Дата оплаты</th><th>Документ/чек</th><th>Код услуги</th><th>Сумма</th></tr>
      ${taxRegistryRows(taxPayments, document)}
    </table>`
				: payload
					? `<div class="notice">Фискальные чеки не включены в заявление автоматически. Администратор выберет оплаченные чеки перед выпуском справки или реестра.</div>`
					: ""
		}
    <h2>Контроль перед выпуском справки</h2>
    ${checkList([
			"заявление подписано пациентом или плательщиком",
			"проверены ФИО, ИНН, родство и контакт для выдачи",
			"дата рождения и документ налогоплательщика сверены с заявлением",
			"оплаты и фискальные чеки найдены в кассе за выбранный налоговый период",
			"обычное лечение код 1 и дорогостоящее лечение код 2 будут разделены перед выдачей справки",
			"неоплаченные планы лечения и предварительные сметы не попадут в КНД 1151156",
			"повторная справка по тем же расходам не выпускается без аннулирования или корректировки предыдущей",
		])}
    ${signatureBlock("Заявитель", "Администратор")}`;
}


export function taxDeductionRegistry(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const taxPayments = taxPaymentsForDocument(document, context);
	return `<h2>Реестр оплат для налоговой справки КНД 1151156</h2>
    <p>Налоговый период: ${escapeHtml(documentTaxYear(document))}. Суммы ниже должны сверяться с кассовыми и фискальными данными именно за этот год.</p>
    <table>
      <tr><th>Дата оплаты</th><th>Документ/чек</th><th>Код услуги</th><th>Сумма</th></tr>
      ${taxRegistryRows(taxPayments, document)}
    </table>
    ${checkList([
			"сверить все оплаты пациента/плательщика за налоговый период",
			"разделить обычное и дорогостоящее лечение при необходимости",
			"не включать неоплаченные планы лечения",
			"проверить заявление на выдачу справки и ИНН налогоплательщика",
			"использовать реестр как контроль перед выпуском КНД 1151156",
		])}
    ${signatureBlock("Ответственный администратор", "Бухгалтер/уполномоченное лицо")}`;
}
