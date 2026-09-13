/**
 * DENTE Dental CRM — FNS Russia Tax Deduction Engine Facade & Presentation Layer
 * (Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@).
 *
 * Implements:
 * 1. Форма по КНД 1151156 («Справка об оплате медицинских услуг для представления в налоговый орган») — HTML-генератор.
 * 2. Калькулятор поэтапного плана лечения с расчетом возврата 13% НДФЛ и графика 30/40/30.
 * 3. Тонкий фасад-делегат: реэкспортирует каноническое ядро налогового вычета из packages/shared/src/finance/taxDeduction.js (SSOT).
 *
 * Compliance:
 * - Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156 / 1184043, Формат 5.01)
 * - Приказ Минздрава России от 13.10.2017 № 804н
 * - Постановление Правительства РФ от 08.04.2020 № 458
 * - ст. 219 НК РФ
 */

import { generateFnsFormKnd1151156BarcodeSvg, generateCode128Svg } from "./barcodeGenerator.js";
import { generateQrCodeDataUri, generateQrCodeSvg, type QrSvgOptions } from "./qrGenerator.js";
import { rubToKopecks, kopecksToRub } from "./kopecksArithmetic.js";
import { escapeXml } from "../cda/c14n.js";
import {
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateTaxDeductionSummary,
	formatDateToRussian,
	generateTaxCertificateQrSvg,
	resolveTaxDeductionCategoryShared,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
} from "../finance/taxDeduction.js";

// Re-export all canonical tax deduction types and engine functions from SSOT
export * from "../finance/taxDeduction.js";

// Backward-compatibility re-exports for fiscal module consumers
export {
	generateCode128Svg,
	generateFnsFormKnd1151156BarcodeSvg,
	generateQrCodeDataUri,
	generateQrCodeSvg,
	kopecksToRub,
	rubToKopecks,
	type QrSvgOptions,
};

/**
 * Escape XML special characters alias for backward compatibility.
 */
export const escapeXmlString = escapeXml;


/**
 * Генерация официальной печатной формы Справки КНД 1151156 (формат А4)
 * по Приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ с верификационным QR-кодом.
 */
export function renderOfficialTaxCertificateKnd1151156Html(params: TaxDeductionCertificateParams): string {
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
		code01StatutoryLimitRub: 150000,
		code01EligibleRub: 0,
		refund13EstimateRub: 0,
		refund15EstimateRub: 0,
	};

	const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship];
	const isSelf = rel.samePatientFlag === "1";
	const qrSvg = generateTaxCertificateQrSvg(params, { size: 96, margin: 1 });
	const barcodeSvg = generateFnsFormKnd1151156BarcodeSvg({
		certificateNumber: params.certificateNumber,
		taxYear: params.taxYear,
		height: 38,
		width: 175,
	});

	const yearPayments = params.payments.filter(
		(p) => new Date(p.dateIso).getFullYear() === params.taxYear
	);

	const issueDateFormatted = formatDateToRussian(params.issueDateIso);
	const payerBirthDateFormatted = params.payer.birthDate ? formatDateToRussian(params.payer.birthDate) : "—";
	const patientBirthDateFormatted = params.patient.birthDate ? formatDateToRussian(params.patient.birthDate) : "—";

	const totalInWords = amountToWordsRu(targetYear.totalKopecks);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Справка об оплате медицинских услуг по КНД 1151156 № ${params.certificateNumber}</title>
	<style>
		@page { size: A4; margin: 12mm 15mm; }
		* { box-sizing: border-box; }
		body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.25; color: #000; margin: 0; padding: 10px 20px; background: #fff; }
		.header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1.5px solid #000; }
		.header-qr-block { display: flex; flex-direction: column; align-items: center; gap: 2px; }
		.qr-box { width: 96px; height: 96px; }
		.qr-label { font-size: 7pt; font-weight: bold; letter-spacing: 0.5px; color: #1e293b; text-align: center; }
		.header-barcode-block { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 10px; }
		.barcode-svg-wrap { display: flex; align-items: center; justify-content: center; }
		.barcode-subtext { font-size: 7.5pt; font-weight: bold; letter-spacing: 0.5px; color: #334155; margin-top: 3px; text-align: center; }
		.header-right { text-align: right; font-size: 8.5pt; line-height: 1.25; }
		.knd-badge { font-weight: bold; font-size: 10.5pt; margin-top: 3px; font-family: 'Courier New', Courier, monospace; }
		.format-badge { font-size: 7.5pt; color: #64748b; margin-top: 2px; }
		.title { text-align: center; font-weight: bold; font-size: 13pt; margin: 5px 0 2px; text-transform: uppercase; letter-spacing: 0.5px; }
		.subtitle { text-align: center; font-size: 10pt; margin-bottom: 8px; font-style: italic; }
		.doc-number { text-align: center; font-weight: bold; font-size: 11.5pt; margin-bottom: 12px; }
		.section-line { margin-bottom: 5px; font-size: 10.5pt; }
		.label { font-weight: bold; }
		.underline-val { border-bottom: 1px solid #000; padding-bottom: 1px; }
		.table-summary { width: 100%; border-collapse: collapse; margin: 10px 0; }
		.table-summary th, .table-summary td { border: 1px solid #000; padding: 4px 6px; font-size: 10pt; }
		.table-summary th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
		.table-checks { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 8.5pt; }
		.table-checks th, .table-checks td { border: 1px solid #666; padding: 3px 5px; text-align: left; }
		.table-checks th { background-color: #f8f8f8; text-align: center; }
		.num-cell { text-align: right; font-family: 'Courier New', Courier, monospace; font-weight: bold; }
		.signatures-row { margin-top: 25px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
		.stamp-container { display: flex; gap: 15px; align-items: center; }
		.stamp-circle { width: 100px; height: 100px; border: 1.5px dashed #444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #666; text-align: center; }
		.paid-stamp { border: 2.5px solid #047857; color: #047857; font-weight: 900; font-size: 11pt; padding: 4px 10px; border-radius: 4px; transform: rotate(-6deg); text-transform: uppercase; letter-spacing: 2px; }
		.footnote { font-size: 8pt; color: #555; margin-top: 8px; line-height: 1.2; }
		@media print { body { padding: 0; } .no-print { display: none; } }
	</style>
</head>
<body>
	<div class="header-container">
		<div class="header-qr-block">
			<div class="qr-box" title="Проверка подлинности справки в ФНС России">
				${qrSvg}
			</div>
			<div class="qr-label">ФНС РОССИИ • КНД 1151156</div>
		</div>
		<div class="header-barcode-block">
			<div class="barcode-svg-wrap">
				${barcodeSvg}
			</div>
			<div class="barcode-subtext">ФОРМА ПО КНД 1151156 (ПРИКАЗ ФНС № ЕА-7-11/824@)</div>
		</div>
		<div class="header-right">
			Приложение № 1 к Приказу ФНС России<br>
			от 08.11.2023 № ЕА-7-11/824@<br>
			(в ред. 2024 г., Формат 5.01)<br>
			<div class="knd-badge">Форма по КНД 1151156</div>
			<div class="format-badge">Формат реестра: КНД 1184043</div>
		</div>
	</div>

	<div class="title">СПРАВКА</div>
	<div class="subtitle">об оплате медицинских услуг для представления в налоговые органы Российской Федерации</div>
	<div class="doc-number">№ ${escapeXml(params.certificateNumber)} от ${issueDateFormatted} г.</div>

	<div class="section-line">
		<span class="label">1. Медицинская организация / ИП:</span>
		<span class="underline-val">${escapeXml(params.clinic.legalName)}</span>
	</div>
	<div class="section-line">
		<span class="label">ИНН:</span> ${escapeXml(params.clinic.inn)} &nbsp;&nbsp;&nbsp;
		<span class="label">КПП:</span> ${escapeXml(params.clinic.kpp || "—")} &nbsp;&nbsp;&nbsp;
		<span class="label">ОГРН:</span> ${escapeXml(params.clinic.ogrn || "—")}
	</div>
	<div class="section-line">
		<span class="label">Лицензия на медицинскую деятельность:</span>
		№ ${escapeXml(params.clinic.licenseNumber || "ЛО41-01137-77/00368421")} от ${escapeXml(params.clinic.licenseDate || "12.10.2021")} г.
	</div>
	<div class="section-line">
		<span class="label">Адрес места нахождения:</span> ${escapeXml(params.clinic.address)}
	</div>

	<div style="border-top: 1px solid #000; margin: 6px 0 8px;"></div>

	<div class="section-line">
		<span class="label">2. Налогоплательщик (плательщик):</span>
		<span class="underline-val">${escapeXml(params.payer.fullName)}</span>
	</div>
	<div class="section-line">
		<span class="label">ИНН плательщика:</span> ${escapeXml(params.payer.inn || "не указан")} &nbsp;&nbsp;&nbsp;
		<span class="label">Дата рождения:</span> ${escapeXml(payerBirthDateFormatted)}
	</div>
	<div class="section-line">
		<span class="label">Документ, удостоверяющий личность:</span>
		Паспорт РФ серия ${escapeXml(params.payer.identityDocumentSeries || "—")} № ${escapeXml(params.payer.identityDocumentNumber || "—")}
		${params.payer.identityDocumentIssuedBy ? `, выдан: ${escapeXml(params.payer.identityDocumentIssuedBy)}` : ""}
	</div>

	<div class="section-line" style="margin-top: 6px;">
		<span class="label">3. Пациент:</span>
		<span class="underline-val">${isSelf ? "Он же (налогоплательщик)" : escapeXml(params.patient.fullName)}</span>
	</div>
	${
		!isSelf
			? `
	<div class="section-line">
		<span class="label">Степень родства с налогоплательщиком:</span> ${escapeXml(rel.labelRu)} (Код ${escapeXml(rel.code)}) &nbsp;&nbsp;&nbsp;
		<span class="label">Дата рождения пациента:</span> ${escapeXml(patientBirthDateFormatted)}
	</div>`
			: ""
	}

	<div class="section-line" style="margin-top: 6px;">
		<span class="label">4. Налоговый период (отчетный год):</span>
		<strong>${escapeXml(String(params.taxYear))} год</strong>
	</div>

	<table class="table-summary">
		<thead>
			<tr>
				<th style="width: 15%;">Код услуги</th>
				<th style="width: 55%;">Вид оказанных медицинских услуг</th>
				<th style="width: 30%;">Сумма расходов (руб. коп.)</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td style="text-align: center; font-weight: bold;">Код 01</td>
				<td>Медицинские услуги (терапевтическое, ортодонтическое, эндодонтическое лечение, гигиена)</td>
				<td class="num-cell">${(targetYear.code01Kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
			<tr>
				<td style="text-align: center; font-weight: bold;">Код 02</td>
				<td>Дорогостоящие медицинские услуги (дентальная имплантация, костная пластика, синус-лифтинг)</td>
				<td class="num-cell">${(targetYear.code02Kopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
			<tr style="background-color: #f5f5f5; font-weight: bold;">
				<td colspan="2" style="text-align: right;">ИТОГО ОПЛАЧЕНО ЗА ${escapeXml(String(params.taxYear))} ГОД:</td>
				<td class="num-cell">${(targetYear.totalKopecks / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
		</tbody>
	</table>

	<div class="section-line">
		<span class="label">Сумма прописью:</span> <em>${escapeXml(totalInWords)}</em>
	</div>

	${
		yearPayments.length > 0
			? `
	<div style="margin-top: 8px;">
		<div style="font-size: 9pt; font-weight: bold; margin-bottom: 2px;">Сведения о кассовых чеках (54-ФЗ):</div>
		<table class="table-checks">
			<thead>
				<tr>
					<th>№</th>
					<th>Дата чека</th>
					<th>Чек №</th>
					<th>ФД №</th>
					<th>ФПД</th>
					<th>Наименование услуги</th>
					<th>Код 804н</th>
					<th>Код вычета</th>
					<th>Сумма (руб.)</th>
				</tr>
			</thead>
			<tbody>
				${yearPayments
					.map(
						(pay, i) => `
				<tr>
					<td style="text-align: center;">${i + 1}</td>
					<td>${escapeXml(pay.dateIso.slice(0, 10))}</td>
					<td>${escapeXml(pay.receiptNumber || String(i + 1))}</td>
					<td style="font-family: monospace;">${escapeXml(pay.fiscalDocumentNumber || "—")}</td>
					<td style="font-family: monospace;">${escapeXml(pay.fiscalSign || "—")}</td>
					<td>${escapeXml(pay.serviceName)}</td>
					<td style="font-family: monospace;">${escapeXml(pay.code804n || "—")}</td>
					<td style="text-align: center; font-weight: bold;">${escapeXml(pay.taxCode || resolveTaxDeductionCategoryShared(pay.code804n, pay.serviceName))}</td>
					<td class="num-cell">${pay.amountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
				</tr>`
					)
					.join("")}
			</tbody>
		</table>
	</div>`
			: ""
	}

	<div class="footnote">
		* Примечание: Согласно ст. 219 НК РФ, вычет по Коду 01 предоставляется в пределах годового лимита 150 000 ₽ (возврат 13% до 19 500 ₽). По Коду 02 ограничение суммы не применяется (возврат 13% со всей суммы расходов). Расчетный возврат 13% НДФЛ: <strong>${targetYear.refund13EstimateRub.toLocaleString("ru-RU")} ₽</strong>.
	</div>

	<div class="signatures-row">
		<div style="flex: 1;">
			<div>Руководитель организации / Главный врач: ________________ / ${escapeXml(params.clinic.chiefDoctorName || "Иванов И.И.")} /</div>
			<div style="font-size: 8pt; color: #666; margin-top: 2px;">(подпись, расшифровка подписи)</div>
			<div style="margin-top: 12px;">Ответственное лицо (кассир/бухгалтер): ________________ /</div>
			<div style="font-size: 8pt; color: #666; margin-top: 2px;">(подпись, дата формирования: ${issueDateFormatted} г.)</div>
		</div>
		<div class="stamp-container">
			<div class="paid-stamp">
				ОПЛАЧЕНО
			</div>
			<div class="stamp-circle">
				[ М. П. ]<br>Клиники
			</div>
		</div>
	</div>
</body>
</html>`;
}

