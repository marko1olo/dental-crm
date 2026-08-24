/**
 * DENTE Dental CRM — Web Tax Deduction Certificate & FNS 824@ Registry Engine.
 */

export {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	calculateTaxDeductionSummary,
	generateFnsTaxDeductionXml,
	resolveTaxDeductionCategoryShared,
	validateRussianInn,
	validateRussianPassport,
	type TaxDeductionCalculationResult,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionRelationship,
	type TaxDeductionYearSummary,
} from "@dental/shared";

import {
	calculateTaxDeductionSummary,
	generateFnsTaxDeductionXml,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
} from "@dental/shared";

/**
 * Triggers a browser download of the generated FNS 824@ XML document.
 */
export function downloadFnsTaxXmlFile(params: TaxDeductionCertificateParams): void {
	const { fileName, xmlContent } = generateFnsTaxDeductionXml(params);
	const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Generates official printable HTML for the KND 1151156 Certificate according to Order ED-7-11/824@.
 */
export function renderTaxDeductionCertificateHtml(params: TaxDeductionCertificateParams): string {
	const summary = calculateTaxDeductionSummary(params.payments);
	const targetYear = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
		taxYear: params.taxYear,
		code01Rub: 0,
		code01Kopecks: 0,
		code02Rub: 0,
		code02Kopecks: 0,
		totalRub: 0,
		totalKopecks: 0,
		receiptsCount: 0,
		refund13EstimateRub: 0,
		refund15EstimateRub: 0,
	};

	const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship];
	const isSelf = rel.samePatientFlag === "1";

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Справка об оплате медицинских услуг № ${params.certificateNumber}</title>
	<style>
		@page { size: A4; margin: 15mm 15mm 15mm 15mm; }
		body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.3; color: #000; margin: 0; padding: 20px; }
		.header-right { text-align: right; font-size: 10pt; margin-bottom: 15px; }
		.title { text-align: center; font-weight: bold; font-size: 14pt; margin: 10px 0 5px; text-transform: uppercase; }
		.subtitle { text-align: center; font-size: 11pt; margin-bottom: 20px; font-style: italic; }
		.doc-number { text-align: center; font-weight: bold; margin-bottom: 20px; }
		.field-row { margin-bottom: 8px; }
		.field-label { font-weight: bold; }
		.table-data { width: 100%; border-collapse: collapse; margin: 15px 0; }
		.table-data th, .table-data td { border: 1px solid #000; padding: 6px 8px; font-size: 11pt; text-align: left; }
		.table-data th { background-color: #f0f0f0; text-align: center; }
		.amount-cell { text-align: right; font-family: monospace; font-size: 11pt; }
		.signatures { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
		.stamp-place { border: 1px dashed #999; width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10pt; color: #777; }
		@media print {
			body { padding: 0; }
			.no-print { display: none; }
		}
	</style>
</head>
<body>
	<div class="header-right">
		Приложение № 1 к приказу ФНС России<br>
		от 08.11.2023 № ЕД-7-11/824@<br>
		<strong>Форма по КНД 1151156</strong>
	</div>

	<div class="title">СПРАВКА</div>
	<div class="subtitle">об оплате медицинских услуг для представления в налоговые органы Российской Федерации</div>
	<div class="doc-number">№ ${params.certificateNumber} от ${new Date(params.issueDateIso).toLocaleDateString("ru-RU")} г.</div>

	<div class="field-row">
		<span class="field-label">1. Медицинская организация:</span> ${params.clinic.legalName}
	</div>
	<div class="field-row">
		<span class="field-label">ИНН:</span> ${params.clinic.inn} &nbsp;&nbsp;&nbsp;
		<span class="field-label">КПП:</span> ${params.clinic.kpp || "—"} &nbsp;&nbsp;&nbsp;
		<span class="field-label">ОГРН:</span> ${params.clinic.ogrn || "—"}
	</div>
	<div class="field-row">
		<span class="field-label">Лицензия на мед. деятельность:</span> № ${params.clinic.licenseNumber || "ЛО41-01137-77/00123456"} от ${params.clinic.licenseDate || "15.02.2021"} г.
	</div>
	<div class="field-row">
		<span class="field-label">Адрес:</span> ${params.clinic.address}
	</div>

	<hr style="border: 0; border-top: 1px solid #000; margin: 15px 0;">

	<div class="field-row">
		<span class="field-label">2. Налогоплательщик (плательщик):</span> ${params.payer.fullName}
	</div>
	<div class="field-row">
		<span class="field-label">ИНН плательщика:</span> ${params.payer.inn || "не указан"} &nbsp;&nbsp;&nbsp;
		<span class="field-label">Дата рождения:</span> ${params.payer.birthDate ? new Date(params.payer.birthDate).toLocaleDateString("ru-RU") : "—"}
	</div>
	<div class="field-row">
		<span class="field-label">Документ, удостоверяющий личность:</span> Паспорт РФ серия ${params.payer.identityDocumentSeries || "—"} № ${params.payer.identityDocumentNumber || "—"}
	</div>

	<div class="field-row" style="margin-top: 10px;">
		<span class="field-label">3. Пациент:</span> ${isSelf ? "Он же (налогоплательщик)" : params.patient.fullName}
	</div>
	${
		!isSelf
			? `
	<div class="field-row">
		<span class="field-label">Родство с налогоплательщиком:</span> ${rel.labelRu} (Код ${rel.code}) &nbsp;&nbsp;&nbsp;
		<span class="field-label">Дата рождения пациента:</span> ${params.patient.birthDate ? new Date(params.patient.birthDate).toLocaleDateString("ru-RU") : "—"}
	</div>`
			: ""
	}

	<div class="field-row" style="margin-top: 15px;">
		<span class="field-label">4. Налоговый период (год оказания и оплаты услуг):</span> <strong>${params.taxYear} год</strong>
	</div>

	<table class="table-data">
		<thead>
			<tr>
				<th>Код услуги</th>
				<th>Наименование категории медицинских услуг</th>
				<th>Сумма расходов (руб. коп.)</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td style="text-align: center; font-weight: bold;">Код 01</td>
				<td>Медицинские услуги (лечение кариеса, терапия, ортодонтия, гигиена)</td>
				<td class="amount-cell">${(targetYear.code01Kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
			<tr>
				<td style="text-align: center; font-weight: bold;">Код 02</td>
				<td>Дорогостоящие медицинские услуги (дентальная имплантация, костная пластика, синус-лифтинг)</td>
				<td class="amount-cell">${(targetYear.code02Kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
			<tr style="font-weight: bold; background-color: #f9f9f9;">
				<td colspan="2" style="text-align: right;">ИТОГО ОПЛАЧЕНО ЗА ${params.taxYear} ГОД:</td>
				<td class="amount-cell">${(targetYear.totalKopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
		</tbody>
	</table>

	<div style="font-size: 10pt; color: #555; margin-top: 5px;">
		* Расчетный возврат НДФЛ 13%: <strong>${targetYear.refund13EstimateRub.toLocaleString("ru-RU")} ₽</strong> (по Коду 01 лимит вычета 150 000 ₽ / год, по Коду 02 без ограничений).
	</div>

	<div class="signatures">
		<div style="flex: 1;">
			<div>Руководитель организации / Главный врач: ________________ / ${params.clinic.chiefDoctorName || "Иванов И.И."} /</div>
			<div style="font-size: 9pt; color: #777; margin-top: 3px;">(подпись, расшифровка подписи)</div>
			<div style="margin-top: 15px;">Ответственный бухгалтер / кассир: ________________ /</div>
			<div style="font-size: 9pt; color: #777; margin-top: 3px;">(подпись, дата выдачи: ${new Date(params.issueDateIso).toLocaleDateString("ru-RU")})</div>
		</div>
		<div style="display: flex; gap: 15px; align-items: center;">
			<div style="border: 2px solid #059669; color: #047857; font-weight: 900; font-size: 12pt; padding: 6px 14px; border-radius: 6px; transform: rotate(-5deg); text-align: center; text-transform: uppercase; letter-spacing: 2px;">
				ОПЛАЧЕНО
			</div>
			<div class="stamp-place">
				М.П. Клиники
			</div>
		</div>
	</div>
</body>
</html>`;
}

