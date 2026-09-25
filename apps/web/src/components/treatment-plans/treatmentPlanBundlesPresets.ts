/**
 * treatmentPlanBundlesPresets.ts — Эталонные клинические пакеты «под ключ» DENTE CRM.
 * (Мандат 8e: Запрет на палки в колёса врачам и персоналу / Пакеты под ключ вместо номенклатурного ада).
 *
 * 10 готовых клинических пакетов с кодами Приказа Минздрава РФ № 804н, копейками, этапами и материалами.
 */

import { type Kopecks, parseKopecks } from "@dental/shared";
import type { TreatmentPlanStageKind } from "./types";

export type ClinicalBundleId =
	| "caries_turnkey"
	| "endo_1canal_turnkey"
	| "endo_3canal_turnkey"
	| "hygiene_turnkey"
	| "extraction_turnkey"
	| "complex_extraction"
	| "implant_turnkey"
	| "crown_metalloceramic_turnkey"
	| "crown_zirconia_turnkey"
	| "impression_asilicone_2jaws";

export type ClinicalBundleCategory =
	| "therapy"
	| "surgery"
	| "hygiene"
	| "orthopedics"
	| "implantation";

export interface ClinicalBundleItemTemplate {
	readonly id: string;
	readonly code804n: string;
	readonly name: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly defaultPriceKopecks: Kopecks;
	readonly materials: string;
	readonly clinicalRationale: string;
	readonly optional?: boolean;
	readonly defaultSelected?: boolean;
	readonly hideInPatientPresentation?: boolean;
}

export interface ClinicalBundleDefinition {
	readonly id: ClinicalBundleId;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly category: ClinicalBundleCategory;
	readonly categoryLabel: string;
	readonly categoryName: string;
	readonly stageKind: TreatmentPlanStageKind;
	readonly stageNumber: 1 | 2 | 3;
	readonly totalPriceRub: number;
	readonly totalPriceKopecks: Kopecks;
	readonly basePriceRub: number;
	readonly basePriceKopecks: Kopecks;
	readonly requiresTooth: boolean;
	readonly defaultTooth: number;
	readonly items: readonly ClinicalBundleItemTemplate[];
	readonly badgeColor: string;
}

function item(
	id: string,
	code804n: string,
	name: string,
	category: string,
	defaultPriceRub: number,
	materials: string,
	clinicalRationale: string,
	optional = false,
): ClinicalBundleItemTemplate {
	return {
		id,
		code804n,
		name,
		category,
		defaultPriceRub,
		defaultPriceKopecks: parseKopecks(defaultPriceRub),
		materials,
		clinicalRationale,
		optional,
		defaultSelected: true,
		hideInPatientPresentation: false,
	};
}

function bundle(def: {
	id: ClinicalBundleId;
	title: string;
	shortTitle: string;
	description: string;
	category: ClinicalBundleCategory;
	categoryLabel: string;
	categoryName: string;
	stageKind: TreatmentPlanStageKind;
	stageNumber: 1 | 2 | 3;
	totalPriceRub: number;
	requiresTooth: boolean;
	defaultTooth: number;
	badgeColor: string;
	items: readonly ClinicalBundleItemTemplate[];
}): ClinicalBundleDefinition {
	return {
		...def,
		totalPriceKopecks: parseKopecks(def.totalPriceRub),
		basePriceRub: def.totalPriceRub,
		basePriceKopecks: parseKopecks(def.totalPriceRub),
	};
}

/**
 * 10 эталонных клинических пакетов «под ключ» (Мандаты 8e, 8s)
 */
export const CLINICAL_BUNDLES: readonly ClinicalBundleDefinition[] = [
	bundle({
		id: "caries_turnkey",
		title: "Пакет: Лечение кариеса под ключ (анестезия + коффердам + пломба Estelite + шлифовка/полировка)",
		shortTitle: "Кариес под ключ",
		description: "Полный комплекс санации кариозной полости: анестезия, абсолютная изоляция поля раббердамом, реставрация нанокомпозитом Estelite Sigma Quick и зеркальная полировка.",
		category: "therapy",
		categoryLabel: "Терапия",
		categoryName: "Терапия",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 7500,
		requiresTooth: true,
		defaultTooth: 16,
		badgeColor: "emerald",
		items: [
			item("anesthesia", "A11.07.012", "Местная анестезия инфильтрационная / проводниковая (Ubistesin forte)", "Анестезия", 900, "Карпула Ubistesin forte 1:100 000, игла карпульная 30G", "Эффективное обезболивание при препарировании дентина", true),
			item("rubberdam", "A16.07.093", "Наложение коффердама (раббердама) для абсолютной изоляции рабочего поля", "Терапия", 1200, "Латексный платок Sanctuary, кламп Sanctuary #W8A, жидкий коффердам", "Защита от ротовой жидкости и аспирации адгезивного протокола", true),
			item("restoration", "A16.07.002.001", "Восстановление зуба пломбой (лечение кариеса нанокомпозитом Estelite)", "Терапия", 4800, "Светоотверждаемый нанокомпозит Tokuyama Estelite Sigma Quick, бонд Tokuyama Bond Force II", "Анатомическое восстановление бугров и фиссур по классу I/II"),
			item("polishing", "A16.07.025.001", "Шлифовка и полировка пломбы микроабразивными пастами и дисками", "Терапия", 600, "Полировочные диски Sof-Lex, паста Detartrine / Cleanic, силиконовые головки", "Создание эффекта сухого блеска и предотвращение ретенции зубного налета"),
		],
	}),

	bundle({
		id: "endo_1canal_turnkey",
		title: "Пакет: Эндодонтия 1-канального зуба под ключ (анестезия + мехобработка + гуттаперча + снимок)",
		shortTitle: "Эндодонтия 1 канал под ключ",
		description: "Полная терапия пульпита/периодонтита одноканального зуба: анестезия, коффердам, никель-титановая мехобработка ProTaper, 3D-обтурация гуттаперчей и рентген-контроль.",
		category: "therapy",
		categoryLabel: "Терапия",
		categoryName: "Эндодонтия",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 9100,
		requiresTooth: true,
		defaultTooth: 21,
		badgeColor: "indigo",
		items: [
			item("anesthesia", "A11.07.012", "Местная анестезия инфильтрационная (Ubistesin forte)", "Анестезия", 900, "Карпула Ubistesin forte 1:100 000, игла 30G", "Купирование болевого синдрома пульпы зуба", true),
			item("rubberdam", "A16.07.093", "Наложение коффердама (раббердама) при эндодонтическом лечении", "Терапия", 1200, "Платок Nic Tone, кламп Brinker, жидкий коффердам", "Асептический эндодонтический протокол изоляции от слюны", true),
			item("canal_prep", "A16.07.030.001", "Инструментальная и медикаментозная обработка 1 корневого канала машинным методом", "Эндодонтия", 3500, "Машинные NiTi-файлы ProTaper Gold, гипохлорит натрия 3%, ЭДТА гель 17%", "Стерилизация и конусное препарирование системы корневого канала"),
			item("gutta_obturation", "A16.07.008.001", "Пломбирование 1 корневого канала гуттаперчей методом латеральной/вертикальной конденсации", "Эндодонтия", 2900, "Гуттаперчевые штифты ProTaper, полимерный эпоксидный силер AH Plus", "Герметичная 3D-обтурация апикальной дельты корневого канала"),
			item("xray_control", "A06.07.003", "Прицельная внутриротовая контактная рентгенография (контрольный снимок обтурации)", "Диагностика", 600, "Цифровой радиовизиограф Carestream / Vatech", "Контроль плотности и границы обтурации канала до физиологического апекса", true),
		],
	}),

	bundle({
		id: "endo_3canal_turnkey",
		title: "Пакет: Эндодонтия 3-канального моляра под ключ (полная обтурация + снимок)",
		shortTitle: "Эндодонтия 3 канала моляр под ключ",
		description: "Комплексное первичное лечение корневых каналов многокорневого моляра: анестезия, коффердам, препарирование 3 каналов машинным файлом, 3D-обтурация и радиовизиография.",
		category: "therapy",
		categoryLabel: "Терапия",
		categoryName: "Эндодонтия",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 16200,
		requiresTooth: true,
		defaultTooth: 46,
		badgeColor: "indigo",
		items: [
			item("anesthesia", "A11.07.012", "Местная анестезия проводниковая / мандибулярная (Ubistesin forte)", "Анестезия", 900, "Карпула Ubistesin forte, длинная игла 27G", "Мандибулярная / торусальная анестезия нижнего моляра", true),
			item("rubberdam", "A16.07.093", "Наложение коффердама (раббердама) на моляр", "Терапия", 1200, "Платок Sanctuary Heavy, кламп W3 / #14A", "Строгий эндодонтический барьер и безопасность ирригации NaOCl", true),
			item("canal_prep_3", "A16.07.030.003", "Инструментальная и медикаментозная обработка 3 корневых каналов машинным методом", "Эндодонтия", 7500, "Набор ротационных файлов ProTaper Ultimate, NaOCl 3.25%, УЗ-активация EndoActivator", "Полная механическая и химическая очистка MB, ML и Distal каналов"),
			item("gutta_obturation_3", "A16.07.008.003", "Пломбирование / полная 3D-обтурация 3 корневых каналов моляра (гуттаперча + силер)", "Эндодонтия", 6000, "Термопластифицированная гуттаперча BeeFill, эпоксидный силер AH Plus", "Монолитная герметизация сложной анатомии 3 каналов"),
			item("xray_control", "A06.07.003", "Прицельная внутриротовая рентгенография (контрольный снимок обтурации 3 каналов)", "Диагностика", 600, "Цифровой радиовизиограф", "Визуализация качества обтурации всех корней до апикального сужения", true),
		],
	}),

	bundle({
		id: "hygiene_turnkey",
		title: "Пакет: Профгигиена полости рта под ключ (ультразвук + AirFlow + полировка + фторирование)",
		shortTitle: "Профгигиена под ключ",
		description: "Премиальный гигиенический SPA-протокол: бережный ультразвуковой скейлинг над- и поддесневых отложений, воздушно-абразивная полировка Air-Flow, финишная паста и фторлак.",
		category: "hygiene",
		categoryLabel: "Профгигиена",
		categoryName: "Гигиена",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 6500,
		requiresTooth: false,
		defaultTooth: 0,
		badgeColor: "cyan",
		items: [
			item("uz_scaling", "A16.07.020", "Ультразвуковое удаление наддесневых и поддесневых зубных отложений (скейлинг)", "Гигиена", 2500, "УЗ-насадки EMS Piezon Swiss Instruments, оптрагейт OptraGate", "Ликвидация минерализованного зубного камня со всех поверхностей"),
			item("airflow", "A16.07.050.001", "Воздушно-абразивная обработка зубов методом Air-Flow (удаление пигментированного налета)", "Гигиена", 2200, "Глициновый мелкодисперсный порошок Air-Flow Plus (14 мкм)", "Удаление налета курильщика, чая/кофе без повреждения эмали и десны"),
			item("polishing", "A16.07.025", "Полировка зубов профессиональными абразивными пастами и щетками", "Гигиена", 800, "Полировочная паста Cleanic с изменяемой абразивностью, нейлоновая щеточка", "Сглаживание микрошероховатостей эмали для профилактики повторного налета"),
			item("fluoridation", "A16.07.050.002", "Глубокое фторирование и реминерализирующая терапия эмали всех зубов", "Гигиена", 1000, "Фторлак Clinpro White Varnish 5% NaF (3M ESPE), аппликаторы", "Снятие гиперестезии и насыщение эмали фторапатитами"),
		],
	}),

	bundle({
		id: "extraction_turnkey",
		title: "Пакет: Удаление зуба простое под ключ (анестезия + удаление + кюретаж + гемостаз + альвожиль)",
		shortTitle: "Удаление зуба простое под ключ",
		description: "Атравматичное хирургическое удаление постоянного зуба с сохранением костной лунки: анестезия, элевация/люксация, тщательный кюретаж грануляций, местный гемостаз и паста Альвожиль.",
		category: "surgery",
		categoryLabel: "Хирургия",
		categoryName: "Хирургия",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 6800,
		requiresTooth: true,
		defaultTooth: 38,
		badgeColor: "rose",
		items: [
			item("anesthesia", "A11.07.012", "Местная анестезия проводниковая / инфильтрационная (Ultracain D-S forte)", "Анестезия", 900, "Карпула Ultracain D-S forte 1:100 000, игла 27G/30G", "Полная блокада периодонтальной чувствительности", true),
			item("simple_extraction", "A16.07.001.001", "Удаление зуба простое / атравматичное с сохранением кортикальной пластинки", "Хирургия", 3500, "Атравматичные периотомы и люксаторы Hu-Friedy", "Бережное извлечение корней без повреждения вестибулярной костной стенки"),
			item("curettage", "A16.07.039.001", "Кюретаж лунки удаленного зуба и механическое удаление грануляций", "Хирургия", 900, "Острая ложка Фолькмана, антисептический раствор хлоргексидина 0.05%", "Полная санация очага периапикальной инфекции в костной ткани"),
			item("hemostasis", "A16.07.095", "Остановка луночного кровотечения (первичный гемостаз, компрессия)", "Хирургия", 700, "Гемостатическая коллагеновая губка Альванес / Белкозин", "Формирование стабильного первичного кровяного сгустка"),
			item("alvogyl", "A16.07.095.001", "Внесение антисептической кровоостанавливающей пасты Альвожиль в лунку зуба", "Хирургия", 800, "Паста Alvogyl Septodont (эвгенол, йодоформ, волокна пенгхавара)", "Профилактика альвеолита, обезболивание и противовоспалительное действие"),
		],
	}),

	bundle({
		id: "complex_extraction",
		title: "Пакет: Сложное удаление зуба под ключ (анестезия + сепарация корней + кюретаж + швы Vicryl)",
		shortTitle: "Сложное удаление зуба под ключ",
		description: "Хирургическая операция сложного удаления: глубокая анестезия, разъединение корней турбинной фрезой Lindemann, атравматичный кюретаж и наложение рассасывающихся швов Vicryl.",
		category: "surgery",
		categoryLabel: "Хирургия",
		categoryName: "Хирургия",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 8500,
		requiresTooth: true,
		defaultTooth: 48,
		badgeColor: "rose",
		items: [
			item("anesthesia", "A11.07.012", "Местная анестезия проводниковая / инфильтрационная (Ultracain D-S forte)", "Анестезия", 900, "Карпула Ultracain D-S forte, длинная игла 27G", "Мандибулярная / торусальная блокада ветвей тройничного нерва", true),
			item("root_separation", "A16.07.001.003", "Разъединение корней и фрагментация зуба (сложное удаление)", "Хирургия", 5200, "Хирургический повышающий наконечник, твердосплавный бор Lindemann", "Сепарация фуркации корней для раздельного бережного извлечения"),
			item("deep_curettage", "A16.07.039.001", "Кюретаж лунки зуба и санация грануляционной ткани", "Хирургия", 1100, "Острая хирургическая ложка, антисептический лаваж", "Тщательное удаление гранулем и хронического периапикального очага"),
			item("vicryl_suturing", "A16.07.097", "Наложение швов Vicryl на слизистую оболочку полости рта", "Хирургия", 1300, "Рассасывающаяся плетеная полиглактиновая нить Vicryl 4-0 / 5-0 Ethicon", "Сближение краев десны, надежная фиксация сгустка и быстрое первичное натяжение"),
		],
	}),

	bundle({
		id: "implant_turnkey",
		title: "Пакет: Дентальная имплантация под ключ (имплантат + операция + анестезия + формирователь)",
		shortTitle: "Имплантация под ключ",
		description: "Первый хирургический этап дентальной имплантации: проводниковая анестезия, подготовка костного ложа, установка титанового имплантата Osstem/Dentium и формирователя десны.",
		category: "surgery",
		categoryLabel: "Хирургия",
		categoryName: "Имплантация",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 41500,
		requiresTooth: true,
		defaultTooth: 36,
		badgeColor: "amber",
		items: [
			item("anesthesia", "A11.07.012", "Местная анестезия проводниковая / инфильтрационная (Ubistesin forte)", "Анестезия", 900, "Карпула Ubistesin forte, хирургическая стерильная салфетка", "Глубокая анестезия надкостницы и костной ткани челюсти", true),
			item("implant_placement", "A16.07.054.001", "Внутрикостная дентальная имплантация системы Osstem TS-III / Dentium SuperLine (хирургический протокол)", "Хирургия", 35000, "Титановый дентальный имплантат SLA-поверхность, стерильный хирургический набор", "Восстановление утраченного корня зуба с фиксацией первичной стабильности >= 35 Н/см"),
			item("healing_abutment", "A16.07.054.002", "Установка титанового формирователя десны (гингивопластика десневого края)", "Хирургия", 5000, "Титановый формирователь десны Healing Abutment, шовный материал Prolene 5-0", "Создание анатомического контура прорезывания десны вокруг будущей коронки"),
			item("xray_control", "A06.07.003", "Рентгенологический контроль позиционирования имплантата в кости", "Диагностика", 600, "Цифровой радиовизиограф", "Контроль параллельности и расстояния до нижнечелюстного канала / верхнечелюстного синуса", true),
		],
	}),

	bundle({
		id: "crown_metalloceramic_turnkey",
		title: "Пакет: Металлокерамическая коронка под ключ (препарирование + слепок + коронка + фиксация)",
		shortTitle: "Металлокерамика под ключ",
		description: "Классическое ортопедическое протезирование: препарирование с круговым уступом, прецизионный двухслойный слепок А-силиконом, металлокерамика Vita/Duceram и постоянная цементировка.",
		category: "orthopedics",
		categoryLabel: "Ортопедия",
		categoryName: "Ортопедия",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 20000,
		requiresTooth: true,
		defaultTooth: 46,
		badgeColor: "teal",
		items: [
			item("preparation", "A16.07.004", "Препарирование зуба под металлокерамическую коронку с созданием уступа 135°", "Ортопедия", 3500, "Алмазные боры NTI, ретракционная нить Ultrapak #000, гемостатик ViscoStat", "Создание прецизионного зазора для края коронки без травмы круговой связки"),
			item("impression", "A02.07.010", "Снятие прецизионного двухслойного анатомического слепка А-силиконом", "Ортопедия", 2500, "А-силиконовая слепочная масса Elite HD+ (база + корригирующий слой), ложка металлическая", "Высокоточное отображение границ уступа и соседних зубов для ЗТЛ"),
			item("crown_fabrication", "A16.07.004.001", "Изготовление металлокерамической коронки с нанесением индивидуальной керамики (Duceram/Vita)", "Ортопедия", 12500, "КХС сплав (Co-Cr Wirobond C), фарфоровая масса Vita VM13", "Восстановление жевательной эффективности и анатомической формы коронки"),
			item("cementation", "A16.07.004.002", "Постоянная фиксация коронки на стеклоиономерный/полимерный цемент (Fuji I / RelyX Luting)", "Ортопедия", 1500, "Стеклоиономерный цемент GC Fuji I, полировочная головка", "Герметичная долговременная фиксация без микроподтеканий"),
		],
	}),

	bundle({
		id: "crown_zirconia_turnkey",
		title: "Пакет: Коронка ZrO2 (диоксид циркония) под ключ (скан/слепок + коронка + примерка + фиксация)",
		shortTitle: "Коронка ZrO2 под ключ",
		description: "Безметалловое протезирование высшего класса биосовместимости: цифровое 3D-сканирование, фрезерование многослойного диоксида циркония Katana/Prettau CAD/CAM, юстировка и адгезивная фиксация.",
		category: "orthopedics",
		categoryLabel: "Ортопедия",
		categoryName: "Ортопедия",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 30500,
		requiresTooth: true,
		defaultTooth: 16,
		badgeColor: "purple",
		items: [
			item("intraoral_scan", "A02.07.010.001", "Препарирование зуба и интраоральное цифровое 3D-сканирование (CAD/CAM 3Shape/Medit)", "Ортопедия", 4500, "Оптический 3D-сканер 3Shape TRIOS, скан-насадка, ретракционный гель", "Безошибочный цифровой оптический слепок без рвотного рефлекса у пациента"),
			item("crown_zirconia", "A16.07.004.003", "Изготовление анатомической коронки из многослойного диоксида циркония (Katana Multi-Layered / Prettau)", "Ортопедия", 22000, "Диоксид циркония ZrO2 Katana ML 1200 МПа, синтеризационные красители", "Максимальная прочность и естественный градиент прозрачности живого зуба"),
			item("try_in_adjustment", "A16.07.004.004", "Клиническая примерка, окклюзионная юстировка и полировка циркониевой коронки в прикусе", "Ортопедия", 1500, "Артикуляционная бумага Bausch 40 мкм, алмазные полиры для циркония Dialite", "Точная балансировка окклюзионных контактов и динамических движений челюсти"),
			item("adhesive_fixation", "A16.07.004.005", "Адгезивная постоянная фиксация циркониевой коронки на композитный цемент (RelyX Ultimate / Panavia V5)", "Ортопедия", 2500, "Композитный цемент RelyX Ultimate, циркониевый праймер Z-Prime Plus", "Химическая связь композита с диоксидом циркония и дентином зуба"),
		],
	}),

	bundle({
		id: "impression_asilicone_2jaws",
		title: "Пакет: Снятие двухслойных оттисков А-силиконом двух челюстей под ключ (база + коррекция в/ч и н/ч)",
		shortTitle: "Слепок А-силикон (2 челюсти)",
		description: "Прецизионный двухслойный анатомический оттиск верхней и нижней челюстей массой из А-силикона (базовый слой + корригирующий слой) для зуботехнической лаборатории.",
		category: "orthopedics",
		categoryLabel: "Ортопедия",
		categoryName: "Ортопедия",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 6000,
		requiresTooth: false,
		defaultTooth: 0,
		badgeColor: "purple",
		items: [
			item("base_upper", "A02.07.010", "Снятие оттиска с верхней челюсти массой из А-силикона (базовый слой)", "Ортопедия", 1800, "А-силикон Elite HD+ Putty Soft, жесткая металлическая перфорированная ложка", "Создание стабильного анатомического базиса оттиска зубного ряда в/ч"),
			item("correct_upper", "A02.07.010.001", "Снятие оттиска с верхней челюсти корригирующей массой из А-силикона", "Ортопедия", 1200, "Корригирующая масса низкой вязкости Elite HD+ Light Body, диспенсер", "Прецизионное отображение микрорельефа уступов и зубодесневой борозды в/ч"),
			item("base_lower", "A02.07.010", "Снятие оттиска с нижней челюсти массой из А-силикона (базовый слой)", "Ортопедия", 1800, "А-силикон Elite HD+ Putty Soft, нижнечелюстная ложка", "Создание стабильного анатомического базиса оттиска зубного ряда н/ч"),
			item("correct_lower", "A02.07.010.001", "Снятие оттиска с нижней челюсти корригирующей массой из А-силикона", "Ортопедия", 1200, "Корригирующая масса Elite HD+ Light Body", "Прецизионное отображение микрорельефа уступов и окклюзионных контактов н/ч"),
		],
	}),
];
