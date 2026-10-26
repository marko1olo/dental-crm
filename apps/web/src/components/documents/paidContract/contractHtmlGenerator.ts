/**
 * paidContract/contractHtmlGenerator.ts
 * Assembles full A4 HTML for Decree 736 contract (Mandate 8b <= 120 lines)
 */

import { formatKopecksToRubAndKop } from "./money";
import type { PaidContractData } from "./contractDataTypes";
import { getContractPrintStyles } from "./contractPrintStyles";
import { renderContractServicesTable } from "./contractHtmlServices";
import { renderContractRequisites } from "./contractHtmlRequisites";

export function generatePaidContractHtml(contract: PaidContractData): string {
	const hasCost = typeof contract.totalAmountKopecks === "number" && contract.totalAmountKopecks > 0;
	const moneyInfo = formatKopecksToRubAndKop(contract.totalAmountKopecks || 0);
	const cl = contract.clinic;
	const pt = contract.patient;
	const cust = contract.customer.isDifferentFromPatient ? contract.customer : contract.patient;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Договор № ${contract.contractNumber} на оказание платных медицинских услуг</title>
<style>${getContractPrintStyles()}</style>
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
      <td class="law-tag">В соответствии с Постановлением Правительства РФ<br>от 11.05.2023 № 736 и ст. 84 ФЗ № 323-ФЗ</td>
    </tr>
  </table>

  <div class="contract-title">ДОГОВОР № ${contract.contractNumber}</div>
  <div class="contract-subtitle">на оказание платных медицинских стоматологических услуг</div>

  <div class="city-date-row">
    <div>${contract.city}</div>
    <div>«${contract.contractDate}» г.</div>
  </div>

  <p><strong>${cl.fullName}</strong> (${cl.shortName}), именуемое «Исполнитель», в лице ${cl.directorTitle} ${cl.directorFullName}, с одной стороны, и <strong>${cust.fullName || "________________________________________________"}</strong>, ${contract.customer.isDifferentFromPatient ? `именуемый(ая) «Заказчик», в интересах Пациента <strong>${pt.fullName || "________________________________________________"}</strong>` : "именуемый(ая) «Пациент» (Заказчик)"}${contract.representative?.hasRepresentative ? `, в лице представителя <strong>${contract.representative.fullName || "____________________"}</strong>` : ""}, заключили настоящий Договор:</p>

  <div class="section-title">1. Предмет договора и условия оказания услуг</div>
  <p>1.1. Исполнитель обязуется оказать Пациенту платные стоматологические услуги, а Заказчик обязуется оплатить их в соответствии со сметой.</p>
  <p>1.2. Основание обращения: <u>${contract.clinicalReason || "Первичная консультация и осмотр врача-стоматолога"}</u>. Медкарта № <strong>${pt.cardNumber || "б/н"}</strong>.</p>
  <p>1.3. Согласованный перечень и стоимость медицинских услуг:</p>

  ${renderContractServicesTable(contract)}

  <div class="notice-box">
    <strong>ВАЖНОЕ УВЕДОМЛЕНИЕ О БЕСПЛАТНОЙ МЕДИЦИНСКОЙ ПОМОЩИ (п. 7 ПП РФ № 736):</strong><br>
    ${contract.freeCareNotice}
  </div>

  <div class="section-title">2. Стоимость услуг и порядок расчетов</div>
  <p>2.1. Стоимость услуг: <strong>${hasCost ? moneyInfo.formattedWithKopecks : "____________________ руб."}</strong> ${hasCost ? `(${moneyInfo.inWords})` : "(________________________________________)"}.</p>
  <p>2.2. ${contract.paymentTerms}</p>
  <p>2.3. ${contract.priceChangeRules}</p>

  <div class="section-title">3. Сроки оказания услуг и гарантийные обязательства</div>
  <p>3.1. Начало: <strong>${contract.serviceStart || "в день обращения"}</strong>, окончание: <strong>${contract.serviceEndOrCondition || "до полного завершения согласованного плана лечения"}</strong>.</p>
  <p>3.2. ${contract.medicalRecommendationWarning}</p>
  <p>3.3. ${contract.warrantyTerms}</p>
  <p>3.4. ${contract.refusalAndRefundTerms}</p>

  ${renderContractRequisites(contract)}
</div>
</body>
</html>`;
}
