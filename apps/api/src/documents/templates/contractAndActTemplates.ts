import {
	type ClinicProfile,
	type CompletedWorksActPayload,
	type DocumentKind,
	type GeneratedDocument,
	type PaidMedicalServicesContractPayload,
	type Patient,
	type Payment,
	type ServiceCatalogItem,
	type TreatmentPlanItem,
	formatKopecksRu,
	kopecksToNumericString,
	parseKopecks,
	splitKopecks,
	sumKopecks,
} from "@dental/shared";
import { chargeLineOutcome } from "../../money/patientDebt.js";
import {
	legalMoneyInWordsFromKopecksRu,
	legalMoneyInWordsRu,
} from "../moneyWordsRu.js";
import {
	DocumentRenderContext,
	escapeHtml,
	rublesFromKopecks,
	rub,
	issuedDate,
	row,
	cell,
	present,
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
} from "./baseRenderUtils.js";
import {
	bulletList,
	checkList,
	signatureBlock,
	signatureParty,
} from "./signatureRenderUtils.js";
import { baseDocument } from "./baseDocument.js";
import { paidPaymentsForDocument } from "./taxHelpers.js";


export const treatmentPlanBackedFinancialKinds = new Set<DocumentKind>([
	"paid_medical_services_contract",
	"completed_works_act",
	"treatment_cost_estimate",
	"payment_invoice",
	"installment_payment_schedule",
]);

export const treatmentPlanItemStatusLabels: Record<
	TreatmentPlanItem["status"],
	string
> = {
	proposed: "предложено",
	approved: "согласовано",
	in_progress: "в работе",
	completed: "выполнено",
	cancelled: "отменено",
};

/**
 * Итог по строке плана лечения в целых копейках. `null` — «посчитать нельзя».
 *
 * ЧТО ЗДЕСЬ БЫЛО И СКОЛЬКО ЭТО СТОИЛО. Стояло
 * `Math.round(unitPriceKopecks * quantity)` для дробного количества, и прежний
 * комментарий это защищал словами «Падать на дробном количестве нельзя —
 * документ тогда вообще не отрендерится, — поэтому дробный случай округляется до
 * целой копейки». Первая половина верна, вторая — нет: округление здесь не
 * спасало документ, а делало его противоречивым САМОМУ СЕБЕ. Замер 2026-08-05
 * через публичные входы, цена 1 000,00 ₽, количество 1,5, скидка 0:
 *
 *   ворота выдачи (`documents/guards.ts`, `validateDocumentCreation`) → 2 000,00 ₽
 *   эта функция (через `renderDocumentHtml`, ячейка «Сумма»)          → 1 500,00 ₽
 *
 * 500,00 ₽ разницы между валидатором сметы и печатной формой той же сметы. Обе
 * стороны «округляли», но разное: ворота — количество, печать — произведение.
 *
 * СТАЛО: расчёт зовётся из ОДНОГО дома (`money/patientDebt.ts`), общего с
 * воротами; своей формулы здесь больше нет. Дробное и нулевое количество —
 * данные вне контракта (`treatmentPlanItemSchema.quantity` объявлен
 * `z.number().int().positive()`, а колонка `treatment_items.quantity` —
 * `numeric(10, 2)`, поэтому такое значение физически возможно). Ответ на него —
 * `null`, «сумма не определяется», и это не новая для файла величина: ровно так
 * же здесь уже устроены `treatmentPlanTotalKopecks` и `remainingKopecksOrNull`,
 * а `rub(null)` печатает «не указана» — строку из `unresolvedPlaceholderPatterns`,
 * то есть документ с такой строкой НЕ ВЫДАЁТСЯ. Черновик при этом рисуется
 * целиком, и человек видит, какая именно позиция мешает.
 */
export function treatmentPlanItemTotalKopecks(item: TreatmentPlanItem): number | null {
	const outcome = chargeLineOutcome(item);
	return outcome.ok ? outcome.kopecks : null;
}

export function treatmentPlanItemTotalRub(item: TreatmentPlanItem) {
	const kopecks = treatmentPlanItemTotalKopecks(item);
	return kopecks === null ? null : rublesFromKopecks(kopecks);
}

/** Позиции плана, чей итог посчитать нельзя. Пустой массив — все читаются. */
export function unreadableTreatmentPlanItems(
	document: GeneratedDocument,
	context: DocumentRenderContext,
): TreatmentPlanItem[] {
	return financialDocumentTreatmentItems(document, context).filter(
		(item) => treatmentPlanItemTotalKopecks(item) === null,
	);
}

export function serviceCatalogMap(context: DocumentRenderContext) {
	return new Map(
		(context.serviceCatalog ?? []).map((service) => [service.id, service]),
	);
}

export function documentTreatmentPlanItems(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const patientItems = (context.treatmentPlanItems ?? []).filter(
		(item) =>
			item.patientId === document.patientId && item.status !== "cancelled",
	);
	const visitItems = document.visitId
		? patientItems.filter((item) => item.visitId === document.visitId)
		: [];
	return visitItems.length ? visitItems : patientItems;
}

export function financialDocumentTreatmentItems(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	return documentTreatmentPlanItems(document, context).sort((left, right) => {
		const leftTooth = left.toothCode ?? "";
		const rightTooth = right.toothCode ?? "";
		if (leftTooth !== rightTooth)
			return leftTooth.localeCompare(rightTooth, "ru-RU");
		return left.serviceId.localeCompare(right.serviceId, "ru-RU");
	});
}

/**
 * Сумма плана лечения в целых копейках, либо сумма самого документа, если строк
 * плана нет. Сложение идёт целыми числами через sumKopecks, поэтому «больше
 * нуля» и последующее сравнение с оплатами не зависят от порядка слагаемых.
 *
 * ХОТЬ ОДНА НЕЧИТАЕМАЯ СТРОКА ДЕЛАЕТ НЕИЗВЕСТНЫМ ВЕСЬ ИТОГ, а не вычитается из
 * него молча. Пропустить такую строку значило бы напечатать пациенту итог,
 * который меньше состава услуг ровно на неё, — то есть документ, где сумма
 * строк не равна итогу. Это и есть то, что `.agents/AGENTS.md` §8b запрещает
 * словами «Money and legal documents are exact to the kopeck». `null` здесь
 * уже был законным ответом («сумма не определяется»), и весь файл ниже его
 * обрабатывает: остаток, график рассрочки и `rub()` печатают «не указана», а
 * эта строка входит в `unresolvedPlaceholderPatterns`, то есть документ не
 * выдаётся.
 */
export function treatmentPlanTotalKopecks(
	document: GeneratedDocument,
	context: DocumentRenderContext,
): number | null {
	const lineTotals = financialDocumentTreatmentItems(document, context).map(
		treatmentPlanItemTotalKopecks,
	);
	if (lineTotals.some((total) => total === null)) return null;
	const totalKopecks = sumKopecks(
		lineTotals.filter((total): total is number => total !== null),
	);
	if (totalKopecks > 0) return totalKopecks;
	const documentTotalRub = document.totalAmountRub;
	if (
		documentTotalRub === null ||
		documentTotalRub === undefined ||
		!Number.isFinite(documentTotalRub)
	) {
		return null;
	}
	return parseKopecks(documentTotalRub);
}

export function treatmentPlanTotalRub(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const totalKopecks = treatmentPlanTotalKopecks(document, context);
	return totalKopecks === null ? null : rublesFromKopecks(totalKopecks);
}

/**
 * Остаток к оплате в целых копейках, либо null — «не определяется».
 *
 * Неизвестная сумма плана даёт неизвестный остаток, а не нулевой: вычитать
 * оплаченное из подставленного нуля значит печатать пациенту «вы ничего не
 * должны» по документу, стоимость которого никто не назвал. Ноль здесь ничем не
 * отличается от честного «всё оплачено», и именно эта неразличимость и есть
 * дефект — вместе с тем, что в одной и той же таблице строка «Общая сумма плана»
 * печатала «не указана», а строка «Остаток» под ней — «0 руб.».
 */
export function remainingKopecksOrNull(
	document: GeneratedDocument,
	context: DocumentRenderContext,
): number | null {
	const totalKopecks = treatmentPlanTotalKopecks(document, context);
	if (totalKopecks === null) return null;
	return Math.max(
		0,
		totalKopecks - paidTotalKopecksForDocument(document, context),
	);
}

/** Тот же остаток в рублях для печати. null уходит в rub() и печатается «не указана». */
export function remainingRubOrNull(
	document: GeneratedDocument,
	context: DocumentRenderContext,
): number | null {
	const remainingKopecks = remainingKopecksOrNull(document, context);
	return remainingKopecks === null ? null : rublesFromKopecks(remainingKopecks);
}

export function financialServiceRows(
	document: GeneratedDocument,
	context: DocumentRenderContext,
	includeStatus = false,
) {
	const services = serviceCatalogMap(context);
	const items = financialDocumentTreatmentItems(document, context);
	if (!items.length) {
		if (document.kind === "paid_medical_services_contract") {
			return `<tr>
        <td class="text-center tabular-nums">1</td>
        <td class="text-center">___________</td>
        <td>________________________________________________</td>
        <td class="text-center">____</td>
        <td class="text-center tabular-nums">___</td>
        <td class="text-right">___________</td>
        <td class="text-right">___________</td>
        <td class="text-right"><strong>___________</strong></td>
        ${includeStatus ? '<td class="text-center">согласовано</td>' : ""}
      </tr>
      <tr>
        <td class="text-center tabular-nums">2</td>
        <td class="text-center">___________</td>
        <td>________________________________________________</td>
        <td class="text-center">____</td>
        <td class="text-center tabular-nums">___</td>
        <td class="text-right">___________</td>
        <td class="text-right">___________</td>
        <td class="text-right"><strong>___________</strong></td>
        ${includeStatus ? '<td class="text-center">согласовано</td>' : ""}
      </tr>
      <tr>
        <td class="text-center tabular-nums">3</td>
        <td class="text-center">___________</td>
        <td>________________________________________________</td>
        <td class="text-center">____</td>
        <td class="text-center tabular-nums">___</td>
        <td class="text-right">___________</td>
        <td class="text-right">___________</td>
        <td class="text-right"><strong>___________</strong></td>
        ${includeStatus ? '<td class="text-center">согласовано</td>' : ""}
      </tr>`;
		}
		return `<tr><td colspan="${includeStatus ? 9 : 8}" class="text-center">Состав услуг не загружен из плана лечения.</td></tr>`;
	}

	return items
		.map((item, index) => {
			const service = services.get(item.serviceId);
			const title = service?.title ?? item.serviceId;
			const code = service?.code ? service.code : "A16.07.001";
			const tooth = item.toothCode
				? `зуб ${item.toothCode}`
				: "без привязки к зубу";
			const discount =
				parseKopecks(item.discountRub) > 0 ? rub(item.discountRub) : "0,00 руб.";
			const statusCell = includeStatus
				? `<td class="text-center">${escapeHtml(treatmentPlanItemStatusLabels[item.status])}</td>`
				: "";
			return `<tr>
        <td class="text-center tabular-nums">${index + 1}</td>
        <td class="text-center tabular-nums">${escapeHtml(code)}</td>
        <td>${escapeHtml(title)}</td>
        <td class="text-center">${escapeHtml(tooth)}</td>
        <td class="text-center tabular-nums">${item.quantity}</td>
        <td class="text-right tabular-nums">${escapeHtml(rub(item.unitPriceRub))}</td>
        <td class="text-right tabular-nums">${escapeHtml(discount)}</td>
        <td class="text-right tabular-nums"><strong>${escapeHtml(rub(treatmentPlanItemTotalRub(item)))}</strong></td>
        ${statusCell}
      </tr>`;
		})
		.join("");
}

export function financialServiceTable(
	document: GeneratedDocument,
	context: DocumentRenderContext,
	includeStatus = false,
) {
	const totalKopecks = treatmentPlanTotalKopecks(document, context);
	const totalFormatted = rub(treatmentPlanTotalRub(document, context));
	const totalWords = totalKopecks !== null ? legalMoneyInWordsFromKopecksRu(totalKopecks) : "";

	return `<table class="financial-table">
      <thead>
        <tr>
          <th style="width: 5%;">№ п/п</th>
          <th style="width: 13%;">Код (804н)</th>
          <th style="width: 32%;">Наименование медицинской услуги</th>
          <th style="width: 14%;">Зуб / область</th>
          <th style="width: 6%;">Кол-во</th>
          <th style="width: 10%; text-align: right;">Цена, руб.</th>
          <th style="width: 10%; text-align: right;">Скидка, руб.</th>
          <th style="width: 10%; text-align: right;">Итого, руб.</th>
          ${includeStatus ? '<th style="width: 10%;">Статус</th>' : ""}
        </tr>
      </thead>
      <tbody>
        ${financialServiceRows(document, context, includeStatus)}
      </tbody>
      <tfoot>
        <tr>
          <th colspan="7" style="text-align: right;">ИТОГО ПО РАСЧЕТУ:</th>
          <th class="text-right tabular-nums">${document.kind === "paid_medical_services_contract" && (!totalKopecks || totalKopecks <= 0) ? "___________ руб." : escapeHtml(totalFormatted)}</th>
          ${includeStatus ? "<th></th>" : ""}
        </tr>
      </tfoot>
    </table>
    ${totalWords ? `<div class="total-words-box"><strong>Сумма прописью:</strong> ${escapeHtml(totalWords)}</div>` : document.kind === "paid_medical_services_contract" ? `<div class="total-words-box"><strong>Сумма прописью:</strong> ________________________________________________</div>` : ""}`;
}

/** Фактически оплачено по документу, в целых копейках. Точное сложение. */
export function paidTotalKopecksForDocument(
	document: GeneratedDocument,
	context: DocumentRenderContext,
): number {
	return sumKopecks(
		paidPaymentsForDocument(document, context).map((payment) =>
			parseKopecks(payment.amountRub),
		),
	);
}

export function paidTotalForDocument(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	return rublesFromKopecks(paidTotalKopecksForDocument(document, context));
}

/**
 * Строки графика оплат.
 *
 * Здесь было два дефекта, оба от плавающей точки. Остаток считался как
 * `total - paid` на дробных числах, поэтому полностью оплаченный план давал
 * остаток 4.5e-13 вместо нуля; условие `remainingRub > 0` срабатывало, а
 * `Math.ceil(4.5e-13 / 2)` печатало пациенту требование доплатить 1 руб. Второй
 * дефект — деление пополам: половины считались в рублях с округлением вверх, и
 * их сумма не была равна остатку.
 *
 * Теперь остаток — вычитание целых копеек (ноль это ровно ноль), а деление идёт
 * через splitKopecks, который гарантирует, что сумма частей РАВНА остатку.
 */
export function installmentRows(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const remainingKopecks = remainingKopecksOrNull(document, context);
	const paidKopecks = paidTotalKopecksForDocument(document, context);
	/*
	 * Сумма плана не определилась — графика оплат нет.
	 *
	 * БЫЛО: `treatmentPlanTotalKopecks(...) ?? 0`. Неизвестная сумма плана
	 * становилась нулём, остаток выходил `max(0, 0 - оплачено)` = 0, ни одна ветка
	 * ниже не срабатывала, и функция печатала пациенту последнюю строку: «План
	 * полностью оплачен — 0 руб.». Про план, чья стоимость неизвестна, а оплат по
	 * которому может не быть вовсе. Это денежный документ: такая строка означает
	 * «клиника ничего вам не выставляет».
	 */
	if (remainingKopecks === null) {
		return `<tr><td>Сумма плана не определяется: в плане лечения нет позиций с ценой, а сумма документа не заполнена</td><td>график оплат не построен</td><td>требует заполнения</td></tr>`;
	}
	const rows: string[] = [];
	if (paidKopecks > 0) {
		rows.push(
			`<tr><td>Оплачено по сохраненным платежам</td><td>${escapeHtml(
				rub(rublesFromKopecks(paidKopecks)),
			)}</td><td>оплачено</td></tr>`,
		);
	}
	if (remainingKopecks > 0) {
		// Вторая половина по умолчанию ноль: splitKopecks гарантирует только первую
		// часть, а условие ниже уже отбрасывает нулевой финальный платёж.
		const [firstPartKopecks, secondPartKopecks = 0] = splitKopecks(
			remainingKopecks,
			2,
		);
		rows.push(
			`<tr><td>Следующий платеж до ближайшего визита</td><td>${escapeHtml(
				rub(rublesFromKopecks(firstPartKopecks)),
			)}</td><td>план</td></tr>`,
		);
		if (secondPartKopecks > 0) {
			rows.push(
				`<tr><td>Финальный платеж до выдачи акта</td><td>${escapeHtml(
					rub(rublesFromKopecks(secondPartKopecks)),
				)}</td><td>план</td></tr>`,
			);
		}
	}
	return rows.length
		? rows.join("")
		: `<tr><td>План полностью оплачен</td><td>${escapeHtml(rub(0))}</td><td>оплачено</td></tr>`;
}

export function paidMedicalServicesContract(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const payload = document.payload?.paidMedicalServicesContract as
		| PaidMedicalServicesContractPayload
		| undefined;
	const clinicProfile = context.clinicProfile;
	const clinicName = clinicDisplayName(clinicProfile);
	const license = clinicLicenseLine(clinicProfile) ?? "Лицензия на медицинскую деятельность (ЕРУЛ)";
	const signatory = clinicSignatory(clinicProfile);

	if (payload) {
		const totalWords = legalMoneyInWordsRu(payload.estimatedTotalRub);
		const customerName = payload.customerFullName || "Заказчик";
		const representativeInfo = payload.representativeFullName
			? ` при участии представителя: ${escapeHtml(payload.representativeFullName)}`
			: "";

		return `<h2>Договор на оказание платных медицинских услуг № ${escapeHtml(payload.contractNumber)}</h2>
    <div class="notice">
      Договор составлен в строгом соответствии с Постановлением Правительства РФ от 11.05.2023 № 736 «Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг», Федеральным законом от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ» и Законом РФ от 07.02.1992 № 2300-1 «О защите прав потребителей».
    </div>

    <p class="preamble">
      <strong>${escapeHtml(clinicName)}</strong> (далее — <strong>«Исполнитель»</strong>), осуществляющее медицинскую деятельность на основании ${escapeHtml(license)}, в лице ${escapeHtml(signatory)}, с одной стороны, и гражданин(ка) <strong>${escapeHtml(customerName)}</strong> (далее — <strong>«Заказчик / Пациент»</strong>)${representativeInfo}, с другой стороны, совместно именуемые <strong>«Стороны»</strong>, заключили настоящий Договор о нижеследующем:
    </p>

    <h2>1. Предмет договора</h2>
    <div class="legal-body">
      <p class="legal-clause">1.1. Исполнитель обязуется оказать Пациенту платные медицинские (стоматологические) услуги надлежащего качества по медицинским показаниям, а Заказчик обязуется своевременно оплатить их в порядке и на условиях, определенных настоящим Договором и приложениями к нему.</p>
      <p class="legal-clause">1.2. Основание обращения и клинические цели: <strong>${escapeHtml(payload.plannedCareReason)}</strong>. Перечень и объем медицинских услуг: <strong>${escapeHtml(payload.serviceScopeSummary)}</strong>.</p>
      <p class="legal-clause">1.3. ${escapeHtml(payload.freeCareAvailabilityNotice)}. Заказчик (Пациент) подтверждает, что проинформирован о возможности получения бесплатной медицинской помощи по программе государственных гарантий и добровольно согласен на получение платных медицинских услуг.</p>
    </div>

    <h2>2. Условия и сроки предоставления медицинских услуг</h2>
    <div class="legal-body">
      <p class="legal-clause">2.1. Медицинские услуги оказываются при условии оформления информированного добровольного согласия Пациента (его законного представителя) в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ и Приказом Минздрава России от 12.11.2021 № 1051н.</p>
      <p class="legal-clause">2.2. Срок начала оказания медицинских услуг: <strong>${escapeHtml(payload.serviceStart)}</strong>. Срок окончания оказания услуг / условие завершения: <strong>${escapeHtml(payload.serviceEndOrCondition)}</strong>.</p>
      <p class="legal-clause">2.3. Услуги оказываются в соответствии с порядками оказания медицинской помощи, клиническими рекомендациями и с учетом стандартов медицинской помощи, утвержденных Минздравом РФ.</p>
      <p class="legal-clause">2.4. Ответственный лечащий врач: <strong>${payload.doctorFullName?.trim() ? escapeHtml(payload.doctorFullName) : "________________________ (подпись / расшифровка)"}</strong>.</p>
    </div>

    <h2>3. Стоимость услуг, сроки и порядок расчетов</h2>
    <div class="legal-body">
      <p class="legal-clause">3.1. Предварительная (ориентировочная) стоимость медицинских услуг по настоящему Договору составляет: <strong>${payload.estimatedTotalRub > 0 ? escapeHtml(rub(payload.estimatedTotalRub)) : "_______ руб. ___ коп."}</strong>. Сумма прописью: <strong>${payload.estimatedTotalRub > 0 && totalWords ? escapeHtml(totalWords) : "________________________________________________"}</strong>. НДС не облагается (пп. 2 п. 2 ст. 149 НК РФ).</p>
      <p class="legal-clause">3.2. Согласованный перечень медицинских услуг с кодами по Номенклатуре медицинских услуг (Приказ Минздрава России № 804н):</p>
      ${financialServiceTable(document, context, true)}
      <p class="legal-clause">3.3. Порядок оплаты: <strong>${escapeHtml(payload.paymentTerms)}</strong>. Оплата производится безналичным расчетом либо наличными денежными средствами в кассу Исполнителя с обязательной выдачей фискального кассового чека.</p>
      <p class="legal-clause">3.4. Правила изменения стоимости и объема услуг: <strong>${escapeHtml(payload.priceChangeRules)}</strong>. Оказание дополнительных платных услуг оформляется дополнительным соглашением к договору до начала их оказания. Экстренная медицинская помощь при угрозе жизни оказывается без взимания дополнительной платы.</p>
      <p class="legal-clause">3.5. Отказ от услуг и порядок возврата денежных средств: <strong>${escapeHtml(payload.refusalAndRefundTerms)}</strong>. При отказе Заказчик оплачивает Исполнителю фактически понесенные расходы.</p>
    </div>

    <h2>4. Права и обязанности сторон</h2>
    <div class="legal-body">
      <p class="legal-clause">4.1. <strong>Исполнитель обязан:</strong> обеспечить качественное оказание медицинских услуг, предоставить доступную информацию о лечении, материалах и лицензии, соблюдать врачебную тайну по ст. 13 Федерального закона № 323-ФЗ, вести медицинскую карту и выдать по заявлению копии документов.</p>
      <p class="legal-clause">4.2. <strong>Заказчик (Пациент) обязан:</strong> своевременно оплачивать услуги, предоставить достоверный анамнез (аллергостатус, хронические болезни, принимаемые препараты), строго соблюдать назначения и режим лечения, являться на контрольные осмотры.</p>
      <p class="legal-clause">4.3. <strong>Исполнитель имеет право:</strong> требовать от Пациента соблюдения медицинских предписаний, корректировать план лечения по согласованию с Пациентом при выявлении скрытых патологий.</p>
      <p class="legal-clause">4.4. <strong>Заказчик имеет право:</strong> на выбор врача, получение полной информации о здоровье и отказ от исполнения договора до завершения лечения с компенсацией фактически понесенных затрат.</p>
    </div>

    <h2>5. Гарантии и качество услуг</h2>
    <div class="legal-body">
      <p class="legal-clause">5.1. Услуги оказываются с использованием сертифицированных материалов и зарегистрированного медицинского оборудования.</p>
      <p class="legal-clause">5.2. Условия гарантии и порядок рассмотрения претензий: <strong>${escapeHtml(payload.warrantyAndClaimsTerms)}</strong>.</p>
      <p class="legal-clause">5.3. Гарантийные обязательства сохраняются при условии соблюдения Пациентом гигиены полости рта, врачебных назначений и прохождения регулярных профилактических осмотров (не реже одного раза в 6 месяцев).</p>
    </div>

    <h2>6. Ответственность сторон</h2>
    <div class="legal-body">
      <p class="legal-clause">6.1. За неисполнение или ненадлежащее исполнение обязательств Стороны несут ответственность в соответствии с действующим законодательством РФ.</p>
      <p class="legal-clause">6.2. Предупреждение о последствиях нарушения режима: <strong>${escapeHtml(payload.medicalRecommendationWarning)}</strong>.</p>
      <p class="legal-clause">6.3. Исполнитель освобождается от ответственности за неблагоприятный исход лечения, если он наступил вследствие нарушения Пациентом рекомендаций врача, сокрытия данных о здоровье либо индивидуальных непредсказуемых биологических реакций.</p>
    </div>

    <h2>7. Срок действия договора, порядок изменения и расторжения</h2>
    <div class="legal-body">
      <p class="legal-clause">7.1. Настоящий Договор вступает в силу с момента его подписания и действует до полного исполнения Сторонами своих обязательств.</p>
      <p class="legal-clause">7.2. Все изменения и дополнения к Договору оформляются в письменной форме дополнительными соглашениями.</p>
      <p class="legal-clause">7.3. Договор составлен в двух экземплярах, имеющих равную юридическую силу, по одному для каждой из Сторон.</p>
    </div>

    <h2>8. Адреса, банковские реквизиты и подписи сторон</h2>
    <div class="executive-requisites">
      <div class="executive-requisites-col">
        <div class="executive-requisites-title">Исполнитель</div>
        <div>${escapeHtml(clinicPaymentRequisites(clinicProfile))}</div>
      </div>
      <div class="executive-requisites-col">
        <div class="executive-requisites-title">Заказчик (Пациент)</div>
        <div><strong>Ф.И.О.:</strong> ${escapeHtml(customerName)}</div>
        <div><strong>Дата подписания:</strong> ${escapeHtml(payload.signedAt)}</div>
      </div>
    </div>
    ${signatureBlock("Заказчик (Пациент)", signatureParty("Уполномоченное лицо Исполнителя", signatory))}`;
	}

	return `<h2>Договор на оказание платных медицинских услуг</h2>
    <p class="preamble">Медицинская организация оказывает пациенту платные стоматологические услуги по утвержденному прейскуранту, плану лечения и медицинским показаниям в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736.</p>
    <h2>1. Предмет договора и стороны</h2>
    <table>
      ${row("Исполнитель", clinicLegalRequisites(context.clinicProfile))}
      ${row("Документ", document.title)}
      ${row("Ориентировочная сумма", rub(treatmentPlanTotalRub(document, context)))}
      ${row("Правовая основа", "Правила предоставления медицинскими организациями платных медицинских услуг (ПП РФ от 11.05.2023 № 736), ст. 84 Федерального закона № 323-ФЗ")}
    </table>
    <h2>2. Перечень услуг и стоимость (Номенклатура 804н)</h2>
    ${financialServiceTable(document, context, true)}
    <h2>3. Порядок оказания, оплаты и гарантии</h2>
    ${checkList([
			"услуги оказываются по медицинским показаниям и согласованному плану лечения после оформления ИДС",
			"изменение состава услуг фиксируется дополнительной сметой или письменным соглашением",
			"кассовый чек и акт выполненных работ выдаются пациенту при оплате и завершении услуг",
			"гарантийные обязательства и претензионный порядок применяются по локальным правилам клиники",
		])}
    <h2>4. Реквизиты и подписи сторон</h2>
    ${signatureBlock("Пациент / Заказчик", signatureParty("Представитель Исполнителя", signatory))}`;
}

export function completedWorksAct(
	document: GeneratedDocument,
	context: DocumentRenderContext,
) {
	const payload = document.payload?.completedWorksAct as
		| CompletedWorksActPayload
		| undefined;
	const clinicProfile = context.clinicProfile;
	const signatory = clinicSignatory(clinicProfile);

	if (payload) {
		const totalWords = legalMoneyInWordsRu(payload.totalByActRub);
		const paidWords = legalMoneyInWordsRu(payload.paidRub);

		return `<h2>Акт выполненных работ (оказанных медицинских услуг) № ${escapeHtml(payload.actNumber)}</h2>
    <div class="notice">
      Настоящий Акт составлен в соответствии со ст. 720 Гражданского кодекса РФ и Постановлением Правительства РФ от 11.05.2023 № 736. Акт подтверждает факт надлежащего оказания стоматологических услуг, отсутствие претензий по качеству и сверку с фискальными чеками.
    </div>

    <table>
      ${row("Номер и дата акта", `${payload.actNumber} от ${payload.actDate}`)}
      ${row("Базовый договор", `${payload.contractNumber} (ID: ${payload.linkedContractDocumentId})`)}
      ${row("Период оказания услуг", `с ${payload.servicePeriodStart} по ${payload.servicePeriodEnd}`)}
      ${row("Врач-исполнитель", payload.doctorFullName)}
      ${row("Состав выполненных работ", payload.acceptedServicesSummary)}
      ${row("Общая сумма по акту", rub(payload.totalByActRub))}
      ${row("Фактически оплачено", rub(payload.paidRub))}
      ${row("Фискальные чеки", payload.fiscalReceiptNumbers.join("; "))}
      ${row("Замечания и претензии", payload.patientClaimsText?.trim() || "Медицинские услуги оказаны качественно, в полном объеме и в срок; замечаний и претензий нет.")}
    </table>

    <h2>Перечень выполненных услуг (Номенклатура 804н)</h2>
    ${financialServiceTable(document, context, true)}

    <div class="total-words-box">
      <div><strong>Сумма по акту прописью:</strong> ${escapeHtml(totalWords)}</div>
      <div><strong>Фактически оплачено прописью:</strong> ${escapeHtml(paidWords)}</div>
    </div>

    <div class="legal-body">
      <p class="legal-clause">Медицинские услуги оказаны Исполнителем надлежащим образом, в полном объеме, в установленные сроки и в соответствии с требованиями клинических протоколов. Заказчик (Пациент) подтверждает приемку оказанных услуг и отсутствие претензий по их объему, качеству и стоимости.</p>
    </div>

    <h2>Реквизиты и подписи сторон</h2>
    <div class="executive-requisites">
      <div class="executive-requisites-col">
        <div class="executive-requisites-title">Исполнитель</div>
        <div>${escapeHtml(clinicPaymentRequisites(clinicProfile))}</div>
      </div>
      <div class="executive-requisites-col">
        <div class="executive-requisites-title">Заказчик (Пациент / Плательщик)</div>
        <div><strong>Дата приемки:</strong> ${escapeHtml(payload.actDate)}</div>
        <div><strong>Фискальные чеки проверены:</strong> ${escapeHtml(payload.fiscalReceiptNumbers.join(", "))}</div>
      </div>
    </div>
    ${signatureBlock("Пациент / Заказчик", signatureParty("Врач-исполнитель / представитель клиники", payload.doctorFullName || signatory))}`;
	}

	return `<h2>Акт выполненных работ (оказанных услуг)</h2>
    <div class="notice">
      Пациент подтверждает надлежащее получение стоматологических услуг. Замечания по объему, срокам и качеству фиксируются до подписания акта.
    </div>
    <h2>Перечень оказанных услуг (Номенклатура 804н)</h2>
    ${financialServiceTable(document, context, true)}
    <table>
      ${row("Фактически оплачено", rub(paidTotalForDocument(document, context) || document.totalAmountRub))}
      ${row("Сумма по акту", rub(treatmentPlanTotalRub(document, context)))}
    </table>
    <h2>Контроль перед выдачей</h2>
    ${checkList([
			"состав работ сверен с договором, планом лечения и записями в медицинской карте",
			"фискальные кассовые чеки проверены и прикреплены к расчету",
			"пациент подтвердил отсутствие претензий по качеству и срокам оказания услуг",
		])}
    <h2>Подписи сторон</h2>
    ${signatureBlock("Пациент / Заказчик", signatureParty("Представитель Исполнителя", signatory))}`;
}
