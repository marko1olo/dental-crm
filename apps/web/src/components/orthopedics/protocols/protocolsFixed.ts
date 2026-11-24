import type { OrthopedicProtocolPreset, OrthopedicServiceItem } from "./orthopedicProtocolTypes.js";

const STANDARD_CROWN_SERVICES: readonly OrthopedicServiceItem[] = [
	{ code: "A16.07.004", nameRu: "Восстановление зуба коронкой (препарирование зуба под искусственную коронку)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 4000, priceRub: 4000 },
	{ code: "A16.07.031.001", nameRu: "Снятие двухслойного оттиска прецизионным А-силиконом", stageKind: "stage_3_orthopedics", suggestedPriceRub: 3500, priceRub: 3500 },
	{ code: "A02.07.010", nameRu: "Определение и фиксация центрального соотношения челюстей", stageKind: "stage_3_orthopedics", suggestedPriceRub: 2000, priceRub: 2000 },
	{ code: "A16.07.004.001", nameRu: "Изготовление и фиксация временной коронки PMMA прямым методом", stageKind: "stage_3_orthopedics", suggestedPriceRub: 2500, priceRub: 2500 },
	{ code: "A16.07.025", nameRu: "Примерка ортопедической конструкции (коронки, каркаса, мостовидного протеза)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 1500, priceRub: 1500 },
	{ code: "A16.07.004.002", nameRu: "Постоянная фиксация коронки на цемент двойного отверждения / СИЦ", stageKind: "stage_3_orthopedics", suggestedPriceRub: 3000, priceRub: 3000 },
	{ code: "A06.07.007", nameRu: "Внутриротовой прицельный радиовизиографический снимок", stageKind: "stage_3_orthopedics", suggestedPriceRub: 750, priceRub: 750 },
];

const PREP_SERVICES: readonly OrthopedicServiceItem[] = [
	{ code: "A16.07.004", nameRu: "Восстановление зуба коронкой (препарирование зуба под искусственную коронку)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 4000, priceRub: 4000 },
	{ code: "A16.07.031.001", nameRu: "Снятие двухслойного оттиска / Интраоральное сканирование", stageKind: "stage_3_orthopedics", suggestedPriceRub: 3500, priceRub: 3500 },
	{ code: "A02.07.010", nameRu: "Определение и фиксация центрального соотношения челюстей", stageKind: "stage_3_orthopedics", suggestedPriceRub: 2000, priceRub: 2000 },
	{ code: "A16.07.004.001", nameRu: "Изготовление и фиксация временной провизорной коронки прямым методом", stageKind: "stage_3_orthopedics", suggestedPriceRub: 2500, priceRub: 2500 },
];

const IMPRESSION_SERVICES: readonly OrthopedicServiceItem[] = [
	{ code: "A16.07.031.001", nameRu: "Снятие двухслойного оттиска / Интраоральное сканирование", stageKind: "stage_3_orthopedics", suggestedPriceRub: 3500, priceRub: 3500 },
	{ code: "A02.07.010", nameRu: "Определение и фиксация центрального соотношения челюстей", stageKind: "stage_3_orthopedics", suggestedPriceRub: 2000, priceRub: 2000 },
];

export const ORTHOPEDIC_FIXED_PROTOCOLS: readonly OrthopedicProtocolPreset[] = [
	{
		id: "ortho_standard_crown_complete",
		titleRu: "Стандартное протезирование коронкой (А-силикон, временная PMMA у кресла, примерка, фиксация)",
		shortLabel: "Стандартное протезирование",
		category: "prep_crown",
		defaultIcd10: "K08.1",
		defaultIcd10Label: "Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		anamnesis: "Плановое ортопедическое лечение дефекта коронковой части зуба цельноанатомической коронкой.",
		objective: "Зуб препарирован с круговым уступом 0.8–1.0 мм chamfer. Десневой край интактен, ретракция нитью 00/0.",
		treatment: "Препарирование с формированием уступа chamfer 0.8 мм. Двухслойный оттиск А-силиконом. Изготовление и полировка временной коронки PMMA прямым методом. Примерка и постоянная фиксация на стеклоиономерный модифицированный цемент (СИЦ) или композитный цемент двойного отверждения.",
		recommendations: "Щадящий режим жевания 2 часа. Соблюдение гигиены щеткой и флоссом. Гарантийный талон и паспорт изделия выданы на руки.",
		clinicalServices: STANDARD_CROWN_SERVICES,
		services: STANDARD_CROWN_SERVICES,
		order804nServices: STANDARD_CROWN_SERVICES,
		warehouseBundleType: "orthopedics_prep",
		quickWriteoffInventory: true,
		consumables: [
			{ nameRu: "Прецизионный А-силикон база + корректор (VPS)", item: "Прецизионный А-силикон база + корректор (VPS)", quantity: 1, unit: "компл.", defaultCostRub: 1600 },
			{ nameRu: "Нить ретракционная хлопчатобумажная вязаная #00", item: "Нить ретракционная хлопчатобумажная вязаная #00", quantity: 1, unit: "уп.", defaultCostRub: 850 },
			{ nameRu: "Бис-акриловый композит для провизорных коронок", item: "Бис-акриловый композит для провизорных коронок", quantity: 1, unit: "доза", defaultCostRub: 450 },
			{ nameRu: "Стеклоиономерный цемент / композитный цемент фиксации", item: "Стеклоиономерный цемент / композитный цемент фиксации", quantity: 1, unit: "доза", defaultCostRub: 650 },
		],
	},
	{
		id: "ortho_prep_zirconia_emax",
		titleRu: "Препарирование зуба под коронку ZrO2 / стеклокерамику (уступ 0.5–1.0 мм, ретракция нитью 00/0, А-силикон/3D-скан, бис-акрил)",
		shortLabel: "Препарирование ZrO2 / стеклокерамика",
		category: "prep_crown",
		defaultIcd10: "K08.1",
		defaultIcd10Label: "Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		anamnesis: "Плановое посещение по плану ортопедического лечения. Жалобы на косметический и функциональный дефект твердых тканей коронковой части зуба.",
		objective: "Маргинальная десна спокойна. На прицельной радиовизиографии (РВГ) периапикальные ткани без патологии, культя герметична.",
		treatment: "Инфильтрационная анестезия. Препарирование зуба под цельнокерамическую коронку (ZrO2 / дисиликат лития) с круговым уступом chamfer 0.5–1.0 мм. Ретракция десны нитями 00/0. Двухслойный оттиск А-силиконом / оптический интраоральный 3D-скан. Временная коронка из бис-акрилового композита на временный безевгенольный цемент.",
		recommendations: "Щадящий режим жевания на временную коронку. Дата примерки конструкции назначена.",
		clinicalServices: PREP_SERVICES,
		services: PREP_SERVICES,
		order804nServices: PREP_SERVICES,
		warehouseBundleType: "orthopedics_prep",
		consumables: [
			{ nameRu: "Нить ретракционная хлопчатобумажная вязаная #00", item: "Нить ретракционная хлопчатобумажная вязаная #00", quantity: 1, unit: "уп.", defaultCostRub: 850 },
			{ nameRu: "Прецизионный А-силикон база + корректор (VPS)", item: "Прецизионный А-силикон база + корректор (VPS)", quantity: 1, unit: "компл.", defaultCostRub: 1600 },
			{ nameRu: "Бис-акриловый композит для провизорных коронок", item: "Бис-акриловый композит для провизорных коронок", quantity: 1, unit: "доза", defaultCostRub: 450 },
		],
	},
	{
		id: "ortho_impression_scan",
		titleRu: "Снятие двухслойного слепка (А-силикон) / Оптический цифровой 3D-скан и регистрация прикуса",
		shortLabel: "Снятие слепка (А-силикон) / Скан",
		category: "impression_scan",
		defaultIcd10: "K08.1",
		defaultIcd10Label: "Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		anamnesis: "Плановое посещение. Этап высокоточного получения оттиска / цифрового сканирования для зуботехнической лаборатории.",
		objective: "Десневой край в области препарированных зубов спокоен. Уступ четко визуализируется, кровоточивость отсутствует.",
		treatment: "Ретракция десны техникой двух нитей. Снятие высокоточного двухслойного оттиска прецизионным А-силиконом / интраоральное сканирование челюстей. Регистрация центральной окклюзии жестким силиконовым регистратом прикуса.",
		recommendations: "Щадящий режим жевания на временные коронки. Назначен визит на примерку конструкции.",
		clinicalServices: IMPRESSION_SERVICES,
		services: IMPRESSION_SERVICES,
		order804nServices: IMPRESSION_SERVICES,
		warehouseBundleType: "orthopedics_impression",
		consumables: [
			{ nameRu: "А-силикон прецизионный (база + корректор)", item: "А-силикон прецизионный (база + корректор)", quantity: 1, unit: "компл.", defaultCostRub: 1600 },
			{ nameRu: "Окклюзионный силикон для регистрации прикуса", item: "Окклюзионный силикон для регистрации прикуса", quantity: 1, unit: "доза", defaultCostRub: 350 },
		],
	},
];
