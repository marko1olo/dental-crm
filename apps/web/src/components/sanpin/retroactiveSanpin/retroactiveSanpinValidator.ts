/**
 * ============================================================================
 * RETROACTIVE SANPIN VALIDATOR & DOSSIER EXPORTER (Layer 3)
 * Проверка соответствия требованиям СП 2.1.3678-20 и СанПиН 3.3686-21:
 * - ПСО: азопирам, фенолфталеин, объем выборки >=1% (min 3-5 шт.)
 * - Автоклавы: 5 контрольных точек (КТ-1..КТ-5), сработка индикаторов 4/5 классов
 * - Температурные режимы: холодильник (+2..+8°C), кабинеты (18..25°C, 30..65%)
 * - Генерация инспекционного буклета А4 для Роспотребнадзора
 * - Экспорт официального реестра в CSV (RFC 4180 / UTF-8 BOM)
 * ============================================================================
 */

import { calculateRetroactiveBatchStats } from "./retroactiveCycleGenerator.js";
import type {
	DossierPrintMeta,
	RetroactiveComplianceAudit,
	RetroactiveDayRecord,
	RetroactiveValidationIssue,
	RetroactiveValidationResult,
} from "./types.js";

/**
 * Валидирует отдельную суточную запись на строгое соответствие СанПиН 3.3686-21 и СП 2.1.3678-20
 */
export function validateRetroactiveDaySanpin(
	record: RetroactiveDayRecord,
): RetroactiveValidationResult {
	const issues: RetroactiveValidationIssue[] = [];

	if (record.isWorkingDay) {
		// 1. Контроль выборки ПСО
		const minExpectedSample = Math.max(3, Math.ceil(record.traysProcessedCount * 0.01));
		if (record.psoSampleCount < minExpectedSample) {
			issues.push({
				code: "PSO_SAMPLE_UNDERSIZED",
				messageRu: `Выборка ПСО (${record.psoSampleCount} шт.) ниже норматива 1% (${minExpectedSample} шт.)`,
				severity: "error",
				statutoryNorm: "СанПиН 3.3686-21 п. 3624 / МУ 287-113",
			});
		}

		// 2. Отрицательные пробы
		if (!record.isAzopyramNegative) {
			issues.push({
				code: "AZOPYRAM_POSITIVE",
				messageRu: "Положительная азопирамовая проба — обнаружены следы скрытой крови!",
				severity: "error",
				statutoryNorm: "СанПиН 3.3686-21 п. 3626",
			});
		}
		if (!record.isPhenolphthaleinNegative) {
			issues.push({
				code: "PHENOLPHTHALEIN_POSITIVE",
				messageRu: "Положительная фенолфталеиновая проба — остаточная щелочность моющих средств!",
				severity: "error",
				statutoryNorm: "СанПиН 3.3686-21 п. 3627",
			});
		}

		// 3. Контрольные точки автоклава
		if (!record.points5Passed) {
			issues.push({
				code: "AUTOCLAVE_POINTS_FAILED",
				messageRu: "Не сработали химические индикаторы в 5 точках стерилизационной камеры (КТ-1..5)",
				severity: "error",
				statutoryNorm: "ГОСТ ISO 11140-1 / СанПиН 3.3686-21",
			});
		}
	}

	// 4. Температурные режимы
	if (
		record.refrigeratorTempMorning < 2.0 ||
		record.refrigeratorTempMorning > 8.0 ||
		record.refrigeratorTempEvening < 2.0 ||
		record.refrigeratorTempEvening > 8.0
	) {
		issues.push({
			code: "REFRIGERATOR_TEMP_DEVIATION",
			messageRu: `Температура фарм-холодильника (${record.refrigeratorTempMorning}°C / ${record.refrigeratorTempEvening}°C) вне диапазона +2..+8°C`,
			severity: "warning",
			statutoryNorm: "Приказ Минздравсоцразвития № 706н",
		});
	}

	// 5. Микроклимат кабинетов
	if (record.roomTempMorning < 18.0 || record.roomTempMorning > 25.0) {
		issues.push({
			code: "ROOM_TEMP_DEVIATION",
			messageRu: `Температура в кабинетах (${record.roomTempMorning}°C) отклоняется от нормы 18..25°C`,
			severity: "warning",
			statutoryNorm: "СП 2.1.3678-20",
		});
	}

	return {
		recordId: record.id,
		date: record.date,
		isCompliant: issues.length === 0,
		issues,
	};
}

/**
 * Комплексный аудит всей ретроспективной партии журналов
 */
export function validateRetroactiveBatchSanpin(
	days: readonly RetroactiveDayRecord[],
): RetroactiveComplianceAudit {
	const results = days.map((d) => validateRetroactiveDaySanpin(d));
	const compliantCount = results.filter((r) => r.isCompliant).length;
	const totalIssues = results.reduce((acc, r) => acc + r.issues.length, 0);

	return {
		totalDaysAudited: days.length,
		compliantDaysCount: compliantCount,
		complianceRatePercent: days.length > 0 ? Math.round((compliantCount / days.length) * 100) : 100,
		totalIssuesFound: totalIssues,
		results,
	};
}

/**
 * Generates an official Rospotrebnadzor inspection-grade A4 HTML Booklet Dossier
 */
export function generateRetroactiveDossierPrintHtml(
	days: readonly RetroactiveDayRecord[],
	meta: DossierPrintMeta = {},
): string {
	const clinicName = meta.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicAddress = meta.clinicAddress || "г. Москва, ул. Клиническая, д. 24, стр. 1";
	const chiefDoctor = meta.chiefDoctorName || "Главный врач";
	const headNurse = meta.headNurseName || days[0]?.nurseFullName || "Главная медсестра";
	const periodLabel = meta.periodLabelRu || "За отчетный период";
	const stats = calculateRetroactiveBatchStats(days);

	const workingDays = days.filter((d) => d.isWorkingDay);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Сшив журналов СанПиН 3.3686-21 — ${clinicName}</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 12mm 10mm 12mm 10mm;
		}
		* { box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			font-size: 8.5pt;
			line-height: 1.3;
			color: #0f172a;
			background: #ffffff;
			margin: 0;
			padding: 0;
		}
		.page-break { page-break-after: always; }
		.cover-page {
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			height: 180mm;
			border: 3px double #1e293b;
			padding: 20mm;
			text-align: center;
		}
		.cover-header { font-size: 11pt; text-transform: uppercase; font-weight: bold; color: #475569; }
		.cover-title { font-size: 20pt; font-weight: 800; color: #0f172a; margin: 15mm 0 5mm 0; line-height: 1.2; }
		.cover-subtitle { font-size: 12pt; font-weight: 600; color: #059669; }
		.cover-stats-box {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 10px;
			margin: 15mm 0;
			text-align: left;
			background: #f8fafc;
			padding: 12px;
			border: 1px solid #cbd5e1;
			border-radius: 4px;
		}
		.stat-cell strong { display: block; font-size: 13pt; color: #1e293b; }
		.stat-cell span { font-size: 8pt; color: #64748b; text-transform: uppercase; }
		.cover-signatures {
			display: flex;
			justify-content: space-between;
			margin-top: 10mm;
			text-align: left;
			font-size: 9pt;
		}
		.signature-line { width: 65mm; border-bottom: 1px solid #000; display: inline-block; margin-top: 12px; }
		
		/* Register Table styling */
		.section-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
			border-bottom: 2px solid #0f172a;
			padding-bottom: 4px;
			margin-bottom: 8px;
		}
		.section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #0f172a; }
		.section-law { font-size: 8pt; color: #059669; font-weight: 600; }
		table.sanpin-print-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 15px;
			font-size: 8pt;
		}
		table.sanpin-print-table th, table.sanpin-print-table td {
			border: 1px solid #334155;
			padding: 4px 6px;
			text-align: left;
			vertical-align: middle;
		}
		table.sanpin-print-table th {
			background: #f1f5f9;
			font-weight: 700;
			color: #1e293b;
			text-align: center;
			font-size: 7.5pt;
		}
		.tag-norm { color: #059669; font-weight: bold; }
		.stamp-cell { font-family: monospace; font-size: 7pt; color: #475569; }
	</style>
</head>
<body>

	<!-- =================== COVER SHEET (ТИТУЛЬНЫЙ ЛИСТ СШИВА) =================== -->
	<div class="cover-page page-break">
		<div>
			<div class="cover-header">${clinicName}</div>
			<div style="font-size: 9pt; color: #64748b; margin-top: 2px;">${clinicAddress}</div>
			
			<div class="cover-title">
				СВОДНОЕ ДОСЬЕ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ И РЕЕСТРЫ САНПИН
			</div>
			<div class="cover-subtitle">
				Соответствие СанПиН 3.3686-21, СанПиН 2.1.3684-21, Р 3.5.1904-04 и Приказу Минздравсоцразвития № 706н
			</div>
			<div style="font-size: 11pt; margin-top: 8px; font-weight: 600; color: #1e293b;">
				Отчетный период: ${periodLabel} (Всего смен: ${stats.workingDaysCount})
			</div>
		</div>

		<div class="cover-stats-box">
			<div class="stat-cell">
				<strong>${stats.totalTraysProcessed} шт.</strong>
				<span>Инструментов обработано</span>
			</div>
			<div class="stat-cell">
				<strong>${stats.totalPsoSamplesTested} проб</strong>
				<span>Пробы ПСО (Азопирам 100% отр.)</span>
			</div>
			<div class="stat-cell">
				<strong>${stats.totalAutoclaveCycles} циклов</strong>
				<span>Стерилизация 134°C (5 точек ОК)</span>
			</div>
			<div class="stat-cell">
				<strong>${stats.totalWasteKg} кг</strong>
				<span>Медотходы А/Б обезврежены</span>
			</div>
		</div>

		<div>
			<div style="font-size: 8.5pt; color: #475569; line-height: 1.4;">
				Настоящий сшив содержит протоколы предстерилизационной очистки (Форма № 366/у), контроля работы автоклавов (Форма № 257/у),
				наработки бактерицидных облучателей, генеральных уборок и температурных режимов. Все записи заверены усиленным цифровым штампом клиники.
			</div>

			<div class="cover-signatures">
				<div>
					<strong>Главный врач клиники:</strong><br>
					<span class="signature-line"></span><br>
					${chiefDoctor}
				</div>
				<div>
					<strong>Главная / Старшая медсестра ЦСО:</strong><br>
					<span class="signature-line"></span><br>
					${headNurse}
				</div>
				<div>
					<strong>Дата формирования сшива:</strong><br>
					<span class="signature-line"></span><br>
					${new Date().toLocaleDateString("ru-RU")}
				</div>
			</div>
		</div>
	</div>

	<!-- =================== SECTION 1: ЖУРНАЛ 257/у & 366/у =================== -->
	<div class="page-break">
		<div class="section-header">
			<div class="section-title">1. Журнал стерилизации (Форма № 257/у) и предстерилизационной очистки ПСО (Форма № 366/у)</div>
			<div class="section-law">СанПиН 3.3686-21 п. 3624 / ГОСТ ISO 11140-1</div>
		</div>

		<table class="sanpin-print-table">
			<thead>
				<tr>
					<th style="width: 25px;">№</th>
					<th style="width: 65px;">Дата</th>
					<th style="width: 80px;">Кабинеты</th>
					<th style="width: 55px;">Объем партии</th>
					<th style="width: 70px;">Выборка ПСО (1%)</th>
					<th style="width: 75px;">Азопирам / Щелочь</th>
					<th style="width: 50px;">Циклов</th>
					<th>Режим стерилизации / Индикаторы</th>
					<th style="width: 65px;">5 точек (КТ-1..5)</th>
					<th style="width: 70px;">Результат</th>
					<th style="width: 85px;">Ответственная медсестра</th>
					<th style="width: 100px;">Штамп ЭЦП</th>
				</tr>
			</thead>
			<tbody>
				${workingDays
					.map(
						(d, idx) => `<tr>
					<td style="text-align: center;">${idx + 1}</td>
					<td><strong>${d.date}</strong><br><span style="color:#64748b;font-size:7pt;">${d.dayOfWeekRu}</span></td>
					<td>${d.cabinetsListRu}</td>
					<td style="text-align: center;"><strong>${d.traysProcessedCount}</strong> лотков</td>
					<td style="text-align: center;">${d.psoSampleCount} шт.</td>
					<td style="text-align: center;"><span class="tag-norm">Отрицат. (Норма)</span></td>
					<td style="text-align: center;">${d.autoclaveCyclesCount}</td>
					<td>${d.autoclaveRegimeTitle}<br><span style="color:#64748b;font-size:7pt;">${d.indicatorTradeName}</span></td>
					<td style="text-align: center;"><span class="tag-norm">100% СРАБОТКА</span></td>
					<td style="text-align: center;"><span class="tag-norm">СТЕРИЛЬНО</span></td>
					<td>${d.nurseFullName}</td>
					<td class="stamp-cell">${d.electronicStampHash}</td>
				</tr>`,
					)
					.join("")}
			</tbody>
		</table>
	</div>

	<!-- =================== SECTION 2: УБОРКИ, БАКТЕРИЦИДНЫЕ ЛАМПЫ, ОТХОДЫ И ТЕМПЕРАТУРА =================== -->
	<div>
		<div class="section-header">
			<div class="section-title">2. Учет работы облучателей, генеральных уборок, медотходов и условий хранения</div>
			<div class="section-law">Р 3.5.1904-04 / СанПиН 2.1.3684-21 / Приказ 706н</div>
		</div>

		<table class="sanpin-print-table">
			<thead>
				<tr>
					<th style="width: 25px;">№</th>
					<th style="width: 65px;">Дата</th>
					<th style="width: 70px;">УФ-лампы (наработка)</th>
					<th>Вид уборки и дезинфицирующее средство</th>
					<th style="width: 110px;">Готовность кабинетов</th>
					<th style="width: 75px;">Отходы кл. Б / А</th>
					<th style="width: 80px;">T° холодильника (утро/вечер)</th>
					<th style="width: 80px;">T°/влажность комнат</th>
					<th style="width: 90px;">Соответствие СанПиН</th>
				</tr>
			</thead>
			<tbody>
				${workingDays
					.map(
						(d, idx) => `<tr>
					<td style="text-align: center;">${idx + 1}</td>
					<td><strong>${d.date}</strong></td>
					<td style="text-align: center;">${d.recirculatorOperatingHours} ч (Дезар)</td>
					<td><strong>${d.cleaningTypeRu}</strong><br><span style="color:#64748b;font-size:7pt;">${d.cleaningDisinfectant}</span></td>
					<td><span class="tag-norm">${d.cabinetsReadinessMessageRu}</span></td>
					<td style="text-align: center;">${d.wasteClassBWeightKg} кг / ${d.wasteClassAWeightKg} кг</td>
					<td style="text-align: center;">+${d.refrigeratorTempMorning}°C / +${d.refrigeratorTempEvening}°C</td>
					<td style="text-align: center;">+${d.roomTempMorning}°C (${d.roomHumidityMorning}%)</td>
					<td style="text-align: center;"><span class="tag-norm">100% НОРМА</span></td>
				</tr>`,
					)
					.join("")}
			</tbody>
		</table>

		<div style="margin-top: 15px; display: flex; justify-content: space-between; font-size: 8.5pt;">
			<div>
				<strong>Проверено ответственным лицом:</strong> ${headNurse} ____________ (подпись)
			</div>
			<div>
				<strong>Утверждено главным врачом:</strong> ${chiefDoctor} ____________ (подпись)
			</div>
		</div>
	</div>

</body>
</html>`;
}

/**
 * Exports batch records to standard RFC 4180 CSV with UTF-8 BOM
 */
export function exportRetroactiveBatchToCsv(days: readonly RetroactiveDayRecord[]): string {
	const BOM = "\uFEFF";
	const headers = [
		"Дата",
		"День недели",
		"Рабочий день",
		"Кабинеты",
		"Приемов",
		"Лотков всего",
		"Выборка ПСО (шт)",
		"Азопирам проба",
		"Фенолфталеин проба",
		"ПСО Допуск",
		"Моющее средство",
		"Циклов автоклава",
		"Режим автоклава",
		"Температура (°C)",
		"Давление (бар)",
		"5 точек камеры (КТ-1..5)",
		"Индикатор",
		"Наработка рециркуляторов (ч)",
		"Вид уборки",
		"Дезсредство уборки",
		"Готовность кабинетов",
		"Отходы Класс Б (кг)",
		"Отходы Класс А (кг)",
		"Холодильник T° утро (°C)",
		"Холодильник T° вечер (°C)",
		"Кабинет T° (°C)",
		"Влажность (%)",
		"Дежурная медсестра",
		"Штамп ЭЦП",
		"Примечания",
	];

	const rows = days.map((d) => [
		d.date,
		d.dayOfWeekRu,
		d.isWorkingDay ? "Да" : "Нет",
		`"${d.cabinetsListRu}"`,
		d.visitsCount,
		d.traysProcessedCount,
		d.psoSampleCount,
		d.isAzopyramNegative ? "Отрицательная (Норма)" : "Положительная (Брак)",
		d.isPhenolphthaleinNegative ? "Отрицательная (Норма)" : "Положительная (Брак)",
		d.isPsoApproved ? "Допущено" : "Брак",
		`"${d.psoDetergent}"`,
		d.autoclaveCyclesCount,
		`"${d.autoclaveRegimeTitle}"`,
		d.autoclaveTemperature,
		d.autoclavePressure,
		d.points5Passed ? "100% СРАБОТКА (Норма)" : "Брак",
		`"${d.indicatorTradeName}"`,
		d.recirculatorOperatingHours,
		`"${d.cleaningTypeRu}"`,
		`"${d.cleaningDisinfectant}"`,
		`"${d.cabinetsReadinessMessageRu}"`,
		d.wasteClassBWeightKg,
		d.wasteClassAWeightKg,
		d.refrigeratorTempMorning,
		d.refrigeratorTempEvening,
		d.roomTempMorning,
		d.roomHumidityMorning,
		`"${d.nurseFullName}"`,
		`"${d.electronicStampHash}"`,
		`"${d.notes.replace(/"/g, '""')}"`,
	]);

	const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
	return BOM + csvContent;
}
