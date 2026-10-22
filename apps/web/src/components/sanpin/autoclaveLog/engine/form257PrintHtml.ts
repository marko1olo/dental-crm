import { DEFAULT_CLINIC_LEGAL_INFO } from "./constants";
import type { ClinicLegalInfo, Form257Record } from "./types";
import { renderForm257RowsHtml } from "./form257RowsHtml";

export function generateForm257PrintHtml(
	records: readonly Form257Record[],
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
	periodLabelRu = "за текущий отчетный период",
): string {
	const printDateStr = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit", month: "long", year: "numeric",
	});
	const rowsHtml = renderForm257RowsHtml(records, clinicInfo);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Журнал автоклавирования и стерилизации (Форма № 257/у)</title>
	<style>
		@page { size: A4 landscape; margin: 12mm 10mm; }
		* { box-sizing: border-box; }
		body { font-family: 'Times New Roman', Times, serif, Arial, sans-serif; font-size: 9pt; line-height: 1.25; color: #000; background: #fff; margin: 0; padding: 0; }
		.header-box { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
		.clinic-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
		.clinic-sub { font-size: 8pt; color: #333; }
		.form-stamp { text-align: right; font-size: 8pt; }
		.form-stamp strong { font-size: 9pt; }
		.journal-title { text-align: center; margin: 10px 0 6px 0; }
		.journal-title h1 { font-size: 13pt; margin: 0; font-weight: bold; letter-spacing: 0.5px; }
		.journal-title h2 { font-size: 9.5pt; margin: 3px 0 0 0; font-weight: normal; color: #333; }
		table.form-table { width: 100%; table-layout: fixed; word-break: break-word; border-collapse: collapse; margin-top: 8px; font-size: 8pt; }
		table.form-table th, table.form-table td { border: 1px solid #000; padding: 4px 5px; vertical-align: middle; }
		table.form-table th { background-color: #f1f5f9; font-weight: bold; text-align: center; font-size: 7.5pt; }
		.pass-text { color: #166534; }
		.fail-text { color: #991b1b; }
		.footer-sign { margin-top: 14px; display: flex; justify-content: space-between; font-size: 8.5pt; }
		.sign-col { width: 45%; }
		.sign-line { border-bottom: 1px solid #000; margin-top: 18px; display: flex; justify-content: space-between; font-size: 7.5pt; }
		@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
	</style>
</head>
<body>
	<div class="header-box">
		<div>
			<div class="clinic-title">${clinicInfo.name}</div>
			<div class="clinic-sub">ОГРН: ${clinicInfo.ogrn} • ИНН: ${clinicInfo.inn} • Адрес: ${clinicInfo.address}</div>
		</div>
		<div class="form-stamp">
			<strong>МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ</strong><br/>
			Журнал автоклавирования и стерилизации (Форма № 257/у)<br/>
			СанПиН 3.3686-21 (раздел III)
		</div>
	</div>

	<div class="journal-title">
		<h1>ЖУРНАЛ АВТОКЛАВИРОВАНИЯ И СТЕРИЛИЗАЦИИ (КОНТРОЛЬ РАБОТЫ АВТОКЛАВОВ)</h1>
		<h2>Отчетный период: ${periodLabelRu} • Дата формирования: ${printDateStr}</h2>
	</div>

	<table class="form-table">
		<thead>
			<tr>
				<th style="width:3%;">№ п/п</th>
				<th style="width:7%;">Дата и № цикла</th>
				<th style="width:12%;">Марка, номер стерилизатора</th>
				<th style="width:20%;">Наименование стерилизуемых изделий</th>
				<th style="width:9%;">Кол-во и вид упаковки</th>
				<th style="width:10%;">Режим (T°, P, время)</th>
				<th style="width:14%;">Химический контроль (5 точек)</th>
				<th style="width:8%;">Результат контроля</th>
				<th style="width:10%;">Подпись проводившего</th>
				<th style="width:7%;">Отметка гл. медсестры</th>
			</tr>
			<tr style="background:#f8fafc; font-size:7pt; color:#475569;">
				<th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
		</tbody>
	</table>

	<div class="footer-sign">
		<div class="sign-col">
			<div>Ответственный за стерилизацию в ЦСО: <strong>${clinicInfo.headNurse}</strong></div>
			<div class="sign-line">
				<span>(должность)</span><span>(подпись)</span><span>(расшифровка подписи)</span>
			</div>
		</div>
		<div class="sign-col">
			<div>Главный врач / Руководитель клиники: <strong>${clinicInfo.chiefDoctor}</strong></div>
			<div class="sign-line">
				<span>(должность)</span><span>(подпись)</span><span>(расшифровка подписи)</span>
			</div>
		</div>
	</div>
</body>
</html>`;
}
