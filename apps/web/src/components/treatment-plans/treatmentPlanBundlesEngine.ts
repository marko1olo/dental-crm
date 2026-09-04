/**
 * treatmentPlanBundlesEngine.ts — клинико-финансовый движок готовых пакетов «под ключ» DENTE CRM.
 * (Мандат 8e: Запрет на палки в колёса врачам и персоналу / Пакеты под ключ вместо номенклатурного ада).
 *
 * Врач не должен набивать 15 мелких кодов Минздрава на одну пломбу или удаление.
 * Добавление готового клинического комплекса выполняется в 1 клик с автоматической
 * раскладкой по номенклатуре Приказа Минздрава РФ № 804н, копейкам и клиническим этапам.
 */

import {
	type Kopecks,
	parseKopecks,
	sumKopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
} from "@dental/shared";
import type {
	NdflDeductionResult,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStageKind,
	TreatmentPlanTier,
} from "./types";
import { computeTierInstallments } from "./treatmentPlanStagesEngine";

export type ClinicalBundleId =
	| "caries_turnkey"
	| "endo_1canal_turnkey"
	| "endo_3canal_turnkey"
	| "hygiene_turnkey"
	| "extraction_turnkey"
	| "implant_turnkey"
	| "crown_metalloceramic_turnkey"
	| "crown_zirconia_turnkey";

export interface ClinicalBundleItemTemplate {
	readonly code804n: string;
	readonly name: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly materials: string;
	readonly clinicalRationale: string;
	readonly hideInPatientPresentation?: boolean;
}

export interface ClinicalBundleDefinition {
	readonly id: ClinicalBundleId;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly stageKind: TreatmentPlanStageKind;
	readonly stageNumber: 1 | 2 | 3;
	readonly totalPriceRub: number;
	readonly totalPriceKopecks: Kopecks;
	readonly requiresTooth: boolean;
	readonly defaultTooth: number;
	readonly items: readonly ClinicalBundleItemTemplate[];
	readonly badgeColor: string;
	readonly categoryName: string;
}

/**
 * 8 эталонных клинических пакетов «под ключ» (Мандат 8e)
 */
export const CLINICAL_BUNDLES: readonly ClinicalBundleDefinition[] = [
	{
		id: "caries_turnkey",
		title: "Пакет: Лечение кариеса под ключ (анестезия + коффердам + пломба Estelite + шлифовка/полировка)",
		shortTitle: "Кариес под ключ",
		description: "Полный комплекс санации кариозной полости: анестезия, абсолютная изоляция поля раббердамом, реставрация нанокомпозитом Estelite Sigma Quick и зеркальная полировка.",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 7500,
		totalPriceKopecks: parseKopecks(7500),
		requiresTooth: true,
		defaultTooth: 16,
		badgeColor: "emerald",
		categoryName: "Терапия",
		items: [
			{
				code804n: "A11.07.012",
				name: "Местная анестезия инфильтрационная / проводниковая (Ubistesin forte)",
				category: "Анестезия",
				defaultPriceRub: 900,
				materials: "Карпула Ubistesin forte 1:100 000, игла карпульная 30G",
				clinicalRationale: "Эффективное обезболивание при препарировании дентина",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.093",
				name: "Наложение коффердама (раббердама) для абсолютной изоляции рабочего поля",
				category: "Терапия",
				defaultPriceRub: 1200,
				materials: "Латексный платок Sanctuary, кламп Sanctuary #W8A, жидкий коффердам",
				clinicalRationale: "Защита от ротовой жидкости и аспирации адгезивного протокола",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.002.001",
				name: "Восстановление зуба пломбой (лечение кариеса нанокомпозитом Estelite)",
				category: "Терапия",
				defaultPriceRub: 4800,
				materials: "Светоотверждаемый нанокомпозит Tokuyama Estelite Sigma Quick, бонд Tokuyama Bond Force II",
				clinicalRationale: "Анатомическое восстановление бугров и фиссур по классу I/II",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.025.001",
				name: "Шлифовка и полировка пломбы микроабразивными пастами и дисками",
				category: "Терапия",
				defaultPriceRub: 600,
				materials: "Полировочные диски Sof-Lex, паста Detartrine / Cleanic, силиконовые головки",
				clinicalRationale: "Создание эффекта сухого блеска и предотвращение ретенции зубного налета",
				hideInPatientPresentation: false,
			},
		],
	},
	{
		id: "endo_1canal_turnkey",
		title: "Пакет: Эндодонтия 1-канального зуба под ключ (анестезия + мехобработка + гуттаперча + снимок)",
		shortTitle: "Эндодонтия 1 канал под ключ",
		description: "Полная терапия пульпита/периодонтита одноканального зуба: анестезия, коффердам, никель-титановая мехобработка ProTaper, 3D-обтурация гуттаперчей и рентген-контроль.",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 9100,
		totalPriceKopecks: parseKopecks(9100),
		requiresTooth: true,
		defaultTooth: 21,
		badgeColor: "indigo",
		categoryName: "Эндодонтия",
		items: [
			{
				code804n: "A11.07.012",
				name: "Местная анестезия инфильтрационная (Ubistesin forte)",
				category: "Анестезия",
				defaultPriceRub: 900,
				materials: "Карпула Ubistesin forte 1:100 000, игла 30G",
				clinicalRationale: "Купирование болевого синдрома пульпы зуба",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.093",
				name: "Наложение коффердама (раббердама) при эндодонтическом лечении",
				category: "Терапия",
				defaultPriceRub: 1200,
				materials: "Платок Nic Tone, кламп Brinker, жидкий коффердам",
				clinicalRationale: "Асептический эндодонтический протокол изоляции от слюны",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.030.001",
				name: "Инструментальная и медикаментозная обработка 1 корневого канала машинным методом",
				category: "Эндодонтия",
				defaultPriceRub: 3500,
				materials: "Машинные NiTi-файлы ProTaper Gold, гипохлорит натрия 3%, ЭДТА гель 17%",
				clinicalRationale: "Стерилизация и конусное препарирование системы корневого канала",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.008.001",
				name: "Пломбирование 1 корневого канала гуттаперчей методом латеральной/вертикальной конденсации",
				category: "Эндодонтия",
				defaultPriceRub: 2900,
				materials: "Гуттаперчевые штифты ProTaper, полимерный эпоксидный силер AH Plus",
				clinicalRationale: "Герметичная 3D-обтурация апикальной дельты корневого канала",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A06.07.003",
				name: "Прицельная внутриротовая контактная рентгенография (контрольный снимок обтурации)",
				category: "Диагностика",
				defaultPriceRub: 600,
				materials: "Цифровой радиовизиограф Carestream / Vatech",
				clinicalRationale: "Контроль плотности и границы обтурации канала до физиологического апекса",
				hideInPatientPresentation: false,
			},
		],
	},
	{
		id: "endo_3canal_turnkey",
		title: "Пакет: Эндодонтия 3-канального моляра под ключ (полная обтурация + снимок)",
		shortTitle: "Эндодонтия 3 канала моляр под ключ",
		description: "Комплексное первичное лечение корневых каналов многокорневого моляра: анестезия, коффердам, препарирование 3 каналов машинным файлом, 3D-обтурация и радиовизиография.",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 16200,
		totalPriceKopecks: parseKopecks(16200),
		requiresTooth: true,
		defaultTooth: 46,
		badgeColor: "indigo",
		categoryName: "Эндодонтия",
		items: [
			{
				code804n: "A11.07.012",
				name: "Местная анестезия проводниковая / мандибулярная (Ubistesin forte)",
				category: "Анестезия",
				defaultPriceRub: 900,
				materials: "Карпула Ubistesin forte, длинная игла 27G",
				clinicalRationale: "Мандибулярная / торусальная анестезия нижнего моляра",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.093",
				name: "Наложение коффердама (раббердама) на моляр",
				category: "Терапия",
				defaultPriceRub: 1200,
				materials: "Платок Sanctuary Heavy, кламп W3 / #14A",
				clinicalRationale: "Строгий эндодонтический барьер и безопасность ирригации NaOCl",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.030.003",
				name: "Инструментальная и медикаментозная обработка 3 корневых каналов машинным методом",
				category: "Эндодонтия",
				defaultPriceRub: 7500,
				materials: "Набор ротационных файлов ProTaper Ultimate, NaOCl 3.25%, УЗ-активация EndoActivator",
				clinicalRationale: "Полная механическая и химическая очистка MB, ML и Distal каналов",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.008.003",
				name: "Пломбирование / полная 3D-обтурация 3 корневых каналов моляра (гуттаперча + силер)",
				category: "Эндодонтия",
				defaultPriceRub: 6000,
				materials: "Термопластифицированная гуттаперча BeeFill, эпоксидный силер AH Plus",
				clinicalRationale: "Монолитная герметизация сложной анатомии 3 каналов",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A06.07.003",
				name: "Прицельная внутриротовая рентгенография (контрольный снимок обтурации 3 каналов)",
				category: "Диагностика",
				defaultPriceRub: 600,
				materials: "Цифровой радиовизиограф",
				clinicalRationale: "Визуализация качества обтурации всех корней до апикального сужения",
				hideInPatientPresentation: false,
			},
		],
	},
	{
		id: "hygiene_turnkey",
		title: "Пакет: Профгигиена полости рта под ключ (ультразвук + AirFlow + полировка + фторирование)",
		shortTitle: "Профгигиена под ключ",
		description: "Премиальный гигиенический SPA-протокол: бережный ультразвуковой скейлинг над- и поддесневых отложений, воздушно-абразивная полировка Air-Flow, финишная паста и фторлак.",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 6500,
		totalPriceKopecks: parseKopecks(6500),
		requiresTooth: false,
		defaultTooth: 0,
		badgeColor: "cyan",
		categoryName: "Гигиена",
		items: [
			{
				code804n: "A16.07.020",
				name: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений (скейлинг)",
				category: "Гигиена",
				defaultPriceRub: 2500,
				materials: "УЗ-насадки EMS Piezon Swiss Instruments, оптрагейт OptraGate",
				clinicalRationale: "Ликвидация минерализованного зубного камня со всех поверхностей",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.050.001",
				name: "Воздушно-абразивная обработка зубов методом Air-Flow (удаление пигментированного налета)",
				category: "Гигиена",
				defaultPriceRub: 2200,
				materials: "Глициновый мелкодисперсный порошок Air-Flow Plus (14 мкм)",
				clinicalRationale: "Удаление налета курильщика, чая/кофе без повреждения эмали и десны",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.025",
				name: "Полировка зубов профессиональными абразивными пастами и щетками",
				category: "Гигиена",
				defaultPriceRub: 800,
				materials: "Полировочная паста Cleanic с изменяемой абразивностью, нейлоновая щеточка",
				clinicalRationale: "Сглаживание микрошероховатостей эмали для профилактики повторного налета",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.050.002",
				name: "Глубокое фторирование и реминерализирующая терапия эмали всех зубов",
				category: "Гигиена",
				defaultPriceRub: 1000,
				materials: "Фторлак Clinpro White Varnish 5% NaF (3M ESPE), аппликаторы",
				clinicalRationale: "Снятие гиперестезии и насыщение эмали фторапатитами",
				hideInPatientPresentation: false,
			},
		],
	},
	{
		id: "extraction_turnkey",
		title: "Пакет: Удаление зуба под ключ (анестезия + удаление + кюретаж + гемостаз + альвожиль)",
		shortTitle: "Удаление зуба под ключ",
		description: "Атравматичное хирургическое удаление зуба с сохранением костной лунки: анестезия, элевация/люксация, тщательный кюретаж грануляций, местный гемостаз и паста Альвожиль.",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 6800,
		totalPriceKopecks: parseKopecks(6800),
		requiresTooth: true,
		defaultTooth: 38,
		badgeColor: "rose",
		categoryName: "Хирургия",
		items: [
			{
				code804n: "A11.07.012",
				name: "Местная анестезия проводниковая / инфильтрационная (Ultracain D-S forte)",
				category: "Анестезия",
				defaultPriceRub: 900,
				materials: "Карпула Ultracain D-S forte 1:100 000, игла 27G/30G",
				clinicalRationale: "Полная блокада периодонтальной чувствительности",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.001.001",
				name: "Удаление зуба простое / атравматичное с сохранением кортикальной пластинки",
				category: "Хирургия",
				defaultPriceRub: 3500,
				materials: "Атравматичные периотомы и люксаторы Hu-Friedy",
				clinicalRationale: "Бережное извлечение корней без повреждения вестибулярной костной стенки",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.039.001",
				name: "Кюретаж лунки удаленного зуба и механическое удаление грануляций",
				category: "Хирургия",
				defaultPriceRub: 900,
				materials: "Острая ложка Фолькмана, антисептический раствор хлоргексидина 0.05%",
				clinicalRationale: "Полная санация очага периапикальной инфекции в костной ткани",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.095",
				name: "Остановка луночного кровотечения (первичный гемостаз, компрессия)",
				category: "Хирургия",
				defaultPriceRub: 700,
				materials: "Гемостатическая коллагеновая губка Альванес / Белкозин",
				clinicalRationale: "Формирование стабильного первичного кровяного сгустка",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.095.001",
				name: "Внесение антисептической кровоостанавливающей пасты Альвожиль в лунку зуба",
				category: "Хирургия",
				defaultPriceRub: 800,
				materials: "Паста Alvogyl Septodont (эвгенол, йодоформ, волокна пенгхавара)",
				clinicalRationale: "Профилактика альвеолита, обезболивание и противовоспалительное действие",
				hideInPatientPresentation: false,
			},
		],
	},
	{
		id: "implant_turnkey",
		title: "Пакет: Дентальная имплантация под ключ (имплантат + операция + анестезия + формирователь)",
		shortTitle: "Имплантация под ключ",
		description: "Первый хирургический этап дентальной имплантации: проводниковая анестезия, подготовка костного ложа, установка титанового имплантата Osstem/Dentium и формирователя десны.",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 41500,
		totalPriceKopecks: parseKopecks(41500),
		requiresTooth: true,
		defaultTooth: 36,
		badgeColor: "amber",
		categoryName: "Имплантация",
		items: [
			{
				code804n: "A11.07.012",
				name: "Местная анестезия проводниковая / инфильтрационная (Ubistesin forte)",
				category: "Анестезия",
				defaultPriceRub: 900,
				materials: "Карпула Ubistesin forte, хирургическая стерильная салфетка",
				clinicalRationale: "Глубокая анестезия надкостницы и костной ткани челюсти",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.054.001",
				name: "Внутрикостная дентальная имплантация системы Osstem TS-III / Dentium SuperLine (хирургический протокол)",
				category: "Хирургия",
				defaultPriceRub: 35000,
				materials: "Титановый дентальный имплантат SLA-поверхность, стерильный хирургический набор",
				clinicalRationale: "Восстановление утраченного корня зуба с фиксацией первичной стабильности >= 35 Н/см",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.054.002",
				name: "Установка титанового формирователя десны (гингивопластика десневого края)",
				category: "Хирургия",
				defaultPriceRub: 5000,
				materials: "Титановый формирователь десны Healing Abutment, шовный материал Prolene 5-0",
				clinicalRationale: "Создание анатомического контура прорезывания десны вокруг будущей коронки",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A06.07.003",
				name: "Рентгенологический контроль позиционирования имплантата в кости",
				category: "Диагностика",
				defaultPriceRub: 600,
				materials: "Цифровой радиовизиограф",
				clinicalRationale: "Контроль параллельности и расстояния до нижнечелюстного канала / верхнечелюстного синуса",
				hideInPatientPresentation: false,
			},
		],
	},
	{
		id: "crown_metalloceramic_turnkey",
		title: "Пакет: Металлокерамическая коронка под ключ (препарирование + слепок + коронка + фиксация)",
		shortTitle: "Металлокерамика под ключ",
		description: "Классическое ортопедическое протезирование: препарирование с круговым уступом, прецизионный двухслойный слепок А-силиконом, металлокерамика Vita/Duceram и постоянная цементировка.",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 20000,
		totalPriceKopecks: parseKopecks(20000),
		requiresTooth: true,
		defaultTooth: 46,
		badgeColor: "teal",
		categoryName: "Ортопедия",
		items: [
			{
				code804n: "A16.07.004",
				name: "Препарирование зуба под металлокерамическую коронку с созданием уступа 135°",
				category: "Ортопедия",
				defaultPriceRub: 3500,
				materials: "Алмазные боры NTI, ретракционная нить Ultrapak #000, гемостатик ViscoStat",
				clinicalRationale: "Создание прецизионного зазора для края коронки без травмы круговой связки",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A02.07.010",
				name: "Снятие прецизионного двухслойного анатомического слепка А-силиконом",
				category: "Ортопедия",
				defaultPriceRub: 2500,
				materials: "А-силиконовая слепочная масса Elite HD+ (база + корригирующий слой), ложка металлическая",
				clinicalRationale: "Высокоточное отображение границ уступа и соседних зубов для ЗТЛ",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.004.001",
				name: "Изготовление металлокерамической коронки с нанесением индивидуальной керамики (Duceram/Vita)",
				category: "Ортопедия",
				defaultPriceRub: 12500,
				materials: "КХС сплав (Co-Cr Wirobond C), фарфоровая масса Vita VM13",
				clinicalRationale: "Восстановление жевательной эффективности и анатомической формы коронки",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.004.002",
				name: "Постоянная фиксация коронки на стеклоиономерный/полимерный цемент (Fuji I / RelyX Luting)",
				category: "Ортопедия",
				defaultPriceRub: 1500,
				materials: "Стеклоиономерный цемент GC Fuji I, полировочная головка",
				clinicalRationale: "Герметичная долговременная фиксация без микроподтеканий",
				hideInPatientPresentation: false,
			},
		],
	},
	{
		id: "crown_zirconia_turnkey",
		title: "Пакет: Коронка ZrO2 (диоксид циркония) под ключ (скан/слепок + коронка + примерка + фиксация)",
		shortTitle: "Коронка ZrO2 под ключ",
		description: "Безметалловое протезирование высшего класса биосовместимости: цифровое 3D-сканирование, фрезерование многослойного диоксида циркония Katana/Prettau CAD/CAM, юстировка и адгезивная фиксация.",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 30500,
		totalPriceKopecks: parseKopecks(30500),
		requiresTooth: true,
		defaultTooth: 16,
		badgeColor: "purple",
		categoryName: "Ортопедия",
		items: [
			{
				code804n: "A02.07.010.001",
				name: "Препарирование зуба и интраоральное цифровое 3D-сканирование (CAD/CAM 3Shape/Medit)",
				category: "Ортопедия",
				defaultPriceRub: 4500,
				materials: "Оптический 3D-сканер 3Shape TRIOS, скан-насадка, ретракционный гель",
				clinicalRationale: "Безошибочный цифровой оптический слепок без рвотного рефлекса у пациента",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.004.003",
				name: "Изготовление анатомической коронки из многослойного диоксида циркония (Katana Multi-Layered / Prettau)",
				category: "Ортопедия",
				defaultPriceRub: 22000,
				materials: "Диоксид циркония ZrO2 Katana ML 1200 МПа, синтеризационные красители",
				clinicalRationale: "Максимальная прочность и естественный градиент прозрачности живого зуба",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.004.004",
				name: "Клиническая примерка, окклюзионная юстировка и полировка циркониевой коронки в прикусе",
				category: "Ортопедия",
				defaultPriceRub: 1500,
				materials: "Артикуляционная бумага Bausch 40 мкм, алмазные полиры для циркония Dialite",
				clinicalRationale: "Точная балансировка окклюзионных контактов и динамических движений челюсти",
				hideInPatientPresentation: false,
			},
			{
				code804n: "A16.07.004.005",
				name: "Адгезивная постоянная фиксация циркониевой коронки на композитный цемент (RelyX Ultimate / Panavia V5)",
				category: "Ортопедия",
				defaultPriceRub: 2500,
				materials: "Композитный цемент RelyX Ultimate, циркониевый праймер Z-Prime Plus",
				clinicalRationale: "Химическая связь композита с диоксидом циркония и дентином зуба",
				hideInPatientPresentation: false,
			},
		],
	},
];

/**
 * Получить пакет по его идентификатору
 */
export function getClinicalBundleById(bundleId: ClinicalBundleId): ClinicalBundleDefinition | undefined {
	return CLINICAL_BUNDLES.find((b) => b.id === bundleId);
}

/**
 * Создать массив элементов плана лечения (TreatmentPlanItem) для указанного пакета.
 */
export function createBundlePlanItems(
	bundleId: ClinicalBundleId,
	toothNumber?: number,
): TreatmentPlanItem[] {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		throw new Error(`[treatmentPlanBundlesEngine] Неизвестный пакет: ${bundleId}`);
	}

	const effectiveTooth = bundle.requiresTooth
		? toothNumber && toothNumber > 0
			? toothNumber
			: bundle.defaultTooth
		: undefined;

	const now = Date.now();

	return bundle.items.map((tmpl, idx) => {
		const uniqueId = `item-bundle-${bundle.id}-${effectiveTooth || "mouth"}-${now}-${idx + 1}`;
		const toothPrefix = effectiveTooth ? `[Зуб ${effectiveTooth}] ` : "";

		return {
			id: uniqueId,
			toothNumber: effectiveTooth,
			code804n: tmpl.code804n,
			name: `${toothPrefix}${tmpl.name}`,
			category: tmpl.category,
			priceRub: tmpl.defaultPriceRub,
			unitPriceRub: tmpl.defaultPriceRub,
			discountRub: 0,
			quantity: 1,
			phase: bundle.stageNumber,
			stageKind: bundle.stageKind,
			isAuto: false,
			materials: tmpl.materials,
			clinicalRationale: tmpl.clinicalRationale,
			fromCatalog: true,
			isDraft: false,
			requiresManualPricing: false,
		};
	});
}

/**
 * Применить готовый клинический пакет под ключ к списку этапов плана лечения (TreatmentPlanStage[]).
 * Добавляет позиции в соответствующий клинический этап (Этап 1, 2 или 3) с автоматическим пересчетом сумм и копеек.
 */
export function applyClinicalBundleToStages(
	stages: readonly TreatmentPlanStage[],
	bundleId: ClinicalBundleId,
	toothNumber?: number,
): TreatmentPlanStage[] {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		return [...stages];
	}

	const newItems = createBundlePlanItems(bundleId, toothNumber);

	// Проверяем, существует ли целевой этап
	const targetStageExists = stages.some(
		(st) => st.stageKind === bundle.stageKind || st.stageNumber === bundle.stageNumber,
	);

	if (!targetStageExists) {
		// Создаем новый этап, если его не было
		const stageTitles: Record<1 | 2 | 3, { title: string; subtitle: string; goal: string }> = {
			1: {
				title: "Этап 1: Неотложная помощь и терапевтическая санация",
				subtitle: "Ликвидация очагов инфекции, лечение кариеса и гигиена",
				goal: "Полная санация полости рта и устранение болевых симптомов",
			},
			2: {
				title: "Этап 2: Хирургический этап и дентальная имплантация",
				subtitle: "Удаление безнадежных зубов, костная пластика и имплантация",
				goal: "Восстановление фундамента челюстной кости и опор",
			},
			3: {
				title: "Этап 3: Ортопедический этап и протезирование",
				subtitle: "Эстетическое и функциональное восстановление зубных рядов",
				goal: "Окончательное протезирование и нормализация окклюзии",
			},
		};

		const meta = stageTitles[bundle.stageNumber];
		const stageTotalRub = newItems.reduce((acc, it) => acc + it.priceRub, 0);
		const stageTotalKopecks = parseKopecks(stageTotalRub);

		const newStage: TreatmentPlanStage = {
			stageNumber: bundle.stageNumber,
			stageKind: bundle.stageKind,
			title: meta.title,
			subtitle: meta.subtitle,
			clinicalGoal: meta.goal,
			items: newItems,
			totalRub: stageTotalRub,
			totalKopecks: stageTotalKopecks,
			estimatedVisits: Math.max(1, Math.ceil(newItems.length / 2)),
			estimatedWeeks: bundle.stageNumber === 2 ? 12 : 2,
			order804nCodes: newItems.map((it) => it.code804n),
		};

		const updatedStages = [...stages, newStage].sort((a, b) => a.stageNumber - b.stageNumber);
		return updatedStages;
	}

	// Обновляем существующий этап
	return stages.map((stage) => {
		if (stage.stageKind !== bundle.stageKind && stage.stageNumber !== bundle.stageNumber) {
			return stage;
		}

		const updatedItems = [...stage.items, ...newItems];
		const updatedTotalRub = updatedItems.reduce((acc, it) => acc + it.priceRub, 0);
		const updatedTotalKopecks = sumKopecks(updatedItems.map((it) => parseKopecks(it.priceRub)));
		const updated804nCodes = Array.from(
			new Set([...stage.order804nCodes, ...newItems.map((it) => it.code804n)]),
		);

		return {
			...stage,
			items: updatedItems,
			totalRub: updatedTotalRub,
			totalKopecks: updatedTotalKopecks,
			estimatedVisits: Math.max(stage.estimatedVisits, Math.ceil(updatedItems.length / 2)),
			order804nCodes: updated804nCodes,
		};
	});
}

/**
 * Применить готовый клинический пакет под ключ к варианту тарифа TreatmentPlanTier
 * с полным пересчетом вычета 13% НДФЛ, рассрочки 0% и графика платежей.
 */
export function applyClinicalBundleToTier(
	tier: TreatmentPlanTier,
	bundleId: ClinicalBundleId,
	toothNumber?: number,
): TreatmentPlanTier {
	const updatedStages = applyClinicalBundleToStages(tier.stages, bundleId, toothNumber);
	const totalKopecks = sumKopecks(updatedStages.map((s) => s.totalKopecks));
	const totalRub = Math.round(totalKopecks / 100);
	const allItems = updatedStages.flatMap((s) => s.items);

	const ndflBreakdown = calculatePlanTaxDeductionBreakdown(allItems);
	const isHighCost = ndflBreakdown.hasCode02ExpensiveServices;
	const ndflDetails: NdflDeductionResult = {
		code: isHighCost ? "02" : "01",
		codeDescription: isHighCost
			? "Код 02 — Дорогостоящее лечение (имплантация, костная пластика, синус-лифтинг) — налоговый вычет 13% со всей суммы без ограничений"
			: "Код 01 — Обычное медицинское лечение (терапия, гигиена, ортопедия) — налоговый вычет 13% с лимитом базы 150 000 ₽ (макс. возврат 19 500 ₽)",
		isHighCostCode02: isHighCost,
		baseKopecks: (isHighCost ? totalKopecks : Math.min(totalKopecks, parseKopecks(150000))) as Kopecks,
		refundKopecks: parseKopecks(ndflBreakdown.grandTotalRefund13Rub),
		refundRub: ndflBreakdown.grandTotalRefund13Rub,
		finalPriceWithRefundRub: ndflBreakdown.netPriceWithRefundRub,
		annualLimitRub: isHighCost ? undefined : 150000,
	};
	const installments = computeTierInstallments(totalKopecks);
	const stagedSchedule = calculateStaged304030Schedule(totalKopecks, true);

	return {
		...tier,
		stages: updatedStages,
		itemsCount: allItems.length,
		totalRub,
		totalKopecks,
		monthlyInstallment12Rub: installments[12].monthlyPaymentRub,
		installments,
		ndflDetails,
		ndflRefundRub: ndflBreakdown.grandTotalRefund13Rub,
		priceWithNdflRefundRub: ndflBreakdown.netPriceWithRefundRub,
		stagedSchedule,
	};
}
