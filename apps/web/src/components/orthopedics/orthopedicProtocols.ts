/**
 * DENTE CRM — Orthopedic Protocols & Dental Lab Chairside Engine (Mandate 8e, 8i, 8k, 8n)
 *
 * 4 канонических стандарта ортопедического протокола Формы 043/у:
 * 1. Препарирование под коронку ZrO2 / E.max (уступ 0.5–1.0 мм, ретракция 00/0, А-силикон/3Shape TRIOS, Protemp на Temp-Bond NE)
 * 2. Примерка каркаса / коронки (краевое прилегание зондом, контактный пункт флоссом, копирка Bausch 40 мкм, VITA)
 * 3. Постоянная фиксация (пескоструй CoJet/Al2O3, Monobond Plus, RelyX U200 / Panavia V5, рентген-контроль RVG)
 * 4. Съёмное протезирование (слепки, восковые валики ЦСЧ, постановка гарнитура, сдача протеза Acry-Free / нейлон)
 *
 * Invariants:
 * - Внесение в дневник Формы 043/у в 1 клик через CustomEvent "dente-apply-soap-protocol" (immediate: true)
 * - Синхронизация с зубной формулой (Crown) через "dente-odontogram-update"
 * - Добавление услуг в Этап 3 плана лечения ("stage_3_orthopedics") через "dente-estimate-stage-add"
 * - Клинический оверрайд врача (Doctor Clinical Override) при авансе < 50% без задержек и согласований
 * - Ноль эмодзи в медицинских записях и нарядах ЗТЛ
 */

import { showToast } from "../GlobalToast.js";
import { useVisitStore } from "../../store/visitStore.js";

export type OrthopedicProtocolCategory =
	| "prep_crown"
	| "impression_scan"
	| "temp_crown"
	| "try_in"
	| "permanent_cementation"
	| "removable_prosthetics"
	| "consultation_norm";

export interface OrthopedicConsumableItem {
	readonly nameRu: string;
	readonly item?: string | undefined;
	readonly quantity: number;
	readonly unit: string;
	readonly defaultCostRub?: number;
}

export interface Order804nServiceItem {
	readonly code: string;
	readonly nameRu: string;
	readonly stageKind: "stage_3_orthopedics";
	readonly suggestedPriceRub?: number;
	readonly priceRub?: number;
	readonly toothNumber?: number;
}

export const VITA_BLEACH_SHADES = ["BL1", "BL2", "BL3", "BL4"] as const;
export type VitaBleachShade = (typeof VITA_BLEACH_SHADES)[number];

export const VITA_CLASSICAL_SHADES = [
	"A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D2", "D3", "D4",
] as const;
export type VitaClassicalShade = (typeof VITA_CLASSICAL_SHADES)[number];

export const VITA_SHADE_GROUPS = [
	{ group: "Bleach", labelRu: "Bleach (Экстра-белые)", shades: ["BL1", "BL2", "BL3", "BL4"] as const },
	{ group: "A", labelRu: "Группа A (Красновато-коричневые)", shades: ["A1", "A2", "A3", "A3.5", "A4"] as const },
	{ group: "B", labelRu: "Группа B (Красновато-желтые)", shades: ["B1", "B2", "B3", "B4"] as const },
	{ group: "C", labelRu: "Группа C (Серые)", shades: ["C1", "C2", "C3", "C4"] as const },
	{ group: "D", labelRu: "Группа D (Красновато-серые)", shades: ["D2", "D3", "D4"] as const },
] as const;

export const ALL_VITA_AND_BLEACH_SHADES = [
	...VITA_BLEACH_SHADES,
	...VITA_CLASSICAL_SHADES,
] as const;
export type AllVitaAndBleachShade = (typeof ALL_VITA_AND_BLEACH_SHADES)[number];

export interface OrthopedicProtocolPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly shortLabel: string;
	readonly category: OrthopedicProtocolCategory;
	readonly defaultIcd10: string;
	readonly defaultIcd10Label: string;
	readonly anamnesis: string;
	readonly objective: string;
	readonly treatment: string;
	readonly recommendations: string;
	readonly order804nServices: readonly Order804nServiceItem[];
	readonly warehouseBundleType?:
		| "orthopedics_prep"
		| "orthopedics_impression"
		| "orthopedics_temporary"
		| "orthopedics_cementation"
		| undefined;
	readonly consumables?: readonly OrthopedicConsumableItem[] | undefined;
	readonly quickWriteoffInventory?: boolean | undefined;
}

export const ORTHOPEDIC_CANONICAL_PROTOCOLS: readonly OrthopedicProtocolPreset[] = [
	{
		id: "ortho_standard_crown_complete",
		titleRu:
			"Стандартное протезирование коронкой (А-силикон Silagum/Express, временная PMMA у кресла, примерка, фиксация Fuji Plus / RelyX U200)",
		shortLabel: "Стандартное протезирование",
		category: "prep_crown",
		defaultIcd10: "K08.1",
		defaultIcd10Label:
			"Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		anamnesis:
			"Плановое ортопедическое лечение дефекта коронковой части зуба цельноанатомической коронкой. Комплексный клинический протокол: препарирование с формированием уступа chamfer 0.8 мм, снятие двухслойного слепка А-силиконом (Silagum / Express XT), изготовление временной коронки PMMA у кресла на Temp-Bond NE, примерка каркаса и фиксация на стеклоиономерный цемент Fuji Plus или композитный цемент двойного отверждения RelyX U200.",
		objective:
			"Зуб препарирован с круговым уступом 0.8–1.0 мм chamfer. Десневой край интактен, ретракция нитью 00/0 с ViscoStat Clear. Культя плотная, герметичная, биологическая ширина сохранена.",
		treatment:
			"Инфильтрационная анестезия (Артикаин 4% с эпинефрином 1:100 000 — 1.7 мл). Препарирование твердых тканей зуба с формированием кругового уступа chamfer 0.8 мм с водно-воздушным охлаждением. Рентгенологический контроль культи. Двухслойный прецизионный оттиск А-силиконом (Silagum / Express XT) и регистрация прикуса окклюзионным силиконом. Изготовление и полировка временной коронки PMMA (Protemp 4 / Luxatemp) прямым методом у кресла, временная фиксация на безевгенольный цемент Temp-Bond NE. Клиническая примерка каркаса / коронки: контроль краевого прилегания, контактных пунктов, окклюзии копиркой Bausch 40 мкм. Постоянная фиксация на стеклоиономерный цемент GC Fuji Plus / композитный цемент двойного отверждения RelyX U200 с удалением излишков и рентген-контролем RVG. Врачом оформлены Паспорт ортопедической конструкции и Гарантийный талон А4.",
		recommendations:
			"Щадящий режим жевания 2 часа. Соблюдение гигиены щеткой и флоссом. Гарантийный талон и паспорт изделия выданы пациенту на руки. Контрольный осмотр через 6 месяцев.",
		order804nServices: [
			{ code: "A16.07.004", nameRu: "Восстановление зуба коронкой (препарирование зуба под искусственную коронку)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 4000, priceRub: 4000 },
			{ code: "A16.07.031.001", nameRu: "Снятие двухслойного оттиска прецизионным А-силиконом (Silagum / Express XT)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 3500, priceRub: 3500 },
			{ code: "A02.07.010", nameRu: "Определение и фиксация центрального соотношения челюстей (окклюзионный силикон)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 2000, priceRub: 2000 },
			{ code: "A16.07.004.001", nameRu: "Изготовление и фиксация временной коронки PMMA прямым методом у кресла (Protemp 4)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 2500, priceRub: 2500 },
			{ code: "A16.07.025", nameRu: "Примерка ортопедической конструкции (коронки, каркаса, мостовидного протеза)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 1500, priceRub: 1500 },
			{ code: "A16.07.004.002", nameRu: "Постоянная фиксация коронки на стеклоиономерный цемент Fuji Plus / RelyX U200", stageKind: "stage_3_orthopedics", suggestedPriceRub: 3000, priceRub: 3000 },
			{ code: "A06.07.007", nameRu: "Внутриротовой прицельный радиовизиографический снимок (контроль краевого прилегания и цемента)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 750, priceRub: 750 },
		],
		warehouseBundleType: "orthopedics_prep",
		quickWriteoffInventory: true,
		consumables: [
			{ nameRu: "А-силикон база + корректор (Silagum / Express XT)", item: "А-силикон база + корректор (Silagum / Express XT)", quantity: 1, unit: "компл.", defaultCostRub: 1600 },
			{ nameRu: "Канюли смесительные для А-силикона", item: "Канюли смесительные для А-силикона", quantity: 2, unit: "шт.", defaultCostRub: 90 },
			{ nameRu: "Нить ретракционная Ultrapak #00", item: "Нить ретракционная Ultrapak #00", quantity: 1, unit: "уп.", defaultCostRub: 850 },
			{ nameRu: "Артикаин 1:100 000 (карпула 1.7 мл)", item: "Артикаин 1:100 000 (карпула 1.7 мл)", quantity: 1, unit: "карп.", defaultCostRub: 120 },
			{ nameRu: "Бис-акриловый композит Protemp 4 / Luxatemp", item: "Бис-акриловый композит Protemp 4 / Luxatemp", quantity: 1, unit: "доза", defaultCostRub: 450 },
			{ nameRu: "Цемент временный Temp-Bond NE", item: "Цемент временный Temp-Bond NE", quantity: 1, unit: "доза", defaultCostRub: 180 },
			{ nameRu: "Стеклоиономерный цемент GC Fuji Plus / RelyX U200", item: "Стеклоиономерный цемент GC Fuji Plus / RelyX U200", quantity: 1, unit: "доза", defaultCostRub: 650 },
			{ nameRu: "Праймер керамики Monobond Plus", item: "Праймер керамики Monobond Plus", quantity: 1, unit: "доза", defaultCostRub: 250 },
		],
	},
	{
		id: "ortho_prep_zirconia_emax",
		titleRu:
			"Препарирование зуба под коронку ZrO2 / E.max (уступ 0.5–1.0 мм, ретракция нитью 00/0, А-силикон/3Shape TRIOS, Protemp на Temp-Bond NE)",
		shortLabel: "Препарирование ZrO2 / E.max",
		category: "prep_crown",
		defaultIcd10: "K08.1",
		defaultIcd10Label:
			"Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		anamnesis:
			"Плановое посещение по утвержденному плану ортопедического лечения (Этап 3: Ортопедия). Жалобы на косметический и функциональный дефект твердых тканей коронковой части зуба (ИРОПЗ > 0.6 / после эндодонтического лечения), затруднение пережевывания пищи. Соматически здоров. Аллергологический анамнез не отягощен.",
		objective:
			"Маргинальная десна в области зуба бледно-розовая, без воспалительных явлений. Зондирование десневой борозды до 1.5 мм, без кровоточивости. На прицельной радиовизиографии (РВГ) периапикальные ткани спокойны, корневой канал запломбирован герметично на всем протяжении до физиологического апекса, культевая вкладка / билдап стабильны.",
		treatment:
			"Инфильтрационная/проводниковая анестезия (Артикаин 4% с эпинефрином 1:100 000 — 1.7 мл). Препарирование твердых тканей зуба под цельнокерамическую коронку (ZrO2 / IPS e.max) алмазными борами с закругленным торцом на высоких оборотах с обильным водно-воздушным охлаждением. Формирование кругового уступа типа полужелоб (chamfer) шириной 0.5–1.0 мм с субгингивальным погружением на 0.2–0.3 мм. Механическая ретракция десны техникой двух нитей (нить Ultrapack 00 + 0 с гелем гемостатика ViscoStat Clear 25% AlCl3). Высушивание. Снятие высокоточного двухслойного оттиска прецизионным А-силиконом (Express XT / Honigum) / интраоральное цифровое 3D-сканирование сканером 3Shape TRIOS. Снятие оттиска с зубного ряда-антагониста. Регистрация прикуса окклюзионным силиконом (Futar D / O-Bite). Определение цвета будущей конструкции по шкале VITA Toothguide 3D-Master / Classical. Изготовление временной коронки прямым методом из бис-акрилового композита Protemp 4 по предварительному силиконовому ключу. Финишная полировка временной коронки, фиксация на культю зуба на временный безевгенольный цемент (Temp-Bond NE). Тщательное удаление излишков цемента, флосс-контроль контактных пунктов. Заказ-наряд направлен в зуботехническую лабораторию.",
		recommendations:
			"Щадящий режим жевания на временную коронку, исключить вязкую и твердую пищу (ириски, орехи). Гигиенический уход мягкой щеткой, использование суперфлосса. При сколе или расцементировке временной конструкции немедленно обратиться в клинику. Дата примерки конструкции назначена.",
		order804nServices: [
			{
				code: "A16.07.004",
				nameRu: "Восстановление зуба коронкой (препарирование зуба под искусственную коронку)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 4000,
				priceRub: 4000,
			},
			{
				code: "A16.07.031.001",
				nameRu: "Снятие двухслойного оттиска / Интраоральное цифровое сканирование (3Shape TRIOS)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 3500,
				priceRub: 3500,
			},
			{
				code: "A02.07.010",
				nameRu: "Определение и фиксация центрального соотношения челюстей (окклюзионный силикон)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 2000,
				priceRub: 2000,
			},
			{
				code: "A16.07.004.001",
				nameRu: "Изготовление и фиксация временной провизорной коронки прямым методом (Protemp 4)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 2500,
				priceRub: 2500,
			},
		],
		warehouseBundleType: "orthopedics_prep",
		consumables: [
			{ nameRu: "Нить ретракционная Ultrapak #00", quantity: 1, unit: "уп.", defaultCostRub: 850 },
			{ nameRu: "А-силикон база + корректор (Express XT)", quantity: 1, unit: "компл.", defaultCostRub: 1600 },
			{ nameRu: "Канюли смесительные для А-силикона", quantity: 2, unit: "шт.", defaultCostRub: 90 },
			{ nameRu: "Артикаин 1:100 000 (карпула 1.7 мл)", quantity: 1, unit: "карп.", defaultCostRub: 120 },
			{ nameRu: "Иглы карпульные 0.3x21 мм", quantity: 1, unit: "шт.", defaultCostRub: 18 },
			{ nameRu: "Бис-акриловый композит Protemp 4 / Luxatemp", quantity: 1, unit: "доза", defaultCostRub: 450 },
			{ nameRu: "Цемент временный Temp-Bond NE", quantity: 1, unit: "доза", defaultCostRub: 180 },
		],
	},
	{
		id: "ortho_impression_scan",
		titleRu:
			"Снятие двухслойного слепка (А-силикон) / Оптический цифровой скан (3Shape TRIOS) и регистрация прикуса",
		shortLabel: "Снятие слепка (А-силикон) / Скан",
		category: "impression_scan",
		defaultIcd10: "K08.1",
		defaultIcd10Label:
			"Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		anamnesis:
			"Плановое посещение по плану ортопедического лечения (Этап 3: Ортопедия). Жалоб на боли нет. Этап высокоточного получения оттиска / цифрового сканирования препарированных зубов для зуботехнической лаборатории (ЗТЛ).",
		objective:
			"Десневой край в области препарированных зубов спокоен, бледно-розовый. Уступ четко визуализируется, кровоточивость отсутствует. Временные коронки сняты без повреждения культей.",
		treatment:
			"Антисептическая обработка культей 0.05% хлоргексидином. Механическая ретракция десны техникой двух нитей (Ultrapak 00 + 0 с гемостатиком ViscoStat Clear 25% AlCl3). Высушивание струей воздуха. Снятие высокоточного двухслойного оттиска прецизионным А-силиконом (Express XT / Honigum / Elite HD+) базовым и корригирующим слоями с использованием смесительного пистолета и интраоральных канюль / интраоральное цифровое 3D-сканирование зубного ряда сканером 3Shape TRIOS. Снятие оттиска зубного ряда-антагониста. Регистрация центральной окклюзии прецизионным А-силиконом для регистрации прикуса (Futar D / O-Bite). Контроль качества оттиска: круговой уступ, переходная складка и зубы-антагонисты просняты с микронной точностью, оттяжек и пор нет. Временные коронки повторно зафиксированы на Temp-Bond NE. Заказ-наряд сформирован и отправлен в ЗТЛ.",
		recommendations:
			"Щадящий режим жевания на временные коронки. Назначен визит на примерку конструкции.",
		order804nServices: [
			{
				code: "A16.07.031.001",
				nameRu: "Снятие двухслойного оттиска / Интраоральное цифровое сканирование (3Shape TRIOS)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 3500,
				priceRub: 3500,
			},
			{
				code: "A02.07.010",
				nameRu: "Определение и фиксация центрального соотношения челюстей (окклюзионный силикон)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 2000,
				priceRub: 2000,
			},
		],
		warehouseBundleType: "orthopedics_impression",
		consumables: [
			{ nameRu: "А-силикон прецизионный (база + корректор)", quantity: 1, unit: "компл.", defaultCostRub: 1600 },
			{ nameRu: "Канюли смесительные с интраоральными насадками", quantity: 2, unit: "шт.", defaultCostRub: 90 },
			{ nameRu: "Окклюзионный силикон для регистрации прикуса (Futar D)", quantity: 1, unit: "доза", defaultCostRub: 350 },
			{ nameRu: "Ложка слепочная перфорированная", quantity: 1, unit: "шт.", defaultCostRub: 60 },
		],
	},
	{
		id: "ortho_temp_crown_luxatemp",
		titleRu:
			"Изготовление и фиксация временной коронки прямым методом (Luxatemp Star / Protemp 4 на Temp-Bond NE)",
		shortLabel: "Временная коронка (Luxatemp)",
		category: "temp_crown",
		defaultIcd10: "K08.1",
		defaultIcd10Label:
			"Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		anamnesis:
			"Плановое посещение на этап изготовления и фиксации временной провизорной конструкции. Жалоб нет. Необходима защита культи препарированного зуба, сохранение объема десны и эстетики на период изготовления работы в ЗТЛ.",
		objective:
			"Культя зуба препарирована с уступом, десна не воспалена. Пульпа витальна / зуб депульпирован, культя герметично восстановлена.",
		treatment:
			"Изоляция рабочего поля. Внесение бис-акрилового композита (Luxatemp Star / Protemp 4) в силиконовый ключ/матрицу с помощью смесительного наконечника 1:10. Наложение ключа на культю зуба на 2 минуты до первичной полимеризации. Извлечение заготовки, удаление ингибированного кислородом слоя спиртовой салфеткой. Механическая обработка алмазными и твердосплавными борами, формирование анатомической формы, фиссур и контактных пунктов. Финишная полировка дисками Sof-Lex и силиконовыми полирами до сухого блеска. Примерка в полости рта: проверка краевого прилегания, окклюзии копиркой 40 мкм. Фиксация на культю зуба на временный безевгенольный цемент Temp-Bond NE / RelyX Temp NE. Удаление излишков цемента кюретой, флосс-контроль межзубных промежутков.",
		recommendations:
			"Не жевать вязкую и сверхтвердую пищу на сторону временной коронки. При расцементировке обратиться в клинику.",
		order804nServices: [
			{
				code: "A16.07.004.001",
				nameRu: "Изготовление и фиксация временной провизорной коронки прямым методом (Luxatemp / Protemp 4)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 2500,
				priceRub: 2500,
			},
		],
		warehouseBundleType: "orthopedics_temporary",
		consumables: [
			{ nameRu: "Бис-акриловый композит Luxatemp Star / Protemp 4", quantity: 1, unit: "доза", defaultCostRub: 450 },
			{ nameRu: "Смесительные канюли для композита 1:10", quantity: 1, unit: "шт.", defaultCostRub: 50 },
			{ nameRu: "Цемент временный Temp-Bond NE", quantity: 1, unit: "доза", defaultCostRub: 180 },
			{ nameRu: "Диски полировочные Sof-Lex", quantity: 1, unit: "шт.", defaultCostRub: 65 },
		],
	},
	{
		id: "ortho_permanent_cementation",
		titleRu:
			"Постоянная фиксация конструкции (ZrO2 / E.max) на стеклоиономер / композитный цемент (Fuji I / RelyX U200 / Panavia V5, рентген-контроль)",
		shortLabel: "Постоянная фиксация (RelyX / Fuji I)",
		category: "permanent_cementation",
		defaultIcd10: "Z51.8",
		defaultIcd10Label: "Ортопедическое лечение",
		anamnesis:
			"Плановое посещение на этап постоянной фиксации готовой ортопедической конструкции из ЗТЛ. Жалоб нет. Конструкция глазурована и готова к постоянной фиксации.",
		objective:
			"Десневой контур сформирован провизорной конструкцией идеально, краевой пародонт интактен, кровоточивости при зондировании нет. Культя зуба чистая, плотная.",
		treatment:
			"Снятие временной коронки. Очистка культи зуба ультразвуком и полировочной пастой без фтора, промывание дистиллированной водой, антисептическая обработка 2% хлоргексидином. Изоляция рабочего поля (коффердам / ретракционная нить 00 / ватные валики и слюноотсос). Подготовка внутренней поверхности конструкции: воздушно-абразивная пескоструйная обработка частицами оксида алюминия 50 мкм (Al2O3 / CoJet Prep) под давлением 2.0 бар, очистка Ivoclean 20 сек, промывание, высушивание. Нанесение универсального праймера (Monobond Plus / Clearfil Ceramic Primer Plus), экспозиция 60 сек, высушивание струей теплого воздуха без примесей масла. Нанесение самоадгезивного композитного цемента двойного отверждения (3M RelyX U200 / Panavia V5) или стеклоиономерного цемента (GC Fuji I) на внутреннюю поверхность коронки. Внесение конструкции на культю зуба, позиционирование с равномерным осевым усилием. Предварительная светополимеризация вспышкой 2 сек («tack-cure») для перевода излишков цемента в гелеобразное состояние. Полное прецизионное удаление излишков цемента кюретой и скалером по всему периметру десневой борозды, прочистка межзубных промежутков зубной нитью с узелком. Окончательная полимеризация светом по 20 сек с каждой поверхности под защитным слоем глицеринового геля Oxyguard / Liquid Strip. Контроль окклюзии в статике и динамике (Bausch 40 мкм). Финишная полировка переходов и полировка шва алмазной пастой. Контрольный внутриротовой прицельный радиовизиографический снимок (РВГ): коронка адаптирована точно по уступу, поддесневых наплывов и излишков фиксирующего цемента нет.",
		recommendations:
			"Не принимать пищу в течение 2 часов. Исключить чрезмерные точечные механические нагрузки (грызть кости, сухари) в первые сутки. Стандартная индивидуальная гигиена: чистка зубов 2 раза в день, ежедневное использование флосса или ирригатора. Контрольный осмотр через 6 месяцев.",
		order804nServices: [
			{
				code: "A16.07.004",
				nameRu: "Восстановление зуба коронкой (постоянная ортопедическая конструкция из ЗТЛ)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 22000,
				priceRub: 22000,
			},
			{
				code: "A16.07.004.002",
				nameRu: "Постоянная фиксация несъемной ортопедической конструкции (коронки, мостовидного протеза, винира)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 3000,
				priceRub: 3000,
			},
			{
				code: "A06.07.007",
				nameRu: "Внутриротовой прицельный радиовизиографический снимок (контроль краевого прилегания и отсутствия поддесневого цемента)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 750,
				priceRub: 750,
			},
		],
		warehouseBundleType: "orthopedics_cementation",
		consumables: [
			{ nameRu: "Композитный цемент RelyX U200 / Panavia V5", quantity: 1, unit: "доза", defaultCostRub: 650 },
			{ nameRu: "Праймер керамики Monobond Plus", quantity: 1, unit: "доза", defaultCostRub: 250 },
			{ nameRu: "Оксид алюминия 50 мкм для CoJet", quantity: 1, unit: "порция", defaultCostRub: 120 },
			{ nameRu: "Нить ретракционная Ultrapak #000", quantity: 1, unit: "уп.", defaultCostRub: 850 },
			{ nameRu: "Глицериновый гель Liquid Strip / Oxyguard", quantity: 1, unit: "доза", defaultCostRub: 90 },
		],
	},
	{
		id: "ortho_try_in_framework_crown",
		titleRu:
			"Примерка каркаса / коронки из диоксида циркония / E.max (контроль краевого прилегания, контактных пунктов, окклюзии и цвета VITA)",
		shortLabel: "Примерка каркаса / коронки",
		category: "try_in",
		defaultIcd10: "Z51.8",
		defaultIcd10Label: "Ортопедическое лечение",
		anamnesis:
			"Плановое посещение на этап клинической примерки ортопедической конструкции из ЗТЛ. Жалоб на боли и самопроизвольный дискомфорт нет. Временная коронка удерживалась стабильно, фиксация не нарушена.",
		objective:
			"Временная коронка снята без повреждения культи зуба. Десневой край спокойный, бледно-розовый, признаки воспаления и мацерации десны отсутствуют. Культя зуба очищена от остатков временного цемента пастой без масел и фтора (CleanPolish / Klint).",
		treatment:
			"Деликатное снятие временной коронки. Механическая очистка культи зуба ротационной щеточкой с безмасляной пастой, медикаментозная обработка 0.05% раствором хлоргексидина биглюконата. Клиническая примерка цельнокерамической коронки (ZrO2 Katana ML / IPS e.max): проверка точности посадки и краевого прилегания к круговому уступу культи острым зондом — уступ перекрыт идеально, зазоров и ступенек не определяется. Проверка апроксимальных контактных пунктов с соседними зубами при помощи зубной нити (флосса) — контакт плотный, физиологический, нить проходит с легким щелчком. Окклюзионный контроль в положении центральной, передней и боковых окклюзий при помощи артикуляционной бумаги Bausch 40 мкм и артикуляционного шелка 8 мкм — преждевременных окклюзионных контактов и суперконтактов нет, множественные равномерные точечные контакты. Форма, анатомический микрорельеф и цвет конструкции по шкале VITA оценены совместно с пациентом при естественном освещении и одобрены. Конструкция передана в ЗТЛ на глазурование и финишную полировку / подготовлена к постоянной фиксации. Повторная фиксация временной коронки на Temp-Bond NE.",
		recommendations:
			"Продолжать обычную гигиену полости рта. Назначен визит на постоянную фиксацию конструкции.",
		order804nServices: [
			{
				code: "A16.07.025",
				nameRu: "Примерка ортопедической конструкции (коронки, каркаса, мостовидного протеза)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 1500,
				priceRub: 1500,
			},
		],
	},
	{
		id: "ortho_removable_prosthetics",
		titleRu:
			"Съёмное протезирование (частичный/полный протез Acry-Free/нейлон, анатомические/функциональные слепки, прикусные валики, постановка зубов, сдача протеза)",
		shortLabel: "Съемное протезирование",
		category: "removable_prosthetics",
		defaultIcd10: "K08.4",
		defaultIcd10Label: "Частичная потеря зубов",
		anamnesis:
			"Жалобы на частичную или полную утрату зубов, выраженное нарушение жевательной функции, эстетический дефект улыбки, западание губ и щек. Соматически: возрастная норма / сопутствующие заболевания в стадии компенсации. Аллергии нет.",
		objective:
			"Конфигурация лица изменена соответственно степени адентии, снижена высота нижней трети лица. Слизистая оболочка протезного ложа по Суппле (1–2 класс), умеренно податлива, бледно-розовая, без очагов воспаления и язв. Альвеолярные отростки умеренно атрофированы. Опорные зубы (при ЧСПП) устойчивы, без патологической подвижности.",
		treatment:
			"Снятие анатомических оттисков стандартными ложками альгинатной массой (Hydrogum 5 / Kromopan) для изготовления индивидуальных ложек. Снятие прецизионного функционального оттиска индивидуальной ложкой (окантовка краев термопластической массой Kerr, функциональные пробы по Гербсту) полиэфирной массой Impregum / А-силиконом Monopren. Определение и фиксация центрального соотношения челюстей восковыми базисами с окклюзионными валиками: формирование протетической плоскости, определение высоты нижней трети лица в состоянии покоя, фиксация центрального соотношения челюстей в артикуляторе. Клиническая проверка восковой конструкции съемного протеза с искусственными гарнитурными зубами (Ivoclar Vivodent): оценка правильности постановки зубов, цвета, формы, окклюзионных взаимоотношений и фонетических проб с пациентом. Наложение и сдача готового съемного протеза (Acry-Free / термопласт без мономера / акриловый базис): проверка посадки, ретенции и стабильности протеза, отсутствие балансирования. Окклюзионная коррекция копировальной бумагой Bausch 40 мкм. Обучение пациента правилам снятия, наложения и ухода за протезом.",
		recommendations:
			"Ношение протеза в период адаптации (1–2 недели). Первые дни не снимать на ночь для ускорения привыкания. Чтение вслух для нормализации дикции. Мягкая негорячая пища, пережевывание на обе стороны. Ежедневное очищение протеза специальной мягкой щеткой и очищающими таблетками (Корега/Протефикс). При появлении болей или наминов — снять протез, надеть за 2–3 часа до визита и явиться на бесплатную коррекцию.",
		order804nServices: [
			{
				code: "A16.07.035",
				nameRu: "Протезирование частичными съемными пластиночными протезами (Acry-Free / нейлон)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 45000,
				priceRub: 45000,
			},
			{
				code: "A16.07.023",
				nameRu: "Протезирование зубов полными съемными пластиночными протезами (Acry-Free / нейлон)",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 50000,
				priceRub: 50000,
			},
			{
				code: "A02.07.010",
				nameRu: "Определение центрального соотношения челюстей при помощи восковых базисов с окклюзионными валиками",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 4000,
				priceRub: 4000,
			},
		],
	},
	{
		id: "ortho_norm_occlusion",
		titleRu:
			"Ортопедический осмотр: физиологический прикус (ортогнатический), окклюзия стабильна, патологии ВНЧС не выявлено (Норма СтАР)",
		shortLabel: "Ортопедический осмотр (Норма)",
		category: "consultation_norm",
		defaultIcd10: "Z01.2",
		defaultIcd10Label: "Стоматологическое обследование (Здоров / Физиологическая окклюзия)",
		anamnesis:
			"Плановый первичный / профилактический ортопедический осмотр. Жалоб на боли, затруднение пережевывания пищи, хруст или щелканье в височно-нижнечелюстных суставах (ВНЧС), утомляемость жевательных мышц нет. Соматически здоров.",
		objective:
			"Лицо симметрично, пропорционально. Открывание рта свободное, в полном объеме (>40 мм), без девиации и дефлексии. Пальпация жевательных и височных мышц безболезненна. Пальпация головок ВНЧС через наружный слуховой проход безболезненна, движения плавные, синхронные, без суставного шума. Прикус ортогнатический (физиологический). Зубные ряды интактны / дефекты замещены ранее изготовленными состоятельными конструкциями. Окклюзионные контакты множественные, равномерные. Слизистая оболочка полости рта бледно-розовая, чистая.",
		treatment:
			"Комплексное клиническое ортопедическое обследование: пальпация жевательной мускулатуры, оценка траектории движений нижней челюсти, окклюдограмма артикуляционной бумагой Bausch 40 мкм (центральная, динамическая протрузивная и латеротрузивная окклюзия — клыковое ведение сохранено). В ортопедическом лечении на момент осмотра не нуждается. Проведена консультация по профилактике патологической стираемости и гигиене.",
		recommendations:
			"Профилактический контрольный осмотр 1 раз в 12 месяцев. Соблюдение гигиены полости рта. При появлении признаков бруксизма или дискомфорта в суставе — внеплановое обращение.",
		order804nServices: [
			{
				code: "A01.07.003",
				nameRu: "Прием (осмотр, консультация) врача-стоматолога-ортопеда первичный",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 1500,
				priceRub: 1500,
			},
			{
				code: "A02.07.010",
				nameRu: "Исследование зубочелюстной системы с помощью артикулятора / окклюдограммы",
				stageKind: "stage_3_orthopedics",
				suggestedPriceRub: 1000,
				priceRub: 1000,
			},
		],
	},
] as const;

export interface FormatOrthopedicProtocolOptions {
	toothFdi?: string | number | undefined;
	teethFdi?: readonly (string | number)[] | undefined;
	jawScope?: "upper" | "lower" | "both" | undefined;
	material?: string | undefined;
	colorVita?: string | undefined;
	labOrderId?: string | undefined;
	labOrderNumber?: string | undefined;
	technicianName?: string | undefined;
	warrantyPassport?: string | undefined;
}

/**
 * Форматирует клиническую запись для дневника с учетом номеров зубов и челюсти
 */
export function formatOrthopedicProtocolStatement(
	protocol: OrthopedicProtocolPreset,
	options?: FormatOrthopedicProtocolOptions,
): {
	anamnesis: string;
	objective: string;
	treatment: string;
	recommendations: string;
	summaryLine: string;
} {
	const teethList =
		options?.teethFdi && options.teethFdi.length > 0
			? options.teethFdi.map(String).join(", ")
			: options?.toothFdi
				? String(options.toothFdi).trim()
				: "";

	const jawLabel =
		options?.jawScope === "upper"
			? "Верхняя челюсть"
			: options?.jawScope === "lower"
				? "Нижняя челюсть"
				: options?.jawScope === "both"
					? "Обе челюсти"
					: "";

	const scopeItems: string[] = [];
	if (teethList) scopeItems.push(`Зуб(ы): ${teethList}`);
	if (jawLabel) scopeItems.push(`Область: ${jawLabel}`);
	if (options?.material) scopeItems.push(`Материал: ${options.material}`);
	if (options?.colorVita) scopeItems.push(`Цвет: ${options.colorVita}`);
	if (options?.labOrderNumber) scopeItems.push(`Наряд ЗТЛ: ${options.labOrderNumber}`);
	if (options?.technicianName) scopeItems.push(`Техник: ${options.technicianName}`);
	if (options?.warrantyPassport) scopeItems.push(`Гарантийный паспорт: ${options.warrantyPassport}`);

	const scopeHeader = scopeItems.length > 0 ? `[${scopeItems.join(" · ")}]\n` : "";

	const objective = `${scopeHeader}${protocol.objective}`;
	const treatment = `${scopeHeader}${protocol.treatment}`;
	const summaryLine = `[Ортопедия: ${protocol.shortLabel}] ${teethList ? `Зуб ${teethList}` : jawLabel || "Полость рта"}`;

	return {
		anamnesis: protocol.anamnesis,
		objective,
		treatment,
		recommendations: protocol.recommendations,
		summaryLine,
	};
}

export interface DoctorClinicalOverrideResult {
	readonly doctorClinicalOverride: true;
	readonly doctorOverrideReason: string;
	readonly doctorName?: string | undefined;
	readonly timestampIso: string;
	readonly mandate8e: true;
	readonly notice: string;
}

/**
 * Создает клинический оверрайд врача (Мандат 8e п. 7, 8n) для беспрепятственного наряда ЗТЛ
 * при авансе < 50% или срочных клинических показаниях.
 */
export function createDoctorClinicalOverride(options?: {
	reason?: string;
	doctorName?: string;
}): DoctorClinicalOverrideResult {
	const reason =
		options?.reason?.trim() ||
		"Клинические показания: обеспечение непрерывности лечебного процесса, срочное изготовление";
	return {
		doctorClinicalOverride: true,
		doctorOverrideReason: reason,
		doctorName: options?.doctorName,
		timestampIso: new Date().toISOString(),
		mandate8e: true,
		notice:
			"Клинический оверрайд врача применён: наряд ЗТЛ отправлен в лабораторию без задержек и согласований.",
	};
}

export interface ApplyOrthopedicProtocolParams {
	protocol: OrthopedicProtocolPreset;
	options?: FormatOrthopedicProtocolOptions;
	onSuccess?: ((summary: string) => void) | undefined;
	onAddToInvoice?: ((services: readonly Order804nServiceItem[]) => void) | undefined;
	copyToClipboard?: boolean;
	showNotification?: boolean;
}

/**
 * 1-клик внесение ортопедического протокола в Форму 043/у, активный счёт/смету визита и Этап 3 плана лечения
 */
export function applyOrthopedicProtocolToVisit(
	params: ApplyOrthopedicProtocolParams,
): {
	summary: string;
	teethNumbers: number[];
	services: readonly Order804nServiceItem[];
	formatted: ReturnType<typeof formatOrthopedicProtocolStatement>;
} {
	const { protocol, options } = params;
	const formatted = formatOrthopedicProtocolStatement(protocol, options);

	// 1. Выделяем числовые номера зубов
	const rawTeeth: (string | number)[] =
		options?.teethFdi && options.teethFdi.length > 0
			? [...options.teethFdi]
			: options?.toothFdi
				? [options.toothFdi]
				: [];

	const teethNumbers: number[] = rawTeeth
		.map((t) => Number(String(t).replace(/\D/g, "")))
		.filter((n) => Number.isInteger(n) && n >= 11 && n <= 85);

	// 2. Диспетчеризация SOAP-протокола для useVisitDiaryLogic (immediate: true, smart_append)
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							anamnesis: formatted.anamnesis,
							objective: formatted.objective,
							statusLocalis: formatted.objective,
							treatment: formatted.treatment,
							treatmentDescription: formatted.treatment,
							recommendations: formatted.recommendations,
							icd10: protocol.defaultIcd10,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch {
			// ignore in testing environments without window/CustomEvent
		}

		// 3. Синхронизация с зубной формулой при наличии зубов
		if (teethNumbers.length > 0) {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-odontogram-update", {
						detail: {
							states: teethNumbers.map((t) => ({
								toothNumber: t,
								state: "Crown",
							})),
						},
					}),
				);
			} catch {
				// ignore
			}
		}

		// 4. Добавление услуг в Этап 3 плана лечения ("stage_3_orthopedics")
		try {
			window.dispatchEvent(
				new CustomEvent("dente-estimate-stage-add", {
					detail: {
						stageKind: "stage_3_orthopedics",
						toothFdi: teethNumbers.length > 0 ? teethNumbers[0] : undefined,
						teethFdi: teethNumbers,
						protocolId: protocol.id,
						services: protocol.order804nServices,
					},
				}),
			);
		} catch {
			// ignore
		}

		// 5. Начисление услуг в активный счёт/смету визита для немедленной оплаты у кресла (dente-add-services-to-invoice)
		try {
			const primaryTooth = teethNumbers.length > 0 ? teethNumbers[0] : undefined;
			const invoiceServices = protocol.order804nServices.map((s) => ({
				code: s.code,
				nameRu: s.nameRu,
				name: s.nameRu,
				priceRub: s.priceRub ?? s.suggestedPriceRub ?? 0,
				suggestedPriceRub: s.suggestedPriceRub ?? s.priceRub ?? 0,
				toothNumber: primaryTooth,
				stageKind: s.stageKind,
				labOrderId: options?.labOrderId,
				labOrderNumber: options?.labOrderNumber,
				technicianName: options?.technicianName,
				materialName: options?.material,
				warrantyPassport: options?.warrantyPassport,
			}));

			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: primaryTooth,
						teethNumbers,
						services: invoiceServices,
						labOrderId: options?.labOrderId,
						labOrderNumber: options?.labOrderNumber,
						technicianName: options?.technicianName,
						material: options?.material,
						warrantyPassport: options?.warrantyPassport,
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	// 6. Прямой коллбек добавления в смету, если передан родителем
	if (params.onAddToInvoice) {
		try {
			params.onAddToInvoice(protocol.order804nServices);
		} catch {
			// ignore
		}
	}

	// 7. Обновление формы визита в visitStore
	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const currentObjective = prev.objectiveStatus || "";
			const currentTreatment = prev.treatmentPlan || "";

			const updatedObjective = currentObjective.trim()
				? `${currentObjective.trim()}\n\n${formatted.objective}`
				: formatted.objective;

			const updatedTreatment = currentTreatment.trim()
				? `${currentTreatment.trim()}\n\n${formatted.treatment}`
				: formatted.treatment;

			return {
				...prev,
				objectiveStatus: updatedObjective,
				treatmentPlan: updatedTreatment,
				diagnosis: prev.diagnosis || protocol.defaultIcd10Label,
			};
		});
	} catch {
		// outside React context / mock store
	}

	// 8. Копирование в буфер обмена
	if (
		params.copyToClipboard !== false &&
		typeof navigator !== "undefined" &&
		navigator.clipboard?.writeText
	) {
		const fullText = `ЖАЛОБЫ И АНАМНЕЗ:\n${formatted.anamnesis}\n\nОБЪЕКТИВНЫЙ СТАТУС:\n${formatted.objective}\n\nПРОВЕДЕННОЕ ЛЕЧЕНИЕ:\n${formatted.treatment}\n\nРЕКОМЕНДАЦИИ:\n${formatted.recommendations}`;
		navigator.clipboard.writeText(fullText).catch(() => {});
	}

	// 9. Автоматическое честное списание расходных материалов со склада inventory_items (Мандаты 8e, 8k, 8n)
	const primaryTooth = teethNumbers.length > 0 ? teethNumbers[0] : undefined;
	if (protocol.warehouseBundleType) {
		if (typeof window !== "undefined") {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-inventory-writeoff", {
						detail: {
							protocolId: protocol.id,
							bundleType: protocol.warehouseBundleType,
							toothNumber: primaryTooth,
							teethNumbers,
							consumables: protocol.consumables,
						},
					}),
				);
			} catch {
				// ignore
			}
		}

		if (typeof fetch === "function") {
			const orgId =
				typeof window !== "undefined" && typeof window.localStorage !== "undefined"
					? window.localStorage.getItem("dente_organization_id") || "00000000-0000-0000-0000-000000000001"
					: "00000000-0000-0000-0000-000000000001";
			fetch(`/api/inventory/${orgId}/quick-writeoff-orthopedic`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					protocolId: protocol.id,
					toothNumber: primaryTooth,
					notes: `1-клик ортопедический протокол «${protocol.shortLabel}» у кресла`,
				}),
			})
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					if (data?.deductedItems?.length) {
						const overdraftNote = data.isOverdraft ? " (мягкий овердрафт склада)" : "";
						showToast(
							`Расходные материалы со склада списаны: ${data.deductedItems.length} поз.${overdraftNote}`,
							data.isOverdraft ? "warning" : "info",
							3000,
						);
					}
				})
				.catch(() => {
					// Offline fallback
				});
		}
	}

	// 10. Оповещение врача
	if (params.showNotification !== false) {
		showToast(
			`Протокол «${protocol.shortLabel}» внесен в дневник 043/у, смету и Этап 3 (Ортопедия)`,
			"success",
			3500,
		);
	}

	if (params.onSuccess) {
		try {
			params.onSuccess(formatted.summaryLine);
		} catch {
			// ignore
		}
	}

	return {
		summary: formatted.summaryLine,
		teethNumbers,
		services: protocol.order804nServices,
		formatted,
	};
}
