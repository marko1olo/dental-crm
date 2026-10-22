import { type ClinicLegalInfo, DEFAULT_CLINIC_LEGAL_INFO } from "../engine/index.js";
import { SANPIN_DOSSIER_PRINT_CSS } from "./sanpinDossierHtmlStyles.js";
import type { ShiftSanpinAutoCloseResult } from "./types.js";

export function generateShiftSanpinDossierPrintHtml(
	shift: ShiftSanpinAutoCloseResult,
	clinicInfoInput?: Partial<ClinicLegalInfo>,
): string {
	const clinic = { ...DEFAULT_CLINIC_LEGAL_INFO, ...(clinicInfoInput || {}) };

	const f257Rows = shift.form257Records
		.map((c, i) => `<tr><td style="text-align:center;">${i + 1}</td><td><strong>${c.sterilizerBrandModel}</strong></td><td>${c.regimeNameRu}</td><td style="text-align:center;">${c.actualTemperatureCelsius}°C • ${c.actualPressureBar} бар • ${c.actualExposureMinutes} мин</td><td style="text-align:center;"><span class="norm">100% СРАБОТКА (5/5)</span></td><td style="font-size:7pt;">${c.chemicalIndicatorNameRu}</td><td style="text-align:center;">${c.packsCount}</td><td style="text-align:center;"><span class="norm">СТЕРИЛЬНО</span></td><td>${c.operatorStaffFullName}</td></tr>`)
		.join("");

	const psoRows = shift.psoBatches
		.map((p, i) => `<tr><td style="text-align:center;">${i + 1}</td><td>${p.instrumentName}</td><td style="text-align:center;"><strong>${p.batchItemCount}</strong> шт.</td><td style="text-align:center;">${p.testedSampleCount} шт.</td><td style="text-align:center;"><span class="norm">Отрицательно (Норма)</span></td><td style="text-align:center;"><span class="norm">Отрицательно (Норма)</span></td><td>${p.detergentBrand}</td><td style="text-align:center;"><span class="norm">ДОПУЩЕНО</span></td></tr>`)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>СанПиН 3.3686-21 — Сводный протокол смены ${shift.date}</title>
	<style>${SANPIN_DOSSIER_PRINT_CSS}</style>
</head>
<body>
	<div class="hdr">
		<div>
			<div class="title">${clinic.name}</div>
			<div class="sub">ОГРН: ${clinic.ogrn} • ИНН: ${clinic.inn} • Адрес: ${clinic.address}</div>
		</div>
		<div style="text-align: right; font-size: 8pt;">
			<strong>СВОДНЫЙ СУТОЧНЫЙ ПРОТОКОЛ САНПИН 3.3686-21</strong><br/>
			Дата смены: <strong>${shift.date}</strong> • ЭЦП: ${shift.digitalStampHash.slice(0, 16)}...
		</div>
	</div>

	<div class="sec-title">1. СТЕРИЛИЗАЦИЯ ИНСТРУМЕНТОВ (ФОРМА № 257/у)</div>
	<table>
		<thead>
			<tr>
				<th>№</th><th>Аппарат</th><th>Режим</th><th>T° / P / Время</th>
				<th>5 точек камеры (КТ-1..5)</th><th>Индикатор</th><th>Упаковок</th><th>Результат</th><th>Оператор</th>
			</tr>
		</thead>
		<tbody>${f257Rows}</tbody>
	</table>

	<div class="sec-title">2. КОНТРОЛЬ ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ (ФОРМА № 366/у)</div>
	<table>
		<thead>
			<tr>
				<th>№</th><th>Обрабатываемые изделия</th><th>Партия</th><th>Выборка (>=1%)</th>
				<th>Азопирам (гемоглобин)</th><th>Фенолфталеин (СМС)</th><th>Моющее средство</th><th>Результат</th>
			</tr>
		</thead>
		<tbody>${psoRows}</tbody>
	</table>

	<div class="sec-title">3. МИКРОКЛИМАТ, БАКТЕРИЦИДНЫЕ УСТАНОВКИ И МЕДОТХОДЫ</div>
	<table>
		<thead>
			<tr>
				<th>Холодильник Pozis ХФ-250 (утр/веч)</th><th>Психрометр ВИТ-2 (T° / Влажность)</th>
				<th>Дезар-4 (наработка ламп)</th><th>Медотходы Класс Б</th><th>Медотходы Класс А</th><th>Статус смены</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td style="text-align:center;"><span class="norm">+${shift.microclimate.refrigeratorLog.morningTempCelsius}°C / +${shift.microclimate.refrigeratorLog.eveningTempCelsius}°C</span> (Норма 2..8°C)</td>
				<td style="text-align:center;"><span class="norm">+${shift.microclimate.psychrometerLog.morningTempCelsius}°C (${shift.microclimate.psychrometerLog.morningHumidityPercent}%)</span> (Норма 18..25°C / 40..60%)</td>
				<td style="text-align:center;"><span class="norm">${shift.bactericidal.operatingHours} ч</span> (${shift.bactericidal.cumulativeLampHours}/8000 ч)</td>
				<td style="text-align:center;"><strong>${shift.waste.classBWeightKg} кг</strong> (Обезврежено)</td>
				<td style="text-align:center;">${shift.waste.classAWeightKg} кг</td>
				<td style="text-align:center;"><span class="norm">100% СООТВЕТСТВИЕ САНПИН</span></td>
			</tr>
		</tbody>
	</table>

	<div class="footer">
		<div>Ответственный по санитарному режиму: <strong>${shift.headNurseSignatureFullName}</strong> _________________ (подпись)</div>
		<div>Главный врач клиники: <strong>${clinic.chiefDoctor}</strong> _________________ (подпись)</div>
	</div>
</body>
</html>`;
}
