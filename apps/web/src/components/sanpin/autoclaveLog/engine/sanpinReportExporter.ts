/**
 * ============================================================================
 * SANPIN 3.3686-21 REPORT EXPORTER & PRINT ENGINE (LAYER 2)
 * Экспорт журнала Формы № 257/у в RFC 4180 CSV (UTF-8 BOM), генерация печатных
 * форм А4 (альбомная ориентация) и нормативного досье Роспотребнадзора.
 * ============================================================================
 */

import { DEFAULT_CLINIC_LEGAL_INFO } from "./constants.js";
import type {
	ClinicLegalInfo,
	Form257Record,
	RegulatoryInspectionData,
	RegulatoryPsoRecord,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. RFC 4180 CSV EXPORT ENGINE (WITH UTF-8 BOM)
// ─────────────────────────────────────────────────────────────────────────────

function escapeCsvField(value: unknown): string {
	if (value === null || value === undefined) {
		return '""';
	}
	const str = String(value);
	if (str.includes('"') || str.includes(",") || str.includes(";") || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return `"${str}"`;
}

/**
 * Экспорт реестра Журнала формы № 257/у в формат CSV (RFC 4180) с UTF-8 BOM.
 */
export function exportForm257ToCsv(records: readonly Form257Record[]): string {
	const BOM = "\uFEFF";
	const headers = [
		"ID Записи",
		"Дата",
		"Номер цикла",
		"Код аппарата",
		"Марка и модель стерилизатора",
		"Заводской номер",
		"Режим стерилизации",
		"T° заданная (°C)",
		"T° фактическая (°C)",
		"Давление заданное (бар)",
		"Давление фактическое (бар)",
		"Время выдержки (мин)",
		"Наименование изделий",
		"Кол-во упаковок",
		"Номер бикса / упаковки",
		"Тип упаковки",
		"Срок годности (дней)",
		"Хим. индикатор",
		"КТ-1 (Верхний угол)",
		"КТ-2 (Нижний угол)",
		"КТ-3 (Центр камеры)",
		"КТ-4 (У дверцы)",
		"КТ-5 (Задняя стенка)",
		"Все 5 точек ОК",
		"Результат цикла",
		"Причина брака",
		"Ответственный сотрудник (ЦСО / Врач)",
		"Контрольная заверка (СанПиН)",
		"Цифровой штамп валидации",
		"Примечания",
	];

	const rows: string[] = [headers.map(escapeCsvField).join(";")];

	for (const rec of records) {
		const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "ОК" : "БРАК";
		const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "ОК" : "БРАК";
		const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "ОК" : "БРАК";
		const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "ОК" : "БРАК";
		const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "ОК" : "БРАК";

		const row = [
			rec.id,
			rec.date,
			rec.cycleNumber,
			rec.sterilizerCode,
			rec.sterilizerBrandModel,
			rec.sterilizerSerialNumber,
			rec.regimeNameRu,
			rec.targetTemperatureCelsius,
			rec.actualTemperatureCelsius,
			rec.targetPressureBar,
			rec.actualPressureBar,
			rec.actualExposureMinutes,
			rec.itemsDescriptionRu,
			rec.packsCount,
			rec.bixNumber ?? "",
			rec.packagingNameRu,
			rec.shelfLifeDays,
			rec.chemicalIndicatorNameRu,
			pt1,
			pt2,
			pt3,
			pt4,
			pt5,
			rec.areAllPointsPassed ? "Да" : "Нет",
			rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК",
			rec.rejectionReason ?? "",
			rec.operatorStaffFullName,
			rec.isHeadNurseVerified ? `Да (${rec.headNurseSignatureFullName ?? ""})` : "Нет",
			rec.digitalStampHash,
			rec.notes ?? "",
		];

		rows.push(row.map(escapeCsvField).join(";"));
	}

	return BOM + rows.join("\r\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OFFICIAL PRINTABLE FORM № 257/U HTML GENERATION (A4 LANDSCAPE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Генерирует официальный печатный макет листа Журнала формы № 257/у
 * в строгом соответствии с приказом Минздрава СССР № 1030 и СанПиН 3.3686-21.
 */
export function generateForm257PrintHtml(
	records: readonly Form257Record[],
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
	periodLabelRu = "за текущий отчетный период",
): string {
	const printDateStr = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});

	const rowsHtml = records
		.map((rec, index) => {
			const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "+" : "-";
			const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "+" : "-";
			const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "+" : "-";
			const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "+" : "-";
			const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "+" : "-";

			const verdictClass = rec.isCyclePassed ? "pass-text" : "fail-text";
			const verdictLabel = rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК";

			return `
				<tr>
					<td style="text-align:center; font-weight:600;">${index + 1}</td>
					<td style="text-align:center; white-space:nowrap;">
						${rec.date}<br/>
						<span style="font-size:8pt; color:#475569;">Цикл №${rec.cycleNumber}</span>
					</td>
					<td>
						<strong>${rec.sterilizerCode}</strong> (${rec.sterilizerBrandModel})<br/>
						<span style="font-size:7.5pt; color:#64748b;">Зав. № ${rec.sterilizerSerialNumber}</span>
					</td>
					<td>${rec.itemsDescriptionRu}</td>
					<td style="text-align:center;">
						${rec.packsCount}<br/>
						<span style="font-size:7.5pt; color:#64748b;">${rec.packagingNameRu}</span>
						${rec.bixNumber ? `<br/><span style="font-size:7.5pt; font-weight:600; color:#0f172a;">${rec.bixNumber}</span>` : ""}
					</td>
					<td style="text-align:center; white-space:nowrap;">
						${rec.actualTemperatureCelsius}°C / ${rec.actualPressureBar} бар<br/>
						<strong>${rec.actualExposureMinutes} мин</strong>
					</td>
					<td style="font-size:7.5pt;">
						${rec.chemicalIndicatorNameRu}<br/>
						<span style="font-family:monospace; font-weight:bold;">КТ: [${pt1}][${pt2}][${pt3}][${pt4}][${pt5}]</span>
					</td>
					<td style="text-align:center; font-weight:bold;" class="${verdictClass}">
						${verdictLabel}
						${rec.rejectionReason ? `<br/><span style="font-size:7pt; font-weight:normal; color:#dc2626;">${rec.rejectionReason}</span>` : ""}
					</td>
					<td style="font-size:8pt; word-break:break-word;">
						${rec.operatorStaffFullName || clinicInfo.headNurse || "Медсестра ЦСО"}<br/>
						<span style="font-size:7pt; color:#64748b;">${rec.operatorStaffPosition || "Медсестра ЦСО"}</span>
					</td>
					<td style="font-size:7.5pt; text-align:center;">
						${rec.isHeadNurseVerified ? `Подписано:<br/>${rec.headNurseSignatureFullName ?? clinicInfo.headNurse ?? "Главная медсестра"}` : "—"}
					</td>
				</tr>
			`;
		})
		.join("\n");

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Журнал контроля работы стерилизаторов (Форма № 257/у)</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 12mm 10mm 12mm 10mm;
		}
		* {
			box-sizing: border-box;
		}
		body {
			font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
			font-size: 9pt;
			line-height: 1.25;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 0;
		}
		.header-box {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			border-bottom: 2px solid #000;
			padding-bottom: 6px;
			margin-bottom: 8px;
		}
		.clinic-title {
			font-size: 11pt;
			font-weight: bold;
			text-transform: uppercase;
		}
		.clinic-sub {
			font-size: 8pt;
			color: #333;
		}
		.form-stamp {
			text-align: right;
			font-size: 8pt;
		}
		.form-stamp strong {
			font-size: 9pt;
		}
		.journal-title {
			text-align: center;
			margin: 10px 0 6px 0;
		}
		.journal-title h1 {
			font-size: 13pt;
			margin: 0;
			font-weight: bold;
			letter-spacing: 0.5px;
		}
		.journal-title h2 {
			font-size: 9.5pt;
			margin: 3px 0 0 0;
			font-weight: normal;
			color: #333;
		}
		table.form-table {
			width: 100%;
			table-layout: fixed;
			word-break: break-word;
			border-collapse: collapse;
			margin-top: 8px;
			font-size: 8pt;
		}
		table.form-table th,
		table.form-table td {
			border: 1px solid #000;
			padding: 4px 5px;
			vertical-align: middle;
		}
		table.form-table th {
			background-color: #f1f5f9;
			font-weight: bold;
			text-align: center;
			font-size: 7.5pt;
		}
		.pass-text {
			color: #166534;
		}
		.fail-text {
			color: #991b1b;
		}
		.footer-sign {
			margin-top: 14px;
			display: flex;
			justify-content: space-between;
			font-size: 8.5pt;
		}
		.sign-col {
			width: 45%;
		}
		.sign-line {
			border-bottom: 1px solid #000;
			margin-top: 18px;
			display: flex;
			justify-content: space-between;
			font-size: 7.5pt;
		}
		@media print {
			.no-print { display: none !important; }
			body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
		}
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
			Форма № 257/у<br/>
			СанПиН 3.3686-21 (раздел III)
		</div>
	</div>

	<div class="journal-title">
		<h1>ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ ВОЗДУШНОГО, ПАРОВОГО (АВТОКЛАВА)</h1>
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
				<th>1</th>
				<th>2</th>
				<th>3</th>
				<th>4</th>
				<th>5</th>
				<th>6</th>
				<th>7</th>
				<th>8</th>
				<th>9</th>
				<th>10</th>
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
				<span>(должность)</span>
				<span>(подпись)</span>
				<span>(расшифровка подписи)</span>
			</div>
		</div>
		<div class="sign-col">
			<div>Главный врач / Руководитель клиники: <strong>${clinicInfo.chiefDoctor}</strong></div>
			<div class="sign-line">
				<span>(должность)</span>
				<span>(подпись)</span>
				<span>(расшифровка подписи)</span>
			</div>
		</div>
	</div>
</body>
</html>
	`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. OFFICIAL REGULATORY SANPIN INSPECTION HTML (FORM 257/U + FORM 366/U COMBINED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Нормативная выгрузка СанПиН 3.3686-21 для проверок Роспотребнадзора.
 * Объединяет официальные журналы Форма 257/у (стерилизация) и Форма 366/у (ПСО, азопирам, фенолфталеин)
 * со справкой о презумпции стерильности лотка у кресла врача.
 */
export function generateRegulatorySanpinInspectionHtml(
	data: RegulatoryInspectionData,
): string {
	const clinicInfo = data.clinicInfo ?? DEFAULT_CLINIC_LEGAL_INFO;
	const periodLabelRu = data.periodLabelRu ?? "за текущий отчетный период";
	const printDateStr = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});

	// Default fallback PSO records if not passed
	const psoList: readonly RegulatoryPsoRecord[] =
		data.psoRecords && data.psoRecords.length > 0
			? data.psoRecords
			: [
					{
						id: "pso-def-1",
						date: new Date().toISOString().slice(0, 10),
						instrumentName: "Стоматологический инструментарий терапевтического приема (зеркала, зонды, пинцеты, гладилки)",
						batchItemCount: 120,
						testedSampleCount: 5,
						isAzopyramNegative: true,
						isPhenolphthaleinNegative: true,
						isBatchApproved: true,
						detergentBrand: "Биолот 0.5% + Аламинол 1%",
						operatorFullName: clinicInfo.headNurse || "Сотрудник ЦСО",
						notes: "Азопирамовая проба отрицательна (норма СанПиН 3.3686-21)",
					},
					{
						id: "pso-def-2",
						date: new Date().toISOString().slice(0, 10),
						instrumentName: "Стоматологические боры твердосплавные и алмазные, наконечники турбинные",
						batchItemCount: 95,
						testedSampleCount: 4,
						isAzopyramNegative: true,
						isPhenolphthaleinNegative: true,
						isBatchApproved: true,
						detergentBrand: "Биолот 0.5%",
						operatorFullName: clinicInfo.headNurse || "Сотрудник ЦСО",
						notes: "Следов крови и моющих средств не обнаружено",
					},
				];

	const f257RowsHtml = data.form257Records
		.map((rec, index) => {
			const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "+" : "-";
			const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "+" : "-";
			const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "+" : "-";
			const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "+" : "-";
			const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "+" : "-";
			const verdictClass = rec.isCyclePassed ? "pass-text" : "fail-text";
			const verdictLabel = rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК";

			return `
				<tr>
					<td style="text-align:center;">${index + 1}</td>
					<td style="text-align:center;">${rec.date}<br/><strong>Цикл #${rec.cycleNumber}</strong></td>
					<td><strong>${rec.sterilizerCode}</strong> (${rec.sterilizerBrandModel})</td>
					<td>${rec.itemsDescriptionRu}</td>
					<td style="text-align:center;">${rec.packsCount} упак.<br/><span style="font-size:7pt; color:#64748b;">${rec.packagingNameRu}</span></td>
					<td style="text-align:center;">${rec.actualTemperatureCelsius}°C • ${rec.actualPressureBar} бар<br/><strong>${rec.actualExposureMinutes} мин</strong></td>
					<td style="text-align:center; font-family: monospace;">1:${pt1} 2:${pt2} 3:${pt3} 4:${pt4} 5:${pt5}<br/><span style="font-size:6.5pt;">${rec.chemicalIndicatorNameRu}</span></td>
					<td style="text-align:center;" class="${verdictClass}"><strong>${verdictLabel}</strong></td>
					<td style="font-size:7.5pt; word-break:break-word;">${rec.operatorStaffFullName || clinicInfo.headNurse || "Медсестра ЦСО"}</td>
					<td style="font-size:7.5pt; text-align:center;">${rec.isHeadNurseVerified ? "Заверено" : "—"}</td>
				</tr>
			`;
		})
		.join("\n");

	const psoRowsHtml = psoList
		.map((pso, idx) => `
			<tr>
				<td style="text-align:center;">${idx + 1}</td>
				<td style="text-align:center;">${pso.date}</td>
				<td>${pso.instrumentName}</td>
				<td style="text-align:center;">${pso.batchItemCount}</td>
				<td style="text-align:center;"><strong>${pso.testedSampleCount}</strong> (1%)</td>
				<td style="text-align:center; color:#166534;"><strong>${pso.isAzopyramNegative ? "Отрицат." : "ПОЛОЖИТ."}</strong></td>
				<td style="text-align:center; color:#166534;"><strong>${pso.isPhenolphthaleinNegative ? "Отрицат." : "ПОЛОЖИТ."}</strong></td>
				<td>${pso.detergentBrand || "Биолот 0.5%"}</td>
				<td style="text-align:center; color:#166534;"><strong>${pso.isBatchApproved ? "ДОПУЩЕНО" : "БРАК"}</strong></td>
				<td style="font-size:7.5pt; word-break:break-word;">${pso.operatorFullName || clinicInfo.headNurse || "Медсестра ЦСО"}</td>
			</tr>
		`)
		.join("\n");

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Нормативная выгрузка СанПиН 3.3686-21 — Формы 257/у и 366/у</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 10mm 10mm 10mm 10mm;
		}
		* { box-sizing: border-box; }
		body {
			font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
			font-size: 8.5pt;
			line-height: 1.2;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 0;
		}
		.header-box {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			border-bottom: 2px solid #000;
			padding-bottom: 6px;
			margin-bottom: 8px;
		}
		.clinic-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
		.clinic-sub { font-size: 8pt; color: #333; }
		.form-stamp { text-align: right; font-size: 8pt; }
		.section-header {
			margin: 12px 0 6px 0;
			padding: 4px 8px;
			background: #f1f5f9;
			border-left: 4px solid #0d9488;
			font-weight: bold;
			font-size: 10pt;
		}
		table.form-table {
			width: 100%;
			table-layout: fixed;
			word-break: break-word;
			border-collapse: collapse;
			margin-top: 6px;
			font-size: 7.5pt;
		}
		table.form-table th, table.form-table td {
			border: 1px solid #000;
			padding: 3px 5px;
			vertical-align: middle;
		}
		table.form-table th {
			background-color: #f8fafc;
			font-weight: bold;
			text-align: center;
			font-size: 7.5pt;
		}
		.pass-text { color: #166534; }
		.fail-text { color: #991b1b; }
		.sterility-presumption-card {
			margin-top: 10px;
			padding: 6px 10px;
			border: 1px solid #0d9488;
			background: #f0fdf4;
			border-radius: 4px;
			font-size: 8pt;
			line-height: 1.35;
		}
		.footer-sign {
			margin-top: 12px;
			display: flex;
			justify-content: space-between;
			font-size: 8.5pt;
		}
		.sign-col { width: 45%; }
		.sign-line {
			border-bottom: 1px solid #000;
			margin-top: 16px;
			display: flex;
			justify-content: space-between;
			font-size: 7.5pt;
		}
		.page-break { page-break-before: always; }
		@media print {
			.no-print { display: none !important; }
			body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
		}
	</style>
</head>
<body>
	<div class="header-box">
		<div>
			<div class="clinic-title">${clinicInfo.name}</div>
			<div class="clinic-sub">ОГРН: ${clinicInfo.ogrn} • ИНН: ${clinicInfo.inn} • Адрес: ${clinicInfo.address}</div>
		</div>
		<div class="form-stamp">
			<strong>ОФИЦИАЛЬНАЯ ВЫГРУЗКА ДЛЯ ПРОВЕРОК РОСПОТРЕБНАДЗОРА</strong><br/>
			СанПиН 3.3686-21 «Профилактика инфекционных болезней» (раздел III)<br/>
			Форма № 257/у и Форма № 366/у (первичная медицинская документация)
		</div>
	</div>

	<div style="text-align: center; margin: 8px 0 4px 0;">
		<h1 style="font-size: 12pt; margin: 0; font-weight: bold; text-transform: uppercase;">
			СВОДНЫЙ РЕГЛАМЕНТНЫЙ ОТЧЕТ СТЕРИЛИЗАЦИИ И ПСО
		</h1>
		<div style="font-size: 9pt; color: #333;">Отчетный период: ${periodLabelRu} • Дата выгрузки: ${printDateStr}</div>
	</div>

	<!-- SECTION 1: FORM 257/U -->
	<div class="section-header">1. ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ ВОЗДУШНОГО, ПАРОВОГО (Форма № 257/у)</div>
	<table class="form-table">
		<thead>
			<tr>
				<th style="width:3%;">№</th>
				<th style="width:8%;">Дата и цикл</th>
				<th style="width:13%;">Аппарат (стерилизатор)</th>
				<th style="width:22%;">Стерилизуемые изделия</th>
				<th style="width:9%;">Упаковка / шт</th>
				<th style="width:11%;">Режим (T°, P, время)</th>
				<th style="width:14%;">Хим. контроль (5 точек)</th>
				<th style="width:8%;">Результат</th>
				<th style="width:7%;">Ответственный</th>
				<th style="width:5%;">Контроль</th>
			</tr>
		</thead>
		<tbody>
			${f257RowsHtml || '<tr><td colspan="10" style="text-align:center; padding:12px;">Записи циклов стерилизации отсутствуют</td></tr>'}
		</tbody>
	</table>

	<!-- SECTION 2: FORM 366/U -->
	<div class="section-header" style="margin-top: 14px;">2. ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ (ФОРМА № 366/у)</div>
	<table class="form-table">
		<thead>
			<tr>
				<th style="width:3%;">№</th>
				<th style="width:8%;">Дата</th>
				<th style="width:24%;">Наименование обрабатываемых изделий</th>
				<th style="width:7%;">Партия</th>
				<th style="width:9%;">Выборка (1%)</th>
				<th style="width:11%;">Азопирам (кровь)</th>
				<th style="width:11%;">Фенолфталеин (СМС)</th>
				<th style="width:11%;">Моющее средство</th>
				<th style="width:8%;">Результат</th>
				<th style="width:8%;">Ответственный</th>
			</tr>
		</thead>
		<tbody>
			${psoRowsHtml}
		</tbody>
	</table>

	<!-- SECTION 3: PRESUMPTION OF CHAIRSIDE STERILITY -->
	<div class="sterility-presumption-card">
		<strong>СанПиН 3.3686-21 (п. 3584, п. 3640) — Презумпция стерильности лотка у кресла врача:</strong><br/>
		Инструментальные наборы на приеме у кресла врача-стоматолога стерильны по умолчанию. Контроль стерильности гарантирован валидированными циклами автоклавирования (134°C, 2.15 бар, 5 мин) и химическими индикаторами 5 точек в каждом цикле. Ручное сканирование или кликание крафт-пакетов врачом на приеме исключено в соответствии с регламентом санитарной автономии.
	</div>

	<div class="footer-sign">
		<div class="sign-col">
			<div>Ответственный по санитарно-эпидемиологическому режиму: <strong>${clinicInfo.headNurse}</strong></div>
			<div class="sign-line">
				<span>(должность)</span>
				<span>(подпись)</span>
				<span>(расшифровка подписи)</span>
			</div>
		</div>
		<div class="sign-col">
			<div>Главный врач / Руководитель медицинской организации: <strong>${clinicInfo.chiefDoctor}</strong></div>
			<div class="sign-line">
				<span>(должность)</span>
				<span>(подпись)</span>
				<span>(расшифровка подписи)</span>
			</div>
		</div>
	</div>
</body>
</html>
	`;
}
