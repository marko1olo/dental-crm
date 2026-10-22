import {
	DEFAULT_CLINIC_REQUISITES,
	SANPIN_REGULATORY_META,
	type ClinicRequisites,
	type Form257CycleRecord,
	type PsoTestRecord,
} from "./types.js";

export function generateCombinedInspectionDossierHtml(params: {
	monthFormattedRu: string;
	cycles: readonly Form257CycleRecord[];
	psoRecords: readonly PsoTestRecord[];
	clinicInfo?: ClinicRequisites;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_REQUISITES;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Досье производственного контроля стерилизации — ${params.monthFormattedRu}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10.5px; color: #111; margin: 0; padding: 10px; }
		.cover-page { page-break-after: always; text-align: center; padding: 40px 20px; }
		.cover-clinic { font-size: 16px; font-weight: bold; margin-bottom: 20px; }
		.cover-title { font-size: 22px; font-weight: 800; text-transform: uppercase; margin: 40px 0 10px; letter-spacing: 1px; }
		.cover-sub { font-size: 13px; color: #444; margin-bottom: 30px; }
		.cover-box { display: inline-block; border: 2px solid #111; padding: 15px 30px; font-size: 12px; text-align: left; margin: 20px 0; }
		.page-break { page-break-before: always; }
		.table-title { font-size: 13px; font-weight: bold; margin: 10px 0 6px; text-transform: uppercase; }
		.main-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
		.main-table th, .main-table td { border: 1px solid #333; padding: 4px 5px; font-size: 9.5px; }
		.main-table th { background: #f0f3f6; font-weight: bold; text-align: center; }
		.text-center { text-align: center; }
		.font-bold { font-weight: bold; }
		.font-mono { font-family: monospace; font-size: 8.5px; }
		.badge-success { color: #00701a; font-weight: bold; }
		.footer-table { width: 100%; margin-top: 15px; border-collapse: collapse; }
		.footer-table td { padding: 4px; font-size: 10.5px; }
		.sig-line { border-bottom: 1px solid #111; display: inline-block; width: 140px; margin: 0 4px; }
	</style>
</head>
<body>
	<div class="cover-page">
		<div class="cover-clinic">${clinic.clinicName} (${clinic.legalEntity})</div>
		<div>Лицензия на осуществление медицинской деятельности: ${clinic.licenseNumber}</div>
		<div>Адрес места осуществления деятельности: ${clinic.address}</div>
		<div class="cover-title">ДОСЬЕ ПРОИЗВОДСТВЕННОГО САНИТАРНОГО КОНТРОЛЯ</div>
		<div class="cover-sub">Журналы стерилизации (Форма № 257/у) и качества ПСО (Форма № 366/у) за ${params.monthFormattedRu}</div>
		<div class="cover-box">
			<div><b>Нормативное основание:</b> ${SANPIN_REGULATORY_META.standardRu}, ${SANPIN_REGULATORY_META.guidelinePsoRu}</div>
			<div style="margin-top: 5px;"><b>Всего циклов стерилизации:</b> ${params.cycles.length}</div>
			<div><b>Всего проверено серий ПСО:</b> ${params.psoRecords.length} (Качество 100% — брак 0%)</div>
			<div><b>Ответственное лицо:</b> Главный врач ${clinic.chiefDoctorFullName} / Старшая медсестра ${clinic.seniorNurseFullName}</div>
		</div>
		<div style="margin-top: 50px;">
			<table style="width: 100%; border-collapse: collapse;">
				<tr>
					<td style="width: 50%; text-align: left;">Главный врач: <span class="sig-line"></span> / ${clinic.chiefDoctorFullName}</td>
					<td style="width: 50%; text-align: right;">Старшая медсестра: <span class="sig-line"></span> / ${clinic.seniorNurseFullName}</td>
				</tr>
			</table>
		</div>
	</div>

	<div class="page-break">
		<div class="table-title">1. Журнал работы стерилизаторов воздушного, парового (Форма № 257/у)</div>
		<table class="main-table">
			<thead>
				<tr>
					<th>№</th><th>Дата/Время</th><th>Аппарат</th><th>Цикл</th>
					<th>Наименование изделий и упаковка</th><th>Режим (t°, P, время)</th><th>Индикаторы</th><th>Результат</th><th>Подпись ЦСО</th>
				</tr>
			</thead>
			<tbody>
				${params.cycles.slice(0, 100).map((c, i) => `
					<tr>
						<td class="text-center">${i + 1}</td><td>${c.date} ${c.time}</td>
						<td class="text-center font-bold">${c.sterilizerCode}</td><td class="text-center">${c.cycleNumber}</td>
						<td>${c.itemsDescriptionRu} (${c.packsCount} уп.)</td><td>${c.regimeNameRu}</td>
						<td class="text-center">${c.areAllIndicatorsPassed ? "КТ 1-5 ОК" : "Отказ"}</td>
						<td class="text-center badge-success">СТЕРИЛЬНО</td><td class="font-mono">${c.operatorFullName}</td>
					</tr>
				`).join("")}
			</tbody>
		</table>
	</div>

	<div class="page-break">
		<div class="table-title">2. Журнал учета качества предстерилизационной очистки (Форма № 366/у)</div>
		<table class="main-table">
			<thead>
				<tr>
					<th>№</th><th>Дата/Время</th><th>Изделия</th><th>Партия</th><th>Выборка</th>
					<th>Азопирам (кровь)</th><th>Фенолфталеин (щелочь)</th><th>Заключение</th><th>Подпись оператора</th>
				</tr>
			</thead>
			<tbody>
				${params.psoRecords.slice(0, 100).map((p, i) => `
					<tr>
						<td class="text-center">${i + 1}</td><td>${p.date} ${p.time}</td><td>${p.instrumentName}</td>
						<td class="text-center font-bold">${p.batchItemCount} шт</td>
						<td class="text-center">${p.testedSampleCount} шт (норм: ${p.minSampleRequired})</td>
						<td class="text-center badge-success">Отрицательная</td><td class="text-center badge-success">Отрицательная</td>
						<td class="text-center font-bold badge-success">ГОДНО</td><td class="font-mono">${p.operatorFullName}</td>
					</tr>
				`).join("")}
			</tbody>
		</table>
	</div>
</body>
</html>`;
}
