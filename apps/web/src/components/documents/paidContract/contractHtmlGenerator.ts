/**
 * paidContract/contractHtmlGenerator.ts
 * Assembles full A4 HTML for Decree 736 contract (Mandate 8b <= 120 lines)
 */

import { escapeHtml } from "@dental/shared";
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
<title>Договор № ${escapeHtml(contract.contractNumber)} на оказание платных медицинских услуг</title>
<style>${getContractPrintStyles()}</style>
</head>
<body>
<div class="contract-sheet">
  <table class="header-table">
    <tr>
      <td>
        <div class="clinic-name">${escapeHtml(cl.fullName)}</div>
        <div class="clinic-sub">${escapeHtml(cl.actualAddress)} · Тел: ${escapeHtml(cl.phone)} · ИНН: ${escapeHtml(cl.inn)} · ОГРН: ${escapeHtml(cl.ogrn)}</div>
        <div class="clinic-sub">Лицензия: № ${escapeHtml(cl.licenseNumber)} (${escapeHtml(cl.licenseIssuer)})</div>
      </td>
      <td class="law-tag">В соответствии с Постановлением Правительства РФ<br>от 11.05.2023 № 736 и ст. 84 ФЗ № 323-ФЗ</td>
    </tr>
  </table>

  <div class="contract-title">ДОГОВОР № ${escapeHtml(contract.contractNumber)}</div>
  <div class="contract-subtitle">на оказание платных медицинских стоматологических услуг</div>

  <div class="city-date-row">
    <div>${escapeHtml(contract.city)}</div>
    <div>«${escapeHtml(contract.contractDate)}» г.</div>
  </div>

  <p><strong>${escapeHtml(cl.fullName)}</strong> (${escapeHtml(cl.shortName)}), именуемое «Исполнитель», в лице ${escapeHtml(cl.directorTitle)} ${escapeHtml(cl.directorFullName)}, с одной стороны, и <strong>${escapeHtml(cust.fullName) || "________________________________________________"}</strong>, ${contract.customer.isDifferentFromPatient ? `именуемый(ая) «Заказчик», в интересах Пациента <strong>${escapeHtml(pt.fullName) || "________________________________________________"}</strong>` : "именуемый(ая) «Пациент» (Заказчик)"}${contract.representative?.hasRepresentative ? `, в лице представителя <strong>${escapeHtml(contract.representative.fullName) || "____________________"}</strong>` : ""}, заключили настоящий Договор:</p>

  <div class="section-title">1. Предмет договора и условия оказания услуг</div>
  <p>1.1. Исполнитель обязуется оказать Пациенту платные стоматологические услуги, а Заказчик обязуется оплатить их в соответствии со сметой.</p>
  <p>1.2. Основание обращения: <u>${escapeHtml(contract.clinicalReason) || "Первичная консультация и осмотр врача-стоматолога"}</u>. Медкарта № <strong>${escapeHtml(pt.cardNumber) || "б/н"}</strong>.</p>
  <p>1.3. Согласованный перечень и стоимость медицинских услуг:</p>

  ${renderContractServicesTable(contract)}

  <div class="notice-box">
    <strong>ВАЖНОЕ УВЕДОМЛЕНИЕ О БЕСПЛАТНОЙ МЕДИЦИНСКОЙ ПОМОЩИ (п. 7 ПП РФ № 736):</strong><br>
    ${escapeHtml(contract.freeCareNotice)}
  </div>

  <div class="section-title">2. Стоимость услуг и порядок расчетов</div>
  <p>2.1. Стоимость услуг: <strong>${hasCost ? escapeHtml(moneyInfo.formattedWithKopecks) : "____________________ руб."}</strong> ${hasCost ? `(${escapeHtml(moneyInfo.inWords)})` : "(________________________________________)"}.</p>
  <p>2.2. ${escapeHtml(contract.paymentTerms)}</p>
  <p>2.3. ${escapeHtml(contract.priceChangeRules)}</p>

  <div class="section-title">3. Сроки оказания услуг и гарантийные обязательства</div>
  <p>3.1. Начало: <strong>${escapeHtml(contract.serviceStart) || "в день обращения"}</strong>, окончание: <strong>${escapeHtml(contract.serviceEndOrCondition) || "до полного завершения согласованного плана лечения"}</strong>.</p>
  <p>3.2. ${escapeHtml(contract.medicalRecommendationWarning)}</p>
  <p>3.3. ${escapeHtml(contract.warrantyTerms)}</p>
  <p>3.4. ${escapeHtml(contract.refusalAndRefundTerms)}</p>

  ${renderContractRequisites(contract)}
</div>
</body>
</html>`;
}
