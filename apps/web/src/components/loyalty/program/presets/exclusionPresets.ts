export interface LoyaltyExclusionRule {
	readonly id: string;
	readonly categoryNameRu: string;
	readonly isExcludedFromBonusRedemption: boolean;
	readonly isExcludedFromBonusAccrual: boolean;
	readonly reasonRu: string;
}

export const LOYALTY_EXCLUSION_RULES: readonly LoyaltyExclusionRule[] = [
	{
		id: "excl_lab",
		categoryNameRu: "Лабораторные расходы зуботехника (CAD/CAM, цирконий, E.max)",
		isExcludedFromBonusRedemption: true,
		isExcludedFromBonusAccrual: false,
		reasonRu: "Прямые затраты на стороннюю зуботехническую лабораторию не могут компенсироваться бонусами клиники.",
	},
	{
		id: "excl_implant_hardware",
		categoryNameRu: "Титановые имплантаты и абатменты (Nobel, Straumann, Osstem)",
		isExcludedFromBonusRedemption: true,
		isExcludedFromBonusAccrual: false,
		reasonRu: "Стоимость закупки титанового винта и формирователя десны исключается из базы списания баллов.",
	},
	{
		id: "excl_promo_bundle",
		categoryNameRu: "Услуги по спецпредложениям и акционным пакетам",
		isExcludedFromBonusRedemption: true,
		isExcludedFromBonusAccrual: false,
		reasonRu: "Скидка по акции и оплата бонусами не суммируются на одну и ту же позицию прейскуранта.",
	},
	{
		id: "excl_retail_oral_care",
		categoryNameRu: "Аптечная витрина и товары для домашней гигиены (Curaprox, Marvis)",
		isExcludedFromBonusRedemption: false,
		isExcludedFromBonusAccrual: true,
		reasonRu: "За покупку зубных щеток и паст бонусы не начисляются ввиду минимальной торговой наценки.",
	},
];

export const QUICK_REDEMPTION_PRESETS_RUB: readonly number[] = [500, 1000, 2000, 5000];
