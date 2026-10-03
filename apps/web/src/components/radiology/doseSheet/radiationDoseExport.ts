/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OFFICIAL RADIATION DOSE EXPORT ENGINE (HTML & CSV)
 * Russian SanPiN 2.6.1.1192-03 · SanPiN 2.6.1.2523-09 (НРБ-99/2009)
 * Form 043/u Official Radiation Insert Generator & RFC 4180 CSV Exporter
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { DoseRecord } from "./radiationDoseEngine";
import {
	calculatePatientCumulativeDose,
	extractYear,
	normalizeDoseRecord,
} from "./radiationDoseEngine";

/** Опции генерации печатного вкладыша Формы 043/у */
export interface DoseSheetHtmlOptions {
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicOgrn?: string | null | undefined;
	clinicLicense?: string | null | undefined;
	patientFullName?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
	patientGender?: "male" | "female" | undefined;
	medicalCardNumber?: string | null | undefined;
	reportingYear?: number | undefined;
	responsibleDoctorName?: string | null | undefined;
	responsibleOfficerTitle?: string | null | undefined;
	includeSignatureLine?: boolean | undefined;
	paperFormat?: "A4" | "A5" | undefined;
}

/** Опции экспорта журнала в CSV */
export interface CsvExportOptions {
	clinicName?: string | null | undefined;
	patientFullName?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	reportingYear?: number | undefined;
	delimiter?: ";" | "," | undefined;
}

/**
 * Вспомогательная функция для безопасного экранирования HTML
 */
export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Формирование официального вкладыша в Медицинскую карту стоматологического больного (Форма № 043/у)
 * «Лист учета дозовых нагрузок пациента при рентгенологических исследованиях»
 * Формат А4 / А5 по ГОСТ Р 7.0.97-2016
 */
export function generateDoseSheetHtml(
	records: readonly Partial<DoseRecord>[],
	options: DoseSheetHtmlOptions = {},
): string {
	const {
		clinicName = 'ООО "Денте Клиник"',
		clinicAddress = "г. Москва, ул. Клиническая, д. 10, стр. 1",
		clinicOgrn = "1127746000000",
		clinicLicense = "ЛО-77-01-012345 от 12.04.2021",
		patientFullName = "",
		patientBirthDate = "1990-05-14",
		patientGender = "male",
		medicalCardNumber = "043/у-0012",
		reportingYear = new Date().getFullYear(),
		responsibleDoctorName = "Рентгенолог / Лечащий врач",
		responsibleOfficerTitle = "Врач-рентгенолог / Ответственный за радиационную безопасность",
		includeSignatureLine = true,
		paperFormat = "A4",
	} = options;

	const normalized = records.map((r, i) => normalizeDoseRecord(r, i));
	const summary = calculatePatientCumulativeDose(normalized, reportingYear);

	// Accumulator for cumulative year dose in rows
	let runningYearMsv = 0;

	const rowsHtml =
		normalized.length === 0
			? `<tr><td colspan="10" style="text-align: center; padding: 12px; font-style: italic; color: #64748b;">Нет зарегистрированных рентгенологических исследований за отчетный период.</td></tr>`
			: normalized
					.map((rec, idx) => {
						const recYear = extractYear(rec.studyDate, reportingYear);
						if (recYear === reportingYear) {
							runningYearMsv += rec.effectiveDoseMsv;
						}
						const techParams = `${rec.tubeVoltageKv || 65} кВ / ${rec.tubeCurrentMa || 7} мА / ${rec.exposureTimeSec || 0.08} с`;
						const teethText =
							rec.teethFdi && rec.teethFdi.length > 0 ? ` (FDI: ${rec.teethFdi.join(", ")})` : "";
						const protectionText =
							rec.protectionEquipmentUsed && rec.protectionEquipmentUsed.length > 0
								? rec.protectionEquipmentUsed.join(", ")
								: "Воротник 0.35 мм Pb, фартук";

						return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="white-space: nowrap; font-weight: 600;">${escapeHtml(rec.studyDate)}</td>
          <td><strong>${escapeHtml(rec.modalityLabel)}</strong><br/><span style="font-size: 7.5pt; color: #475569;">${escapeHtml(rec.apparatusModel || "")}</span></td>
          <td>${escapeHtml(rec.anatomicalArea)}${escapeHtml(teethText)}</td>
          <td style="text-align: center; font-size: 7.5pt; font-family: monospace;">${escapeHtml(techParams)}</td>
          <td style="text-align: right; font-weight: bold;">${rec.effectiveDoseMicrosv.toFixed(1)}</td>
          <td style="text-align: right; font-weight: bold; color: #0284c7;">${rec.effectiveDoseMsv.toFixed(4)}</td>
          <td style="text-align: right; font-weight: bold; color: #0f172a;">${runningYearMsv.toFixed(4)}</td>
          <td style="font-size: 7.5pt; color: #334155;">${escapeHtml(protectionText)}</td>
          <td style="font-size: 7.5pt;">${escapeHtml(rec.doctorName)}<br/><span style="color: #64748b;">___________</span></td>
        </tr>`;
					})
					.join("");

	const isRed = summary.safetyZone === "red";
	const isYellow = summary.safetyZone === "yellow";
	const zoneBadgeColor = isRed ? "#dc2626" : isYellow ? "#d97706" : "#059669";
	const zoneBgColor = isRed ? "#fef2f2" : isYellow ? "#fffbeb" : "#ecfdf5";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Лист учета дозовых нагрузок — ${escapeHtml(patientFullName)}</title>
  <style>
    @page {
      size: ${paperFormat === "A5" ? "A5 landscape" : "A4 portrait"};
      margin: 10mm 10mm 12mm 15mm;
      @bottom-right {
        content: "Стр. " counter(page);
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: "PT Astra Serif", "Times New Roman", Times, serif;
      font-size: 8.5pt;
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
      max-width: 190mm;
      margin: 0 auto;
    }
    .header-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5pt solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .clinic-info {
      width: 60%;
      font-family: Arial, sans-serif;
      font-size: 7.5pt;
      line-height: 1.2;
      color: #334155;
    }
    .clinic-title {
      font-weight: 800;
      font-size: 10pt;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .doc-requisites {
      width: 38%;
      text-align: right;
      font-family: Arial, sans-serif;
      font-size: 7.5pt;
      color: #334155;
    }
    .form-badge {
      display: inline-block;
      font-weight: 800;
      font-size: 8pt;
      text-transform: uppercase;
      border: 1pt solid #0f172a;
      padding: 1pt 4pt;
      background: #f8fafc;
      margin-bottom: 2pt;
    }
    .title-block {
      text-align: center;
      margin: 6px 0 8px 0;
    }
    .main-title {
      font-family: Arial, sans-serif;
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin: 0;
    }
    .sub-title {
      font-size: 8pt;
      font-style: italic;
      color: #475569;
      margin: 2px 0 0 0;
    }
    .patient-card {
      background: #f8fafc;
      border: 0.5pt solid #cbd5e1;
      padding: 5px 8px;
      margin-bottom: 8px;
      font-family: Arial, sans-serif;
      font-size: 8pt;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 4px 12px;
    }
    .patient-card strong {
      color: #0f172a;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 10px 0;
      font-size: 7.5pt;
      line-height: 1.15;
    }
    table.data-table th, table.data-table td {
      border: 0.5pt solid #64748b;
      padding: 3pt 3.5pt;
      vertical-align: middle;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-family: Arial, sans-serif;
      font-weight: bold;
      text-align: center;
      font-size: 7pt;
    }
    table.data-table tr:nth-child(even) td {
      background: #fbfcfe;
    }
    .summary-box {
      border: 1pt solid ${zoneBadgeColor};
      background: ${zoneBgColor};
      padding: 6px 10px;
      margin-top: 6px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 8pt;
    }
    .summary-title {
      font-weight: bold;
      font-size: 8.5pt;
      color: ${zoneBadgeColor};
      margin-bottom: 3px;
    }
    .summary-metrics {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-weight: bold;
      color: #0f172a;
    }
    .signatures-block {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 14px;
      padding-top: 8px;
      border-top: 0.5pt solid #cbd5e1;
      font-family: Arial, sans-serif;
      font-size: 8pt;
    }
    .signature-col {
      width: 48%;
    }
    .sanpin-footer {
      font-size: 7pt;
      color: #64748b;
      font-style: italic;
      margin-top: 8px;
      text-align: justify;
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <!-- Header -->
    <div class="header-grid">
      <div class="clinic-info">
        <div class="clinic-title">${escapeHtml(clinicName)}</div>
        <div>Адрес: ${escapeHtml(clinicAddress)}</div>
        <div>ОГРН: ${escapeHtml(clinicOgrn)} · Лицензия: ${escapeHtml(clinicLicense)}</div>
      </div>
      <div class="doc-requisites">
        <div class="form-badge">Вкладыш в Форму № 043/у</div>
        <div>Минздрав России</div>
        <div>СанПиН 2.6.1.1192-03 (п. 7.12)</div>
      </div>
    </div>

    <!-- Title -->
    <div class="title-block">
      <h1 class="main-title">ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА</h1>
      <p class="sub-title">при проведении медицинских рентгенологических исследований за ${reportingYear} год</p>
    </div>

    <!-- Patient Details -->
    <div class="patient-card">
      <div><strong>Пациент (ФИО):</strong> ${escapeHtml(patientFullName)}</div>
      <div><strong>Дата рождения:</strong> ${escapeHtml(patientBirthDate)}</div>
      <div><strong>Пол:</strong> ${patientGender === "female" ? "Женский" : "Мужской"}</div>
      <div><strong>Номер мед. карты (043/у):</strong> ${escapeHtml(medicalCardNumber)}</div>
      <div><strong>Отчетный период:</strong> ${reportingYear} г.</div>
      <div><strong>Статус карты:</strong> Активная</div>
    </div>

    <!-- Table of X-Ray Procedures -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20px;">№</th>
          <th style="width: 60px;">Дата</th>
          <th>Вид исследования / Аппарат</th>
          <th>Область исследования</th>
          <th style="width: 65px;">Режим (кВ/мА/с)</th>
          <th style="width: 45px;">Доза (мкЗв)</th>
          <th style="width: 45px;">Доза (мЗв)</th>
          <th style="width: 55px;">Накопл. (мЗв)</th>
          <th>СИЗ пациента</th>
          <th style="width: 80px;">Врач / Подпись</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- Radiation Safety Summary Box -->
    <div class="summary-box">
      <div class="summary-title">
        ЗАКЛЮЧЕНИЕ ОТВЕТСТВЕННОГО ЗА РАДИАЦИОННУЮ БЕЗОПАСНОСТЬ: ${escapeHtml(summary.safetyZoneLabel.toUpperCase())}
      </div>
      <div class="summary-metrics">
        <span>Суммарная доза за ${reportingYear} г.: <strong>${summary.annualMsv} мЗв (${summary.annualMicrosv} мкЗв)</strong></span>
        <span>Доля от лимита (1.0 мЗв/год): <strong>${summary.percentOfAnnualLimit}%</strong></span>
        <span>Всего за всё время: <strong>${summary.lifetimeMsv} мЗв (${summary.lifetimeStudiesCount} проц.)</strong></span>
      </div>
      <div>${escapeHtml(summary.recommendation)}</div>
    </div>

    <!-- Signatures -->
    ${
			includeSignatureLine
				? `
    <div class="signatures-block">
      <div class="signature-col">
        <div><strong>Ответственный за радиационную безопасность:</strong></div>
        <div style="margin-top: 14px;">____________________ / ${escapeHtml(responsibleDoctorName)} /</div>
        <div style="font-size: 7pt; color: #64748b;">${escapeHtml(responsibleOfficerTitle)}</div>
      </div>
      <div class="signature-col" style="text-align: right;">
        <div><strong>Лечащий врач-стоматолог:</strong></div>
        <div style="margin-top: 14px;">____________________ / ____________________ /</div>
        <div style="font-size: 7pt; color: #64748b;">Личная подпись и печать врача</div>
      </div>
    </div>`
				: ""
		}

    <!-- SanPiN Regulatory Footer -->
    <div class="sanpin-footer">
      * Примечание: В соответствии с п. 7.12–7.13 СанПиН 2.6.1.1192-03 и п. 5.4.1 СанПиН 2.6.1.2523-09 (НРБ-99/2009), годовой предел эффективной дозы при профилактических медицинских исследованиях составляет 1.0 мЗв. Превышение 1.0 мЗв/год переводит исследования в категорию специальных диагностических по строгим клиническим показаниям с обязательной фиксацией в карте 043/у (без блокировки съемки и без стационарных комиссий — Мандат 8e, 8i).
    </div>
  </div>
</body>
</html>`;
}

/**
 * Экспорт журнала рентген-кабинета и дозовых нагрузок в CSV (RFC 4180 с UTF-8 BOM)
 */
export function exportDoseJournalToCsv(
	records: readonly Partial<DoseRecord>[],
	options: CsvExportOptions = {},
): string {
	const {
		clinicName = 'ООО "Денте Клиник"',
		patientFullName = "",
		medicalCardNumber = "043/у-0012",
		delimiter = ";",
	} = options;

	const normalized = records.map((r, i) => normalizeDoseRecord(r, i));

	const headers = [
		"№ п/п",
		"Дата исследования",
		"Вид исследования",
		"Идентификатор модальности",
		"Анатомическая область",
		"Зубы по FDI",
		"Модель аппарата",
		"Напряжение (кВ)",
		"Ток трубки (мА)",
		"Экспозиция (сек)",
		"Эффективная доза (мкЗв)",
		"Эффективная доза (мЗв)",
		"СИЗ пациента",
		"ФИО врача",
		"Обоснование по жизненным показаниям",
		"Примечания",
	];

	function csvCell(val: unknown): string {
		if (val === null || val === undefined) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	}

	const lines: string[] = [];

	// UTF-8 BOM prefix
	const UTF8_BOM = "\uFEFF";

	// Meta info block
	lines.push(`${csvCell("Организация")}${delimiter}${csvCell(clinicName)}`);
	lines.push(
		`${csvCell("Пациент")}${delimiter}${csvCell(patientFullName)}${delimiter}${csvCell("Номер карты")}${delimiter}${csvCell(medicalCardNumber)}`,
	);
	lines.push(
		`${csvCell("Нормативный документ")}${delimiter}${csvCell("СанПиН 2.6.1.1192-03 / СанПиН 2.6.1.2523-09")}`,
	);
	lines.push(""); // empty separator line

	// Header row
	lines.push(headers.map(csvCell).join(delimiter));

	// Data rows
	normalized.forEach((rec, idx) => {
		const row = [
			idx + 1,
			rec.studyDate,
			rec.modalityLabel,
			rec.modalityId,
			rec.anatomicalArea,
			rec.teethFdi ? rec.teethFdi.join(",") : "",
			rec.apparatusModel || "",
			rec.tubeVoltageKv ?? "",
			rec.tubeCurrentMa ?? "",
			rec.exposureTimeSec ?? "",
			rec.effectiveDoseMicrosv.toFixed(2),
			rec.effectiveDoseMsv.toFixed(4),
			rec.protectionEquipmentUsed ? rec.protectionEquipmentUsed.join("; ") : "",
			rec.doctorName,
			rec.isEmergencyJustified ? `Да (${rec.emergencyJustificationReason || "По острой боли / Обоснование врача"})` : "Нет",
			rec.notes || "",
		];
		lines.push(row.map(csvCell).join(delimiter));
	});

	// Totals summary row
	const totalMicrosv = normalized.reduce((acc, r) => acc + r.effectiveDoseMicrosv, 0);
	const totalMsv = normalized.reduce((acc, r) => acc + r.effectiveDoseMsv, 0);

	lines.push("");
	const totalsRow = [
		"ИТОГО ЗА ВСЁ ВРЕМЯ",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		totalMicrosv.toFixed(2),
		totalMsv.toFixed(4),
		"",
		"",
		"",
		"",
	];
	lines.push(totalsRow.map(csvCell).join(delimiter));

	return UTF8_BOM + lines.join("\r\n");
}
