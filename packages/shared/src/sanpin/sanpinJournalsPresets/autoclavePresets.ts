/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZERS, AUTOCLAVES & CABINET READINESS PRESETS
 * Мульти-автоклавы (Melag, Euronda, DGM, Каспер, Tau Clave) и экспресс-чек-листы
 * подготовки кабинета и стоматологической установки по профилям приёма.
 * ============================================================================
 */

import type {
	CabinetReadinessPreset,
	DentalAppointmentType,
	SterilizerHardwareDefinition,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 4. ЭКСПРЕСС-ЧЕК-ЛИСТ «ПОДГОТОВКА КАБИНЕТА И СТОМАТОЛОГИЧЕСКОЙ УСТАНОВКИ»
// ─────────────────────────────────────────────────────────────────────────────

export const CABINET_READINESS_PRESETS: readonly CabinetReadinessPreset[] = [
	{
		type: "therapy",
		titleRu: "Терапевтический приём (кариес, реставрация, некариозные поражения)",
		shortLabelRu: "Терапия",
		requiredDisinfectantsRu: ["Бациллол АФ", "Дезискраб", "Экобриз Окси", "Микаспор"],
		defaultDisinfectantRu: "Бациллол АФ (экспресс-спрей)",
		minExposureMinutes: 3,
		requiredHandpiecesRu: [
			"Турбинный наконечник с оптикой (стерильный крафт-пакет, индикатор 5 кл.)",
			"Микромоторный угловой наконечник 1:1",
			"Пистолет вода/воздух с одноразовой насадкой",
		],
		requiresCofferdam: true,
		requiredAspirationRu: [
			"Слюноотсос одноразовый (подключен к системе)",
			"Пылесос аспирационный (канюля 11/16 мм)",
		],
		requiredSterileTrayRu: [
			"Зеркало стоматологическое стерильное",
			"Зонд угловой остроконечный",
			"Пинцет анатомический",
			"Гладилка-штопфер двухсторонняя",
		],
		specialtyEquipmentRu: [
			"Фотополимеризационная лампа с одноразовым чехлом",
			"Набор матриц, клиньев и полировочных дисков",
			"Адгезивная система и травильный гель",
		],
		mandatorySurfacesRu: [
			"Стоматологическая установка и кресло пациента",
			"Столик врача и столик ассистента",
			"Ручки и выключатель бестеневого светильника",
			"Гидроблок и аспирационная система",
			"Шланги наконечников и блок управления установкой",
		],
	},
	{
		type: "endodontics",
		titleRu: "Эндодонтический приём (пульпит, периодонтит, перелечивание каналов)",
		shortLabelRu: "Эндодонтия",
		requiredDisinfectantsRu: ["Бациллол АФ", "Дезискраб", "Экобриз Окси"],
		defaultDisinfectantRu: "Бациллол АФ (экспресс-спрей)",
		minExposureMinutes: 3,
		requiredHandpiecesRu: [
			"Эндодонтический микромотор / угловой наконечник 6:1 (стерильный)",
			"Турбинный наконечник для создания эндодоступа",
			"Ультразвуковой наконечник с эндо-насадками",
		],
		requiresCofferdam: true,
		requiredAspirationRu: [
			"Слюноотсос с эндодонтической канюлей",
			"Хирургический/эндо пылесос для ирригации",
		],
		requiredSterileTrayRu: [
			"Смотровой лоток (зеркало, зонд, пинцет)",
			"Эндодонтический пинцет с продольным пазом",
			"Эндодонтическая линейка калибровочная стерильная",
		],
		specialtyEquipmentRu: [
			"Апекслокатор с проверенным загубником и клипсой",
			"Эндомотор беспроводной",
			"Ирригационные шприцы с эндоиглами с боковым срезом (NaOCl 3%, ЭДТА 17%)",
			"Аппарат трехмерной обтурации горячей гуттаперчей",
		],
		mandatorySurfacesRu: [
			"Кресло пациента и защитный фартук",
			"Столик врача и столик ассистента",
			"Ручки светильника (барьерная пленка / дезинфекция)",
			"Корпус апекслокатора и эндомотора",
			"Гидроблок и аспирационная система",
		],
	},
	{
		type: "surgery",
		titleRu: "Хирургический приём (удаление зубов, цистэктомия, резекция)",
		shortLabelRu: "Хирургия",
		requiredDisinfectantsRu: ["Дезискраб", "Бациллол АФ", "Аламинол 1.5%"],
		defaultDisinfectantRu: "Дезискраб / Бациллол АФ",
		minExposureMinutes: 5,
		requiredHandpiecesRu: [
			"Прямой хирургический наконечник стерильный",
			"Хирургический угловой наконечник со стерильным физраствором",
		],
		requiresCofferdam: false,
		requiredAspirationRu: [
			"Хирургический аспиратор стерильный (металлический/одноразовый наконечник)",
			"Слюноотсос стерильный",
		],
		requiredSterileTrayRu: [
			"Щипцы экстракционные в крафт-пакете (индикатор 5 кл. ОК)",
			"Элеваторы прямой, штыковидный, угловой стерильные",
			"Кюретажная ложка Лукаса",
			"Распатор костный и скальпель стерильный одноразовый",
			"Иглодержатель, ножницы, шовный материал с атравматической иглой",
		],
		specialtyEquipmentRu: [
			"Стерильные марлевые салфетки и гемостатические губки",
			"Анестетик карпульный с иглой 30G/27G и карпульным шприцем",
			"Стерильный лоток для удаленных зубов/биоптата",
		],
		mandatorySurfacesRu: [
			"Полная деконтаминация стоматологической установки (экспозиция 5 мин)",
			"Стерильное операционное белье / одноразовая простыня",
			"Бестеневой светильник со стерильными чехлами на ручках",
			"Хирургический столик из нержавеющей стали (стерильное покрытие)",
		],
	},
	{
		type: "implantology",
		titleRu: "Дентальная имплантация и костная пластика (высокая стерильность)",
		shortLabelRu: "Имплантация",
		requiredDisinfectantsRu: ["Дезискраб 70%", "Бациллол АФ", "Оптимакс Про"],
		defaultDisinfectantRu: "Дезискраб + Бациллол АФ",
		minExposureMinutes: 5,
		requiredHandpiecesRu: [
			"Физиодиспенсер со стерильным угловым редукционным наконечником 20:1",
			"Стерильная ирригационная система охлаждения физраствором",
		],
		requiresCofferdam: false,
		requiredAspirationRu: [
			"Хирургический наконечник аспирации тонкий стерильный",
			"Резервная аспирационная линия",
		],
		requiredSterileTrayRu: [
			"Хирургический базовый набор стерильный",
			"Хирургический протокол имплантационной системы (пилотные, формирующие фрезы)",
			"Динамометрический ключ (храповик / динамометр) поверенный",
			"Глубиномер и пины параллельности",
		],
		specialtyEquipmentRu: [
			"Физиодиспенсер проверен, педаль в стерильном чехле",
			"Стерильные халаты, шапочки, перчатки и маски хирурга/ассистента",
			"Стерильные простыни для изоляции операционного поля пациента",
			"Упаковки дентальных имплантатов с неповрежденной заводской пломбой",
		],
		mandatorySurfacesRu: [
			"Стерильное зонирование операционной (чистая и грязная зоны)",
			"Все поверхности обработаны двукратно с экспозицией 5 мин",
			"УФ-рециркулятор отработал предоперационный цикл",
		],
	},
	{
		type: "pediatric",
		titleRu: "Детский приём (терапия, адаптация, молочный прикус)",
		shortLabelRu: "Детство",
		requiredDisinfectantsRu: ["Экобриз Окси (мягкий запах)", "Бациллол АФ"],
		defaultDisinfectantRu: "Экобриз Окси",
		minExposureMinutes: 3,
		requiredHandpiecesRu: [
			"Турбинный наконечник с пониженным уровнем шума",
			"Микромоторный наконечник с щеточкой для профгигиены",
		],
		requiresCofferdam: true,
		requiredAspirationRu: [
			"Слюноотсос с мягким наконечником (комфортный детский)",
			"Аспирационная канюля детская",
		],
		requiredSterileTrayRu: [
			"Смотровой детский лоток стерильный",
			"Зонд пуговчатый не травмирующий",
			"Пинцет анатомический",
		],
		specialtyEquipmentRu: [
			"Аппликационный анестетик с фруктовым вкусом",
			"Цветные коффердам-платки и детские клампы (W8A, 14, 00)",
			"Фторирующий гель / реминерализующая пенка",
			"Адаптационные подарки / игрушка смелости",
		],
		mandatorySurfacesRu: [
			"Кресло пациента с детским вкладышем/подушкой",
			"Столики врача и ассистента без пугающих инструментов на виду",
			"Ручки светильника и гидроблок продезинфицированы",
		],
	},
	{
		type: "orthopedics",
		titleRu: "Ортопедический приём (препарирование, сканирование, примерка, фиксация)",
		shortLabelRu: "Ортопедия",
		requiredDisinfectantsRu: ["Бациллол АФ", "Дезискраб", "Экобриз Окси"],
		defaultDisinfectantRu: "Бациллол АФ",
		minExposureMinutes: 3,
		requiredHandpiecesRu: [
			"Ортопедический турбинный наконечник высокой мощности с 4-точечным спреем",
			"Повышающий наконечник 1:5 для финишной обработки уступа",
		],
		requiresCofferdam: false,
		requiredAspirationRu: [
			"Слюноотсос одноразовый",
			"Пылесос высокообъемный",
		],
		requiredSterileTrayRu: [
			"Смотровой лоток (зеркало, зонд, пинцет)",
			"Ретракционная гладилка тонкая",
			"Калибратор толщины препарирования",
		],
		specialtyEquipmentRu: [
			"Набор алмазных боров для препарирования под коронки/виниры",
			"Ретракционные нити (размеры 000, 00, 0) и гемостатик",
			"Интраоральный 3D-сканер с откалиброванной стерильной насадкой",
			"Адгезивный цемент двойного отверждения и полимеризационная лампа",
		],
		mandatorySurfacesRu: [
			"Кресло пациента, столик врача и ассистента",
			"Наконечник интраорального сканера и защитные чехлы",
			"Светильник и блок управления установкой",
		],
	},
	{
		type: "orthodontics",
		titleRu: "Ортодонтический приём (фиксация брекетов, замена дуг, элайнеры)",
		shortLabelRu: "Ортодонтия",
		requiredDisinfectantsRu: ["Бациллол АФ", "Экобриз Окси"],
		defaultDisinfectantRu: "Бациллол АФ",
		minExposureMinutes: 3,
		requiredHandpiecesRu: [
			"Микромоторный наконечник с полировочной чашкой и щеточкой",
		],
		requiresCofferdam: false,
		requiredAspirationRu: [
			"Слюноотсос с мягким изгибом",
			"Пылесос",
		],
		requiredSterileTrayRu: [
			"Смотровой лоток стерильный",
			"Ортодонтический пинцет обратного действия для брекетов",
			"Позиционер брекетов регулируемый стерильный",
			"Щипцы Вайнгарта и дистальные кусачки стерильные",
		],
		specialtyEquipmentRu: [
			"Роторасширитель (Оптрагейт / пластиковый ретрактор) стерильный",
			"Ортодонтический адгезив светового отверждения",
			"Ортодонтические дуги, лигатуры и эластики",
		],
		mandatorySurfacesRu: [
			"Кресло пациента, подголовник",
			"Столики врача и ассистента",
			"Светильник и кнопки управления",
		],
	},
];

export function getCabinetReadinessPreset(type: DentalAppointmentType): CabinetReadinessPreset {
	const found = CABINET_READINESS_PRESETS.find((p) => p.type === type);
	return found || CABINET_READINESS_PRESETS[0]!;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. МУЛЬТИ-АВТОКЛАВЫ И ОБОРУДОВАНИЕ СТЕРИЛИЗАЦИОННОЙ (MELAG, EURONDA, DGM, КАСПЕР)
// ─────────────────────────────────────────────────────────────────────────────

export const CLINIC_AUTOCLAVE_MODELS: readonly SterilizerHardwareDefinition[] = [
	{
		id: "melag_vacuklav_23b",
		code: "АК-01 (Melag)",
		brandModelRu: "Melag Vacuklav 23B+ (Германия)",
		manufacturerRu: "MELAG Medizintechnik, Германия",
		deviceClass: "Class_B_autoclave",
		chamberVolumeLiters: 23,
		serialNumber: "MEL-2024-8842",
		supportedRegimeIds: ["steam_134_5min", "steam_134_20min", "steam_121_20min"],
		defaultIndicatorId: "vinar_intetest_5",
		maxCyclesPerDay: 8,
		descriptionRu:
			"Премиальный автоклав B-класса с фракционированным предварительным вакуумом и глубокой сушкой",
	},
	{
		id: "euronda_e9_next",
		code: "АК-02 (Euronda)",
		brandModelRu: "Euronda E9 Next / E10 (Италия)",
		manufacturerRu: "Euronda S.p.A., Италия",
		deviceClass: "Class_B_autoclave",
		chamberVolumeLiters: 24,
		serialNumber: "EUR-2024-4190",
		supportedRegimeIds: ["steam_134_5min", "steam_134_20min", "steam_121_20min"],
		defaultIndicatorId: "vinar_intetest_5",
		maxCyclesPerDay: 8,
		descriptionRu:
			"Интеллектуальный B-автоклав с контролем проводимости воды и встроенным термопринтером этикеток",
	},
	{
		id: "dgm_and_24",
		code: "АК-03 (DGM)",
		brandModelRu: "DGM AND-24 (Швейцария/Россия)",
		manufacturerRu: "DGM Pharma-Apparate Handel AG",
		deviceClass: "Class_B_autoclave",
		chamberVolumeLiters: 24,
		serialNumber: "DGM-2023-7123",
		supportedRegimeIds: ["steam_134_5min", "steam_134_20min", "steam_121_20min"],
		defaultIndicatorId: "medtest_is5_integrator",
		maxCyclesPerDay: 6,
		descriptionRu:
			"Высоконадежный автоклав B-класса для стерилизации полых и пористых инструментов в крафт-пакетах",
	},
	{
		id: "kasper_23",
		code: "АК-04 (Каспер)",
		brandModelRu: "Каспер-Мед 23L Автоклав B-класс (Россия)",
		manufacturerRu: "ООО «Каспер-Мед», Россия",
		deviceClass: "Class_B_autoclave",
		chamberVolumeLiters: 23,
		serialNumber: "KAS-2024-1055",
		supportedRegimeIds: ["steam_134_5min", "steam_134_20min", "steam_121_20min"],
		defaultIndicatorId: "vinar_steritest_4",
		maxCyclesPerDay: 6,
		descriptionRu:
			"Отечественный B-автоклав с микропроцессорным управлением и тройным вакуумным циклом",
	},
	{
		id: "tau_clave_3000",
		code: "СХ-01 (Tau Clave)",
		brandModelRu: "Tau Clave 3000 Сухожаровой шкаф (Италия)",
		manufacturerRu: "Tau Steril, Италия",
		deviceClass: "Dry_heat_sterilizer",
		chamberVolumeLiters: 17,
		serialNumber: "TAU-2022-3901",
		supportedRegimeIds: ["dry_heat_180_60min"],
		defaultIndicatorId: "vinar_steritest_4",
		maxCyclesPerDay: 4,
		descriptionRu:
			"Воздушный стерилизатор (180°C / 60 мин) для цельнометаллических щипцов и элеваторов",
	},
];

export function getSterilizerHardware(idOrCode: string): SterilizerHardwareDefinition {
	const found = CLINIC_AUTOCLAVE_MODELS.find(
		(a) => a.id === idOrCode || a.code.toLowerCase().includes(idOrCode.toLowerCase()),
	);
	return found || CLINIC_AUTOCLAVE_MODELS[0]!;
}
