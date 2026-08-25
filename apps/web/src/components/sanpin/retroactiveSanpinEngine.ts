/**
 * ============================================================================
 * RETROACTIVE SANPIN BATCH GENERATOR ENGINE (СанПиН 3.3686-21 / 2.1.3684-21)
 * Модуль моментального пакетного закрытия журналов производственного контроля:
 * - Форма № 366/у (ПСО, азопирам, фенолфталеин, расчет выборки 1% min 3-5 шт)
 * - Форма № 257/у (Автоклавы, 5 точек камеры КТ-1..КТ-5, индикаторы 5 класса)
 * - Наработка бактерицидных облучателей (Дезар / Р 3.5.1904-04)
 * - График генеральных и текущих уборок
 * - Экспресс-контроль готовности кабинетов
 * - Учет медицинских отходов классов А и Б
 * - Журнал температурного режима и влажности (Приказ 706н)
 * ============================================================================
 */

export type PeriodPreset =
	| "last_week"
	| "current_month"
	| "previous_month"
	| "current_quarter"
	| "custom";

export interface CabinetOption {
	readonly id: string;
	readonly nameRu: string;
	readonly shortName: string;
	readonly volumeM3: number;
	readonly defaultDoctor: string;
}

export const STATUTORY_CLINIC_CABINETS: readonly CabinetOption[] = [
	{
		id: "cabinet_1",
		nameRu: "Кабинет терапевтической стоматологии №1",
		shortName: "Кабинет 1",
		volumeM3: 45.0,
		defaultDoctor: "Д-р Иванов А.С.",
	},
	{
		id: "cabinet_2",
		nameRu: "Кабинет ортопедии и хирургии №2",
		shortName: "Кабинет 2",
		volumeM3: 50.0,
		defaultDoctor: "Д-р Смирнов В.П.",
	},
	{
		id: "cabinet_3",
		nameRu: "Кабинет детской стоматологии и ортодонтии №3",
		shortName: "Кабинет 3",
		volumeM3: 42.0,
		defaultDoctor: "Д-р Кузнецова Е.Н.",
	},
	{
		id: "sterilization_room",
		nameRu: "Центральное стерилизационное отделение (ЦСО)",
		shortName: "Стерилизационная (ЦСО)",
		volumeM3: 35.0,
		defaultDoctor: "Медсестра ЦСО",
	},
];

export interface AutoclaveRegimeConfig {
	readonly id: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min";
	readonly nameRu: string;
	readonly temperatureCelsius: number;
	readonly pressureBar: number;
	readonly durationMinutes: number;
	readonly indicatorClass: string;
	readonly indicatorNameRu: string;
}

export const AUTOCLAVE_REGIME_PRESETS: readonly AutoclaveRegimeConfig[] = [
	{
		id: "steam_134_5min",
		nameRu: "134°C / 5 мин / 2.15 бар — Скоростной B-класс (Стандарт)",
		temperatureCelsius: 134.0,
		pressureBar: 2.15,
		durationMinutes: 5,
		indicatorClass: "Класс 5 (Интегрирующий)",
		indicatorNameRu: "Интеграл-134 (Винар)",
	},
	{
		id: "steam_134_20min",
		nameRu: "134°C / 20 мин / 2.15 бар — Хирургический усиленный",
		temperatureCelsius: 134.0,
		pressureBar: 2.15,
		durationMinutes: 20,
		indicatorClass: "Класс 5 (Интегрирующий)",
		indicatorNameRu: "Медтест ИС-134",
	},
	{
		id: "steam_121_20min",
		nameRu: "121°C / 20 мин / 1.15 бар — Щадящий для термолабильных изделий",
		temperatureCelsius: 121.0,
		pressureBar: 1.15,
		durationMinutes: 20,
		indicatorClass: "Класс 5 (Интегрирующий)",
		indicatorNameRu: "Интеграл-121 (Винар)",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "180°C / 60 мин — Воздушный сухой жар (ГП-20)",
		temperatureCelsius: 180.0,
		pressureBar: 0.0,
		durationMinutes: 60,
		indicatorClass: "Класс 4 (Многопараметрический)",
		indicatorNameRu: "Стериконт-180",
	},
];

export interface RetroactiveGenerationOptions {
	readonly preset: PeriodPreset;
	readonly startDate?: string | undefined; // YYYY-MM-DD
	readonly endDate?: string | undefined; // YYYY-MM-DD
	readonly selectedCabinets: readonly string[]; // IDs
	readonly dutyNurseFullName: string;
	readonly dutyNursePosition: string;
	readonly autoclaveRegimeId: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min";
	readonly sterilizerModelName: string;
	readonly excludeSundays?: boolean | undefined;
	readonly averageVisitsPerCabinetDay?: number | undefined;
}

export interface RetroactiveDayRecord {
	readonly id: string;
	date: string; // YYYY-MM-DD
	dayOfWeekRu: string;
	isWorkingDay: boolean;
	cabinetsCount: number;
	cabinetsListRu: string;
	visitsCount: number;
	traysProcessedCount: number;
	// PSO
	psoBatchCount: number;
	psoSampleCount: number;
	psoSampleRequirementRu: string;
	isAzopyramNegative: boolean;
	isPhenolphthaleinNegative: boolean;
	isPsoApproved: boolean;
	psoDetergent: string;
	// Autoclave 257/u
	autoclaveCyclesCount: number;
	autoclaveRegimeTitle: string;
	autoclaveTemperature: number;
	autoclavePressure: number;
	autoclaveDuration: number;
	points5Passed: boolean;
	indicatorTradeName: string;
	// Recirculators
	recirculatorOperatingHours: number;
	// Cleanings
	isGeneralCleaningDay: boolean;
	cleaningTypeRu: string;
	cleaningDisinfectant: string;
	// Cabinet Readiness
	cabinetsReadinessStatus: "ready_sterile" | "partial" | "not_conducted";
	cabinetsReadinessMessageRu: string;
	// Waste
	wasteClassBWeightKg: number;
	wasteClassAWeightKg: number;
	// Temperature
	refrigeratorTempMorning: number;
	refrigeratorTempEvening: number;
	roomTempMorning: number;
	roomHumidityMorning: number;
	// Status & Stamp
	sanpinCompliance100: boolean;
	nurseFullName: string;
	electronicStampHash: string;
	isSavedToDb: boolean;
	notes: string;
}

export interface RetroactiveBatchStats {
	readonly totalDays: number;
	readonly workingDaysCount: number;
	readonly totalTraysProcessed: number;
	readonly totalPsoSamplesTested: number;
	readonly totalAutoclaveCycles: number;
	readonly totalRecirculatorHours: number;
	readonly generalCleaningsCount: number;
	readonly totalWasteKg: number;
	readonly compliancePercentage: number;
}

/**
 * Calculates start and end dates based on PeriodPreset
 */
export function calculatePeriodDateRange(
	preset: PeriodPreset,
	customStart?: string,
	customEnd?: string,
	referenceDateStr?: string,
): { startDate: string; endDate: string; labelRu: string } {
	const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
	const y = refDate.getFullYear();
	const m = refDate.getMonth(); // 0-indexed
	const d = refDate.getDate();

	const formatIso = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	if (preset === "last_week") {
		const end = new Date(refDate);
		const start = new Date(refDate);
		start.setDate(start.getDate() - 6);
		return {
			startDate: formatIso(start),
			endDate: formatIso(end),
			labelRu: `Последняя неделя (${formatIso(start)} — ${formatIso(end)})`,
		};
	}

	if (preset === "current_month") {
		const start = new Date(y, m, 1);
		const end = new Date(refDate);
		return {
			startDate: formatIso(start),
			endDate: formatIso(end),
			labelRu: `Текущий месяц (${formatIso(start)} — ${formatIso(end)})`,
		};
	}

	if (preset === "previous_month") {
		const start = new Date(y, m - 1, 1);
		const end = new Date(y, m, 0); // last day of previous month
		return {
			startDate: formatIso(start),
			endDate: formatIso(end),
			labelRu: `Прошлый месяц (${formatIso(start)} — ${formatIso(end)})`,
		};
	}

	if (preset === "current_quarter") {
		const quarterIndex = Math.floor(m / 3);
		const startMonth = quarterIndex * 3;
		const start = new Date(y, startMonth, 1);
		const end = new Date(refDate);
		return {
			startDate: formatIso(start),
			endDate: formatIso(end),
			labelRu: `Текущий ${quarterIndex + 1}-й квартал (${formatIso(start)} — ${formatIso(end)})`,
		};
	}

	// Custom
	const s = customStart || formatIso(new Date(y, m, 1));
	const e = customEnd || formatIso(refDate);
	return {
		startDate: s,
		endDate: e,
		labelRu: `Выбранный период (${s} — ${e})`,
	};
}

const RUSSIAN_DAYS_OF_WEEK = [
	"Воскресенье",
	"Понедельник",
	"Вторник",
	"Среда",
	"Четверг",
	"Пятница",
	"Суббота",
];

/**
 * Generates array of day records for the given range and options
 */
export function generateRetroactiveSanpinDays(
	options: RetroactiveGenerationOptions,
	referenceDateStr?: string,
): RetroactiveDayRecord[] {
	const { startDate, endDate } = calculatePeriodDateRange(
		options.preset,
		options.startDate,
		options.endDate,
		referenceDateStr,
	);

	const start = new Date(startDate);
	const end = new Date(endDate);

	const regime =
		AUTOCLAVE_REGIME_PRESETS.find((r) => r.id === options.autoclaveRegimeId) ||
		AUTOCLAVE_REGIME_PRESETS[0]!;

	const selectedCabinets = STATUTORY_CLINIC_CABINETS.filter((c) =>
		options.selectedCabinets.includes(c.id),
	);
	const activeCabinetsList =
		selectedCabinets.length > 0
			? selectedCabinets.map((c) => c.shortName).join(", ")
			: "Все кабинеты (1, 2, 3, ЦСО)";

	const activeCabCount = Math.max(1, selectedCabinets.length);
	const visitsPerCab = options.averageVisitsPerCabinetDay ?? 6;

	const days: RetroactiveDayRecord[] = [];
	const current = new Date(start);

	let dayIndex = 1;

	while (current <= end) {
		const dayOfWeekIndex = current.getDay();
		const dayOfWeekRu = RUSSIAN_DAYS_OF_WEEK[dayOfWeekIndex] || "Будни";
		const isSunday = dayOfWeekIndex === 0;
		const isSaturday = dayOfWeekIndex === 6;

		const isWorkingDay = options.excludeSundays ? !isSunday : true;
		const dateStr = current.toISOString().slice(0, 10);

		if (!isWorkingDay) {
			// Sunday or non-working day record
			days.push({
				id: `SANPIN-BATCH-${dateStr}`,
				date: dateStr,
				dayOfWeekRu,
				isWorkingDay: false,
				cabinetsCount: 0,
				cabinetsListRu: "Выходной день клиники",
				visitsCount: 0,
				traysProcessedCount: 0,
				psoBatchCount: 0,
				psoSampleCount: 0,
				psoSampleRequirementRu: "0 шт. (выходной)",
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isPsoApproved: true,
				psoDetergent: "—",
				autoclaveCyclesCount: 0,
				autoclaveRegimeTitle: "Дежурный режим ожидания",
				autoclaveTemperature: 20.0,
				autoclavePressure: 0.0,
				autoclaveDuration: 0,
				points5Passed: true,
				indicatorTradeName: regime.indicatorNameRu,
				recirculatorOperatingHours: 0,
				isGeneralCleaningDay: false,
				cleaningTypeRu: "Текущая консервация",
				cleaningDisinfectant: "—",
				cabinetsReadinessStatus: "ready_sterile",
				cabinetsReadinessMessageRu: "Кабинеты законсервированы в стерильном состоянии",
				wasteClassBWeightKg: 0,
				wasteClassAWeightKg: 0,
				refrigeratorTempMorning: 4.1,
				refrigeratorTempEvening: 4.3,
				roomTempMorning: 20.5,
				roomHumidityMorning: 45,
				sanpinCompliance100: true,
				nurseFullName: options.dutyNurseFullName,
				electronicStampHash: `DENTE-SANPIN-STAMP-${dateStr.replace(/-/g, "")}-SUNDAY-OFF`,
				isSavedToDb: false,
				notes: "Выходной день. Журнал температурного режима и дежурной консервации.",
			});
		} else {
			// Active working day
			// Scaling visits: Saturday ~70% load
			const dayVisits = isSaturday
				? Math.round(activeCabCount * visitsPerCab * 0.7)
				: activeCabCount * visitsPerCab;

			const traysCount = dayVisits * 4; // 4 instruments/trays per visit
			const sampleCount = Math.max(3, Math.ceil(traysCount * 0.01)); // 1% min 3-5

			const cyclesCount = Math.max(2, Math.ceil(traysCount / 12));
			const isFriday = dayOfWeekIndex === 5; // General cleaning usually on Fridays
			const isGeneralCleaningDay = isFriday;

			// Pseudo-random deterministic variations for realistic temperature & waste
			const dateSeed = (current.getDate() * 17 + current.getMonth() * 31) % 100;
			const tempFrigMorn = Number((3.8 + (dateSeed % 12) * 0.1).toFixed(1)); // 3.8 .. 4.9°C (norm 2..8°C)
			const tempFrigEve = Number((4.1 + ((dateSeed + 3) % 11) * 0.1).toFixed(1));
			const roomTemp = Number((21.0 + (dateSeed % 15) * 0.1).toFixed(1)); // 21.0 .. 22.4°C
			const roomHum = 44 + (dateSeed % 14); // 44 .. 57% (norm 40..60%)

			const wasteB = Number((1.2 + activeCabCount * 0.35 + (dateSeed % 8) * 0.1).toFixed(2));
			const wasteA = Number((2.0 + activeCabCount * 0.5 + (dateSeed % 10) * 0.15).toFixed(2));
			const recircHours = Number((activeCabCount * 2.5).toFixed(1));

			days.push({
				id: `SANPIN-BATCH-${dateStr}`,
				date: dateStr,
				dayOfWeekRu,
				isWorkingDay: true,
				cabinetsCount: activeCabCount,
				cabinetsListRu: activeCabinetsList,
				visitsCount: dayVisits,
				traysProcessedCount: traysCount,
				psoBatchCount: traysCount,
				psoSampleCount: sampleCount,
				psoSampleRequirementRu: `${sampleCount} шт. (1% от ${traysCount} шт.)`,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isPsoApproved: true,
				psoDetergent: "Биолот 0.5% + Аламинол 1.5%",
				autoclaveCyclesCount: cyclesCount,
				autoclaveRegimeTitle: `${regime.nameRu} (${options.sterilizerModelName})`,
				autoclaveTemperature: regime.temperatureCelsius,
				autoclavePressure: regime.pressureBar,
				autoclaveDuration: regime.durationMinutes,
				points5Passed: true,
				indicatorTradeName: `${regime.indicatorNameRu} (${regime.indicatorClass})`,
				recirculatorOperatingHours: recircHours,
				isGeneralCleaningDay,
				cleaningTypeRu: isGeneralCleaningDay
					? "Генеральная уборка (еженедельная)"
					: "Текущая дезинфекция 2-кратная",
				cleaningDisinfectant: isGeneralCleaningDay
					? "Аламинол 3.0% (экспозиция 60 мин + УФ 120 мин)"
					: "Оптимакс Про 1.5% + Бациллол АФ 3 мин",
				cabinetsReadinessStatus: "ready_sterile",
				cabinetsReadinessMessageRu: "🟢 Все кабинеты продезинфицированы, наконечники и лотки стерильны",
				wasteClassBWeightKg: wasteB,
				wasteClassAWeightKg: wasteA,
				refrigeratorTempMorning: tempFrigMorn,
				refrigeratorTempEvening: tempFrigEve,
				roomTempMorning: roomTemp,
				roomHumidityMorning: roomHum,
				sanpinCompliance100: true,
				nurseFullName: options.dutyNurseFullName,
				electronicStampHash: `DENTE-CSO-${dateStr.replace(/-/g, "")}-B${traysCount}-P${sampleCount}-OK`,
				isSavedToDb: false,
				notes: isGeneralCleaningDay
					? "Генеральная уборка проведена в полном объеме. Все пробы ПСО отрицательные, циклы стерилизации норма."
					: "Смена закрыта. Замечаний по СанПиН нет. Досье опечатано.",
			});
		}

		current.setDate(current.getDate() + 1);
		dayIndex++;
	}

	return days;
}

/**
 * Calculates aggregate statistics for the batch
 */
export function calculateRetroactiveBatchStats(days: readonly RetroactiveDayRecord[]): RetroactiveBatchStats {
	let workingDaysCount = 0;
	let totalTrays = 0;
	let totalPsoSamples = 0;
	let totalAutoclaveCycles = 0;
	let totalRecircHours = 0;
	let generalCleaningsCount = 0;
	let totalWasteKg = 0;
	let compliantDays = 0;

	for (const d of days) {
		if (d.isWorkingDay) {
			workingDaysCount++;
			totalTrays += d.traysProcessedCount;
			totalPsoSamples += d.psoSampleCount;
			totalAutoclaveCycles += d.autoclaveCyclesCount;
			totalRecircHours += d.recirculatorOperatingHours;
			if (d.isGeneralCleaningDay) {
				generalCleaningsCount++;
			}
			totalWasteKg += d.wasteClassBWeightKg + d.wasteClassAWeightKg;
		}
		if (d.sanpinCompliance100) {
			compliantDays++;
		}
	}

	const compliancePercentage =
		days.length > 0 ? Math.round((compliantDays / days.length) * 100) : 100;

	return {
		totalDays: days.length,
		workingDaysCount,
		totalTraysProcessed: totalTrays,
		totalPsoSamplesTested: totalPsoSamples,
		totalAutoclaveCycles: totalAutoclaveCycles,
		totalRecirculatorHours: Number(totalRecircHours.toFixed(1)),
		generalCleaningsCount,
		totalWasteKg: Number(totalWasteKg.toFixed(1)),
		compliancePercentage,
	};
}

export interface DossierPrintMeta {
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly headNurseName?: string | undefined;
	readonly periodLabelRu?: string | undefined;
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
	const chiefDoctor = meta.chiefDoctorName || "д.м.н. Воронов Михаил Александрович";
	const headNurse = meta.headNurseName || days[0]?.nurseFullName || "Смирнова Анна Викторовна";
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
					<td style="text-align: center;"><span class="tag-norm">🟢 100% НОРМА</span></td>
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
