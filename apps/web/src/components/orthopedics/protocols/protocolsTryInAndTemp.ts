import type { OrthopedicProtocolPreset, OrthopedicServiceItem } from "./orthopedicProtocolTypes.js";

const TEMP_CROWN_SERVICES: readonly OrthopedicServiceItem[] = [
	{ code: "A16.07.004.001", nameRu: "Изготовление и фиксация временной провизорной коронки прямым методом (бис-акриловый композит)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 2500, priceRub: 2500 },
];

const TRY_IN_SERVICES: readonly OrthopedicServiceItem[] = [
	{ code: "A16.07.025", nameRu: "Примерка ортопедической конструкции (коронки, каркаса, мостовидного протеза)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 1500, priceRub: 1500 },
];

const CEMENTATION_SERVICES: readonly OrthopedicServiceItem[] = [
	{ code: "A16.07.004", nameRu: "Восстановление зуба коронкой (постоянная ортопедическая конструкция из ЗТЛ)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 22000, priceRub: 22000 },
	{ code: "A16.07.004.002", nameRu: "Постоянная фиксация несъемной ортопедической конструкции", stageKind: "stage_3_orthopedics", suggestedPriceRub: 3000, priceRub: 3000 },
	{ code: "A06.07.007", nameRu: "Внутриротовой прицельный радиовизиографический снимок (контроль краевого прилегания и цемента)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 750, priceRub: 750 },
];

export const ORTHOPEDIC_TRY_IN_AND_TEMP_PROTOCOLS: readonly OrthopedicProtocolPreset[] = [
	{
		id: "ortho_temp_crown_luxatemp",
		titleRu: "Изготовление и фиксация временной коронки прямым методом (бис-акриловый композит, безевгенольный цемент)",
		shortLabel: "Временная коронка (бис-акрил)",
		category: "temp_crown",
		defaultIcd10: "K08.1",
		defaultIcd10Label: "Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		anamnesis: "Плановое посещение на этап изготовления и фиксации временной провизорной конструкции. Жалоб нет.",
		objective: "Культя зуба препарирована с уступом, десна не воспалена. Пульпа витальна / культя герметично восстановлена.",
		treatment: "Внесение бис-акрилового композита для провизорных конструкций в силиконовый ключ. Финишная контурная полировка гибкими абразивными дисками. Фиксация на культю зуба на временный безевгенольный цемент.",
		recommendations: "Не жевать вязкую и сверхтвердую пищу на сторону временной коронки. При расцементировке обратиться в клинику.",
		clinicalServices: TEMP_CROWN_SERVICES,
		services: TEMP_CROWN_SERVICES,
		order804nServices: TEMP_CROWN_SERVICES,
		warehouseBundleType: "orthopedics_temporary",
		consumables: [
			{ nameRu: "Бис-акриловый композит для провизорных коронок", item: "Бис-акриловый композит для провизорных коронок", quantity: 1, unit: "доза", defaultCostRub: 450 },
			{ nameRu: "Временный безевгенольный цемент", item: "Временный безевгенольный цемент", quantity: 1, unit: "доза", defaultCostRub: 180 },
		],
	},
	{
		id: "ortho_try_in_framework_crown",
		titleRu: "Примерка каркаса / коронки из диоксида циркония / пресс-керамики (контроль краевого прилегания, контактных пунктов, окклюзии и цвета VITA)",
		shortLabel: "Примерка каркаса / коронки",
		category: "try_in",
		defaultIcd10: "Z51.8",
		defaultIcd10Label: "Ортопедическое лечение",
		anamnesis: "Плановое посещение на этап клинической примерки конструкции из ЗТЛ. Временная коронка удерживалась стабильно.",
		objective: "Временная коронка снята без повреждения культи зуба. Десневой край спокойный, бледно-розовый.",
		treatment: "Снятие временной коронки. Очистка культи зуба пастой. Примерка цельнокерамической коронки: проверка точности посадки и краевого прилегания зондом. Окклюзионный контроль артикуляционной бумагой 40 мкм. Повторная фиксация временной коронки на временный безевгенольный цемент.",
		recommendations: "Продолжать гигиену. Назначен визит на постоянную фиксацию конструкции.",
		clinicalServices: TRY_IN_SERVICES,
		services: TRY_IN_SERVICES,
		order804nServices: TRY_IN_SERVICES,
		warehouseBundleType: undefined,
		consumables: undefined,
	},
	{
		id: "ortho_permanent_cementation",
		titleRu: "Постоянная фиксация конструкции (ZrO2 / стеклокерамика) на стеклоиономер / композитный цемент (рентген-контроль)",
		shortLabel: "Постоянная фиксация (цемент)",
		category: "permanent_cementation",
		defaultIcd10: "Z51.8",
		defaultIcd10Label: "Ортопедическое лечение",
		anamnesis: "Плановое посещение на этап постоянной фиксации готовой конструкции из ЗТЛ. Конструкция глазурована.",
		objective: "Десневой контур сформирован идеально, краевой пародонт интактен. Культя зуба чистая, плотная.",
		treatment: "Снятие временной коронки. Пескоструйная обработка коронки Al2O3 50 мкм, нанесение адгезивного праймера керамики (силан / MDP). Нанесение цемента двойного отверждения / СИЦ на коронку. Фиксация на культю зуба. Удаление излишков цемента кюретой и флоссом. Полимеризация. Контрольный снимок РВГ: краевое прилегание точное, поддесневого цемента нет.",
		recommendations: "Не принимать пищу 2 часа. Контрольный осмотр через 6 месяцев.",
		clinicalServices: CEMENTATION_SERVICES,
		services: CEMENTATION_SERVICES,
		order804nServices: CEMENTATION_SERVICES,
		warehouseBundleType: "orthopedics_cementation",
		consumables: [
			{ nameRu: "Композитный цемент двойного отверждения / СИЦ", item: "Композитный цемент двойного отверждения / СИЦ", quantity: 1, unit: "доза", defaultCostRub: 650 },
			{ nameRu: "Универсальный праймер керамики (силан / MDP)", item: "Универсальный праймер керамики (силан / MDP)", quantity: 1, unit: "доза", defaultCostRub: 250 },
		],
	},
];
