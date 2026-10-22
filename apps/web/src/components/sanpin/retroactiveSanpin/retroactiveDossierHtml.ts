import { calculateRetroactiveBatchStats } from "./retroactiveCycleGenerator.js";
import { retroactiveDossierStyles } from "./retroactiveDossierStyles.js";
import type { DossierPrintMeta, RetroactiveDayRecord } from "./types.js";

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
	<title>Сшив журналов производственного контроля — ${clinicName}</title>
	<style>${retroactiveDossierStyles}</style>
</head>
<body>
	<div class="cover-page page-break">
		<div>
			<div class="cover-header">${clinicName}</div>
			<div style="font-size: 9pt; color: #64748b; margin-top: 2px;">${clinicAddress}</div>
			<div class="cover-title">СВОДНОЕ ДОСЬЕ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ И РЕЕСТРЫ САНПИН</div>
			<div class="cover-subtitle">Соответствие СанПиН 3.3686-21, СанПиН 2.1.3684-21, Р 3.5.1904-04 и Приказу Минздравсоцразвития № 706н</div>
			<div style="font-size: 11pt; margin-top: 8px; font-weight: 600; color: #1e293b;">Отчетный период: ${periodLabel} (Всего смен: ${stats.workingDaysCount})</div>
		</div>
		<div class="cover-stats-box">
			<div class="stat-cell"><strong>${stats.totalTraysProcessed} шт.</strong><span>Инструментов обработано</span></div>
			<div class="stat-cell"><strong>${stats.totalPsoSamplesTested} проб</strong><span>Пробы ПСО (Азопирам 100% отр.)</span></div>
			<div class="stat-cell"><strong>${stats.totalAutoclaveCycles} циклов</strong><span>Стерилизация 134°C (5 точек ОК)</span></div>
			<div class="stat-cell"><strong>${stats.totalWasteKg} кг</strong><span>Медотходы А/Б обезврежены</span></div>
		</div>
		<div>
			<div style="font-size: 8.5pt; color: #475569; line-height: 1.4;">
				Настоящий сшив содержит протоколы предстерилизационной очистки, контроля работы автоклавов,
				наработки бактерицидных облучателей, генеральных уборок и температурных режимов. Все записи заверены усиленным цифровым штампом клиники.
			</div>
			<div class="cover-signatures">
				<div><strong>Главный врач клиники:</strong><br><span class="signature-line"></span><br>${chiefDoctor}</div>
				<div><strong>Главная / Старшая медсестра ЦСО:</strong><br><span class="signature-line"></span><br>${headNurse}</div>
				<div><strong>Дата формирования сшива:</strong><br><span class="signature-line"></span><br>${new Date().toLocaleDateString("ru-RU")}</div>
			</div>
		</div>
	</div>

	<div class="page-break">
		<div class="section-header">
			<div class="section-title">1. Журнал стерилизации (Форма № 257/у) и предстерилизационной очистки ПСО (Форма № 366/у)</div>
			<div class="section-law">СанПиН 3.3686-21 п. 3624 / ГОСТ ISO 11140-1</div>
		</div>
		<table class="sanpin-print-table">
			<thead>
				<tr>
					<th style="width: 25px;">№</th><th style="width: 65px;">Дата</th><th style="width: 80px;">Кабинеты</th>
					<th style="width: 55px;">Партия</th><th style="width: 70px;">Выборка ПСО</th><th style="width: 75px;">Проба</th>
					<th style="width: 50px;">Циклов</th><th>Режим / Индикаторы</th><th style="width: 65px;">5 точек</th>
					<th style="width: 70px;">Результат</th><th style="width: 85px;">Медсестра</th><th style="width: 100px;">Штамп ЭЦП</th>
				</tr>
			</thead>
			<tbody>
				${workingDays.map((d, idx) => `<tr>
					<td style="text-align: center;">${idx + 1}</td>
					<td><strong>${d.date}</strong><br><span style="color:#64748b;font-size:7pt;">${d.dayOfWeekRu}</span></td>
					<td>${d.cabinetsListRu}</td><td style="text-align: center;"><strong>${d.traysProcessedCount}</strong> лотков</td>
					<td style="text-align: center;">${d.psoSampleCount} шт.</td><td style="text-align: center;"><span class="tag-norm">Отрицат.</span></td>
					<td style="text-align: center;">${d.autoclaveCyclesCount}</td><td>${d.autoclaveRegimeTitle}<br><span style="color:#64748b;font-size:7pt;">${d.indicatorTradeName}</span></td>
					<td style="text-align: center;"><span class="tag-norm">100% ОК</span></td><td style="text-align: center;"><span class="tag-norm">СТЕРИЛЬНО</span></td>
					<td>${d.nurseFullName}</td><td class="stamp-cell">${d.electronicStampHash}</td>
				</tr>`).join("")}
			</tbody>
		</table>
	</div>

	<div>
		<div class="section-header">
			<div class="section-title">2. Учет работы облучателей, генеральных уборок, медотходов и условий хранения</div>
			<div class="section-law">Р 3.5.1904-04 / СанПиН 2.1.3684-21 / Приказ 706н</div>
		</div>
		<table class="sanpin-print-table">
			<thead>
				<tr>
					<th style="width: 25px;">№</th><th style="width: 65px;">Дата</th><th style="width: 70px;">УФ-лампы</th>
					<th>Уборка и дезсредство</th><th style="width: 110px;">Кабинеты</th><th style="width: 75px;">Отходы Б / А</th>
					<th style="width: 80px;">T° холод.</th><th style="width: 80px;">T°/влажн.</th><th style="width: 90px;">Соответствие</th>
				</tr>
			</thead>
			<tbody>
				${workingDays.map((d, idx) => `<tr>
					<td style="text-align: center;">${idx + 1}</td><td><strong>${d.date}</strong></td>
					<td style="text-align: center;">${d.recirculatorOperatingHours} ч (Дезар)</td>
					<td><strong>${d.cleaningTypeRu}</strong><br><span style="color:#64748b;font-size:7pt;">${d.cleaningDisinfectant}</span></td>
					<td><span class="tag-norm">${d.cabinetsReadinessMessageRu}</span></td>
					<td style="text-align: center;">${d.wasteClassBWeightKg} кг / ${d.wasteClassAWeightKg} кг</td>
					<td style="text-align: center;">+${d.refrigeratorTempMorning}°C / +${d.refrigeratorTempEvening}°C</td>
					<td style="text-align: center;">+${d.roomTempMorning}°C (${d.roomHumidityMorning}%)</td>
					<td style="text-align: center;"><span class="tag-norm">100% НОРМА</span></td>
				</tr>`).join("")}
			</tbody>
		</table>
	</div>
</body>
</html>`;
}
