/**
 * paidContract/contractHtmlServices.ts
 * HTML table renderer for contract services and total (Mandate 8b <= 120 lines)
 */

import { formatKopecksToRubAndKop } from "./money";
import type { PaidContractData } from "./contractDataTypes";

export function renderContractServicesTable(contract: PaidContractData): string {
	const hasCost = typeof contract.totalAmountKopecks === "number" && contract.totalAmountKopecks > 0;
	const moneyInfo = formatKopecksToRubAndKop(contract.totalAmountKopecks || 0);

	const serviceRows = (contract.services && contract.services.length > 0)
		? contract.services.map((s, idx) => `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${s.code ? `<code>${s.code}</code> ` : ""}${s.name}</td>
        <td style="text-align:center;">${s.toothOrArea || "—"}</td>
        <td style="text-align:center;">${s.quantity}</td>
        <td style="text-align:right;">${formatKopecksToRubAndKop(s.unitPriceKopecks).formatted}</td>
        <td style="text-align:right;"><strong>${formatKopecksToRubAndKop(s.totalKopecks).formatted}</strong></td>
      </tr>`).join("")
		: `<tr>
        <td style="text-align:center;">1</td>
        <td>Стоматологические медицинские услуги по плану лечения / смете</td>
        <td style="text-align:center;">—</td>
        <td style="text-align:center;">1</td>
        <td style="text-align:right;">${hasCost ? moneyInfo.formatted : "___________"}</td>
        <td style="text-align:right;"><strong>${hasCost ? moneyInfo.formatted : "___________"}</strong></td>
      </tr>`;

	return `<table class="services-table">
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
  </table>`;
}
