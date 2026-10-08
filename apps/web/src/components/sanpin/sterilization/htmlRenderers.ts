/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & PSO: OFFICIAL PRINTABLE BLANKS HTML
 * (Layer 2: Form 257/u, Form 366/u and Combined Inspection Dossier HTML)
 * ============================================================================
 */

import {
	DEFAULT_CLINIC_REQUISITES,
	SANPIN_REGULATORY_META,
	STATUTORY_PACKAGING_TYPES,
	type ClinicRequisites,
	type Form257CycleRecord,
	type PsoTestRecord,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 7. OFFICIAL PRINTABLE BLANK GENERATORS (FORM 257/U & FORM 366/U & COMBINED)
// ─────────────────────────────────────────────────────────────────────────────

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
	<title>Форма 257/у — Журнал работы стерилизаторов</title>
	<style>
		@page { size: A4 landscape; margin: 12mm 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 15px; }
		.header-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
		.header-table td { vertical-align: top; padding: 2px; }
		.clinic-title { font-size: 13px; font-weight: bold; }
		.clinic-sub { font-size: 10px; color: #555; }
		.doc-title { text-align: center; margin: 10px 0 6px; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
		.doc-subtitle { text-align: center; font-size: 11px; color: #444; margin-bottom: 14px; }
		.main-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
		.main-table th, .main-table td { border: 1px solid #333; padding: 5px 6px; }
		.main-table th { background: #f0f3f6; font-weight: bold; text-align: center; font-size: 10px; }
		.text-center { text-align: center; }
		.font-bold { font-weight: bold; }
		.font-semibold { font-weight: 600; }
		.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 9.5px; }
		.subtext { font-size: 9.5px; color: #555; margin-top: 1px; }
		.stamp-hash { font-size: 8.5px; color: #0b57d0; margin-top: 2px; }
		.badge-success { color: #00701a; font-weight: bold; }
		.badge-danger { color: #d32f2f; font-weight: bold; }
		.footer-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
		.footer-table td { padding: 4px; font-size: 11px; }
		.sig-line { border-bottom: 1px solid #111; display: inline-block; width: 160px; margin: 0 4px; }
	</style>
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
				<div class="subtext">СанПиН 3.3686-21</div>
			</td>
		</tr>
	</table>

	<div class="doc-title">Журнал работы стерилизаторов воздушного, парового (автоклава)</div>
	<div class="doc-subtitle">Контроль параметров циклов и термовременных индикаторов по СанПиН 3.3686-21</div>

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
	<title>Форма 366/у — Журнал учета качества ПСО</title>
	<style>
		@page { size: A4 landscape; margin: 12mm 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 15px; }
		.header-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
		.header-table td { vertical-align: top; padding: 2px; }
		.clinic-title { font-size: 13px; font-weight: bold; }
		.clinic-sub { font-size: 10px; color: #555; }
		.doc-title { text-align: center; margin: 10px 0 6px; font-size: 15px; font-weight: bold; text-transform: uppercase; }
		.doc-subtitle { text-align: center; font-size: 11px; color: #444; margin-bottom: 14px; }
		.main-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
		.main-table th, .main-table td { border: 1px solid #333; padding: 5px 6px; }
		.main-table th { background: #f0f3f6; font-weight: bold; text-align: center; font-size: 10px; }
		.text-center { text-align: center; }
		.font-bold { font-weight: bold; }
		.font-semibold { font-weight: 600; }
		.font-mono { font-family: monospace; font-size: 9px; }
		.subtext { font-size: 9.5px; color: #555; }
		.text-danger { color: #d32f2f; }
		.stamp-hash { font-size: 8.5px; color: #0b57d0; }
		.badge-success { color: #00701a; font-weight: 600; }
		.badge-danger { color: #d32f2f; font-weight: 600; }
		.footer-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
		.footer-table td { padding: 4px; font-size: 11px; }
		.sig-line { border-bottom: 1px solid #111; display: inline-block; width: 160px; margin: 0 4px; }
	</style>
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
				<div class="subtext">СанПиН 3.3686-21 / МУ 287-113</div>
			</td>
		</tr>
	</table>

	<div class="doc-title">Журнал учета качества предстерилизационной очистки (ПСО)</div>
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
					<th>№</th>
					<th>Дата/Время</th>
					<th>Аппарат</th>
					<th>Цикл</th>
					<th>Наименование изделий и упаковка</th>
					<th>Режим (t°, P, время)</th>
					<th>Индикаторы</th>
					<th>Результат</th>
					<th>Подпись ЦСО</th>
				</tr>
			</thead>
			<tbody>
				${params.cycles.slice(0, 100).map((c, i) => `
					<tr>
						<td class="text-center">${i + 1}</td>
						<td>${c.date} ${c.time}</td>
						<td class="text-center font-bold">${c.sterilizerCode}</td>
						<td class="text-center">${c.cycleNumber}</td>
						<td>${c.itemsDescriptionRu} (${c.packsCount} уп.)</td>
						<td>${c.regimeNameRu}</td>
						<td class="text-center">${c.areAllIndicatorsPassed ? "КТ 1-5 ОК" : "Отказ"}</td>
						<td class="text-center badge-success">СТЕРИЛЬНО</td>
						<td class="font-mono">${c.operatorFullName}</td>
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
					<th>№</th>
					<th>Дата/Время</th>
					<th>Изделия</th>
					<th>Партия</th>
					<th>Выборка</th>
					<th>Азопирам (кровь)</th>
					<th>Фенолфталеин (щелочь)</th>
					<th>Заключение</th>
					<th>Подпись оператора</th>
				</tr>
			</thead>
			<tbody>
				${params.psoRecords.slice(0, 100).map((p, i) => `
					<tr>
						<td class="text-center">${i + 1}</td>
						<td>${p.date} ${p.time}</td>
						<td>${p.instrumentName}</td>
						<td class="text-center font-bold">${p.batchItemCount} шт</td>
						<td class="text-center">${p.testedSampleCount} шт (норм: ${p.minSampleRequired})</td>
						<td class="text-center badge-success">Отрицательная</td>
						<td class="text-center badge-success">Отрицательная</td>
						<td class="text-center font-bold badge-success">ГОДНО</td>
						<td class="font-mono">${p.operatorFullName}</td>
					</tr>
				`).join("")}
			</tbody>
		</table>
	</div>
</body>
</html>`;
}
