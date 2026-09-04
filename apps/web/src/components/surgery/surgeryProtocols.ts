/**
 * surgeryProtocols.ts — Хирургические протоколы, 1-клик нормы операций и мягкий овердрафт склада.
 * Стандарт: «Софт для врача, а не врач для софта. Любой барьер или лишний клик — это брак».
 */

export interface SurgicalOperationNorm {
	readonly id: string;
	readonly title: string;
	readonly shortBadge: string;
	readonly category: "implant" | "extraction" | "perio_surgery" | "sinus_gbr" | "emergency";
	readonly icd10: string;
	readonly icd10Label: string;
	readonly defaultToothFdi?: number;
	readonly standardProtocolTextRu: string;
	readonly anesthesiaDefaultRu: string;
	readonly postOpRecommendationsRu: string;
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
 * 1-клик каноническая норма дентальной имплантации (Mandate 8e СтАР).
 */
export const DENTAL_IMPLANTATION_NORM_TEXT =
	"Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл. Разрез по гребню альвеолярного отростка, отслоен слизисто-надкостничный лоскут. Препарирование ложа фрезами по хирургическому протоколу с охлаждением физраствором. Установлен дентальный имплантат, первичная торк-стабильность 35 Н/см. Установлен формирователь десны / винт-заглушка. Ушивание раны шовным материалом ПГА 4-0. Гемостаз полный. Рекомендации даны.";

/**
 * 1-клик каноническая норма простого удаления зуба.
 */
export const SIMPLE_EXTRACTION_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Круговая связка зуба отслоена гладилкой. Наложены щипцы, продвинуты под десну, фиксированы. Люксация и ротация. Тракция зуба из альвеолы. Кюретаж лунки, удаление грануляций. Гемостаз под давлением марлевого тампона. В лунку внесена гемостатическая губка. Рекомендации даны.";

/**
 * 1-клик каноническая норма сложного / атипичного удаления (дистопия / ретенция 18, 28, 38, 48).
 */
export const ATYPICAL_EXTRACTION_NORM_TEXT =
	"Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Разрез слизистой в ретромолярной области, отслоен слизисто-надкостничный лоскут. Сепарация коронки и корней твердосплавным бором Lindemann с охлаждением физраствором. Люксация и извлечение фрагментов элеватором. Кюретаж лунки, ревизия. Лунка заполнена гемостатической коллагеновой губкой. Рана ушита узловыми швами ПГА 4-0. Гемостаз полный. Рекомендации даны.";

/**
 * 1-клик норма синус-лифтинга и направленной костной регенерации (НКР).
 */
export const SINUS_LIFT_GBR_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Трапециевидный разрез в боковом отделе верхней челюсти, скелетирование передне-боковой стенки верхнечелюстного синуса. Формирование латерального окна пьезотомом. Элевация мембраны Шнайдера без перфорации. Субантральное пространство заполнено ксенографтом. Барьерная мембрана фиксирована пинами. Послойное ушивание ПГА 4-0. Гемостаз полный. Рекомендации даны.";

/**
 * 1-клик норма иссечения капюшона / перикоронит.
 */
export const PERICORONITIS_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Иссечение воспаленного слизистого капюшона над коронкой ретинированного зуба скальпелем. Промывание антисептиками (хлоргексидин 0.05%), йодоформная турунда. Гемостаз полный. Рекомендации даны.";

/**
 * Реестр 1-клик хирургических норм для хирурга-имплантолога.
 */
export const SURGICAL_OPERATION_NORMS: readonly SurgicalOperationNorm[] = [
	{
		id: "surgery_implant_standard",
		title: "Дентальная имплантация (1-клик норма)",
		shortBadge: "Имплантация 35 Н/см",
		category: "implant",
		icd10: "K08.1",
		icd10Label: "Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		defaultToothFdi: 46,
		standardProtocolTextRu: DENTAL_IMPLANTATION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл",
		postOpRecommendationsRu:
			"Холод на область операции 15 мин каждые 2 часа в первый день. Ванночки с 0.05% хлоргексидином с 2-х суток. Исключить горячее, бани, физ. нагрузки 7 дней. Прием НПВП и антибиотикотерапия по назначению. Осмотр через 7 дней.",
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
		defaultToothFdi: 36,
		standardProtocolTextRu: SIMPLE_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Марлевый тампон сплюнуть через 20 минут. Не полоскать рот 24 часа. Не принимать горячую ванну и острую пищу 3 дня. При болях — Нимесил 1 пак.",
		requiredMaterials: [
			{ name: "Губка гемостатическая коллагеновая", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_atypical",
		title: "Сложное удаление ретинированного зуба мудрости",
		shortBadge: "Удаление 8-ки (сложное)",
		category: "extraction",
		icd10: "K01.1",
		icd10Label: "Ретинированные зубы",
		defaultToothFdi: 48,
		standardProtocolTextRu: ATYPICAL_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% — 3.4 мл",
		postOpRecommendationsRu:
			"Холод на щеку локально. Щадящая диета. Антибиотикотерапия (Амоксиклав 625 мг 2 р/сут 5 дней). Швы снять через 7-10 суток.",
		requiredMaterials: [
			{ name: "Шовный материал ПГА 4-0 с атравматической иглой", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Бор твердосплавный хирургический Lindemann", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая коллагеновая", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_sinus_lift_gbr",
		title: "Открытый синус-лифтинг & Костная пластика",
		shortBadge: "Синус-лифтинг / НКР",
		category: "sinus_gbr",
		icd10: "K08.2",
		icd10Label: "Атрофия беззубого альвеолярного края",
		defaultToothFdi: 16,
		standardProtocolTextRu: SINUS_LIFT_GBR_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Сосудосуживающие капли в нос 5 дней. Не чихать с закрытым ртом, не летать на самолете 14 дней. Антибиотики по схеме.",
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
		defaultToothFdi: 48,
		standardProtocolTextRu: PERICORONITIS_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Ротовые ванночки с ромашкой и хлоргексидином 0.05% 3-4 раза в день. Метрогил Дента локально.",
		requiredMaterials: [
			{ name: "Лента йодоформная турунда", unit: "см", quantity: 5, isWarehouseCritical: false },
		],
	},
];

/**
 * Проверка мягкого овердрафта склада:
 * Если накладная поставщика задерживается, врач НИКОГДА не блокируется.
 * Система фиксирует статус мягкого овердрафта и формирует автоматическое
 * оповещение старшей медсестре для оприходования без остановки приёма.
 */
export function evaluateWarehouseOverdraft(
	materials: readonly { name: string; isWarehouseCritical?: boolean }[],
	forceWarehouseDelay = false,
): SurgicalWarehouseOverdraftStatus {
	const pending = forceWarehouseDelay
		? materials.filter((m) => m.isWarehouseCritical).map((m) => m.name)
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
			`Торк первичной стабильности: ${params.implantDetails.torqueNcm} Н/см\n` +
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
