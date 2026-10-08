/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — SHARED STYLES & UTILS (Layer 1)
 * Print-ready A4 HTML CSS styles, tooth formula tables, and UKEP seal blocks
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { UkepDigitalSignaturePayload } from "./types.js";

/** Безопасное экранирование HTML-спецсимволов для печатных форм */
export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/** Общие CSS стили для печати медицинских документов на листах А4 по ГОСТ Р 7.0.97-2016 */
export const CLINICAL_DOCUMENT_PRINT_STYLES = `
<style>
  @page {
    size: A4 portrait;
    margin: 15mm 10mm 15mm 20mm;
    @bottom-right {
      content: "Стр. " counter(page);
      font-family: "PT Astra Sans", "Arial", sans-serif;
      font-size: 8pt;
      color: #64748b;
    }
  }
  @page landscape-page {
    size: A4 landscape;
    margin: 8mm 10mm 8mm 10mm;
    @bottom-right {
      content: "Стр. " counter(page);
      font-family: "PT Astra Sans", "Arial", sans-serif;
      font-size: 8pt;
      color: #64748b;
    }
  }
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: "PT Astra Serif", "Times New Roman", "PT Astra Sans", Arial, serif;
    font-size: 9pt;
    line-height: 1.25;
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc-container {
    width: 100%;
    max-width: 185mm;
    margin: 0 auto;
    padding: 2mm 0;
  }
  .doc-container-landscape {
    width: 100%;
    max-width: 277mm;
    margin: 0 auto;
    padding: 2mm 0;
  }
  .header-grid {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 5px;
  }
  .clinic-info {
    width: 58%;
    font-family: "PT Astra Sans", Arial, sans-serif;
    font-size: 7.5pt;
    line-height: 1.2;
    color: #334155;
  }
  .clinic-title {
    font-weight: 800;
    font-size: 10.5pt;
    text-transform: uppercase;
    color: #0f172a;
    margin-bottom: 2px;
    letter-spacing: 0.02em;
  }
  .doc-requisites {
    width: 40%;
    text-align: right;
    font-family: "PT Astra Sans", Arial, sans-serif;
    font-size: 7.5pt;
    line-height: 1.2;
    color: #334155;
  }
  .form-badge {
    display: inline-block;
    font-weight: 800;
    font-size: 8.5pt;
    text-transform: uppercase;
    color: #0f172a;
    border: 1pt solid #0f172a;
    padding: 1pt 5pt;
    margin-bottom: 2pt;
    background: #f8fafc;
  }
  .doc-title-block {
    text-align: center;
    margin: 8px 0 6px 0;
  }
  .doc-main-title {
    font-family: "PT Astra Sans", Arial, sans-serif;
    font-size: 11.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: #0f172a;
    margin: 0;
    line-height: 1.2;
  }
  .doc-sub-title {
    font-size: 8.5pt;
    margin: 2px 0 0 0;
    font-style: italic;
    color: #475569;
  }
  .section-title {
    font-family: "PT Astra Sans", Arial, sans-serif;
    font-weight: 700;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    margin-top: 8px;
    margin-bottom: 3px;
    background: #f1f5f9;
    color: #0f172a;
    padding: 2.5px 6px;
    border-left: 3.5px solid #0284c7;
    page-break-after: avoid;
    break-after: avoid;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 3px 0 6px 0;
    font-size: 8pt;
    line-height: 1.2;
  }
  table.data-table th, table.data-table td {
    border: 0.5pt solid #94a3b8;
    padding: 3pt 4pt;
    vertical-align: top;
  }
  table.data-table th {
    background: #f1f5f9;
    color: #0f172a;
    font-family: "PT Astra Sans", Arial, sans-serif;
    font-weight: 700;
    text-align: center;
    font-size: 7.5pt;
  }
  table.data-table tr:nth-child(even) td {
    background: #f8fafc;
  }
  table.data-table-dense {
    width: 100%;
    border-collapse: collapse;
    margin: 2px 0 5px 0;
    font-size: 7pt;
    line-height: 1.15;
  }
  table.data-table-dense th, table.data-table-dense td {
    border: 0.5pt solid #94a3b8;
    padding: 2pt 2.5pt;
    vertical-align: middle;
  }
  table.data-table-dense th {
    background: #f1f5f9;
    color: #0f172a;
    font-family: "PT Astra Sans", Arial, sans-serif;
    font-weight: 700;
    text-align: center;
    font-size: 6.5pt;
  }
  table.data-table-dense tr:nth-child(even) td {
    background: #f8fafc;
  }
  table.data-table-dense tr.total-row td {
    background: #e2e8f0;
    font-weight: bold;
    color: #0f172a;
    border-top: 1.5pt solid #0f172a;
  }
  .center { text-align: center; }
  .left { text-align: left; }
  .right {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-family: "JetBrains Mono", "Consolas", "Arial", monospace;
  }
  .bold { font-weight: bold; }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 6px;
    margin: 4px 0 8px 0;
  }
  .kpi-card {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    border-radius: 4px;
    padding: 4px 6px;
    text-align: center;
  }
  .kpi-val {
    font-family: "PT Astra Sans", Arial, sans-serif;
    font-size: 11pt;
    font-weight: 800;
    color: #0284c7;
    line-height: 1.2;
  }
  .kpi-lbl {
    font-size: 6.5pt;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 600;
    margin-top: 2px;
  }
  .dose-gauge-container {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #f8fafc;
    padding: 8px 10px;
    margin: 6px 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .dose-gauge-track {
    position: relative;
    width: 100%;
    height: 16px;
    background: #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin: 6px 0 4px 0;
    border: 0.5pt solid #94a3b8;
  }
  .dose-gauge-fill {
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 7px 0 0 7px;
  }
  .dose-gauge-fill.green { background: linear-gradient(90deg, #22c55e, #16a34a); }
  .dose-gauge-fill.yellow { background: linear-gradient(90deg, #eab308, #d97706); }
  .dose-gauge-fill.red { background: linear-gradient(90deg, #ef4444, #dc2626); }
  .dose-gauge-scale {
    display: flex;
    justify-content: space-between;
    font-size: 6.5pt;
    color: #64748b;
    font-family: "JetBrains Mono", monospace;
    margin-top: 2px;
  }
  .signature-row {
    display: flex;
    justify-content: space-between;
    margin-top: 14px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sig-box {
    width: 48%;
  }
  .sig-line {
    border-bottom: 0.75pt solid #0f172a;
    width: 100%;
    height: 16px;
    margin-bottom: 2px;
  }
  .sig-caption {
    font-family: "PT Astra Sans", Arial, sans-serif;
    font-size: 7pt;
    color: #64748b;
    text-align: center;
  }
  .stamp-seal {
    display: inline-block;
    width: 42px;
    height: 42px;
    border: 1.5px dashed #0284c7;
    border-radius: 50%;
    text-align: center;
    line-height: 40px;
    font-size: 7.5pt;
    color: #0284c7;
    font-weight: 700;
    float: right;
    margin-top: -14px;
  }
  .stamp-angular {
    border: 1.5pt solid #0f172a;
    padding: 4pt 6pt;
    width: 60%;
    font-family: "PT Astra Sans", Arial, sans-serif;
    font-size: 7pt;
    line-height: 1.2;
    margin-bottom: 8px;
    background: #f8fafc;
  }
  .badge {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 7.5pt;
    font-weight: bold;
  }
  .badge-green { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
  .badge-yellow { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  .ukep-stamp {
    border: 1.5pt solid #003f88;
    background: #f0f7ff;
    padding: 4pt 6pt;
    margin: 6pt 0;
    font-family: "PT Astra Sans", Arial, sans-serif;
    font-size: 7pt;
    line-height: 1.2;
    color: #002b66;
    border-radius: 3pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .ukep-header {
    font-weight: 800;
    text-transform: uppercase;
    color: #003f88;
    margin-bottom: 2pt;
    border-bottom: 0.5pt solid rgba(0,63,136,0.25);
    padding-bottom: 2pt;
  }
  [data-theme="dark"] body,
  .dark body {
    color: #f1f5f9;
    background: #0f172a;
  }
  [data-theme="dark"] .clinic-info,
  .dark .clinic-info { color: #94a3b8; }
  [data-theme="dark"] .clinic-title,
  .dark .clinic-title { color: #f8fafc; }
  [data-theme="dark"] .doc-requisites,
  .dark .doc-requisites { color: #94a3b8; }
  [data-theme="dark"] .form-badge,
  .dark .form-badge {
    color: #38bdf8;
    border-color: #38bdf8;
    background: #1e293b;
  }
  [data-theme="dark"] .doc-main-title,
  .dark .doc-main-title { color: #f8fafc; }
  [data-theme="dark"] .doc-sub-title,
  .dark .doc-sub-title { color: #94a3b8; }
  [data-theme="dark"] .section-title,
  .dark .section-title {
    background: #1e293b;
    color: #38bdf8;
    border-left-color: #38bdf8;
  }
  [data-theme="dark"] table.data-table th,
  [data-theme="dark"] table.data-table-dense th,
  .dark table.data-table th,
  .dark table.data-table-dense th {
    background: #1e293b;
    color: #38bdf8;
    border-color: #334155;
  }
  [data-theme="dark"] table.data-table td,
  [data-theme="dark"] table.data-table-dense td,
  .dark table.data-table td,
  .dark table.data-table-dense td {
    border-color: #334155;
    background: #0f172a;
    color: #f1f5f9;
  }
  [data-theme="dark"] table.data-table tr:nth-child(even) td,
  [data-theme="dark"] table.data-table-dense tr:nth-child(even) td,
  .dark table.data-table tr:nth-child(even) td,
  .dark table.data-table-dense tr:nth-child(even) td {
    background: #1e293b;
  }
  [data-theme="dark"] table.data-table-dense tr.total-row td,
  .dark table.data-table-dense tr.total-row td {
    background: #334155;
    color: #38bdf8;
    border-top-color: #38bdf8;
  }
  [data-theme="dark"] .header-grid,
  .dark .header-grid { border-bottom-color: #38bdf8; }
  [data-theme="dark"] .sig-line,
  .dark .sig-line { border-bottom-color: #64748b; }
  [data-theme="dark"] .kpi-card,
  .dark .kpi-card {
    background: #1e293b;
    border-color: #334155;
  }
  [data-theme="dark"] .kpi-val,
  .dark .kpi-val { color: #38bdf8; }
  [data-theme="dark"] .kpi-lbl,
  .dark .kpi-lbl { color: #94a3b8; }
  [data-theme="dark"] .dose-gauge-container,
  .dark .dose-gauge-container {
    background: #1e293b;
    border-color: #334155;
  }
  [data-theme="dark"] .dose-gauge-track,
  .dark .dose-gauge-track { background: #334155; border-color: #475569; }
  [data-theme="dark"] .stamp-angular,
  .dark .stamp-angular {
    background: #1e293b;
    border-color: #38bdf8;
    color: #f1f5f9;
  }
  [data-theme="dark"] .ukep-stamp,
  .dark .ukep-stamp {
    background: #0f172a;
    border-color: #38bdf8;
    color: #e0f2fe;
  }
  [data-theme="dark"] .ukep-header,
  .dark .ukep-header {
    color: #38bdf8;
    border-bottom-color: #38bdf8;
  }
  @media print {
    body { font-size: 9pt; color: #000 !important; background: #fff !important; }
    .section-title { background: #f1f5f9 !important; color: #0f172a !important; border-left-color: #0f172a !important; }
    table.data-table th, table.data-table-dense th { background: #f1f5f9 !important; color: #0f172a !important; }
    table.data-table td, table.data-table th, table.data-table-dense td, table.data-table-dense th { border-color: #000 !important; color: #000 !important; }
    table.data-table tr:nth-child(even) td, table.data-table-dense tr:nth-child(even) td { background: transparent !important; }
    table.data-table-dense tr.total-row td { background: #e2e8f0 !important; color: #000 !important; }
    .header-grid { border-bottom-color: #000 !important; }
    .sig-line { border-bottom-color: #000 !important; }
    .form-badge { border-color: #000 !important; color: #000 !important; background: #fff !important; }
    .kpi-card { background: #fff !important; border-color: #000 !important; }
    .kpi-val { color: #000 !important; }
    .kpi-lbl { color: #333 !important; }
    .dose-gauge-container { background: #fff !important; border-color: #000 !important; }
    .dose-gauge-track { border-color: #000 !important; }
    .stamp-angular { border-color: #000 !important; background: #fff !important; }
    .no-print { display: none !important; }
    .page-break-after { page-break-after: always; }
  }
</style>
`;

/** Вспомогательный рендерер зубной формулы FDI (18-28 и 48-38) */
export function renderFdiToothFormulaTable(dentalFormula?: Record<string, unknown> | null): string {
	const adultUpperRight = [18, 17, 16, 15, 14, 13, 12, 11];
	const adultUpperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
	const adultLowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
	const adultLowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

	const teethMap = new Map<number, { status: string; mobility: string }>();
	if (dentalFormula) {
		if (Array.isArray(dentalFormula.teeth)) {
			for (const rawT of dentalFormula.teeth) {
				if (rawT && typeof rawT === "object") {
					const t = rawT as Record<string, unknown>;
					const num = Number(t.toothNumber);
					if (num) {
						teethMap.set(num, {
							status: String(t.statusCode || t.condition || "H"),
							mobility: String(t.mobilityGrade || "—"),
						});
					}
				}
			}
		} else if (typeof dentalFormula === "object" && dentalFormula !== null) {
			for (const [key, val] of Object.entries(dentalFormula)) {
				const num = Number(key);
				if (num && typeof val === "object" && val !== null) {
					const tVal = val as Record<string, unknown>;
					teethMap.set(num, {
						status: String(tVal.condition || tVal.statusCode || "H"),
						mobility: String(tVal.mobility || tVal.mobilityGrade || "—"),
					});
				}
			}
		}
	}

	const upperTeeth = [...adultUpperRight, ...adultUpperLeft];
	const lowerTeeth = [...adultLowerRight, ...adultLowerLeft];

	const upperNumCells = upperTeeth.map((num, i) => `<th style="width:6.25%; text-align:center; background:#f1f5f9; font-weight:bold; ${i === 7 ? "border-right:2px solid #0f172a;" : ""}">${num}</th>`).join("");
	const upperStatusCells = upperTeeth.map((num, i) => {
		const s = teethMap.get(num)?.status || "H";
		const color = s === "C" ? "#dc2626" : s === "P" || s === "Pt" ? "#991b1b" : s === "П" || s === "F" ? "#059669" : s === "К" || s === "И" ? "#2563eb" : s === "0" || s === "X" ? "#94a3b8" : "#0f172a";
		return `<td style="text-align:center; font-weight:bold; color:${color}; font-size:9.5pt; ${i === 7 ? "border-right:2px solid #0f172a;" : ""}">${escapeHtml(s)}</td>`;
	}).join("");

	const lowerStatusCells = lowerTeeth.map((num, i) => {
		const s = teethMap.get(num)?.status || "H";
		const color = s === "C" ? "#dc2626" : s === "P" || s === "Pt" ? "#991b1b" : s === "П" || s === "F" ? "#059669" : s === "К" || s === "И" ? "#2563eb" : s === "0" || s === "X" ? "#94a3b8" : "#0f172a";
		return `<td style="text-align:center; font-weight:bold; color:${color}; font-size:9.5pt; ${i === 7 ? "border-right:2px solid #0f172a;" : ""}">${escapeHtml(s)}</td>`;
	}).join("");
	const lowerNumCells = lowerTeeth.map((num, i) => `<th style="width:6.25%; text-align:center; background:#f1f5f9; font-weight:bold; ${i === 7 ? "border-right:2px solid #0f172a;" : ""}">${num}</th>`).join("");

	return `
  <table class="data-table" style="margin:4px 0 6px 0;">
    <thead>
      <tr><th colspan="8" style="text-align:center; border-right:2px solid #0f172a; font-size:8pt; background:#e2e8f0;">Верхняя челюсть справа (18–11)</th><th colspan="8" style="text-align:center; font-size:8pt; background:#e2e8f0;">Верхняя челюсть слева (21–28)</th></tr>
    </thead>
    <tbody>
      <tr>${upperNumCells}</tr>
      <tr>${upperStatusCells}</tr>
      <tr style="border-top:2px solid #0f172a;">${lowerStatusCells}</tr>
      <tr>${lowerNumCells}</tr>
    </tbody>
    <tfoot>
      <tr><th colspan="8" style="text-align:center; border-right:2px solid #0f172a; font-size:8pt; background:#e2e8f0;">Нижняя челюсть справа (48–41)</th><th colspan="8" style="text-align:center; font-size:8pt; background:#e2e8f0;">Нижняя челюсть слева (31–38)</th></tr>
    </tfoot>
  </table>
  <div style="font-size:7.5pt; color:#475569; margin-bottom:8px; line-height:1.3;">
    <strong>Условные обозначения:</strong> <strong>C</strong> — кариес, <strong>P</strong> — пульпит, <strong>Pt</strong> — периодонтит, <strong>П</strong> — пломба, <strong>К</strong> — коронка, <strong>И</strong> — имплантат, <strong>Ш</strong> — штифт, <strong>R</strong> — корень, <strong>0 / X</strong> — отсутствует, <strong>H</strong> — здоровый.
  </div>
  `;
}

/** Вспомогательный блок электронной цифровой подписи врача (УКЭП) */
export function renderUkepDigitalSignatureBlock(ukep: UkepDigitalSignaturePayload | any): string {
	if (!ukep || (!ukep.cryptoSignaturePkcs7 && !ukep.certificateSerialNumber && !ukep.certificateThumbprint)) {
		return "";
	}
	const doctor = escapeHtml(ukep.doctorFullName || "Врач-специалист");
	const serial = escapeHtml(ukep.certificateSerialNumber || (ukep.certificateThumbprint ? String(ukep.certificateThumbprint).slice(0, 16).toUpperCase() : ""));
	const issuer = escapeHtml(ukep.certificateIssuer || "Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)");
	const validFrom = escapeHtml(ukep.certificateValidFrom || "");
	const validTo = escapeHtml(ukep.certificateValidTo || "");
	const signedAt = escapeHtml(ukep.signedAt || new Date().toISOString());
	const algorithm = escapeHtml(ukep.signatureAlgorithm || "ГОСТ Р 34.10-2012 (256 бит)");
	const docId = escapeHtml(ukep.egiszDocumentId || "");

	return `
    <div style="margin-top:10px; border:1.5px solid #0284c7; background:#f0f9ff; border-radius:4px; padding:6px 8px; font-family:'PT Astra Sans', Arial, sans-serif; font-size:7pt; color:#0f172a; line-height:1.25; display:flex; justify-content:space-between; align-items:center; gap:8px;">
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #bae6fd; padding-bottom:3px; margin-bottom:3px;">
          <span style="font-weight:bold; color:#0369a1; text-transform:uppercase; font-size:7.5pt;">
            ДОКУМЕНТ ПОДПИСАН УСИЛЕННОЙ КВАЛИФИЦИРОВАННОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (УКЭП)
          </span>
          <span style="color:#0369a1; font-weight:bold;">РЭМД ЕГИСЗ / МДЛП</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:3px;">
          <div>Владелец сертификата: <strong>${doctor}</strong> ${ukep.doctorSnils ? `(СНИЛС: ${escapeHtml(ukep.doctorSnils)})` : ""}</div>
          <div>Сертификат: <strong>${serial}</strong></div>
          <div>Удостоверяющий центр: <strong>${issuer}</strong></div>
          <div>Срок действия: с <strong>${validFrom}</strong> по <strong>${validTo}</strong></div>
          <div>Дата и время подписания: <strong>${signedAt}</strong></div>
          <div>Алгоритм ЭП: <strong>${algorithm}</strong> (ID РЭМД: ${docId})</div>
        </div>
      </div>
      <div style="width:58px; height:58px; border:1px solid #0284c7; background:#ffffff; border-radius:3px; padding:2px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; flex-shrink:0;">
        <svg viewBox="0 0 33 33" style="width:42px; height:42px; shape-rendering:crispEdges;" aria-label="QR код верификации">
          <rect width="33" height="33" fill="#ffffff" />
          <path d="M2 2h7v7h-7zM4 4h3v3h-3zM24 2h7v7h-7zM26 4h3v3h-3zM2 24h7v7h-7zM4 26h3v3h-3zM12 2h2v2h-2zM16 2h2v4h-2zM20 4h2v2h-2zM12 6h2v2h-2zM12 10h4v2h-4zM18 10h2v4h-2zM22 10h2v2h-2zM26 10h4v2h-4zM2 12h2v2h-2zM6 12h2v4h-2zM10 14h2v2h-2zM14 14h2v2h-2zM22 14h4v2h-4zM28 14h2v2h-2zM2 18h4v2h-4zM8 18h2v2h-2zM12 18h2v4h-2zM16 18h4v2h-4zM22 18h2v2h-2zM26 18h4v2h-4zM6 22h2v2h-2zM10 22h2v4h-2zM14 22h4v2h-4zM20 22h2v2h-2zM24 22h2v2h-2zM28 22h2v2h-2zM12 26h2v4h-2zM16 26h4v2h-4zM22 26h2v2h-2zM26 26h4v2h-4zM16 30h2v2h-2zM20 30h4v2h-4zM28 30h2v2h-2z" fill="#003f88" />
        </svg>
        <span style="font-size:5pt; color:#0369a1; font-weight:bold; line-height:1; margin-top:1px;">ЕГИСЗ QR</span>
      </div>
    </div>
  `;
}
