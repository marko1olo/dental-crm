import type { DisinfectionJournalRecord } from "./disinfectionTypes";

export function generateGeneralCleaningPrintHtml(params: {
	records: readonly DisinfectionJournalRecord[];
	clinicName?: string;
	chiefDoctor?: string;
	headNurse?: string;
	periodLabel?: string;
}): string {
	const clinic = params.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const chief = params.chiefDoctor || "Главный врач";
	const nurse = params.headNurse || "Главная медицинская сестра";
	const period = params.periodLabel || `Текущий период (${new Date().getFullYear()} г.)`;

	const rows = params.records.map((r, idx) => {
		const typeLabel = r.cleaningType === "general" ? "Генеральная" : "Текущая";
		const methodLabel = r.applicationMethod === "spraying" ? "Орошение" : r.applicationMethod === "immersion" ? "Погружение" : "Протирание";
		return `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${idx + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.logDate}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.roomName}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${typeLabel}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${r.treatedAreaM2.toFixed(1)} м²</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.disinfectantName} (${r.concentrationPercent}%)</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: right;">${r.solutionVolumeLiters.toFixed(1)} л</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${methodLabel}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.exposureMinutes} мин</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.uvIrradiationMinutes} мин</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${r.operatorStaffFullName}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">${r.isInspectorVerified ? "Заверено" : "Подпись"}</td>
		</tr>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал генеральных уборок и дезинфекционного режима</title>
	<style>
		@page { size: A4 landscape; margin: 12mm 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 8.5pt; color: #000; background: #fff; }
		table { width: 100%; border-collapse: collapse; margin-top: 6px; }
		th { border: 1px solid #000; padding: 4px 2px; background: #fff; font-size: 8pt; font-weight: bold; text-align: center; }
		td { border: 1px solid #000; padding: 3px 4px; }
		.footer { display: flex; justify-content: space-between; margin-top: 25px; font-size: 9pt; }
	</style>
</head>
<body>
	<div style="text-align: center; margin-bottom: 10px;">
		<div style="font-weight: bold; font-size: 10pt;">${clinic}</div>
		<div style="font-size: 12pt; font-weight: bold; text-transform: uppercase;">ЖУРНАЛ УЧЕТА ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК И ДЕЗИНФЕКЦИОННОГО РЕЖИМА</div>
		<div style="font-size: 8pt;">СанПиН 3.3686-21 • Период: ${period}</div>
	</div>
	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th><th style="width: 65px;">Дата</th><th>Кабинет / блок</th>
				<th style="width: 75px;">Вид</th><th style="width: 55px;">Площадь</th><th>Дезсредство (%)</th>
				<th style="width: 90px;">Расход</th><th style="width: 70px;">Способ</th><th style="width: 45px;">Эксп.</th>
				<th style="width: 45px;">УФ</th><th style="width: 110px;">Исполнитель</th><th style="width: 60px;">Контроль</th>
			</tr>
		</thead>
		<tbody>
			${rows || '<tr><td colspan="12" style="text-align: center; padding: 15px;">Записи отсутствуют</td></tr>'}
		</tbody>
	</table>
	<div class="footer">
		<div>Ответственный: ${nurse} _________________</div>
		<div style="text-align: right;">Утверждаю: ${chief} _________________</div>
	</div>
</body>
</html>`;
}
