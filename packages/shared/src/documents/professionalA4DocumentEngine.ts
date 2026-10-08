/**
 * professionalA4DocumentEngine.ts
 *
 * Промышленный печатный движок официального медицинского, правового и финансового
 * документооборота A4 по стандартам Российской Федерации (ГОСТ Р 7.0.97-2016).
 *
 * Канонические генераторы:
 * 1. Договор на оказание платных медицинских стоматологических услуг
 *    (Постановление Правительства РФ от 11.05.2023 № 736, ст. 84 323-ФЗ, 152-ФЗ) — СТРОГО 3 листа А4.
 * 2. Информированное добровольное согласие на медицинское вмешательство (ИДС)
 *    (Приказ Минздрава России от 12.11.2021 № 1051н, ст. 20 323-ФЗ) — СТРОГО 2 листа А4.
 * 3. Согласие на обработку персональных данных и специальных категорий
 *    (Федеральный закон от 27.07.2006 № 152-ФЗ, ПП РФ от 09.02.2022 № 140 / ЕГИСЗ) — 1 лист А4.
 * 4. Акт сдачи-приёмки оказанных медицинских услуг
 *    (Номенклатура МЗ РФ № 804н, онлайн-касса 54-ФЗ, гарантии) — 1 лист А4.
 * 5. Комплексный план стоматологического лечения с финансовой сметой
 *    (Этапы, процедуры, альтернативы, блок информированного согласования) — СТРОГО 2 листа А4.
 * 6. Медицинская карта стоматологического пациента / Дневник приёма
 *    (Приказ Минздрава РФ № 834н, зубная формула FDI 11..48, протокол лечения, МКБ-10) — СТРОГО 2 листа А4.
 *
 * Инварианты:
 * - Левое поле 20 мм под архивный скоросшиватель (ГОСТ Р 7.0.97-2016).
 * - Белый лист бумаги (#ffffff) и 100% контрастный чёрный текст (#000000).
 * - 0 цветных рамок, 0 градиентов, 0 веб-плашек, 0 эмодзи.
 * - Blank Line Invariant: типографские подчеркивания при незаполненных данных в БД.
 */

import { integerToRussianWords } from "../sanpin/sanpinRegistryEngine.js";

export interface A4ClinicRequisites {
	readonly name: string;
	readonly legalName?: string | null | undefined;
	readonly shortName?: string | null | undefined;
	readonly address: string;
	readonly actualAddress?: string | null | undefined;
	readonly inn: string;
	readonly kpp?: string | null | undefined;
	readonly ogrn: string;
	readonly licenseNumber: string;
	readonly licenseDate?: string | null | undefined;
	readonly licenseIssuer?: string | null | undefined;
	readonly phone: string;
	readonly email?: string | null | undefined;
	readonly website?: string | null | undefined;
	readonly bankName?: string | null | undefined;
	readonly bik?: string | null | undefined;
	readonly checkingAccount?: string | null | undefined;
	readonly correspondentAccount?: string | null | undefined;
	readonly directorTitle?: string | null | undefined;
	readonly directorFullName?: string | null | undefined;
	readonly city?: string | null | undefined;
}

export interface A4PatientRequisites {
	readonly fullName: string;
	readonly birthDate?: string | null | undefined;
	readonly gender?: "male" | "female" | string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly passportSeries?: string | null | undefined;
	readonly passportNumber?: string | null | undefined;
	readonly passportIssuedBy?: string | null | undefined;
	readonly passportIssuedDate?: string | null | undefined;
	readonly passportDepartmentCode?: string | null | undefined;
	readonly passportRaw?: string | null | undefined;
	readonly address?: string | null | undefined;
	readonly registrationAddress?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly omsPolis?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
}

export interface A4CustomerRequisites extends A4PatientRequisites {
	readonly isDifferentFromPatient?: boolean | undefined;
	readonly relationshipToPatient?: string | null | undefined;
}

export interface A4DocumentServiceItem {
	readonly code804n?: string | null | undefined;
	readonly name: string;
	readonly toothOrArea?: string | number | null | undefined;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly discountRub?: number | null | undefined;
	readonly totalRub: number;
}

export interface A4DocumentContractData {
	readonly contractNumber: string;
	readonly contractDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly customer?: A4CustomerRequisites | null | undefined;
	readonly services?: readonly A4DocumentServiceItem[] | null | undefined;
	readonly estimatedTotalRub: number;
	readonly doctorFullName?: string | null | undefined;
	readonly serviceScopeSummary?: string | null | undefined;
	readonly clinicalReason?: string | null | undefined;
}

export interface A4DocumentActData {
	readonly actNumber: string;
	readonly actDate: string;
	readonly contractNumber: string;
	readonly contractDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly customer?: A4CustomerRequisites | null | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null | undefined;
	readonly services: readonly A4DocumentServiceItem[];
	readonly totalAmountRub: number;
	readonly paidAmountRub?: number | null | undefined;
	readonly fiscalReceiptNumber?: string | null | undefined;
	readonly warrantyTermsText?: string | null | undefined;
	readonly patientClaimsText?: string | null | undefined;
}

export interface A4TreatmentPlanStageItem {
	readonly stageNumber: number;
	readonly stageName: string;
	readonly plannedServices: readonly {
		readonly name: string;
		readonly toothOrArea?: string | number | null | undefined;
		readonly timing?: string | null | undefined;
		readonly priceRub: number;
	}[];
	readonly stageTotalRub: number;
	readonly stageTiming?: string | null | undefined;
	readonly clinicalNotes?: string | null | undefined;
}

export interface A4DocumentTreatmentPlanData {
	readonly planNumber?: string | null | undefined;
	readonly planDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicalReason?: string | null | undefined;
	readonly diagnosisSummary?: string | null | undefined;
	readonly stages: readonly A4TreatmentPlanStageItem[];
	readonly totalCostWithoutDiscountRub: number;
	readonly discountRub?: number | null | undefined;
	readonly totalCostWithDiscountRub: number;
	readonly alternativesText?: string | null | undefined;
	readonly risksAndLimitsText?: string | null | undefined;
	readonly approvedVariantName?: string | null | undefined;
}

export interface A4DocumentMedicalCardData {
	readonly cardNumber: string;
	readonly visitDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null | undefined;
	readonly complaints: string;
	readonly anamnesisMorbi?: string | null | undefined;
	readonly anamnesisVitae?: string | null | undefined;
	readonly allergyStatus?: string | null | undefined;
	readonly somaticStatus?: string | null | undefined;
	readonly statusLocalis: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisDescription: string;
	readonly diagnosisTooth?: string | number | null | undefined;
	readonly teethFormulaMap?: Record<number | string, { state: string; label?: string }> | null | undefined;
	readonly teethFormulaSummary?: string | null | undefined;
	readonly treatmentProtocol: string;
	readonly materialsUsed?: string | null | undefined;
	readonly recommendations: string;
	readonly nextVisitDate?: string | null | undefined;
}

export interface A4DocumentInformedConsentData {
	readonly consentNumber?: string | null | undefined;
	readonly consentDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly customer?: A4CustomerRequisites | null | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null | undefined;
	readonly interventionName: string;
	readonly toothOrArea?: string | number | null | undefined;
	readonly diagnosisSummary?: string | null | undefined;
	readonly plannedInterventionsList?: readonly string[] | null | undefined;
	readonly possibleComplicationsText?: string | null | undefined;
	readonly alternativesText?: string | null | undefined;
	readonly patientQuestionsAnswered?: boolean | undefined;
	readonly contractNumber?: string | null | undefined;
	readonly contractDate?: string | null | undefined;
}

export interface A4DocumentPersonalDataConsentData {
	readonly consentNumber?: string | null | undefined;
	readonly consentDate: string;
	readonly clinic: A4ClinicRequisites;
	readonly patient: A4PatientRequisites;
	readonly customer?: A4CustomerRequisites | null | undefined;
	readonly purposeList?: readonly string[] | null | undefined;
	readonly thirdPartyTransfersAllowed?: boolean | undefined;
	readonly egiszTransferAllowed?: boolean | undefined;
}

function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function formatRubles(amount: number): string {
	return (Number(amount) || 0)
		.toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})
		.replace(/[\u00A0\u202F]/g, " ");
}

export function formatAmountInWordsRu(amount: number): string {
	const n = Math.max(0, Math.floor(amount));
	const kopecks = Math.round((Math.abs(amount) - n) * 100);
	const words = integerToRussianWords(n);
	const capitalized = words.charAt(0).toUpperCase() + words.slice(1);

	let rubWord = "рублей";
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) rubWord = "рубль";
	else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) rubWord = "рубля";

	let kopWord = "копеек";
	const kMod10 = kopecks % 10;
	const kMod100 = kopecks % 100;
	if (kMod10 === 1 && kMod100 !== 11) kopWord = "копейка";
	else if (kMod10 >= 2 && kMod10 <= 4 && (kMod100 < 10 || kMod100 >= 20)) kopWord = "копейки";

	return `${capitalized} ${rubWord} ${String(kopecks).padStart(2, "0")} ${kopWord}`;
}

export function formatPassportString(p: A4PatientRequisites): string {
	if (p.passportSeries && p.passportNumber) {
		const issuedBy = p.passportIssuedBy ? `, выдан ${p.passportIssuedBy}` : "";
		const date = p.passportIssuedDate ? `, дата: ${p.passportIssuedDate}` : "";
		const code = p.passportDepartmentCode ? `, код подразделения: ${p.passportDepartmentCode}` : "";
		return `серия ${p.passportSeries} № ${p.passportNumber}${issuedBy}${date}${code}`;
	}
	if (p.passportRaw && p.passportRaw.trim()) return p.passportRaw.trim();
	return "серия ______ № __________, выдан ____________________________________________________, дата «___» _________ _____ г., код подразделения: _________";
}

export function formatAddressString(addr?: string | null): string {
	if (addr && addr.trim()) return addr.trim();
	return "____________________________________________________________________________________";
}

export function formatPhoneString(phone?: string | null): string {
	if (phone && phone.trim()) return phone.trim();
	return "+7 (____) ___-__-__";
}

export function formatSnilsString(snils?: string | null): string {
	if (snils && snils.trim()) return snils.trim();
	return "___-___-___ __";
}

export function formatPolicyString(polis?: string | null): string {
	if (polis && polis.trim()) return polis.trim();
	return "____________________________________";
}

export function formatDateString(date?: string | null): string {
	if (date && date.trim()) return date.trim();
	return "«___» _________ 20__ г.";
}

export function formatSignatoryString(name?: string | null): string {
	if (name && name.trim()) return name.trim();
	return "____________________________________";
}

/**
 * Базовые полиграфические CSS-стили печатного листа A4 по ГОСТ Р 7.0.97-2016.
 * Строгий монохром, 100% контраст чёрным по белому, левое поле 20 мм под скоросшиватель.
 */
export const A4_PRINT_BASE_STYLES = `
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  *, *::before, *::after {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff !important;
    color: #000000 !important;
    font-family: "PT Astra Serif", "Times New Roman", Times, Georgia, serif;
    font-size: 9.5pt;
    line-height: 1.28;
  }
  .a4-page {
    width: 210mm;
    min-height: 297mm;
    height: 297mm;
    margin: 0 auto;
    padding: 15mm 12mm 15mm 20mm;
    background: #ffffff !important;
    color: #000000 !important;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .a4-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .a4-running-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5pt;
    font-family: "PT Astra Sans", Arial, sans-serif;
    color: #333333;
    border-bottom: 0.5pt solid #888888;
    padding-bottom: 3px;
    margin-bottom: 8px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .a4-running-footer {
    position: absolute;
    bottom: 8mm;
    left: 20mm;
    right: 12mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7.5pt;
    font-family: "PT Astra Sans", Arial, sans-serif;
    color: #444444;
    border-top: 0.5pt solid #888888;
    padding-top: 3px;
  }
  @media screen {
    body {
      background: #0b1120 !important;
      padding: 24px 0;
    }
    .a4-page {
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.1);
      margin-bottom: 24px;
    }
  }
  @media print {
    body {
      background: #ffffff !important;
      padding: 0 !important;
    }
    .a4-page {
      width: 210mm !important;
      height: 297mm !important;
      min-height: 297mm !important;
      max-height: 297mm !important;
      margin: 0 !important;
      padding: 15mm 12mm 15mm 20mm !important;
      box-shadow: none !important;
      page-break-after: always !important;
      break-after: page !important;
      overflow: hidden !important;
    }
    .a4-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .no-print {
      display: none !important;
    }
  }

  /* ── Типографика официальных документов РФ (ГОСТ Р 7.0.97-2016) ── */
  .a4-header {
    border-bottom: 1.5pt solid #000000;
    padding-bottom: 5px;
    margin-bottom: 8px;
  }
  .a4-clinic-name {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    line-height: 1.2;
    letter-spacing: 0.02em;
  }
  .a4-clinic-requisites {
    font-size: 8pt;
    font-family: "PT Astra Sans", Arial, sans-serif;
    line-height: 1.25;
    color: #222222;
    margin-top: 2px;
  }
  .a4-doc-title {
    text-align: center;
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin: 8px 0 2px 0;
  }
  .a4-doc-subtitle {
    text-align: center;
    font-size: 8.5pt;
    color: #222222;
    margin-bottom: 8px;
    line-height: 1.25;
  }
  .a4-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    font-weight: bold;
    margin-bottom: 6px;
    border-bottom: 0.5pt solid #888888;
    padding-bottom: 3px;
  }
  .a4-p {
    font-size: 9pt;
    line-height: 1.28;
    text-align: justify;
    text-justify: inter-word;
    margin: 3.5px 0;
    text-indent: 1.25cm;
  }
  .a4-p-noindent {
    font-size: 9pt;
    line-height: 1.28;
    text-align: justify;
    margin: 3.5px 0;
  }
  .a4-section-heading {
    font-size: 9.5pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 8px;
    margin-bottom: 3px;
    border-bottom: 0.75pt solid #000000;
    padding-bottom: 2px;
    letter-spacing: 0.01em;
  }
  
  /* ── Таблицы с тонкими 0.75pt линиями ── */
  table.a4-table {
    width: 100%;
    border-collapse: collapse;
    margin: 5px 0;
    font-size: 8.5pt;
    line-height: 1.2;
  }
  table.a4-table th, table.a4-table td {
    border: 0.75pt solid #000000;
    padding: 3pt 4.5pt;
    vertical-align: top;
  }
  table.a4-table th {
    background: #f0f0f0;
    font-weight: bold;
    text-align: center;
    font-size: 8pt;
    font-family: "PT Astra Sans", Arial, sans-serif;
  }
  table.a4-table tr.total-row td {
    font-weight: bold;
    background: #f8f8f8;
  }

  /* ── Блоки подписей и реквизитов Сторон ── */
  .a4-sign-grid {
    display: table;
    width: 100%;
    margin-top: 10px;
    padding-top: 6px;
    border-top: 1pt solid #000000;
    page-break-inside: avoid;
    break-inside: avoid;
    font-size: 8.5pt;
  }
  .a4-sign-col {
    display: table-cell;
    width: 50%;
    vertical-align: top;
    padding-right: 12px;
  }
  .a4-sign-line {
    border-bottom: 0.75pt solid #000000;
    margin-top: 20px;
    margin-bottom: 2px;
    min-height: 12px;
  }
  .a4-sign-hint {
    font-size: 7pt;
    text-align: center;
    color: #444444;
  }
  .stamp-box {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 0.75pt dashed #444444;
    text-align: center;
    line-height: 40px;
    font-size: 7.5pt;
    color: #555555;
    margin-left: 8px;
    vertical-align: middle;
  }
</style>
`;

function renderClinicHeaderHtml(cl: A4ClinicRequisites): string {
	const clinicName = cl.legalName || cl.name;
	const address = cl.actualAddress || cl.address || formatAddressString(null);
	const phone = cl.phone || formatPhoneString(null);
	const inn = cl.inn ? `ИНН: ${cl.inn}` : "ИНН: ____________";
	const ogrn = cl.ogrn ? `ОГРН: ${cl.ogrn}` : "ОГРН: ____________";
	const kpp = cl.kpp ? ` · КПП: ${cl.kpp}` : "";
	const licenseDate = cl.licenseDate ? ` от ${cl.licenseDate} г.` : "";
	const licenseIssuer = cl.licenseIssuer ? ` (${cl.licenseIssuer})` : "";
	const license = cl.licenseNumber
		? `Лицензия на осуществление медицинской деятельности (ЕРУЛ): № ${cl.licenseNumber}${licenseDate}${licenseIssuer}`
		: "Лицензия на осуществление медицинской деятельности: № __________________ от «___» ________ 20__ г.";

	return `
  <div class="a4-header">
    <div class="a4-clinic-name">${escapeHtml(clinicName)}</div>
    <div class="a4-clinic-requisites">
      Адрес: ${escapeHtml(address)} · Тел: ${escapeHtml(phone)} · ${escapeHtml(inn)}${escapeHtml(kpp)} · ${escapeHtml(ogrn)}<br>
      ${escapeHtml(license)}
    </div>
  </div>`;
}

function renderRunningFooterHtml(docLabel: string, currentPage: number, totalPages: number): string {
	return `
  <div class="a4-running-footer">
    <div>${escapeHtml(docLabel)}</div>
    <div>Стр. ${currentPage} из ${totalPages}</div>
  </div>`;
}

function renderRunningHeaderHtml(docLabel: string, sheetNum: number): string {
	return `
  <div class="a4-running-header">
    <div>${escapeHtml(docLabel)}</div>
    <div>Лист ${sheetNum}</div>
  </div>`;
}

/**
 * 1. КАНОНИЧЕСКИЙ ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ (ПП РФ № 736)
 * СТРОГО 3 ЛИСТА А4 по ГОСТ Р 7.0.97-2016.
 */
export function generateA4PaidContractHtml(data: A4DocumentContractData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const cust = data.customer && data.customer.isDifferentFromPatient ? data.customer : pt;
	const isCustomerDifferent = Boolean(data.customer && data.customer.isDifferentFromPatient);

	const city = cl.city || "г. Москва";
	const formattedCost = formatRubles(data.estimatedTotalRub);
	const inWordsCost = formatAmountInWordsRu(data.estimatedTotalRub);
	const contractDocLabel = `Договор № ${data.contractNumber} от ${data.contractDate} г.`;

	const servicesRows = (data.services && data.services.length > 0)
		? data.services.map((s, idx) => `
        <tr>
          <td style="text-align:center; width:25px;">${idx + 1}</td>
          <td style="width:70px; text-align:center; font-family:'PT Astra Sans', Arial, sans-serif;">${escapeHtml(s.code804n || "—")}</td>
          <td>${escapeHtml(s.name)}</td>
          <td style="text-align:center; width:55px;">${escapeHtml(s.toothOrArea || "—")}</td>
          <td style="text-align:center; width:35px;">${s.quantity}</td>
          <td style="text-align:right; width:75px;">${formatRubles(s.unitPriceRub)}</td>
          <td style="text-align:right; width:75px; font-weight:bold;">${formatRubles(s.totalRub)}</td>
        </tr>
      `).join("")
		: `
        <tr>
          <td style="text-align:center;">1</td>
          <td style="text-align:center;">B01.065.001</td>
          <td>${escapeHtml(data.serviceScopeSummary || "Комплексные стоматологические медицинские услуги в соответствии с утвержденным Планом лечения и сметой")}</td>
          <td style="text-align:center;">—</td>
          <td style="text-align:center;">1</td>
          <td style="text-align:right;">${formattedCost}</td>
          <td style="text-align:right; font-weight:bold;">${formattedCost}</td>
        </tr>
      `;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Договор № ${escapeHtml(data.contractNumber)} на оказание платных медицинских услуг</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>

<!-- ════════ ЛИСТ 1 ИЗ 3 ════════ -->
<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">ДОГОВОР № ${escapeHtml(data.contractNumber)}</div>
  <div class="a4-doc-subtitle">на оказание платных медицинских стоматологических услуг<br>(в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736)</div>

  <div class="a4-meta-row">
    <div>${escapeHtml(city)}</div>
    <div>«${escapeHtml(data.contractDate)}» г.</div>
  </div>

  <p class="a4-p">
    <strong>${escapeHtml(cl.legalName || cl.name)}</strong>${cl.shortName ? ` (${escapeHtml(cl.shortName)})` : ""}, именуемое в дальнейшем <strong>«Исполнитель»</strong>, в лице ${escapeHtml(cl.directorTitle || "Руководителя")} ${escapeHtml(cl.directorFullName || formatSignatoryString(null))}, действующего на основании Устава и лицензии на осуществление медицинской деятельности № ${escapeHtml(cl.licenseNumber || "________________")}, с одной стороны, и гражданин(ка) <strong>${escapeHtml(cust.fullName)}</strong>, ${
		isCustomerDifferent
			? `именуемый(ая) в дальнейшем «Заказчик», действующий(ая) в интересах Пациента <strong>${escapeHtml(pt.fullName)}</strong>`
			: `именуемый(ая) в дальнейшем «Пациент» (Заказчик)`
	}, с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:
  </p>

  <div class="a4-section-heading">1. Предмет договора и уведомление о государственных гарантиях</div>
  <p class="a4-p">
    1.1. Исполнитель обязуется оказать Пациенту платные стоматологические медицинские услуги надлежащего качества в соответствии с порядками оказания медицинской помощи, на основе клинических рекомендаций и с учетом стандартов медицинской помощи РФ, а Заказчик обязуется принять и оплатить оказанные услуги в соответствии с условиями настоящего Договора и утвержденной сметой.
  </p>
  <p class="a4-p">
    1.2. <strong>Уведомление о программе государственных гарантий (ст. 84 323-ФЗ):</strong> До заключения настоящего Договора Исполнитель в письменной форме уведомил Пациента (Заказчика) о возможности получения медицинской помощи по программе государственных гарантий бесплатного оказания гражданам медицинской помощи и территориальной программе (по полису ОМС) в государственных и муниципальных медицинских организациях. Заказчик подтверждает добровольный выбор платных медицинских услуг.
  </p>
  <p class="a4-p">
    1.3. Основание обращения: <u>${escapeHtml(data.clinicalReason || "Первичная консультация и осмотр врача-стоматолога")}</u>. Амбулаторная медицинская карта № <strong>${escapeHtml(pt.cardNumber || "б/н")}</strong>.
  </p>

  <div class="a4-section-heading">2. Перечень и ориентировочная стоимость услуг</div>
  <table class="a4-table">
    <thead>
      <tr>
        <th>№</th>
        <th>Код услуги</th>
        <th>Наименование медицинской услуги</th>
        <th>Зуб</th>
        <th>Кол.</th>
        <th>Цена (руб.)</th>
        <th>Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${servicesRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="6" style="text-align:right;">ИТОГО К ОПЛАТЕ:</td>
        <td style="text-align:right;">${formattedCost}</td>
      </tr>
    </tfoot>
  </table>

  <p class="a4-p-noindent" style="font-size: 8.5pt;">
    <strong>Ориентировочная стоимость услуг:</strong> ${formattedCost} руб. (${escapeHtml(inWordsCost)}). Оплата производится в порядке наличного или безналичного расчета с выдачей обязательного фискального кассового чека по 54-ФЗ.
  </p>

  ${renderRunningFooterHtml(contractDocLabel, 1, 3)}
</div>

<!-- ════════ ЛИСТ 2 ИЗ 3 ════════ -->
<div class="a4-page">
  ${renderRunningHeaderHtml(contractDocLabel, 2)}

  <div class="a4-section-heading">3. Условия и порядок предоставления медицинских услуг</div>
  <p class="a4-p">
    3.1. Медицинские услуги оказываются Исполнителем в соответствии с лицензией, порядками оказания медицинской помощи, утвержденными Минздравом России, а также на основе клинических рекомендаций профессионального сообщества Стоматологической Ассоциации России (СтАР).
  </p>
  <p class="a4-p">
    3.2. До начала оказания каждой медицинской услуги лечащий врач предоставляет Пациенту полную информацию о целях, методах вмешательства, сопутствующих рисках, возможных вариантах лечения и последствиях отказа от него, оформляя Информированное добровольное согласие (ИДС, Приказ МЗ РФ № 1051н).
  </p>

  <div class="a4-section-heading">4. Права и обязанности Сторон</div>
  <p class="a4-p">
    4.1. <strong>Исполнитель обязан:</strong> обеспечить соответствие медицинских услуг обязательным требованиям; вести учет в амбулаторной медицинской карте; соблюдать врачебную тайну в соответствии со ст. 13 Федерального закона № 323-ФЗ; обеспечить защиту персональных данных по Федеральному закону № 152-ФЗ.
  </p>
  <p class="a4-p">
    4.2. <strong>Исполнитель имеет право:</strong> перенести время приёма при опоздании Пациента более чем на 15 минут; отказать в приёме при нахождении Пациента в состоянии алкогольного, токсического или наркотического опьянения, а также при нарушении правил внутреннего распорядка; назначить проведение обязательной дополнительной диагностики (визиография, ОПТГ, КЛКТ).
  </p>
  <p class="a4-p">
    4.3. <strong>Пациент обязан:</strong> своевременно прибывать на приём; информировать врача о перенесенных заболеваниях, аллергиях и принимаемых препаратах; строго соблюдать гигиенические рекомендации лечащего врача и назначенный режим; являться на бесплатные профилактические осмотры не реже 1 раза в 6 месяцев для сохранения гарантийных обязательств.
  </p>
  <p class="a4-p">
    4.4. <strong>Запрет на навязывание услуг:</strong> Любые дополнительные платные услуги, не вошедшие в согласованную смету, оказываются Исполнителем исключительно с предварительного письменного согласия Заказчика путем подписания дополнительного соглашения к Договору.
  </p>

  <div class="a4-section-heading">5. Порядок расчетов и оплаты</div>
  <p class="a4-p">
    5.1. Оплата медицинских услуг производится Заказчиком в рублях РФ наличными денежными средствами, банковской картой через эквайринг или безналичным расчетом (включая Систему быстрых платежей СБП).
  </p>
  <p class="a4-p">
    5.2. Оплата подтверждается выдачей фискального кассового чека контрольно-кассовой техники в соответствии с Федеральным законом № 54-ФЗ.
  </p>
  <p class="a4-p">
    5.3. При проведении комплексного, хирургического или ортопедического лечения Заказчик вносит авансовый платеж в размере стоимости расходных материалов и зуботехнических этапов. Неизрасходованные авансовые средства подлежат возврату Заказчику при прекращении лечения.
  </p>

  <div class="a4-section-heading">6. Гарантийные обязательства клиники</div>
  <p class="a4-p">
    6.1. Исполнитель устанавливает следующие базовые гарантийные сроки: 12 месяцев на терапевтические композитные реставрации и пломбы; 24 месяца на несъемные ортопедические конструкции (коронки, мостовидные протезы) с момента подписания Акта сдачи-приемки.
  </p>
  <p class="a4-p">
    6.2. Гарантийные обязательства сохраняются исключительно при строгом выполнении Пациентом назначений лечащего врача, поддержании высокого уровня гигиены полости рта и регулярном прохождении контрольных осмотров 1 раз в 6 месяцев.
  </p>

  ${renderRunningFooterHtml(contractDocLabel, 2, 3)}
</div>

<!-- ════════ ЛИСТ 3 ИЗ 3 ════════ -->
<div class="a4-page">
  ${renderRunningHeaderHtml(contractDocLabel, 3)}

  <div class="a4-section-heading">7. Ответственность Сторон, разрешение споров и форс-мажор</div>
  <p class="a4-p">
    7.1. За неисполнение либо ненадлежащее исполнение обязательств по настоящему Договору Стороны несут ответственность в соответствии с законодательством Российской Федерации и Законом РФ «О защите прав потребителей».
  </p>
  <p class="a4-p">
    7.2. Исполнитель освобождается от ответственности за неблагоприятный исход лечения, если он наступил вследствие сокрытия Пациентом достоверных сведений о состоянии здоровья или нарушения предписанного медицинского режима.
  </p>
  <p class="a4-p">
    7.3. <strong>Досудебный претензионный порядок:</strong> В случае возникновения разногласий Стороны обязуются соблюдать обязательный претензионный порядок. Срок рассмотрения письменной претензии Стороной составляет 10 (десять) рабочих дней со дня ее получения.
  </p>
  <p class="a4-p">
    7.4. Стороны освобождаются от ответственности за частичное или полное неисполнение обязательств при наступлении обстоятельств непреодолимой силы (форс-мажор).
  </p>

  <div class="a4-section-heading">8. Конфиденциальность и защита персональных данных (152-ФЗ, ЕГИСЗ)</div>
  <p class="a4-p">
    8.1. Сведения о факте обращения, состоянии здоровья и диагнозе составляют врачебную тайну (ст. 13 323-ФЗ).
  </p>
  <p class="a4-p">
    8.2. Обработка персональных данных осуществляется Исполнителем в соответствии с Федеральным законом № 152-ФЗ. Пациент уведомлен и согласен с передачей сведений в Единую государственную информационную систему в сфере здравоохранения (ЕГИСЗ) в установленных законом случаях (Постановление Правительства РФ № 140).
  </p>

  <div class="a4-section-heading">9. Срок действия и порядок расторжения договора</div>
  <p class="a4-p">
    9.1. Договор вступает в силу с момента его подписания обеими Сторонами и действует до полного исполнения Сторонами своих обязательств. Договор составлен в 2 (двух) подлинных экземплярах, имеющих одинаковую юридическую силу.
  </p>

  <div class="a4-section-heading">10. Адреса, банковские реквизиты и подписи Сторон</div>
  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ИСПОЛНИТЕЛЬ:</strong><br>
      <strong>${escapeHtml(cl.legalName || cl.name)}</strong><br>
      Юр. адрес: ${escapeHtml(cl.address || formatAddressString(null))}<br>
      Факт. адрес: ${escapeHtml(cl.actualAddress || cl.address || formatAddressString(null))}<br>
      ОГРН: ${escapeHtml(cl.ogrn || "____________")}, ИНН: ${escapeHtml(cl.inn || "____________")}${cl.kpp ? `, КПП: ${escapeHtml(cl.kpp)}` : ""}<br>
      Р/с: ${escapeHtml(cl.checkingAccount || "___________________________")} в ${escapeHtml(cl.bankName || "Банк: ___________________________")}<br>
      БИК: ${escapeHtml(cl.bik || "_________")}, К/с: ${escapeHtml(cl.correspondentAccount || "___________________________")}<br>
      Тел: ${escapeHtml(cl.phone || formatPhoneString(null))}<br><br>
      ${escapeHtml(cl.directorTitle || "Руководитель / Врач")}:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || cl.directorFullName || formatSignatoryString(null))} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>ЗАКАЗЧИК (ПАЦИЕНТ):</strong><br>
      <strong>${escapeHtml(cust.fullName)}</strong><br>
      Дата рождения: ${escapeHtml(cust.birthDate || formatDateString(null))}<br>
      Паспорт: ${escapeHtml(formatPassportString(cust))}<br>
      Адрес регистрации: ${escapeHtml(cust.registrationAddress || cust.address || formatAddressString(null))}<br>
      Телефон: ${escapeHtml(cust.phone || formatPhoneString(null))}<br>
      СНИЛС: ${escapeHtml(cust.snils || formatSnilsString(null))}<br>
      <br>
      Подпись Заказчика (Пациента):<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(cust.fullName)} /</div>
    </div>
  </div>

  ${renderRunningFooterHtml(contractDocLabel, 3, 3)}
</div>

</body>
</html>`;
}

/**
 * 2. ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (ПРИКАЗ МЗ РФ № 1051н)
 * СТРОГО 2 ЛИСТА А4 по ГОСТ Р 7.0.97-2016.
 */
export function generateA4InformedConsentHtml(data: A4DocumentInformedConsentData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const cust = data.customer && data.customer.isDifferentFromPatient ? data.customer : pt;
	const isCustomerDifferent = Boolean(data.customer && data.customer.isDifferentFromPatient);
	const city = cl.city || "г. Москва";
	const docLabel = `ИДС (Приказ МЗ РФ № 1051н) · Пациент: ${pt.fullName}`;

	const plannedListHtml = (data.plannedInterventionsList && data.plannedInterventionsList.length > 0)
		? `<ul style="margin: 2px 0 4px 18px; padding: 0; font-size: 8.5pt;">${data.plannedInterventionsList.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
		: `<p class="a4-p">План вмешательства: ${escapeHtml(data.interventionName)} ${data.toothOrArea ? `(область/зуб: ${escapeHtml(data.toothOrArea)})` : ""}.</p>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Информированное добровольное согласие — ${escapeHtml(pt.fullName)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>

<!-- ════════ ЛИСТ 1 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ<br>НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО</div>
  <div class="a4-doc-subtitle">в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ<br>и Приказом Министерства здравоохранения Российской Федерации от 12.11.2021 № 1051н</div>

  <div class="a4-meta-row">
    <div>${escapeHtml(city)}</div>
    <div>«${escapeHtml(data.consentDate)}» г.</div>
  </div>

  <p class="a4-p">
    Я, гражданин(ка) <strong>${escapeHtml(cust.fullName)}</strong>, дата рождения: ${escapeHtml(cust.birthDate || formatDateString(null))}, документ, удостоверяющий личность: ${escapeHtml(formatPassportString(cust))}, зарегистрированный(ая) по адресу: ${escapeHtml(cust.registrationAddress || cust.address || formatAddressString(null))}, телефон: ${escapeHtml(cust.phone || formatPhoneString(null))}, ${
		isCustomerDifferent
			? `являясь законным представителем Пациента <strong>${escapeHtml(pt.fullName)}</strong> (дата рождения: ${escapeHtml(pt.birthDate || formatDateString(null))}),`
			: ""
	} при получении первичной медико-санитарной и специализированной стоматологической помощи в <strong>${escapeHtml(cl.legalName || cl.name)}</strong> у лечащего врача <strong>${escapeHtml(data.doctorFullName || formatSignatoryString(null))}</strong> (${escapeHtml(data.doctorSpecialty || "Врач-стоматолог")}) даю информированное добровольное согласие на медицинское вмешательство.
  </p>

  <div class="a4-section-heading">1. Характер и цели медицинского вмешательства</div>
  <p class="a4-p">
    1.1. Клинический диагноз: <strong>${escapeHtml(data.diagnosisSummary || "Санация полости рта, лечение стоматологического заболевания")}</strong>${data.toothOrArea ? ` (Область/Зуб: ${escapeHtml(data.toothOrArea)})` : ""}.
  </p>
  <p class="a4-p">
    1.2. Основное планируемое вмешательство: <strong>${escapeHtml(data.interventionName)}</strong>. Целями вмешательства являются: купирование болевого синдрома и воспаления, ликвидация инфекционного очага, восстановление анатомической формы, эстетики и жевательной эффективности зубочелюстной системы.
  </p>
  ${plannedListHtml}

  <div class="a4-section-heading">2. Методы оказания медицинской помощи и сопутствующие риски</div>
  <p class="a4-p">
    2.1. Мне разъяснены в доступной форме методы оказания медицинской помощи, включающие инструментальную и медикаментозную обработку, препарирование твердых тканей, применение современных пломбировочных и реставрационных материалов, проведение местной анестезии, а также контрольных рентгенологических исследований (радиовизиография, ортопантомография, КЛКТ).
  </p>
  <p class="a4-p">
    2.2. Я проинформирован(а), что медицинские вмешательства сопряжены с естественными биологическими рисками индивидуальной тканевой реакции, анатомической вариабельности корневых каналов и микрофлоры полости рта.
  </p>

  <div class="a4-section-heading">3. Альтернативные методы лечения и последствия отказа</div>
  <p class="a4-p">
    3.1. Мне разъяснены альтернативные методы лечения: ${escapeHtml(data.alternativesText || "консервативное динамическое наблюдение, альтернативные виды терапевтического пломбирования, ортопедическое протезирование коронками или вкладками, хирургическое удаление с последующей дентальной имплантацией")}.
  </p>
  <p class="a4-p">
    3.2. Мне разъяснены возможные последствия отказа от предлагаемого медицинского вмешательства: прогрессирование кариозного процесса, переход воспаления на пульпу зуба и периодонт, образование гранулем и кист, развитие одонтогенного периостита, флегмоны или остеомиелита челюсти, потеря зуба, атрофия костной ткани и нарушение функции височно-нижнечелюстного сустава.
  </p>

  ${renderRunningFooterHtml(docLabel, 1, 2)}
</div>

<!-- ════════ ЛИСТ 2 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderRunningHeaderHtml(docLabel, 2)}

  <div class="a4-section-heading">4. Возможные осложнения и сопутствующие реакции при стоматологическом лечении</div>
  <p class="a4-p">
    4.1. <strong>Местная анестезия:</strong> Я предупрежден(а) о возможности развития аллергических реакций, кратковременного учащения пульса, появления гематомы, отека или временной парестезии (онемения губы, щеки или языка) в зоне инъекции.
  </p>
  <p class="a4-p">
    4.2. <strong>Терапевтическое и эндодонтическое лечение:</strong> Возможны временные постпломбировочные боли и дискомфорт при накусывании в течение нескольких суток после лечения. Ввиду сложной анатомии, искривления или облитерации корневых каналов возможна невозможность их полной механической проходимости, поломка микроинструмента в канале или перфорация корня, что может потребовать хирургического вмешательства.
  </p>
  <p class="a4-p">
    4.3. <strong>Хирургия и имплантация:</strong> Возможны послеоперационный коллатеральный отек мягких тканей лица, луночковые боли, альвеолит, гематома, расхождение швов. При дентальной имплантации существует биологический риск дезинтеграции (отторжения) имплантата.
  </p>
  ${data.possibleComplicationsText ? `<p class="a4-p"><em>Индивидуальные клинические риски:</em> ${escapeHtml(data.possibleComplicationsText)}</p>` : ""}

  <div class="a4-section-heading">5. Право на отказ от медицинского вмешательства</div>
  <p class="a4-p">
    5.1. Мне разъяснено мое право отказаться от одного или нескольких видов медицинских вмешательств или потребовать их прекращения в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации». Мне разъяснены возможные клинические последствия такого отказа.
  </p>

  <div class="a4-section-heading">6. Подтверждение добровольности и полноты разъяснений врача</div>
  <p class="a4-p">
    6.1. Я подтверждаю, что текст настоящего Информированного добровольного согласия прочитан мною лично (или оглашен лечащим врачом вслух). Все термины и медицинские аспекты разъяснены на понятном мне русском языке.
  </p>
  <p class="a4-p">
    6.2. Все имевшиеся у меня вопросы о характере, рисках, стоимости и прогнозе вмешательства были заданы лечащему врачу, и на них были даны исчерпывающие и удовлетворяющие меня ответы.
  </p>
  <p class="a4-p">
    6.3. Я даю добровольное согласие на медицинское вмешательство и обязуюсь строго выполнять все назначения и рекомендации врача.
  </p>

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ВРАЧ, ПРОВЕДШИЙ БЕСЕДУ:</strong><br><br>
      ${escapeHtml(data.doctorSpecialty || "Врач-стоматолог")}:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || formatSignatoryString(null))} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong><br><br>
      Согласие дано добровольно:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(cust.fullName)} /</div>
    </div>
  </div>

  ${renderRunningFooterHtml(docLabel, 2, 2)}
</div>

</body>
</html>`;
}

/**
 * 3. СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ (ФЕДЕРАЛЬНЫЙ ЗАКОН № 152-ФЗ)
 * Полноценный 1 лист А4 по ГОСТ Р 7.0.97-2016.
 */
export function generateA4PersonalDataConsentHtml(data: A4DocumentPersonalDataConsentData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const cust = data.customer && data.customer.isDifferentFromPatient ? data.customer : pt;
	const city = cl.city || "г. Москва";
	const docLabel = `Согласие на обработку ПДн (152-ФЗ) · ${pt.fullName}`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Согласие на обработку персональных данных — ${escapeHtml(pt.fullName)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>

<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ<br>И СПЕЦИАЛЬНЫХ КАТЕГОРИЙ ДАННЫХ О СОСТОЯНИИ ЗДОРОВЬЯ</div>
  <div class="a4-doc-subtitle">в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных»<br>и Постановлением Правительства РФ от 09.02.2022 № 140 (ЕГИСЗ)</div>

  <div class="a4-meta-row">
    <div>${escapeHtml(city)}</div>
    <div>«${escapeHtml(data.consentDate)}» г.</div>
  </div>

  <p class="a4-p">
    Я, гражданин(ка) <strong>${escapeHtml(cust.fullName)}</strong>, дата рождения: ${escapeHtml(cust.birthDate || formatDateString(null))}, паспорт: ${escapeHtml(formatPassportString(cust))}, адрес регистрации: ${escapeHtml(cust.registrationAddress || cust.address || formatAddressString(null))}, телефон: ${escapeHtml(cust.phone || formatPhoneString(null))}, СНИЛС: ${escapeHtml(cust.snils || formatSnilsString(null))}, полис ОМС: ${escapeHtml(cust.omsPolis || formatPolicyString(null))}, свободно, своей волей и в своем интересе даю согласие Оператору — <strong>${escapeHtml(cl.legalName || cl.name)}</strong> (ОГРН: ${escapeHtml(cl.ogrn || "____________")}, ИНН: ${escapeHtml(cl.inn || "____________")}, адрес: ${escapeHtml(cl.address || formatAddressString(null))}) на обработку моих персональных данных.
  </p>

  <div class="a4-section-heading">1. Перечень обрабатываемых персональных данных</div>
  <p class="a4-p">
    1.1. <strong>Общие данные:</strong> Фамилия, имя, отчество, дата и место рождения, пол, данные документа, удостоверяющего личность, адрес регистрации и фактического проживания, контактный телефон, email, номер СНИЛС, номер полиса ОМС/ДМС.
  </p>
  <p class="a4-p">
    1.2. <strong>Специальные категории данных (ст. 10 152-ФЗ):</strong> Сведения о состоянии здоровья, анамнезе заболеваний, соматическом статусе, аллергологических реакциях, стоматологическом статусе (зубная формула), диагнозах МКБ-10, результатах осмотра и рентгенологических исследований (прицельные снимки, визиограммы, ОПТГ, КЛКТ, фотопротоколы), протоколах лечения и медицинских назначениях.
  </p>

  <div class="a4-section-heading">2. Цели обработки персональных данных</div>
  <p class="a4-p">
    2.1. Организация и оказание первичной медико-санитарной и специализированной стоматологической помощи; оформление и ведение амбулаторной медицинской карты стоматологического пациента (Приказ МЗ РФ № 834н).
  </p>
  <p class="a4-p">
    2.2. Исполнение обязанностей, возложенных законодательством РФ в сфере охраны здоровья граждан, включая передачу сведений в <strong>Единую государственную информационную систему в сфере здравоохранения (ЕГИСЗ / РЭМД)</strong> в соответствии со ст. 91.1 Федерального закона № 323-ФЗ и Постановлением Правительства РФ № 140.
  </p>
  <p class="a4-p">
    2.3. Проведение взаимных финансовых расчетов, выдача кассовых чеков по 54-ФЗ, справок об оплате медицинских услуг для ФНС (КНД 1151156), информирование о времени приемов и профилактических осмотрах.
  </p>

  <div class="a4-section-heading">3. Способы обработки и конфиденциальность</div>
  <p class="a4-p">
    3.1. Обработка включает: сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (предоставление уполномоченным органам в случаях, установленных законом РФ), обезличивание, блокирование, удаление, уничтожение с использованием средств автоматизации (МИС/CRM) и без их использования.
  </p>
  <p class="a4-p">
    3.2. Оператор обеспечивает соблюдение врачебной тайны (ст. 13 323-ФЗ) и принимает необходимые организационные и технические меры для защиты персональных данных в соответствии с требованиями ст. 19 152-ФЗ.
  </p>

  <div class="a4-section-heading">4. Срок действия согласия и порядок его отзыва</div>
  <p class="a4-p">
    4.1. Настоящее согласие действует с момента подписания в течение всего срока оказания услуг и нормативного срока архивного хранения медицинской документации — <strong>25 лет</strong> в соответствии с правилами Минздрава России.
  </p>
  <p class="a4-p">
    4.2. Согласие может быть отозвано путем подачи письменного заявления Оператору. При отзыве согласия Оператор вправе продолжить обработку персональных данных на основаниях, предусмотренных п. 2-11 ч. 1 ст. 6 и ч. 2 ст. 10 152-ФЗ (в целях защиты жизни, здоровья, исполнения договора и установленных законом обязанностей).
  </p>

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ОПЕРАТОР ПЕРСОНАЛЬНЫХ ДАННЫХ:</strong><br>
      ${escapeHtml(cl.legalName || cl.name)}<br>
      Адрес: ${escapeHtml(cl.actualAddress || cl.address || formatAddressString(null))}<br>
      ИНН: ${escapeHtml(cl.inn || "____________")}, ОГРН: ${escapeHtml(cl.ogrn || "____________")}<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ Уполномоченное лицо Оператора / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>СУБЪЕКТ ПЕРСОНАЛЬНЫХ ДАННЫХ:</strong><br>
      <strong>${escapeHtml(cust.fullName)}</strong><br>
      Паспорт: ${escapeHtml(formatPassportString(cust))}<br>
      Подпись субъекта (Пациента):<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(cust.fullName)} /</div>
    </div>
  </div>

  ${renderRunningFooterHtml(docLabel, 1, 1)}
</div>

</body>
</html>`;
}

/**
 * 4. АКТ СДАЧИ-ПРИЁМКИ ВЫПОЛНЕННЫХ УСЛУГ (ПРИКАЗ МЗ РФ № 804н)
 * Чистый бланк строгой отчётности по ГОСТ Р 7.0.97-2016.
 */
export function generateA4CompletedWorksActHtml(data: A4DocumentActData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const cust = data.customer && data.customer.isDifferentFromPatient ? data.customer : pt;
	const formattedTotal = formatRubles(data.totalAmountRub);
	const inWordsTotal = formatAmountInWordsRu(data.totalAmountRub);
	const warranty = data.warrantyTermsText || "12 месяцев на пломбы и терапевтические реставрации, 24 месяца на ортопедические конструкции при соблюдении гигиены и контрольных осмотров 1 раз в 6 месяцев";
	const docLabel = `Акт сдачи-приемки № ${data.actNumber} от ${data.actDate} г.`;

	const serviceRows = (data.services || []).map((s, idx) => `
    <tr>
      <td style="text-align:center; width:25px;">${idx + 1}</td>
      <td style="width:75px; text-align:center; font-family:'PT Astra Sans', Arial, sans-serif; font-size:8pt; font-weight:bold;">${escapeHtml(s.code804n || "A16.07.002")}</td>
      <td>${escapeHtml(s.name)}</td>
      <td style="text-align:center; width:55px;">${escapeHtml(s.toothOrArea || "—")}</td>
      <td style="text-align:center; width:35px;">${s.quantity}</td>
      <td style="text-align:right; width:70px;">${formatRubles(s.unitPriceRub)}</td>
      <td style="text-align:right; width:60px;">${s.discountRub ? formatRubles(s.discountRub) : "—"}</td>
      <td style="text-align:right; width:75px; font-weight:bold;">${formatRubles(s.totalRub)}</td>
    </tr>
  `).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт сдачи-приемки выполненных работ № ${escapeHtml(data.actNumber)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>
<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ № ${escapeHtml(data.actNumber)}</div>
  <div class="a4-doc-subtitle">
    к Договору на оказание платных медицинских услуг № <strong>${escapeHtml(data.contractNumber)}</strong> от ${escapeHtml(data.contractDate)} г.<br>
    Дата составления Акта: <strong>«${escapeHtml(data.actDate)}» г.</strong>
  </div>

  <table class="a4-table" style="margin-bottom:6px;">
    <tr>
      <td style="width:25%; font-weight:bold; background:#f5f5f5;">Исполнитель:</td>
      <td style="width:75%;">${escapeHtml(cl.legalName || cl.name)} (Лицензия № ${escapeHtml(cl.licenseNumber || "б/н")})</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Заказчик / Пациент:</td>
      <td><strong>${escapeHtml(cust.fullName)}</strong>${cust.fullName !== pt.fullName ? ` (в интересах Пациента: ${escapeHtml(pt.fullName)})` : ""}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Лечащий врач:</td>
      <td><strong>${escapeHtml(data.doctorFullName || formatSignatoryString(null))}</strong> (${escapeHtml(data.doctorSpecialty || "Врач-стоматолог")})</td>
    </tr>
  </table>

  <div class="a4-section-heading">Перечень фактически оказанных медицинских услуг (Номенклатура МЗ РФ № 804н)</div>
  <table class="a4-table">
    <thead>
      <tr>
        <th>№</th>
        <th>Код услуги</th>
        <th>Наименование медицинской услуги</th>
        <th>Зуб</th>
        <th>Кол.</th>
        <th>Цена (руб.)</th>
        <th>Скидка</th>
        <th>Итого (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${serviceRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="7" style="text-align:right;">ИТОГО К ОПЛАТЕ:</td>
        <td style="text-align:right; font-size:9.5pt;">${formattedTotal}</td>
      </tr>
    </tfoot>
  </table>

  <div style="border: 0.75pt solid #000000; padding: 5px 8px; margin: 6px 0; font-size: 8.5pt; line-height: 1.35; background: #fafafa;">
    <div><strong>Всего оказано услуг на сумму:</strong> <strong>${formattedTotal} руб.</strong> (${escapeHtml(inWordsTotal)})</div>
    ${data.fiscalReceiptNumber ? `<div><strong>Фискальный чек ККТ (54-ФЗ):</strong> № ${escapeHtml(data.fiscalReceiptNumber)}</div>` : ""}
    <div style="margin-top: 2px;"><strong>Гарантийные обязательства:</strong> ${escapeHtml(warranty)}</div>
    <div style="margin-top: 3px; font-weight: bold;">
      Юридическая формула сдачи-приемки:
    </div>
    <div style="text-align: justify; margin-top: 2px;">
      «Услуги оказаны в полном объеме, в установленные сроки, с надлежащим качеством в соответствии со стандартами и клиническими рекомендациями Минздрава РФ. Претензий по объему, качеству и стоимости оказанных медицинских услуг не имею.»
    </div>
    ${data.patientClaimsText ? `<div style="margin-top:2px; color:#b91c1c;"><strong>Замечания:</strong> ${escapeHtml(data.patientClaimsText)}</div>` : ""}
  </div>

  <p class="a4-p-noindent" style="font-size: 8pt; margin-top: 3px;">
    Настоящий Акт составлен в 2-х подлинных экземплярах, имеющих одинаковую юридическую силу, по одному экземпляру для каждой из Сторон.
  </p>

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>УСЛУГИ СДАЛ (ИСПОЛНИТЕЛЬ):</strong><br><br>
      Врач-стоматолог:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || formatSignatoryString(null))} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК):</strong><br><br>
      Пациент / Заказчик:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(cust.fullName)} /</div>
    </div>
  </div>

  ${renderRunningFooterHtml(docLabel, 1, 1)}
</div>
</body>
</html>`;
}

/**
 * 5. ПЕЧАТНЫЙ ПЛАН ЛЕЧЕНИЯ ДЛЯ ПАЦИЕНТА С ЭТАПАМИ И БЛОКОМ СОГЛАСОВАНИЯ
 * СТРОГО 2 ЛИСТА А4 по ГОСТ Р 7.0.97-2016.
 */
export function generateA4TreatmentPlanHtml(data: A4DocumentTreatmentPlanData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const totalWithDiscFormatted = formatRubles(data.totalCostWithDiscountRub);
	const inWordsTotal = formatAmountInWordsRu(data.totalCostWithDiscountRub);
	const docLabel = `План лечения · Пациент: ${pt.fullName}`;

	// Разделение этапов между Листом 1 и Листом 2
	const totalStages = data.stages.length;
	const splitIndex = totalStages <= 1 ? 1 : Math.ceil(totalStages / 2);
	const firstHalfStages = data.stages.slice(0, splitIndex);
	const secondHalfStages = data.stages.slice(splitIndex);

	const renderStageHtml = (st: A4TreatmentPlanStageItem) => {
		const itemsRows = st.plannedServices.map((srv, sIdx) => `
      <tr>
        <td style="text-align:center; width:25px;">${st.stageNumber}.${sIdx + 1}</td>
        <td>${escapeHtml(srv.name)}</td>
        <td style="text-align:center; width:65px;">${escapeHtml(srv.toothOrArea || "—")}</td>
        <td style="text-align:center; width:85px;">${escapeHtml(srv.timing || st.stageTiming || "по плану")}</td>
        <td style="text-align:right; width:85px; font-weight:bold;">${formatRubles(srv.priceRub)}</td>
      </tr>
    `).join("");

		return `
      <div style="margin-top: 6px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-weight:bold; font-size:8.5pt; background:#eeeeee; border:0.75pt solid #000000; padding:2.5px 5px; border-bottom:none;">
          ${escapeHtml(st.stageName)} ${st.stageTiming ? `(Ориентировочный срок: ${escapeHtml(st.stageTiming)})` : ""}
        </div>
        <table class="a4-table" style="margin-top:0;">
          <thead>
            <tr>
              <th>№</th>
              <th>Наименование медицинской процедуры</th>
              <th>Зуб / область</th>
              <th>Сроки</th>
              <th>Стоимость (руб.)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4" style="text-align:right;">Итого по этапу:</td>
              <td style="text-align:right;">${formatRubles(st.stageTotalRub)}</td>
            </tr>
          </tfoot>
        </table>
        ${st.clinicalNotes ? `<div style="font-size:7.5pt; font-style:italic; margin-top:-2px; margin-bottom:4px;">Клинические примечания: ${escapeHtml(st.clinicalNotes)}</div>` : ""}
      </div>
    `;
	};

	const firstSheetStagesHtml = firstHalfStages.map(renderStageHtml).join("");
	const secondSheetStagesHtml = secondHalfStages.length > 0
		? secondHalfStages.map(renderStageHtml).join("")
		: `<div style="font-size:8.5pt; color:#444444; margin: 6px 0;">Все лечебные мероприятия и манипуляции детализированы на Листе 1 настоящего Плана.</div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Комплексный план стоматологического лечения — ${escapeHtml(pt.fullName)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>

<!-- ════════ ЛИСТ 1 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">ПЛАН КОМПЛЕКСНОГО СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ И СМЕТА</div>
  <div class="a4-doc-subtitle">Приложение к Договору на оказание платных медицинских услуг · Дата составления: «${escapeHtml(data.planDate)}» г.</div>

  <table class="a4-table" style="margin-bottom:6px;">
    <tr>
      <td style="width:25%; font-weight:bold; background:#f5f5f5;">Пациент (ФИО):</td>
      <td style="width:45%;"><strong>${escapeHtml(pt.fullName)}</strong></td>
      <td style="width:15%; font-weight:bold; background:#f5f5f5;">№ карты:</td>
      <td style="width:15%;"><strong>${escapeHtml(pt.cardNumber || "б/н")}</strong></td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Дата рождения / Тел:</td>
      <td>${escapeHtml(pt.birthDate || "—")} · Тел: ${escapeHtml(pt.phone || "—")}</td>
      <td style="font-weight:bold; background:#f5f5f5;">Лечащий врач:</td>
      <td><strong>${escapeHtml(data.doctorFullName || formatSignatoryString(null))}</strong></td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Повод обращения / Диагноз:</td>
      <td colspan="3">${escapeHtml(data.diagnosisSummary || data.clinicalReason || "Первичная консультация и комплексная санация полости рта")}</td>
    </tr>
  </table>

  <div class="a4-section-heading">1. Задачи комплексной стоматологической реабилитации</div>
  <p class="a4-p">
    Целями комплексного лечения являются: купирование болевого синдрома и очагов одонтогенной инфекции, санация кариозных поражений, восстановление анатомической целостности зубов, восстановление жевательной и речевой функций, нормализация окклюзионных взаимоотношений и профилактика заболеваний пародонта.
  </p>

  <div class="a4-section-heading">2. Этапы лечения и финансовая спецификация (Часть 1)</div>
  ${firstSheetStagesHtml}

  ${renderRunningFooterHtml(docLabel, 1, 2)}
</div>

<!-- ════════ ЛИСТ 2 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderRunningHeaderHtml(docLabel, 2)}

  <div class="a4-section-heading">2. Этапы лечения и финансовая спецификация (Продолжение)</div>
  ${secondSheetStagesHtml}

  <div style="border:0.75pt solid #000000; padding:5px 8px; margin:6px 0; background:#fcfcfc; font-size:8.5pt;">
    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:9.5pt;">
      <div>ВСЕГО ПО ПЛАНУ ЛЕЧЕНИЯ:</div>
      <div>${totalWithDiscFormatted} руб.</div>
    </div>
    ${data.discountRub ? `<div style="font-size:8pt; color:#444444;">(Сумма без скидки: ${formatRubles(data.totalCostWithoutDiscountRub)} руб., скидка: ${formatRubles(data.discountRub)} руб.)</div>` : ""}
    <div style="margin-top:2px;">Сумма прописью: <strong>${escapeHtml(inWordsTotal)}</strong></div>
  </div>

  <div class="a4-section-heading">3. Альтернативные варианты лечения и клинические риски</div>
  <p class="a4-p">
    3.1. Мне разъяснены альтернативные варианты лечения: ${escapeHtml(data.alternativesText || "сохранение зубов терапевтическими методами vs удаление с последующей имплантацией или протезированием съемными/несъемными конструкциями")}.
  </p>
  <p class="a4-p">
    3.2. Риски при отказе от комплексного плана: ${escapeHtml(data.risksAndLimitsText || "прогрессирование патологии твердых тканей, перегрузка оставшихся зубов, развитие дисфункции ВНЧС, атрофия альвеолярного отростка")}.
  </p>

  <div class="a4-section-heading">4. Блок информированного согласования плана лечения пациентом</div>
  <p class="a4-p-noindent" style="font-size:8pt; line-height:1.25; text-align:justify;">
    План лечения может быть дополнен и скорректирован по предварительному согласованию со мной в соответствии с объективными клиническими показаниями. Мне понятен план, этапность, ориентировочные сроки и предполагаемый результат лечения, возможные риски и осложнения на каждом этапе, необходимость контрольных рентгеновских снимков (визиография / КЛКТ), а также порядок оплаты. Мне были представлены альтернативные варианты лечения. Я проинформирован(а) о необходимости явки на контрольные профилактические осмотры 1 раз в 6 месяцев после завершения лечения для сохранения гарантийных обязательств клиники. Врачом даны исчерпывающие ответы на все мои вопросы.
  </p>
  ${data.approvedVariantName ? `<div style="font-weight:bold; font-size:8.5pt; margin-top:3px;">Утвержденный вариант плана: ${escapeHtml(data.approvedVariantName)}</div>` : ""}

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ПЛАН СОСТАВИЛ (ВРАЧ):</strong><br><br>
      Лечащий врач:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || formatSignatoryString(null))} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>ПЛАН СОГЛАСОВАЛ (ПАЦИЕНТ):</strong><br><br>
      Пациент (Заказчик):<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(pt.fullName)} / (с планом, сроками и стоимостью согласен)</div>
    </div>
  </div>

  ${renderRunningFooterHtml(docLabel, 2, 2)}
</div>

</body>
</html>`;
}

/**
 * 6. ПЕЧАТНАЯ ФОРМА МЕДИЦИНСКОЙ КАРТЫ / ДНЕВНИКА ПРИЁМА
 * СТРОГО 2 ЛИСТА А4 по ГОСТ Р 7.0.97-2016 (СТРОГО БЕЗ «043у» В ЗАГОЛОВКАХ!)
 */
export function generateA4MedicalCardDiaryHtml(data: A4DocumentMedicalCardData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const docLabel = `Медицинская карта / Дневник приёма · Пациент: ${pt.fullName}`;

	// Строгая текстовая таблица зубной формулы FDI (11..48)
	const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
	const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
	const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
	const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

	const getToothCode = (n: number): string => {
		if (data.teethFormulaMap && data.teethFormulaMap[n]) {
			return data.teethFormulaMap[n]?.state || "0";
		}
		return "—";
	};

	const renderToothRowCells = (teeth: number[]) =>
		teeth.map((t) => `<td style="text-align:center; width:22px; font-weight:bold; font-size:7.5pt; background:#f7f7f7;">${t}</td>`).join("");

	const renderToothStateCells = (teeth: number[]) =>
		teeth.map((t) => {
			const code = getToothCode(t);
			return `<td style="text-align:center; width:22px; font-size:7.5pt;">${code}</td>`;
		}).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Медицинская карта стоматологического пациента № ${escapeHtml(data.cardNumber)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>

<!-- ════════ ЛИСТ 1 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА / ДНЕВНИК ПРИЁМА</div>
  <div class="a4-doc-subtitle">Амбулаторная медицинская карта стоматологического больного № <strong>${escapeHtml(data.cardNumber)}</strong></div>

  <div class="a4-section-heading">1. Паспортная часть и соматический статус</div>
  <table class="a4-table">
    <tr>
      <td style="width:25%; font-weight:bold; background:#f5f5f5;">Пациент (ФИО):</td>
      <td style="width:45%;"><strong>${escapeHtml(pt.fullName)}</strong></td>
      <td style="width:15%; font-weight:bold; background:#f5f5f5;">Дата рождения:</td>
      <td style="width:15%;">${escapeHtml(pt.birthDate || formatDateString(null))}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Пол / Контакты:</td>
      <td>${pt.gender === "female" ? "Женский" : pt.gender === "male" ? "Мужской" : "—"} · Тел: ${escapeHtml(pt.phone || formatPhoneString(null))}</td>
      <td style="font-weight:bold; background:#f5f5f5;">СНИЛС / ОМС:</td>
      <td>${escapeHtml(pt.snils || pt.omsPolis || "—")}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Паспортные данные:</td>
      <td colspan="3">${escapeHtml(formatPassportString(pt))}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Адрес проживания:</td>
      <td colspan="3">${escapeHtml(pt.address || pt.registrationAddress || formatAddressString(null))}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Аллергологический анамнез:</td>
      <td colspan="3"><strong>${escapeHtml(data.allergyStatus || "Не отягощен (со слов пациента)")}</strong></td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Соматический статус:</td>
      <td colspan="3">${escapeHtml(data.somaticStatus || "Соматически здоров, сопутствующих заболеваний нет")}</td>
    </tr>
  </table>

  <div class="a4-section-heading">2. Протокол клинического осмотра и статус полости рта</div>
  <div style="font-size:9pt; margin:4px 0;"><strong>Жалобы:</strong> ${escapeHtml(data.complaints || "Жалоб на момент осмотра активно не предъявляет.")}</div>
  <div style="font-size:9pt; margin:4px 0;"><strong>Анамнез заболевания (Anamnesis morbi):</strong> ${escapeHtml(data.anamnesisMorbi || "Обратился для планового осмотра и санации полости рта.")}</div>
  <div style="font-size:9pt; margin:4px 0;"><strong>Объективный осмотр (Status localis):</strong> ${escapeHtml(data.statusLocalis || "Слизистая оболочка полости рта физиологической окраски, влажная. Регионарные лимфоузлы не увеличены, безболезненны. Прикус физиологический.")}</div>

  <div class="a4-section-heading">3. Зубная формула (FDI World Dental Federation)</div>
  <table class="a4-table" style="font-size:7.5pt; text-align:center; margin: 4px 0;">
    <tr>
      <td colspan="8" style="background:#eeeeee; font-weight:bold; text-align:center;">Верхняя челюсть справа</td>
      <td colspan="8" style="background:#eeeeee; font-weight:bold; text-align:center;">Верхняя челюсть слева</td>
    </tr>
    <tr>
      ${renderToothRowCells(upperRight)}
      ${renderToothRowCells(upperLeft)}
    </tr>
    <tr>
      ${renderToothStateCells(upperRight)}
      ${renderToothStateCells(upperLeft)}
    </tr>
    <tr>
      <td colspan="16" style="height:3px; padding:0; background:#000000;"></td>
    </tr>
    <tr>
      ${renderToothStateCells(lowerRight)}
      ${renderToothStateCells(lowerLeft)}
    </tr>
    <tr>
      ${renderToothRowCells(lowerRight)}
      ${renderToothRowCells(lowerLeft)}
    </tr>
    <tr>
      <td colspan="8" style="background:#eeeeee; font-weight:bold; text-align:center;">Нижняя челюсть справа</td>
      <td colspan="8" style="background:#eeeeee; font-weight:bold; text-align:center;">Нижняя челюсть слева</td>
    </tr>
  </table>
  <div style="font-size:7.5pt; color:#444444; margin-bottom:4px;">
    Обозначения: С — кариес, P — пульпит, Pt — периодонтит, П — пломба, К — коронка, И — имплантат, 0 — отсутствует, R — корень, — — здоровый.
    ${data.teethFormulaSummary ? `<br><strong>Расшифровка формулы:</strong> ${escapeHtml(data.teethFormulaSummary)}` : ""}
  </div>

  ${renderRunningFooterHtml(docLabel, 1, 2)}
</div>

<!-- ════════ ЛИСТ 2 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderRunningHeaderHtml(docLabel, 2)}

  <div class="a4-section-heading">4. Клинический диагноз (МКБ-10)</div>
  <div style="font-size:9.5pt; margin:5px 0;">
    <strong>Код МКБ-10:</strong> <span style="font-family:'PT Astra Sans', Arial, sans-serif; font-weight:bold;">${escapeHtml(data.diagnosisIcd10)}</span> — ${escapeHtml(data.diagnosisDescription)}
    ${data.diagnosisTooth ? ` (Область/Зуб FDI: № ${escapeHtml(data.diagnosisTooth)})` : ""}
  </div>

  <div class="a4-section-heading">5. Дневник приёма и протокол проведённого лечения</div>
  <div style="font-size:9pt; line-height:1.35; text-align:justify; margin:5px 0;">
    <strong>Дата приёма:</strong> «${escapeHtml(data.visitDate)}» г.<br>
    <strong>Проведённое лечение и манипуляции:</strong><br>
    ${escapeHtml(data.treatmentProtocol || "Проведена консультация, диагностический осмотр, составлен план лечения.")}
  </div>

  <div class="a4-section-heading">6. Примененные препараты и стоматологические материалы</div>
  <div style="font-size:8.5pt; margin:4px 0;">
    ${escapeHtml(data.materialsUsed || "Стандартный терапевтический набор, антисептическая обработка полости рта.")}
  </div>

  <div class="a4-section-heading">7. Рекомендации, назначения и профилактический режим</div>
  <div style="font-size:9pt; line-height:1.3; margin:4px 0;">
    ${escapeHtml(data.recommendations || "Соблюдать гигиену полости рта, явка на контрольный осмотр через 6 месяцев.")}
  </div>
  ${data.nextVisitDate ? `<div style="font-size:9pt; margin:5px 0;"><strong>Следующий визит назначен на:</strong> «${escapeHtml(data.nextVisitDate)}» г.</div>` : ""}

  <div class="a4-sign-grid" style="margin-top:16px;">
    <div class="a4-sign-col">
      <strong>ЛЕЧАЩИЙ ВРАЧ:</strong><br><br>
      ${escapeHtml(data.doctorSpecialty || "Врач-стоматолог")}:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || formatSignatoryString(null))} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>ПАЦИЕНТ:</strong><br><br>
      С диагнозом, планом лечения и рекомендациями ознакомлен:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(pt.fullName)} /</div>
    </div>
  </div>

  ${renderRunningFooterHtml(docLabel, 2, 2)}
</div>
</body>
</html>`;
}
