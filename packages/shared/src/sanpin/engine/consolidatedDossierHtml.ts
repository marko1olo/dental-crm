/**
 * ============================================================================
 * SANPIN CONSOLIDATED PRODUCTION CONTROL DOSSIER HTML BINDER (LAYER 3)
 * Генератор сшива журналов «Сводный журнал производственного контроля СанПиН за период» (А4 Альбомная):
 * - Титульный лист с реквизитами клиники, лицензии № ЛО41-01137-77/00368421, номером тома и подписью главного врача;
 * - Раздел 1: Журнал предстерилизационной очистки (Форма № 366/у);
 * - Раздел 2: Журнал работы стерилизаторов (Форма № 257/у);
 * - Раздел 3: Журнал бактерицидных установок и генеральных уборок;
 * - Раздел 4: Журнал температурного режима холодильников;
 * - Лист сшива и заверения («В настоящем журнале пронумеровано, прошнуровано и скреплено печатью X листов»).
 * ============================================================================
 */

import { DEFAULT_CLINIC_LEGAL, formatRussianSheetsCount } from "./sanpinNorms.js";
import type {
	ConsolidatedSanpinJournalData,
	Form257Record,
} from "./types.js";

export function generateSanpinConsolidatedInspectionHtml(data: ConsolidatedSanpinJournalData): string {
	const clinic = data.clinicInfo || data.clinicLegalInfo || DEFAULT_CLINIC_LEGAL;
	const license = clinic.licenseNumber || "№ ЛО41-01137-77/00368421";
	const volume = data.volumeNumber || clinic.volumeNumber || 1;
	const periodLabel = data.periodLabelRu
		? data.periodLabelRu
		: data.dateRange
			? `с ${data.dateRange.from} по ${data.dateRange.to}`
			: `за текущий отчетный период (${new Date().toLocaleDateString("ru-RU")})`;

	const psoRecords = data.psoRecords || [];
	const form257Records = (data.form257Records || data.sterilizationCycles || []) as readonly Form257Record[];
	const bactericidalSessions = data.bactericidalSessions || [];
	const generalCleanings = data.generalCleanings || [];
	const temperatureLogs = data.temperatureLogs || [];
	const sterilizerEquipments = data.sterilizerEquipments || [];
	const bactericidalEquipments = data.bactericidalEquipments || [];

	// Calculate sheet count if not explicitly given
	const psoSheets = Math.max(1, Math.ceil(psoRecords.length / 14));
	const f257Sheets = Math.max(1, Math.ceil(form257Records.length / 10));
	const bacSheets = Math.max(1, Math.ceil(bactericidalSessions.length / 14));
	const cleanSheets = Math.max(1, Math.ceil(generalCleanings.length / 12));
	const tempSheets = Math.max(1, Math.ceil(temperatureLogs.length / 14));
	const computedTotalSheets = 1 + psoSheets + f257Sheets + bacSheets + cleanSheets + tempSheets + 1;
	const totalSheets = data.totalPagesCount || computedTotalSheets;
	const sheetsFormatted = formatRussianSheetsCount(totalSheets);

	// Section 1: PSO rows
	const psoRowsHtml = psoRecords
		.map((r, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; white-space: nowrap;">${new Date(r.timestamp).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.instrumentName}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.batchItemCount}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.testedSampleCount}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.isAzopyramNegative ? "Отрицат." : "ПОЛОЖИТ. (Кровь)"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.isPhenolphthaleinNegative ? "Отрицат." : "ПОЛОЖИТ. (Щелочь)"}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.detergentBrand || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: bold; text-align: center; color: ${r.isBatchApproved ? "#000" : "#d00"};">
				${r.isBatchApproved ? "Допущено" : "БРАК"}
			</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
				${r.operatorStaffFullName}<br>
				<span style="font-size: 7pt; color: #444;">${r.electronicStampVerified ? "[ЭЦП заверен]" : ""}</span>
			</td>
		</tr>`)
		.join("\n");

	// Section 2: Form 257 rows
	const f257RowsHtml = (form257Records || [])
		.map((rec, index) => {
			const pt1 = (rec.chamberPoints || []).find((p) => p.pointIndex === 1)?.status === "passed" ? "+" : "-";
			const pt2 = (rec.chamberPoints || []).find((p) => p.pointIndex === 2)?.status === "passed" ? "+" : "-";
			const pt3 = (rec.chamberPoints || []).find((p) => p.pointIndex === 3)?.status === "passed" ? "+" : "-";
			const pt4 = (rec.chamberPoints || []).find((p) => p.pointIndex === 4)?.status === "passed" ? "+" : "-";
			const pt5 = (rec.chamberPoints || []).find((p) => p.pointIndex === 5)?.status === "passed" ? "+" : "-";
			const verdictLabel = rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК";

			return `<tr>
				<td style="border: 1px solid #000; text-align:center; font-weight:600;">${index + 1}</td>
				<td style="border: 1px solid #000; text-align:center; white-space:nowrap;">
					${rec.date}<br/>
					<span style="font-size:7.5pt; color:#475569;">Цикл №${rec.cycleNumber}</span>
				</td>
				<td style="border: 1px solid #000;">
					<strong>${rec.sterilizerCode}</strong> (${rec.sterilizerBrandModel})<br/>
					<span style="font-size:7pt; color:#64748b;">Зав. № ${rec.sterilizerSerialNumber}</span>
				</td>
				<td style="border: 1px solid #000;">${rec.itemsDescriptionRu}</td>
				<td style="border: 1px solid #000; text-align:center;">
					${rec.packsCount}<br/>
					<span style="font-size:7pt; color:#64748b;">${rec.packagingNameRu}</span>
				</td>
				<td style="border: 1px solid #000; text-align:center; white-space:nowrap;">
					${rec.actualTemperatureCelsius}°C / ${rec.actualPressureBar} бар<br/>
					<strong>${rec.actualExposureMinutes} мин</strong>
				</td>
				<td style="border: 1px solid #000; font-size:7.5pt;">
					${rec.chemicalIndicatorNameRu}<br/>
					<span style="font-family:monospace; font-weight:bold;">КТ: [${pt1}][${pt2}][${pt3}][${pt4}][${pt5}]</span>
				</td>
				<td style="border: 1px solid #000; text-align:center; font-weight:bold; color:${rec.isCyclePassed ? "#000" : "#d00"};">
					${verdictLabel}
					${rec.rejectionReason ? `<br/><span style="font-size:7pt; font-weight:normal; color:#dc2626;">${rec.rejectionReason}</span>` : ""}
				</td>
				<td style="border: 1px solid #000; font-size:7.5pt;">
					${rec.operatorStaffFullName}<br/>
					<span style="font-size:6.5pt; color:#64748b;">${rec.operatorStaffPosition}</span>
				</td>
				<td style="border: 1px solid #000; font-size:7pt; text-align:center;">
					${rec.isHeadNurseVerified ? `<strong style="color:#059669;">Заверено</strong><br/>${rec.headNurseSignatureFullName || ""}` : "—"}
				</td>
			</tr>`;
		})
		.join("\n");

	// Section 2: Sterilizer Equipments rows (Equipment Fleet)
	const sterilizerEquipRowsHtml = (sterilizerEquipments || [])
		.map((eq, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;"><strong>${eq.name || eq.brandModel}</strong></td>
			<td style="border: 1px solid #000; padding: 4px; font-family: monospace; font-size: 7.5pt; text-align: center;">${eq.serialNumber || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">Класс ${eq.deviceClass || "B"} (${eq.deviceType || "Паровой"})</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${eq.chamberVolumeLiters ? `${eq.chamberVolumeLiters} л` : "—"}</td>
			<td style="border: 1px solid #000; padding: 4px;">${eq.locationRoom || "ЦСО"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${eq.verificationExpiryDate || "Действует"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${eq.status === "decommissioned" ? "#d00" : "#059669"};">
				${eq.status === "decommissioned" ? "Списан" : "Допущен"}
			</td>
		</tr>`)
		.join("\n");

	// Section 3.1: Bactericidal Equipments rows (Fleet & Lamp Hours)
	const bacEquipRowsHtml = (bactericidalEquipments || [])
		.map((eq, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;"><strong>${eq.roomName}</strong></td>
			<td style="border: 1px solid #000; padding: 4px;">${eq.deviceBrand}</td>
			<td style="border: 1px solid #000; padding: 4px; font-family: monospace; font-size: 7.5pt; text-align: center;">${eq.serialNumber || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${eq.deviceType === "recirculator_closed" ? "Рециркулятор (закрытый)" : eq.deviceType === "irradiator_open" ? "Облучатель (открытый)" : "Комбинированный"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${eq.lampType} (${eq.lampCount} шт)</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${eq.maxLampHours} ч</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${eq.totalOperatingHours} ч</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${eq.remainingLampHours} ч (${eq.remainingLampPercent}%)</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${eq.isLampCritical ? "#d00" : "#059669"};">
				${eq.lampStatus === "expired_replace_now" ? "Замена ламп!" : eq.lampStatus === "warning_replace_soon" ? "Внимание" : "Норма"}
			</td>
		</tr>`)
		.join("\n");

	// Section 3.1: Bactericidal sessions
	const bacRowsHtml = bactericidalSessions
		.map((s, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.date}</td>
			<td style="border: 1px solid #000; padding: 4px;"><strong>${s.roomName}</strong> (${s.deviceBrand})</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.sessionStartTime} — ${s.sessionEndTime}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.durationMinutes} мин (${s.durationHours} ч)</td>
			<td style="border: 1px solid #000; padding: 4px;">
				${s.operatingMode === "continuous_presence" ? "В присутствии людей" : s.operatingMode === "pre_op_preparation" ? "Предоперационный" : s.operatingMode === "post_cleaning" ? "После генеральной уборки" : "Периодический"}
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.cumulativeHoursAfterSession} ч</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${s.operatorStaffFullName}</td>
		</tr>`)
		.join("\n");

	// Section 3.2: General cleaning rows
	const cleanRowsHtml = generalCleanings
		.map((r, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.scheduledDate}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${new Date(r.actualDateTime).toLocaleDateString("ru-RU")}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.roomName}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.treatedAreaM2} м²</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.disinfectantName} (${r.solutionConcentrationPercent}%)</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.exposureTimeMinutes} мин</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.uvIrradiationMinutes} мин</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.ventilationMinutes} мин</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${r.operatorStaffFullName}</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt; text-align: center;">${r.isInspectorVerified ? "Заверено" : "—"}</td>
		</tr>`)
		.join("\n");

	// Section 4: Temperature logs
	const tempRowsHtml = temperatureLogs
		.map((r, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.measurementDate}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.measurementPeriod === "morning" ? "Утро (09:00)" : r.measurementPeriod === "evening" ? "Вечер (18:00)" : r.measurementPeriod}</td>
			<td style="border: 1px solid #000; padding: 4px;">
				<strong>${r.equipmentName}</strong><br>
				<span style="font-size: 7.5pt; color: #444;">${r.location} (Прибор: ${r.meterDeviceName}${r.meterSerialNumber ? ` №${r.meterSerialNumber}` : ""})</span>
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isWithinNorm ? "#000" : "#dc2626"};">
				${r.temperatureCelsius}°C
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">
				${r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? `${r.relativeHumidityPercent}%` : "—"}
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">
				${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}°C
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isWithinNorm ? "#059669" : "#dc2626"};">
				${r.isWithinNorm ? "Норма" : "ОТКЛОНЕНИЕ"}
				${r.correctiveAction ? `<br><span style="font-size: 7pt; font-weight: normal; color: #dc2626;">${r.correctiveAction}</span>` : ""}
			</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
				${r.operatorStaffFullName}
			</td>
		</tr>`)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Сводный журнал производственного контроля СанПиН (Том №${volume}) — ${clinic.name}</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 12mm 10mm 12mm 10mm;
			@bottom-right {
				content: "Том №${volume} • Лист " counter(page);
				font-family: 'Times New Roman', serif;
				font-size: 8pt;
			}
		}
		body {
			font-family: 'Times New Roman', Times, serif;
			font-size: 8.5pt;
			line-height: 1.2;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 0;
		}
		.page-break {
			page-break-after: always;
			break-after: page;
		}
		.cover-page {
			height: 175mm;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			border: 2px double #000;
			padding: 12mm;
			box-sizing: border-box;
			text-align: center;
		}
		.cover-gov {
			font-size: 9pt;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			font-weight: bold;
			border-bottom: 1px solid #000;
			padding-bottom: 4px;
			margin-bottom: 8px;
		}
		.cover-clinic {
			font-size: 13pt;
			font-weight: bold;
			margin-top: 4px;
		}
		.cover-legal {
			font-size: 8.5pt;
			color: #222;
			margin-top: 2px;
		}
		.cover-license-badge {
			display: inline-block;
			border: 1px solid #000;
			padding: 3px 10px;
			font-weight: bold;
			font-size: 9pt;
			margin-top: 6px;
			background: #fbfbfb;
		}
		.cover-main-title {
			font-size: 16pt;
			font-weight: bold;
			text-transform: uppercase;
			letter-spacing: 1px;
			margin: 14px 0 6px 0;
			line-height: 1.25;
		}
		.cover-volume {
			font-size: 14pt;
			font-weight: bold;
			color: #000;
			margin: 6px 0;
		}
		.cover-period {
			font-size: 10.5pt;
			font-weight: 600;
			margin-top: 4px;
		}
		.cover-subrules {
			font-size: 8.5pt;
			color: #333;
			max-width: 80%;
			margin: 6px auto;
		}
		.cover-approvals {
			display: flex;
			justify-content: space-between;
			text-align: left;
			font-size: 9pt;
			margin-top: 15px;
			padding: 0 10px;
		}
		.cover-footer-city {
			font-size: 9.5pt;
			font-weight: bold;
			margin-top: 10px;
		}
		.section-header {
			text-align: center;
			margin-bottom: 8px;
			border-bottom: 1px solid #000;
			padding-bottom: 4px;
		}
		.section-number {
			font-size: 9pt;
			font-weight: bold;
			color: #444;
			text-transform: uppercase;
		}
		.section-title {
			font-size: 11.5pt;
			font-weight: bold;
			text-transform: uppercase;
			margin: 2px 0;
		}
		.section-legal-ref {
			font-size: 7.5pt;
			color: #333;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 6px;
			font-size: 8pt;
		}
		th {
			border: 1px solid #000;
			padding: 4px 2px;
			background: #f2f2f2;
			font-size: 7.5pt;
			text-align: center;
			font-weight: bold;
		}
		td {
			border: 1px solid #000;
			padding: 3px 2px;
		}
		.cert-sheet-container {
			height: 175mm;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			box-sizing: border-box;
		}
		.cert-sheet-box {
			width: 190mm;
			border: 2px solid #000;
			padding: 15mm;
			text-align: center;
			background: #fafafa;
			box-shadow: inset 0 0 0 1px #000;
		}
		.cert-title {
			font-size: 13pt;
			font-weight: bold;
			text-transform: uppercase;
			letter-spacing: 1px;
			margin-bottom: 15px;
			border-bottom: 1px solid #000;
			padding-bottom: 6px;
		}
		.cert-statement {
			font-size: 11pt;
			line-height: 1.6;
			margin: 15px 0 25px 0;
			text-align: justify;
		}
		.cert-signatures {
			display: flex;
			justify-content: space-between;
			margin-top: 25px;
			font-size: 9.5pt;
			text-align: left;
		}
		.stamp-place {
			display: inline-block;
			border: 1px dashed #555;
			padding: 10px 18px;
			font-size: 8.5pt;
			color: #444;
			font-weight: bold;
			margin-top: 15px;
		}
	</style>
</head>
<body>

	<!-- ===================================================================== -->
	<!-- 1. ТИТУЛЬНЫЙ ЛИСТ С РЕКВИЗИТАМИ И ЛИЦЕНЗИЕЙ (COVER PAGE)               -->
	<!-- ===================================================================== -->
	<div class="cover-page">
		<div>
			<div class="cover-gov">МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ • ОРГАНЫ ГОСУДАРСТВЕННОГО САНИТАРНО-ЭПИДЕМИОЛОГИЧЕСКОГО НАДЗОРА</div>
			<div class="cover-clinic">${clinic.name}</div>
			<div class="cover-legal">ИНН: ${clinic.inn} | ОГРН: ${clinic.ogrn} | Адрес: ${clinic.address}</div>
			<div class="cover-license-badge">Лицензия на медицинскую деятельность: ${license}</div>
		</div>

		<div>
			<div class="cover-main-title">
				СВОДНЫЙ ЖУРНАЛ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ<br>
				СОБЛЮДЕНИЯ САНИТАРНО-ПРОТИВОЭПИДЕМИЧЕСКОГО РЕЖИМА
			</div>
			<div class="cover-volume">ТОМ № ${volume}</div>
			<div class="cover-period">Отчетный период: <strong>${periodLabel}</strong></div>
			<div class="cover-subrules">
				В соответствии с требованиями Федерального закона № 52-ФЗ «О санитарно-эпидемиологическом благополучии населения»,
				СанПиН 3.3686-21, СанПиН 2.1.3684-21, Приказа Минздравсоцразвития РФ № 706н и Приказа Минздрава РФ № 646н.
			</div>
		</div>

		<div>
			<div class="cover-approvals">
				<div style="width: 48%;">
					<strong>УТВЕРЖДАЮ:</strong><br>
					Главный врач клиники<br>
					___________________ / ${clinic.chiefDoctor} /<br>
					<span style="font-size: 8pt; color: #444;">«___» ____________ 2026 г. [ М.П. ]</span>
				</div>
				<div style="width: 48%; text-align: right;">
					<strong>ОТВЕТСТВЕННЫЙ ЗА КОНТРОЛЬ:</strong><br>
					Главная медицинская сестра<br>
					___________________ / ${clinic.headNurse} /<br>
					<span style="font-size: 8pt; color: #444;">«___» ____________ 2026 г.</span>
				</div>
			</div>
			<div class="cover-footer-city">г. Москва, 2026 год</div>
		</div>
	</div>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 2. РАЗДЕЛ 1: ЖУРНАЛ ПСО (ФОРМА № 366/у)                                -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 1 • СанПиН 3.3686-21 (п. 3584)</div>
		<div class="section-title">ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)</div>
		<div class="section-legal-ref">Азопирамовая, фенолфталеиновая и масляная пробы (выборка 1% от партии изделий, не менее 3–5 единиц) • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 75px;">Дата и время</th>
				<th>Наименование изделий (партия)</th>
				<th style="width: 40px;">В партии</th>
				<th style="width: 40px;">Проб</th>
				<th style="width: 65px;">Азопирам (кровь)</th>
				<th style="width: 65px;">Фенолфталеин</th>
				<th>Моющее / дез. средство</th>
				<th style="width: 65px;">Результат</th>
				<th style="width: 105px;">Исполнитель / ЭЦП</th>
			</tr>
		</thead>
		<tbody>
			${psoRowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 15px;">Записи предстерилизационной очистки за отчетный период отсутствуют (Записи за отчетный период отсутствуют)</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 3. РАЗДЕЛ 2: ЖУРНАЛ РАБОТЫ СТЕРИЛИЗАТОРОВ (ФОРМА № 257/у)             -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 2 • СанПиН 3.3686-21 (п. 3624, Таблица 3.13)</div>
		<div class="section-title">ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ (ФОРМА № 257/у)</div>
		<div class="section-legal-ref">Физический, химический (5 точек камеры КТ 1–5) и бактериологический контроль стерилизации • ${clinic.name}</div>
	</div>

	${sterilizerEquipRowsHtml ? `
	<div style="font-weight: bold; margin: 8px 0 4px; font-size: 8.5pt; color: #1e293b;">Парк автоклавов и стерилизационного оборудования клиники:</div>
	<table style="margin-bottom: 10px;">
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th>Наименование и модель</th>
				<th style="width: 90px;">Заводской номер</th>
				<th style="width: 80px;">Класс / Тип</th>
				<th style="width: 60px;">Объем камеры</th>
				<th style="width: 100px;">Кабинет / Место</th>
				<th style="width: 85px;">Поверка до</th>
				<th style="width: 70px;">Статус</th>
			</tr>
		</thead>
		<tbody>
			${sterilizerEquipRowsHtml}
		</tbody>
	</table>
	<div style="font-weight: bold; margin: 6px 0 3px; font-size: 8.5pt; color: #1e293b;">Циклы стерилизации за отчетный период:</div>` : ""}

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">Дата / Цикл</th>
				<th style="width: 110px;">Стерилизатор (марка, №)</th>
				<th>Стерилизуемые изделия</th>
				<th style="width: 65px;">Кол-во / Упаковка</th>
				<th style="width: 75px;">Режим (T°, P, время)</th>
				<th style="width: 110px;">Индикаторы (5 точек)</th>
				<th style="width: 65px;">Результат</th>
				<th style="width: 85px;">Оператор ЦСО</th>
				<th style="width: 70px;">Заверка</th>
			</tr>
		</thead>
		<tbody>
			${f257RowsHtml || '<tr><td colspan="10" style="text-align:center; padding:15px;">Записи циклов стерилизации за отчетный период отсутствуют (Записи циклов стерилизации отсутствуют)</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 4. РАЗДЕЛ 3: БАКТЕРИЦИДНЫЕ УСТАНОВКИ И ГЕНЕРАЛЬНЫЕ УБОРКИ              -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 3 • Часть 1 • Руководство Р 3.5.1904-04 / СанПиН 3.3686-21</div>
		<div class="section-title">ЖУРНАЛ РЕГИСТРАЦИИ И КОНТРОЛЯ РАБОТЫ БАКТЕРИЦИДНЫХ УСТАНОВОК</div>
		<div class="section-legal-ref">Учет наработки часов ультрафиолетовых ламп и режимов обеззараживания воздуха помещений • ${clinic.name}</div>
	</div>

	${bacEquipRowsHtml ? `
	<div style="font-weight: bold; margin: 8px 0 4px; font-size: 8.5pt; color: #1e293b;">Реестр бактерицидных облучателей и рециркуляторов (учет ресурса ламп):</div>
	<table style="margin-bottom: 10px;">
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th>Помещение / Кабинет</th>
				<th>Модель аппарата</th>
				<th style="width: 85px;">Зав. номер</th>
				<th style="width: 85px;">Тип установки</th>
				<th style="width: 80px;">Лампы (тип, шт)</th>
				<th style="width: 65px;">Ресурс (ч)</th>
				<th style="width: 65px;">Наработка (ч)</th>
				<th style="width: 75px;">Остаток (ч)</th>
				<th style="width: 75px;">Состояние</th>
			</tr>
		</thead>
		<tbody>
			${bacEquipRowsHtml}
		</tbody>
	</table>
	<div style="font-weight: bold; margin: 6px 0 3px; font-size: 8.5pt; color: #1e293b;">Сеансы обеззараживания воздуха за отчетный период:</div>` : ""}

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">Дата</th>
				<th>Помещение и марка аппарата</th>
				<th style="width: 85px;">Время вкл/выкл</th>
				<th style="width: 75px;">Длительность</th>
				<th>Режим обеззараживания</th>
				<th style="width: 75px;">Наработка</th>
				<th style="width: 100px;">Оператор</th>
			</tr>
		</thead>
		<tbody>
			${bacRowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 15px;">Сеансы работы установок за отчетный период отсутствуют (Сеансы работы установок отсутствуют)</td></tr>'}
		</tbody>
	</table>

	<div style="margin-top: 12px;" class="section-header">
		<div class="section-number">Раздел 3 • Часть 2 • СанПиН 3.3686-21 (раздел IV)</div>
		<div class="section-title">ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК И ЗАКЛЮЧИТЕЛЬНОЙ ДЕЗИНФЕКЦИИ</div>
		<div class="section-legal-ref">График 1 раз в 7 дней для клинических кабинетов и ЦСО • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">План</th>
				<th style="width: 65px;">Факт</th>
				<th>Помещение / Кабинет</th>
				<th style="width: 40px;">Площадь</th>
				<th>Дезсредство (%)</th>
				<th style="width: 45px;">Эксп.</th>
				<th style="width: 40px;">УФ</th>
				<th style="width: 45px;">Проветр.</th>
				<th style="width: 90px;">Исполнитель</th>
				<th style="width: 60px;">Контроль</th>
			</tr>
		</thead>
		<tbody>
			${cleanRowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 15px;">Записи проведения генеральных уборок за отчетный период отсутствуют (Записи генеральных уборок отсутствуют)</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 5. РАЗДЕЛ 4: ТЕМПЕРАТУРНЫЙ РЕЖИМ ХОЛОДИЛЬНИКОВ (ПРИКАЗ 706н)           -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 4 • Приказ Минздравсоцразвития РФ № 706н / Приказ Минздрава РФ № 646н</div>
		<div class="section-title">ЖУРНАЛ РЕГИСТРАЦИИ ТЕМПЕРАТУРНОГО РЕЖИМА И ВЛАЖНОСТИ В ХОЛОДИЛЬНИКАХ</div>
		<div class="section-legal-ref">Ежедневный двукратный контроль условий хранения лекарственных средств и термолабильных препаратов • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 70px;">Дата</th>
				<th style="width: 75px;">Период</th>
				<th>Объект контроля (холодильник, место, прибор)</th>
				<th style="width: 60px;">Факт T°</th>
				<th style="width: 55px;">Влажность</th>
				<th style="width: 70px;">Норма T°</th>
				<th style="width: 85px;">Результат</th>
				<th style="width: 105px;">Ответственный</th>
			</tr>
		</thead>
		<tbody>
			${tempRowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 15px;">Записи контроля температурного режима за отчетный период отсутствуют (Записи температурного режима отсутствуют)</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 6. ЛИСТ СШИВА И ЗАВЕРЕНИЯ ТОМА (CERTIFICATION SHEET)                   -->
	<!-- ===================================================================== -->
	<div class="cert-sheet-container">
		<div class="cert-sheet-box">
			<div class="cert-title">ЗАВЕРИТЕЛЬНАЯ НАДПИСЬ СШИВА ТОМА № ${volume}</div>
			<div class="cert-statement">
				В настоящем Сводном журнале производственного контроля соблюдения санитарно-противоэпидемического режима
				(СанПиН 3.3686-21, СанПиН 2.1.3684-21, Приказ 706н) за период <strong>${periodLabel}</strong><br><br>
				пронумеровано, прошнуровано и скреплено оттиском печати:<br><br>
				<span style="font-size: 14pt; font-weight: bold; text-decoration: underline;">
					${sheetsFormatted.formattedRu}
				</span>
			</div>

			<div class="cert-signatures">
				<div style="width: 48%;">
					Главный врач клиники:<br><br>
					___________________ / ${clinic.chiefDoctor} /
				</div>
				<div style="width: 48%; text-align: right;">
					Главная медицинская сестра:<br><br>
					___________________ / ${clinic.headNurse} /
				</div>
			</div>

			<div style="margin-top: 20px;">
				<div class="stamp-place">
					МЕСТО ДЛЯ ОТТИСКА ПЕЧАТИ [ М.П. ]
				</div>
			</div>

			<div style="margin-top: 15px; font-size: 8pt; color: #444;">
				Медицинская организация: ${clinic.name} (ИНН: ${clinic.inn}, ОГРН: ${clinic.ogrn})<br>
				Лицензия на осуществление медицинской деятельности: ${license}<br>
				Дата оформления и опломбирования сшива: «___» ____________ 2026 г.
			</div>
		</div>
	</div>

</body>
</html>`;
}
