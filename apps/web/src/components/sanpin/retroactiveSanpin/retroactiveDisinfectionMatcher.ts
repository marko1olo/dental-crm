/**
 * ============================================================================
 * RETROACTIVE DISINFECTION MATCHER (Layer 1)
 * Сопоставление дезинфицирующих средств, концентраций и экспозиций
 * по требованиям СанПиН 3.3686-21, СП 2.1.3678-20 и МУ 287-113:
 * - ПСО: моющие комплексы (Биолот, Аламинол)
 * - Уборки: генеральные (3.0%) и текущие (1.5% + экспресс)
 * - Режимы автоклавирования и индикаторы 4-5 классов
 * - Расчет календарных диапазонов и расписания кабинетов
 * ============================================================================
 */

import type {
	AutoclaveRegimeConfig,
	CabinetOption,
	PeriodPreset,
} from "./types.js";

export const STATUTORY_CLINIC_CABINETS: readonly CabinetOption[] = [
	{
		id: "cabinet_1",
		nameRu: "Кабинет терапевтической стоматологии №1",
		shortName: "Кабинет 1",
		volumeM3: 45.0,
		defaultDoctor: "Врач-стоматолог 1",
	},
	{
		id: "cabinet_2",
		nameRu: "Кабинет ортопедии и хирургии №2",
		shortName: "Кабинет 2",
		volumeM3: 50.0,
		defaultDoctor: "Врач-стоматолог 2",
	},
	{
		id: "cabinet_3",
		nameRu: "Кабинет детской стоматологии и ортодонтии №3",
		shortName: "Кабинет 3",
		volumeM3: 42.0,
		defaultDoctor: "Врач-стоматолог 3",
	},
	{
		id: "sterilization_room",
		nameRu: "Центральное стерилизационное отделение (ЦСО)",
		shortName: "Стерилизационная (ЦСО)",
		volumeM3: 35.0,
		defaultDoctor: "Медсестра ЦСО",
	},
];

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

export const RUSSIAN_DAYS_OF_WEEK = [
	"Воскресенье",
	"Понедельник",
	"Вторник",
	"Среда",
	"Четверг",
	"Пятница",
	"Суббота",
] as const;

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

/**
 * Подбирает дезинфицирующее средство, режим и экспозицию по типу уборки
 */
export function matchDisinfectantForCleaning(isGeneralCleaningDay: boolean): {
	cleaningTypeRu: string;
	cleaningDisinfectant: string;
} {
	if (isGeneralCleaningDay) {
		return {
			cleaningTypeRu: "Генеральная уборка (еженедельная)",
			cleaningDisinfectant: "Аламинол 3.0% (экспозиция 60 мин + УФ 120 мин)",
		};
	}
	return {
		cleaningTypeRu: "Текущая дезинфекция 2-кратная",
		cleaningDisinfectant: "Оптимакс Про 1.5% + Бациллол АФ 3 мин",
	};
}

/**
 * Возвращает моющий состав для предстерилизационной очистки (ПСО) по СанПиН 3.3686-21
 */
export function matchPsoDetergent(): string {
	return "Биолот 0.5% + Аламинол 1.5%";
}

/**
 * Разрешает конфигурацию автоклава по идентификатору
 */
export function resolveAutoclaveRegime(
	regimeId: AutoclaveRegimeConfig["id"],
): AutoclaveRegimeConfig {
	return (
		AUTOCLAVE_REGIME_PRESETS.find((r) => r.id === regimeId) ||
		AUTOCLAVE_REGIME_PRESETS[0]!
	);
}
