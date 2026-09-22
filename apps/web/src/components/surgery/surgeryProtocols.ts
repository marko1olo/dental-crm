/**
 * surgeryProtocols.ts — Хирургические протоколы, 1-клик нормы операций и мягкий овердрафт склада.
 * Стандарт: «Софт для врача, а не врач для софта. Любой барьер или лишний клик — это брак».
 */

export interface SurgicalService804n {
	readonly code: string;
	readonly nameRu: string;
	readonly name: string;
	readonly priceRub: number;
	readonly quantity: number;
	readonly suggestedPriceRub?: number | undefined;
	readonly toothNumber?: number | undefined;
	readonly stageKind?: string | undefined;
	readonly isPrimary?: boolean | undefined;
}

export interface SurgicalOperationNorm {
	readonly id: string;
	readonly title: string;
	readonly shortBadge: string;
	readonly category: "implant" | "extraction" | "perio_surgery" | "sinus_gbr" | "emergency";
	readonly icd10: string;
	readonly icd10Label: string;
	readonly code804n?: string;
	readonly code804nSubcode?: string;
	readonly service804nTitle?: string;
	readonly defaultToothFdi?: number;
	readonly standardProtocolTextRu: string;
	readonly anesthesiaDefaultRu: string;
	readonly postOpRecommendationsRu: string;
	readonly order804nServices?: readonly SurgicalService804n[];
	readonly requiredMaterials: readonly {
		readonly name: string;
		readonly unit: string;
		readonly quantity: number;
		readonly isWarehouseCritical: boolean;
	}[];
}

export interface SurgicalWarehouseOverdraftStatus {
	readonly hasOverdraft: boolean;
	readonly warningRu: string;
	readonly detailsRu: string;
	readonly pendingItems: readonly string[];
	readonly canProceed: true; // Всегда true: операция не блокируется!
}

/**
 * 1-клик каноническая норма дентальной имплантации (Mandate 8e СтАР, Номенклатура 804н A16.07.006).
 */
export const DENTAL_IMPLANTATION_NORM_TEXT =
	"Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл. Разрез по гребню альвеолярного отростка, отслоен слизисто-надкостничный лоскут. Препарирование ложа фрезами по хирургическому протоколу с охлаждением физраствором. Установлен дентальный имплантат, первичная торк-стабильность 35 Н·см. Установлен формирователь десны / винт-заглушка. Ушивание раны шовным материалом ПГА 4-0. Гемостаз полный. Рекомендации даны.";

/**
 * 1-клик каноническая норма простого удаления зуба (Номенклатура 804н A16.07.001).
 * Щипцы/элеватор, кюретаж лунки, гемостаз Альвожиль/коллагеновая губка.
 */
export const SIMPLE_EXTRACTION_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Круговая связка зуба отслоена гладилкой. Наложены щипцы / элеватор, продвинуты под десну, фиксированы. Люксация элеватором и ротация щипцами. Тракция зуба из альвеолы. Тщательный кюретаж лунки острой ложкой, ревизия, удаление грануляций. Антисептическая обработка 0.05% хлоргексидином. Местный гемостаз: в лунку внесен Альвожиль / гемостатическая губка. Давящий марлевый тампон. Гемостаз полный. Рекомендации даны.";

/**
 * 1-клик каноническая норма сложного / атипичного удаления ретинированного зуба мудрости (Номенклатура 804н A16.07.024).
 * Выкраивание лоскута, трепанация/сепарация бором Lindemann, ушивание раны.
 */
export const ATYPICAL_EXTRACTION_NORM_TEXT =
	"Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Разрез слизистой в ретромолярной области, выкраивание слизисто-надкостничного лоскута. Трепанация кортикальной пластинки, сепарация коронки и корней твердосплавным бором Lindemann с охлаждением физраствором. Атравматичная люксация и извлечение фрагментов элеватором. Тщательный кюретаж лунки, ревизия, удаление грануляций. Лунка заполнена гемостатической коллагеновой губкой Альвожиль. Рана ушита узловыми швами ПГА / Викрил 4-0 (ушивание раны). Гемостаз полный. Рекомендации даны.";

/**
 * 1-клик норма синус-лифтинга и направленной костной регенерации (НКР) (Номенклатура 804н A16.07.041).
 */
export const SINUS_LIFT_GBR_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Трапециевидный разрез в боковом отделе верхней челюсти, скелетирование передне-боковой стенки верхнечелюстного синуса. Формирование латерального окна пьезотомом. Элевация мембраны Шнайдера без перфорации. Субантральное пространство заполнено ксенографтом. Барьерная мембрана фиксирована пинами. Послойное ушивание ПГА 4-0. Гемостаз полный. Рекомендации даны.";

/**
 * 1-клик норма иссечения капюшона / перикоронит (Номенклатура 804н A16.07.058).
 */
export const PERICORONITIS_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Иссечение воспаленного слизистого капюшона над коронкой ретинированного зуба скальпелем. Промывание антисептиками (хлоргексидин 0.05%), йодоформная турунда. Гемостаз полный. Рекомендации даны.";

/**
 * 1-клик каноническая норма сложного удаления зуба / корня с разъединением корней и ушиванием (Номенклатура 804н A16.07.002).
 * Сепарация бором Lindemann, атравматичная люксация элеватором, шов Викрил 4-0.
 */
export const COMPLEX_EXTRACTION_NORM_TEXT =
	"Инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Разрез слизистой оболочки, отслаивание слизисто-надкостничного лоскута. Сепарация корней бором с водяным охлаждением (хирургический бор Lindemann). Люксация элеватором (атравматичная люксация), атравматичная тракция фрагментов корней щипцами. Тщательный кюретаж лунки острой ложкой, удаление грануляций. Антисептическая обработка 0.05% хлоргексидином. Местный гемостаз губкой Альвожил. Сближение краев лунки, наложение швов (швы Викрил 4-0). Давящий марлевый тампон. Гемостаз полный. Рекомендации даны.";

/**
 * 1-клик каноническая норма периостотомии с дренированием при остром гнойном периостите (Номенклатура 804н A16.07.011).
 * Разрез по переходной складке, эвакуация гноя, дренаж выпускник.
 */
export const PERIOSTOTOMY_NORM_TEXT =
	"Инфильтрационная анестезия по переходной складке Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез слизистой и надкостницы длиной 1.5–2 см по переходной складке в области проекции верхушки причинного зуба до кости. Отслоение надкостницы распатором, эвакуация гнойного экссудата. Антисептическая обработка 0.05% хлоргексидином. Введение резинового ленточного дренажа-выпускника для постоянного дренирования раны. Гемостаз стерильными марлевыми салфетками. Рекомендации даны, явка на следующий день.";

/**
 * 1-клик каноническая норма резекции верхушки корня (апикоэктомия с ретроградным пломбированием) (Номенклатура 804н A16.07.007).
 */
export const APICOECTOMY_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Трапециевидный разрез слизистой в проекции верхушки причинного зуба, отслоен слизисто-надкостничный лоскут. Трепанация кортикальной пластинки шаровидным бором с водяным охлаждением. Резекция верхушки корня на 3 мм под углом 90° твердосплавным фиссурным бором. Цистэктомия/кюретаж периапикального очага. Ультразвуковое ретроградное препарирование апикальной части канала насадкой КСТ на глубину 3 мм. Ретроградное пломбирование МТА (ProRoot / Biodentine). Контроль гемостаза. Ушивание раны узловыми швами ПГА / Монофиламент 5-0. Контрольная радиовизиография: резекция выполнена, ретроградная пломба герметична. Рекомендации даны.";

export interface StandardImplantationParams {
	readonly toothFdi?: number;
	readonly brand?: string;
	readonly model?: string;
	readonly diameterMm?: number;
	readonly lengthMm?: number;
	readonly torqueNcm?: number;
	readonly isq?: number;
	readonly capType?: "fdm" | "plug";
	readonly sutureMaterial?: string;
	readonly postOpXray?: boolean;
}

/**
 * Генерация 1-клик канонического протокола дентальной имплантации (Mandates 8e, 8k СтАР).
 */
export function buildStandardImplantationProtocolText(
	params: StandardImplantationParams = {},
): string {
	const toothStr = params.toothFdi ? `зуба FDI #${params.toothFdi}` : "имплантации";
	const brand = params.brand || "Dentium";
	const model = params.model ? ` ${params.model}` : "";
	const dia = params.diameterMm ?? 4.0;
	const len = params.lengthMm ?? 10.0;
	const torque = params.torqueNcm ?? 35;
	const isq = params.isq ?? 72;
	const capStr =
		params.capType === "plug"
			? "Установлен винт-заглушка (двухэтапный протокол с ушиванием наглухо)."
			: "Установлен формирователь десны (ФДМ).";
	const suture = params.sutureMaterial || "Prolene 4-0";
	const xrayStr =
		params.postOpXray !== false
			? " Выполнен контрольный прицельный радиовизиографический снимок: положение имплантата правильное, субкрестально 0.5 мм, без повреждения смежных анатомических структур."
			: "";

	return (
		`Инфильтрационная анестезия Артикаин 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка в области ${toothStr}, отслоен слизисто-надкостничный лоскут. ` +
		`Препарирование ложа фрезами по хирургическому протоколу ${brand} с обильным охлаждением стерильным 0.9% NaCl (800 об/мин). ` +
		`Установлен дентальный имплантат ${brand}${model} Ø ${dia} × ${len} мм. ` +
		`Первичная торк-стабильность ${torque} Н·см, RFA стабильность ISQ ${isq} (высокая первичная фиксация). ` +
		`${capStr} ` +
		`Мобилизация лоскута, наложены узловые швы ${suture} без натяжения. Гемостаз полный.${xrayStr} ` +
		`Назначена антибактериальная и противовоспалительная терапия, рекомендации выданы.`
	);
}

/**
 * Реестр 1-клик хирургических норм для хирурга-имплантолога.
 */
export const SURGICAL_OPERATION_NORMS: readonly SurgicalOperationNorm[] = [
	{
		id: "surgery_implant_standard",
		title: "Дентальная имплантация (1-клик норма)",
		shortBadge: "Имплантация 35 Н·см",
		category: "implant",
		icd10: "K08.1",
		icd10Label: "Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		code804n: "A16.07.054",
		service804nTitle: "Внутрикостная дентальная имплантация",
		defaultToothFdi: 46,
		standardProtocolTextRu: DENTAL_IMPLANTATION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл",
		postOpRecommendationsRu:
			"Холод на область операции 15 мин каждые 2 часа в первый день. Ванночки с 0.05% хлоргексидином с 2-х суток. Исключить горячее, бани, физ. нагрузки 7 дней. Прием НПВП и антибиотикотерапия по назначению. Осмотр через 7 дней.",
		order804nServices: [
			{
				code: "A16.07.054",
				nameRu: "Внутрикостная дентальная имплантация (установка имплантата)",
				name: "Внутрикостная дентальная имплантация (установка имплантата)",
				priceRub: 35000,
				quantity: 1,
				suggestedPriceRub: 35000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.054.002",
				nameRu: "Установка формирователя десны (ФДМ) / винта-заглушки",
				name: "Установка формирователя десны (ФДМ) / винта-заглушки",
				priceRub: 3500,
				quantity: 1,
				suggestedPriceRub: 3500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Дентальный имплантат титановый", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Формирователь десны / винт-заглушка", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал рассасывающийся ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_simple",
		title: "Простое удаление зуба (1-клик норма)",
		shortBadge: "Удаление простое",
		category: "extraction",
		icd10: "K08.8",
		icd10Label: "Другие уточненные изменения зубов и их опорного аппарата",
		code804n: "A16.07.001",
		code804nSubcode: "A16.07.001.001",
		service804nTitle: "Удаление зуба (простое)",
		defaultToothFdi: 36,
		standardProtocolTextRu: SIMPLE_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Марлевый тампон сплюнуть через 20 минут. Не полоскать рот 24 часа. Не принимать горячую ванну и острую пищу 3 дня. При болях — Нимесил 1 пак.",
		order804nServices: [
			{
				code: "A16.07.001",
				nameRu: "Удаление постоянного зуба (простое)",
				name: "Удаление постоянного зуба (простое)",
				priceRub: 3500,
				quantity: 1,
				suggestedPriceRub: 3500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.026",
				nameRu: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
				name: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
				priceRub: 1200,
				quantity: 1,
				suggestedPriceRub: 1200,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Губка гемостатическая Альвожиль / коллагеновая", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "Марлевые тампоны стерильные", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_atypical",
		title: "Сложное удаление ретинированного зуба мудрости",
		shortBadge: "Удаление 8-ки (сложное)",
		category: "extraction",
		icd10: "K01.1",
		icd10Label: "Ретинированные зубы",
		code804n: "A16.07.024",
		code804nSubcode: "A16.07.001.003",
		service804nTitle: "Операция удаления ретинированного, дистопированного или сверхкомплектного зуба",
		defaultToothFdi: 48,
		standardProtocolTextRu: ATYPICAL_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% — 3.4 мл",
		postOpRecommendationsRu:
			"Холод на щеку локально. Щадящая диета. Антибиотикотерапия (Амоксиклав 625 мг 2 р/сут 5 дней). Швы снять через 7-10 суток.",
		order804nServices: [
			{
				code: "A16.07.024",
				nameRu: "Операция удаления ретинированного, дистопированного зуба (сложное)",
				name: "Операция удаления ретинированного, дистопированного зуба (сложное)",
				priceRub: 9500,
				quantity: 1,
				suggestedPriceRub: 9500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.026",
				nameRu: "Кюретаж лунки удаленного зуба с антисептической обработкой",
				name: "Кюретаж лунки удаленного зуба с антисептической обработкой",
				priceRub: 1200,
				quantity: 1,
				suggestedPriceRub: 1200,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА/Викрил 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА/Викрил 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Проводниковая (торусальная) анестезия (Артикаин)",
				name: "Проводниковая (торусальная) анестезия (Артикаин)",
				priceRub: 1200,
				quantity: 1,
				suggestedPriceRub: 1200,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Шовный материал ПГА 4-0 с атравматической иглой", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Бор твердосплавный хирургический Lindemann", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая коллагеновая", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 2, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_sinus_lift_gbr",
		title: "Открытый синус-лифтинг & Костная пластика",
		shortBadge: "Синус-лифтинг / НКР",
		category: "sinus_gbr",
		icd10: "K08.2",
		icd10Label: "Атрофия беззубого альвеолярного края",
		code804n: "A16.07.041",
		service804nTitle: "Костная пластика челюстно-лицевой области (синус-лифтинг)",
		defaultToothFdi: 16,
		standardProtocolTextRu: SINUS_LIFT_GBR_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Сосудосуживающие капли в нос 5 дней. Не чихать с закрытым ртом, не летать на самолете 14 дней. Антибиотики по схеме.",
		order804nServices: [
			{
				code: "A16.07.041",
				nameRu: "Костная пластика челюстно-лицевой области (синус-лифтинг латеральный)",
				name: "Костная пластика челюстно-лицевой области (синус-лифтинг латеральный)",
				priceRub: 35000,
				quantity: 1,
				suggestedPriceRub: 35000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.041.001",
				nameRu: "Внесение остеопластического материала (ксенографт) и фиксация мембраны",
				name: "Внесение остеопластического материала (ксенографт) и фиксация мембраны",
				priceRub: 18000,
				quantity: 1,
				suggestedPriceRub: 18000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Остеопластический материал ксенографт 0.5 г", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Мембрана коллагеновая резорбируемая 25x25 мм", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Пины титановые фиксирующие", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_pericoronitis",
		title: "Иссечение капюшона (Перикоронит)",
		shortBadge: "Перикоронит",
		category: "perio_surgery",
		icd10: "K05.2",
		icd10Label: "Острый пародонтит / Перикоронит",
		code804n: "A16.07.058",
		service804nTitle: "Иссечение десневого капюшона (перикоронаротомия)",
		defaultToothFdi: 48,
		standardProtocolTextRu: PERICORONITIS_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Ротовые ванночки с ромашкой и хлоргексидином 0.05% 3-4 раза в день. Метрогил Дента локально.",
		order804nServices: [
			{
				code: "A16.07.058",
				nameRu: "Иссечение десневого капюшона (перикоронаротомия)",
				name: "Иссечение десневого капюшона (перикоронаротомия)",
				priceRub: 2500,
				quantity: 1,
				suggestedPriceRub: 2500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Лента йодоформная турунда", unit: "см", quantity: 5, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_complex",
		title: "Сложное удаление зуба с разъединением корней и ушиванием",
		shortBadge: "Сложн. удаление",
		category: "extraction",
		icd10: "K04.7",
		icd10Label: "Периапикальный абсцесс без свища / Дистопия",
		code804n: "A16.07.002",
		code804nSubcode: "A16.07.001.002",
		service804nTitle: "Удаление зуба сложное с разъединением корней",
		defaultToothFdi: 47,
		standardProtocolTextRu: COMPLEX_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл",
		postOpRecommendationsRu:
			"Холод на щеку локально 15 мин 3-4 раза в первые сутки. Не полоскать, не греть, не пить через трубочку. Прием НПВП (Нимесил) при боли. Осмотр через 3 дня, снятие швов через 7-10 дней.",
		order804nServices: [
			{
				code: "A16.07.002",
				nameRu: "Удаление зуба сложное с разъединением корней и фрагментацией",
				name: "Удаление зуба сложное с разъединением корней и фрагментацией",
				priceRub: 6000,
				quantity: 1,
				suggestedPriceRub: 6000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.026",
				nameRu: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
				name: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
				priceRub: 1200,
				quantity: 1,
				suggestedPriceRub: 1200,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (Викрил 4-0)",
				name: "Наложение шва на слизистую оболочку рта (Викрил 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Проводниковая / инфильтрационная анестезия (Артикаин)",
				name: "Проводниковая / инфильтрационная анестезия (Артикаин)",
				priceRub: 1200,
				quantity: 1,
				suggestedPriceRub: 1200,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Артикаин 1:100000", unit: "шт.", quantity: 2, isWarehouseCritical: false },
			{ name: "Шовный материал Викрил 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка Альвожил", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Марлевые тампоны", unit: "шт.", quantity: 2, isWarehouseCritical: false },
			{ name: "Бор твердосплавный хирургический Lindemann", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_periostotomy",
		title: "Вскрытие поднадкостничного очага воспаления (периостотомия) с дренированием",
		shortBadge: "Периостотомия",
		category: "emergency",
		icd10: "K10.2",
		icd10Label: "Воспалительные заболевания челюстей (острый гнойный периостит)",
		code804n: "A16.07.011",
		service804nTitle: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		defaultToothFdi: 46,
		standardProtocolTextRu: PERIOSTOTOMY_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия по переходной складке Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Холод на область отека локально 15 мин 3-4 раза. Не греть щеку компрессами! Ротовые ванночки с 0.05% хлоргексидином 4-5 раз в день. Дренаж самостоятельно не извлекать! Антибиотикотерапия и НПВП по схеме. Обязательная явка на перевязку и осмотр на следующий день.",
		order804nServices: [
			{
				code: "A16.07.011",
				nameRu: "Вскрытие поднадкостничного очага воспаления (периостотомия) с дренированием",
				name: "Вскрытие поднадкостничного очага воспаления (периостотомия) с дренированием",
				priceRub: 2100,
				quantity: 1,
				suggestedPriceRub: 2100,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия по переходной складке",
				name: "Инфильтрационная анестезия по переходной складке",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Артикаин 1:100000", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Дренаж резиновый ленточный", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Хлоргексидин 0.05%", unit: "мл", quantity: 50, isWarehouseCritical: false },
			{ name: "Стерильные марлевые салфетки", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_apicoectomy",
		title: "Резекция верхушки корня (апикоэктомия с ретроградным пломбированием)",
		shortBadge: "Резекция корня",
		category: "perio_surgery",
		icd10: "K04.5",
		icd10Label: "Хронический апикальный периодонтит / Апикальная гранулема",
		code804n: "A16.07.007",
		service804nTitle: "Резекция верхушки корня",
		defaultToothFdi: 21,
		standardProtocolTextRu: APICOECTOMY_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Холод локально 15 мин 3-4 раза в первые сутки. Щадящая диета 3-5 дней. Ротовые ванночки 0.05% хлоргексидином со 2-х суток. Осмотр через 3 дня, снятие швов через 7-10 дней.",
		order804nServices: [
			{
				code: "A16.07.007",
				nameRu: "Резекция верхушки корня с ретроградным пломбированием МТА",
				name: "Резекция верхушки корня с ретроградным пломбированием МТА",
				priceRub: 8500,
				quantity: 1,
				suggestedPriceRub: 8500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 5-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 5-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "МТА материал для ретроградного пломбирования", unit: "доз.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал ПГА 5-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
];

export const CANONICAL_SURGICAL_OPERATION_NORMS = SURGICAL_OPERATION_NORMS;

/**
 * Проверка мягкого овердрафта склада (Мандат 8e):
 * Если накладная поставщика задерживается (включая шовный материал или гемостатическую губку),
 * врач НИКОГДА не блокируется. Система фиксирует статус мягкого овердрафта (canProceed: true)
 * и формирует предупреждение старшей медсестре для оприходования без остановки приёма.
 */
export function evaluateWarehouseOverdraft(
	materials: readonly { name: string; isWarehouseCritical?: boolean }[],
	forceWarehouseDelay = false,
	specificDelayedItems?: readonly string[],
): SurgicalWarehouseOverdraftStatus {
	const pending =
		specificDelayedItems && specificDelayedItems.length > 0
			? [...specificDelayedItems]
			: forceWarehouseDelay
				? materials.map((m) => m.name)
				: [];

	if (pending.length > 0) {
		return {
			hasOverdraft: true,
			warningRu: "Задержка оприходования накладной склада",
			detailsRu:
				`Компоненты (${pending.join(", ")}) ещё не проведены во входящей накладной. ` +
				"Операция не блокируется: списание зафиксировано в мягкий овердрафт с уведомлением старшей медсестры.",
			pendingItems: pending,
			canProceed: true,
		};
	}

	return {
		hasOverdraft: false,
		warningRu: "Складской учет в норме",
		detailsRu: "Все компоненты и стерильные расходники списаны штатно со склада кабинета.",
		pendingItems: [],
		canProceed: true,
	};
}

export interface SurgicalMaterialDeductionResult {
	readonly success: boolean;
	readonly isOverdraft: boolean;
	readonly deductedItems: readonly {
		readonly name: string;
		readonly unit: string;
		readonly quantity: number;
		readonly isOverdraft: boolean;
	}[];
	readonly messageRu: string;
}

/**
 * 1-клик списание хирургических материалов со склада с гарантированным мягким овердрафтом (Мандат 8e).
 * Задержка оприходования накладной поставщика не блокирует врача и операцию.
 */
export function quickDeductSurgicalMaterials(params: {
	materials: readonly { name: string; unit: string; quantity: number; isWarehouseCritical?: boolean }[];
	hasWarehouseDelay?: boolean;
	operationTitle?: string;
}): SurgicalMaterialDeductionResult {
	const isOverdraft = Boolean(params.hasWarehouseDelay);
	const deductedItems = params.materials.map((m) => ({
		name: m.name,
		unit: m.unit,
		quantity: m.quantity,
		isOverdraft,
	}));

	const messageRu = isOverdraft
		? `Списано ${params.materials.length} поз. под операцию «${params.operationTitle || "Хирургическое вмешательство"}» в мягкий овердрафт склада (Мандат 8e: без комиссии и блокировки врача).`
		: `Материалы операции «${params.operationTitle || "Хирургическое вмешательство"}» (${params.materials.length} поз.) успешно списаны со склада в 1 клик.`;

	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-quick-writeoff-surgical-materials", {
					detail: {
						materials: deductedItems,
						isOverdraft,
						operationTitle: params.operationTitle,
						timestamp: new Date().toISOString(),
					},
				}),
			);
		}
	} catch {
		// fallback
	}

	return {
		success: true,
		isOverdraft,
		deductedItems,
		messageRu,
	};
}

/**
 * Генерация полного хирургического дневника для Формы 043/у.
 */
export function buildSurgicalDiaryEntry(params: {
	patientName?: string;
	patientId?: string;
	doctorName?: string;
	toothFdi?: number;
	protocolText: string;
	recommendations?: string;
	implantDetails?: {
		brand: string;
		diameterMm: number;
		lengthMm: number;
		torqueNcm: number;
		lot?: string;
	};
}): string {
	const toothStr = params.toothFdi ? `Зуб FDI #${params.toothFdi}` : "Область вмешательства";
	const nowStr = new Date().toLocaleDateString("ru-RU");

	let implantBlock = "";
	if (params.implantDetails) {
		implantBlock =
			`\nСПЕЦИФИКАЦИЯ ИМПЛАНТАТА:\n` +
			`Система: ${params.implantDetails.brand} Ø ${params.implantDetails.diameterMm} x ${params.implantDetails.lengthMm} мм\n` +
			`Торк первичной стабильности: ${params.implantDetails.torqueNcm} Н·см\n` +
			(params.implantDetails.lot ? `LOT / Партия: ${params.implantDetails.lot}\n` : "");
	}

	const recoBlock = params.recommendations
		? `\nНАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:\n${params.recommendations}`
		: "";

	return (
		`ХИРУРГИЧЕСКИЙ ПРОТОКОЛ ОПЕРАЦИИ (${toothStr})\n` +
		`Дата: ${nowStr} · Врач: ${params.doctorName || "Хирург"}\n\n` +
		`ХОД ОПЕРАЦИИ:\n` +
		`${params.protocolText.trim()}\n` +
		implantBlock +
		recoBlock
	);
}

/**
 * Получение перечня услуг Номенклатуры 804н для хирургической нормы.
 */
export function getSurgicalServices804n(
	norm: SurgicalOperationNorm,
	toothFdi?: number,
): readonly SurgicalService804n[] {
	const effectiveTooth = toothFdi ?? norm.defaultToothFdi;
	if (norm.order804nServices && norm.order804nServices.length > 0) {
		return norm.order804nServices.map((s) => ({
			...s,
			toothNumber: effectiveTooth,
		}));
	}

	if (norm.code804n) {
		return [
			{
				code: norm.code804n,
				nameRu: norm.service804nTitle || norm.title,
				name: norm.service804nTitle || norm.title,
				priceRub: 3500,
				quantity: 1,
				suggestedPriceRub: 3500,
				toothNumber: effectiveTooth,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
		];
	}

	return [];
}

/**
 * Диспатч услуг хирургического протокола в активный счёт/смету визита
 * через глобальную шину CustomEvent `dente-add-services-to-invoice` (Мандаты 8e, 8i, 8k, 8n).
 */
export function dispatchSurgicalServicesToInvoice(params: {
	norm: SurgicalOperationNorm;
	toothFdi?: number | undefined;
	customServices?: readonly SurgicalService804n[] | undefined;
	onAddToInvoice?: ((services: readonly SurgicalService804n[]) => void) | undefined;
}): readonly SurgicalService804n[] {
	const effectiveTooth = params.toothFdi ?? params.norm.defaultToothFdi;
	const services =
		params.customServices && params.customServices.length > 0
			? params.customServices.map((s) => ({ ...s, toothNumber: s.toothNumber ?? effectiveTooth }))
			: getSurgicalServices804n(params.norm, effectiveTooth);

	if (params.onAddToInvoice) {
		try {
			params.onAddToInvoice(services);
		} catch (err) {
			console.warn("onAddToInvoice callback error:", err);
		}
	}

	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: effectiveTooth,
						teethNumbers: effectiveTooth ? [effectiveTooth] : [],
						services,
					},
				}),
			);
		}
	} catch (err) {
		console.warn("dente-add-services-to-invoice dispatch error:", err);
	}

	return services;
}

/**
 * Номенклатура 804н — Канонические коды хирургической экстракции зубов (Мандат 8e).
 */
export const EXTRACTION_804N_CODES = {
	SIMPLE: "A16.07.001.001", // Удаление постоянного зуба простое
	COMPLEX_SEPARATION: "A16.07.001.002", // Удаление зуба сложное с разъединением корней
	IMPACTED_DYSTOPIC: "A16.07.001.003", // Операция удаления ретинированного / дистопированного зуба
	CURETTAGE: "A16.07.026", // Кюретаж лунки удаленного зуба
	SUTURE_VICRYL: "A16.07.097", // Наложение шва на слизистую оболочку рта (Викрил 4-0)
	ANESTHESIA_INFILTRATION: "A11.07.015", // Инфильтрационная анестезия
	ANESTHESIA_CONDUCTION: "A11.07.016", // Проводниковая (торусальная) анестезия
} as const;

export type ExtractionComplexity = "simple" | "complex" | "impacted_dystopic";
export type SurgicalHemostasisMethod = "alvogyl" | "hemostatic_sponge" | "vicryl_suture" | "tampon";

export interface SurgicalHemostasisOption {
	readonly id: SurgicalHemostasisMethod;
	readonly nameRu: string;
	readonly shortBadge: string;
	readonly descriptionRu: string;
}

/**
 * Варианты гемостаза лунки удаленного зуба в 1 клик (Мандат 8e).
 */
export const SURGICAL_HEMOSTASIS_OPTIONS: readonly SurgicalHemostasisOption[] = [
	{
		id: "alvogyl",
		nameRu: "Альвожил (паста/губка)",
		shortBadge: "Альвожил",
		descriptionRu: "Антисептический обезболивающий компресс с йодоформом в лунку",
	},
	{
		id: "hemostatic_sponge",
		nameRu: "Гемостатическая коллагеновая губка",
		shortBadge: "Губка",
		descriptionRu: "Рассасывающаяся коллагеновая губка для надежного тромбообразования",
	},
	{
		id: "vicryl_suture",
		nameRu: "Шов Викрил 4-0 (ушивание)",
		shortBadge: "Викрил 4-0",
		descriptionRu: "Сближение краев лунки узловыми рассасывающимися швами",
	},
	{
		id: "tampon",
		nameRu: "Давящий марлевый тампон 20 мин",
		shortBadge: "Тампон 20 мин",
		descriptionRu: "Марлевый гемостатический тампон для компрессии лунки",
	},
];

export interface ExtractionComplexityOption {
	readonly id: ExtractionComplexity;
	readonly code804n: string;
	readonly labelRu: string;
	readonly badge: string;
	readonly normId: string;
	readonly defaultPriceRub: number;
}

/**
 * Степени сложности экстракции зуба в 1 клик по номенклатуре 804н (Мандат 8e).
 */
export const EXTRACTION_COMPLEXITY_OPTIONS: readonly ExtractionComplexityOption[] = [
	{
		id: "simple",
		code804n: EXTRACTION_804N_CODES.SIMPLE,
		labelRu: "Простое удаление постоянного зуба (щипцы / элеватор)",
		badge: "Простое (A16.07.001.001)",
		normId: "surgery_extraction_simple",
		defaultPriceRub: 3500,
	},
	{
		id: "complex",
		code804n: EXTRACTION_804N_CODES.COMPLEX_SEPARATION,
		labelRu: "Сложное удаление с разъединением корней бором Lindemann",
		badge: "Сложное (A16.07.001.002)",
		normId: "surgery_extraction_complex",
		defaultPriceRub: 6000,
	},
	{
		id: "impacted_dystopic",
		code804n: EXTRACTION_804N_CODES.IMPACTED_DYSTOPIC,
		labelRu: "Удаление ретинированного / дистопированного зуба с лоскутом",
		badge: "Ретинированный (A16.07.001.003)",
		normId: "surgery_extraction_atypical",
		defaultPriceRub: 9500,
	},
];

export interface StandardExtractionParams {
	readonly toothFdi?: number | undefined;
	readonly complexity?: ExtractionComplexity | undefined;
	readonly hemostasis?: readonly SurgicalHemostasisMethod[] | undefined;
	readonly sutureMaterial?: string | undefined;
	readonly anesthesia?: string | undefined;
	readonly postOpXray?: boolean | undefined;
}

/**
 * 1-клик генератор протокола операции экстракции зуба (Мандаты 8e, 8k, 8i).
 * Поддерживает простое, сложное с разъединением корней и атипичное удаление
 * с 1-клик выбором гемостаза (Альвожил, гемостатическая губка, шов Викрил 4-0).
 */
export function buildStandardExtractionProtocolText(
	params: StandardExtractionParams = {},
): string {
	const toothStr = params.toothFdi ? `зуба FDI #${params.toothFdi}` : "зуба";
	const complexity = params.complexity ?? "simple";
	const hemo = params.hemostasis ?? ["alvogyl", "tampon"];
	const suture = params.sutureMaterial || "Викрил 4-0";

	const hemoParts: string[] = [];
	if (hemo.includes("alvogyl")) {
		hemoParts.push("в лунку внесен антисептический компресс Альвожил");
	}
	if (hemo.includes("hemostatic_sponge")) {
		hemoParts.push("лунка заполнена рассасывающейся гемостатической коллагеновой губкой");
	}
	if (hemo.includes("vicryl_suture") || complexity === "complex" || complexity === "impacted_dystopic") {
		hemoParts.push(`края раны сближены, наложены узловые швы (${suture})`);
	}
	if (hemo.includes("tampon")) {
		hemoParts.push("наложен давящий марлевый тампон на 20 минут");
	}
	const hemostasisText =
		hemoParts.length > 0
			? `Местный гемостаз: ${hemoParts.join(", ")}.`
			: "Местный гемостаз: в лунку внесен Альвожил, наложен давящий марлевый тампон.";

	const xrayText =
		params.postOpXray
			? " Выполнен контрольный радиовизиографический снимок: остатков корней и инородных тел в лунке нет."
			: "";

	if (complexity === "complex") {
		const anesth =
			params.anesthesia ||
			"Инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл.";
		return (
			`${anesth} Разрез слизистой оболочки в области ${toothStr}, отслаивание слизисто-надкостничного лоскута. ` +
			`Сепарация корней твердосплавным бором Lindemann с водяным охлаждением физраствором. ` +
			`Атравматичная люксация фрагментов корней элеватором, удаление корней щипцами. ` +
			`Тщательный кюретаж лунки острой ложкой, удаление грануляций, ревизия костных стенок. ` +
			`Антисептическая обработка 0.05% раствором хлоргексидина. ` +
			`${hemostasisText} Гемостаз полный.${xrayText} Рекомендации даны.`
		);
	}

	if (complexity === "impacted_dystopic") {
		const anesth =
			params.anesthesia ||
			"Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл.";
		return (
			`${anesth} Разрез слизистой оболочки в проекции ретинированного ${toothStr}, выкраивание слизисто-надкостничного лоскута. ` +
			`Трепанация кортикальной пластинки, сепарация коронки и корней бором Lindemann с водяным охлаждением. ` +
			`Атравматичная люксация элеватором и извлечение фрагментов. Тщательный кюретаж лунки острой ложкой, удаление грануляций. ` +
			`Антисептическая обработка 0.05% хлоргексидином. ` +
			`${hemostasisText} Гемостаз полный.${xrayText} Рекомендации даны.`
		);
	}

	// Simple extraction
	const anesth =
		params.anesthesia ||
		"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл.";
	return (
		`${anesth} Круговая связка ${toothStr} отслоена гладилкой. ` +
		`Наложены щипцы / элеватор, продвинуты под десну, фиксированы. Люксация элеватором и ротация щипцами. ` +
		`Тракция зуба из альвеолы. Тщательный кюретаж лунки острой ложкой, ревизия костных стенок, удаление грануляций. ` +
		`Антисептическая обработка 0.05% хлоргексидином. ` +
		`${hemostasisText} Гемостаз полный.${xrayText} Рекомендации даны.`
	);
}

export interface PostExtractionMemoParams {
	readonly patientName?: string | undefined;
	readonly toothFdi?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly complexity?: ExtractionComplexity | undefined;
	readonly hasSutures?: boolean | undefined;
	readonly sutureRemovalDays?: number | undefined;
	readonly clinicPhone?: string | undefined;
}

/**
 * 1-клик формирование памятки пациенту после удаления для мессенджеров WhatsApp / Telegram
 * (Мандаты 8k, 8e, 8d). Строгий полиграфический вид БЕЗ мультяшных эмодзи.
 * Включает канонические клинические пункты:
 * «Холод 15 мин, не греть, не полоскать, марлевый тампон сплюнуть через 20 мин».
 */
export function buildPostExtractionMemoText(params: PostExtractionMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (зуб #${params.toothFdi})` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	const docStr = params.doctorName ? `\nЛечащий врач: ${params.doctorName}` : "";
	const phoneStr = params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "";
	const suturesStr =
		params.hasSutures || params.complexity === "complex" || params.complexity === "impacted_dystopic"
			? `\n7. ШВЫ: Наложены швы. Снятие швов через ${params.sutureRemovalDays ?? "7-10"} дней. Не трогать швы языком и зубочистками.`
			: "";

	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ УДАЛЕНИЯ ЗУБА${toothStr}\n\n` +
		`Для благополучного заживления лунки строго соблюдайте следующие правила:\n\n` +
		`1. МАРЛЕВЫЙ ТАМПОН: Сплюнуть через 20 минут после окончания операции.\n` +
		`2. ХОЛОД: Прикладывать сухой холод к щеке на 15 минут с перерывами 30-40 минут в первые 2-3 часа.\n` +
		`3. НЕ ГРЕТЬ: Категорически запрещено греть щеку, прикладывать компрессы, посещать баню, сауну и принимать горячую ванну 3 дня.\n` +
		`4. НЕ ПОЛОСКАТЬ: Не полоскать полость рта в первые 24 часа, чтобы не вымыть кровяной сгусток из лунки. Не пить через трубочку, не сплевывать активно.\n` +
		`5. ПИТАНИЕ: Прием пищи через 2 часа после операции (когда полностью отойдет анестезия). Исключить твердое, горячее и острое на 3 дня. Жевать на противоположной стороне.\n` +
		`6. ОБЕЗБОЛИВАНИЕ: При болях принять назначенный препарат (Нимесил 1 пакетик или Ибупрофен 400 мг) после еды.` +
		suturesStr +
		`\n\nПри продолжающемся кровотечении, нарастающем отеке или температуре выше 38°C немедленно обратитесь в клинику.` +
		docStr +
		phoneStr
	).trim();
}


