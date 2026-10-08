/**
 * ============================================================================
 * SANPIN CONSOLIDATED DOSSIER CSV EXPORTER (LAYER 3)
 * 1-клик экспорт в единый многостраничный CSV/Excel архив с разделителями страниц и разделов:
 * - Метаданные клиники и лицензии № ЛО41-01137-77/00368421;
 * - Раздел 1: ПСО (Форма № 366/у);
 * - Раздел 2: Автоклавы (Форма № 257/у);
 * - Раздел 3: Бактерицидные установки и Генеральные уборки;
 * - Раздел 4: Температурный режим холодильников;
 * - Лист сшива и заверения тома.
 * ============================================================================
 */

import { DEFAULT_CLINIC_LEGAL, escapeCsvField, formatRussianSheetsCount } from "./sanpinNorms.js";
import type {
	ConsolidatedSanpinJournalData,
	Form257Record,
} from "./types.js";

export function exportSanpinConsolidatedArchiveToCsv(data: ConsolidatedSanpinJournalData): string {
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

	const psoSheets = Math.max(1, Math.ceil(psoRecords.length / 14));
	const f257Sheets = Math.max(1, Math.ceil(form257Records.length / 10));
	const bacSheets = Math.max(1, Math.ceil(bactericidalSessions.length / 14));
	const cleanSheets = Math.max(1, Math.ceil(generalCleanings.length / 12));
	const tempSheets = Math.max(1, Math.ceil(temperatureLogs.length / 14));
	const totalSheets = data.totalPagesCount || (1 + psoSheets + f257Sheets + bacSheets + cleanSheets + tempSheets + 1);
	const sheetsFormatted = formatRussianSheetsCount(totalSheets);

	const lines: string[] = [];

	// HEADER BANNER
	lines.push(`"СВОДНЫЙ ЖУРНАЛ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ САНПИН (ТОМ № ${volume})"`);
	lines.push(`"Медицинская организация";${escapeCsvField(clinic.name)}`);
	lines.push(`"Лицензия на медицинскую деятельность";${escapeCsvField(license)}`);
	lines.push(`"Реквизиты";${escapeCsvField(`ИНН ${clinic.inn} | ОГРН ${clinic.ogrn} | ${clinic.address}`)}`);
	lines.push(`"Отчетный период";${escapeCsvField(periodLabel)}`);
	lines.push(`"Главный врач";${escapeCsvField(clinic.chiefDoctor)}`);
	lines.push(`"Главная медсестра";${escapeCsvField(clinic.headNurse)}`);
	lines.push("");

	// SECTION 1: PSO FORM 366/U
	lines.push(`"=== РАЗДЕЛ 1: ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/У) ==="`);
	const psoHeaders = [
		"№ п/п",
		"ID записи",
		"Дата и время",
		"Наименование изделий",
		"Количество в партии",
		"Количество проб (1%)",
		"Азопирамовая проба (кровь)",
		"Фенолфталеиновая проба (щелочь)",
		"Проба с Суданом III",
		"Моющее средство",
		"Результат контроля",
		"Причина брака",
		"ФИО исполнителя",
		"ЭЦП заверен",
		"Примечания",
	];
	lines.push(psoHeaders.join(";"));
	if (psoRecords.length === 0) {
		lines.push(`"Записи за отчетный период отсутствуют"`);
	} else {
		psoRecords.forEach((r, i) => {
			lines.push([
				escapeCsvField(i + 1),
				escapeCsvField(r.id),
				escapeCsvField(r.timestamp),
				escapeCsvField(r.instrumentName),
				escapeCsvField(r.batchItemCount),
				escapeCsvField(r.testedSampleCount),
				escapeCsvField(r.isAzopyramNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Кровь)"),
				escapeCsvField(r.isPhenolphthaleinNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Щелочь)"),
				escapeCsvField(r.isSudanNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Масло)"),
				escapeCsvField(r.detergentBrand),
				escapeCsvField(r.isBatchApproved ? "Допущено" : "БРАК"),
				escapeCsvField(r.rejectionReason ?? ""),
				escapeCsvField(r.operatorStaffFullName),
				escapeCsvField(r.electronicStampVerified ? "ДА" : "НЕТ"),
				escapeCsvField(r.notes ?? ""),
			].join(";"));
		});
	}
	lines.push("");

	// SECTION 2: FORM 257/U & STERILIZER FLEET
	lines.push(`"=== РАЗДЕЛ 2: ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ (ФОРМА № 257/У) ==="`);
	if (sterilizerEquipments && sterilizerEquipments.length > 0) {
		lines.push(`"--- ПАРК АВТОКЛАВОВ И СТЕРИЛИЗАЦИОННОГО ОБОРУДОВАНИЯ ---"`);
		const sterilizerEquipHeaders = [
			"№ п/п",
			"ID",
			"Наименование",
			"Марка и модель",
			"Заводской номер",
			"Класс",
			"Тип",
			"Объем камеры (л)",
			"Кабинет / Место",
			"Срок поверки",
			"Статус",
		];
		lines.push(sterilizerEquipHeaders.join(";"));
		sterilizerEquipments.forEach((eq, i) => {
			lines.push([
				escapeCsvField(i + 1),
				escapeCsvField(eq.id),
				escapeCsvField(eq.name),
				escapeCsvField(eq.brandModel),
				escapeCsvField(eq.serialNumber),
				escapeCsvField(eq.deviceClass ?? "B"),
				escapeCsvField(eq.deviceType),
				escapeCsvField(eq.chamberVolumeLiters ?? ""),
				escapeCsvField(eq.locationRoom ?? ""),
				escapeCsvField(eq.verificationExpiryDate ?? "Действует"),
				escapeCsvField(eq.status === "decommissioned" ? "Списан" : "Допущен"),
			].join(";"));
		});
		lines.push(`"--- ЦИКЛЫ СТЕРИЛИЗАЦИИ ---"`);
	}
	const f257Headers = [
		"№ п/п",
		"ID Записи",
		"Дата",
		"Номер цикла",
		"Код аппарата",
		"Марка и модель стерилизатора",
		"Заводской номер",
		"Режим стерилизации",
		"T° факт (°C)",
		"Давление факт (бар)",
		"Время выдержки (мин)",
		"Наименование изделий",
		"Кол-во упаковок",
		"Тип упаковки",
		"Хим. индикатор",
		"КТ-1",
		"КТ-2",
		"КТ-3",
		"КТ-4",
		"КТ-5",
		"Все 5 точек ОК",
		"Результат цикла",
		"Причина брака",
		"Медсестра ЦСО",
		"Заверка ст. медсестры",
		"Цифровой штамп ЭЦП",
		"Примечания",
	];
	lines.push(f257Headers.join(";"));
	if (form257Records.length === 0) {
		lines.push(`"Записи циклов стерилизации отсутствуют"`);
	} else {
		form257Records.forEach((rec, i) => {
			const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "ОК" : "БРАК";
			const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "ОК" : "БРАК";
			const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "ОК" : "БРАК";
			const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "ОК" : "БРАК";
			const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "ОК" : "БРАК";

			lines.push([
				escapeCsvField(i + 1),
				escapeCsvField(rec.id),
				escapeCsvField(rec.date),
				escapeCsvField(rec.cycleNumber),
				escapeCsvField(rec.sterilizerCode),
				escapeCsvField(rec.sterilizerBrandModel),
				escapeCsvField(rec.sterilizerSerialNumber),
				escapeCsvField(rec.regimeNameRu),
				escapeCsvField(rec.actualTemperatureCelsius),
				escapeCsvField(rec.actualPressureBar),
				escapeCsvField(rec.actualExposureMinutes),
				escapeCsvField(rec.itemsDescriptionRu),
				escapeCsvField(rec.packsCount),
				escapeCsvField(rec.packagingNameRu),
				escapeCsvField(rec.chemicalIndicatorNameRu),
				escapeCsvField(pt1),
				escapeCsvField(pt2),
				escapeCsvField(pt3),
				escapeCsvField(pt4),
				escapeCsvField(pt5),
				escapeCsvField(rec.areAllPointsPassed ? "Да" : "Нет"),
				escapeCsvField(rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК"),
				escapeCsvField(rec.rejectionReason ?? ""),
				escapeCsvField(rec.operatorStaffFullName),
				escapeCsvField(rec.isHeadNurseVerified ? `Да (${rec.headNurseSignatureFullName ?? ""})` : "Нет"),
				escapeCsvField(rec.digitalStampHash),
				escapeCsvField(rec.notes ?? ""),
			].join(";"));
		});
	}
	lines.push("");

	// SECTION 3.1: BACTERICIDAL
	lines.push(`"=== РАЗДЕЛ 3.1: ЖУРНАЛ РЕГИСТРАЦИИ РАБОТЫ БАКТЕРИЦИДНЫХ УСТАНОВОК (Р 3.5.1904-04) ==="`);
	if (data.bactericidalEquipments && data.bactericidalEquipments.length > 0) {
		lines.push(`"--- РЕЕСТР БАКТЕРИЦИДНЫХ УСТАНОВОК И РЕЦИРКУЛЯТОРОВ ---"`);
		const bacEquipHeaders = [
			"№ п/п",
			"ID",
			"Помещение",
			"Модель аппарата",
			"Заводской номер",
			"Тип установки",
			"Лампы",
			"Ресурс (ч)",
			"Наработка (ч)",
			"Остаток (ч)",
			"Остаток (%)",
			"Статус ламп",
		];
		lines.push(bacEquipHeaders.join(";"));
		bactericidalEquipments.forEach((eq, i) => {
			lines.push([
				escapeCsvField(i + 1),
				escapeCsvField(eq.id),
				escapeCsvField(eq.roomName),
				escapeCsvField(eq.deviceBrand),
				escapeCsvField(eq.serialNumber),
				escapeCsvField(eq.deviceType),
				escapeCsvField(`${eq.lampType} (${eq.lampCount} шт)`),
				escapeCsvField(eq.maxLampHours),
				escapeCsvField(eq.totalOperatingHours),
				escapeCsvField(eq.remainingLampHours),
				escapeCsvField(eq.remainingLampPercent),
				escapeCsvField(eq.lampStatus),
			].join(";"));
		});
		lines.push(`"--- СЕАНСЫ ОБЕЗЗАРАЖИВАНИЯ ВОЗДУХА ---"`);
	}
	const bacHeaders = [
		"№ п/п",
		"ID",
		"Дата",
		"Помещение",
		"Марка аппарата",
		"Время начала",
		"Время окончания",
		"Длительность (мин)",
		"Длительность (ч)",
		"Режим работы",
		"Суммарная наработка (ч)",
		"Оператор",
	];
	lines.push(bacHeaders.join(";"));
	if (bactericidalSessions.length === 0) {
		lines.push(`"Сеансы работы установок отсутствуют"`);
	} else {
		bactericidalSessions.forEach((s, i) => {
			lines.push([
				escapeCsvField(i + 1),
				escapeCsvField(s.id),
				escapeCsvField(s.date),
				escapeCsvField(s.roomName),
				escapeCsvField(s.deviceBrand),
				escapeCsvField(s.sessionStartTime),
				escapeCsvField(s.sessionEndTime),
				escapeCsvField(s.durationMinutes),
				escapeCsvField(s.durationHours),
				escapeCsvField(s.operatingMode),
				escapeCsvField(s.cumulativeHoursAfterSession),
				escapeCsvField(s.operatorStaffFullName),
			].join(";"));
		});
	}
	lines.push("");

	// SECTION 3.2: GENERAL CLEANING
	lines.push(`"=== РАЗДЕЛ 3.2: ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК (САНПИН 3.3686-21) ==="`);
	const cleanHeaders = [
		"№ п/п",
		"ID",
		"План дата",
		"Факт дата",
		"Помещение",
		"Тип помещения",
		"Площадь (м²)",
		"Дезсредство",
		"Концентрация (%)",
		"Экспозиция (мин)",
		"УФ (мин)",
		"Проветривание (мин)",
		"Исполнитель",
		"Контроль заверен",
	];
	lines.push(cleanHeaders.join(";"));
	if (generalCleanings.length === 0) {
		lines.push(`"Записи генеральных уборок отсутствуют"`);
	} else {
		generalCleanings.forEach((r, i) => {
			lines.push([
				escapeCsvField(i + 1),
				escapeCsvField(r.id),
				escapeCsvField(r.scheduledDate),
				escapeCsvField(r.actualDateTime),
				escapeCsvField(r.roomName),
				escapeCsvField(r.roomType),
				escapeCsvField(r.treatedAreaM2),
				escapeCsvField(r.disinfectantName),
				escapeCsvField(r.solutionConcentrationPercent),
				escapeCsvField(r.exposureTimeMinutes),
				escapeCsvField(r.uvIrradiationMinutes),
				escapeCsvField(r.ventilationMinutes),
				escapeCsvField(r.operatorStaffFullName),
				escapeCsvField(r.isInspectorVerified ? "ДА" : "НЕТ"),
			].join(";"));
		});
	}
	lines.push("");

	// SECTION 4: REFRIGERATOR TEMPERATURE LOGS
	lines.push(`"=== РАЗДЕЛ 4: ЖУРНАЛ ТЕМПЕРАТУРНОГО РЕЖИМА ХОЛОДИЛЬНИКОВ И ХРАНЕНИЯ ЛС (ПРИКАЗ 706Н) ==="`);
	const tempHeaders = [
		"№ п/п",
		"ID",
		"Дата замера",
		"Период",
		"Объект контроля",
		"Место установки",
		"Прибор учета",
		"Фактическая T° (°C)",
		"Влажность (%)",
		"Норматив T° (°C)",
		"В пределах нормы",
		"Причина отклонения / Меры",
		"Ответственный",
	];
	lines.push(tempHeaders.join(";"));
	if (temperatureLogs.length === 0) {
		lines.push(`"Записи температурного режима отсутствуют"`);
	} else {
		temperatureLogs.forEach((r, i) => {
			lines.push([
				escapeCsvField(i + 1),
				escapeCsvField(r.id),
				escapeCsvField(r.measurementDate),
				escapeCsvField(r.measurementPeriod === "morning" ? "Утро" : r.measurementPeriod === "evening" ? "Вечер" : r.measurementPeriod),
				escapeCsvField(r.equipmentName),
				escapeCsvField(r.location),
				escapeCsvField(r.meterSerialNumber ? `${r.meterDeviceName} (№${r.meterSerialNumber})` : r.meterDeviceName),
				escapeCsvField(r.temperatureCelsius),
				escapeCsvField(r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? r.relativeHumidityPercent : ""),
				escapeCsvField(`${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}`),
				escapeCsvField(r.isWithinNorm ? "ДА" : "ОТКЛОНЕНИЕ"),
				escapeCsvField(r.correctiveAction || r.deviationReason || ""),
				escapeCsvField(r.operatorStaffFullName),
			].join(";"));
		});
	}
	lines.push("");

	// SECTION 5: CERTIFICATION SHEET
	lines.push(`"=== ЗАВЕРИТЕЛЬНЫЙ ЛИСТ СШИВА ТОМА № ${volume} ==="`);
	lines.push(`"Заверительная надпись";${escapeCsvField(`В настоящем журнале пронумеровано, прошнуровано и скреплено печатью ${sheetsFormatted.formattedRu}`)}`);
	lines.push(`"Главный врач";${escapeCsvField(clinic.chiefDoctor)}`);
	lines.push(`"Главная медсестра";${escapeCsvField(clinic.headNurse)}`);
	lines.push(`"Медицинская лицензия";${escapeCsvField(license)}`);
	lines.push(`"Дата заверения";${escapeCsvField(new Date().toLocaleDateString("ru-RU"))}`);

	return `\uFEFF${lines.join("\r\n")}`;
}
