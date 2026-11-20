/**
 * taxCertificateEngine.ts
 *
 * Канонический масштабируемый движок справок для налогового вычета (13% НДФЛ) DENTE.
 * Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156).
 *
 * Реализует:
 * 1. Агрегацию чеков и оплат из кассы за выбранный налоговый период (год).
 * 2. Автоматическое разделение сумм по Коду 01 (обычное лечение) и Коду 02 (дорогостоящее лечение).
 * 3. Расчёт ориентировочной суммы возврата 13% НДФЛ с учётом лимитов.
 * 4. Формирование официального печатного бланка по стандарту ФНС (КНД 1151156) с QR-кодом и штрихкодом.
 * 5. Поддержка сценария «Налогоплательщик ≠ Пациент» (родственники: супруг, родитель, ребенок).
 * 6. Печать строго через скрытый iframe (без блокировки popup-окон).
 */

import {
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateTaxDeductionSummary,
	classifyTaxDeduction804n,
	EXPENSIVE_TREATMENT_804N_CODES,
	extractTaxYearFromDate,
	generateCode128Svg,
	generateFamilyTaxDeductionBatch,
	generateFnsBatchNoMedoplXml,
	generateFnsFormKnd1151156BarcodeSvg,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsTaxDeductionXml,
	generateQrCodeDataUri,
	generateQrCodeSvg,
	generateTaxCertificateQrDataUri,
	generateTaxCertificateQrPayload,
	generateTaxCertificateQrSvg,
	getTaxDeductionAbsKopecks,
	isTaxDeductionRefund,
	KND_CERTIFICATE_FORM,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	normalizePaymentsForTaxCertificate,
	renderOfficialTaxCertificateBatchKnd1151156Html,
	renderOfficialTaxCertificateKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type FamilyMemberBatchCertificateSummary,
	type FamilyMemberPayerConfig,
	type FamilyTaxDeductionBatchResult,
	type GenerateFamilyTaxDeductionBatchOptions,
	type TaxDeductionBatchParams,
	type TaxDeductionCalculationResult,
	type TaxDeductionCertificateParams,
	type TaxDeductionClinicParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionPersonParams,
	type TaxDeductionRelationship,
	type TaxDeductionYearSummary,
	validateInnIndividual as sharedValidateInnIndividual,
	validateInnLegalEntity as sharedValidateInnLegalEntity,
	validateRussianInn as sharedValidateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianPassport as sharedValidateRussianPassport,
	validateRussianSnils,
} from "@dental/shared";
import { escapeHtml, formatDateRu, formatRublesExactRu } from "./documentPrintFormatters";
import { printHtmlViaIframe } from "./printHtmlViaIframe";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export { renderSignatureElementHtml } from "./studio/useCanvasSigner";

export {
	sharedValidateRussianInn as validateRussianInn,
	sharedValidateInnIndividual as validateInnIndividual,
	sharedValidateInnLegalEntity as validateInnLegalEntity,
	sharedValidateRussianPassport as validateRussianPassport,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianSnils,
	resolveTaxDeductionCategoryShared as resolveTaxDeductionCategory,
	resolveTaxDeductionCategoryShared,
	classifyTaxDeduction804n,
	EXPENSIVE_TREATMENT_804N_CODES,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	generateTaxCertificateQrSvg,
	generateTaxCertificateQrDataUri,
	generateTaxCertificateQrPayload,
	generateFnsFormKnd1151156BarcodeSvg,
	generateCode128Svg,
	generateQrCodeDataUri,
	generateQrCodeSvg,
	amountToWordsRu,
	extractTaxYearFromDate,
	calculateTaxDeductionSummary,
	normalizePaymentsForTaxCertificate,
	generateFnsTaxDeductionXml,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsBatchNoMedoplXml,
	generateFamilyTaxDeductionBatch,
	renderOfficialTaxCertificateKnd1151156Html,
	renderOfficialTaxCertificateBatchKnd1151156Html,
	getTaxDeductionAbsKopecks,
	isTaxDeductionRefund,
	KND_CERTIFICATE_FORM,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	type TaxDeductionRelationship,
	type TaxDeductionCertificateParams,
	type TaxDeductionBatchParams,
	type TaxDeductionPaymentItem,
	type TaxDeductionCalculationResult,
	type TaxDeductionClinicParams,
	type TaxDeductionPersonParams,
	type TaxDeductionYearSummary,
	type FamilyMemberBatchCertificateSummary,
	type FamilyMemberPayerConfig,
	type FamilyTaxDeductionBatchResult,
	type GenerateFamilyTaxDeductionBatchOptions,
};

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
 * Triggers a browser download of the NO_MEDOPL XML file (Format 5.01).
 */
export function downloadFnsNoMedoplXmlFile(params: TaxDeductionCertificateParams): void {
	const { fileName, xmlContent } = generateFnsNoMedoplXml(params);
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
 * Triggers a browser download of batch XML registry for direct TCS submission.
 */
export function downloadFnsBatchTaxXmlFile(batch: TaxDeductionBatchParams): void {
	const { fileName, xmlContent } = generateFnsTaxDeductionBatchXml(batch);
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
 * Triggers a browser download of NO_MEDOPL batch XML registry (Format 5.01) for direct TCS submission.
 */
export function downloadFnsBatchNoMedoplXmlFile(batch: TaxDeductionBatchParams): void {
	const { fileName, xmlContent } = generateFnsBatchNoMedoplXml(batch);
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
 * Generates official printable HTML for the KND 1151156 Certificate according to Order EA-7-11/824@.
 */
export function renderTaxDeductionCertificateHtml(params: TaxDeductionCertificateParams): string {
	return renderOfficialTaxCertificateKnd1151156Html(params);
}

/**
 * Generates combined multi-page printable HTML for all family certificates in batch.
 */
export function renderTaxDeductionBatchCertificateHtml(batch: TaxDeductionBatchParams): string {
	return renderOfficialTaxCertificateBatchKnd1151156Html(batch);
}

/**
 * Opens a print dialog with the official A4 form of the KND 1151156 Certificate via hidden iframe.
 */
export function printTaxCertificateKnd1151156(params: TaxDeductionCertificateParams): void {
	const html = renderOfficialTaxCertificateKnd1151156Html(params);
	printHtmlViaIframe(html, "fns-tax-cert-knd1151156-print-iframe");
}

export const FNS_ORDER_824_FULL_NAME =
	"Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156)";
export const KND_1151156_FORM_CODE = "1151156";

export type TaxDeductionTab = "form" | "checks" | "family" | "xml" | "registry";

export interface TaxPaymentRecord {
	readonly id: string;
	readonly dateIso: string;
	readonly receiptNumber?: string | undefined;
	readonly fiscalDocumentNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly serviceName: string;
	readonly code804n?: string | undefined;
	readonly amountRub: number;
	readonly amountKopecks?: number | undefined;
	readonly taxCode?: "1" | "2" | undefined;
	readonly isRefund?: boolean | undefined;
	readonly isReturn?: boolean | undefined;
	readonly status?: string | undefined;
}

export interface TaxYearAggregation {
	readonly taxYear: number;
	readonly code01Kopecks: number;
	readonly code01Rub: number;
	readonly code02Kopecks: number;
	readonly code02Rub: number;
	readonly totalNetKopecks: number;
	readonly totalNetRub: number;
	readonly totalGrossKopecks: number;
	readonly refundedKopecks: number;
	readonly eligibleCode01Kopecks: number;
	readonly eligibleCode01Rub: number;
	readonly estimatedRefund13Kopecks: number;
	readonly estimatedRefund13Rub: number;
	readonly receiptsCount: number;
	readonly payments: readonly TaxPaymentRecord[];
}

export interface TaxCertificatePartyInfo {
	readonly fullName: string;
	readonly birthDate?: string | undefined;
	readonly inn?: string | undefined;
	readonly snils?: string | undefined;
	readonly passportSeries?: string | undefined;
	readonly passportNumber?: string | undefined;
	readonly passportIssuedBy?: string | undefined;
	readonly passportIssuedDate?: string | undefined;
	readonly relationship?: TaxDeductionRelationship | undefined;
}

export interface TaxCertificateClinicInfo {
	readonly legalName: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly ogrn: string;
	readonly address: string;
	readonly licenseNumber: string;
	readonly licenseDate?: string | undefined;
	readonly chiefDoctorOrDirector?: string | undefined;
}

export interface TaxCertificateDocumentData {
	readonly certificateNumber: string;
	readonly issueDateIso: string;
	readonly taxYear: number;
	readonly clinic: TaxCertificateClinicInfo;
	readonly taxpayer: TaxCertificatePartyInfo;
	readonly patient: TaxCertificatePartyInfo;
	readonly aggregation: TaxYearAggregation;
}

export function isPaymentRefund(payment: TaxPaymentRecord): boolean {
	if (payment.isRefund === true || payment.isReturn === true) return true;
	if (payment.status === "refunded" || payment.status === "returned") return true;
	if (typeof payment.amountRub === "number" && payment.amountRub < 0) return true;
	if (typeof payment.amountKopecks === "number" && payment.amountKopecks < 0) return true;
	const s = (payment.serviceName || "").toLowerCase();
	return s.includes("возврат") || s.includes("возврат средств");
}

export function aggregatePatientPaymentsForTaxYear(
	payments: readonly TaxPaymentRecord[],
	taxYear: number,
): TaxYearAggregation {
	let code01PosKopecks = 0;
	let code01RefKopecks = 0;
	let code02PosKopecks = 0;
	let code02RefKopecks = 0;
	let totalGrossKopecks = 0;
	let refundedKopecks = 0;
	let receiptsCount = 0;
	const yearPayments: TaxPaymentRecord[] = [];

	for (const p of payments) {
		const year = extractTaxYearFromDate(p.dateIso);
		if (isNaN(year) || year !== taxYear) continue;

		const rawKopecks =
			typeof p.amountKopecks === "number" && Number.isFinite(p.amountKopecks)
				? Math.round(p.amountKopecks)
				: Number.isFinite(p.amountRub)
					? Math.round(p.amountRub * 100)
					: 0;

		const isRefund = isPaymentRefund(p);
		const absKopecks = Math.abs(rawKopecks);
		const category = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);

		if (isRefund) {
			refundedKopecks += absKopecks;
			if (category === "2") code02RefKopecks += absKopecks;
			else code01RefKopecks += absKopecks;
		} else {
			totalGrossKopecks += absKopecks;
			receiptsCount += 1;
			if (category === "2") code02PosKopecks += absKopecks;
			else code01PosKopecks += absKopecks;
			yearPayments.push(p);
		}
	}

	const code01Kopecks = Math.max(0, code01PosKopecks - code01RefKopecks);
	const code02Kopecks = Math.max(0, code02PosKopecks - code02RefKopecks);
	const totalNetKopecks = code01Kopecks + code02Kopecks;
	const statutoryLimitRub =
		taxYear >= 2024
			? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024
			: ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;
	const statutoryLimitKopecks = statutoryLimitRub * 100;
	const eligibleCode01Kopecks = Math.min(code01Kopecks, statutoryLimitKopecks);
	const estimatedRefund13Kopecks =
		Math.round((eligibleCode01Kopecks * 13) / 100) +
		Math.round((code02Kopecks * 13) / 100);

	return {
		taxYear,
		code01Kopecks,
		code01Rub: code01Kopecks / 100,
		code02Kopecks,
		code02Rub: code02Kopecks / 100,
		totalNetKopecks,
		totalNetRub: totalNetKopecks / 100,
		totalGrossKopecks,
		refundedKopecks,
		eligibleCode01Kopecks,
		eligibleCode01Rub: eligibleCode01Kopecks / 100,
		estimatedRefund13Kopecks,
		estimatedRefund13Rub: estimatedRefund13Kopecks / 100,
		receiptsCount,
		payments: yearPayments,
	};
}

export const TAX_CERTIFICATE_KND1151156_CSS = `
    @page { size: A4 portrait; margin: 8mm 12mm 10mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; background: #ffffff; font-size: 8.5pt; line-height: 1.3; margin: 0; padding: 0; }
    .cert-sheet { width: 100%; min-height: 275mm; display: flex; flex-direction: column; justify-content: space-between; }
    .top-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 4pt; margin-bottom: 6pt; }
    .knd-stamp { font-size: 7.5pt; color: #334155; line-height: 1.25; }
    .barcode-container { display: flex; flex-direction: column; align-items: flex-end; }
    h1 { font-size: 11pt; font-weight: 800; text-align: center; margin: 4pt 0 2pt 0; text-transform: uppercase; letter-spacing: 0.3pt; color: #0f172a; }
    .sub-title { font-size: 8pt; text-align: center; color: #475569; margin-bottom: 8pt; }
    .section-title { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; background: #f1f5f9; padding: 2.5pt 6pt; border-left: 3px solid #0f172a; margin: 6pt 0 3pt 0; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 4pt; font-size: 8.2pt; }
    .details-table td { padding: 2.5pt 4pt; vertical-align: top; border-bottom: 1px solid #e2e8f0; }
    .details-table td.label-col { width: 32%; color: #475569; font-weight: 600; }
    .finance-grid { width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 8.5pt; }
    .finance-grid th, .finance-grid td { border: 1px solid #cbd5e1; padding: 4pt 6pt; text-align: left; }
    .finance-grid th { background: #f8fafc; font-weight: 700; color: #0f172a; }
    .finance-grid td.amount-col { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; width: 25%; }
    .total-in-words { background: #fafafa; border: 1px dashed #cbd5e1; padding: 4pt 8pt; font-size: 8pt; margin: 4pt 0; line-height: 1.35; }
    .receipts-list { font-size: 7.5pt; color: #475569; margin: 4pt 0; line-height: 1.3; }
    .bottom-signatures { display: grid; grid-template-columns: 120px 1fr 1fr; gap: 12pt; align-items: center; margin-top: 8pt; padding-top: 6pt; border-top: 1.5px solid #0f172a; font-size: 8pt; break-inside: avoid; page-break-inside: avoid; }
    .stamp-box { border: 1px dashed #94a3b8; width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7pt; color: #64748b; margin: 0 auto; }
`;

export function renderClinicSection(clinic: TaxCertificateClinicInfo): string {
	return `
      <div class="section-title">1. Сведения о медицинской организации (клинике)</div>
      <table class="details-table">
        <tr><td class="label-col">Наименование организации:</td><td><strong>${escapeHtml(clinic.legalName)}</strong></td></tr>
        <tr><td class="label-col">ИНН / КПП организации:</td><td>ИНН <strong>${escapeHtml(clinic.inn)}</strong>${clinic.kpp ? ` / КПП <strong>${escapeHtml(clinic.kpp)}</strong>` : ""}</td></tr>
        <tr><td class="label-col">ОГРН:</td><td><strong>${escapeHtml(clinic.ogrn)}</strong></td></tr>
        <tr><td class="label-col">Адрес местонахождения:</td><td>${escapeHtml(clinic.address)}</td></tr>
        <tr><td class="label-col">Лицензия на мед. деятельность:</td><td>№ <strong>${escapeHtml(clinic.licenseNumber)}</strong>${clinic.licenseDate ? ` от ${escapeHtml(clinic.licenseDate)}` : ""}</td></tr>
      </table>`;
}

export function renderTaxpayerSection(taxpayer: TaxCertificatePartyInfo, passportStr: string): string {
	return `
      <div class="section-title">2. Сведения о налогоплательщике</div>
      <table class="details-table">
        <tr><td class="label-col">Фамилия, имя, отчество:</td><td><strong>${escapeHtml(taxpayer.fullName)}</strong></td></tr>
        <tr><td class="label-col">ИНН налогоплательщика:</td><td>${taxpayer.inn ? `<strong>${escapeHtml(taxpayer.inn)}</strong>` : "Не указан (идентифицирован по документу)"}</td></tr>
        <tr><td class="label-col">Дата рождения:</td><td>${taxpayer.birthDate ? formatDateRu(taxpayer.birthDate) : "____________________"}</td></tr>
        <tr><td class="label-col">Документ, удостоверяющий личность:</td><td>${passportStr}</td></tr>
      </table>`;
}

export function renderPatientSection(
	patient: TaxCertificatePartyInfo,
	relInfo: { code: string; labelRu: string },
	isSamePerson: boolean,
	patientPassportStr: string,
): string {
	return `
      <div class="section-title">3. Сведения о пациенте и родстве</div>
      <table class="details-table">
        <tr><td class="label-col">Фамилия, имя, отчество пациента:</td><td><strong>${escapeHtml(patient.fullName)}</strong></td></tr>
        <tr><td class="label-col">Дата рождения пациента:</td><td>${patient.birthDate ? formatDateRu(patient.birthDate) : "____________________"}</td></tr>
        <tr><td class="label-col">Отношение к налогоплательщику:</td><td>
          <strong>Код ${relInfo.code}</strong> — ${relInfo.labelRu}
          ${!isSamePerson && patientPassportStr ? ` (${patientPassportStr})` : ""}
        </td></tr>
      </table>`;
}

export function renderReceiptsList(aggregation: TaxYearAggregation, taxYear: number): string {
	if (aggregation.payments.length === 0) return "";
	return `
      <div class="receipts-list">
        <strong>Реестр подтверждающих фискальных документов ККТ за ${taxYear} г.:</strong><br>
        ${aggregation.payments.map((p, i) => {
					const date = formatDateRu(p.dateIso);
					const fd = p.fiscalDocumentNumber ? `ФД № ${p.fiscalDocumentNumber}` : "";
					const fp = p.fiscalSign ? `ФП ${p.fiscalSign}` : "";
					const code = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
					return `${i + 1}. ${date} — ${escapeHtml(p.serviceName)} [Код ${code}] — ${formatRublesExactRu(p.amountRub)} ${fd} ${fp}`;
				}).join("; ")}
      </div>`;
}

export function renderSignaturesBlock(clinic: TaxCertificateClinicInfo, qrSvg: string): string {
	return `
    <div class="bottom-signatures">
      <div style="text-align: center;">${qrSvg}</div>
      <div>
        Руководитель клиники / гл. врач:<br><br>
        ______________________ / ${escapeHtml(clinic.chiefDoctorOrDirector || "Смирнов А.В.")}
      </div>
      <div style="text-align: center;">
        <div class="stamp-box">М.П.<br>КЛИНИКА</div>
      </div>
    </div>`;
}

export function generateTaxCertificateKnd1151156Html(data: TaxCertificateDocumentData): string {
	const { certificateNumber, issueDateIso, taxYear, clinic, taxpayer, patient, aggregation } = data;
	const relKey = taxpayer.relationship || "patient";
	const relInfo = TAX_DEDUCTION_RELATIONSHIP_MAP[relKey] || TAX_DEDUCTION_RELATIONSHIP_MAP.patient;
	const isSamePerson = relInfo.samePatientFlag === "1";
	const issueDateFormatted = formatDateRu(issueDateIso);
	const barcodeSvg = generateFnsFormKnd1151156BarcodeSvg({ taxYear, certificateNumber });

	const c1Str = (aggregation.code01Kopecks / 100).toFixed(2);
	const c2Str = (aggregation.code02Kopecks / 100).toFixed(2);
	const totStr = (aggregation.totalNetKopecks / 100).toFixed(2);
	const issueDate = issueDateIso.slice(0, 10);
	const qrPayload = `https://lkfl2.nalog.ru/lkfl/deduction/verify?knd=1151156&inn=${encodeURIComponent(clinic.inn)}&cert=${encodeURIComponent(certificateNumber)}&date=${issueDate}&year=${taxYear}&payerInn=${encodeURIComponent(taxpayer.inn || "")}&c1=${c1Str}&c2=${c2Str}&sum=${totStr}`;
	const qrSvg = generateQrCodeSvg(qrPayload, { size: 110, margin: 2, title: `Справка КНД 1151156 № ${certificateNumber}` });

	const c1Formatted = formatRublesExactRu(aggregation.code01Rub);
	const c2Formatted = formatRublesExactRu(aggregation.code02Rub);
	const totFormatted = formatRublesExactRu(aggregation.totalNetRub);
	const totalInWords = amountToWordsRu(aggregation.totalNetKopecks);

	const taxpayerPassportStr = taxpayer.passportSeries && taxpayer.passportNumber
		? `серия ${escapeHtml(taxpayer.passportSeries)} № ${escapeHtml(taxpayer.passportNumber)}${taxpayer.passportIssuedBy ? `, выдан: ${escapeHtml(taxpayer.passportIssuedBy)}` : ""}${taxpayer.passportIssuedDate ? `, ${formatDateRu(taxpayer.passportIssuedDate)}` : ""}`
		: "________________________________________________________";

	const patientPassportStr = patient.passportSeries && patient.passportNumber
		? `серия ${escapeHtml(patient.passportSeries)} № ${escapeHtml(patient.passportNumber)}`
		: "";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Справка об оплате медицинских услуг (КНД 1151156) № ${escapeHtml(certificateNumber)}</title>
  <style>${TAX_CERTIFICATE_KND1151156_CSS}</style>
</head>
<body>
  <div class="cert-sheet">
    <div>
      <div class="top-bar">
        <div class="knd-stamp">
          <strong>Форма по КНД 1151156</strong><br>
          ${FNS_ORDER_824_FULL_NAME}<br>
          Штрихкод формы: <strong>1151156</strong>
        </div>
        <div class="barcode-container">${barcodeSvg}</div>
      </div>
      <h1>Справка об оплате медицинских услуг</h1>
      <div class="sub-title">
        для представления в налоговый орган Российской Федерации № <strong>${escapeHtml(certificateNumber)}</strong> от <strong>${issueDateFormatted}</strong><br>
        за <strong>${taxYear}</strong> календарный год
      </div>
      ${renderClinicSection(clinic)}
      ${renderTaxpayerSection(taxpayer, taxpayerPassportStr)}
      ${renderPatientSection(patient, relInfo, isSamePerson, patientPassportStr)}
      <div class="section-title">4. Стоимость оплаченных медицинских услуг за ${taxYear} год</div>
      <table class="finance-grid">
        <thead>
          <tr><th style="width: 15%;">Код услуги</th><th>Наименование категории медицинских услуг (Справка для налогового вычета)</th><th class="amount-col">Оплаченная сумма</th></tr>
        </thead>
        <tbody>
          <tr><td style="text-align: center; font-weight: 700;">1</td><td><strong>Медицинские услуги</strong> (терапевтическое лечение кариеса, пульпита, гигиена полости рта, хирургическое удаление зубов, съемное протезирование)</td><td class="amount-col">${c1Formatted}</td></tr>
          <tr><td style="text-align: center; font-weight: 700;">2</td><td><strong>Дорогостоящее лечение</strong> по Перечню ПП РФ № 458 (дентальная имплантация, костная пластика, синус-лифтинг, сложные несъемные конструкции на имплантатах)</td><td class="amount-col">${c2Formatted}</td></tr>
          <tr style="background: #f8fafc; font-weight: 800;"><td colspan="2" style="text-align: right; padding-right: 12pt;">ИТОГО ОПЛАЧЕНО ЗА ${taxYear} ГОД:</td><td class="amount-col" style="font-size: 9.5pt; color: #0f172a;">${totFormatted}</td></tr>
        </tbody>
      </table>
      <div class="total-in-words">
        Сумма прописью: <strong>${totalInWords}</strong><br>
        <span style="font-size: 7.5pt; color: #64748b;">
          Фискализированных чеков ККТ: ${aggregation.receiptsCount}. Возвратов учтено: ${formatRublesExactRu(aggregation.refundedKopecks / 100)}.
          Расчетный возврат НДФЛ 13%: ${formatRublesExactRu(aggregation.estimatedRefund13Rub)}.
        </span>
      </div>
      ${renderReceiptsList(aggregation, taxYear)}
    </div>
    ${renderSignaturesBlock(clinic, qrSvg)}
  </div>
</body>
</html>`;
}

/**
 * Генерирует HTML справки для налогового вычета в ФНС (КНД 1151156)
 */
export function generateTaxCertificateHtml(
	data: TaxCertificateDocumentData,
): string {
	return generateTaxCertificateKnd1151156Html(data);
}

/**
 * Отправляет справку для налогового вычета на печать строго через скрытый iframe (без блокировки popup-окон)
 */
export function printTaxCertificate(
	data: TaxCertificateDocumentData,
): void {
	if (typeof window !== "undefined") {
		const html = generateTaxCertificateKnd1151156Html(data);
		printHtmlViaIframe(html, "fns-tax-certificate-print-iframe");
	}
}

export interface BuildTaxCertificateQuickParams {
	readonly documentNumber: string;
	readonly issueDateIso: string;
	readonly taxYear: number;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly clinicLicense: string;
	readonly clinicAddress: string;
	readonly doctorFullName: string;
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly inn?: string | undefined;
		readonly passport: string;
	};
	readonly taxpayer?: {
		readonly fullName?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly inn?: string | undefined;
		readonly passport?: string | undefined;
		readonly relationship?: TaxDeductionRelationship | undefined;
	} | undefined;
	readonly receiptsCount: number;
	readonly totalAmountKopecks: number;
	readonly code01Kopecks?: number | undefined;
	readonly code02Kopecks?: number | undefined;
}

/**
 * Фабрика структуры TaxCertificateDocumentData для быстрой печати из DocumentsStudioModal
 */
export function buildTaxCertificateDocumentData(
	params: BuildTaxCertificateQuickParams,
): TaxCertificateDocumentData {
	const code02Kopecks = params.code02Kopecks ?? 0;
	const code01Kopecks =
		params.code01Kopecks !== undefined
			? params.code01Kopecks
			: params.code02Kopecks !== undefined
				? Math.max(0, params.totalAmountKopecks - code02Kopecks)
				: params.totalAmountKopecks;
	const totalKopecks =
		params.totalAmountKopecks > 0
			? params.totalAmountKopecks
			: code01Kopecks + code02Kopecks;
	// Мандат 8bm: Целочисленная арифметика BigInt копеек без неточных float, / 100 и Math.round
	const code01KopecksBi = BigInt(Math.max(0, Math.trunc(code01Kopecks)));
	const code02KopecksBi = BigInt(Math.max(0, Math.trunc(code02Kopecks)));
	const totalKopecksBi = BigInt(Math.max(0, Math.trunc(totalKopecks)));

	const code01Rub = Number(code01KopecksBi / 100n);
	const code02Rub = Number(code02KopecksBi / 100n);
	const totalNetRub = Number(totalKopecksBi / 100n);

	const statutoryLimitKopecksBi = BigInt(params.taxYear >= 2024 ? 150000 : 120000) * 100n;
	const eligibleCode01KopecksBi = code01KopecksBi < statutoryLimitKopecksBi ? code01KopecksBi : statutoryLimitKopecksBi;
	const eligibleCode01Rub = Number(eligibleCode01KopecksBi / 100n);
	const eligibleCode01Kopecks = Number(eligibleCode01KopecksBi);

	// 13% НДФЛ рассчитывается строго целочисленно: (копейки * 13n) / 100n
	const estimatedRefund13KopecksBi = (eligibleCode01KopecksBi * 13n) / 100n + (code02KopecksBi * 13n) / 100n;
	const estimatedRefund13Kopecks = Number(estimatedRefund13KopecksBi);
	const estimatedRefund13Rub = Number(estimatedRefund13KopecksBi / 100n);

	const isDemo = isDemoShowcaseMode();
	const parsePassport = (raw: string | undefined): { series: string; number: string } => {
		if (!raw) {
			return {
				series: isDemo ? "45 12" : "______",
				number: isDemo ? "654321" : "________",
			};
		}
		const parts = raw.trim().split(/\s+/);
		if (parts.length >= 3) {
			return { series: `${parts[0]} ${parts[1]}`, number: parts[2] ?? "" };
		}
		if (parts.length === 2) {
			return { series: parts[0] ?? "", number: parts[1] ?? "" };
		}
		return {
			series: raw.slice(0, 4) || (isDemo ? "45 12" : "______"),
			number: raw.slice(4).trim() || (isDemo ? "654321" : "________"),
		};
	};

	const patientPassport = parsePassport(params.patient.passport);
	const defaultFullName = isDemo ? "Смирнов Алексей Петрович" : "___________";
	const defaultBirthDate = isDemo ? "12.04.1988" : "___________";
	const defaultInn = isDemo ? "770123456789" : "";

	const taxpayerPassport = params.taxpayer?.passport
		? parsePassport(params.taxpayer.passport)
		: patientPassport;

	const taxpayerFullName = params.taxpayer?.fullName || params.patient.fullName || defaultFullName;
	const taxpayerBirthDate = params.taxpayer?.birthDate || params.patient.birthDate || defaultBirthDate;
	const taxpayerInn = params.taxpayer?.inn !== undefined ? params.taxpayer.inn : (params.patient.inn || defaultInn);
	const relationship = params.taxpayer?.relationship || "patient";

	return {
		certificateNumber: params.documentNumber,
		issueDateIso: params.issueDateIso,
		taxYear: params.taxYear,
		clinic: {
			legalName: params.clinicName,
			inn: params.clinicInn,
			kpp: isDemo ? "770101001" : "",
			ogrn: params.clinicOgrn,
			address: params.clinicAddress,
			licenseNumber: params.clinicLicense,
			licenseDate: isDemo ? "14.02.2021" : "",
			chiefDoctorOrDirector: params.doctorFullName,
		},
		taxpayer: {
			fullName: taxpayerFullName,
			birthDate: taxpayerBirthDate,
			inn: taxpayerInn,
			passportSeries: taxpayerPassport.series,
			passportNumber: taxpayerPassport.number,
			relationship,
		},
		patient: {
			fullName: params.patient.fullName || defaultFullName,
			birthDate: params.patient.birthDate || defaultBirthDate,
			inn: params.patient.inn || defaultInn,
			passportSeries: patientPassport.series,
			passportNumber: patientPassport.number,
		},
		aggregation: {
			taxYear: params.taxYear,
			receiptsCount: params.receiptsCount || 1,
			code01Kopecks,
			code02Kopecks,
			code01Rub,
			code02Rub,
			eligibleCode01Kopecks,
			eligibleCode01Rub,
			totalNetRub,
			totalNetKopecks: totalKopecks,
			totalGrossKopecks: totalKopecks,
			refundedKopecks: 0,
			estimatedRefund13Kopecks,
			estimatedRefund13Rub,
			payments: [],
		},
	};
}
