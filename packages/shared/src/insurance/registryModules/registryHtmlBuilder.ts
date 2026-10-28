import { escapeXml } from "../../cda/c14n.js";
import { formatKopecksRu } from "../../utils/money.js";
import type { DmsRegistryData } from "./registryTypes.js";
import { calculateDmsRegistryTotals } from "./registryKopeckCalculator.js";
import { REGISTRY_A4_HTML_STYLE } from "./registryHtmlStyles.js";

/**
 * Generates an A4 Landscape Printable HTML Consolidated Invoice-Registry for DMS.
 */
export function generateDmsRegistryA4Html(data: DmsRegistryData): string {
	const totals = calculateDmsRegistryTotals(data.records);

	const rowsHtml = data.records.map((rec, index) => {
		const tooth = rec.toothNumberFdi && rec.toothNumberFdi > 0 ? String(rec.toothNumberFdi) : "—";
		return `<tr>
			<td class="text-center">${index + 1}</td>
			<td class="text-center whitespace-nowrap">${rec.serviceDate}</td>
			<td class="font-medium">${escapeXml(rec.patientFullName)}<div class="text-muted text-xs">Полис: ${escapeXml(rec.policyNumber)}</div></td>
			<td class="text-center">${escapeXml(rec.guaranteeLetterNumber)}</td>
			<td class="text-center font-mono">${escapeXml(rec.icd10Code)}</td>
			<td class="text-center">${tooth}</td>
			<td class="font-mono text-xs">${escapeXml(rec.serviceCode804n)}</td>
			<td>${escapeXml(rec.serviceNameRu)}</td>
			<td class="text-center">${rec.quantity}</td>
			<td class="text-right whitespace-nowrap">${formatKopecksRu(rec.unitPriceKopecks)}</td>
			<td class="text-right whitespace-nowrap">${formatKopecksRu(rec.totalGrossKopecks)}</td>
			<td class="text-center">${rec.franchisePercent}%</td>
			<td class="text-right whitespace-nowrap">${formatKopecksRu(rec.patientPaidKopecks)}</td>
			<td class="text-right whitespace-nowrap font-bold">${formatKopecksRu(rec.insurerClaimKopecks)}</td>
			<td class="text-xs">${escapeXml(rec.doctorFullName)}</td>
		</tr>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Сводный счет-реестр ДМС № ${escapeXml(data.registryNumber)}</title>
	<style>${REGISTRY_A4_HTML_STYLE}</style>
</head>
<body>
	<div class="header">
		<div class="clinic-info">
			<div class="clinic-title">${escapeXml(data.clinic.nameRu)}</div>
			<div class="clinic-details">
				ИНН: ${escapeXml(data.clinic.inn)} | КПП: ${escapeXml(data.clinic.kpp || "—")} | ОГРН: ${escapeXml(data.clinic.ogrn)}<br>
				Адрес: ${escapeXml(data.clinic.addressRu)}<br>
				Лицензия: ${escapeXml(data.clinic.medicalLicenseNumber)} | Тел: ${escapeXml(data.clinic.phone)}
			</div>
		</div>
		<div class="insurer-info">
			<div class="insurer-title">Страховщик: ${escapeXml(data.insuranceCompany.nameRu)}</div>
			<div class="clinic-details">
				ИНН: ${escapeXml(data.insuranceCompany.inn)}<br>
				Договор ДМС № ${escapeXml(data.insuranceCompany.contractNumber)} от ${escapeXml(data.insuranceCompany.contractDate)}
			</div>
		</div>
	</div>
	<div class="document-title">
		<h1>Сводный счет-реестр оказанных медицинских услуг ДМС № ${escapeXml(data.registryNumber)}</h1>
		<p>за отчетный период с ${escapeXml(data.periodStart)} по ${escapeXml(data.periodEnd)} (Дата формирования: ${escapeXml(data.registryDate)})</p>
	</div>
	<table class="registry-table">
		<thead>
			<tr>
				<th style="width: 25px;">№</th><th style="width: 60px;">Дата</th><th>Застрахованный / Полис</th>
				<th style="width: 65px;">Гар. письмо</th><th style="width: 45px;">МКБ-10</th><th style="width: 30px;">Зуб</th>
				<th style="width: 75px;">Код 804н</th><th>Наименование услуги</th><th style="width: 25px;">Кол</th>
				<th style="width: 55px;">Цена</th><th style="width: 60px;">Всего</th><th style="width: 35px;">Франш.</th>
				<th style="width: 60px;">Пациент</th><th style="width: 65px;">К оплате СМО</th><th style="width: 90px;">Врач</th>
			</tr>
		</thead>
		<tbody>${rowsHtml}</tbody>
	</table>
	<div class="totals-box">
		<div class="totals-words">
			<div class="totals-words-label">Всего к оплате страховой компанией (прописью):</div>
			<div class="totals-words-value">${escapeXml(totals.totalInsurerClaimInWordsRu)}</div>
		</div>
		<div class="totals-numbers">
			<div class="totals-row">Всего оказано услуг: <b>${totals.totalRecordsCount}</b> (пациентов: <b>${totals.uniquePatientsCount}</b>)</div>
			<div class="totals-row">Общая стоимость услуг: <b>${formatKopecksRu(totals.totalGrossKopecks)}</b></div>
			<div class="totals-row">Оплачено пациентами по франшизе: <b>${formatKopecksRu(totals.totalPatientPaidKopecks)}</b></div>
			<div class="totals-row grand">К оплате страховой компанией: ${formatKopecksRu(totals.totalInsurerClaimKopecks)}</div>
		</div>
	</div>
	<div class="signatures">
		<div class="signature-block">
			Руководитель медицинской организации:<br>
			<div class="signature-line"><span>${escapeXml(data.clinic.chiefDoctorNameRu)}</span><span>(подпись / расшифровка)</span></div>
			<div class="stamp-place">М.П.</div>
		</div>
		<div class="signature-block">
			Главный бухгалтер:<br>
			<div class="signature-line"><span>${escapeXml(data.clinic.chiefAccountantNameRu)}</span><span>(подпись / расшифровка)</span></div>
		</div>
	</div>
</body>
</html>`;
}
