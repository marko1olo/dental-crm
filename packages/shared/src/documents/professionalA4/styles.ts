/**
 * styles.ts
 *
 * Layer 1: Полиграфические CSS-стили печатного листа A4 (ГОСТ Р 7.0.97-2016)
 * и общие типографические шаблоны колонтитулов и шапок официальных документов.
 */

import type { A4ClinicRequisites } from "./types.js";
import { escapeHtml, formatAddressString, formatPhoneString } from "./formatters.js";

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

export function renderClinicHeaderHtml(cl: A4ClinicRequisites): string {
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

export function renderRunningFooterHtml(docLabel: string, currentPage: number, totalPages: number): string {
	return `
  <div class="a4-running-footer">
    <div>${escapeHtml(docLabel)}</div>
    <div>Стр. ${currentPage} из ${totalPages}</div>
  </div>`;
}

export function renderRunningHeaderHtml(docLabel: string, sheetNum: number): string {
	return `
  <div class="a4-running-header">
    <div>${escapeHtml(docLabel)}</div>
    <div>Лист ${sheetNum}</div>
  </div>`;
}
