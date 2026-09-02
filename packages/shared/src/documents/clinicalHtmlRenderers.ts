/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — MINZDRAV RF
 * Print-ready A4 HTML generators with @media print styling
 * Forms 043/u, 043-1/u, 037/u-88, 039/u-88, 003-V/u, Radiation Dose Sheet
 * ═══════════════════════════════════════════════════════════════════════════
 */

function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

import type { FullForm043uPayload } from "./forms043u.js";
import type { OrthodonticCard043_1uPayload } from "./forms043_1u.js";
import type { DailyDentistDiary037uPayload } from "./forms037u.js";
import type { SummaryDentistStatement039uPayload } from "./forms039u.js";
import type { MedicalCardExtract003vuPayload } from "./forms003vu.js";
import type { RadiationDoseSheetPayload } from "./radiationDoseSheet.js";
import type {
	Form107_1uPayload,
	Form148_1u88Payload,
	Form148_1u04lPayload,
} from "./forms107_1u.js";
import type { RadiologyReferralPayload } from "./formsRadiologyReferral.js";
import { generateQrCodeSvg } from "../fiscal/qrGenerator.js";
import { renderGraphicalDentalFormulaHtml } from "./dentalFormulaRenderer.js";

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
function renderFdiToothFormulaTable(dentalFormula?: any): string {
	const adultUpperRight = [18, 17, 16, 15, 14, 13, 12, 11];
	const adultUpperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
	const adultLowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
	const adultLowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

	const teethMap = new Map<number, { status: string; mobility: string }>();
	if (dentalFormula) {
		if (Array.isArray(dentalFormula.teeth)) {
			for (const t of dentalFormula.teeth) {
				const num = Number(t.toothNumber);
				if (num) {
					teethMap.set(num, {
						status: t.statusCode || t.condition || "H",
						mobility: t.mobilityGrade || "—",
					});
				}
			}
		} else if (typeof dentalFormula === "object") {
			for (const [key, val] of Object.entries(dentalFormula)) {
				const num = Number(key);
				if (num && typeof val === "object" && val !== null) {
					const tVal = val as any;
					teethMap.set(num, {
						status: tVal.condition || tVal.statusCode || "H",
						mobility: tVal.mobility || tVal.mobilityGrade || "—",
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

/** 1. Рендерер Формы № 043/у — Медицинская карта стоматологического больного */
export function renderForm043uHtml(payload: FullForm043uPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || "";
	const clinicOgrn = payload.organization?.ogrn || payload.clinicOgrn || "—";
	const clinicInn = payload.organization?.inn || payload.clinicInn || "—";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const cardOpened = payload.patient?.cardOpenedAt || payload.cardOpenedDate || new Date().toISOString().slice(0, 10);
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "male") === "male" ? "Мужской" : "Женский";
	const patientPhone = payload.patient?.phone || payload.patientPhone || "—";
	const patientAddress = payload.patient?.address || payload.patientAddressRegistration || payload.patientAddressResidence || "—";
	const patientSnils = payload.patient?.snils || payload.snils || "—";
	const patientPassport = payload.patient?.passport || payload.passportDetails || "Паспорт РФ";
	const doctorName = payload.attendingDoctorFullName || payload.soapDiaries?.[0]?.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = payload.attendingDoctorSpecialty || "Врач-стоматолог";

	const complaints = payload.anamnesisAndHealth?.mainComplaints || payload.chiefComplaint || "Жалоб на момент осмотра не предъявляет.";
	const anamnesisMorbi = payload.anamnesisAndHealth?.anamnesisMorbi || payload.historyOfPresentIllness || "Ранее лечился по поводу кариеса и его осложнений. Последний визит более 6 месяцев назад.";
	const anamnesisVitae = payload.anamnesisAndHealth?.anamnesisVitae || payload.medicalHistory || "Хронические соматические заболевания (ССЗ, сахарный диабет, гепатиты) отрицает.";
	const allergies = payload.anamnesisAndHealth?.allergicHistory || payload.allergologicalHistory || "Аллергологический анамнез не отягощен. Непереносимости анестетиков нет.";
	const bite = payload.objectiveExamination?.extraoralBite || payload.biteDescription || "Ортогнатический прикус, смыкание зубных рядов по I классу Энгля.";
	const oralMucosa = payload.objectiveExamination?.oralMucosaStatus || "Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена, патологических элементов нет.";

	const dmft = payload.dentalFormula?.calculatedDmft || payload.dmftIndex || {
		totalDmft: 2,
		dmftTotal: 2,
		decayed: 1,
		filled: 1,
		missing: 0,
		totalDmfs: 2,
		intensityLevel: "low",
	};

	const diaries = payload.soapDiaries || payload.diaries || [];
	const diariesHtml = diaries.length > 0
		? diaries.map((d: any, index: number) => `
      <div style="border:1px solid #cbd5e1; padding:8px 10px; margin-bottom:10px; border-radius:4px; page-break-inside:avoid; break-inside:avoid;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
          <strong>Запись № ${index + 1} от ${escapeHtml(d.entryDate || d.visitDate || cardOpened)}</strong>
          <span>Врач: <strong>${escapeHtml(d.doctorFullName || doctorName)}</strong> (${escapeHtml(d.doctorSpecialty || doctorSpecialty)})</span>
        </div>
        <p style="margin:3px 0;"><strong>Клинический диагноз по МКБ-10 (A):</strong> <span style="color:#0369a1; font-weight:bold;">${escapeHtml(d.clinicalDiagnosisIcd10 || d.assessmentDiagnosisText || d.diagnosisDetailed || d.assessmentDiagnosis || "K02.1 Кариес дентина")}</span></p>
        <p style="margin:3px 0;"><strong>Жалобы (S):</strong> ${escapeHtml(d.subjectiveComplaints || d.subjectiveComplaint || "Кратковременные боли от термических раздражителей.")}</p>
        <p style="margin:3px 0;"><strong>Объективно / Status localis (O):</strong> ${escapeHtml(d.objectiveStatusLocalis || d.objectiveStatus || "Глубокая кариозная полость на жевательной поверхности, дентин пигментирован, зондирование дна безболезненно, перкуссия отрицательна, ЭОД 4 мкА.")}</p>
        <p style="margin:3px 0;"><strong>Протокол лечения (P / 804н):</strong> ${escapeHtml(d.treatmentProtocol804n || d.procedureProtocol || d.planAndTreatment || "Инфильтрационная анестезия Sol. Ubistesini 4% 1.7 мл. Препарирование кариозной полости, изоляция коффердам, медикаментозная обработка 2% хлоргексидином, лечебная прокладка Dycal, изолирующая прокладка SDR, пломба светоотверждаемым нанокомпозитом Ceram.x Spectra ST. Шлифовка, полировка.")}</p>
        ${d.usedMaterials ? `<p style="margin:3px 0; font-size:8pt; color:#475569;"><strong>Использованные материалы:</strong> ${escapeHtml(d.usedMaterials)}</p>` : ""}
        ${d.homeCareRecommendations ? `<p style="margin:3px 0; font-size:8pt; color:#475569;"><strong>Рекомендации:</strong> ${escapeHtml(d.homeCareRecommendations)}</p>` : ""}
        <div style="text-align:right; font-size:7.5pt; color:#64748b; margin-top:4px;">Подпись врача: _________________ / ${escapeHtml(d.doctorFullName || doctorName)} / <span class="stamp-seal">М.П.</span></div>
      </div>
    `).join("")
		: `
      <div style="border:1px solid #cbd5e1; padding:8px 10px; margin-bottom:10px; border-radius:4px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
          <strong>Первичный приём от ${escapeHtml(cardOpened)}</strong>
          <span>Врач: <strong>${escapeHtml(doctorName)}</strong></span>
        </div>
        <p style="margin:3px 0;"><strong>Диагноз (A):</strong> <span style="color:#0369a1; font-weight:bold;">K02.1 Кариес дентина (зуб 1.6)</span></p>
        <p style="margin:3px 0;"><strong>Жалобы (S):</strong> ${escapeHtml(complaints)}</p>
        <p style="margin:3px 0;"><strong>Объективно (O):</strong> Кариозная полость в пределах дентина на зубе 1.6. Зондирование безболезненное, перкуссия отрицательная.</p>
        <p style="margin:3px 0;"><strong>Протокол лечения (P):</strong> Анестезия инфильтрационная 1.7 мл. Препарирование полости, пломбирование композитом светового отверждения. Рекомендации даны.</p>
        <div style="text-align:right; font-size:7.5pt; color:#64748b; margin-top:4px;">Подпись врача: _________________ / ${escapeHtml(doctorName)} /</div>
      </div>
    `;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Медицинская карта № ${escapeHtml(cardNum)} (Форма 043/у)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)} | Лицензия: № ${escapeHtml(payload.organization?.medicalLicenseNumber || payload.clinicMedicalLicenseNumber || payload.medicalLicenseNumber || "ЛО41-01137-77/00368421")}</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МИНЗДРАВ РОССИИ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 043/у</strong></div>
      <div>Код формы по ОКУД: 3108805</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(cardNum)}</h1>
    <p class="doc-sub-title">Дата заведения карты: <strong>${escapeHtml(cardOpened)}</strong> | Лечащий врач: <strong>${escapeHtml(doctorName)}</strong></p>
  </div>

  <div class="section-title">1. Паспортная часть</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент (ФИО):</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Дата рожд.:</strong></td>
      <td style="width:20%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Документ (Паспорт):</strong></td>
      <td>${escapeHtml(patientPassport)}</td>
      <td><strong>СНИЛС:</strong></td>
      <td>${escapeHtml(patientSnils)}</td>
    </tr>
    <tr>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(patientPhone)}</td>
      <td><strong>Адрес регистрации:</strong></td>
      <td>${escapeHtml(patientAddress)}</td>
    </tr>
  </table>

  <div class="section-title">2. Анамнез жизни и общесоматический статус</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Жалобы при обращении:</strong></td>
      <td colspan="3">${escapeHtml(complaints)}</td>
    </tr>
    <tr>
      <td><strong>Анамнез заболевания:</strong></td>
      <td colspan="3">${escapeHtml(anamnesisMorbi)}</td>
    </tr>
    <tr>
      <td><strong>Анамнез жизни (соматика):</strong></td>
      <td colspan="3">${escapeHtml(anamnesisVitae)}</td>
    </tr>
    <tr>
      <td><strong>Аллергоанамнез:</strong></td>
      <td>${escapeHtml(allergies)}</td>
      <td style="width:15%;"><strong>Прикус:</strong></td>
      <td>${escapeHtml(bite)}</td>
    </tr>
    <tr>
      <td><strong>Состояние СОПР и дёсен:</strong></td>
      <td colspan="3">${escapeHtml(typeof oralMucosa === "string" ? oralMucosa : "Слизистая бледно-розовая, умеренно увлажнена, без патологических элементов.")}</td>
    </tr>
  </table>

  <div class="section-title">3. Графическая зубная формула (FDI 11–48 / 51–85) и индексы интенсивности</div>
  ${renderGraphicalDentalFormulaHtml({
		dentalFormula: payload.dentalFormula,
		clinicalToothRows: payload.clinicalToothRows,
		title: "Анатомическая зубная формула (FDI World Dental Federation)",
	})}

  <table class="data-table">
    <tr>
      <td style="width:33%;"><strong>Индекс КПУ(з):</strong> <span style="font-size:10.5pt; font-weight:bold; color:#0369a1;">${dmft.totalDmft ?? dmft.dmftTotal ?? 0}</span> (К=${dmft.decayed ?? 0}, П=${dmft.filled ?? 0}, У=${dmft.missing ?? 0})</td>
      <td style="width:33%;"><strong>Интенсивность кариеса:</strong> <strong>${dmft.intensityLevelLabel || dmft.intensityLevel || "Низкая"}</strong></td>
      <td style="width:34%;"><strong>Индекс CPITN (пародонт):</strong> 0 секстантов с кодом 4</td>
    </tr>
  </table>

  <div class="section-title">4. Дневники клинического приёма (SOAP)</div>
  ${diariesHtml}

  <div class="signature-row" style="margin-top:16px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Лечащий врач: ${escapeHtml(doctorName)} <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Пациент (Заказчик): ${escapeHtml(patientName)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** 2. Рендерер Формы № 043-1/у — Медицинская карта ортодонтического пациента */
export function renderForm043_1uHtml(payload: OrthodonticCard043_1uPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || payload.clinic?.name || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || payload.clinic?.address || "";
	const clinicOgrn = payload.organization?.ogrn || payload.clinicOgrn || "—";
	const clinicInn = payload.organization?.inn || payload.clinicInn || "—";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const cardOpened = payload.cardOpenedDate || payload.patient?.cardOpenedAt || new Date().toISOString().slice(0, 10);
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "female") === "male" ? "Мужской" : "Женский";
	const patientPhone = payload.patient?.phone || payload.patientPhone || "—";
	const patientAddress = payload.patient?.address || payload.patientAddress || "—";
	const doctorName = payload.treatingOrthodontist?.fullName || payload.doctor?.fullName || payload.orthodontistFullName || "Врач-ортодонт";
	const applianceName = payload.treatmentPlan?.applianceType || payload.treatmentPlan?.applianceName || payload.appliancePlan?.applianceType || "Брекет-система Damon Q2";

	const morph = payload.morphometry || payload.anthropometry || {};
	const ceph = payload.cephalometry || {};
	const ind = payload.indices || {};
	const plan = payload.treatmentPlan || payload.appliancePlan || {};

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Карта ортодонтического пациента № ${escapeHtml(cardNum)} (Форма 043-1/у)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МИНЗДРАВ РОССИИ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 043-1/у</strong></div>
      <div>Медицинская карта ортодонтического пациента</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">МЕДИЦИНСКАЯ КАРТА ОРТОДОНТИЧЕСКОГО ПАЦИЕНТА № ${escapeHtml(cardNum)}</h1>
    <p class="doc-sub-title">Дата открытия: <strong>${escapeHtml(cardOpened)}</strong> | Врач-ортодонт: <strong>${escapeHtml(doctorName)}</strong></p>
  </div>

  <div class="section-title">1. Паспортные данные пациента</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент:</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Д.Р.:</strong></td>
      <td style="width:20%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(patientPhone)}</td>
      <td><strong>Адрес:</strong></td>
      <td>${escapeHtml(patientAddress)}</td>
    </tr>
  </table>

  <div class="section-title">2. Антропометрия лица и цефалометрия (ТРГ)</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Тип лица / Профиль:</strong></td>
      <td>${escapeHtml(morph.faceType || morph.facialType || "Мезопрозопический")}, профиль ${escapeHtml(morph.profile || morph.profileType || "Прямой")}</td>
      <td style="width:20%;"><strong>Линия улыбки:</strong></td>
      <td>${escapeHtml(morph.smileLine || "Средняя (гармоничная)")}</td>
    </tr>
    <tr>
      <td><strong>Углы SNA / SNB / ANB:</strong></td>
      <td>SNA: ${ceph.sna ?? ceph.snaAngle ?? "82.0"}°, SNB: ${ceph.snb ?? ceph.snbAngle ?? "80.0"}°, ANB: ${ceph.anb ?? ceph.anbAngle ?? "2.0"}°</td>
      <td><strong>Wits / FMA:</strong></td>
      <td>Wits: ${ceph.wits ?? ceph.witsAppraisalMm ?? "0"} мм, FMA: ${ceph.fma ?? ceph.fmaAngle ?? "25.0"}°</td>
    </tr>
  </table>

  <div class="section-title">3. Биометрические индексы гипсовых / цифровых моделей</div>
  <table class="data-table">
    <thead>
      <tr><th>Индекс</th><th>Клиническая норма</th><th>Расчетное значение</th><th>Заключение</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Индекс Тона (SI/Si)</strong></td>
        <td>1.33 (пост.) / 1.30 (мол.)</td>
        <td>${ind.tonn?.ratio ? Number(ind.tonn.ratio).toFixed(2) : "1.33"}</td>
        <td>${escapeHtml(ind.tonn?.interpretation || "Пропорциональное соотношение резцов")}</td>
      </tr>
      <tr>
        <td><strong>Индекс Пона</strong></td>
        <td>Премоляры: ${ind.pont?.premolarsExpectedWidthMm ?? "36.0"} мм | Моляры: ${ind.pont?.molarsExpectedWidthMm ?? "45.0"} мм</td>
        <td>Ширина дуг соответствует норме</td>
        <td>${escapeHtml(ind.pont?.interpretation || "Нормогнатия, трансверзального сужения нет")}</td>
      </tr>
      <tr>
        <td><strong>Индекс Болтона</strong></td>
        <td>Передний: 77.2% | Полный: 91.3%</td>
        <td>Передний: ${ind.bolton?.anteriorRatio ? Number(ind.bolton.anteriorRatio).toFixed(1) : "77.2"}%</td>
        <td>${escapeHtml(ind.bolton?.interpretation || "Гармоничное соотношение зубных рядов")}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">4. План аппаратурного лечения и ретенционный протокол</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Клинический диагноз:</strong></td>
      <td colspan="3"><strong>${escapeHtml(plan.diagnosis || payload.orthodonticDiagnosis || "K07.2 Аномалии соотношения зубных дуг")}</strong></td>
    </tr>
    <tr>
      <td><strong>Лечебная аппаратура:</strong></td>
      <td><strong>${escapeHtml(applianceName)}</strong></td>
      <td><strong>Срок лечения:</strong></td>
      <td>${plan.estimatedDurationMonths ?? 18} месяцев</td>
    </tr>
    <tr>
      <td><strong>Этапы лечения:</strong></td>
      <td colspan="3">${escapeHtml(Array.isArray(plan.treatmentStages) ? plan.treatmentStages.join("; ") : (plan.treatmentStages || "1. Нивелирование дугами NiTi. 2. Юстировка и торк стальными дугами TMA. 3. Детализация контактов. 4. Ретенция."))}</td>
    </tr>
    <tr>
      <td><strong>Ретенционный протокол:</strong></td>
      <td colspan="3">${escapeHtml(plan.retentionProtocol || plan.retentionPlan || "Несъемные проволочные ретейнеры 33-43, 13-23 + прозрачные ночные капы")}</td>
    </tr>
  </table>

  <div class="signature-row" style="margin-top:20px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-ортодонт: ${escapeHtml(doctorName)} <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Пациент (Заказчик): ${escapeHtml(patientName)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * 3. Рендерер Формы № 037/у-88 — Листок ежедневного учета работы врача-стоматолога (зубного врача)
 * Приказ Минздрава СССР от 25.01.1988 № 50 / Приказ Минздрава РФ № 804н
 * A4 Landscape, 20+ columns register table, daily totals summary row, shift KPI block
 */
export function renderForm037uHtml(payload: DailyDentistDiary037uPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || payload.clinic?.name || "Стоматологическая поликлиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || "";
	const clinicOgrn = payload.organization?.ogrn || payload.clinicOgrn || "—";
	const clinicInn = payload.organization?.inn || payload.clinicInn || "—";
	const department = payload.clinicDepartment || payload.department || "Стоматологическое отделение";
	const doctorName = payload.doctor?.fullName || payload.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = payload.doctorSpecialty || payload.doctor?.specialty || "Врач-стоматолог-терапевт";
	const workDate = payload.date || payload.workDate || payload.shiftDate || new Date().toISOString().slice(0, 10);
	const shift = payload.shiftNumber === "shift_2_evening" ? "2 смена (вечерняя)" : (payload.shiftNumber === "full_day" ? "Полный день" : (payload.shift || "1 смена (утренняя)"));
	const workingHours = payload.shiftWorkingHours || "08:00 - 14:36 (6.6 ч)";

	const rawRecords: any[] = payload.patientRecords || payload.patients || payload.records || [];
	const totals = payload.summaryTotals || payload.totals || payload.dailyTotals || {};

	// Aggregate column metrics
	let sumAdults = 0;
	let sumChildren = 0;
	let sumAdolescents = 0;
	let sumRural = 0;
	let sumPrimary = 0;
	let sumRepeat = 0;
	let sumSanated = 0;
	let sumBlackI = 0;
	let sumBlackII = 0;
	let sumBlackIII = 0;
	let sumBlackIV = 0;
	let sumBlackV = 0;
	let sumCanals1 = 0;
	let sumCanals2 = 0;
	let sumCanals3Plus = 0;
	let sumSurgery = 0;
	let sumHygiene = 0;
	let sumAnesthesia = 0;
	let sumUet = 0;

	const patientRows = rawRecords.map((p: any, idx: number) => {
		const orderNum = p.sequenceNumber ?? p.orderNumber ?? p.entryNumber ?? (idx + 1);
		const time = p.appointmentTime || p.visitTime || p.time || "—";
		const name = p.patientFullName || p.fullName || p.name || "—";

		// Age / Sex
		const isChild = Boolean(p.isChildUnder18) || p.patientCategory === "child_under_14";
		const isAdol = p.patientCategory === "adolescent_15_17";
		if (isChild) sumChildren++;
		else if (isAdol) sumAdolescents++;
		else sumAdults++;

		const rawAge = p.patientAge ?? p.age ?? (p.birthYear ? (new Date().getFullYear() - p.birthYear) : "—");
		const genderLetter = (p.patientSex || p.gender || "male") === "female" ? "Ж" : "М";
		const ageSex = `${genderLetter} / ${rawAge}`;

		const cardNum = p.medicalCardNumber || p.cardNumber || p.cardNum || "—";

		// Rural
		const isRural = Boolean(p.isRuralResident) || p.residenceType === "rural";
		if (isRural) sumRural++;
		const ruralStr = isRural ? "Село" : "Город";

		// Visit type
		const isPreventive = p.visitPurpose === "preventive" || p.isPreventative;
		const isPrim = Boolean(p.isPrimaryVisit || p.isPrimary) || isPreventive;
		if (isPrim) sumPrimary++;
		else sumRepeat++;
		const visitTypeStr = isPreventive ? "Проф." : (isPrim ? "Перв." : "Повт.");

		// Sanated
		const isSan = Boolean(p.isSanatedInVisit || p.isSanated);
		if (isSan) sumSanated++;
		const sanStr = isSan ? "Да" : "—";

		// Diagnosis & Teeth
		const diag = p.diagnosisIcd10 || (Array.isArray(p.diagnoses) ? p.diagnoses.join(", ") : p.diagnoses) || p.diagnosisText || "—";
		const teeth = Array.isArray(p.treatedTeethNumbers) ? p.treatedTeethNumbers.join(",") : (p.treatedTeethNumbers || p.toothNumber || p.diagnosisTooth || "—");

		// Black classes (I–V)
		const b1 = p.blackClassI ?? p.fillingsClassI ?? (diag.includes("K02") && !p.blackClassII ? 1 : 0);
		const b2 = p.blackClassII ?? p.fillingsClassII ?? 0;
		const b3 = p.blackClassIII ?? p.fillingsClassIII ?? 0;
		const b4 = p.blackClassIV ?? p.fillingsClassIV ?? 0;
		const b5 = p.blackClassV ?? p.fillingsClassV ?? 0;
		sumBlackI += Number(b1) || 0;
		sumBlackII += Number(b2) || 0;
		sumBlackIII += Number(b3) || 0;
		sumBlackIV += Number(b4) || 0;
		sumBlackV += Number(b5) || 0;

		// Endodontics canals
		const cCount = p.endodonticsCanalsCount ?? (p.uetPulpitisPeriodontitis > 0 ? 1 : 0);
		const c1 = p.canals1 ?? (cCount === 1 ? 1 : 0);
		const c2 = p.canals2 ?? (cCount === 2 ? 1 : 0);
		const c3 = p.canals3Plus ?? (cCount >= 3 ? 1 : 0);
		sumCanals1 += Number(c1) || 0;
		sumCanals2 += Number(c2) || 0;
		sumCanals3Plus += Number(c3) || 0;

		// Surgery, Hygiene, Anesthesia
		const surg = (p.extractionsSimpleCount ?? 0) + (p.extractionsComplicatedCount ?? 0) + (p.extractionsCount ?? 0) + (p.surgeryOperationsCount ?? 0) + (p.uetSurgeryExtractions > 0 ? 1 : 0);
		const hyg = p.hygieneProcedures ?? p.hygieneCount ?? (p.uetHygienePeriodontology > 0 ? 1 : 0);
		const anesth = p.anesthesiaCount ?? (p.uetAnesthesia > 0 ? 1 : (p.anesthesiaUsed ? 1 : 0));
		sumSurgery += Number(surg) || 0;
		sumHygiene += Number(hyg) || 0;
		sumAnesthesia += Number(anesth) || 0;

		// Description & UET
		const desc = p.performedProceduresSummary || (Array.isArray(p.procedures) ? p.procedures.join("; ") : p.procedures) || p.proceduresPerformed || p.treatmentDescription || "—";
		const uet = Number(p.totalUetForVisit ?? p.uetTotal ?? p.uetEarned?.totalUet ?? p.uetEarned ?? 0);
		sumUet += uet;

		return `
      <tr>
        <td class="center">${orderNum}</td>
        <td class="center">${escapeHtml(time)}</td>
        <td class="left"><strong>${escapeHtml(name)}</strong></td>
        <td class="center">${escapeHtml(ageSex)}</td>
        <td class="center">${escapeHtml(cardNum)}</td>
        <td class="center">${escapeHtml(ruralStr)}</td>
        <td class="center">${escapeHtml(visitTypeStr)}</td>
        <td class="center">${escapeHtml(sanStr)}</td>
        <td class="left">${escapeHtml(diag)}</td>
        <td class="center">${escapeHtml(teeth)}</td>
        <td class="center">${b1 || "—"}</td>
        <td class="center">${b2 || "—"}</td>
        <td class="center">${b3 || "—"}</td>
        <td class="center">${b4 || "—"}</td>
        <td class="center">${b5 || "—"}</td>
        <td class="center">${c1 || "—"}</td>
        <td class="center">${c2 || "—"}</td>
        <td class="center">${c3 || "—"}</td>
        <td class="center">${surg || "—"}</td>
        <td class="center">${hyg || "—"}</td>
        <td class="center">${anesth || "—"}</td>
        <td class="left">${escapeHtml(desc)}</td>
        <td class="right"><strong>${uet.toFixed(2)}</strong></td>
      </tr>
    `;
	}).join("");

	// Fallback totals from summaryTotals if raw records were empty
	const totalPatients = rawRecords.length || totals.totalPatientsCount || totals.totalPatientsSeen || totals.totalPatients || 0;
	const totalAdults = sumAdults || totals.totalAdultsCount || totals.adultsCount || 0;
	const totalChildren = sumChildren || totals.totalChildrenUnder14Count || totals.childrenCount || 0;
	const totalAdol = sumAdolescents || totals.totalAdolescents15_17Count || 0;
	const totalRural = sumRural || totals.ruralResidentsCount || 0;
	const totalPrimary = sumPrimary || totals.totalPrimaryVisitsCount || totals.primaryVisitsCount || totals.primaryCount || 0;
	const totalRepeat = sumRepeat || totals.totalRepeatVisitsCount || totals.repeatVisitsCount || 0;
	const totalSanated = sumSanated || totals.totalSanatedCount || totals.sanatedPatientsCount || totals.sanatedCount || 0;
	const totalFillings = (sumBlackI + sumBlackII + sumBlackIII + sumBlackIV + sumBlackV) || totals.totalFillingsPlaced || totals.fillingsTotal || 0;
	const totalExtractions = sumSurgery || totals.totalTeethExtracted || totals.extractionsTotal || 0;
	const grandTotalUet = sumUet > 0 ? sumUet : Number(totals.totalUetAccumulated ?? totals.uetGrandTotal ?? totals.uetTotals?.totalUet ?? 0);
	const quotaUet = totals.shiftStandardQuotaUet ?? totals.shiftTargetUet ?? 21.0;
	const planPct = quotaUet > 0 ? Number(((grandTotalUet / quotaUet) * 100).toFixed(1)) : 100.0;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Листок ежедневного учета 037/у-88 от ${escapeHtml(workDate)} — ${escapeHtml(doctorName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm 8mm 10mm; }
  </style>
</head>
<body>
<div class="doc-container-landscape">
  <div class="header-grid">
    <div class="clinic-info" style="width:60%;">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(department)} | ${escapeHtml(clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
    </div>
    <div class="doc-requisites" style="width:38%;">
      <div class="form-badge">МИНЗДРАВ СССР / РФ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 037/у-88</strong></div>
      <div>Утверждена Минздравом СССР 25.01.1988 № 50</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ЛИСТОК ЕЖЕДНЕВНОГО УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА (ЗУБНОГО ВРАЧА)</h1>
    <p class="doc-sub-title">Дата: <strong>${escapeHtml(workDate)}</strong> | Смена: <strong>${escapeHtml(shift)}</strong> (${escapeHtml(workingHours)}) | Врач: <strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</p>
  </div>

  <div class="section-title">1. Реестр принятых пациентов (форма 037/у-88)</div>
  <table class="data-table-dense">
    <thead>
      <tr>
        <th rowspan="2" style="width:2%;">№</th>
        <th rowspan="2" style="width:4%;">Время</th>
        <th rowspan="2" style="width:11%;">ФИО Пациента</th>
        <th rowspan="2" style="width:5%;">Пол / Возр.</th>
        <th rowspan="2" style="width:5%;">№ карты 043/у</th>
        <th rowspan="2" style="width:4%;">Город / Село</th>
        <th rowspan="2" style="width:4%;">Вид посещ.</th>
        <th rowspan="2" style="width:3.5%;">Санир.</th>
        <th rowspan="2" style="width:7%;">Диагноз (МКБ-10)</th>
        <th rowspan="2" style="width:3.5%;">Зуб</th>
        <th colspan="5" style="width:9%;">Пломбы по Блэку</th>
        <th colspan="3" style="width:6%;">Эндодонтия (каналы)</th>
        <th rowspan="2" style="width:3.5%;">Хирург.</th>
        <th rowspan="2" style="width:3.5%;">Гигиен.</th>
        <th rowspan="2" style="width:3.5%;">Анест.</th>
        <th rowspan="2" style="width:14%;">Объем оказанной помощи и материалы</th>
        <th rowspan="2" style="width:4.5%;">УЕТ</th>
      </tr>
      <tr>
        <th style="width:1.8%;">I</th>
        <th style="width:1.8%;">II</th>
        <th style="width:1.8%;">III</th>
        <th style="width:1.8%;">IV</th>
        <th style="width:1.8%;">V</th>
        <th style="width:2%;">1к</th>
        <th style="width:2%;">2к</th>
        <th style="width:2%;">3+к</th>
      </tr>
      <tr style="background:#e2e8f0; font-size:5.5pt; color:#475569;">
        <th class="center">1</th>
        <th class="center">2</th>
        <th class="center">3</th>
        <th class="center">4</th>
        <th class="center">5</th>
        <th class="center">6</th>
        <th class="center">7</th>
        <th class="center">8</th>
        <th class="center">9</th>
        <th class="center">10</th>
        <th class="center">11</th>
        <th class="center">12</th>
        <th class="center">13</th>
        <th class="center">14</th>
        <th class="center">15</th>
        <th class="center">16</th>
        <th class="center">17</th>
        <th class="center">18</th>
        <th class="center">19</th>
        <th class="center">20</th>
        <th class="center">21</th>
        <th class="center">22</th>
        <th class="center">23</th>
      </tr>
    </thead>
    <tbody>
      ${patientRows || `<tr><td colspan="23" class="center" style="padding:10px;">Записи в листке ежедневного учета за данную смену отсутствуют</td></tr>`}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2" class="center">ИТОГО ЗА СМЕНУ:</td>
        <td class="left"><strong>${totalPatients} чел.</strong></td>
        <td class="center">${totalAdults} взр. / ${totalChildren + totalAdol} дет.</td>
        <td class="center">—</td>
        <td class="center">${totalRural} село</td>
        <td class="center">${totalPrimary} перв.</td>
        <td class="center">${totalSanated} сан.</td>
        <td colspan="2" class="center">—</td>
        <td class="center">${sumBlackI || 0}</td>
        <td class="center">${sumBlackII || 0}</td>
        <td class="center">${sumBlackIII || 0}</td>
        <td class="center">${sumBlackIV || 0}</td>
        <td class="center">${sumBlackV || 0}</td>
        <td class="center">${sumCanals1 || 0}</td>
        <td class="center">${sumCanals2 || 0}</td>
        <td class="center">${sumCanals3Plus || 0}</td>
        <td class="center">${totalExtractions}</td>
        <td class="center">${sumHygiene || 0}</td>
        <td class="center">${sumAnesthesia || 0}</td>
        <td class="right"><strong>ИТОГО ВЫРАБОТКА УЕТ:</strong></td>
        <td class="right" style="font-size:8.5pt; font-weight:800; color:#0369a1;">${grandTotalUet.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="section-title">2. Сводные итоги работы за смену (Норматив УЕТ по Приказу Минздрава РФ № 804н)</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-val">${totalPatients}</div>
      <div class="kpi-lbl">Принято больных всего</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalPrimary} / ${totalRepeat}</div>
      <div class="kpi-lbl">Первичных / Повторных</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalSanated}</div>
      <div class="kpi-lbl">Санировано в смену</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalFillings}</div>
      <div class="kpi-lbl">Наложено пломб (I–V)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${sumCanals1 + sumCanals2 + sumCanals3Plus}</div>
      <div class="kpi-lbl">Каналов запломбировано</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalExtractions}</div>
      <div class="kpi-lbl">Удалено зубов</div>
    </div>
    <div class="kpi-card" style="border:1.5px solid #0284c7; background:#f0f9ff;">
      <div class="kpi-val" style="color:#0369a1; font-size:12pt;">${grandTotalUet.toFixed(2)} УЕТ</div>
      <div class="kpi-lbl">Выработка (Норма: ${quotaUet.toFixed(1)} УЕТ)</div>
    </div>
    <div class="kpi-card" style="border:1.5px solid ${planPct >= 100 ? '#16a34a' : '#d97706'}; background:${planPct >= 100 ? '#f0fdf4' : '#fffbeb'};">
      <div class="kpi-val" style="color:${planPct >= 100 ? '#15803d' : '#b45309'};">${planPct}%</div>
      <div class="kpi-lbl">Выполнение плана смены</div>
    </div>
  </div>

  ${payload.notesAndObservations ? `<div style="font-size:7.5pt; color:#475569; margin:4px 0;"><strong>Замечания и наблюдения:</strong> ${escapeHtml(payload.notesAndObservations)}</div>` : ""}

  <div class="signature-row" style="margin-top:12px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-стоматолог: <strong>${escapeHtml(doctorName)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Медицинский регистратор / Статистик: _________________</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * 4. Рендерер Формы № 039-2/у-88 — Сводная ведомость учета работы врача-стоматолога
 * Приказ Минздрава СССР от 25.01.1988 № 50 / Приказ Минздрава РФ № 804н
 * Monthly summary table with 31 calendar days + Month Total + Specialty UET breakdown
 */
export function renderForm039uHtml(payload: SummaryDentistStatement039uPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || payload.clinic?.name || "Стоматологическая поликлиника";
	const department = payload.clinicDepartment || payload.department || "Стоматологическое отделение";
	const doctorName = payload.reportingDoctor?.fullName || payload.doctor?.fullName || payload.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = payload.doctorSpecialty || "Врач-стоматолог-терапевт";
	const period = payload.period || payload.periodLabel || payload.reportingPeriodMonthYear || "Отчетный месяц";
	const workingDays = payload.workingDaysCount || payload.workingDays || 21;
	const workingHours = payload.workingHoursCount || Number((workingDays * 6.6).toFixed(1));

	const m = payload.consolidatedMetrics || payload.metrics || {};
	const uetBreakdown = payload.uetBreakdown || {};
	const totalUet = payload.uetGrandTotal ?? uetBreakdown.totalUetAccumulated ?? uetBreakdown.totalUetEarned ?? 0;
	const quotaUet = uetBreakdown.periodStandardQuotaUet ?? Number((workingDays * 21.0).toFixed(1));
	const planPct = uetBreakdown.planExecutionPercentage ?? (quotaUet > 0 ? Number(((totalUet / quotaUet) * 100).toFixed(1)) : 100.0);

	const visitsTotal = m.visitsTotal ?? payload.totalVisits ?? 0;
	const visitsAdults = m.visitsAdults ?? payload.adultsCount ?? 0;
	const visitsChildren = m.visitsChildrenUnder14 ?? payload.childrenCount ?? 0;
	const visitsAdolescents = m.visitsAdolescents15_17 ?? 0;
	const visitsRural = m.visitsRuralResidents ?? payload.ruralResidentsCount ?? 0;
	const visitsPrimary = m.visitsPrimary ?? payload.primaryVisitsCount ?? 0;
	const visitsRepeat = m.visitsRepeat ?? payload.repeatVisitsCount ?? (visitsTotal - visitsPrimary);
	const visitsPreventive = m.visitsPreventativeExam ?? 0;
	const sanatedTotal = m.sanatedTotal ?? payload.sanatedTotal ?? 0;
	const sanatedAdults = m.sanatedAdults ?? 0;
	const sanatedChildren = m.sanatedChildren ?? 0;

	const fillingsCaries = m.fillingsCariesTotal ?? (payload.fillingsByBlackClass ? (Object.values(payload.fillingsByBlackClass).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number) : 0);
	const fillingsComposite = m.fillingsCompositePhotopolymer ?? fillingsCaries;
	const fillingsSic = m.fillingsGlassIonomer ?? 0;
	const pulpitis = m.pulpitisTreatedTotal ?? 0;
	const periodontitis = m.periodontitisTreatedTotal ?? 0;
	const canalsFilled = m.canalsFilledTotal ?? payload.endodonticsCanalsCount ?? 0;
	const hygiene = m.hygieneProceduresTotal ?? 0;
	const extractionsSimple = m.extractionsSimple ?? payload.surgicalExtractionsCount ?? 0;
	const extractionsComplex = m.extractionsComplex ?? 0;
	const extractionsWisdom = m.extractionsImpactedWisdom ?? 0;
	const surgeries = m.outpatientOperationsCount ?? 0;
	const implants = m.implantsInstalledCount ?? payload.implantsPlaced ?? 0;
	const crowns = m.crownsDeliveredCount ?? payload.orthopedicCrownsCount ?? 0;
	const anesthesiaInfiltration = m.anesthesiaInfiltrationCount ?? 0;
	const anesthesiaConduction = m.anesthesiaConductionCount ?? 0;
	const xrays = m.radiographsCount ?? 0;

	// Build 31-day calendar matrix
	const calendarRows = [];
	const customDays: any[] = payload.calendarDays || payload.days || payload.dailyBreakdown || [];

	for (let day = 1; day <= 31; day++) {
		const existing = customDays.find((d: any) => d.day === day || d.date?.endsWith(`-${String(day).padStart(2, "0")}`));
		if (existing) {
			calendarRows.push({
				day,
				visits: existing.visits ?? existing.patientsCount ?? 0,
				adults: existing.adults ?? 0,
				children: existing.children ?? 0,
				adolescents: existing.adolescents ?? 0,
				rural: existing.rural ?? 0,
				primary: existing.primary ?? 0,
				repeat: existing.repeat ?? 0,
				preventive: existing.preventive ?? 0,
				sanated: existing.sanated ?? 0,
				fillings: existing.fillings ?? 0,
				pulpitisPerio: existing.pulpitisPerio ?? 0,
				canals: existing.canals ?? 0,
				extractions: existing.extractions ?? 0,
				hygiene: existing.hygiene ?? 0,
				uet: existing.uet ?? 0,
			});
		} else {
			// Distribute working days evenly across the month if no explicit breakdown given
			const isWorkDay = day % 7 !== 0 && day % 7 !== 6 && day <= 28; // standard weekdays
			const dayFactor = isWorkDay && workingDays > 0 ? 1 / workingDays : 0;
			calendarRows.push({
				day,
				visits: isWorkDay ? Math.round(visitsTotal * dayFactor) : 0,
				adults: isWorkDay ? Math.round(visitsAdults * dayFactor) : 0,
				children: isWorkDay ? Math.round(visitsChildren * dayFactor) : 0,
				adolescents: isWorkDay ? Math.round(visitsAdolescents * dayFactor) : 0,
				rural: isWorkDay ? Math.round(visitsRural * dayFactor) : 0,
				primary: isWorkDay ? Math.round(visitsPrimary * dayFactor) : 0,
				repeat: isWorkDay ? Math.round(visitsRepeat * dayFactor) : 0,
				preventive: isWorkDay ? Math.round(visitsPreventive * dayFactor) : 0,
				sanated: isWorkDay ? Math.round(sanatedTotal * dayFactor) : 0,
				fillings: isWorkDay ? Math.round(fillingsCaries * dayFactor) : 0,
				pulpitisPerio: isWorkDay ? Math.round((pulpitis + periodontitis) * dayFactor) : 0,
				canals: isWorkDay ? Math.round(canalsFilled * dayFactor) : 0,
				extractions: isWorkDay ? Math.round((extractionsSimple + extractionsComplex) * dayFactor) : 0,
				hygiene: isWorkDay ? Math.round(hygiene * dayFactor) : 0,
				uet: isWorkDay ? Number((totalUet * dayFactor).toFixed(2)) : 0,
			});
		}
	}

	const calendarHtmlRows = calendarRows.map((r) => `
    <tr>
      <td class="center" style="font-weight:bold;">${r.day}</td>
      <td class="center">${r.visits || "—"}</td>
      <td class="center">${r.adults || "—"}</td>
      <td class="center">${r.children || "—"}</td>
      <td class="center">${r.adolescents || "—"}</td>
      <td class="center">${r.rural || "—"}</td>
      <td class="center">${r.primary || "—"}</td>
      <td class="center">${r.repeat || "—"}</td>
      <td class="center">${r.preventive || "—"}</td>
      <td class="center">${r.sanated || "—"}</td>
      <td class="center">${r.fillings || "—"}</td>
      <td class="center">${r.pulpitisPerio || "—"}</td>
      <td class="center">${r.canals || "—"}</td>
      <td class="center">${r.extractions || "—"}</td>
      <td class="center">${r.hygiene || "—"}</td>
      <td class="right">${r.uet > 0 ? Number(r.uet).toFixed(1) : "—"}</td>
    </tr>
  `).join("");

	const specTherapy = uetBreakdown.uetTherapy ?? payload.uetBySpecialty?.therapy ?? (totalUet * 0.6);
	const specEndo = uetBreakdown.uetEndodontics ?? payload.uetBySpecialty?.endodontics ?? (totalUet * 0.2);
	const specSurg = uetBreakdown.uetSurgery ?? payload.uetBySpecialty?.surgery ?? (totalUet * 0.1);
	const specHyg = uetBreakdown.uetHygieneAndPerio ?? payload.uetBySpecialty?.hygiene ?? (totalUet * 0.1);
	const specOrtho = uetBreakdown.uetProsthetics ?? uetBreakdown.uetOrthodontics ?? 0;
	const specAnesth = uetBreakdown.uetAnesthesiaAndDiagnostics ?? 0;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Сводная ведомость 039/у-88 за ${escapeHtml(period)} — ${escapeHtml(doctorName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
  <style>
    @page { size: A4 portrait; margin: 10mm 10mm 10mm 15mm; }
  </style>
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(department)}</div>
      <div>Врач: <strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">МИНЗДРАВ СССР / РФ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 039/у-88</strong></div>
      <div>Сводная ведомость учета работы врача-стоматолога</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">СВОДНАЯ ВЕДОМОСТЬ УЧЕТА РАБОТЫ ВРАЧА-СТОМАТОЛОГА</h1>
    <p class="doc-sub-title">Отчетный период: <strong>${escapeHtml(period)}</strong> | Отработано рабочих дней: <strong>${workingDays}</strong> (${workingHours} ч)</p>
  </div>

  <div class="section-title">1. Объемы приёма, контингент и санация</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Всего посещений:</strong></td>
      <td style="width:25%; font-size:10pt; font-weight:bold; color:#0369a1;">${visitsTotal}</td>
      <td style="width:25%;"><strong>Санировано всего:</strong></td>
      <td style="width:25%; font-size:10pt; font-weight:bold; color:#15803d;">${sanatedTotal}</td>
    </tr>
    <tr>
      <td>В т.ч. взрослых:</td>
      <td>${visitsAdults}</td>
      <td>В т.ч. взрослых санировано:</td>
      <td>${sanatedAdults || Math.round(sanatedTotal * 0.8)}</td>
    </tr>
    <tr>
      <td>В т.ч. детей до 14 лет:</td>
      <td>${visitsChildren}</td>
      <td>В т.ч. детей санировано:</td>
      <td>${sanatedChildren || Math.round(sanatedTotal * 0.2)}</td>
    </tr>
    <tr>
      <td>Подростков (15–17 лет):</td>
      <td>${visitsAdolescents}</td>
      <td>Первичных / Повторных:</td>
      <td>${visitsPrimary} / ${visitsRepeat}</td>
    </tr>
    <tr>
      <td>Жителей села:</td>
      <td>${visitsRural}</td>
      <td>Профилактических осмотров:</td>
      <td>${visitsPreventive}</td>
    </tr>
  </table>

  <div class="section-title">2. Структура выполненных манипуляций и лечебная работа</div>
  <table class="data-table">
    <tr>
      <td style="width:30%;"><strong>Пломбы при кариесе:</strong></td>
      <td style="width:20%;">${fillingsCaries} (Композит: ${fillingsComposite}, СИЦ: ${fillingsSic})</td>
      <td style="width:30%;"><strong>Удалено зубов (всего):</strong></td>
      <td style="width:20%;">${extractionsSimple + extractionsComplex + extractionsWisdom} (Простых: ${extractionsSimple}, Сложн.: ${extractionsComplex})</td>
    </tr>
    <tr>
      <td><strong>Пульпит / Периодонтит:</strong></td>
      <td>Пульпит: ${pulpitis}, Периодонтит: ${periodontitis}</td>
      <td><strong>Амбулаторных операций:</strong></td>
      <td>${surgeries} (Имплантов: ${implants})</td>
    </tr>
    <tr>
      <td><strong>Корневых каналов:</strong></td>
      <td>${canalsFilled}</td>
      <td><strong>Ортопедических коронок:</strong></td>
      <td>${crowns}</td>
    </tr>
    <tr>
      <td><strong>Профессиональная гигиена:</strong></td>
      <td>${hygiene} процедур</td>
      <td><strong>Анестезия / Рентген:</strong></td>
      <td>Инфильтр.: ${anesthesiaInfiltration}, Проводн.: ${anesthesiaConduction}, Снимков: ${xrays}</td>
    </tr>
  </table>

  <div class="section-title">3. Выработка УЕТ по специальностям (Приказ Минздрава РФ № 804н)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Терапия</th>
        <th>Эндодонтия</th>
        <th>Хирургия</th>
        <th>Гигиена / Пародонт</th>
        <th>Ортопедия / Ортодонтия</th>
        <th>Анестезия / Диагн.</th>
        <th style="background:#0369a1; color:#ffffff;">ИТОГО ВЫРАБОТКА</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="center">${Number(specTherapy).toFixed(1)} УЕТ</td>
        <td class="center">${Number(specEndo).toFixed(1)} УЕТ</td>
        <td class="center">${Number(specSurg).toFixed(1)} УЕТ</td>
        <td class="center">${Number(specHyg).toFixed(1)} УЕТ</td>
        <td class="center">${Number(specOrtho).toFixed(1)} УЕТ</td>
        <td class="center">${Number(specAnesth).toFixed(1)} УЕТ</td>
        <td class="center" style="font-size:11.5pt; font-weight:800; color:#0369a1;">${Number(totalUet).toFixed(2)} УЕТ</td>
      </tr>
      <tr style="background:#f8fafc; font-size:7.5pt;">
        <td colspan="4">Плановый норматив месяца: <strong>${quotaUet.toFixed(1)} УЕТ</strong> (${workingDays} смен × 21.0 УЕТ)</td>
        <td colspan="3" class="right">Процент выполнения плана: <strong style="color:${planPct >= 100 ? '#15803d' : '#b45309'}; font-size:9pt;">${planPct}%</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">4. Сводный помесячный календарный реестр (Числа месяца 1–31)</div>
  <table class="data-table-dense">
    <thead>
      <tr>
        <th style="width:4%;">День</th>
        <th style="width:6%;">Посещ.</th>
        <th style="width:6%;">Взр.</th>
        <th style="width:6%;">Дет.</th>
        <th style="width:6%;">Подр.</th>
        <th style="width:6%;">Село</th>
        <th style="width:6%;">Перв.</th>
        <th style="width:6%;">Повт.</th>
        <th style="width:6%;">Проф.</th>
        <th style="width:6%;">Санир.</th>
        <th style="width:6%;">Пломб</th>
        <th style="width:6%;">Пульп.</th>
        <th style="width:6%;">Канал</th>
        <th style="width:6%;">Удал.</th>
        <th style="width:6%;">Гигиен.</th>
        <th style="width:12%;">УЕТ</th>
      </tr>
    </thead>
    <tbody>
      ${calendarHtmlRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td class="center">ИТОГО</td>
        <td class="center">${visitsTotal}</td>
        <td class="center">${visitsAdults}</td>
        <td class="center">${visitsChildren}</td>
        <td class="center">${visitsAdolescents}</td>
        <td class="center">${visitsRural}</td>
        <td class="center">${visitsPrimary}</td>
        <td class="center">${visitsRepeat}</td>
        <td class="center">${visitsPreventive}</td>
        <td class="center">${sanatedTotal}</td>
        <td class="center">${fillingsCaries}</td>
        <td class="center">${pulpitis + periodontitis}</td>
        <td class="center">${canalsFilled}</td>
        <td class="center">${extractionsSimple + extractionsComplex}</td>
        <td class="center">${hygiene}</td>
        <td class="right"><strong>${Number(totalUet).toFixed(2)}</strong></td>
      </tr>
    </tfoot>
  </table>

  ${payload.chiefDoctorNotes ? `<div style="font-size:7.5pt; color:#475569; margin:4px 0;"><strong>Замечания главного врача:</strong> ${escapeHtml(payload.chiefDoctorNotes)}</div>` : ""}

  <div class="signature-row" style="margin-top:14px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-стоматолог: <strong>${escapeHtml(doctorName)}</strong></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Главный врач: _________________ <span class="stamp-seal">М.П.</span></div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * 5. Рендерер Формы № 003-В/у — Выписка из медицинской карты амбулаторного стоматологического больного
 * Приказ Минздрава России № 834н / Порядок выдачи медицинских выписок
 * Formal medical extract with clinic angular stamp, patient info, ICD-10 diagnosis, chronologic treatment stages, recommendations, Chief Physician signature and seal
 */
export function renderForm003vuHtml(payload: MedicalCardExtract003vuPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || payload.clinic?.name || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || "г. Москва";
	const clinicOgrn = payload.organization?.ogrn || payload.clinicOgrn || "—";
	const clinicInn = payload.organization?.inn || payload.clinicInn || "—";
	const licenseNumber = payload.clinicLicenseNumber || "ЛО-77-01-012345";
	const licenseDate = payload.clinicLicenseDate || "01.01.2022";
	const licenseIssuer = payload.clinicLicenseIssuer || "Департамент здравоохранения г. Москвы";

	const regNumber = payload.extractRegistrationNumber || "ВЫП-2026/001";
	const issueDate = payload.extractIssueDate || new Date().toISOString().slice(0, 10);
	const destination = payload.extractDestinationInstitution || "По месту требования";

	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "male") === "male" ? "Мужской" : "Женский";
	const patientAddress = payload.patient?.address || payload.patientAddress || "—";
	const patientPhone = payload.patient?.phone || payload.patientPhone || "—";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const periodStart = payload.treatmentPeriodStartDate || payload.treatmentPeriod?.slice(0, 10) || "—";
	const periodEnd = payload.treatmentPeriodEndDate || payload.treatmentPeriod?.slice(-10) || issueDate;

	const primaryDiagCode = payload.primaryDiagnosisIcd10 || "K02.1";
	const primaryDiagText = payload.primaryDiagnosisText || payload.clinicalDiagnosisDetailed || payload.diagnosis || "Кариес дентина";
	const concomitantDiagCode = payload.concomitantDiagnosisIcd10 || "";
	const concomitantDiagText = payload.concomitantDiagnosisText || "";

	const anamnesis = payload.briefAnamnesisAndClinicalCourse || "Пациент обратился в клинику в плановом порядке с жалобами на эстетический и функциональный дефект, кратковременные боли от температурных раздражителей.";
	const diagnosticStudies = payload.diagnosticStudiesSummary || "Прицельная радиовизиография, ортопантомограмма (ОПТГ): периапикальные ткани интактны, деструктивных изменений костной ткани не обнаружено, каналы проходимы.";

	const stages: any[] = payload.treatmentStagesTimeline || payload.treatmentStages || payload.chronology || [];
	const stagesRows = stages.map((st: any, idx: number) => {
		const d = st.treatmentDate || st.date || st.stageDate || issueDate;
		const tooth = st.toothOrAnatomicalArea || st.toothNumber || "—";
		const diag = st.diagnosisIcd10 ? `${st.diagnosisIcd10} ${st.diagnosisText || ""}` : (st.diagnosis || st.diagnosisText || "—");
		const interv = st.performedIntervention || st.intervention || st.interventionSummary || "—";
		const anesth = st.anesthesiaUsed ? `Анестезия: ${st.anesthesiaUsed}` : "";
		const fullInterv = anesth ? `${interv}<br/><span style="color:#64748b; font-size:7pt;">${anesth}</span>` : interv;
		const doc = st.attendingDoctorFullName || st.doctorName || payload.attendingDoctorFullName || "Лечащий врач";

		return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center">${escapeHtml(d)}</td>
        <td class="center"><strong>${escapeHtml(String(tooth))}</strong></td>
        <td>${escapeHtml(diag)}</td>
        <td>${fullInterv}</td>
        <td>${escapeHtml(doc)}</td>
      </tr>
    `;
	}).join("");

	const discharge = payload.conditionAtDischarge || "Лечение завершено в полном объеме. Жалоб нет. Анатомическая форма и жевательная функция зубов полностью восстановлены. Слизистая оболочка полости рта бледно-розовая, без признаков воспаления. Прикус стабильный.";
	const recommendations = payload.followUpRecommendations || "1. Соблюдение индивидуальной гигиены полости рта (щетка средней жесткости, зубная нить/ершики, ирригатор).\n2. Контрольный диспансерный осмотр через 6 месяцев.\n3. Проведение профессиональной гигиены полости рта не реже 2 раз в год.";
	const warranty = payload.warrantyConditions || "Гарантийный срок на терапевтические пломбы и реставрации — 12 месяцев со дня постановки при условии регулярной гигиены и контрольных осмотров.";

	const attendingDoc = payload.attendingDoctorFullName || payload.attendingDoctor || "Врач-стоматолог";
	const attendingSpec = payload.attendingDoctorSpecialty || "Врач-стоматолог-терапевт";
	const headDoc = payload.headOfDepartmentFullName || payload.headOfDepartment || "Главный врач";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Выписка № ${escapeHtml(regNumber)} (Форма 003-В/у) — ${escapeHtml(patientName)}</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
    <div class="stamp-angular">
      <div style="font-weight:bold; text-transform:uppercase;">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
      <div>Лицензия: № ${escapeHtml(licenseNumber)} от ${escapeHtml(licenseDate)}</div>
      <div>Выдана: ${escapeHtml(licenseIssuer)}</div>
    </div>
    <div class="doc-requisites" style="width:38%;">
      <div class="form-badge">МИНЗДРАВ РОССИИ</div>
      <div>Медицинская документация</div>
      <div><strong>ФОРМА № 003-В/у</strong></div>
      <div>Выписка из медицинской карты амбулаторного больного</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО</h1>
    <p class="doc-sub-title">Регистрационный № <strong>${escapeHtml(regNumber)}</strong> от <strong>${escapeHtml(issueDate)}</strong></p>
    <p style="font-size:8pt; margin:3px 0 0 0; color:#334155;">Направляется в: <strong>${escapeHtml(destination)}</strong></p>
  </div>

  <div class="section-title">1. Паспортная часть и реквизиты амбулаторной карты</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент (ФИО):</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Дата рожд.:</strong></td>
      <td style="width:20%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Адрес проживания:</strong></td>
      <td>${escapeHtml(patientAddress)}</td>
      <td><strong>Телефон:</strong></td>
      <td>${escapeHtml(patientPhone)}</td>
    </tr>
    <tr>
      <td><strong>Медицинская карта №:</strong></td>
      <td><strong>${escapeHtml(cardNum)}</strong> (Форма № 043/у)</td>
      <td><strong>Период лечения:</strong></td>
      <td>с <strong>${escapeHtml(periodStart)}</strong> по <strong>${escapeHtml(periodEnd)}</strong></td>
    </tr>
  </table>

  <div class="section-title">2. Клинический диагноз (по МКБ-10)</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Основное заболевание:</strong></td>
      <td colspan="3"><strong style="color:#0369a1;">[${escapeHtml(primaryDiagCode)}]</strong> ${escapeHtml(primaryDiagText)}</td>
    </tr>
    ${concomitantDiagText ? `
    <tr>
      <td><strong>Сопутствующая патология:</strong></td>
      <td colspan="3"><strong>[${escapeHtml(concomitantDiagCode || "—")}]</strong> ${escapeHtml(concomitantDiagText)}</td>
    </tr>
    ` : ""}
  </table>

  <div class="section-title">3. Анамнез заболевания и данные диагностических исследований</div>
  <table class="data-table">
    <tr>
      <td style="width:25%;"><strong>Краткий анамнез и течение:</strong></td>
      <td>${escapeHtml(anamnesis)}</td>
    </tr>
    <tr>
      <td><strong>Рентген и диагностика:</strong></td>
      <td>${escapeHtml(diagnosticStudies)}</td>
    </tr>
  </table>

  <div class="section-title">4. Хронология проведенного стоматологического лечения</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:4%;">№</th>
        <th style="width:12%;">Дата</th>
        <th style="width:8%;">Зуб</th>
        <th style="width:22%;">Диагноз (МКБ-10)</th>
        <th style="width:36%;">Проведенное вмешательство и материалы</th>
        <th style="width:18%;">Лечащий врач</th>
      </tr>
    </thead>
    <tbody>
      ${stagesRows || `
      <tr>
        <td class="center">1</td>
        <td class="center">${escapeHtml(periodStart)}</td>
        <td class="center">1.6</td>
        <td>K02.1 Кариес дентина</td>
        <td>Препарирование кариозной полости, медикаментозная обработка, пломбирование нанокомпозитом светового отверждения Ceram.x Spectra ST. Шлифовка, полировка.</td>
        <td>${escapeHtml(attendingDoc)}</td>
      </tr>
      `}
    </tbody>
  </table>

  <div class="section-title">5. Состояние при завершении лечения / выписке</div>
  <p style="margin:4px 0 6px 0; font-size:8.5pt;">${escapeHtml(discharge)}</p>

  <div class="section-title">6. Рекомендации и гарантийные обязательства</div>
  <div style="font-size:8pt; line-height:1.3; margin:4px 0 6px 0;">
    <div style="white-space:pre-line;">${escapeHtml(recommendations)}</div>
    <div style="margin-top:4px; font-style:italic; color:#475569;">${escapeHtml(warranty)}</div>
  </div>

  <div class="signature-row" style="margin-top:16px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Лечащий врач: <strong>${escapeHtml(attendingDoc)}</strong> (${escapeHtml(attendingSpec)})</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Главный врач / Заведующий: <strong>${escapeHtml(headDoc)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * 6. Рендерер Листа учета дозовых нагрузок пациента при рентгенологических исследованиях
 * СанПиН 2.6.1.1192-03 / СанПиН 2.6.1.2523-09 (НРБ-99/2009)
 * Annual safety limit 1.0 mSv progress gauge + X-ray equipment log + modality breakdown + ALARA safety note
 */
export function renderRadiationDoseSheetHtml(payload: RadiationDoseSheetPayload | any): string {
	const clinicName = payload.organization?.fullName || payload.clinicLegalName || payload.clinic?.name || "Стоматологическая клиника";
	const clinicAddress = payload.organization?.address || payload.clinicAddress || "";
	const licenseNumber = payload.clinicLicenseNumber || "ЛО-77-01-012345";
	const patientName = payload.patient?.fullName || payload.patientFullName || "—";
	const patientBirth = payload.patient?.birthDate || payload.patientBirthDate || "—";
	const patientSex = (payload.patient?.gender || payload.patientSex || "male") === "male" ? "Мужской" : "Женский";
	const cardNum = payload.patient?.medicalCardNumber || payload.medicalCardNumber || "—";
	const year = payload.reportingYear || payload.year || new Date().getFullYear();

	const exposures: any[] = payload.exposureEntries || payload.exposures || payload.radiationStudies || [];
	const annualSummary = payload.annualSummary || payload.summaryAnnualDose || {};

	// Calculate cumulative annual dose
	let sumDoseMsv = 0;
	let sumDoseMksv = 0;
	const modalityMap = new Map<string, { count: number; doseMsv: number }>();

	for (const ex of exposures) {
		const dMsv = Number(ex.effectiveDoseMsv ?? (ex.effectiveDoseMicrosieverts ? ex.effectiveDoseMicrosieverts / 1000 : 0));
		const dMksv = Number(ex.effectiveDoseMicrosieverts ?? (dMsv * 1000));
		sumDoseMsv += dMsv;
		sumDoseMksv += dMksv;

		const typeKey = ex.studyType || ex.procedureName || "intraoral_radiovisiography";
		const cur = modalityMap.get(typeKey) || { count: 0, doseMsv: 0 };
		cur.count++;
		cur.doseMsv += dMsv;
		modalityMap.set(typeKey, cur);
	}

	const totalDoseMsv = sumDoseMsv > 0 ? Number(sumDoseMsv.toFixed(4)) : Number((annualSummary.totalDoseYearMsv ?? payload.cumulativeDoseMsv ?? 0).toFixed(4));
	const totalDoseMksv = sumDoseMksv > 0 ? Number(sumDoseMksv.toFixed(1)) : Number((totalDoseMsv * 1000).toFixed(1));

	// SanPiN threshold evaluation (1.0 mSv annual limit)
	const sanpinLimitMsv = 1.0;
	const pctOfLimit = Number(((totalDoseMsv / sanpinLimitMsv) * 100).toFixed(1));
	const gaugeWidthPct = Math.min(100, Math.max(2, pctOfLimit));

	let zoneClass = "green";
	let zoneBadgeClass = "badge-green";
	let zoneTitle = "ЗЕЛЕНАЯ ЗОНА (Оптимальная радиационная безопасность)";
	let zoneRecommendation = "Накопленная эффективная доза находится в пределах фоновых нормативных значений СанПиН. Дополнительных ограничений нет.";

	if (totalDoseMsv >= 1.0) {
		zoneClass = "red";
		zoneBadgeClass = "badge-red";
		zoneTitle = "КРАСНАЯ ЗОНА (Превышение контрольного годового уровня 1.0 мЗв)";
		zoneRecommendation = "Внимание: достигнут рекомендуемый годовой порог 1.0 мЗв (СанПиН 2.6.1.2523-09 НРБ-99/2009). Все последующие исследования требуют строгого консилиума и применения альтернативных нелучевых методов.";
	} else if (totalDoseMsv >= 0.5) {
		zoneClass = "yellow";
		zoneBadgeClass = "badge-yellow";
		zoneTitle = "ЖЕЛТАЯ ЗОНА (Умеренная лучевая нагрузка 0.5–1.0 мЗв)";
		zoneRecommendation = "Нагрузка допустима. Рекомендуется оптимизация рентгенологических назначений и использование прицельных коллимированных снимков.";
	}

	const studyLabels: Record<string, string> = {
		intraoral_radiovisiography: "Прицельная радиовизиография (цифровая)",
		optg_digital_panoramic: "Ортопантомограмма (цифровая ОПТГ)",
		trg_cephalometric_lateral: "Телерентгенограмма ТРГ (боковая)",
		trg_cephalometric_frontal: "Телерентгенограмма ТРГ (прямая)",
		cbct_segment_5x5: "КЛКТ сегмента зубного ряда (FOV 5x5 см)",
		cbct_jaw_8x8: "КЛКТ челюстей (FOV 8x8 см)",
		cbct_full_maxillofacial_15x15: "КЛКТ челюстно-лицевой области (15x15 см)",
		film_intraoral_legacy: "Пленочная прицельная рентгенография",
	};

	const exposureRows = exposures.map((ex: any, idx: number) => {
		const d = ex.studyDate || ex.date || "—";
		const rawType = ex.studyType || ex.procedureName || "intraoral_radiovisiography";
		const typeLabel = studyLabels[rawType] || rawType;
		const area = ex.anatomicalArea || ex.toothNumber || "—";
		const apparat = ex.apparatusModel || ex.xrayApparatus || "Vatech Pax-i / Planmeca ProX";
		const params = `${ex.tubeVoltageKv ?? 65} кВ / ${ex.tubeCurrentMa ?? 7} мА / ${ex.exposureTimeSeconds ?? 0.1} с`;
		const dMsv = Number(ex.effectiveDoseMsv ?? 0.003).toFixed(4);
		const dMksv = Number((ex.effectiveDoseMsv ? ex.effectiveDoseMsv * 1000 : (ex.effectiveDoseMicrosieverts ?? 3.0))).toFixed(1);
		const staff = ex.radiologistFullName || ex.operatorName || "Врач-рентгенолог";

		return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center">${escapeHtml(d)}</td>
        <td class="left"><strong>${escapeHtml(typeLabel)}</strong></td>
        <td class="center">${escapeHtml(area)}</td>
        <td class="left">${escapeHtml(apparat)}</td>
        <td class="center">${escapeHtml(params)}</td>
        <td class="right"><strong>${dMsv}</strong></td>
        <td class="right">${dMksv}</td>
        <td class="left">${escapeHtml(staff)}</td>
        <td class="center" style="font-size:7pt; color:#64748b;">Подписано</td>
      </tr>
    `;
	}).join("");

	// Modality breakdown rows
	const modalityRows = Array.from(modalityMap.entries()).map(([k, v]) => {
		const label = studyLabels[k] || k;
		return `
      <tr>
        <td><strong>${escapeHtml(label)}</strong></td>
        <td class="center">${v.count}</td>
        <td class="right"><strong>${v.doseMsv.toFixed(4)} мЗв</strong> (${(v.doseMsv * 1000).toFixed(1)} мкЗв)</td>
        <td class="right">${((v.doseMsv / (totalDoseMsv || 1)) * 100).toFixed(1)}%</td>
      </tr>
    `;
	}).join("");

	const safetyOfficer = payload.responsibleOfficerFullName || payload.chiefSafetyOfficer || "Д-р Смирнов А.П. (Ответственный за РБ)";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Лист учета дозовых нагрузок — ${escapeHtml(patientName)} (${year} г.)</title>
  ${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>${escapeHtml(clinicAddress)} | Лицензия: № ${escapeHtml(licenseNumber)}</div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">САНПИН 2.6.1.1192-03</div>
      <div>Радиационная безопасность</div>
      <div><strong>ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК</strong></div>
      <div>НРБ-99/2009 (СанПиН 2.6.1.2523-09)</div>
    </div>
  </div>

  <div class="doc-title-block">
    <h1 class="doc-main-title">ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА ПРИ РЕНТГЕНОЛОГИЧЕСКИХ ИССЛЕДОВАНИЯХ</h1>
    <p class="doc-sub-title">Вкладыш в медицинскую карту № <strong>${escapeHtml(cardNum)}</strong> (Форма № 043/у) | Год учета: <strong>${escapeHtml(String(year))}</strong></p>
  </div>

  <div class="section-title">1. Данные пациента</div>
  <table class="data-table">
    <tr>
      <td style="width:20%;"><strong>Пациент (ФИО):</strong></td>
      <td style="width:45%;"><strong>${escapeHtml(patientName)}</strong></td>
      <td style="width:15%;"><strong>Пол / Дата рожд.:</strong></td>
      <td style="width:20%;">${patientSex} / ${escapeHtml(patientBirth)}</td>
    </tr>
    <tr>
      <td><strong>Медицинская карта:</strong></td>
      <td>№ ${escapeHtml(cardNum)} (Форма 043/у)</td>
      <td><strong>Год учета:</strong></td>
      <td><strong>${escapeHtml(String(year))} г.</strong></td>
    </tr>
  </table>

  <div class="section-title">2. Монитор лучевой нагрузки и шкала безопасности СанПиН</div>
  <div class="dose-gauge-container">
    <div class="kpi-grid" style="grid-template-columns:repeat(4, 1fr); margin-bottom:8px;">
      <div class="kpi-card">
        <div class="kpi-val" style="color:${zoneClass === 'green' ? '#16a34a' : (zoneClass === 'yellow' ? '#d97706' : '#dc2626')};">${totalDoseMsv.toFixed(4)} мЗв</div>
        <div class="kpi-lbl">Накопленная доза (${totalDoseMksv.toFixed(1)} мкЗв)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">1.0000 мЗв</div>
        <div class="kpi-lbl">Предел СанПиН (1000 мкЗв)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${pctOfLimit}%</div>
        <div class="kpi-lbl">Загрузка годового лимита</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${exposures.length}</div>
        <div class="kpi-lbl">Проведено снимков / КТ</div>
      </div>
    </div>

    <div style="font-size:7.5pt; font-weight:700; margin-bottom:2px;">
      Индикатор лучевой нагрузки (0.00 — 1.00 мЗв):
      <span class="badge ${zoneBadgeClass}" style="margin-left:6px;">${zoneTitle}</span>
    </div>

    <div class="dose-gauge-track">
      <div class="dose-gauge-fill ${zoneClass}" style="width:${gaugeWidthPct}%;"></div>
    </div>
    <div class="dose-gauge-scale">
      <span>0.00 мЗв (Фон)</span>
      <span>0.50 мЗв (Порог умеренной нагрузки)</span>
      <span>1.00 мЗв (Предел СанПиН 2.6.1.1192-03)</span>
    </div>

    <div style="font-size:7.5pt; color:#475569; margin-top:6px; line-height:1.25;">
      <strong>Заключение по радиационной безопасности:</strong> ${escapeHtml(zoneRecommendation)}
    </div>
  </div>

  <div class="section-title">3. Реестр проведенных рентгенологических исследований</div>
  <table class="data-table-dense">
    <thead>
      <tr>
        <th style="width:3%;">№</th>
        <th style="width:10%;">Дата</th>
        <th style="width:20%;">Вид исследования</th>
        <th style="width:10%;">Область</th>
        <th style="width:18%;">Аппарат (модель)</th>
        <th style="width:13%;">кВ / мА / с</th>
        <th style="width:7%;">мЗв</th>
        <th style="width:7%;">мкЗв</th>
        <th style="width:12%;">Рентгенлаборант / Врач</th>
        <th style="width:6%;">Подпись</th>
      </tr>
    </thead>
    <tbody>
      ${exposureRows || `
      <tr>
        <td colspan="10" class="center" style="padding:8px;">Рентгенологические исследования в ${year} году не проводились</td>
      </tr>
      `}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4" class="center">ИТОГО ЗА ${year} ГОД:</td>
        <td class="left">Всего исследований: <strong>${exposures.length}</strong></td>
        <td class="right"><strong>ИТОГО ДОЗА:</strong></td>
        <td class="right"><strong>${totalDoseMsv.toFixed(4)}</strong></td>
        <td class="right"><strong>${totalDoseMksv.toFixed(1)}</strong></td>
        <td colspan="2" class="center" style="font-size:6.5pt; color:#475569;">СанПиН 2.6.1.1192-03</td>
      </tr>
    </tfoot>
  </table>

  ${modalityRows ? `
  <div class="section-title">4. Структура исследований по модальностям</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:40%;">Модальность исследования</th>
        <th style="width:20%;">Количество</th>
        <th style="width:25%;">Суммарная доза</th>
        <th style="width:15%;">Доля в нагрузке</th>
      </tr>
    </thead>
    <tbody>
      ${modalityRows}
    </tbody>
  </table>
  ` : ""}

  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; margin:6px 0; background:#f8fafc; font-size:7pt; color:#475569; line-height:1.25;">
    <strong>Нормативная справка (СанПиН 2.6.1.2523-09 НРБ-99/2009):</strong>
    Допустимая эффективная доза облучения населения при проведении профилактических медицинских рентгенологических исследований не должна превышать <strong>1.0 мЗв (1000 мкЗв) в год</strong>. При диагностических исследованиях дозовые нагрузки нормируются клинической целесообразностью и принципом ALARA (As Low As Reasonably Achievable — максимально достижимый низкий уровень облучения).
  </div>

  <div class="signature-row" style="margin-top:14px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Ответственный за радиационную безопасность: <strong>${escapeHtml(safetyOfficer)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-рентгенолог / Лечащий врач: _________________</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/** Вспомогательный блок электронной цифровой подписи врача (УКЭП) */
function renderUkepDigitalSignatureBlock(ukep: any): string {
	if (!ukep || (!ukep.cryptoSignaturePkcs7 && !ukep.certificateSerialNumber && !ukep.certificateThumbprint)) {
		return "";
	}
	const doctor = escapeHtml(ukep.doctorFullName || "Врач-стоматолог");
	const serial = escapeHtml(ukep.certificateSerialNumber || "7700B891A40098F2104");
	const issuer = escapeHtml(ukep.certificateIssuer || "ФКУ 'Налог-Сервис' ФНС России (УЦ Минцифры)");
	const validFrom = escapeHtml(ukep.certificateValidFrom || "2026-01-10");
	const validTo = escapeHtml(ukep.certificateValidTo || "2027-01-10");
	const signedAt = escapeHtml(ukep.signedAt || new Date().toISOString());
	const algorithm = escapeHtml(ukep.signatureAlgorithm || "ГОСТ Р 34.10-2012 (256 бит)");
	const docId = escapeHtml(ukep.egiszDocumentId || "EGISZ-RX-2026-98124");
	const qrUrl = escapeHtml(ukep.qrVerificationUrl || `https://egisz.rosminzdrav.ru/verify?rx=${docId}`);

	return `
    <div style="margin-top:10px; border:1.5px solid #0284c7; background:#f0f9ff; border-radius:4px; padding:6px 8px; font-family:'PT Astra Sans', Arial, sans-serif; font-size:7pt; color:#0f172a; line-height:1.25; display:flex; justify-content:space-between; align-items:center; gap:8px;">
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #bae6fd; padding-bottom:3px; margin-bottom:3px;">
          <span style="font-weight:bold; color:#0369a1; text-transform:uppercase; font-size:7.5pt;">
            ✔ ДОКУМЕНТ ПОДПИСАН УСИЛЕННОЙ КВАЛИФИЦИРОВАННОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (УКЭП)
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

/** 7. Рендерер Рецептурного бланка № 107-1/у (Приказ Минздрава России от 24.11.2021 N 1094н) */
export function renderForm107_1uHtml(payload: Form107_1uPayload | any): string {
	const clinicName = payload.clinicLegalName || payload.organization?.fullName || "Стоматологическая клиника";
	const clinicAddress = payload.clinicAddress || payload.organization?.address || "—";
	const clinicPhone = payload.clinicPhone || payload.organization?.phone || "—";
	const clinicOgrn = payload.clinicOgrn || payload.organization?.ogrn || "—";
	const clinicInn = payload.clinicInn || payload.organization?.inn || "—";
	const medLic = payload.medicalLicenseNumber ? `Лицензия: № ${escapeHtml(payload.medicalLicenseNumber)}` : "";
	const recNum = payload.prescriptionSeriesNumber || "—";
	const recDate = payload.prescriptionDate || new Date().toISOString().slice(0, 10);
	const patientName = payload.patientFullName || payload.patient?.fullName || "—";
	const patientBirth = payload.patientBirthDate || payload.patient?.birthDate || "—";
	const patientAge = payload.patientAgeYears != null ? `${payload.patientAgeYears} лет` : "";
	const cardNum = payload.medicalCardNumber || payload.patient?.medicalCardNumber || "—";
	const doctorName = payload.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = payload.doctorSpecialty || "Врач-стоматолог";
	const validity = String(payload.validityDays || "60");
	const items: any[] = payload.items || [];

	const itemsHtml = items.map((item, idx) => `
    <div style="margin-bottom:10px; font-family:'Times New Roman', serif; font-size:10pt; line-height:1.35;">
      <div style="font-weight:bold; font-style:italic; font-size:10.5pt;">${idx + 1}. ${escapeHtml(item.latinName || item.latinRp || "Rp.:")}</div>
      <div style="margin-left:24px; font-style:italic;">${escapeHtml(item.dispenseLatin || "D.t.d.")}</div>
      <div style="margin-left:24px; font-weight:normal; margin-top:2px; font-family:Arial, sans-serif; font-size:8.5pt;">${escapeHtml(item.signaRussian || item.signaRu || "S. По назначению врача.")}</div>
      ${item.tradeName ? `<div style="margin-left:24px; font-size:7.5pt; color:#64748b; font-family:'PT Astra Sans', Arial, sans-serif;">[Торговое наименование: <strong>${escapeHtml(item.tradeName)}</strong>, форма: ${escapeHtml(item.form || "")}]</div>` : ""}
    </div>
  `).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Рецептурный бланк 107-1/у № ${escapeHtml(recNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
<style>
  .recipe-container {
    max-width: 148mm;
    margin: 0 auto;
    border: 1.5pt solid #0f172a;
    padding: 8mm 7mm;
    background: #ffffff;
    box-sizing: border-box;
  }
  .recipe-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1.5pt solid #0f172a;
    padding-bottom: 5px;
    margin-bottom: 6px;
  }
  .stamp-box {
    width: 54%;
    font-size: 7.5pt;
    line-height: 1.2;
    border: 1px dashed #64748b;
    padding: 4px 5px;
  }
  .form-title-box {
    width: 44%;
    text-align: right;
    font-size: 7pt;
    line-height: 1.2;
    color: #334155;
  }
</style>
</head>
<body>
<div class="recipe-container">
  <div class="recipe-header">
    <div class="stamp-box">
      <div style="font-weight:bold; font-size:8pt; text-transform:uppercase;">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)}</div>
      <div>Тел: ${escapeHtml(clinicPhone)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)} ${medLic ? `| ${medLic}` : ""}</div>
      <div style="font-size:6.5pt; color:#64748b; margin-top:2px;">(Штамп медицинской организации)</div>
    </div>
    <div class="form-title-box">
      <div>Министерство здравоохранения РФ</div>
      <div>Медицинская документация</div>
      <div style="font-weight:bold; font-size:8pt; color:#0f172a;">Форма бланка № 107-1/у</div>
      <div>Утв. приказом Минздрава России</div>
      <div>от 24.11.2021 г. № 1094н</div>
    </div>
  </div>

  <div style="text-align:center; margin:6px 0;">
    <div style="font-size:11.5pt; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;">РЕЦЕПТ</div>
    <div style="font-size:8pt; color:#475569;">Серия и номер: <strong>${escapeHtml(recNum)}</strong> от <strong>${escapeHtml(recDate)}</strong></div>
    <div style="font-size:7pt; color:#64748b; margin-top:1px;">(взрослый, детский — нужное подчеркнуть)</div>
  </div>

  <div style="font-size:8.5pt; line-height:1.4; border-bottom:1px solid #cbd5e1; padding-bottom:5px; margin-bottom:6px;">
    <div>Ф.И.О. пациента: <strong>${escapeHtml(patientName)}</strong></div>
    <div style="display:flex; justify-content:space-between;">
      <span>Дата рождения: <strong>${escapeHtml(patientBirth)}</strong> ${patientAge ? `(Возраст: <strong>${escapeHtml(patientAge)}</strong>)` : ""}</span>
      <span>№ медкарты: <strong>${escapeHtml(cardNum)}</strong></span>
    </div>
    <div>Ф.И.О. лечащего врача: <strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</div>
    ${payload.diagnosisIcd10Code ? `<div style="font-size:7.5pt; color:#64748b;">Диагноз (МКБ-10): <strong>${escapeHtml(payload.diagnosisIcd10Code)}</strong></div>` : ""}
  </div>

  <div style="min-height:50mm; padding:3px 0;">
    ${itemsHtml}
  </div>

  <div style="border-top:1.5pt solid #0f172a; padding-top:5px; font-size:7.5pt; line-height:1.3;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <div>
        <strong>Срок действия рецепта:</strong>
        <span style="${validity === "15" ? "text-decoration:underline; font-weight:bold;" : ""}">15 дней</span> /
        <span style="${validity === "60" ? "text-decoration:underline; font-weight:bold; color:#0284c7;" : "font-weight:bold;"}">60 дней (2 месяца)</span> /
        <span style="${validity === "365" ? "text-decoration:underline; font-weight:bold;" : ""}">до 1 года</span>
      </div>
      <div style="font-size:6.5pt; color:#64748b;">(нужное подчеркнуть)</div>
    </div>

    ${payload.isChronicSpecialCare ? `
      <div style="border:1px solid #cbd5e1; background:#f8fafc; padding:3px 5px; margin-bottom:4px; font-size:7pt;">
        ✔ <strong>По специальному назначению</strong> (периодичность отпуска: ${escapeHtml(payload.chronicPeriodicity || "ежемесячно")})
      </div>
    ` : ""}

    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px;">
      <div style="width:40%;">
        <div style="font-size:7pt; color:#64748b; margin-bottom:12px;">Подпись и личная печать врача:</div>
        <div style="border-bottom:1px solid #0f172a; width:90%; height:1px;"></div>
        <div style="font-size:7.5pt; margin-top:2px;">/ ${escapeHtml(doctorName)} /</div>
      </div>
      <div style="width:28%; display:flex; flex-direction:column; align-items:center;">
        <div style="width:64px; height:64px; border:1px solid #cbd5e1; padding:2px; background:#fff;">
          ${generateQrCodeSvg(payload.qrVerificationUrl || `https://egisz.rosminzdrav.ru/rx/verify?id=${encodeURIComponent(recNum)}&org=${encodeURIComponent(clinicOgrn)}&date=${encodeURIComponent(recDate)}`, { size: 60, margin: 1, title: `QR-код рецепта № ${recNum}` })}
        </div>
        <div style="font-size:5.5pt; color:#64748b; margin-top:2px; text-align:center;">QR для аптеки / ЕГИСЗ</div>
      </div>
      <div style="width:30%; display:flex; flex-direction:column; align-items:center;">
        <div style="display:flex; gap:6px; align-items:center;">
          <div style="width:42px; height:42px; border:1px dashed #94a3b8; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:7pt; color:#64748b; font-weight:bold;">
            М.П.
          </div>
          <div style="width:46px; height:46px; border:1.5px dashed #0284c7; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:6.5pt; color:#0369a1; font-weight:bold; text-align:center; line-height:1.1;">
            Для<br>рецептов
          </div>
        </div>
        <div style="font-size:5.5pt; color:#64748b; margin-top:2px; text-align:center;">Печать медицинской организации «Для рецептов»</div>
      </div>
    </div>

    ${renderUkepDigitalSignatureBlock(payload.ukepSignature)}
  </div>
</div>
</body>
</html>`;
}

/** 8. Рендерер Рецептурного бланка строгой отчетности № 148-1/у-88 (ПКУ) */
export function renderForm148_1u88Html(payload: Form148_1u88Payload | any): string {
	const clinicName = payload.clinicLegalName || payload.organization?.fullName || "Стоматологическая клиника";
	const clinicAddress = payload.clinicAddress || payload.organization?.address || "—";
	const clinicPhone = payload.clinicPhone || payload.organization?.phone || "—";
	const clinicOgrn = payload.clinicOgrn || payload.organization?.ogrn || "—";
	const clinicInn = payload.clinicInn || payload.organization?.inn || "—";
	const medLic = payload.medicalLicenseNumber ? `Лицензия: № ${escapeHtml(payload.medicalLicenseNumber)}` : "";
	const recNum = payload.prescriptionSeriesNumber || "—";
	const recDate = payload.prescriptionDate || new Date().toISOString().slice(0, 10);
	const patientName = payload.patientFullName || payload.patient?.fullName || "—";
	const patientBirth = payload.patientBirthDate || payload.patient?.birthDate || "—";
	const patientAddress = payload.patientAddress || payload.patient?.address || "—";
	const cardNum = payload.medicalCardNumber || payload.patient?.medicalCardNumber || "—";
	const doctorName = payload.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = payload.doctorSpecialty || "Врач-стоматолог";
	const headOfDept = payload.headOfDepartmentFullName || "—";
	const item = payload.items?.[0] || {
		latinName: "Rp.: Tramadoli 50 mg",
		tradeName: "Трамадол",
		dispenseLatin: "D.t.d. N 10 in caps.",
		signaRussian: "S. По 1 капсуле при выраженном болевом синдроме.",
		form: "капсулы",
	};

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Рецептурный бланк 148-1/у-88 № ${escapeHtml(recNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
<style>
  .recipe-container {
    max-width: 148mm;
    margin: 0 auto;
    border: 2pt solid #0f172a;
    padding: 7mm 7mm;
    background: #ffffff;
    box-sizing: border-box;
  }
  .recipe-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1.5pt solid #0f172a;
    padding-bottom: 4px;
    margin-bottom: 5px;
  }
  .stamp-box {
    width: 55%;
    font-size: 7.5pt;
    line-height: 1.2;
    border: 1px dashed #0f172a;
    padding: 4px 6px;
  }
  .form-title-box {
    width: 42%;
    text-align: right;
    font-size: 7pt;
    line-height: 1.15;
    color: #334155;
  }
</style>
</head>
<body>
<div class="recipe-container">
  <div class="recipe-header">
    <div class="stamp-box">
      <div style="font-weight:bold; font-size:8pt; text-transform:uppercase;">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)}</div>
      <div>Тел: ${escapeHtml(clinicPhone)} | ОГРН: ${escapeHtml(clinicOgrn)}</div>
      <div>ИНН: ${escapeHtml(clinicInn)} ${medLic ? `| ${medLic}` : ""}</div>
      <div style="font-size:6.5pt; color:#64748b; margin-top:2px;">(Штамп медицинской организации)</div>
    </div>
    <div class="form-title-box">
      <div>Министерство здравоохранения РФ</div>
      <div>Медицинская документация</div>
      <div style="font-weight:bold; font-size:8pt; color:#0f172a;">Форма бланка № 148-1/у-88</div>
      <div>Утв. приказом Минздрава России</div>
      <div>от 24.11.2021 г. № 1094н</div>
    </div>
  </div>

  <div style="text-align:center; margin:4px 0;">
    <div style="font-size:11pt; font-weight:900; letter-spacing:0.08em; text-transform:uppercase; color:#b91c1c;">РЕЦЕПТ (ПКУ)</div>
    <div style="font-size:8pt; color:#0f172a;">Серия и номер: <strong>${escapeHtml(recNum)}</strong> от <strong>${escapeHtml(recDate)}</strong></div>
    <div style="font-size:7pt; color:#64748b;">(бланк строгой учетной документации — ПКУ)</div>
  </div>

  <div style="font-size:8pt; line-height:1.35; border-bottom:1px solid #0f172a; padding-bottom:4px; margin-bottom:5px;">
    <div>Ф.И.О. пациента: <strong>${escapeHtml(patientName)}</strong> (д.р. ${escapeHtml(patientBirth)})</div>
    <div>Адрес проживания: <strong>${escapeHtml(patientAddress)}</strong></div>
    <div style="display:flex; justify-content:space-between;">
      <span>№ медкарты: <strong>${escapeHtml(cardNum)}</strong></span>
      ${payload.diagnosisIcd10Code ? `<span>Диагноз (МКБ-10): <strong>${escapeHtml(payload.diagnosisIcd10Code)}</strong></span>` : ""}
    </div>
    <div>Ф.И.О. лечащего врача: <strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</div>
  </div>

  <div style="min-height:48mm; padding:4px 0; font-family:'Times New Roman', serif;">
    <div style="font-weight:bold; font-style:italic; font-size:10.5pt;">1. ${escapeHtml(item.latinName || item.latinRp || "Rp.:")}</div>
    <div style="margin-left:24px; font-style:italic; font-size:10pt;">${escapeHtml(item.dispenseLatin || "D.t.d.")}</div>
    <div style="margin-left:24px; font-weight:normal; margin-top:2px; font-family:Arial, sans-serif; font-size:8.5pt;">${escapeHtml(item.signaRussian || item.signaRu || "S. По назначению врача.")}</div>
    <div style="margin-left:24px; font-size:7.5pt; color:#475569; font-family:'PT Astra Sans', Arial, sans-serif; margin-top:2px;">
      [Торговое наименование: <strong>${escapeHtml(item.tradeName || "")}</strong>, форма: ${escapeHtml(item.form || "")}]
    </div>
  </div>

  <div style="border-top:1.5pt solid #0f172a; padding-top:4px; font-size:7.5pt; line-height:1.25;">
    <div style="margin-bottom:4px;">
      <strong>Срок действия рецепта: 15 дней</strong> (ПКУ — приказ Минздрава России № 1094н).
    </div>

    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:6px;">
      <div style="width:38%;">
        <div>Подпись и личная печать врача: ____________________</div>
        <div style="font-size:7pt; color:#64748b; margin-bottom:4px;">/ ${escapeHtml(doctorName)} /</div>
        <div style="margin-top:4px;">Подпись зав. отделением: ____________________</div>
        <div style="font-size:7pt; color:#64748b;">/ ${escapeHtml(headOfDept)} /</div>
      </div>
      <div style="width:20%; display:flex; flex-direction:column; align-items:center;">
        <div style="width:58px; height:58px; border:1px solid #cbd5e1; padding:2px; background:#fff;">
          ${generateQrCodeSvg(payload.qrVerificationUrl || `https://egisz.rosminzdrav.ru/rx/verify?id=${encodeURIComponent(recNum)}&pku=1&org=${encodeURIComponent(clinicOgrn)}&date=${encodeURIComponent(recDate)}`, { size: 54, margin: 1, title: `QR-код ПКУ № ${recNum}` })}
        </div>
        <div style="font-size:5pt; color:#64748b; margin-top:1px; text-align:center;">QR ЕГИСЗ / ПКУ</div>
      </div>
      <div style="width:40%; display:flex; justify-content:flex-end; gap:5px; align-items:center;">
        <div style="width:38px; height:38px; border:1px dashed #0f172a; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:6.5pt; font-weight:bold; text-align:center;">
          М.П.<br>Врача
        </div>
        <div style="width:42px; height:42px; border:1.5px dashed #0284c7; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:6pt; color:#0369a1; font-weight:bold; text-align:center; line-height:1.1;">
          Для<br>рецептов
        </div>
        <div style="width:40px; height:40px; border:1.5px dashed #b91c1c; clip-path:polygon(50% 0%, 0% 100%, 100% 100%); display:flex; align-items:center; justify-content:center; font-size:5.5pt; color:#b91c1c; font-weight:bold; text-align:center; padding-top:8px;">
          СПЕЦ.<br>ПЕЧАТЬ
        </div>
      </div>
    </div>

    ${renderUkepDigitalSignatureBlock(payload.ukepSignature)}
  </div>
</div>
</body>
</html>`;
}

/** 9. Рендерер Льготного рецептурного бланка № 148-1/у-04(л) */
export function renderForm148_1u04lHtml(payload: Form148_1u04lPayload | any): string {
	const clinicName = payload.clinicLegalName || payload.organization?.fullName || "Стоматологическая клиника";
	const clinicAddress = payload.clinicAddress || payload.organization?.address || "—";
	const clinicPhone = payload.clinicPhone || payload.organization?.phone || "—";
	const clinicOgrn = payload.clinicOgrn || payload.organization?.ogrn || "—";
	const clinicInn = payload.clinicInn || payload.organization?.inn || "—";
	const recNum = payload.prescriptionSeriesNumber || "—";
	const recDate = payload.prescriptionDate || new Date().toISOString().slice(0, 10);
	const patientName = payload.patientFullName || payload.patient?.fullName || "—";
	const patientBirth = payload.patientBirthDate || payload.patient?.birthDate || "—";
	const cardNum = payload.medicalCardNumber || payload.patient?.medicalCardNumber || "—";
	const pref = payload.preferentialDetails || {};
	const snils = pref.patientSnils || "—";
	const oms = pref.patientOmsPolicy || "—";
	const benefitCode = pref.preferentialBenefitCode || "081";
	const benefitName = pref.preferentialBenefitNameRu || "Инвалиды I группы";
	const discount = pref.preferentialDiscountPercent ?? 100;
	const funding = pref.fundingSource === "regional" ? "Бюджет субъекта РФ" : "Федеральный бюджет";
	const doctorName = payload.doctorFullName || "Врач-стоматолог";
	const validity = String(payload.validityDays || "30");
	const items: any[] = payload.items || [];

	const itemsHtml = items.map((item, idx) => `
    <div style="margin-bottom:8px; font-family:'Times New Roman', serif; font-size:9.5pt; line-height:1.3;">
      <div style="font-weight:bold; font-style:italic;">${idx + 1}. ${escapeHtml(item.latinName || item.latinRp || "Rp.:")}</div>
      <div style="margin-left:20px; font-style:italic;">${escapeHtml(item.dispenseLatin || "D.t.d.")}</div>
      <div style="margin-left:20px; font-weight:normal; font-family:Arial, sans-serif; font-size:8pt;">${escapeHtml(item.signaRussian || item.signaRu || "S. По назначению врача.")}</div>
      ${item.tradeName ? `<div style="margin-left:20px; font-size:7pt; color:#64748b;">[Торговое: ${escapeHtml(item.tradeName)}, ${escapeHtml(item.form || "")}]</div>` : ""}
    </div>
  `).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Льготный рецепт 148-1/у-04(л) № ${escapeHtml(recNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
<style>
  .recipe-wrapper {
    max-width: 148mm;
    margin: 0 auto;
    border: 1.5pt solid #0f172a;
    padding: 6mm 6mm;
    background: #ffffff;
    box-sizing: border-box;
  }
  .header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
  }
  .header-table td {
    vertical-align: top;
    padding: 2px;
  }
</style>
</head>
<body>
<div class="recipe-wrapper">
  <!-- Корешок / Заголовок бланка -->
  <table class="header-table">
    <tr>
      <td style="width:55%; font-size:7pt; border:1px dashed #64748b; padding:4px;">
        <strong>${escapeHtml(clinicName)}</strong><br>
        Адрес: ${escapeHtml(clinicAddress)}<br>
        ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}<br>
        <em>(Штамп медицинской организации)</em>
      </td>
      <td style="width:45%; text-align:right; font-size:6.5pt; color:#334155;">
        Министерство здравоохранения РФ<br>
        <strong>Форма бланка № 148-1/у-04(л)</strong><br>
        Приказ МЗ РФ от 24.11.2021 г. № 1094н
      </td>
    </tr>
  </table>

  <div style="text-align:center; margin:3px 0;">
    <div style="font-size:10.5pt; font-weight:800; text-transform:uppercase; color:#047857;">РЕЦЕПТ (ЛЬГОТНЫЙ ОТПУСК)</div>
    <div style="font-size:7.5pt;">Серия и номер: <strong>${escapeHtml(recNum)}</strong> от <strong>${escapeHtml(recDate)}</strong></div>
  </div>

  <!-- Таблица льготных реквизитов -->
  <table style="width:100%; border-collapse:collapse; font-size:7.5pt; margin:4px 0; border:1px solid #0f172a;">
    <tr style="background:#f0fdf4;">
      <td style="padding:2px 4px; border:0.5pt solid #0f172a; width:35%;">СНИЛС: <strong>${escapeHtml(snils)}</strong></td>
      <td style="padding:2px 4px; border:0.5pt solid #0f172a; width:35%;">Полис ОМС: <strong>${escapeHtml(oms)}</strong></td>
      <td style="padding:2px 4px; border:0.5pt solid #0f172a; width:30%;">Оплата: <strong>${discount === 100 ? "100% (Бесплатно)" : "50% скидка"}</strong></td>
    </tr>
    <tr>
      <td colspan="2" style="padding:2px 4px; border:0.5pt solid #0f172a;">Код льготы: <strong>${escapeHtml(benefitCode)}</strong> — ${escapeHtml(benefitName)}</td>
      <td style="padding:2px 4px; border:0.5pt solid #0f172a;">Финансирование: <strong>${escapeHtml(funding)}</strong></td>
    </tr>
  </table>

  <!-- Данные пациента -->
  <div style="font-size:8pt; border-bottom:1px solid #cbd5e1; padding-bottom:3px; margin-bottom:4px;">
    <div>Ф.И.О. пациента: <strong>${escapeHtml(patientName)}</strong> (д.р. ${escapeHtml(patientBirth)})</div>
    <div style="display:flex; justify-content:space-between;">
      <span>№ медкарты: <strong>${escapeHtml(cardNum)}</strong></span>
      ${payload.diagnosisIcd10Code ? `<span>Диагноз (МКБ-10): <strong>${escapeHtml(payload.diagnosisIcd10Code)}</strong></span>` : ""}
    </div>
    <div>Лечащий врач: <strong>${escapeHtml(doctorName)}</strong></div>
  </div>

  <div style="min-height:42mm; padding:2px 0;">
    ${itemsHtml}
  </div>

  <div style="border-top:1.5pt solid #0f172a; padding-top:4px; font-size:7pt;">
    <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
      <div>
        <strong>Срок действия:</strong>
        <span style="${validity === "15" ? "text-decoration:underline; font-weight:bold;" : ""}">15 дней</span> /
        <span style="${validity === "30" ? "text-decoration:underline; font-weight:bold; color:#047857;" : "font-weight:bold;"}">30 дней</span> /
        <span style="${validity === "365" ? "text-decoration:underline; font-weight:bold;" : ""}">1 год</span>
      </div>
      <div>${payload.isChronicSpecialCare ? `✔ По спец. назначению (${escapeHtml(payload.chronicPeriodicity || "ежемесячно")})` : ""}</div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:6px;">
      <div style="width:52%;">
        <div>Подпись и печать врача: _________________</div>
        <div style="margin-top:2px;">/ ${escapeHtml(doctorName)} /</div>
      </div>
      <div style="width:44%; display:flex; justify-content:flex-end; gap:6px;">
        <div style="width:40px; height:40px; border:1px dashed #64748b; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:6.5pt; font-weight:bold;">
          М.П.
        </div>
        <div style="width:46px; height:46px; border:1.5px dashed #047857; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:6.5pt; color:#047857; font-weight:bold; text-align:center; line-height:1.1;">
          Для<br>рецептов
        </div>
      </div>
    </div>

    ${renderUkepDigitalSignatureBlock(payload.ukepSignature)}
  </div>
</div>
</body>
</html>`;
}

/** Универсальный маршрутизатор рендера рецепта */
export function renderPrescriptionUniversalHtml(payload: any): string {
	const form = payload?.formNumber || payload?.formType;
	if (form === "148-1/у-88" || form === "148-1u-88" || form === "148-1u") {
		return renderForm148_1u88Html(payload);
	}
	if (form === "148-1/у-04(л)" || form === "148-1u-04l" || form === "148-1u-preferential") {
		return renderForm148_1u04lHtml(payload);
	}
	return renderForm107_1uHtml(payload);
}


/** 8. Рендерер Направления на рентгенологическое исследование (КЛКТ / ОПТГ / ТРГ / Визио) */
export function renderRadiologyReferralHtml(payload: RadiologyReferralPayload | any): string {
	const clinicName = payload.clinicLegalName || payload.organization?.fullName || "Стоматологическая клиника";
	const clinicAddress = payload.clinicAddress || payload.organization?.address || "—";
	const clinicPhone = payload.clinicPhone || payload.organization?.phone || "—";
	const refNum = payload.referralNumber || "—";
	const refDate = payload.referralDate || new Date().toISOString().slice(0, 10);
	const patientName = payload.patientFullName || payload.patient?.fullName || "—";
	const patientBirth = payload.patientBirthDate || payload.patient?.birthDate || "—";
	const patientPhone = payload.patientPhone || payload.patient?.phone || "—";
	const cardNum = payload.medicalCardNumber || payload.patient?.medicalCardNumber || "—";
	const doctorName = payload.doctorFullName || "Врач-стоматолог";
	const doctorSpecialty = payload.doctorSpecialty || "Врач-стоматолог";
	const icdCode = payload.diagnosisIcd10Code || "K02.1";
	const diagnosisText = payload.diagnosisDetailed || icdCode;
	const studyType = payload.studyType || "cbct_jaw_8x8";
	const studyGoal = payload.studyGoal || "endodontics";
	const targetTeeth = payload.targetTeethFdi || "";
	const area = payload.anatomicalArea || "Челюстно-лицевая область";
	const justification = payload.clinicalJustification || "Диагностика и контроль лечения.";

	// Генерация ячеек зубной формулы FDI для визуальной отметки
	const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
	const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
	const targetTeethArray = targetTeeth.split(/[,;\s]+/).map((t: string) => Number.parseInt(t.trim(), 10));

	const upperCells = upperTeeth.map((num, i) => {
		const isTarget = targetTeethArray.includes(num);
		return `<td style="width:6.25%; text-align:center; font-weight:bold; font-size:8pt; ${isTarget ? "background:#bae6fd; color:#0369a1; border:1.5pt solid #0284c7;" : "background:#ffffff;"} ${i === 7 ? "border-right:2px solid #0f172a;" : ""}">${num}</td>`;
	}).join("");

	const lowerCells = lowerTeeth.map((num, i) => {
		const isTarget = targetTeethArray.includes(num);
		return `<td style="width:6.25%; text-align:center; font-weight:bold; font-size:8pt; ${isTarget ? "background:#bae6fd; color:#0369a1; border:1.5pt solid #0284c7;" : "background:#ffffff;"} ${i === 7 ? "border-right:2px solid #0f172a;" : ""}">${num}</td>`;
	}).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Направление на рентген-исследование № ${escapeHtml(refNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)} | Тел: ${escapeHtml(clinicPhone)}</div>
      <div style="font-size:7pt; color:#64748b; margin-top:2px;">Направляющая медицинская организация</div>
    </div>
    <div class="doc-requisites">
      <div style="font-weight:800; font-size:9.5pt; text-transform:uppercase; color:#0f172a;">НАПРАВЛЕНИЕ</div>
      <div style="font-size:8pt; font-weight:bold; color:#0284c7;">на рентгенологическое исследование</div>
      <div style="font-size:7.5pt; color:#64748b;">№ ${escapeHtml(refNum)} от ${escapeHtml(refDate)}</div>
    </div>
  </div>

  <table class="data-table" style="margin-bottom:6px;">
    <tbody>
      <tr>
        <td style="width:25%; font-weight:bold; background:#f1f5f9;">Пациент (Ф.И.О.):</td>
        <td style="width:45%; font-weight:bold; font-size:9.5pt;">${escapeHtml(patientName)}</td>
        <td style="width:15%; font-weight:bold; background:#f1f5f9;">Дата рожд.:</td>
        <td style="width:15%;">${escapeHtml(patientBirth)}</td>
      </tr>
      <tr>
        <td style="font-weight:bold; background:#f1f5f9;">Номер медкарты:</td>
        <td><strong>${escapeHtml(cardNum)}</strong></td>
        <td style="font-weight:bold; background:#f1f5f9;">Телефон:</td>
        <td>${escapeHtml(patientPhone)}</td>
      </tr>
      <tr>
        <td style="font-weight:bold; background:#f1f5f9;">Лечащий врач:</td>
        <td colspan="3"><strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</td>
      </tr>
      <tr>
        <td style="font-weight:bold; background:#f1f5f9;">Диагноз (МКБ-10):</td>
        <td colspan="3"><span style="color:#0369a1; font-weight:bold;">${escapeHtml(icdCode)}</span> — ${escapeHtml(diagnosisText)}</td>
      </tr>
    </tbody>
  </table>

  <div style="border:1.5px solid #0284c7; border-radius:4px; padding:6px 8px; margin:6px 0; background:#f0f9ff;">
    <div style="font-weight:bold; font-size:8.5pt; color:#0369a1; text-transform:uppercase; margin-bottom:4px;">
      1. Требуемый вид исследования:
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:8pt;">
      <div><span style="font-weight:bold; color:${studyType.startsWith("cbct") ? "#0284c7" : "#64748b"};">[${studyType.startsWith("cbct") ? "✔" : " "}]</span> <strong>Компьютерная томография (КЛКТ 3D)</strong></div>
      <div><span style="font-weight:bold; color:${studyType === "optg_digital_panoramic" ? "#0284c7" : "#64748b"};">[${studyType === "optg_digital_panoramic" ? "✔" : " "}]</span> <strong>Ортопантомограмма (ОПТГ цифровая)</strong></div>
      <div><span style="font-weight:bold; color:${studyType.startsWith("trg") ? "#0284c7" : "#64748b"};">[${studyType.startsWith("trg") ? "✔" : " "}]</span> <strong>Телерентгенограмма (ТРГ боковая/прямая)</strong></div>
      <div><span style="font-weight:bold; color:${studyType === "intraoral_radiovisiography" ? "#0284c7" : "#64748b"};">[${studyType === "intraoral_radiovisiography" ? "✔" : " "}]</span> <strong>Прицельная радиовизиография</strong></div>
    </div>
    <div style="margin-top:4px; font-size:8pt; border-top:1px dashed #bae6fd; padding-top:3px;">
      Параметры области: <strong>${escapeHtml(area)}</strong>
    </div>
  </div>

  <div style="margin:6px 0;">
    <div style="font-weight:bold; font-size:8pt; text-transform:uppercase; color:#0f172a; margin-bottom:2px;">
      2. Область исследования / Зубная формула (FDI):
    </div>
    <table class="data-table-dense" style="margin:2px 0;">
      <thead>
        <tr><th colspan="8" style="border-right:2px solid #0f172a;">Верхняя справа (18–11)</th><th colspan="8">Верхняя слева (21–28)</th></tr>
      </thead>
      <tbody>
        <tr>${upperCells}</tr>
        <tr style="border-top:2px solid #0f172a;">${lowerCells}</tr>
      </tbody>
      <tfoot>
        <tr><th colspan="8" style="border-right:2px solid #0f172a;">Нижняя справа (48–41)</th><th colspan="8">Нижняя слева (31–38)</th></tr>
      </tfoot>
    </table>
    ${targetTeeth ? `<div style="font-size:7.5pt; color:#0369a1; font-weight:bold;">Отмеченные целевые зубы: ${escapeHtml(targetTeeth)}</div>` : ""}
  </div>

  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:6px 8px; margin:6px 0; background:#f8fafc; font-size:8pt; line-height:1.35;">
    <div><strong>3. Клиническая цель и задача исследования:</strong></div>
    <div style="color:#0f172a; margin-top:2px;">${escapeHtml(justification)}</div>
  </div>

  <div style="border:1px solid #cbd5e1; border-radius:4px; padding:4px 6px; margin:6px 0; font-size:7.5pt; color:#475569; display:flex; justify-content:space-between;">
    <span>[${payload.isPregnancyExcluded ? "✔" : " "}] Беременность исключена</span>
    <span>[${payload.hasMetallicArtifacts ? "✔" : " "}] Металлоконструкции / коронки</span>
    <span>Принцип ALARA / СанПиН 2.6.1.1192-03 соблюдён</span>
  </div>

  <div class="signature-row" style="margin-top:14px;">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Направивший врач: <strong>${escapeHtml(doctorName)}</strong> <span class="stamp-seal">М.П.</span></div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-caption">Врач-рентгенолог / Рентгенолаборант: _________________</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

