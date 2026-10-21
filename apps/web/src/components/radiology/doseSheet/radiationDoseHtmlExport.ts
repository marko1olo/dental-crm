import { extractYear, normalizeDoseRecord } from "./radiationDoseRecord.js";
import type { DoseRecord } from "./types.js";

export interface DoseSheetHtmlOptions {
	clinicName?: string | null | undefined;
	patientFullName?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
	reportingYear?: number | undefined;
	paperFormat?: "A4" | "A5" | undefined;
}

export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function generateDoseSheetHtml(
	records: readonly Partial<DoseRecord>[],
	options: DoseSheetHtmlOptions = {},
): string {
	const clinicName = options.clinicName || 'ООО "Денте Клиник"';
	const patientName = options.patientFullName || "Пациент";
	const cardNum = options.medicalCardNumber || "043/у-0001";
	const reportingYear = options.reportingYear || new Date().getFullYear();

	const normalized = records.map((r, i) => normalizeDoseRecord(r, i));
	let totalMsv = 0;

	const rows = normalized
		.map((r, idx) => {
			const recYear = extractYear(r.studyDate, reportingYear);
			if (recYear === reportingYear) totalMsv += r.effectiveDoseMsv;
			return `<tr>
			<td>${idx + 1}</td>
			<td>${escapeHtml(r.studyDate)}</td>
			<td>${escapeHtml(r.modalityLabel)}</td>
			<td>${escapeHtml(r.anatomicalArea)}</td>
			<td>${r.effectiveDoseMicrosv.toFixed(1)}</td>
			<td>${r.effectiveDoseMsv.toFixed(4)}</td>
			<td>${escapeHtml(r.doctorName)}</td>
		</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК — ${escapeHtml(patientName)}</title>
<style>
body { font-family: system-ui, sans-serif; font-size: 12px; color: #1e293b; padding: 20px; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
th { background: #f8fafc; font-weight: 600; }
.header { margin-bottom: 16px; }
.footer { margin-top: 20px; font-size: 11px; color: #64748b; }
</style>
</head>
<body>
<div class="header">
	<h2>ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА</h2>
	<p>Клиника: ${escapeHtml(clinicName)} | Карта: ${escapeHtml(cardNum)} | Пациент: ${escapeHtml(patientName)}${options.patientBirthDate ? ` (${escapeHtml(options.patientBirthDate)})` : ""} | Год: ${reportingYear}</p>
	<p>Норматив: СанПиН 2.6.1.1192-03 (предел 1.0 мЗв/год). Автономия врача: без стационарных комиссий.</p>
</div>
<table>
<thead>
	<tr><th>№</th><th>Дата</th><th>Исследование</th><th>Область</th><th>мкЗв</th><th>мЗв</th><th>Врач</th></tr>
</thead>
<tbody>
	${rows || '<tr><td colspan="7">Нет записей</td></tr>'}
</tbody>
</table>
<div class="footer">
	<p>Суммарная эффективная доза за ${reportingYear} год: <strong>${Number(totalMsv.toFixed(4))} мЗв</strong></p>
	<p>Сформировано автоматически в DENTE Dental CRM.</p>
</div>
</body>
</html>`;
}
