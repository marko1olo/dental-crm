import {
	DEFAULT_CLINIC_REQUISITES,
	type ClinicRequisites,
	type PsoTestRecord,
} from "./types.js";
import { formPrintStyles } from "./sterilizationPrintStyles.js";

export function generatePso366PrintHtml(
	records: readonly PsoTestRecord[],
	clinicInfo: ClinicRequisites = DEFAULT_CLINIC_REQUISITES,
): string {
	const rowsHtml = records
		.map(
			(r, idx) => `
		<tr>
			<td class="text-center">${idx + 1}</td>
			<td>${r.date} ${r.time}</td>
			<td>
				<div class="font-semibold">${r.instrumentName}</div>
				<div class="subtext">Моющее: ${r.detergentBrand}</div>
			</td>
			<td class="text-center font-bold">${r.batchItemCount} шт.</td>
			<td class="text-center">
				<div>${r.testedSampleCount} шт.</div>
				<div class="subtext">(норма: ${r.minSampleRequired})</div>
			</td>
			<td class="text-center">
				<span class="${r.isAzopyramNegative ? "badge-success" : "badge-danger"}">
					${r.isAzopyramNegative ? "Отрицательная" : "ПОЛОЖИТЕЛЬНАЯ (Кровь)"}
				</span>
			</td>
			<td class="text-center">
				<span class="${r.isPhenolphthaleinNegative ? "badge-success" : "badge-danger"}">
					${r.isPhenolphthaleinNegative ? "Отрицательная" : "ПОЛОЖИТЕЛЬНАЯ (Щелочь)"}
				</span>
			</td>
			<td class="text-center">
				<span class="${r.isBatchApproved ? "badge-success font-bold" : "badge-danger font-bold"}">
					${r.isBatchApproved ? "ГОДНО" : "БРАК"}
				</span>
				${r.rejectionReason ? `<div class="subtext text-danger">${r.rejectionReason}</div>` : ""}
			</td>
			<td>
				<div>${r.operatorFullName}</div>
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
	<title>Журнал учета качества предстерилизационной очистки</title>
	<style>${formPrintStyles}</style>
</head>
<body>
	<table class="header-table">
		<tr>
			<td style="width: 60%;">
				<div class="clinic-title">${clinicInfo.clinicName}</div>
				<div class="clinic-sub">Лицензия: ${clinicInfo.licenseNumber}</div>
				<div class="clinic-sub">Адрес: ${clinicInfo.address}</div>
			</td>
			<td style="width: 40%; text-align: right;">
				<div class="font-bold">МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ</div>
				<div>Форма № 366/у</div>
				<div class="subtext">Регламент предстерилизационной очистки</div>
			</td>
		</tr>
	</table>

	<div class="doc-title">Журнал учета качества предстерилизационной очистки</div>
	<div class="doc-subtitle">Контроль качества отмывки от скрытой крови (азопирам) и моющих средств (фенолфталеин)</div>

	<table class="main-table">
		<thead>
			<tr>
				<th style="width: 3%;">№</th>
				<th style="width: 10%;">Дата и время</th>
				<th style="width: 25%;">Наименование изделий</th>
				<th style="width: 8%;">Объем партии</th>
				<th style="width: 8%;">Выборка (шт)</th>
				<th style="width: 13%;">Азопирамовая проба</th>
				<th style="width: 13%;">Фенолфталеиновая проба</th>
				<th style="width: 9%;">Заключение</th>
				<th style="width: 11%;">Подпись оператора</th>
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
				Старшая медсестра ЦСО: <span class="sig-line"></span> / ${clinicInfo.seniorNurseFullName}
			</td>
		</tr>
	</table>
</body>
</html>`;
}
