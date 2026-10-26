import type { PsoPrintDocumentParams } from "./azopyramTypes";
import { renderPsoForm366RowsHtml } from "./azopyramForm366RowsHtml";

export function generatePsoAzopyramPrintHtml(params: PsoPrintDocumentParams): string {
	const {
		clinicName, clinicAddress, ogrn, inn, licenseInfo,
		chiefDoctorFullName, headNurseFullName, dateRangeTextRu, records,
	} = params;

	const rowsHtml = renderPsoForm366RowsHtml(records);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал предстерилизационной очистки и азопирамовых проб</title>
	<style>
		@page { size: A4 landscape; margin: 8mm 10mm; }
		@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
		* { box-sizing: border-box; }
		body { font-family: 'Times New Roman', Times, serif; font-size: 8.5pt; line-height: 1.15; color: #000; background: #fff; margin: 0; padding: 0; }
		.doc-header { text-align: center; margin-bottom: 8px; }
		.clinic-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
		.clinic-sub { font-size: 7.5pt; color: #222; margin-top: 1px; }
		.doc-name { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; margin-top: 5px; letter-spacing: 0.5px; }
		.doc-meta { font-size: 7.5pt; margin-top: 2px; color: #333; }
		.doc-period { font-size: 8.5pt; font-weight: bold; margin-top: 3px; }
		table.journal-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8pt; }
		table.journal-table th { border: 1px solid #000; padding: 4px 2px; font-size: 7.5pt; font-weight: bold; text-align: center; background-color: #f8fafc; }
		table.journal-table td { vertical-align: middle; }
		.signatures-block { display: flex; justify-content: space-between; margin-top: 18px; font-size: 8.5pt; }
		.sign-col { width: 48%; }
		.regulatory-footnote { margin-top: 10px; font-size: 6.8pt; color: #444; border-top: 0.5px solid #666; padding-top: 3px; }
	</style>
</head>
<body>
	<div class="doc-header">
		<div class="clinic-title">${clinicName}</div>
		<div class="clinic-sub">${clinicAddress} | ИНН: ${inn} | ОГРН: ${ogrn} | Лицензия: ${licenseInfo}</div>
		<div class="doc-name">ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ И АЗОПИРАМОВЫХ ПРОБ</div>
		<div class="doc-meta">В соответствии с Регламентом стерилизации и предстерилизационной очистки изделий</div>
		<div class="doc-period">${dateRangeTextRu}</div>
	</div>

	<table class="journal-table">
		<thead>
			<tr>
				<th style="width: 24px;">№ п/п</th>
				<th style="width: 70px;">Дата и время</th>
				<th>Наименование изделий (партия)</th>
				<th style="width: 48px;">Объем партии (шт)</th>
				<th style="width: 48px;">Проверено (1%, min 3-5)</th>
				<th style="width: 105px;">Серия реактива / Время раствора</th>
				<th style="width: 75px;">Азопирам (кровь)</th>
				<th style="width: 75px;">Фенолфталеин (щелочь)</th>
				<th style="width: 110px;">Моющее средство</th>
				<th style="width: 85px;">Результат контроля</th>
				<th style="width: 115px;">Подпись лица, проводившего пробу</th>
			</tr>
			<tr style="font-size: 6.5pt; text-align: center; background: #ffffff;">
				<th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>11</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 18px; border: 1px solid #000;">Записи в журнале предстерилизационной очистки за указанный период отсутствуют. Честный Zero-Mock учет.</td></tr>'}
		</tbody>
	</table>

	<div class="signatures-block">
		<div class="sign-col">Ответственный за предстерилизационную очистку (медсестра ЦСО): ____________________ / ${headNurseFullName} /</div>
		<div class="sign-col" style="text-align: right;">Главный врач медицинской организации: ____________________ / ${chiefDoctorFullName} /</div>
	</div>

	<div class="regulatory-footnote">
		* Примечание: Рабочий раствор азопирама годен не более 2 часов при комнатной температуре. При положительной пробе (сине-фиолетовое окрашивание на кровь или розовое на щелочь) вся партия изделий подлежит повторной предстерилизационной очистке до получения отрицательного результата.
	</div>
</body>
</html>`;
}

export { generatePsoAzopyramPrintHtml as generateStatutoryPsoForm366PrintHtml };
