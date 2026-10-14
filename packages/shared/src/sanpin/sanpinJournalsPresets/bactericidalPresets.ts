/**
 * ============================================================================
 * SANPIN 3.3686-21 & R 3.5.1904-04 BACTERICIDAL RECIRCULATORS & CLEANING PRESETS
 * Регламенты работы бактерицидных установок, категории чистоты помещений
 * и графики генеральных уборок стоматологической клиники.
 * ============================================================================
 */

import type {
	GeneralCleaningPresetDefinition,
	RoomSanitaryCategoryDefinition,
	UvRecirculatorModelDefinition,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 2. РЕЦИРКУЛЯТОРЫ И БАКТЕРИЦИДНЫЕ УСТАНОВКИ (Р 3.5.1904-04 / САНПИН 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

export const UV_RECIRCULATOR_MODELS: readonly UvRecirculatorModelDefinition[] = [
	{
		id: "dezar_4",
		brandNameRu: "Дезар-4 (ОРУБн-3-3-«КРОНТ»)",
		fullModelNameRu: "Облучатель-рециркулятор настенный ОРУБн-3-3-«КРОНТ» (Дезар-4)",
		manufacturerRu: "АО «КРОНТ-М», Россия",
		deviceType: "recirculator_closed",
		lampCount: 3,
		lampTypeRu: "УФ-лампа безозоновая TUV 15W Philips / HNS 15W Osram",
		lampPowerWatts: 15,
		standardLampLifetimeHours: 8000,
		productivityM3PerHour: 100,
		allowedInPresenceOfPeople: true,
		recommendedRoomVolumeM3: 50,
	},
	{
		id: "dezar_7",
		brandNameRu: "Дезар-7 (ОРУБп-3-5-«КРОНТ» передвижной)",
		fullModelNameRu: "Облучатель-рециркулятор передвижной ОРУБп-3-5-«КРОНТ» (Дезар-7)",
		manufacturerRu: "АО «КРОНТ-М», Россия",
		deviceType: "recirculator_closed",
		lampCount: 5,
		lampTypeRu: "УФ-лампа безозоновая TUV 15W Philips",
		lampPowerWatts: 15,
		standardLampLifetimeHours: 8000,
		productivityM3PerHour: 120,
		allowedInPresenceOfPeople: true,
		recommendedRoomVolumeM3: 100,
	},
	{
		id: "sibest_sunny",
		brandNameRu: "Сибэст-45",
		fullModelNameRu: "Облучатель-рециркулятор бактерицидный Сибэст-45 настенный",
		manufacturerRu: "ООО «Сибэст», Россия",
		deviceType: "recirculator_closed",
		lampCount: 2,
		lampTypeRu: "УФ-лампа TUV 15W",
		lampPowerWatts: 15,
		standardLampLifetimeHours: 9000,
		productivityM3PerHour: 60,
		allowedInPresenceOfPeople: true,
		recommendedRoomVolumeM3: 45,
	},
	{
		id: "obn_150_open",
		brandNameRu: "ОБН-150 (Открытый облучатель)",
		fullModelNameRu: "Облучатель бактерицидный настенный ОБН-150 (2х30 Вт)",
		manufacturerRu: "Россия",
		deviceType: "irradiator_open",
		lampCount: 2,
		lampTypeRu: "УФ-лампа ДБ-30 / TUV 30W",
		lampPowerWatts: 30,
		standardLampLifetimeHours: 8000,
		productivityM3PerHour: 150,
		allowedInPresenceOfPeople: false,
		recommendedRoomVolumeM3: 60,
	},
];

export const ROOM_SANITARY_CATEGORIES: readonly RoomSanitaryCategoryDefinition[] = [
	{
		categoryCode: "I",
		categoryNameRu: "Категория I — Особо стерильные помещения",
		targetBactericidalEfficiencyPercent: 99.9,
		roomExamplesRu: ["Операционная хирургической стоматологии", "Предоперационная"],
		maxAllowedMicrobialCountCfuPerM3: 200,
	},
	{
		categoryCode: "II",
		categoryNameRu: "Категория II — Стерильные помещения",
		targetBactericidalEfficiencyPercent: 99.0,
		roomExamplesRu: [
			"Кабинет терапевтической стоматологии",
			"Кабинет ортопедической стоматологии",
			"Стерилизационная (ЦСО)",
			"Кабинет гигиены и профилактики",
		],
		maxAllowedMicrobialCountCfuPerM3: 500,
	},
	{
		categoryCode: "III",
		categoryNameRu: "Категория III — Условно-стерильные помещения",
		targetBactericidalEfficiencyPercent: 95.0,
		roomExamplesRu: ["Кабинет рентгенодиагностики (КЛКТ, ОПТГ)", "Зуботехническая лаборатория"],
		maxAllowedMicrobialCountCfuPerM3: 750,
	},
	{
		categoryCode: "IV",
		categoryNameRu: "Категория IV — Вспомогательные помещения",
		targetBactericidalEfficiencyPercent: 90.0,
		roomExamplesRu: ["Помещение временного накопления отходов", "Санузлы для персонала и пациентов"],
		maxAllowedMicrobialCountCfuPerM3: 1000,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. ГЕНЕРАЛЬНЫЕ УБОРКИ (САНПИН 3.3686-21 РАЗДЕЛ IV)
// ─────────────────────────────────────────────────────────────────────────────

export const GENERAL_CLEANING_PRESETS: readonly GeneralCleaningPresetDefinition[] = [
	{
		roomType: "surgical",
		roomTypeTitleRu: "Хирургический стоматологический кабинет / Операционная",
		statutoryFrequencyDays: 7,
		sanpinNormRefRu: "СанПиН 3.3686-21 п. 3524",
		standardDisinfectantRu: "Аламинол (или Оптимакс Про)",
		standardConcentrationPercent: 1.5,
		standardExposureMinutes: 60,
		standardUvIrradiationMinutes: 120,
		standardVentilationMinutes: 20,
		mandatoryStepsRu: [
			"Освобождение кабинета от расходных материалов и медикаментов",
			"Мытье поверхностей, стен на всю высоту дезинфицирующим раствором",
			"Нанесение рабочего раствора дезсредства методом двукратного протирания с интервалом 15 мин",
			"Выдержка экспозиции 60 минут в закрытом помещении",
			"Смывание дезинфектанта чистой водой",
			"Бактерицидное УФ-облучение 120 мин",
			"Проветривание не менее 20 минут",
		],
	},
	{
		roomType: "therapeutic",
		roomTypeTitleRu: "Терапевтический / Ортопедический кабинет",
		statutoryFrequencyDays: 7,
		sanpinNormRefRu: "СанПиН 3.3686-21 п. 3524",
		standardDisinfectantRu: "Бриллиант Классик (или Аламинол)",
		standardConcentrationPercent: 1.0,
		standardExposureMinutes: 60,
		standardUvIrradiationMinutes: 60,
		standardVentilationMinutes: 15,
		mandatoryStepsRu: [
			"Очистка светильников, мебели и радиаторов",
			"Обеззараживание поверхностей стоматологической установки",
			"Двукратное протирание стен и пола рабочим раствором",
			"Экспозиция 60 минут",
			"Смывание чистой водой",
			"УФ-обеззараживание 60 минут",
			"Проветривание 15 минут",
		],
	},
	{
		roomType: "cso_sterile",
		roomTypeTitleRu: "Центральное стерилизационное отделение (ЦСО)",
		statutoryFrequencyDays: 7,
		sanpinNormRefRu: "СанПиН 3.3686-21",
		standardDisinfectantRu: "Оптимакс Про 1.5%",
		standardConcentrationPercent: 1.5,
		standardExposureMinutes: 60,
		standardUvIrradiationMinutes: 90,
		standardVentilationMinutes: 15,
		mandatoryStepsRu: [
			"Раздельная обработка 'грязной' и 'чистой' зон ЦСО",
			"Очистка ультразвуковых моек и запечатывающих устройств",
			"Дезинфекция столов и полок хранения крафт-пакетов",
			"Экспозиция и смыв",
			"УФ-облучение 90 минут",
			"Проветривание",
		],
	},
	{
		roomType: "xray",
		roomTypeTitleRu: "Кабинет рентгенодиагностики (КЛКТ / ОПТГ)",
		statutoryFrequencyDays: 7,
		sanpinNormRefRu: "СанПиН 2.6.1.1192-03 и СанПиН 3.3686-21",
		standardDisinfectantRu: "Бриллиант Классик 1.0%",
		standardConcentrationPercent: 1.0,
		standardExposureMinutes: 30,
		standardUvIrradiationMinutes: 60,
		standardVentilationMinutes: 15,
		mandatoryStepsRu: [
			"Обесточивание аппаратуры перед влажной уборкой",
			"Дезинфекция защитных фартуков и позиционеров",
			"Протирание поверхностей аппарата, стен и пола",
			"УФ-облучение 60 минут",
		],
	},
	{
		roomType: "utility",
		roomTypeTitleRu: "Вспомогательные помещения и комната медотходов",
		statutoryFrequencyDays: 30,
		sanpinNormRefRu: "СанПиН 3.3686-21 и СанПиН 2.1.3684-21",
		standardDisinfectantRu: "Аламинол 3.0%",
		standardConcentrationPercent: 3.0,
		standardExposureMinutes: 60,
		standardUvIrradiationMinutes: 60,
		standardVentilationMinutes: 30,
		mandatoryStepsRu: [
			"Дезинфекция баков и холодильных камер для отходов класса Б",
			"Мытье стен и пола с дезраствором",
			"УФ-облучение и вентиляция",
		],
	},
];
