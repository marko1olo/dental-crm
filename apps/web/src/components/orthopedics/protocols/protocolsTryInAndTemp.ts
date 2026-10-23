import type { OrthopedicProtocolPreset } from "./orthopedicProtocolTypes.js";

export const ORTHOPEDIC_TRY_IN_AND_TEMP_PROTOCOLS: readonly OrthopedicProtocolPreset[] = [
	{
		id: "ortho_temp_crown_luxatemp",
		titleRu: "Изготовление и фиксация временной коронки прямым методом (Luxatemp Star / Protemp 4 на Temp-Bond NE)",
		shortLabel: "Временная коронка (Luxatemp)",
		category: "temp_crown",
		defaultIcd10: "K08.1",
		defaultIcd10Label: "Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		anamnesis: "Плановое посещение на этап изготовления и фиксации временной провизорной конструкции. Жалоб нет.",
		objective: "Культя зуба препарирована с уступом, десна не воспалена. Пульпа витальна / культя герметично восстановлена.",
		treatment: "Внесение бис-акрилового композита (Luxatemp Star / Protemp 4) в силиконовый ключ. Финишная полировка дисками Sof-Lex. Фиксация на культю зуба на временный безевгенольный цемент Temp-Bond NE.",
		recommendations: "Не жевать вязкую и сверхтвердую пищу на сторону временной коронки. При расцементировке обратиться в клинику.",
		order804nServices: [
			{ code: "A16.07.004.001", nameRu: "Изготовление и фиксация временной провизорной коронки прямым методом (Luxatemp / Protemp 4)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 2500, priceRub: 2500 },
		],
		warehouseBundleType: "orthopedics_temporary",
		consumables: [
			{ nameRu: "Бис-акриловый композит Luxatemp Star / Protemp 4", item: "Бис-акриловый композит Luxatemp Star / Protemp 4", quantity: 1, unit: "доза", defaultCostRub: 450 },
			{ nameRu: "Цемент временный Temp-Bond NE", item: "Цемент временный Temp-Bond NE", quantity: 1, unit: "доза", defaultCostRub: 180 },
		],
	},
	{
		id: "ortho_try_in_framework_crown",
		titleRu: "Примерка каркаса / коронки из диоксида циркония / E.max (контроль краевого прилегания, контактных пунктов, окклюзии и цвета VITA)",
		shortLabel: "Примерка каркаса / коронки",
		category: "try_in",
		defaultIcd10: "Z51.8",
		defaultIcd10Label: "Ортопедическое лечение",
		anamnesis: "Плановое посещение на этап клинической примерки конструкции из ЗТЛ. Временная коронка удерживалась стабильно.",
		objective: "Временная коронка снята без повреждения культи зуба. Десневой край спокойный, бледно-розовый.",
		treatment: "Снятие временной коронки. Очистка культи зуба пастой. Примерка цельнокерамической коронки: проверка точности посадки и краевого прилегания зондом. Окклюзионный контроль бумагой Bausch 40 мкм. Повторная фиксация временной коронки на Temp-Bond NE.",
		recommendations: "Продолжать гигиену. Назначен визит на постоянную фиксацию конструкции.",
		order804nServices: [
			{ code: "A16.07.025", nameRu: "Примерка ортопедической конструкции (коронки, каркаса, мостовидного протеза)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 1500, priceRub: 1500 },
		],
	},
	{
		id: "ortho_permanent_cementation",
		titleRu: "Постоянная фиксация конструкции (ZrO2 / E.max) на стеклоиономер / композитный цемент (Fuji I / RelyX U200 / Panavia V5, рентген-контроль)",
		shortLabel: "Постоянная фиксация (RelyX / Fuji I)",
		category: "permanent_cementation",
		defaultIcd10: "Z51.8",
		defaultIcd10Label: "Ортопедическое лечение",
		anamnesis: "Плановое посещение на этап постоянной фиксации готовой конструкции из ЗТЛ. Конструкция глазурована.",
		objective: "Десневой контур сформирован идеально, краевой пародонт интактен. Культя зуба чистая, плотная.",
		treatment: "Снятие временной коронки. Пескоструйная обработка коронки Al2O3 50 мкм, нанесение праймера Monobond Plus. Нанесение цемента RelyX U200 / Fuji I на коронку. Фиксация на культю зуба. Удаление излишков цемента кюретой и флоссом. Полимеризация. Контрольный снимок РВГ: краевое прилегание точное, поддесневого цемента нет.",
		recommendations: "Не принимать пищу 2 часа. Контрольный осмотр через 6 месяцев.",
		order804nServices: [
			{ code: "A16.07.004", nameRu: "Восстановление зуба коронкой (постоянная ортопедическая конструкция из ЗТЛ)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 22000, priceRub: 22000 },
			{ code: "A16.07.004.002", nameRu: "Постоянная фиксация несъемной ортопедической конструкции", stageKind: "stage_3_orthopedics", suggestedPriceRub: 3000, priceRub: 3000 },
			{ code: "A06.07.007", nameRu: "Внутриротовой прицельный радиовизиографический снимок (контроль краевого прилегания и цемента)", stageKind: "stage_3_orthopedics", suggestedPriceRub: 750, priceRub: 750 },
		],
		warehouseBundleType: "orthopedics_cementation",
		consumables: [
			{ nameRu: "Композитный цемент RelyX U200 / Panavia V5", item: "Композитный цемент RelyX U200 / Panavia V5", quantity: 1, unit: "доза", defaultCostRub: 650 },
			{ nameRu: "Праймер керамики Monobond Plus", item: "Праймер керамики Monobond Plus", quantity: 1, unit: "доза", defaultCostRub: 250 },
		],
	},
];
