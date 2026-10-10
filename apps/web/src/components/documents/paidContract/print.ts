/**
 * print.ts
 *
 * Генерация печатных форм (HTML / Текст) договора на оказание платных медицинских услуг (ПП РФ № 736).
 */

import { formatKopecksToRubAndKop } from "./money";
import type { PaidContractData } from "./types";

/**
 * Генерирует читаемый текст Договора на оказание платных медуслуг (для архива / ЭМК).
 */
export function generatePaidContractText(contract: PaidContractData): string {
	const hasCost = typeof contract.totalAmountKopecks === "number" && contract.totalAmountKopecks > 0;
	const moneyInfo = formatKopecksToRubAndKop(contract.totalAmountKopecks || 0);
	const cl = contract.clinic;
	const pt = contract.patient;
	const cust = contract.customer.isDifferentFromPatient ? contract.customer : contract.patient;

	const servicesList =
		contract.services && contract.services.length > 0
			? contract.services
					.map(
						(s, idx) =>
							`  ${idx + 1}. ${s.code ? `[${s.code}] ` : ""}${s.name}${
								s.toothOrArea ? ` (Область/Зуб: ${s.toothOrArea})` : ""
							} — ${s.quantity} шт. × ${formatKopecksToRubAndKop(s.unitPriceKopecks).formatted} = ${
								formatKopecksToRubAndKop(s.totalKopecks).formatted
							}`,
					)
					.join("\n")
			: `  ${contract.serviceScopeSummary || "Стоматологические медицинские услуги в соответствии со сметой / планом лечения"}`;

	const passportText = (cust.passportSeries && cust.passportNumber)
		? `серия ${cust.passportSeries} № ${cust.passportNumber}, выдан ${cust.passportIssuedBy || "___________________________"}, дата: ${cust.passportIssuedDate || "«___» _______ 20___ г."}, код: ${cust.passportDepartmentCode || "_______"}`
		: `серия _____ № __________, выдан ____________________________________, дата: «___» _______ 20___ г., код: _______`;
	const addressText = cust.registrationAddress || "________________________________________________________";
	const phoneText = cust.phone || "____________________";
	const costText = hasCost
		? `${moneyInfo.formattedWithKopecks} (${moneyInfo.inWords})`
		: "____________________ руб. (________________________________________)";

	return `ДОГОВОР № ${contract.contractNumber}
НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ
(в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736)

${contract.city}                                                «${contract.contractDate}»

${cl.fullName} (сокращенное наименование: ${cl.shortName}), именуемое в дальнейшем «Исполнитель», в лице ${
		cl.directorTitle
	} ${cl.directorFullName}, действующего на основании ${cl.actingOnBasis}, осуществляющее медицинскую деятельность на основании Лицензии № ${
		cl.licenseNumber
	}, выданной ${cl.licenseIssuer}, с одной стороны, и

Гражданин(ка) ${cust.fullName || "________________________________________________"}, ${
		contract.customer.isDifferentFromPatient
			? `именуемый(ая) в дальнейшем «Заказчик», в интересах Пациента ${pt.fullName || "________________________________________________"}`
			: `именуемый(ая) в дальнейшем «Пациент» (Заказчик)`
	}, с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Исполнитель обязуется оказать Пациенту платные стоматологические медицинские услуги надлежащего качества, а Заказчик (Пациент) обязуется принять и оплатить оказанные услуги в соответствии с условиями настоящего Договора и утвержденным Планом лечения (Сметой).
1.2. Основание обращения Пациента: ${contract.clinicalReason || "Первичная консультация и осмотр врача-стоматолога"}
1.3. Перечень и объем оказываемых услуг:
${servicesList}
1.4. Оказание медицинских услуг осуществляется в месте нахождения Исполнителя: ${cl.actualAddress}.

2. ПРАВА И ОБЯЗАННОСТИ СТОРОН
2.1. Исполнитель обязан:
  2.1.1. Оказать медицинские услуги в соответствии с порядками оказания медицинской помощи, клиническими рекомендациями и стандартами медицинской помощи РФ.
  2.1.2. До заключения настоящего Договора письменно уведомить Пациента о возможности получения медицинской помощи по программе государственных гарантий бесплатного оказания гражданам медицинской помощи (по полису ОМС) в государственных учреждениях.
  2.1.3. Предоставить Пациенту полную и достоверную информацию о применяемых методах лечения, медицинских изделиях, лекарственных препаратах, противопоказаниях и возможных рисках.
  2.1.4. Оформить Информированное добровольное согласие (ИДС) по Приказу Минздрава России № 1051н до начала каждого медицинского вмешательства.
  2.1.5. Соблюдать врачебную тайну и требования Федерального закона № 152-ФЗ «О персональных данных».
2.2. Пациент (Заказчик) обязан:
  2.2.1. Предоставить достоверные сведения о состоянии своего здоровья, перенесенных заболеваниях, аллергоанамнезе и принимаемых препаратах.
  2.2.2. Строго соблюдать назначенный лечащим врачом режим лечения, гигиенические требования и график контрольных визитов.
  2.2.3. Своевременно оплачивать оказанные услуги в порядке, предусмотренном разделом 3 настоящего Договора.
2.3. ПРЕДУПРЕЖДЕНИЕ: ${contract.medicalRecommendationWarning}

3. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЕТОВ
3.1. Ориентировочная стоимость услуг по настоящему Договору составляет ${costText}.
3.2. ${contract.paymentTerms}
3.3. ${contract.priceChangeRules}
3.4. Оплата подтверждается выдачей Заказчику (Пациенту) кассового фискального чека в соответствии с Федеральным законом № 54-ФЗ.

4. СРОКИ ОКАЗАНИЯ УСЛУГ
4.1. Начало оказания услуг: ${contract.serviceStart || "в день обращения"}.
4.2. Срок окончания оказания услуг: ${contract.serviceEndOrCondition || "до полного завершения согласованного плана лечения"}.

5. ОТВЕТСТВЕННОСТЬ СТОРОН, ГАРАНТИИ И ОТКАЗ ОТ ДОГОВОРА
5.1. Стороны несут ответственность в соответствии с законодательством РФ (Закон РФ «О защите прав потребителей», Гражданский кодекс РФ).
5.2. ${contract.refusalAndRefundTerms}
5.3. ${contract.warrantyTerms}
5.4. ${contract.disputeResolutionTerms}

6. ПЕРСОНАЛЬНЫЕ ДАННЫЕ И ЕГИСЗ
6.1. Пациент дает согласие на обработку персональных данных в соответствии с Федеральным законом № 152-ФЗ и передачу сведений в ЕГИСЗ (РЭМД) Минздрава России по Постановлению Правительства РФ № 140.

7. АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН

ИСПОЛНИТЕЛЬ:
${cl.fullName} (${cl.shortName})
Юр. адрес: ${cl.legalAddress}
Факт. адрес: ${cl.actualAddress}
ОГРН: ${cl.ogrn}, ИНН: ${cl.inn}, КПП: ${cl.kpp}
Лицензия: № ${cl.licenseNumber} от ${cl.licenseDate} г. (${cl.licenseIssuer})
Р/с: ${cl.checkingAccount} в ${cl.bankName}, БИК: ${cl.bik}, К/с: ${cl.correspondentAccount}
Тел: ${cl.phone}, Email: ${cl.email}

${cl.directorTitle}: _____________________ / ${cl.directorFullName || "________________________"} /
Лечащий врач: _____________________ / ${contract.doctorFullName || "________________________"} /
М.П.

ПАЦИЕНТ / ЗАКАЗЧИК:
${cust.fullName}
Д.Р.: ${pt.birthDate}
Паспорт: ${passportText}
СНИЛС: ${pt.snils || "____________________"}
Адрес регистрации: ${addressText}
Тел: ${phoneText}
Медкарта №: ${pt.cardNumber || "043/у"}

Подпись: _____________________ / ${cust.fullName} /
Дата: «${contract.signedAt || contract.contractDate}»
${contract.signMethod === "sms_otp" ? `[Подписано ПЭП через СМС: ${contract.smsSignDetails?.phone}, код подтвержден]` : (contract.signMethod === "paper" || contract.signMethod === "manual") ? `[Договор составлен в 2-х экземплярах на бумажном носителе (ст. 84 323-ФЗ, Постановление Правительства РФ № 736). Личная подпись пациента зафиксирована на бумаге и подшита в карту 043/у]` : ""}${contract.customer.isDifferentFromPatient ? `\n\nЗАКАЗЧИК (ПЛАТЕЛЬЩИК):\n${contract.customer.fullName || "________________________________________________"}\nПаспорт: серия ${contract.customer.passportSeries || "_____"} № ${contract.customer.passportNumber || "__________"}, выдан ${contract.customer.passportIssuedBy || "___________________________"}, дата: ${contract.customer.passportIssuedDate || "«___» _______ 20___ г."}, код: ${contract.customer.passportDepartmentCode || "_______"}\nАдрес регистрации: ${contract.customer.registrationAddress || "________________________________________________________"}\nТел: ${contract.customer.phone || "____________________"}\nПодпись Заказчика: _____________________ / ${contract.customer.fullName || "________________________"} /` : ""}${contract.representative?.hasRepresentative ? `\n\nЗАКОННЫЙ ПРЕДСТАВИТЕЛЬ (для несовершеннолетних / подопечных):\n${contract.representative.fullName || "________________________________________________"}\nДокумент-основание: ${contract.representative.basisDocument || "свидетельство о рождении / акт органа опеки ____________________"}\nПаспорт: серия ${contract.representative.passportSeries || "_____"} № ${contract.representative.passportNumber || "__________"}, выдан ${contract.representative.passportIssuedBy || "___________________________"}, дата: ${contract.representative.passportIssuedDate || "«___» _______ 20___ г."}, код: ${contract.representative.passportDepartmentCode || "_______"}\nТел: ${contract.representative.phone || "____________________"}\nПодпись законного представителя: _____________________ / ${contract.representative.fullName || "________________________"} /` : ""}`;
}

/**
 * Генерирует юридически безупречный HTML-бланк формата А4 (ГОСТ) с таблицей услуг,
 * копейками прописью, блоком лицензии, реквизитами и зонами подписи.
 */
export function generatePaidContractHtml(contract: PaidContractData): string {
	const hasCost = typeof contract.totalAmountKopecks === "number" && contract.totalAmountKopecks > 0;
	const moneyInfo = formatKopecksToRubAndKop(contract.totalAmountKopecks || 0);
	const cl = contract.clinic;
	const pt = contract.patient;
	const cust = contract.customer.isDifferentFromPatient ? contract.customer : contract.patient;

	const serviceRows = (contract.services && contract.services.length > 0)
		? (contract.services || [])
				.map(
					(s, idx) => `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${s.code ? `<code>${s.code}</code> ` : ""}${s.name}</td>
        <td style="text-align:center;">${s.toothOrArea || "—"}</td>
        <td style="text-align:center;">${s.quantity}</td>
        <td style="text-align:right;">${formatKopecksToRubAndKop(s.unitPriceKopecks).formatted}</td>
        <td style="text-align:right;"><strong>${formatKopecksToRubAndKop(s.totalKopecks).formatted}</strong></td>
      </tr>`,
				)
				.join("")
		: `<tr>
        <td style="text-align:center;">1</td>
        <td>Стоматологические медицинские услуги по плану лечения / смете</td>
        <td style="text-align:center;">—</td>
        <td style="text-align:center;">1</td>
        <td style="text-align:right;">${hasCost ? moneyInfo.formatted : "___________"}</td>
        <td style="text-align:right;"><strong>${hasCost ? moneyInfo.formatted : "___________"}</strong></td>
      </tr>`;

	const signatureStamp =
		contract.signMethod === "sms_otp" && contract.smsSignDetails?.isVerified
			? `<div class="pep-stamp">
          <strong>ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)</strong><br>
          Федеральный закон от 06.04.2011 № 63-ФЗ «Об электронной подписи»<br>
          Телефон: <strong>${contract.smsSignDetails.phone}</strong> · Код подтверждения: <strong>ВЕРИФИЦИРОВАН</strong><br>
          Дата и время: ${new Date(contract.smsSignDetails.verifiedAt || Date.now()).toLocaleString("ru-RU")}<br>
          Хеш документа (SHA-256): ${contract.smsSignDetails.smsSignHash || "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"}
        </div>`
			: (contract.signMethod === "paper" || contract.signMethod === "manual")
				? `<div class="sign-underline"></div>
        <div class="paper-sign-stamp">Договор составлен в 2-х экземплярах на бумажном носителе (ст. 84 323-ФЗ, Постановление Правительства РФ № 736). Личная подпись пациента зафиксирована на бумаге и подшита в карту 043/у.</div>`
			: contract.touchSignatureBase64
				? `<div class="touch-sign-preview">
          <img src="${contract.touchSignatureBase64}" alt="Графическая подпись пациента" style="max-height: 48px; max-width: 180px; object-fit: contain;" />
        </div>`
				: `<div class="sign-underline"></div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Договор № ${contract.contractNumber} на оказание платных медицинских услуг</title>
<style>
  @page { size: A4 portrait; margin: 12mm 10mm 12mm 20mm; }
  body {
    font-family: "PT Astra Sans", "Times New Roman", Times, serif;
    color: #0f172a;
    margin: 0;
    padding: 0;
    background: #ffffff;
    line-height: 1.35;
    font-size: 8.5pt;
  }
  .contract-sheet {
    max-width: 190mm;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .header-table {
    width: 100%;
    border-bottom: 2pt solid #0f172a;
    padding-bottom: 4px;
    margin-bottom: 8px;
  }
  .clinic-name { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; }
  .clinic-sub { font-size: 7.5pt; color: #334155; }
  .law-tag { font-size: 7pt; color: #475569; text-align: right; }
  .contract-title {
    text-align: center;
    font-size: 11pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 6px 0 2px 0;
  }
  .contract-subtitle {
    text-align: center;
    font-size: 7.5pt;
    color: #475569;
    margin-bottom: 6px;
  }
  .city-date-row {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    font-size: 8pt;
    margin-bottom: 6px;
    border-bottom: 0.5pt solid #cbd5e1;
    padding-bottom: 2px;
  }
  .section-title {
    font-size: 8.5pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 6px;
    margin-bottom: 2px;
    color: #0f172a;
    border-bottom: 0.5pt solid #e2e8f0;
    padding-bottom: 1px;
    page-break-after: avoid;
    break-after: avoid;
  }
  p, li { margin: 2px 0; text-align: justify; }
  .services-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
    margin: 4px 0 6px 0;
  }
  .services-table thead {
    display: table-header-group;
  }
  .services-table tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .services-table th, .services-table td {
    border: 0.5pt solid #94a3b8;
    padding: 3px 5px;
  }
  .services-table th {
    background: #f1f5f9;
    font-weight: bold;
    text-align: center;
  }
  .notice-box {
    border: 1pt solid #0f172a;
    background: #f8fafc;
    padding: 4px 6px;
    margin: 5px 0;
    font-size: 8pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .requisites-grid {
    display: table;
    width: 100%;
    margin-top: 8px;
    border-top: 1.5pt solid #0f172a;
    padding-top: 6px;
    font-size: 7.5pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .req-col {
    display: table-cell;
    width: 50%;
    vertical-align: top;
    padding-right: 8px;
  }
  .sign-underline {
    border-bottom: 1pt solid #0f172a;
    min-height: 18px;
    margin: 10px 0 2px 0;
  }
  .pep-stamp {
    border: 1.5pt solid #0f766e;
    background: #f0fdfa;
    color: #0f766e;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 7pt;
    line-height: 1.25;
    margin-top: 6px;
  }
  .touch-sign-preview {
    min-height: 48px;
    display: flex;
    align-items: flex-end;
    border-bottom: 1pt solid #0f172a;
    margin-top: 4px;
  }
  .paper-sign-stamp {
    border: 1pt solid #0f172a;
    background: #f8fafc;
    color: #0f172a;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 7pt;
    line-height: 1.25;
    margin-top: 4px;
  }
</style>
</head>
<body>
<div class="contract-sheet">
  <table class="header-table">
    <tr>
      <td>
        <div class="clinic-name">${cl.fullName}</div>
        <div class="clinic-sub">${cl.actualAddress} · Тел: ${cl.phone} · ИНН: ${cl.inn} · ОГРН: ${cl.ogrn}</div>
        <div class="clinic-sub">Лицензия: № ${cl.licenseNumber} (${cl.licenseIssuer})</div>
      </td>
      <td class="law-tag">
        В соответствии с Постановлением Правительства РФ<br>от 11.05.2023 № 736 и ст. 84 ФЗ № 323-ФЗ
      </td>
    </tr>
  </table>

  <div class="contract-title">ДОГОВОР № ${contract.contractNumber}</div>
  <div class="contract-subtitle">на оказание платных медицинских стоматологических услуг</div>

  <div class="city-date-row">
    <div>${contract.city}</div>
    <div>«${contract.contractDate}» г.</div>
  </div>

  <p><strong>${cl.fullName}</strong> (сокращенное наименование: ${cl.shortName}), именуемое в дальнейшем <strong>«Исполнитель»</strong>, в лице ${cl.directorTitle} ${cl.directorFullName}, действующего на основании ${cl.actingOnBasis}, с одной стороны, и гражданин(ка) <strong>${cust.fullName || "________________________________________________"}</strong>, ${contract.customer.isDifferentFromPatient ? `именуемый(ая) в дальнейшем «Заказчик», действующий в интересах Пациента <strong>${pt.fullName || "________________________________________________"}</strong>` : `именуемый(ая) в дальнейшем «Пациент» (Заказчик)`}${contract.representative?.hasRepresentative ? `, в лице законного представителя <strong>${contract.representative.fullName || "________________________________"}</strong>, действующего на основании ${contract.representative.basisDocument || "свидетельства о рождении / акта органа опеки ____________________"}` : ""}, заключили настоящий Договор о нижеследующем:</p>

  <div class="section-title">1. Предмет договора и условия оказания услуг</div>
  <p>1.1. Исполнитель обязуется оказать Пациенту платные стоматологические медицинские услуги в соответствии с клиническими рекомендациями (протоколами лечения) и стандартами медицинской помощи РФ, а Заказчик (Пациент) обязуется принять и оплатить оказанные услуги в соответствии со сметой и условиями настоящего Договора.</p>
  <p>1.2. Основание обращения: <u>${contract.clinicalReason || "Первичная консультация и осмотр врача-стоматолога"}</u>. Медкарта № <strong>${pt.cardNumber || "б/н"}</strong>.</p>
  <p>1.3. Согласованный перечень и стоимость платных медицинских услуг:</p>

  <table class="services-table">
    <thead>
      <tr>
        <th style="width:25px;">№</th>
        <th>Наименование медицинской услуги</th>
        <th style="width:65px;">Зуб (FDI)</th>
        <th style="width:35px;">Кол.</th>
        <th style="width:80px;">Цена</th>
        <th style="width:85px;">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${serviceRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="text-align:right; font-weight:bold;">ИТОГО ПО СМЕТЕ ДОГОВОРА:</td>
        <td style="text-align:right; font-weight:bold; background:#f8fafc;">${hasCost ? moneyInfo.formatted : "_______________ руб."}</td>
      </tr>
    </tfoot>
  </table>

  <div class="notice-box">
    <strong>ВАЖНОЕ УВЕДОМЛЕНИЕ О БЕСПЛАТНОЙ МЕДИЦИНСКОЙ ПОМОЩИ (п. 7 ПП РФ № 736):</strong><br>
    ${contract.freeCareNotice}
  </div>

  <div class="section-title">2. Стоимость услуг, порядок расчетов и изменения сметы</div>
  <p>2.1. Стоимость услуг составляет <strong>${hasCost ? moneyInfo.formattedWithKopecks : "____________________ руб."}</strong> ${hasCost ? `(${moneyInfo.inWords})` : "(________________________________________)"}.</p>
  <p>2.2. ${contract.paymentTerms}</p>
  <p>2.3. ${contract.priceChangeRules}</p>

  <div class="section-title">3. Сроки оказания услуг и гарантийные обязательства</div>
  <p>3.1. Начало оказания услуг: <strong>${contract.serviceStart || "в день обращения"}</strong>. Срок завершения: <strong>${contract.serviceEndOrCondition || "до полного завершения согласованного плана лечения"}</strong>.</p>
  <p>3.2. ${contract.medicalRecommendationWarning}</p>
  <p>3.3. ${contract.warrantyTerms}</p>
  <p>3.4. ${contract.refusalAndRefundTerms}</p>
  <p>3.5. До заключения договора Пациент оформляет Информированное добровольное согласие по Приказу МЗ РФ № 1051н и согласие на обработку ПДн по 152-ФЗ (передача в ЕГИСЗ РЭМД по ПП РФ № 140).</p>

  <div class="requisites-grid">
    <div class="req-col">
      <strong>ИСПОЛНИТЕЛЬ:</strong><br>
      <strong>${cl.fullName}</strong><br>
      Юр. адрес: ${cl.legalAddress}<br>
      Факт. адрес: ${cl.actualAddress}<br>
      ОГРН: ${cl.ogrn} · ИНН: ${cl.inn} · КПП: ${cl.kpp}<br>
      Лицензия: № ${cl.licenseNumber} от ${cl.licenseDate} г. (${cl.licenseIssuer} · Сайт: roszdravnadzor.gov.ru)<br>
      Р/с: ${cl.checkingAccount} в ${cl.bankName}<br>
      БИК: ${cl.bik} · К/с: ${cl.correspondentAccount}<br>
      Тел: ${cl.phone}<br><br>
      ${cl.directorTitle}:<br>
      <div class="sign-underline"></div>
      <div style="font-size:6.5pt; color:#64748b;">(подпись, М.П.) / ${cl.directorFullName || "________________________"} /</div>
      Врач: _________________ / ${contract.doctorFullName || "________________________"} /
    </div>

    <div class="req-col">
      <strong>${contract.customer.isDifferentFromPatient ? "ПАЦИЕНТ (ПОТРЕБИТЕЛЬ):" : "ПАЦИЕНТ / ЗАКАЗЧИК:"}</strong><br>
      <strong>${(contract.customer.isDifferentFromPatient ? pt.fullName : cust.fullName) || "________________________________________________"}</strong><br>
      Дата рождения: ${pt.birthDate ? `${pt.birthDate} г.` : "«___» _______ ______ г."}<br>
      Паспорт: серия ${(contract.customer.isDifferentFromPatient ? pt.passportSeries : cust.passportSeries) || "_____"} № ${(contract.customer.isDifferentFromPatient ? pt.passportNumber : cust.passportNumber) || "__________"}<br>
      Выдан: ${(contract.customer.isDifferentFromPatient ? pt.passportIssuedBy : cust.passportIssuedBy) || "____________________________________"}, ${(contract.customer.isDifferentFromPatient ? pt.passportIssuedDate : cust.passportIssuedDate) || "«___» _______ 20___ г."}, код ${(contract.customer.isDifferentFromPatient ? pt.passportDepartmentCode : cust.passportDepartmentCode) || "_______"}<br>
      СНИЛС: ${pt.snils || "____________________"}<br>
      Адрес регистрации: ${(contract.customer.isDifferentFromPatient ? pt.registrationAddress : cust.registrationAddress) || "________________________________________________________"}<br>
      Телефон: ${(contract.customer.isDifferentFromPatient ? pt.phone : cust.phone) || "____________________"}<br><br>
      Подпись Пациента:<br>
      ${signatureStamp}
      <div style="font-size:6.5pt; color:#64748b;">(подпись) / ${(contract.customer.isDifferentFromPatient ? pt.fullName : cust.fullName) || "________________________"} /</div>

      ${contract.customer.isDifferentFromPatient ? `
      <div style="margin-top: 6px; padding-top: 4px; border-top: 0.5pt dashed #cbd5e1;">
        <strong>ЗАКАЗЧИК (ПЛАТЕЛЬЩИК):</strong><br>
        <strong>${contract.customer.fullName || "________________________________________________"}</strong><br>
        Паспорт: серия ${contract.customer.passportSeries || "_____"} № ${contract.customer.passportNumber || "__________"}<br>
        Выдан: ${contract.customer.passportIssuedBy || "____________________________________"}, ${contract.customer.passportIssuedDate || "«___» _______ 20___ г."}, код ${contract.customer.passportDepartmentCode || "_______"}<br>
        Адрес: ${contract.customer.registrationAddress || "________________________________________________________"}<br>
        Телефон: ${contract.customer.phone || "____________________"}<br>
        Подпись Заказчика:<br>
        <div class="sign-underline"></div>
        <div style="font-size:6.5pt; color:#64748b;">(подпись) / ${contract.customer.fullName || "________________________"} /</div>
      </div>
      ` : ""}

      ${contract.representative?.hasRepresentative ? `
      <div style="margin-top: 6px; padding-top: 4px; border-top: 0.5pt dashed #cbd5e1;">
        <strong>ЗАКОННЫЙ ПРЕДСТАВИТЕЛЬ (для несовершеннолетних / подопечных):</strong><br>
        <strong>${contract.representative.fullName || "________________________________________________"}</strong><br>
        Документ-основание: ${contract.representative.basisDocument || "свидетельство о рождении / акт органа опеки ____________________"}<br>
        Паспорт: серия ${contract.representative.passportSeries || "_____"} № ${contract.representative.passportNumber || "__________"}<br>
        Выдан: ${contract.representative.passportIssuedBy || "___________________________"}, ${contract.representative.passportIssuedDate || "«___» _______ 20___ г."}, код: ${contract.representative.passportDepartmentCode || "_______"}<br>
        Телефон: ${contract.representative.phone || "____________________"}<br>
        Подпись законного представителя:<br>
        <div class="sign-underline"></div>
        <div style="font-size:6.5pt; color:#64748b;">(подпись) / ${contract.representative.fullName || "________________________"} /</div>
      </div>
      ` : ""}
      <div style="margin-top: 4px; font-size: 7pt; color: #475569;">Дата подписания: «${contract.signedAt || contract.contractDate}» г.</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Автономная печать оформленного договора на оказание платных медицинских услуг (ПП РФ № 736).
 * Не зависит от внешних бэкендов, не падает с 403-ошибками, поддерживает обход блокировщиков всплывающих окон.
 */
export function printPaidContract736(contract: PaidContractData): void {
	if (typeof window === "undefined") return;
	try {
		const html = generatePaidContractHtml(contract);
		let printedViaWindow = false;
		const printWindow = window.open("", "_blank");
		if (printWindow && !printWindow.closed) {
			try {
				printWindow.document.write(html);
				printWindow.document.close();
				printWindow.focus();
				printedViaWindow = true;
				setTimeout(() => {
					try {
						printWindow.print();
					} catch {
						// Окно могло быть закрыто пользователем
					}
				}, 250);
			} catch {
				printedViaWindow = false;
			}
		}
		if (!printedViaWindow) {
			const iframe = document.createElement("iframe");
			iframe.style.position = "fixed";
			iframe.style.right = "0";
			iframe.style.bottom = "0";
			iframe.style.width = "0";
			iframe.style.height = "0";
			iframe.style.border = "0";
			document.body.appendChild(iframe);
			iframe.contentDocument?.write(html);
			iframe.contentDocument?.close();
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
			setTimeout(() => {
				if (document.body.contains(iframe)) {
					document.body.removeChild(iframe);
				}
			}, 1500);
		}
	} catch (err) {
		console.error("Failed to print Decree 736 contract:", err);
	}
}
