/**
 * professionalA4DocumentEngine.ts
 *
 * Промышленный печатный движок официального медицинского и финансового документооборота A4.
 * Разработан на основе канонических шаблонов законодательства РФ:
 * 1. Договор на оказание платных медицинских услуг (Постановление Правительства РФ от 11.05.2023 № 736, ст. 84 323-ФЗ, 152-ФЗ).
 * 2. Акт сдачи-приёмки выполненных работ и финансовая смета (Номенклатура медицинских услуг Приказ МЗ РФ № 804н).
 * 3. Печатный план комплексного лечения для пациента (этапы, процедуры, сроки, стоимость, блок согласования).
 * 4. Медицинская карта стоматологического пациента / Дневник приёма (без советских ярлыков «043у» в заголовках!).
 *
 * Стандарты верстки:
 * - Формат A4 (210 × 297 мм), поля 15-20 мм, без цветных рамок, без веб-градиентов.
 * - Классическая типографика: "PT Astra Serif", "Times New Roman", Times, serif (10-12pt).
 * - Таблицы с тонкими 1px линиями, 100% контраст черным по белому.
 * - Подписи Сторон и места для круглых печатей М.П.
 * - Суммы прописью на русском языке по ГОСТ.
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
	readonly stageName: string; // "1 этап: Терапевтическая санация и купирование боли"
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
	if (p.passportRaw) return p.passportRaw;
	return "серия ______ № __________, выдан ____________________________________________________, код: _________";
}

/**
 * Базовые CSS-стили для печатного листа A4 по ГОСТ Р 7.0.97-2016.
 * Полностью черно-белые, без цветных веб-рамок, без градиентов.
 */
export const A4_PRINT_BASE_STYLES = `
<style>
  @page {
    size: A4 portrait;
    margin: 15mm 12mm 15mm 20mm;
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
    font-family: "PT Astra Serif", "Times New Roman", Times, serif;
    font-size: 10pt;
    line-height: 1.3;
  }
  .a4-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 15mm 15mm 15mm 20mm;
    background: #ffffff;
    color: #000000;
    box-sizing: border-box;
    position: relative;
    page-break-after: always;
    break-after: page;
  }
  .a4-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  @media screen {
    body {
      background: #e2e8f0 !important;
      padding: 20px 0;
    }
    .a4-page {
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.08);
      margin-bottom: 24px;
    }
  }
  @media print {
    body {
      background: #ffffff !important;
      padding: 0 !important;
    }
    .a4-page {
      width: 100% !important;
      min-height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
    }
    .no-print {
      display: none !important;
    }
  }

  /* ── Типографика официальных документов РФ ── */
  .a4-header {
    border-bottom: 1.5pt solid #000000;
    padding-bottom: 6px;
    margin-bottom: 10px;
  }
  .a4-clinic-name {
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .a4-clinic-requisites {
    font-size: 8pt;
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
    margin: 10px 0 3px 0;
  }
  .a4-doc-subtitle {
    text-align: center;
    font-size: 8.5pt;
    color: #333333;
    margin-bottom: 10px;
  }
  .a4-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 9.5pt;
    font-weight: bold;
    margin-bottom: 8px;
    border-bottom: 0.5pt solid #999999;
    padding-bottom: 3px;
  }
  .a4-p {
    font-size: 9pt;
    line-height: 1.35;
    text-align: justify;
    margin: 4px 0;
    text-indent: 10mm;
  }
  .a4-p-noindent {
    font-size: 9pt;
    line-height: 1.35;
    text-align: justify;
    margin: 4px 0;
  }
  .a4-section-heading {
    font-size: 9.5pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 10px;
    margin-bottom: 4px;
    border-bottom: 0.75pt solid #000000;
    padding-bottom: 2px;
  }
  
  /* ── Таблицы с тонкими 1px линиями ── */
  table.a4-table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0;
    font-size: 8.5pt;
    line-height: 1.2;
  }
  table.a4-table th, table.a4-table td {
    border: 0.75pt solid #000000;
    padding: 3.5pt 5pt;
    vertical-align: top;
  }
  table.a4-table th {
    background: #f0f0f0;
    font-weight: bold;
    text-align: center;
    font-size: 8pt;
  }
  table.a4-table tr.total-row td {
    font-weight: bold;
    background: #f8f8f8;
  }

  /* ── Блоки подписей и реквизитов ── */
  .a4-sign-grid {
    display: table;
    width: 100%;
    margin-top: 14px;
    padding-top: 8px;
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
    margin-top: 24px;
    margin-bottom: 3px;
    min-height: 14px;
  }
  .a4-sign-hint {
    font-size: 7pt;
    text-align: center;
    color: #444444;
  }
  .stamp-box {
    display: inline-block;
    width: 44px;
    height: 44px;
    border: 0.75pt dashed #444444;
    text-align: center;
    line-height: 44px;
    font-size: 8pt;
    color: #666666;
    margin-left: 8px;
    vertical-align: middle;
  }
</style>
`;

/**
 * 1. КАНОНИЧЕСКИЙ ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ (ПП РФ № 736)
 */
export function generateA4PaidContractHtml(data: A4DocumentContractData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const cust = data.customer && data.customer.isDifferentFromPatient ? data.customer : pt;
	const isCustomerDifferent = data.customer && data.customer.isDifferentFromPatient;

	const city = cl.city || "г. Москва";
	const formattedCost = formatRubles(data.estimatedTotalRub);
	const inWordsCost = formatAmountInWordsRu(data.estimatedTotalRub);

	const servicesRows = (data.services && data.services.length > 0)
		? data.services.map((s, idx) => `
        <tr>
          <td style="text-align:center; width:25px;">${idx + 1}</td>
          <td style="width:70px; text-align:center;">${escapeHtml(s.code804n || "—")}</td>
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
<div class="a4-page">
  <div class="a4-header">
    <div class="a4-clinic-name">${escapeHtml(cl.legalName || cl.name)}</div>
    <div class="a4-clinic-requisites">
      Адрес: ${escapeHtml(cl.actualAddress || cl.address)} · Тел: ${escapeHtml(cl.phone)} · ИНН: ${escapeHtml(cl.inn)} · ОГРН: ${escapeHtml(cl.ogrn)}<br>
      Лицензия на медицинскую деятельность: № ${escapeHtml(cl.licenseNumber)}${cl.licenseDate ? ` от ${escapeHtml(cl.licenseDate)} г.` : ""}${cl.licenseIssuer ? ` (${escapeHtml(cl.licenseIssuer)})` : ""}
    </div>
  </div>

  <div class="a4-doc-title">ДОГОВОР № ${escapeHtml(data.contractNumber)}</div>
  <div class="a4-doc-subtitle">на оказание платных медицинских стоматологических услуг<br>(в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736)</div>

  <div class="a4-meta-row">
    <div>${escapeHtml(city)}</div>
    <div>«${escapeHtml(data.contractDate)}» г.</div>
  </div>

  <p class="a4-p">
    <strong>${escapeHtml(cl.legalName || cl.name)}</strong>${cl.shortName ? ` (${escapeHtml(cl.shortName)})` : ""}, именуемое в дальнейшем <strong>«Исполнитель»</strong>, в лице ${escapeHtml(cl.directorTitle || "Руководителя")} ${escapeHtml(cl.directorFullName || "уполномоченного лица")}, действующего на основании Устава и лицензии на медицинскую деятельность № ${escapeHtml(cl.licenseNumber)}, с одной стороны, и гражданин(ка) <strong>${escapeHtml(cust.fullName)}</strong>, ${
		isCustomerDifferent
			? `именуемый(ая) в дальнейшем «Заказчик», действующий(ая) в интересах Пациента <strong>${escapeHtml(pt.fullName)}</strong>`
			: `именуемый(ая) в дальнейшем «Пациент» (Заказчик)`
	}, с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:
  </p>

  <div class="a4-section-heading">1. Предмет договора и уведомление о государственных гарантиях</div>
  <p class="a4-p">
    1.1. Исполнитель обязуется оказать Пациенту платные стоматологические медицинские услуги надлежащего качества в соответствии с клиническими рекомендациями и стандартами медицинской помощи РФ, а Заказчик обязуется принять и оплатить оказанные услуги в соответствии со сметой и условиями настоящего Договора.
  </p>
  <p class="a4-p">
    1.2. <strong>Уведомление о программе госгарантий:</strong> До заключения настоящего Договора Исполнитель в письменной форме уведомил Пациента (Заказчика) о возможности получения медицинской помощи по программе государственных гарантий бесплатного оказания гражданам медицинской помощи и территориальной программе (по полису ОМС) в государственных и муниципальных медицинских организациях. Заказчик подтверждает добровольное согласие на получение платных услуг.
  </p>
  <p class="a4-p">
    1.3. Основание обращения: <u>${escapeHtml(data.clinicalReason || "Первичная консультация и осмотр врача-стоматолога")}</u>. Медкарта № <strong>${escapeHtml(pt.cardNumber || "б/н")}</strong>.
  </p>

  <div class="a4-section-heading">2. Перечень и предварительная стоимость услуг</div>
  <table class="a4-table">
    <thead>
      <tr>
        <th>№</th>
        <th>Код 804н</th>
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
    <strong>Ориентировочная стоимость услуг:</strong> ${formattedCost} руб. (${escapeHtml(inWordsCost)}). Оплата производится в порядке наличного/безналичного расчета с выдачей кассового фискального чека по 54-ФЗ.
  </p>

  <div class="a4-section-heading">3. Права и обязанности сторон, гарантии и конфиденциальность</div>
  <p class="a4-p">
    3.1. Исполнитель обязан: оказать услуги в соответствии с порядками оказания медицинской помощи, оформить информированное добровольное согласие (ИДС, Приказ МЗ РФ № 1051н) до начала каждого медицинского вмешательства, обеспечить соблюдение врачебной тайны и конфиденциальности персональных данных в соответствии с Федеральным законом № 152-ФЗ.
  </p>
  <p class="a4-p">
    3.2. Пациент обязан: строго соблюдать предписанный лечащим врачом режим лечения, гигиенические рекомендации, график контрольных профилактических осмотров (не реже 1 раза в 6 месяцев). Несоблюдение указаний врача освобождает Исполнителя от гарантийных обязательств.
  </p>
  <p class="a4-p">
    3.3. <strong>Запрет на навязывание услуг:</strong> Любые дополнительные услуги, не вошедшие в первоначальную смету, оказываются Исполнителем исключительно с предварительного письменного согласия Заказчика (Пациента) путем подписания дополнительного соглашения или скорректированного плана лечения.
  </p>

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ИСПОЛНИТЕЛЬ:</strong><br>
      <strong>${escapeHtml(cl.legalName || cl.name)}</strong><br>
      Юр. адрес: ${escapeHtml(cl.address)}<br>
      Факт. адрес: ${escapeHtml(cl.actualAddress || cl.address)}<br>
      ОГРН: ${escapeHtml(cl.ogrn)}, ИНН: ${escapeHtml(cl.inn)}${cl.kpp ? `, КПП: ${escapeHtml(cl.kpp)}` : ""}<br>
      Р/с: ${escapeHtml(cl.checkingAccount || "___________________________")} в ${escapeHtml(cl.bankName || "ПАО Сбербанк")}<br>
      БИК: ${escapeHtml(cl.bik || "_________")}, К/с: ${escapeHtml(cl.correspondentAccount || "___________________________")}<br>
      Тел: ${escapeHtml(cl.phone)}<br><br>
      ${escapeHtml(cl.directorTitle || "Руководитель / Врач")}:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || cl.directorFullName || "________________________")} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>ЗАКАЗЧИК (ПАЦИЕНТ):</strong><br>
      <strong>${escapeHtml(cust.fullName)}</strong><br>
      Дата рождения: ${escapeHtml(cust.birthDate || "«___» _________ _____ г.")}<br>
      Паспорт: ${escapeHtml(formatPassportString(cust))}<br>
      Адрес регистрации: ${escapeHtml(cust.registrationAddress || cust.address || "________________________________________________________")}<br>
      Телефон: ${escapeHtml(cust.phone || "____________________")}<br>
      ${cust.snils ? `СНИЛС: ${escapeHtml(cust.snils)}<br>` : ""}
      <br>
      Подпись Заказчика (Пациента):<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(cust.fullName)} /</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * 2. АКТ ВЫПОЛНЕННЫХ РАБОТ И ФИНАНСОВАЯ СМЕТА (ПРИКАЗ МЗ РФ № 804н)
 */
export function generateA4CompletedWorksActHtml(data: A4DocumentActData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const cust = data.customer && data.customer.isDifferentFromPatient ? data.customer : pt;

	const formattedTotal = formatRubles(data.totalAmountRub);
	const inWordsTotal = formatAmountInWordsRu(data.totalAmountRub);
	const warranty = data.warrantyTermsText || "12 месяцев на пломбы и терапевтические реставрации, 24 месяца на ортопедические конструкции при соблюдении гигиены и контрольных осмотров 1 раз в 6 месяцев";

	const serviceRows = (data.services || []).map((s, idx) => `
    <tr>
      <td style="text-align:center; width:25px;">${idx + 1}</td>
      <td style="width:75px; text-align:center; font-family:'Courier New', monospace; font-size:8pt; font-weight:bold;">${escapeHtml(s.code804n || "A16.07.002")}</td>
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
  <div class="a4-header">
    <div class="a4-clinic-name">${escapeHtml(cl.legalName || cl.name)}</div>
    <div class="a4-clinic-requisites">
      Адрес: ${escapeHtml(cl.actualAddress || cl.address)} · Тел: ${escapeHtml(cl.phone)} · ИНН: ${escapeHtml(cl.inn)} · ОГРН: ${escapeHtml(cl.ogrn)}<br>
      Лицензия на медицинскую деятельность: № ${escapeHtml(cl.licenseNumber)}${cl.licenseDate ? ` от ${escapeHtml(cl.licenseDate)} г.` : ""}
    </div>
  </div>

  <div class="a4-doc-title">АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ № ${escapeHtml(data.actNumber)}</div>
  <div class="a4-doc-subtitle">
    к Договору на оказание платных медицинских услуг № <strong>${escapeHtml(data.contractNumber)}</strong> от ${escapeHtml(data.contractDate)} г.<br>
    Дата составления Акта: <strong>«${escapeHtml(data.actDate)}» г.</strong>
  </div>

  <table class="a4-table" style="margin-bottom:8px;">
    <tr>
      <td style="width:25%; font-weight:bold; background:#f5f5f5;">Исполнитель:</td>
      <td style="width:75%;">${escapeHtml(cl.legalName || cl.name)} (Лицензия № ${escapeHtml(cl.licenseNumber)})</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Заказчик / Пациент:</td>
      <td><strong>${escapeHtml(cust.fullName)}</strong>${cust.fullName !== pt.fullName ? ` (в интересах Пациента: ${escapeHtml(pt.fullName)})` : ""}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Лечащий врач:</td>
      <td><strong>${escapeHtml(data.doctorFullName)}</strong> (${escapeHtml(data.doctorSpecialty || "Врач-стоматолог")})</td>
    </tr>
  </table>

  <div class="a4-section-heading">Перечень фактически оказанных медицинских услуг (Номенклатура МЗ РФ № 804н)</div>
  <table class="a4-table">
    <thead>
      <tr>
        <th>№</th>
        <th>Код 804н</th>
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

  <div style="border: 0.75pt solid #000000; padding: 6px 8px; margin: 8px 0; font-size: 8.5pt; line-height: 1.35; background: #fafafa;">
    <div><strong>Всего оказано услуг на сумму:</strong> <strong>${formattedTotal} руб.</strong> (${escapeHtml(inWordsTotal)})</div>
    ${data.fiscalReceiptNumber ? `<div><strong>Фискальный чек ККТ (54-ФЗ):</strong> № ${escapeHtml(data.fiscalReceiptNumber)}</div>` : ""}
    <div style="margin-top: 3px;"><strong>Гарантийные обязательства:</strong> ${escapeHtml(warranty)}</div>
    <div style="margin-top: 4px; font-weight: bold;">
      Юридическая формула сдачи-приемки:
    </div>
    <div style="text-align: justify; margin-top: 2px;">
      «Услуги оказаны в полном объеме, в установленные сроки, с надлежащим качеством в соответствии со стандартами и клиническими рекомендациями Минздрава РФ. Претензий по объему, качеству и стоимости оказанных медицинских услуг не имею.»
    </div>
    ${data.patientClaimsText ? `<div style="margin-top:3px; color:#b91c1c;"><strong>Замечания:</strong> ${escapeHtml(data.patientClaimsText)}</div>` : ""}
  </div>

  <p class="a4-p-noindent" style="font-size: 8pt; margin-top: 4px;">
    Настоящий Акт составлен в 2-х подлинных экземплярах, имеющих одинаковую юридическую силу, по одному экземпляру для каждой из Сторон.
  </p>

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>УСЛУГИ СДАЛ (ИСПОЛНИТЕЛЬ):</strong><br><br>
      Врач-стоматолог:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName)} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК):</strong><br><br>
      Пациент / Заказчик:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(cust.fullName)} /</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * 3. ПЕЧАТНЫЙ ПЛАН ЛЕЧЕНИЯ ДЛЯ ПАЦИЕНТА С ЭТАПАМИ И БЛОКОМ СОГЛАСОВАНИЯ
 */
export function generateA4TreatmentPlanHtml(data: A4DocumentTreatmentPlanData): string {
	const cl = data.clinic;
	const pt = data.patient;

	const stagesHtml = data.stages.map((st) => {
		const itemsRows = st.plannedServices.map((srv, sIdx) => `
      <tr>
        <td style="text-align:center; width:25px;">${st.stageNumber}.${sIdx + 1}</td>
        <td>${escapeHtml(srv.name)}</td>
        <td style="text-align:center; width:65px;">${escapeHtml(srv.toothOrArea || "—")}</td>
        <td style="text-align:center; width:90px;">${escapeHtml(srv.timing || st.stageTiming || "по плану")}</td>
        <td style="text-align:right; width:85px; font-weight:bold;">${formatRubles(srv.priceRub)}</td>
      </tr>
    `).join("");

		return `
      <div style="margin-top: 8px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-weight:bold; font-size:9pt; background:#eeeeee; border:0.75pt solid #000000; padding:3px 6px; border-bottom:none;">
          ${escapeHtml(st.stageName)} ${st.stageTiming ? `(Срок: ${escapeHtml(st.stageTiming)})` : ""}
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
        ${st.clinicalNotes ? `<div style="font-size:7.5pt; font-style:italic; margin-top:-3px; margin-bottom:5px;">Заметки: ${escapeHtml(st.clinicalNotes)}</div>` : ""}
      </div>
    `;
	}).join("");

	const totalWithDiscFormatted = formatRubles(data.totalCostWithDiscountRub);
	const inWordsTotal = formatAmountInWordsRu(data.totalCostWithDiscountRub);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Комплексный план стоматологического лечения — ${escapeHtml(pt.fullName)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>
<div class="a4-page">
  <div class="a4-header">
    <div class="a4-clinic-name">${escapeHtml(cl.legalName || cl.name)}</div>
    <div class="a4-clinic-requisites">
      Адрес: ${escapeHtml(cl.actualAddress || cl.address)} · Тел: ${escapeHtml(cl.phone)} · ИНН: ${escapeHtml(cl.inn)}<br>
      Лицензия на медицинскую деятельность: № ${escapeHtml(cl.licenseNumber)}
    </div>
  </div>

  <div class="a4-doc-title">ПЛАН КОМПЛЕКСНОГО ЛЕЧЕНИЯ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА</div>
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
      <td><strong>${escapeHtml(data.doctorFullName)}</strong></td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Повод обращения / Диагноз:</td>
      <td colspan="3">${escapeHtml(data.diagnosisSummary || data.clinicalReason || "Первичная консультация и санация полости рта")}</td>
    </tr>
  </table>

  <div class="a4-section-heading">Этапы и калькуляция лечебных мероприятий</div>
  ${stagesHtml}

  <div style="border:0.75pt solid #000000; padding:6px 8px; margin:8px 0; background:#fcfcfc; font-size:8.5pt;">
    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:9.5pt;">
      <div>ВСЕГО ПО ПЛАНУ ЛЕЧЕНИЯ:</div>
      <div>${totalWithDiscFormatted} руб.</div>
    </div>
    ${data.discountRub ? `<div style="font-size:8pt; color:#444444;">(Сумма без скидки: ${formatRubles(data.totalCostWithoutDiscountRub)} руб., скидка: ${formatRubles(data.discountRub)} руб.)</div>` : ""}
    <div style="margin-top:2px;">Сумма прописью: <strong>${escapeHtml(inWordsTotal)}</strong></div>
  </div>

  <div class="a4-section-heading">Блок согласования плана лечения пациентом</div>
  <p class="a4-p-noindent" style="font-size:8pt; line-height:1.3; text-align:justify;">
    План лечения может быть дополнен и скорректирован по предварительному согласованию с пациентом в соответствии с объективными клиническими показаниями. Мне понятен план, этапность, ориентировочные сроки и предполагаемый результат лечения, возможные риски и осложнения на каждом этапе, необходимость контрольных рентгеновских снимков (визиография / КЛКТ), а также порядок оплаты. Мне были представлены альтернативные варианты лечения. Я проинформирован(а) о необходимости явки на контрольные профилактические осмотры 1 раз в 6 месяцев после завершения лечения для сохранения гарантийных обязательств клиники. Врачом даны исчерпывающие ответы на все мои вопросы.
  </p>
  ${data.approvedVariantName ? `<div style="font-weight:bold; font-size:8.5pt; margin-top:4px;">Выбранный и утвержденный вариант плана: ${escapeHtml(data.approvedVariantName)}</div>` : ""}

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ПЛАН СОСТАВИЛ (ВРАЧ):</strong><br><br>
      Лечащий врач:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName)} /</div>
    </div>
    <div class="a4-sign-col">
      <strong>ПЛАН СОГЛАСОВАЛ (ПАЦИЕНТ):</strong><br><br>
      Пациент (Заказчик):<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(pt.fullName)} / (с планом, сроками и стоимостью согласен)</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * 4. ПЕЧАТНАЯ ФОРМА МЕДИЦИНСКОЙ КАРТЫ / ДНЕВНИКА ПРИЁМА
 * (СТРОГО БЕЗ «043у» В ЗАГОЛОВКАХ!)
 */
export function generateA4MedicalCardDiaryHtml(data: A4DocumentMedicalCardData): string {
	const cl = data.clinic;
	const pt = data.patient;

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
<div class="a4-page">
  <div class="a4-header">
    <div class="a4-clinic-name">${escapeHtml(cl.legalName || cl.name)}</div>
    <div class="a4-clinic-requisites">
      Адрес: ${escapeHtml(cl.actualAddress || cl.address)} · Тел: ${escapeHtml(cl.phone)} · ИНН: ${escapeHtml(cl.inn)}<br>
      Лицензия на осуществление медицинской деятельности: № ${escapeHtml(cl.licenseNumber)}
    </div>
  </div>

  <div class="a4-doc-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА / ДНЕВНИК ПРИЁМА</div>
  <div class="a4-doc-subtitle">Амбулаторная медицинская карта стоматологического больного № <strong>${escapeHtml(data.cardNumber)}</strong></div>

  <div class="a4-section-heading">1. Паспортная часть и соматический статус</div>
  <table class="a4-table">
    <tr>
      <td style="width:25%; font-weight:bold; background:#f5f5f5;">Пациент (ФИО):</td>
      <td style="width:45%;"><strong>${escapeHtml(pt.fullName)}</strong></td>
      <td style="width:15%; font-weight:bold; background:#f5f5f5;">Дата рождения:</td>
      <td style="width:15%;">${escapeHtml(pt.birthDate || "—")}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Пол / Контакты:</td>
      <td>${pt.gender === "female" ? "Женский" : pt.gender === "male" ? "Мужской" : "—"} · Тел: ${escapeHtml(pt.phone || "—")}</td>
      <td style="font-weight:bold; background:#f5f5f5;">СНИЛС / ОМС:</td>
      <td>${escapeHtml(pt.snils || pt.omsPolis || "—")}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Паспортные данные:</td>
      <td colspan="3">${escapeHtml(formatPassportString(pt))}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Адрес проживания:</td>
      <td colspan="3">${escapeHtml(pt.address || pt.registrationAddress || "—")}</td>
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
      <td colspan="16" style="height:4px; padding:0; background:#000000;"></td>
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
  <div style="font-size:7.5pt; color:#444444; margin-bottom:6px;">
    Обозначения: С — кариес, P — пульпит, Pt — периодонтит, П — пломба, К — коронка, И — имплантат, 0 — отсутствует, R — корень, — — здоровый.
    ${data.teethFormulaSummary ? `<br><strong>Расшифровка:</strong> ${escapeHtml(data.teethFormulaSummary)}` : ""}
  </div>

  <div class="a4-section-heading">4. Клинический диагноз (МКБ-10)</div>
  <div style="font-size:9pt; margin:4px 0;">
    <strong>Код МКБ-10:</strong> <span style="font-family:monospace; font-weight:bold;">${escapeHtml(data.diagnosisIcd10)}</span> — ${escapeHtml(data.diagnosisDescription)}
    ${data.diagnosisTooth ? ` (Область/Зуб FDI: № ${escapeHtml(data.diagnosisTooth)})` : ""}
  </div>

  <div class="a4-section-heading">5. Дневник приёма и протокол проведённого лечения</div>
  <div style="font-size:9pt; line-height:1.35; text-align:justify; margin:4px 0;">
    <strong>Дата приёма:</strong> «${escapeHtml(data.visitDate)}» г.<br>
    <strong>Проведённое лечение:</strong><br>
    ${escapeHtml(data.treatmentProtocol || "Проведена консультация, диагностический осмотр, составлен план лечения.")}
  </div>
  ${data.materialsUsed ? `<div style="font-size:8.5pt; margin:3px 0;"><strong>Примененные препараты и материалы:</strong> ${escapeHtml(data.materialsUsed)}</div>` : ""}

  <div style="font-size:9pt; margin:4px 0;">
    <strong>Рекомендации и назначения:</strong> ${escapeHtml(data.recommendations || "Соблюдать гигиену полости рта, явка на контрольный осмотр через 6 месяцев.")}
  </div>
  ${data.nextVisitDate ? `<div style="font-size:9pt; margin:3px 0;"><strong>Следующий визит назначен на:</strong> «${escapeHtml(data.nextVisitDate)}» г.</div>` : ""}

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ЛЕЧАЩИЙ ВРАЧ:</strong><br><br>
      ${escapeHtml(data.doctorSpecialty || "Врач-стоматолог")}:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName)} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>ПАЦИЕНТ:</strong><br><br>
      С диагнозом, планом лечения и рекомендациями ознакомлен:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(pt.fullName)} /</div>
    </div>
  </div>
</div>
</body>
</html>`;
}
