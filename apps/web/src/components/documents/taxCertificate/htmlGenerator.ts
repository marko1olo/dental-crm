import {
	generateQrCodeSvg,
	generateFnsFormKnd1151156BarcodeSvg,
	amountToWordsRu,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
} from "@dental/shared";
import { escapeHtml, formatDateRu, formatRublesExactRu } from "../documentPrintFormatters";
import { FNS_ORDER_824_FULL_NAME, type TaxCertificateDocumentData } from "./types";
import { TAX_CERTIFICATE_KND1151156_CSS } from "./css";
import {
	renderClinicSection,
	renderTaxpayerSection,
	renderPatientSection,
	renderReceiptsList,
	renderSignaturesBlock,
} from "./renderSections";

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
	const totalInWords = amountToWordsRu(aggregation.totalNetRub);

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
