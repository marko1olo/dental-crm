/**
 * ============================================================================
 * SANPIN 3.3686-21 OFFICIAL PRINT & HTML REPORT GENERATORS (LAYER 3)
 * Печатные макеты журналов (ПСО, Форма № 257/у, Бактерицидный, Генеральные уборки,
 * Экспресс-контроль готовности кабинетов, Температурный режим холодильников)
 * ============================================================================
 */

import { renderDigitalSignatureStampHtml } from "../../crypto/visualSignatureStamp.js";
import { DEFAULT_CLINIC_LEGAL } from "./sanpinNorms.js";
import type {
	BactericidalEquipmentRecord,
	BactericidalSessionRecord,
	CabinetReadinessRecord,
	ClinicLegalInfo,
	Form257Record,
	GeneralCleaningJournalRecord,
	PsoJournalRecord,
	TemperatureHumidityLogRecord,
} from "./types.js";

export function renderSanpinOfficialStampsHtml(
	clinic: ClinicLegalInfo,
	roleLabel = "Медсестра ЦСО / Ответственная за стерилизацию",
	ukepOptions?: {
		certificateSerialNumber?: string | undefined;
		certificateSubject?: string | undefined;
		certificateIssuer?: string | undefined;
		validFrom?: string | undefined;
		validTo?: string | undefined;
		signedAt?: string | undefined;
	},
): string {
	if (ukepOptions?.certificateSerialNumber) {
		const stampHtml = renderDigitalSignatureStampHtml({
			certificateSerialNumber: ukepOptions.certificateSerialNumber,
			certificateSubject: ukepOptions.certificateSubject || `${clinic.headNurse} (${roleLabel})`,
			certificateIssuer: ukepOptions.certificateIssuer || "Минцифры России / Федеральное казначейство РФ",
			validFrom: ukepOptions.validFrom || "2026-01-01T00:00:00Z",
			validTo: ukepOptions.validTo || "2027-01-01T23:59:59Z",
			signedAt: ukepOptions.signedAt || new Date().toISOString(),
			signatureType: "ukep",
			organizationName: clinic.name,
		});

		return `
	<div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
		<div>
			${stampHtml}
		</div>
		<div style="text-align: center; border: 2px dashed #003399; border-radius: 50%; width: 115px; height: 115px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #003399; font-size: 6.5pt; line-height: 1.15; padding: 4px; box-sizing: border-box;">
			<span style="font-size: 5.5pt; text-transform: uppercase;">${clinic.name}</span>
			<strong style="font-size: 7.5pt; margin: 2px 0;">ДЛЯ МЕДИЦИНСКИХ<br/>ДОКУМЕНТОВ</strong>
			<span style="font-size: 6pt;">ОГРН ${clinic.ogrn}</span>
			<span style="font-size: 5.5pt; color: #444;">СанПиН 3.3686-21</span>
		</div>
	</div>`;
	}

	return `
	<div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
		<div style="font-size: 8.5pt; line-height: 1.5; color: #1e293b;">
			<div style="font-weight: 600;">Ответственное лицо: ______________________ / ${clinic.headNurse} /</div>
			<div style="font-size: 7.5pt; color: #64748b; font-style: italic;">(${roleLabel})</div>
			<div style="font-size: 8pt; color: #475569; margin-top: 4px;">Дата: «____» ____________ 2026 г.</div>
		</div>
		<div style="text-align: center; border: 2px dashed #003399; border-radius: 50%; width: 115px; height: 115px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #003399; font-size: 6.5pt; line-height: 1.15; padding: 4px; box-sizing: border-box;">
			<span style="font-size: 5.5pt; text-transform: uppercase;">${clinic.name}</span>
			<strong style="font-size: 7.5pt; margin: 2px 0;">ДЛЯ МЕДИЦИНСКИХ<br/>ДОКУМЕНТОВ</strong>
			<span style="font-size: 6pt;">ОГРН ${clinic.ogrn}</span>
			<span style="font-size: 5.5pt; color: #444;">СанПиН 3.3686-21</span>
		</div>
	</div>`;
}

/**
 * 1-клик генерация официального печатного макета Журнала ПСО (Форма № 366/у)
 */
export function generatePsoJournalPrintHtml(params: {
	records: readonly PsoJournalRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
	dateRange?: { from: string; to: string } | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const range = params.dateRange
		? `Период: с ${params.dateRange.from} по ${params.dateRange.to}`
		: `Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
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
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал качества ПСО (Форма № 366/у)</title>
	<style>
		@page { size: A4 landscape; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 12px; }
		.clinic-name { font-size: 11pt; font-weight: bold; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
		.subtitle { font-size: 8pt; color: #333; margin-top: 2px; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f2f2f2; font-size: 8pt; text-align: center; }
		.signatures { display: flex; justify-content: space-between; margin-top: 25px; font-size: 9pt; }
		.sign-col { width: 45%; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-name">${clinic.name}</div>
		<div style="font-size: 8pt;">ИНН ${clinic.inn} | ОГРН ${clinic.ogrn} | ${clinic.address}</div>
		<div class="title">ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)</div>
		<div class="subtitle">В соответствии с требованиями СанПиН 3.3686-21 «Профилактика инфекционных болезней» (раздел IV)</div>
		<div style="margin-top: 4px; font-size: 8.5pt;"><strong>${range}</strong></div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№ п/п</th>
				<th style="width: 75px;">Дата и время</th>
				<th>Наименование изделий (партия)</th>
				<th style="width: 45px;">Кол-во в партии</th>
				<th style="width: 45px;">Кол-во проб (1%)</th>
				<th style="width: 65px;">Азопирам (кровь)</th>
				<th style="width: 65px;">Фенолфталеин (щелочь)</th>
				<th>Моющее/дез. средство</th>
				<th style="width: 70px;">Результат контроля</th>
				<th style="width: 120px;">Подпись лица, проводившего пробу</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи за выбранный период отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="signatures">
		<div class="sign-col">
			Главная медицинская сестра: ________________ / ${clinic.headNurse} /
		</div>
		<div class="sign-col" style="text-align: right;">
			Главный врач: ________________ / ${clinic.chiefDoctor} /
		</div>
	</div>

	${renderSanpinOfficialStampsHtml(clinic, "Медсестра ЦСО / Ответственная за ПСО и азопирам")}
</body>
</html>`;
}

/**
 * 1-клик генерация официального печатного макета Журнала работы стерилизаторов (Форма № 257/у)
 */
export function generateForm257PrintHtml(
	records: readonly Form257Record[],
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL,
	periodLabelRu = "за текущий отчетный период",
): string {
	const rowsHtml = records
		.map((rec, index) => {
			const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "+" : "-";
			const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "+" : "-";
			const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "+" : "-";
			const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "+" : "-";
			const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "+" : "-";

			const verdictLabel = rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК";

			return `
				<tr>
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
				</tr>
			`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал контроля работы стерилизаторов (Форма № 257/у)</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 8.5pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 8px; }
		.clinic-title { font-size: 11pt; font-weight: bold; }
		.form-title { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
		table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8pt; }
		th { border: 1px solid #000; padding: 4px 2px; background: #f2f2f2; font-size: 7.5pt; text-align: center; font-weight: bold; }
		.signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 8.5pt; }
		.sign-col { width: 45%; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-title">${clinicInfo.name}</div>
		<div style="font-size: 7.5pt;">ИНН ${clinicInfo.inn} | ОГРН ${clinicInfo.ogrn} | ${clinicInfo.address}</div>
		<div class="form-title">ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ И СУХОЖАРОВЫХ ШКАФОВ (ФОРМА № 257/у)</div>
		<div style="font-size: 7.5pt; color: #333;">В соответствии с требованиями СанПиН 3.3686-21 «Профилактика инфекционных болезней» (${periodLabelRu})</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">Дата и № цикла</th>
				<th style="width: 110px;">Стерилизатор (марка, №)</th>
				<th>Стерилизуемые изделия</th>
				<th style="width: 65px;">Кол-во и упаковка</th>
				<th style="width: 75px;">Режим (T°, P, время)</th>
				<th style="width: 110px;">Хим. индикаторы (5 точек)</th>
				<th style="width: 65px;">Результат контроля</th>
				<th style="width: 85px;">Оператор ЦСО</th>
				<th style="width: 70px;">Контроль ст. медсестры</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="10" style="text-align:center; padding:15px; border:1px solid #000;">Записи циклов стерилизации отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="signatures">
		<div class="sign-col">
			Главная медицинская сестра: ________________ / ${clinicInfo.headNurse} /
		</div>
		<div class="sign-col" style="text-align: right;">
			Главный врач клиники: ________________ / ${clinicInfo.chiefDoctor} /
		</div>
	</div>

	${renderSanpinOfficialStampsHtml(clinicInfo, "Медсестра ЦСО / Ответственная за стерилизацию")}
</body>
</html>`;
}

export function generateBactericidalJournalPrintHtml(params: {
	equipment: BactericidalEquipmentRecord;
	sessions: readonly BactericidalSessionRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const eq = params.equipment;

	const rowsHtml = params.sessions
		.map((s, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.date}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.sessionStartTime} — ${s.sessionEndTime}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.durationMinutes} мин (${s.durationHours} ч)</td>
				<td style="border: 1px solid #000; padding: 4px;">
					${s.operatingMode === "continuous_presence" ? "В присутствии людей" : s.operatingMode === "pre_op_preparation" ? "Предоперационный" : s.operatingMode === "post_cleaning" ? "После генеральной уборки" : "Периодический"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.cumulativeHoursAfterSession} ч</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${s.operatorStaffFullName}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал регистрации работы бактерицидной установки — ${eq.roomName}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9.5pt; line-height: 1.25; color: #000; }
		.header { text-align: center; margin-bottom: 10px; }
		.title { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; }
		.passport-box { border: 1px solid #000; padding: 8px; margin-bottom: 12px; background: #fafafa; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8.5pt; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold;">${clinic.name}</div>
		<div class="title">ЖУРНАЛ РЕГИСТРАЦИИ И КОНТРОЛЯ РАБОТЫ БАКТЕРИЦИДНОЙ УСТАНОВКИ</div>
		<div style="font-size: 8.5pt; color: #333;">(Руководство Р 3.5.1904-04 / СанПиН 3.3686-21)</div>
	</div>

	<div class="passport-box">
		<strong>Паспортные данные установки:</strong><br>
		- Помещение: <strong>${eq.roomName}</strong> (Объем: ${eq.roomVolumeM3} м³)<br>
		- Марка / модель: <strong>${eq.deviceBrand}</strong>, Заводской номер: <strong>${eq.serialNumber}</strong><br>
		- Тип аппарата: ${eq.deviceType === "recirculator_closed" ? "Рециркулятор закрытого типа" : "Открытый облучатель"}<br>
		- Установленные лампы: ${eq.lampType} (${eq.lampCount} шт.), Паспортный ресурс: <strong>${eq.maxLampHours} часов</strong><br>
		- Текущая суммарная наработка: <strong>${eq.totalOperatingHours} часов</strong> (Остаток: ${eq.remainingLampHours} ч / ${eq.remainingLampPercent}%)
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 75px;">Дата сеанса</th>
				<th style="width: 95px;">Время вкл / выкл</th>
				<th style="width: 80px;">Длительность</th>
				<th>Режим обеззараживания</th>
				<th style="width: 90px;">Суммарная наработка</th>
				<th style="width: 110px;">Подпись оператора</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 15px; border: 1px solid #000;">Сеансы работы не зафиксированы</td></tr>'}
		</tbody>
	</table>

	<div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 8.5pt;">
		<div style="width: 45%;">
			Ответственный за эксплуатацию бактерицидных установок: ________________ / ${clinic.headNurse} /
		</div>
		<div style="width: 45%; text-align: right;">
			Главный врач: ________________ / ${clinic.chiefDoctor} /
		</div>
	</div>

	${renderSanpinOfficialStampsHtml(clinic, "Медсестра ЦСО / Ответственная за ультрафиолетовое обеззараживание")}
</body>
</html>`;
}

export function generateGeneralCleaningJournalPrintHtml(
	recordsOrParams: readonly GeneralCleaningJournalRecord[] | {
		records: readonly GeneralCleaningJournalRecord[];
		clinicInfo?: ClinicLegalInfo | undefined;
		periodLabelRu?: string | undefined;
	},
	clinicInfoArg?: ClinicLegalInfo | undefined,
	periodLabelArg?: string | undefined,
): string {
	let records: readonly GeneralCleaningJournalRecord[];
	let clinic: ClinicLegalInfo;
	let periodLabel: string | undefined;

	if (Array.isArray(recordsOrParams)) {
		records = recordsOrParams;
		clinic = clinicInfoArg || DEFAULT_CLINIC_LEGAL;
		periodLabel = periodLabelArg;
	} else {
		const config = recordsOrParams as {
			records: readonly GeneralCleaningJournalRecord[];
			clinicInfo?: ClinicLegalInfo | undefined;
			periodLabelRu?: string | undefined;
		};
		records = config.records || [];
		clinic = config.clinicInfo || DEFAULT_CLINIC_LEGAL;
		periodLabel = config.periodLabelRu;
	}

	const rowsHtml = records
		.map((r, i) => {
			return `<tr>
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
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал проведения генеральных уборок</title>
	<style>
		@page { size: A4 landscape; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 12px; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f2f2f2; font-size: 8pt; text-align: center; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold;">${clinic.name}</div>
		<div class="title">ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК И ДЕЗИНФЕКЦИИ ПОМЕЩЕНИЙ</div>
		<div style="font-size: 8pt; color: #333;">(В соответствии с требованиями СанПиН 3.3686-21, разд. IV)${periodLabel ? ` • Период: ${periodLabel}` : ""}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 70px;">План дата</th>
				<th style="width: 70px;">Факт дата</th>
				<th>Наименование помещения / кабинета</th>
				<th style="width: 45px;">Площадь</th>
				<th>Дезсредство (концентрация %)</th>
				<th style="width: 50px;">Экспозиция</th>
				<th style="width: 45px;">УФ-лучи</th>
				<th style="width: 50px;">Проветривание</th>
				<th style="width: 100px;">Исполнитель</th>
				<th style="width: 75px;">Контроль</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи за выбранный период отсутствуют (Записи генеральных уборок отсутствуют)</td></tr>'}
		</tbody>
	</table>

	<div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 8.5pt;">
		<div style="width: 45%;">
			Ответственный за генеральные уборки и дезинфекцию: ________________ / ${clinic.headNurse} /
		</div>
		<div style="width: 45%; text-align: right;">
			Главный врач клиники: ________________ / ${clinic.chiefDoctor} /
		</div>
	</div>

	${renderSanpinOfficialStampsHtml(clinic, "Медсестра ЦСО / Ответственная за генеральные уборки и дезинфекцию")}
</body>
</html>`;
}

export function generateCabinetReadinessPrintHtml(params: {
	records: readonly CabinetReadinessRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; white-space: nowrap;">${new Date(r.timestamp).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${r.cabinetNumber}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.appointmentTypeTitleRu}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isFullyReady ? "#059669" : "#dc2626"};">
					${r.isFullyReady ? "ГОТОВ" : "НЕ ГОТОВ"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${r.surfaceDisinfection.disinfectantBrand} (${r.surfaceDisinfection.exposureMinutes} мин)
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">
					${r.handpiecesSterility.class5IndicatorsVerified ? "Индикаторы 5 кл. ОК" : "Не проверены"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">
					${r.sterileTray.isCompleted ? "Лоток ОК" : "Не укомплектован"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${r.operatorStaffFullName}<br>
					<span style="font-size: 7pt; color: #64748b;">${r.digitalStampHash}</span>
				</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал экспресс-контроля готовности кабинетов к приёму</title>
	<style>
		@page { size: A4 landscape; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 12px; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f2f2f2; font-size: 8pt; text-align: center; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold;">${clinic.name}</div>
		<div class="title">ЖУРНАЛ ЭКСПРЕСС-КОНТРОЛЯ ГОТОВНОСТИ КАБИНЕТОВ И СТОМАТОЛОГИЧЕСКИХ УСТАНОВОК К ПРИЁМУ</div>
		<div style="font-size: 8pt; color: #333;">(В соответствии с требованиями СанПиН 3.3686-21)</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 75px;">Дата и время</th>
				<th style="width: 60px;">Кабинет</th>
				<th>Профиль приёма</th>
				<th style="width: 75px;">Статус</th>
				<th style="width: 110px;">Дезинфекция</th>
				<th style="width: 100px;">Наконечники</th>
				<th style="width: 75px;">Лоток</th>
				<th style="width: 120px;">Медсестра / ЭЦП</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи готовности кабинетов отсутствуют</td></tr>'}
		</tbody>
	</table>
</body>
</html>`;
}

export function generateTemperatureHumidityJournalPrintHtml(params: {
	records: readonly TemperatureHumidityLogRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
	periodLabelRu?: string | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const period = params.periodLabelRu || `Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
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
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал регистрации температурного режима холодильников (Приказ 706н)</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 8.5pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 8px; }
		.clinic-name { font-size: 11pt; font-weight: bold; }
		.title { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
		.subtitle { font-size: 8pt; color: #333; }
		table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8pt; }
		th { border: 1px solid #000; padding: 4px 2px; background: #f2f2f2; font-size: 7.5pt; text-align: center; font-weight: bold; }
		.signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 8.5pt; }
		.sign-col { width: 45%; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-name">${clinic.name}</div>
		<div style="font-size: 7.5pt;">ИНН ${clinic.inn} | ОГРН ${clinic.ogrn} | Лицензия ${clinic.licenseNumber || "№ ЛО41-01137-77/00368421"} | ${clinic.address}</div>
		<div class="title">ЖУРНАЛ РЕГИСТРАЦИИ ТЕМПЕРАТУРНОГО РЕЖИМА И ВЛАЖНОСТИ В ХОЛОДИЛЬНИКАХ И ЗОНАХ ХРАНЕНИЯ ЛЕКАРСТВЕННЫХ СРЕДСТВ</div>
		<div class="subtitle">(Приказ Минздравсоцразвития РФ № 706н / Приказ Минздрава РФ № 646н • ${period})</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 70px;">Дата</th>
				<th style="width: 75px;">Период</th>
				<th>Объект контроля (холодильник, место, прибор)</th>
				<th style="width: 60px;">Факт T°</th>
				<th style="width: 60px;">Влажность</th>
				<th style="width: 70px;">Норма T°</th>
				<th style="width: 90px;">Результат контроля</th>
				<th style="width: 110px;">Ответственное лицо</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи температурного режима отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="signatures">
		<div class="sign-col">
			Ответственное лицо: ________________ / ${clinic.headNurse} /
		</div>
		<div class="sign-col" style="text-align: right;">
			Главный врач: ________________ / ${clinic.chiefDoctor} /
		</div>
	</div>
</body>
</html>`;
}
