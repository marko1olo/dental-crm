/**
 * contractBuilder.ts
 *
 * Layer 2: Канонический генератор договора на оказание платных медицинских стоматологических услуг.
 * Постановление Правительства РФ от 11.05.2023 № 736, ст. 84 323-ФЗ, 152-ФЗ — СТРОГО 3 листа А4 по ГОСТ Р 7.0.97-2016.
 */

import type { A4DocumentContractData } from "./types.js";
import {
	escapeHtml,
	formatRubles,
	formatAmountInWordsRu,
	formatPassportString,
	formatAddressString,
	formatPhoneString,
	formatSnilsString,
	formatDateString,
	formatSignatoryString,
} from "./formatters.js";
import {
	A4_PRINT_BASE_STYLES,
	renderClinicHeaderHtml,
	renderRunningFooterHtml,
	renderRunningHeaderHtml,
} from "./styles.js";

/**
 * 1. КАНОНИЧЕСКИЙ ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ (ПП РФ № 736)
 * СТРОГО 3 ЛИСТА А4 по ГОСТ Р 7.0.97-2016.
 */
export function generateA4PaidContractHtml(data: A4DocumentContractData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const cust = data.customer && data.customer.isDifferentFromPatient ? data.customer : pt;
	const isCustomerDifferent = Boolean(data.customer && data.customer.isDifferentFromPatient);

	const city = cl.city || "г. Москва";
	const formattedCost = formatRubles(data.estimatedTotalRub);
	const inWordsCost = formatAmountInWordsRu(data.estimatedTotalRub);
	const contractDocLabel = `Договор № ${data.contractNumber} от ${data.contractDate} г.`;

	const servicesRows = (data.services && data.services.length > 0)
		? data.services.map((s, idx) => `
        <tr>
          <td style="text-align:center; width:25px;">${idx + 1}</td>
          <td style="width:70px; text-align:center; font-family:'PT Astra Sans', Arial, sans-serif;">${escapeHtml(s.code804n || "—")}</td>
          <td>${escapeHtml(s.name)}</td>
          <td style="text-align:center; width:55px;">${escapeHtml(s.toothOrArea || "—")}</td>
          <td style="text-align:center; width:35px;">${s.quantity}</td>
          <td style="text-align:right; width:75px;">${formatRubles(s.unitPriceRub)}</td>
          <td style="text-align:right; width:75px; font-weight:bold;">${formatRubles(s.totalRub)}</td>
        </tr>
      `).join("")
		: `
        <tr>
          <td style="text-align:center;">1</td>
          <td style="text-align:center;">B01.065.001</td>
          <td>${escapeHtml(data.serviceScopeSummary || "Комплексные стоматологические медицинские услуги в соответствии с утвержденным Планом лечения и сметой")}</td>
          <td style="text-align:center;">—</td>
          <td style="text-align:center;">1</td>
          <td style="text-align:right;">${formattedCost}</td>
          <td style="text-align:right; font-weight:bold;">${formattedCost}</td>
        </tr>
      `;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Договор № ${escapeHtml(data.contractNumber)} на оказание платных медицинских услуг</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>

<!-- ════════ ЛИСТ 1 ИЗ 3 ════════ -->
<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">ДОГОВОР № ${escapeHtml(data.contractNumber)}</div>
  <div class="a4-doc-subtitle">на оказание платных медицинских стоматологических услуг<br>(в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736)</div>

  <div class="a4-meta-row">
    <div>${escapeHtml(city)}</div>
    <div>«${escapeHtml(data.contractDate)}» г.</div>
  </div>

  <p class="a4-p">
    <strong>${escapeHtml(cl.legalName || cl.name)}</strong>${cl.shortName ? ` (${escapeHtml(cl.shortName)})` : ""}, именуемое в дальнейшем <strong>«Исполнитель»</strong>, в лице ${escapeHtml(cl.directorTitle || "Руководителя")} ${escapeHtml(cl.directorFullName || formatSignatoryString(null))}, действующего на основании Устава и лицензии на осуществление медицинской деятельности № ${escapeHtml(cl.licenseNumber || "________________")}, с одной стороны, и гражданин(ка) <strong>${escapeHtml(cust.fullName)}</strong>, ${
		isCustomerDifferent
			? `именуемый(ая) в дальнейшем «Заказчик», действующий(ая) в интересах Пациента <strong>${escapeHtml(pt.fullName)}</strong>`
			: `именуемый(ая) в дальнейшем «Пациент» (Заказчик)`
	}, с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:
  </p>

  <div class="a4-section-heading">1. Предмет договора и уведомление о государственных гарантиях</div>
  <p class="a4-p">
    1.1. Исполнитель обязуется оказать Пациенту платные стоматологические медицинские услуги надлежащего качества в соответствии с порядками оказания медицинской помощи, на основе клинических рекомендаций и с учетом стандартов медицинской помощи РФ, а Заказчик обязуется принять и оплатить оказанные услуги в соответствии с условиями настоящего Договора и утвержденной сметой.
  </p>
  <p class="a4-p">
    1.2. <strong>Уведомление о программе государственных гарантий (ст. 84 323-ФЗ):</strong> До заключения настоящего Договора Исполнитель в письменной форме уведомил Пациента (Заказчика) о возможности получения медицинской помощи по программе государственных гарантий бесплатного оказания гражданам медицинской помощи и территориальной программе (по полису ОМС) в государственных и муниципальных медицинских организациях. Заказчик подтверждает добровольный выбор платных медицинских услуг.
  </p>
  <p class="a4-p">
    1.3. Основание обращения: <u>${escapeHtml(data.clinicalReason || "Первичная консультация и осмотр врача-стоматолога")}</u>. Амбулаторная медицинская карта № <strong>${escapeHtml(pt.cardNumber || "б/н")}</strong>.
  </p>

  <div class="a4-section-heading">2. Перечень и ориентировочная стоимость услуг</div>
  <table class="a4-table">
    <thead>
      <tr>
        <th>№</th>
        <th>Код услуги</th>
        <th>Наименование медицинской услуги</th>
        <th>Зуб</th>
        <th>Кол.</th>
        <th>Цена (руб.)</th>
        <th>Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${servicesRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="6" style="text-align:right;">ИТОГО К ОПЛАТЕ:</td>
        <td style="text-align:right;">${formattedCost}</td>
      </tr>
    </tfoot>
  </table>

  <p class="a4-p-noindent" style="font-size: 8.5pt;">
    <strong>Ориентировочная стоимость услуг:</strong> ${formattedCost} руб. (${escapeHtml(inWordsCost)}). Оплата производится в порядке наличного или безналичного расчета с выдачей обязательного фискального кассового чека по 54-ФЗ.
  </p>

  ${renderRunningFooterHtml(contractDocLabel, 1, 3)}
</div>

<!-- ════════ ЛИСТ 2 ИЗ 3 ════════ -->
<div class="a4-page">
  ${renderRunningHeaderHtml(contractDocLabel, 2)}

  <div class="a4-section-heading">3. Условия и порядок предоставления медицинских услуг</div>
  <p class="a4-p">
    3.1. Медицинские услуги оказываются Исполнителем в соответствии с лицензией, порядками оказания медицинской помощи, утвержденными Минздравом России, а также на основе клинических рекомендаций профессионального сообщества Стоматологической Ассоциации России (СтАР).
  </p>
  <p class="a4-p">
    3.2. До начала оказания каждой медицинской услуги лечащий врач предоставляет Пациенту полную информацию о целях, методах вмешательства, сопутствующих рисках, возможных вариантах лечения и последствиях отказа от него, оформляя Информированное добровольное согласие (ИДС, Приказ МЗ РФ № 1051н).
  </p>

  <div class="a4-section-heading">4. Права и обязанности Сторон</div>
  <p class="a4-p">
    4.1. <strong>Исполнитель обязан:</strong> обеспечить соответствие медицинских услуг обязательным требованиям; вести учет в амбулаторной медицинской карте; соблюдать врачебную тайну в соответствии со ст. 13 Федерального закона № 323-ФЗ; обеспечить защиту персональных данных по Федеральному закону № 152-ФЗ.
  </p>
  <p class="a4-p">
    4.2. <strong>Исполнитель имеет право:</strong> перенести время приёма при опоздании Пациента более чем на 15 минут; отказать в приёме при нахождении Пациента в состоянии алкогольного, токсического или наркотического опьянения, а также при нарушении правил внутреннего распорядка; назначить проведение обязательной дополнительной диагностики (визиография, ОПТГ, КЛКТ).
  </p>
  <p class="a4-p">
    4.3. <strong>Пациент обязан:</strong> своевременно прибывать на приём; информировать врача о перенесенных заболеваниях, аллергиях и принимаемых препаратах; строго соблюдать гигиенические рекомендации лечащего врача и назначенный режим; являться на бесплатные профилактические осмотры не реже 1 раза в 6 месяцев для сохранения гарантийных обязательств.
  </p>
  <p class="a4-p">
    4.4. <strong>Запрет на навязывание услуг:</strong> Любые дополнительные платные услуги, не вошедшие в согласованную смету, оказываются Исполнителем исключительно с предварительного письменного согласия Заказчика путем подписания дополнительного соглашения к Договору.
  </p>

  <div class="a4-section-heading">5. Порядок расчетов и оплаты</div>
  <p class="a4-p">
    5.1. Оплата медицинских услуг производится Заказчиком в рублях РФ наличными денежными средствами, банковской картой через эквайринг или безналичным расчетом (включая Систему быстрых платежей СБП).
  </p>
  <p class="a4-p">
    5.2. Оплата подтверждается выдачей фискального кассового чека контрольно-кассовой техники в соответствии с Федеральным законом № 54-ФЗ.
  </p>
  <p class="a4-p">
    5.3. При проведении комплексного, хирургического или ортопедического лечения Заказчик вносит авансовый платеж в размере стоимости расходных материалов и зуботехнических этапов. Неизрасходованные авансовые средства подлежат возврату Заказчику при прекращении лечения.
  </p>

  <div class="a4-section-heading">6. Гарантийные обязательства клиники</div>
  <p class="a4-p">
    6.1. Исполнитель устанавливает следующие базовые гарантийные сроки: 12 месяцев на терапевтические композитные реставрации и пломбы; 24 месяца на несъемные ортопедические конструкции (коронки, мостовидные протезы) с момента подписания Акта сдачи-приемки.
  </p>
  <p class="a4-p">
    6.2. Гарантийные обязательства сохраняются исключительно при строгом выполнении Пациентом назначений лечащего врача, поддержании высокого уровня гигиены полости рта и регулярном прохождении контрольных осмотров 1 раз в 6 месяцев.
  </p>

  ${renderRunningFooterHtml(contractDocLabel, 2, 3)}
</div>

<!-- ════════ ЛИСТ 3 ИЗ 3 ════════ -->
<div class="a4-page">
  ${renderRunningHeaderHtml(contractDocLabel, 3)}

  <div class="a4-section-heading">7. Ответственность Сторон, разрешение споров и форс-мажор</div>
  <p class="a4-p">
    7.1. За неисполнение либо ненадлежащее исполнение обязательств по настоящему Договору Стороны несут ответственность в соответствии с законодательством Российской Федерации и Законом РФ «О защите прав потребителей».
  </p>
  <p class="a4-p">
    7.2. Исполнитель освобождается от ответственности за неблагоприятный исход лечения, если он наступил вследствие сокрытия Пациентом достоверных сведений о состоянии здоровья или нарушения предписанного медицинского режима.
  </p>
  <p class="a4-p">
    7.3. <strong>Досудебный претензионный порядок:</strong> В случае возникновения разногласий Стороны обязуются соблюдать обязательный претензионный порядок. Срок рассмотрения письменной претензии Стороной составляет 10 (десять) рабочих дней со дня ее получения.
  </p>
  <p class="a4-p">
    7.4. Стороны освобождаются от ответственности за частичное или полное неисполнение обязательств при наступлении обстоятельств непреодолимой силы (форс-мажор).
  </p>

  <div class="a4-section-heading">8. Конфиденциальность и защита персональных данных (152-ФЗ, ЕГИСЗ)</div>
  <p class="a4-p">
    8.1. Сведения о факте обращения, состоянии здоровья и диагнозе составляют врачебную тайну (ст. 13 323-ФЗ).
  </p>
  <p class="a4-p">
    8.2. Обработка персональных данных осуществляется Исполнителем в соответствии с Федеральным законом № 152-ФЗ. Пациент уведомлен и согласен с передачей сведений в Единую государственную информационную систему в сфере здравоохранения (ЕГИСЗ) в установленных законом случаях (Постановление Правительства РФ № 140).
  </p>

  <div class="a4-section-heading">9. Срок действия и порядок расторжения договора</div>
  <p class="a4-p">
    9.1. Договор вступает в силу с момента его подписания обеими Сторонами и действует до полного исполнения Сторонами своих обязательств. Договор составлен в 2 (двух) подлинных экземплярах, имеющих одинаковую юридическую силу.
  </p>

  <div class="a4-section-heading">10. Адреса, банковские реквизиты и подписи Сторон</div>
  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ИСПОЛНИТЕЛЬ:</strong><br>
      <strong>${escapeHtml(cl.legalName || cl.name)}</strong><br>
      Юр. адрес: ${escapeHtml(cl.address || formatAddressString(null))}<br>
      Факт. адрес: ${escapeHtml(cl.actualAddress || cl.address || formatAddressString(null))}<br>
      ОГРН: ${escapeHtml(cl.ogrn || "____________")}, ИНН: ${escapeHtml(cl.inn || "____________")}${cl.kpp ? `, КПП: ${escapeHtml(cl.kpp)}` : ""}<br>
      Р/с: ${escapeHtml(cl.checkingAccount || "___________________________")} в ${escapeHtml(cl.bankName || "Банк: ___________________________")}<br>
      БИК: ${escapeHtml(cl.bik || "_________")}, К/с: ${escapeHtml(cl.correspondentAccount || "___________________________")}<br>
      Тел: ${escapeHtml(cl.phone || formatPhoneString(null))}<br><br>
      ${escapeHtml(cl.directorTitle || "Руководитель / Врач")}:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || cl.directorFullName || formatSignatoryString(null))} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>ЗАКАЗЧИК (ПАЦИЕНТ):</strong><br>
      <strong>${escapeHtml(cust.fullName)}</strong><br>
      Дата рождения: ${escapeHtml(cust.birthDate || formatDateString(null))}<br>
      Паспорт: ${escapeHtml(formatPassportString(cust))}<br>
      Адрес регистрации: ${escapeHtml(cust.registrationAddress || cust.address || formatAddressString(null))}<br>
      Телефон: ${escapeHtml(cust.phone || formatPhoneString(null))}<br>
      СНИЛС: ${escapeHtml(cust.snils || formatSnilsString(null))}<br>
      <br>
      Подпись Заказчика (Пациента):<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(cust.fullName)} /</div>
    </div>
  </div>

  ${renderRunningFooterHtml(contractDocLabel, 3, 3)}
</div>

</body>
</html>`;
}
