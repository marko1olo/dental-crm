import {
	DEFAULT_CLINIC_REQUISITES,
	STATUTORY_PACKAGING_TYPES,
	type ClinicRequisites,
	type Form257CycleRecord,
} from "./types.js";
import { formPrintStyles } from "./sterilizationPrintStyles.js";

export function generateForm257PrintHtml(
	records: readonly Form257CycleRecord[],
	clinicInfo: ClinicRequisites = DEFAULT_CLINIC_REQUISITES,
): string {
	const rowsHtml = records
		.map(
			(r, idx) => `
		<tr>
			<td class="text-center">${idx + 1}</td>
			<td>${r.date} ${r.time}</td>
			<td class="text-center font-bold">${r.sterilizerCode}</td>
			<td class="text-center">${r.cycleNumber}</td>
			<td>
				<div class="font-semibold">${r.itemsDescriptionRu}</div>
				<div class="subtext">Упаковка: ${STATUTORY_PACKAGING_TYPES[r.packagingType]?.nameRu ?? r.packagingType} (${r.packsCount} шт.)</div>
			</td>
			<td>
				<div>${r.regimeNameRu}</div>
				<div class="subtext font-mono">${r.actualTemperatureCelsius}°C / ${r.actualPressureBar} бар / ${r.actualExposureMinutes} мин</div>
			</td>
			<td>
				<div>${r.indicatorTradeNameRu}</div>
				<div class="subtext">${r.areAllIndicatorsPassed ? "Все КТ (1-5) ОК" : "Отказ индикатора"}</div>
			</td>
			<td class="text-center">
				<span class="${r.cycleStatus === "passed" ? "badge-success" : "badge-danger"}">
					${r.cycleStatus === "passed" ? "СТЕРИЛЬНО" : "БРАК"}
				</span>
			</td>
			<td>
				<div>${r.operatorFullName}</div>
				<div class="subtext">${r.operatorPosition}</div>
				<div class="stamp-hash font-mono">${r.electronicSignatureHash}</div>
			</td>
		</tr>
	`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал автоклавирования и работы стерилизаторов</title>
	<style>${formPrintStyles}</style>
</head>
<body>
	<table class="header-table">
		<tr>
			<td style="width: 60%;">
				<div class="clinic-title">${clinicInfo.clinicName} (${clinicInfo.legalEntity})</div>
				<div class="clinic-sub">Лицензия: ${clinicInfo.licenseNumber}</div>
				<div class="clinic-sub">Адрес: ${clinicInfo.address}</div>
			</td>
			<td style="width: 40%; text-align: right;">
				<div class="font-bold">МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ</div>
				<div>Форма № 257/у</div>
				<div class="subtext">Регламент стерилизации изделий</div>
			</td>
		</tr>
	</table>

	<div class="doc-title">Журнал работы стерилизаторов и автоклавирования (парового, воздушного)</div>
	<div class="doc-subtitle">Контроль параметров циклов и термовременных индикаторов стерильности</div>

	<table class="main-table">
		<thead>
			<tr>
				<th style="width: 3%;">№ п/п</th>
				<th style="width: 9%;">Дата и время</th>
				<th style="width: 7%;">Стерилизатор</th>
				<th style="width: 4%;">№ цикла</th>
				<th style="width: 25%;">Наименование изделий и вид упаковки</th>
				<th style="width: 20%;">Режим стерилизации (t°, P, время)</th>
				<th style="width: 14%;">Тест хим. индикатора (КТ 1-5)</th>
				<th style="width: 7%;">Результат</th>
				<th style="width: 11%;">Подпись медсестры ЦСО</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="9" class="text-center">Записей нет</td></tr>'}
		</tbody>
	</table>

	<table class="footer-table">
		<tr>
			<td style="width: 50%;">
				Главный врач: <span class="sig-line"></span> / ${clinicInfo.chiefDoctorFullName}
			</td>
			<td style="width: 50%; text-align: right;">
				Старшая медсестра: <span class="sig-line"></span> / ${clinicInfo.seniorNurseFullName}
			</td>
		</tr>
	</table>
</body>
</html>`;
}
