import type { DisinfectantBrandPreset } from "./disinfectionTypes";

export const STATUTORY_DISINFECTANTS_CATALOG: readonly DisinfectantBrandPreset[] = [
	{
		id: "alaminol",
		nameRu: "Аламинол",
		activeIngredientRu: "ЧАС (алкилдиметилбензиламмоний хлорид 5%) + Глутаровый альдегид (8%)",
		standardWipingRateMlPerM2: 100,
		standardSprayingRateMlPerM2: 200,
		standardImmersionLitersPerSet: 2.0,
		availableConcentrations: [
			{ percent: 1.0, exposureMinutes: 60, targetRegimeRu: "Бактерицидный (текущие уборки)", recommendedUsageRu: "Поверхности мебели, полы" },
			{ percent: 3.0, exposureMinutes: 60, targetRegimeRu: "Вирулицидный (генеральные уборки терапии)", recommendedUsageRu: "Терапевтические кабинеты, гепатиты, ВИЧ" },
			{ percent: 5.0, exposureMinutes: 60, targetRegimeRu: "Генеральная уборка операционной / хирургии", recommendedUsageRu: "Хирургические и стерилизационные блоки" },
			{ percent: 8.0, exposureMinutes: 30, targetRegimeRu: "Усиленный режим экспресс-обработки", recommendedUsageRu: "Сокращенная экспозиция в оперблоке" },
		],
	},
	{
		id: "brilliant_classic",
		nameRu: "Бриллиант Классик",
		activeIngredientRu: "ЧАС (алкилдиметилбензиламмоний хлорид) + Глутаровый альдегид + ПАВ",
		standardWipingRateMlPerM2: 100,
		standardSprayingRateMlPerM2: 150,
		standardImmersionLitersPerSet: 2.0,
		availableConcentrations: [
			{ percent: 1.0, exposureMinutes: 60, targetRegimeRu: "Бактерицидный / Текущая уборка", recommendedUsageRu: "Полы, стены, оборудование" },
			{ percent: 2.0, exposureMinutes: 60, targetRegimeRu: "Вирулицидный режим генеральной уборки", recommendedUsageRu: "Генеральная уборка терапии и ортопедии" },
			{ percent: 3.0, exposureMinutes: 30, targetRegimeRu: "Хирургический блок / Экспресс", recommendedUsageRu: "Поверхности хирургического кабинета" },
		],
	},
	{
		id: "septolit_tetra",
		nameRu: "Септолит Тетра",
		activeIngredientRu: "Третичные амины + ЧАС + Полигексаметиленгуанидин (ПГМГ)",
		standardWipingRateMlPerM2: 100,
		standardSprayingRateMlPerM2: 150,
		standardImmersionLitersPerSet: 2.0,
		availableConcentrations: [
			{ percent: 0.5, exposureMinutes: 60, targetRegimeRu: "Бактерицидный режим", recommendedUsageRu: "Текущие влажные уборки кабинетов" },
			{ percent: 1.0, exposureMinutes: 60, targetRegimeRu: "Вирулицидный режим (СанПиН 3.3686-21)", recommendedUsageRu: "Генеральные уборки всех видов кабинетов" },
			{ percent: 2.0, exposureMinutes: 30, targetRegimeRu: "Усиленный противотуберкулезный режим", recommendedUsageRu: "Хирургия, имплантология, ЦСО" },
		],
	},
	{
		id: "avansept",
		nameRu: "Авансепт",
		activeIngredientRu: "Полигексаметиленбигуанидин гидрохлорид + ЧАС",
		standardWipingRateMlPerM2: 100,
		standardSprayingRateMlPerM2: 200,
		standardImmersionLitersPerSet: 2.0,
		availableConcentrations: [
			{ percent: 1.0, exposureMinutes: 60, targetRegimeRu: "Стандартный вирулицидный", recommendedUsageRu: "Генеральные уборки стоматологических кабинетов" },
			{ percent: 2.0, exposureMinutes: 30, targetRegimeRu: "Хирургический блок", recommendedUsageRu: "Повышенная инфекционная безопасность" },
		],
	},
];
