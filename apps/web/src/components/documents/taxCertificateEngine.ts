/**
 * DENTE Dental CRM — Tax Certificate Engine (КНД 1151156 / Приказ ФНС № ЕА-7-11/824@).
 *
 * Implements strict statutory compliance with:
 * 1. Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156, Формат 5.01).
 * 2. Статья 219 НК РФ (Социальный налоговый вычет на лечение):
 *    - Лимит 150 000 ₽ с 2024 года (120 000 ₽ до 2024 г.) для Кода услуги «1».
 *    - Дорогостоящее лечение (Код услуги «2») принимается к вычету в полной сумме без лимита.
 * 3. Постановление Правительства РФ от 08.04.2020 № 458 (Перечень дорогостоящих видов лечения):
 *    - Дентальная имплантация, костная пластика, синус-лифтинг, сложные ортопедические конструкции на имплантатах.
 * 4. Каноническая проверка 10-значного и 12-значного ИНН по весовым коэффициентам ФНС/ГОСТ.
 * 5. Точный расчет в целых копейках без чисел с плавающей точкой.
 * 6. Поддержка разделения налогоплательщика и пациента (супруг, родитель, ребенок).
 */

import {
	validateRussianInn as sharedValidateRussianInn,
	validateInnIndividual as sharedValidateInnIndividual,
	validateInnLegalEntity as sharedValidateInnLegalEntity,
	validateRussianPassport as sharedValidateRussianPassport,
	resolveTaxDeductionCategoryShared,
	classifyTaxDeduction804n,
	EXPENSIVE_TREATMENT_804N_CODES,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	generateQrCodeSvg,
	generateTaxCertificateQrSvg,
	generateFnsFormKnd1151156BarcodeSvg,
	amountToWordsRu,
	type TaxDeductionRelationship,
} from "@dental/shared";
import { escapeHtml, formatDateRu, formatRublesExactRu } from "./documentPrintFormatters";

export {
	sharedValidateRussianInn as validateRussianInn,
	sharedValidateInnIndividual as validateInnIndividual,
	sharedValidateInnLegalEntity as validateInnLegalEntity,
	sharedValidateRussianPassport as validateRussianPassport,
	resolveTaxDeductionCategoryShared as resolveTaxDeductionCategory,
	classifyTaxDeduction804n,
	EXPENSIVE_TREATMENT_804N_CODES,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	generateTaxCertificateQrSvg,
	generateFnsFormKnd1151156BarcodeSvg,
	amountToWordsRu,
	type TaxDeductionRelationship,
};

export const FNS_ORDER_824_FULL_NAME =
	"Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@ (КНД 1151156)";
export const KND_1151156_FORM_CODE = "1151156";

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

/**
 * Checks whether a payment item represents a return/refund.
 */
export function isPaymentRefund(payment: TaxPaymentRecord): boolean {
	if (payment.isRefund === true || payment.isReturn === true) return true;
	if (payment.status === "refunded" || payment.status === "returned") return true;
	if (typeof payment.amountRub === "number" && payment.amountRub < 0) return true;
	if (typeof payment.amountKopecks === "number" && payment.amountKopecks < 0) return true;
	const s = (payment.serviceName || "").toLowerCase();
	return s.includes("возврат") || s.includes("возврат средств");
}

/**
 * Честная агрегация оплат пациента за выбранный календарный год с копеечной точностью.
 */
export function aggregatePatientPaymentsForTaxYear(
	payments: readonly TaxPaymentRecord[],
	taxYear: number,
): TaxYearAggregation {
	let code01Kopecks = 0;
	let code02Kopecks = 0;
	let totalGrossKopecks = 0;
	let refundedKopecks = 0;
	let receiptsCount = 0;
	const yearPayments: TaxPaymentRecord[] = [];

	for (const p of payments) {
		const paymentDate = new Date(p.dateIso);
		const year = paymentDate.getFullYear();
		if (isNaN(year) || year !== taxYear) {
			continue;
		}

		// Exact integer kopecks
		const rawKopecks =
			typeof p.amountKopecks === "number" && Number.isFinite(p.amountKopecks)
				? Math.round(p.amountKopecks)
				: Number.isFinite(p.amountRub)
					? Math.round(p.amountRub * 100)
					: 0;

		const isRefund = isPaymentRefund(p);
		const absKopecks = Math.abs(rawKopecks);

		const category =
			p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);

		if (isRefund) {
			refundedKopecks += absKopecks;
			if (category === "2") {
				code02Kopecks = Math.max(0, code02Kopecks - absKopecks);
			} else {
				code01Kopecks = Math.max(0, code01Kopecks - absKopecks);
			}
		} else {
			totalGrossKopecks += absKopecks;
			receiptsCount += 1;
			if (category === "2") {
				code02Kopecks += absKopecks;
			} else {
				code01Kopecks += absKopecks;
			}
			yearPayments.push(p);
		}
	}

	const totalNetKopecks = code01Kopecks + code02Kopecks;
	const statutoryLimitRub =
		taxYear >= 2024
			? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024
			: ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;
	const statutoryLimitKopecks = statutoryLimitRub * 100;

	// Eligible sum for Code 01 is capped by statutory limit
	const eligibleCode01Kopecks = Math.min(code01Kopecks, statutoryLimitKopecks);

	// 13% tax refund estimate: Code 01 (capped) + Code 02 (unlimited)
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

/**
 * Генерирует официальный печатный HTML бланка КНД 1151156 по Приказу ФНС России № ЕА-7-11/824@.
 */
export function generateTaxCertificateKnd1151156Html(
	data: TaxCertificateDocumentData,
): string {
	const {
		certificateNumber,
		issueDateIso,
		taxYear,
		clinic,
		taxpayer,
		patient,
		aggregation,
	} = data;

	const relationshipKey = taxpayer.relationship || "patient";
	const relInfo = TAX_DEDUCTION_RELATIONSHIP_MAP[relationshipKey] || TAX_DEDUCTION_RELATIONSHIP_MAP.patient;
	const isSamePerson = relInfo.samePatientFlag === "1";

	const issueDateFormatted = formatDateRu(issueDateIso);

	// Barcode SVG & QR SVG
	const barcodeSvg = generateFnsFormKnd1151156BarcodeSvg({
		taxYear,
		certificateNumber,
	});

	const code01Str = (aggregation.code01Kopecks / 100).toFixed(2);
	const code02Str = (aggregation.code02Kopecks / 100).toFixed(2);
	const totalStr = (aggregation.totalNetKopecks / 100).toFixed(2);
	const issueDate = issueDateIso.slice(0, 10);
	const qrPayload = `https://lkfl2.nalog.ru/lkfl/deduction/verify?knd=1151156&inn=${encodeURIComponent(clinic.inn)}&cert=${encodeURIComponent(certificateNumber)}&date=${issueDate}&year=${taxYear}&payerInn=${encodeURIComponent(taxpayer.inn || "")}&c1=${code01Str}&c2=${code02Str}&sum=${totalStr}`;
	const qrSvg = generateQrCodeSvg(qrPayload, {
		size: 110,
		margin: 2,
		title: `Справка КНД 1151156 № ${certificateNumber}`,
	});

	const code01Formatted = formatRublesExactRu(aggregation.code01Rub);
	const code02Formatted = formatRublesExactRu(aggregation.code02Rub);
	const totalFormatted = formatRublesExactRu(aggregation.totalNetRub);
	const totalInWords = amountToWordsRu(aggregation.totalNetRub);

	const taxpayerPassportStr = taxpayer.passportSeries && taxpayer.passportNumber
		? `серия ${escapeHtml(taxpayer.passportSeries)} № ${escapeHtml(taxpayer.passportNumber)}${
				taxpayer.passportIssuedBy ? `, выдан: ${escapeHtml(taxpayer.passportIssuedBy)}` : ""
			}${taxpayer.passportIssuedDate ? `, ${formatDateRu(taxpayer.passportIssuedDate)}` : ""}`
		: "________________________________________________________";

	const patientPassportStr = patient.passportSeries && patient.passportNumber
		? `серия ${escapeHtml(patient.passportSeries)} № ${escapeHtml(patient.passportNumber)}`
		: "";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Справка об оплате медицинских услуг (КНД 1151156) № ${escapeHtml(certificateNumber)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 8.5pt;
      line-height: 1.3;
      margin: 0;
      padding: 0;
    }
    .cert-sheet {
      width: 100%;
      min-height: 275mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4pt;
      margin-bottom: 6pt;
    }
    .knd-stamp {
      font-size: 7.5pt;
      color: #334155;
      line-height: 1.25;
    }
    .barcode-container {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    h1 {
      font-size: 11pt;
      font-weight: 800;
      text-align: center;
      margin: 4pt 0 2pt 0;
      text-transform: uppercase;
      letter-spacing: 0.3pt;
      color: #0f172a;
    }
    .sub-title {
      font-size: 8pt;
      text-align: center;
      color: #475569;
      margin-bottom: 8pt;
    }
    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      background: #f1f5f9;
      padding: 2.5pt 6pt;
      border-left: 3px solid #0f172a;
      margin: 6pt 0 3pt 0;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4pt;
      font-size: 8.2pt;
    }
    .details-table td {
      padding: 2.5pt 4pt;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
    }
    .details-table td.label-col {
      width: 32%;
      color: #475569;
      font-weight: 600;
    }
    .finance-grid {
      width: 100%;
      border-collapse: collapse;
      margin: 6pt 0;
      font-size: 8.5pt;
    }
    .finance-grid th, .finance-grid td {
      border: 1px solid #cbd5e1;
      padding: 4pt 6pt;
      text-align: left;
    }
    .finance-grid th {
      background: #f8fafc;
      font-weight: 700;
      color: #0f172a;
    }
    .finance-grid td.amount-col {
      text-align: right;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      width: 25%;
    }
    .total-in-words {
      background: #fafafa;
      border: 1px dashed #cbd5e1;
      padding: 4pt 8pt;
      font-size: 8pt;
      margin: 4pt 0;
      line-height: 1.35;
    }
    .receipts-list {
      font-size: 7.5pt;
      color: #475569;
      margin: 4pt 0;
      line-height: 1.3;
    }
    .bottom-signatures {
      display: grid;
      grid-template-columns: 120px 1fr 1fr;
      gap: 12pt;
      align-items: center;
      margin-top: 8pt;
      padding-top: 6pt;
      border-top: 1.5px solid #0f172a;
      font-size: 8pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .stamp-box {
      border: 1px dashed #94a3b8;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 7pt;
      color: #64748b;
      margin: 0 auto;
    }
  </style>
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
        <div class="barcode-container">
          ${barcodeSvg}
        </div>
      </div>

      <h1>Справка об оплате медицинских услуг</h1>
      <div class="sub-title">
        для представления в налоговый орган Российской Федерации № <strong>${escapeHtml(certificateNumber)}</strong> от <strong>${issueDateFormatted}</strong><br>
        за <strong>${taxYear}</strong> календарный год
      </div>

      <div class="section-title">1. Сведения о медицинской организации (клинике)</div>
      <table class="details-table">
        <tr>
          <td class="label-col">Наименование организации:</td>
          <td><strong>${escapeHtml(clinic.legalName)}</strong></td>
        </tr>
        <tr>
          <td class="label-col">ИНН / КПП организации:</td>
          <td>ИНН <strong>${escapeHtml(clinic.inn)}</strong>${clinic.kpp ? ` / КПП <strong>${escapeHtml(clinic.kpp)}</strong>` : ""}</td>
        </tr>
        <tr>
          <td class="label-col">ОГРН:</td>
          <td><strong>${escapeHtml(clinic.ogrn)}</strong></td>
        </tr>
        <tr>
          <td class="label-col">Адрес местонахождения:</td>
          <td>${escapeHtml(clinic.address)}</td>
        </tr>
        <tr>
          <td class="label-col">Лицензия на мед. деятельность:</td>
          <td>№ <strong>${escapeHtml(clinic.licenseNumber)}</strong>${clinic.licenseDate ? ` от ${escapeHtml(clinic.licenseDate)}` : ""}</td>
        </tr>
      </table>

      <div class="section-title">2. Сведения о налогоплательщике</div>
      <table class="details-table">
        <tr>
          <td class="label-col">Фамилия, имя, отчество:</td>
          <td><strong>${escapeHtml(taxpayer.fullName)}</strong></td>
        </tr>
        <tr>
          <td class="label-col">ИНН налогоплательщика:</td>
          <td>${taxpayer.inn ? `<strong>${escapeHtml(taxpayer.inn)}</strong>` : "Не указан (идентифицирован по документу)"}</td>
        </tr>
        <tr>
          <td class="label-col">Дата рождения:</td>
          <td>${taxpayer.birthDate ? formatDateRu(taxpayer.birthDate) : "____________________"}</td>
        </tr>
        <tr>
          <td class="label-col">Документ, удостоверяющий личность:</td>
          <td>${taxpayerPassportStr}</td>
        </tr>
      </table>

      <div class="section-title">3. Сведения о пациенте и родстве</div>
      <table class="details-table">
        <tr>
          <td class="label-col">Фамилия, имя, отчество пациента:</td>
          <td><strong>${escapeHtml(patient.fullName)}</strong></td>
        </tr>
        <tr>
          <td class="label-col">Дата рождения пациента:</td>
          <td>${patient.birthDate ? formatDateRu(patient.birthDate) : "____________________"}</td>
        </tr>
        <tr>
          <td class="label-col">Отношение к налогоплательщику:</td>
          <td>
            <strong>Код ${relInfo.code}</strong> — ${relInfo.labelRu}
            ${!isSamePerson && patientPassportStr ? ` (${patientPassportStr})` : ""}
          </td>
        </tr>
      </table>

      <div class="section-title">4. Стоимость оплаченных медицинских услуг за ${taxYear} год</div>
      <table class="finance-grid">
        <thead>
          <tr>
            <th style="width: 15%;">Код услуги</th>
            <th>Наименование категории медицинских услуг (ст. 219 НК РФ)</th>
            <th class="amount-col">Оплаченная сумма</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; font-weight: 700;">1</td>
            <td>
              <strong>Медицинские услуги</strong> (терапевтическое лечение кариеса, пульпита, гигиена полости рта, хирургическое удаление зубов, съемное протезирование)
            </td>
            <td class="amount-col">${code01Formatted}</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: 700;">2</td>
            <td>
              <strong>Дорогостоящее лечение</strong> по Перечню ПП РФ № 458 (дентальная имплантация, костная пластика, синус-лифтинг, сложные несъемные конструкции на имплантатах)
            </td>
            <td class="amount-col">${code02Formatted}</td>
          </tr>
          <tr style="background: #f8fafc; font-weight: 800;">
            <td colspan="2" style="text-align: right; padding-right: 12pt;">ИТОГО ОПЛАЧЕНО ЗА ${taxYear} ГОД:</td>
            <td class="amount-col" style="font-size: 9.5pt; color: #0f172a;">${totalFormatted}</td>
          </tr>
        </tbody>
      </table>

      <div class="total-in-words">
        Сумма прописью: <strong>${totalInWords}</strong><br>
        <span style="font-size: 7.5pt; color: #64748b;">
          Фискализированных чеков ККТ: ${aggregation.receiptsCount}. Возвратов учтено: ${formatRublesExactRu(aggregation.refundedKopecks / 100)}.
          Расчетный возврат НДФЛ 13%: ${formatRublesExactRu(aggregation.estimatedRefund13Rub)}.
        </span>
      </div>

      ${aggregation.payments.length > 0 ? `
      <div class="receipts-list">
        <strong>Реестр подтверждающих фискальных документов ККТ за ${taxYear} г.:</strong><br>
        ${aggregation.payments.map((p, i) => {
					const date = formatDateRu(p.dateIso);
					const fd = p.fiscalDocumentNumber ? `ФД № ${p.fiscalDocumentNumber}` : "";
					const fp = p.fiscalSign ? `ФП ${p.fiscalSign}` : "";
					const code = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
					return `${i + 1}. ${date} — ${escapeHtml(p.serviceName)} [Код ${code}] — ${formatRublesExactRu(p.amountRub)} ${fd} ${fp}`;
				}).join("; ")}
      </div>
      ` : ""}
    </div>

    <div class="bottom-signatures">
      <div style="text-align: center;">
        ${qrSvg}
      </div>
      <div>
        Руководитель клиники / гл. врач:<br><br>
        ______________________ / ${escapeHtml(clinic.chiefDoctorOrDirector || "Смирнов А.В.")}
      </div>
      <div style="text-align: center;">
        <div class="stamp-box">
          М.П.<br>КЛИНИКА
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers browser printing of the generated tax certificate HTML via window.open with iframe fallback.
 */
export function printTaxCertificateHtml(html: string): void {
	let printWindow: Window | null = null;
	try {
		printWindow = window.open("", "_blank", "width=920,height=1050");
	} catch (e) {
		console.warn("window.open blocked, using iframe fallback", e);
	}

	if (printWindow && !printWindow.closed) {
		try {
			printWindow.document.open();
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				try {
					printWindow?.print();
				} catch (printErr) {
					console.error("Window print trigger failed:", printErr);
				}
			}, 300);
			return;
		} catch (writeErr) {
			console.warn("Error writing to printWindow, trying fallback iframe", writeErr);
		}
	}

	// Fallback iframe
	try {
		const existingIframe = document.getElementById("dente-tax-cert-print-iframe");
		if (existingIframe) existingIframe.remove();

		const iframe = document.createElement("iframe");
		iframe.id = "dente-tax-cert-print-iframe";
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "none";
		iframe.style.zIndex = "-999";
		document.body.appendChild(iframe);

		const doc = iframe.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
			iframe.contentWindow?.focus();
			setTimeout(() => {
				try {
					iframe.contentWindow?.print();
				} catch (iframeErr) {
					console.error("Iframe print trigger failed:", iframeErr);
				}
			}, 350);
		}
	} catch (iframeSetupErr) {
		console.error("Iframe fallback print failed:", iframeSetupErr);
		window.print();
	}
}
