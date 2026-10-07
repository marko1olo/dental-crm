import {
	type ClinicProfile,
	type GeneratedDocument,
	type InstallmentPaymentSchedulePayload,
	type Patient,
	type Payment,
	type PaymentInvoicePayload,
	type PaymentReceiptPayload,
	type ServiceCatalogItem,
	type TreatmentCostEstimatePayload,
	type TreatmentPlanItem,
	parseKopecks,
	splitKopecks,
	sumKopecks,
} from "@dental/shared";
import { legalMoneyInWordsRu } from "../moneyWordsRu.js";
import {
	DocumentRenderContext,
	escapeHtml,
	present,
	digitsOnly,
	compactParts,
	patientAdministrativeProfile,
	patientIdentityDocument,
	patientTaxpayerInn,
	patientRegistrationAddress,
	patientResidentialAddress,
	clinicDisplayName,
	clinicLicenseLine,
	clinicLegalRequisites,
	clinicPaymentRequisites,
	clinicSignatory,
	documentRequiresClinicLegalProfile,
	clinicLegalProfileMissingFields,
	documentPayloadBlockReason,
	row,
	cell,
	issuedDate,
	rub,
	rublesFromKopecks,
} from "./baseRenderUtils.js";
import {
	bulletList,
	checkList,
	signatureBlock,
	signatureParty,
} from "./signatureRenderUtils.js";
import { baseDocument } from "./baseDocument.js";
import {
	treatmentPlanItemTotalKopecks,
	treatmentPlanTotalKopecks,
	treatmentPlanTotalRub,
	financialServiceRows,
	financialServiceTable,
	remainingRubOrNull,
	paidTotalKopecksForDocument,
	paidTotalForDocument,
	installmentRows,
} from "./contractAndActTemplates.js";
import {
	paidPaymentsForDocument,
	paymentReceiptRows,
} from "./taxHelpers.js";

export function treatmentCostEstimate(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const payload = document.payload?.treatmentCostEstimate as
		| TreatmentCostEstimatePayload
		| undefined;
	const clinicProfile = context.clinicProfile;
	const signatory = clinicSignatory(clinicProfile);

	if (payload) {
		const totalWords = legalMoneyInWordsRu(payload.totalAmountRub);
		const serviceRows = payload.serviceLines
			.map(
				(line, index) => `<tr>
          <td class="text-center tabular-nums">${index + 1}</td>
          <td class="text-center tabular-nums">A16.07.001</td>
          <td>${escapeHtml(line.serviceName)}</td>
          <td class="text-center">${escapeHtml(present(line.toothOrArea) ?? "без отдельной области")}</td>
          <td class="text-center tabular-nums">${line.quantity}</td>
          <td class="text-right tabular-nums">${escapeHtml(rub(line.unitPriceRub))}</td>
          <td class="text-right tabular-nums">${escapeHtml(rub(line.discountRub))}</td>
          <td class="text-right tabular-nums"><strong>${escapeHtml(rub(line.totalRub))}</strong></td>
        </tr>`,
			)
			.join("");

		return `<h2>Предварительная смета на оказание медицинских услуг № ${escapeHtml(payload.estimateNumber)}</h2>
      <div class="notice">
        Смета составлена в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736. Смета фиксирует предварительный расчет объема и стоимости стоматологических услуг и материалов. Окончательный расчет производится по фактически оказанным услугам с оформлением акта и выдачей кассового чека.
      </div>

      <table>
        ${row("Номер и дата сметы", `${payload.estimateNumber} от ${payload.estimateDate}`)}
        ${row("Пациент / Плательщик", payload.patientOrPayerFullName)}
        ${row("Клиническое основание / диагноз", payload.treatmentBasis)}
        ${row("Срок действия сметы", payload.estimateValidUntil)}
        ${row("Ответственный врач", payload.responsibleDoctorFullName)}
        ${row("Ответственный администратор", present(payload.responsibleAdminFullName) ?? "дежурный администратор")}
        ${row("Дата согласования", payload.signedAt)}
      </table>

      <h2>Перечень планируемых медицинских услуг и материалов</h2>
      <table class="financial-table">
        <thead>
          <tr>
            <th style="width: 5%;">№ п/п</th>
            <th style="width: 12%;">Код услуги</th>
            <th style="width: 33%;">Наименование услуги / материала</th>
            <th style="width: 14%;">Зуб / область</th>
            <th style="width: 6%;">Кол-во</th>
            <th style="width: 10%; text-align: right;">Цена, руб.</th>
            <th style="width: 10%; text-align: right;">Скидка, руб.</th>
            <th style="width: 10%; text-align: right;">Итого, руб.</th>
          </tr>
        </thead>
        <tbody>
          ${serviceRows}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="7" style="text-align: right;">ИТОГО ПО СМЕТЕ:</th>
            <th class="text-right tabular-nums">${escapeHtml(rub(payload.totalAmountRub))}</th>
          </tr>
        </tfoot>
      </table>

      <div class="total-words-box">
        <strong>Сумма прописью:</strong> ${escapeHtml(totalWords)}
      </div>

      <table>
        ${row("Порядок и этапы оплаты", payload.paymentMilestoneNotes)}
        ${row("Правила изменения объема и стоимости", payload.priceChangeRules)}
      </table>

      <h2>Не входит в текущую смету (дополнительные расходы при необходимости)</h2>
      ${bulletList(payload.excludedItems)}

      <h2>Подтверждения пациента</h2>
      ${checkList([
				"пациент (плательщик) ознакомлен с предварительным характером сметы и сроком ее действия",
				"состав услуг и материалов полностью сверен с согласованным планом лечения",
				"пациент предупрежден, что смета является неотъемлемой частью договора на оказание платных медицинских услуг",
				"изменение объема или технологии лечения требует составления дополнительной сметы до начала вмешательства",
			])}

      <h2>Реквизиты и подписи</h2>
      <div class="executive-requisites">
        <div class="executive-requisites-col">
          <div class="executive-requisites-title">Исполнитель</div>
          <div>${escapeHtml(clinicPaymentRequisites(clinicProfile))}</div>
        </div>
        <div class="executive-requisites-col">
          <div class="executive-requisites-title">Пациент / Плательщик</div>
          <div><strong>Ф.И.О.:</strong> ${escapeHtml(payload.patientOrPayerFullName)}</div>
          <div><strong>Дата согласования:</strong> ${escapeHtml(payload.signedAt)}</div>
        </div>
      </div>
      ${signatureBlock("Пациент / Плательщик", signatureParty("Ответственный врач / представитель клиники", payload.responsibleDoctorFullName || signatory))}`;
	}

	return `<h2>Предварительная смета на лечение</h2>
    <div class="notice">
      Предварительный расчет стоимости услуг по плану лечения (Постановление Правительства РФ от 11.05.2023 № 736).
    </div>
    <h2>Перечень услуг и материалов</h2>
    ${financialServiceTable(document, context, true)}
    <table>
      ${row("Итого по смете", rub(treatmentPlanTotalRub(document, context)))}
      ${row("Связанный план/визит", document.visitId ? `визит ${document.visitId}` : "план пациента без отдельного визита")}
    </table>
    <h2>Правила и условия сметы</h2>
    ${bulletList([
			"смета является предварительной и может уточняться в процессе лечения по согласованию с пациентом",
			"дополнительные материалы, лабораторные этапы и снимки вносятся в план отдельными строками",
			"оплата производится в соответствии с условиями договора и фактически оказанным объемом",
		])}
    ${signatureBlock("Пациент / Плательщик", signatureParty("Представитель клиники", signatory))}`;
}

export function paymentInvoice(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const payload = document.payload?.paymentInvoice as
		| PaymentInvoicePayload
		| undefined;
	const clinicProfile = context.clinicProfile;
	const signatory = clinicSignatory(clinicProfile);

	if (payload) {
		const totalWords = legalMoneyInWordsRu(payload.totalAmountRub);
		const payerContact =
			compactParts([payload.payerPhone, payload.payerEmail]) ||
			"по данным карты пациента";
		const serviceRows = payload.serviceLines
			.map(
				(line, index) => `<tr>
          <td class="text-center tabular-nums">${index + 1}</td>
          <td>${escapeHtml(line.serviceName)}</td>
          <td class="text-center">${escapeHtml(present(line.toothOrArea) ?? "без отдельной области")}</td>
          <td class="text-center tabular-nums">${line.quantity}</td>
          <td class="text-right tabular-nums">${escapeHtml(rub(line.unitPriceRub))}</td>
          <td class="text-right tabular-nums">${escapeHtml(rub(line.discountRub))}</td>
          <td class="text-right tabular-nums"><strong>${escapeHtml(rub(line.totalRub))}</strong></td>
        </tr>`,
			)
			.join("");

		return `<h2>Счет на оплату медицинских услуг № ${escapeHtml(payload.invoiceNumber)}</h2>
      <div class="notice">
        Счет фиксирует согласованную сумму и банковские реквизиты для безналичного расчета. Счет не заменяет кассовый чек, выдаваемый при фискализации платежа.
      </div>

      <table>
        ${row("Номер и дата счета", `${payload.invoiceNumber} от ${payload.invoiceDate}`)}
        ${row("Плательщик", payload.payerFullName)}
        ${row("Контакт плательщика", payerContact)}
        ${row("Назначение платежа", payload.paymentPurpose)}
        ${row("Срок оплаты", payload.dueDate)}
        ${row("Условия оплаты", payload.paymentTerms)}
        ${row("Банковские реквизиты получателя", payload.clinicBankDetails)}
        ${row("Оплата безналично / по счету", payload.cashlessPaymentAllowed ? "разрешена" : "не используется")}
        ${row("Оплата в кассе клиники", payload.cashDeskPaymentAllowed ? "разрешена" : "не используется")}
        ${present(payload.qrPaymentPayload) ? row("QR-код / платежная строка", payload.qrPaymentPayload ?? "") : ""}
      </table>

      <h2>Состав счета</h2>
      <table class="financial-table">
        <thead>
          <tr>
            <th style="width: 6%;">№ п/п</th>
            <th style="width: 40%;">Наименование услуги / платежа</th>
            <th style="width: 14%;">Зуб / область</th>
            <th style="width: 6%;">Кол-во</th>
            <th style="width: 11%; text-align: right;">Цена, руб.</th>
            <th style="width: 11%; text-align: right;">Скидка, руб.</th>
            <th style="width: 12%; text-align: right;">Итого, руб.</th>
          </tr>
        </thead>
        <tbody>
          ${serviceRows}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="6" style="text-align: right;">ИТОГО К ОПЛАТЕ:</th>
            <th class="text-right tabular-nums">${escapeHtml(rub(payload.totalAmountRub))}</th>
          </tr>
        </tfoot>
      </table>

      <div class="total-words-box">
        <strong>Сумма к оплате прописью:</strong> ${escapeHtml(totalWords)}
      </div>

      ${checkList([
				"реквизиты клиники проверены перед передачей счета плательщику",
				"состав услуг соответствует согласованному плану лечения и договору",
				"плательщик предупрежден о необходимости указания номера счета в назначении платежа",
			])}

      <h2>Подписи сторон</h2>
      ${signatureBlock("Плательщик", signatureParty("Главный бухгалтер / Администратор", signatory))}`;
	}

	return `<h2>Счет на оплату медицинских услуг</h2>
    <table>
      ${row("Назначение платежа", `оплата стоматологических услуг по документу ${document.title}`)}
      ${row("Сумма к оплате", rub(treatmentPlanTotalRub(document, context)))}
      ${row("Получатель", clinicPaymentRequisites(clinicProfile))}
      ${row("Срок оплаты", "по согласованному плану лечения или договору")}
    </table>
    <h2>Состав счета</h2>
    ${financialServiceTable(document, context, false)}
    <p class="small">Счет не заменяет кассовый чек и медицинские документы.</p>
    ${signatureBlock("Плательщик", signatureParty("Администратор клиники", signatory))}`;
}

export function paymentReceipt(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const payload = document.payload?.paymentReceipt as
		| PaymentReceiptPayload
		| undefined;
	const documentPayments = paidPaymentsForDocument(document, context);
	const paidRub = rublesFromKopecks(
		sumKopecks(
			documentPayments.map((payment) => parseKopecks(payment.amountRub)),
		),
	);
	if (payload) {
		const payerTaxRows = payload.taxSupportRequested
			? `${row("Дата рождения", present(payload.payerBirthDate) ?? "не указана")}
        ${row("ИНН", present(payload.payerInn) ?? "не указан")}
        ${row("Документ удостоверения личности", present(payload.payerIdentityDocument) ?? "не указан")}
        ${row("Связь с пациентом", present(payload.payerRelationship) ?? "не указана")}`
			: row(
					"Налоговая опора",
					"не запрошена; паспортные данные и ИНН не включались в обычную квитанцию",
				);
		const payerCheck = payload.taxSupportRequested
			? "налоговые данные плательщика сверены с карточкой пациента, данными оплаты или документом плательщика"
			: "ФИО плательщика сверено; налоговые паспортные данные не запрашивались для обычной квитанции";
		return `<h2>Платежная квитанция DENTE</h2>
      <div class="notice">
        Документ фиксирует состав выбранных фактических оплат и реквизиты фискальных чеков. Квитанция не заменяет кассовый чек и используется как клиническое приложение к платежному досье пациента.
      </div>
      <table>
        ${row("Номер квитанции", payload.receiptNumber)}
        ${row("Дата квитанции", payload.receiptDate)}
        ${row("Клиника", clinicPaymentRequisites(context.clinicProfile))}
        ${row("Связанный документ", document.title)}
        ${row("Назначение оплаты", payload.paymentPurpose)}
        ${row("Оплачено по выбранным платежам", rub(documentPayments.length ? paidRub : payload.totalPaidRub))}
        ${row("Фискальные чеки", payload.fiscalReceiptNumbers.join("; "))}
        ${row("Выдал", payload.issuedByFullName)}
      </table>
      <h2>Плательщик</h2>
      <table>
        ${row("ФИО", payload.payerFullName)}
        ${payerTaxRows}
      </table>
      <h2>Фактические оплаты и чеки</h2>
      <table>
        <tr><th>Дата</th><th>Способ</th><th>Сумма</th><th>Фискальный чек</th><th>Плательщик</th></tr>
        ${paymentReceiptRows(documentPayments)}
      </table>
      ${checkList([
				"выбранные платежи сверены с платежным журналом",
				payerCheck,
				"номера фискальных чеков совпадают с выбранными оплатами",
				"пациент предупрежден, что квитанция не заменяет кассовый чек",
			])}
      ${signatureBlock("Администратор", "Пациент/плательщик")}`;
	}
	return `<h2>Памятка по оплате</h2>
    <table>
      ${row("Клиника", clinicPaymentRequisites(context.clinicProfile))}
      ${row("Оплачено", rub(documentPayments.length ? paidRub : document.totalAmountRub))}
      ${row("Связанный документ", document.title)}
    </table>
    <h2>Фактические оплаты и чеки</h2>
    <table>
      <tr><th>Дата</th><th>Способ</th><th>Сумма</th><th>Фискальный чек</th><th>Плательщик</th></tr>
      ${paymentReceiptRows(documentPayments)}
    </table>
    ${checkList([
			"выдать кассовый чек",
			"связать оплату с договором/актом",
			"при необходимости подготовить налоговую справку КНД 1151156",
		])}
    ${signatureBlock("Администратор", "Пациент/плательщик")}`;
}

export function installmentPaymentSchedule(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const payload = document.payload?.installmentPaymentSchedule as
		| InstallmentPaymentSchedulePayload
		| undefined;
	if (payload) {
		const statusLabels: Record<
			InstallmentPaymentSchedulePayload["installments"][number]["status"],
			string
		> = {
			planned: "запланирован",
			paid: "оплачен",
			overdue: "просрочен",
			rescheduled: "перенесен",
			cancelled: "отменен",
		};
		const rows = payload.installments
			.map(
				(installment) => `<tr>
          <td>${escapeHtml(installment.label)}</td>
          <td>${escapeHtml(installment.dueDate)}</td>
          <td>${escapeHtml(rub(installment.amountRub))}</td>
          <td>${escapeHtml(statusLabels[installment.status])}</td>
        </tr>`,
			)
			.join("");
		return `<h2>График рассрочки и оплат</h2>
      <div class="notice">
        График фиксирует внутреннюю договоренность о сроках оплаты к договору или плану лечения. Если применяется банковский продукт,
        заем или кредит, оформляется отдельный договор и юридическая проверка.
      </div>
      <table>
        ${row("Номер графика", payload.scheduleNumber)}
        ${row("Дата графика", payload.scheduleDate)}
        ${row("Основание", payload.baseDocumentTitle)}
        ${row("Плательщик", payload.payerFullName)}
        ${row("Общая сумма", rub(payload.totalAmountRub))}
        ${row("Предоплата", rub(payload.prepaidAmountRub))}
        ${row("Остаток", rub(payload.remainingAmountRub))}
        ${row("Способы оплаты", payload.paymentMethodNotes)}
        ${row("Ответственный сотрудник", payload.responsibleStaffFullName)}
      </table>
      <h2>Платежи</h2>
      <table>
        <tr><th>Этап</th><th>Срок</th><th>Сумма</th><th>Статус</th></tr>
        ${rows}
      </table>
      <h2>Правила изменения графика</h2>
      <p>${escapeHtml(payload.latePaymentPolicy)}</p>
      ${checkList([
				"пациент или плательщик принял график оплат",
				"график не заменяет кассовый чек, акт и договор",
				"изменение суммы или сроков оформляется письменно до нового срока оплаты",
			])}
      ${signatureBlock("Пациент/плательщик", signatureParty("Ответственный сотрудник", payload.responsibleStaffFullName))}`;
	}
	return `<h2>График рассрочки и оплат</h2>
    <div class="notice">
      Это рабочий график оплат к договору/плану лечения. Если клиника оформляет кредит, заем или банковскую рассрочку,
      нужен отдельный договор и проверка юридической формулировки.
    </div>
    <h2>Состав плана</h2>
    ${financialServiceTable(document, context, true)}
    <table>
      ${row("Общая сумма плана", rub(treatmentPlanTotalRub(document, context)))}
      ${row("Оплачено", rub(paidTotalForDocument(document, context)))}
      ${row("Остаток", rub(remainingRubOrNull(document, context)))}
      ${row("Связанный договор/план", document.title)}
    </table>
    <h2>Платежи</h2>
    <table>
      <tr><th>Этап</th><th>Сумма</th><th>Статус</th></tr>
      ${installmentRows(document, context)}
    </table>
    ${checkList([
			"график не заменяет кассовый чек и акт выполненных работ",
			"изменение плана лечения пересогласуется отдельной сметой/дополнительным соглашением",
			"при просрочке администратор фиксирует контакт и новый безопасный срок оплаты",
		])}
    ${signatureBlock("Пациент/плательщик", "Администратор")}`;
}


export function paymentRefundCorrectionRequest(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const payments = paidPaymentsForDocument(document, context);
	const payload = document.payload?.paymentRefundCorrection;
	if (payload) {
		const actionLabels: Record<string, string> = {
			full_refund: "полный возврат",
			partial_refund: "частичный возврат",
			payment_transfer: "перенос оплаты",
			receipt_correction: "коррекция чека",
			payer_details_correction: "коррекция данных плательщика",
		};
		const methodLabels: Record<string, string> = {
			cash: "наличные",
			card: "карта",
			bank_transfer: "банковский перевод",
			internal_offset: "внутренний взаимозачет",
			no_money_movement: "без движения денег",
		};
		return `<h2>Заявление на возврат или коррекцию оплаты</h2>
      <p>Форма фиксирует конкретное бухгалтерское действие и основание. Сумма сверяется с фактической оплатой и фискальным чеком до выдачи.</p>
      <table>
        <tr><th>Дата оплаты</th><th>Способ</th><th>Сумма</th><th>Чек/платеж</th><th>Плательщик</th></tr>
        ${paymentReceiptRows(payments)}
      </table>
      <table>
        ${row("Запрошенное действие", actionLabels[payload.action] ?? payload.action)}
        ${row("Сумма", rub(payload.amountRub))}
        ${row("Основание", payload.reason)}
        ${row("Способ возврата/коррекции", methodLabels[payload.refundMethod] ?? payload.refundMethod)}
        ${row("Получатель", payload.recipientFullName)}
        ${row("Документ получателя", payload.recipientIdentityDocument)}
        ${present(payload.bankDetails) ? row("Банковские реквизиты", present(payload.bankDetails) ?? "") : ""}
        ${row("Исходный фискальный чек", payload.originalFiscalReceiptNumber)}
        ${present(payload.correctionFiscalReceiptNumber) ? row("Корректирующий чек", present(payload.correctionFiscalReceiptNumber) ?? "") : ""}
        ${row("Решение ответственного", payload.accountantDecision)}
      </table>
      ${checkList([
				"личность пациента или плательщика сверена",
				"исходный фискальный чек, кассовая смена и платеж найдены в CRM",
				"сумма не превышает фактическую оплату по выбранному визиту",
				"решение ответственного сотрудника сохранено вместе с документом",
			])}
      ${signatureBlock("Пациент/плательщик", "Администратор/бухгалтер")}`;
	}
	return `<h2>Заявление на возврат или коррекцию оплаты</h2>
    <p>Форма используется для ошибочной оплаты, частичного возврата, перерасчета или корректировки платежа. Бухгалтерия должна сверить кассу, фискальные чеки и договорные основания перед проведением операции.</p>
    <table>
      <tr><th>Дата оплаты</th><th>Способ</th><th>Сумма</th><th>Чек/платеж</th><th>Плательщик</th></tr>
      ${paymentReceiptRows(payments)}
    </table>
    <table>
      ${row("Запрошенное действие", "возврат / частичный возврат / перенос оплаты / коррекция реквизитов")}
      ${row("Сумма к возврату или коррекции", rub(document.totalAmountRub))}
      ${row("Основание", "заявление пациента/плательщика, кассовая проверка, решение клиники")}
      ${row("Реквизиты для возврата", "заполняются плательщиком и бухгалтерией перед выдачей")}
    </table>
    ${checkList([
			"сверить личность пациента или плательщика",
			"сверить фискальный чек, кассовую смену и платеж в CRM",
			"не проводить возврат по плановой сумме без фактической оплаты",
			"зафиксировать решение ответственного сотрудника и способ возврата",
		])}
    ${signatureBlock("Пациент/плательщик", "Администратор/бухгалтер")}`;
}
