import type { CarePresetData } from "./careTypes.js";

export const WHITENING_CARE_PRESET: CarePresetData = {
	interventionType: "whitening",
	typeNameRu: "Клиническое отбеливание зубов",
	defaultProcedureName: "Кабинетное отбеливание Flash / Zoom 4 с реминерализацией",
	recommendations: [
		{
			id: "wh_white_diet",
			icon: "ban",
			title: "Белая диета на 48–72 часа (строго!)",
			description: "Категорически исключить все красящие продукты: кофе, черный/зеленый чай, красное вино, ягоды, свеклу, соевый соус, шоколад и курение.",
			category: "food",
			isUrgent: true,
			badgeText: "48-72 ч",
		},
		{
			id: "wh_sens_toothpaste",
			icon: "shield",
			title: "Десенсибилизирующая паста",
			description: "Чистить зубы пастой для чувствительных зубов (Sensodyne / Biorepair) и наносить гель Relief.",
			category: "meds",
		},
		{
			id: "wh_no_smoking",
			icon: "ban",
			title: "Отказ от курения и красителей",
			description: "Табачный дым и смолы вызывают мгновенное стойкое окрашивание открытых микропор эмали.",
			category: "restrictions",
			badgeText: "48 часов",
		},
	],
	medications: [
		{
			id: "wh_med_relief",
			name: "Гель Relief ACP (или Tooth Mousse)",
			formRu: "Гель в тубе",
			dosageRu: "Наносить в каппу или на зубы на 30 минут",
			frequencyRu: "1–2 раза в день",
			durationRu: "5–7 дней",
			purposeRu: "Реминерализация эмали и устранение гиперестезии",
			icon: "droplet",
			isImportant: true,
		},
	],
	warningSigns: [
		"Острая нестерпимая стреляющая боль от воздуха или слюны",
		"Появление белых пятен или раздражения на десневом крае",
	],
	dietaryRules: [
		"Строжайшая белая диета: только белое мясо, рис, макароны без соуса, молоко, вода, белая рыба",
	],
	hygieneRules: [
		"Мягкая зубная щетка, отказ от абразивных и отбеливающих паст на 2 недели",
	],
	activityRestrictions: ["Без ограничений"],
	nextVisitText: "Контрольный осмотр и оценка стабилизации цвета по шкале VITA через 14 дней",
};

export const ORTHODONTICS_CARE_PRESET: CarePresetData = {
	interventionType: "orthodontics",
	typeNameRu: "Установка и активация брекетов / элайнеров",
	defaultProcedureName: "Фиксация брекет-системы / выдача ортодонтических элайнеров",
	recommendations: [
		{
			id: "ortho_soft_food",
			icon: "soup",
			title: "Мягкая диета в первые 3–5 дней",
			description: "Зубы будут испытывать тянущее давление. Питайтесь пюре, йогуртами, супами.",
			category: "food",
		},
		{
			id: "ortho_wax",
			icon: "shield",
			title: "Ортодонтический воск при натирании",
			description: "Если замок или дуга натирает щеку, заклейте элемент кусочком ортодонтического воска.",
			category: "immediate",
		},
		{
			id: "ortho_special_hygiene",
			icon: "brush",
			title: "Ортодонтическая гигиена и ершики",
			description: "Чистите зубы после каждого приема пищи V-образной щеткой, монопучком и ершиками.",
			category: "hygiene",
		},
	],
	medications: [],
	warningSigns: [
		"Отклейка брекета от зуба или соскакивание дуги",
		"Травмирование щеки колющим концом дуги",
	],
	dietaryRules: [
		"Исключить вязкую карамель, ириски, жевательную резинку и жесткие орехи",
	],
	hygieneRules: [
		"Чистить зубы после каждого приема пищи монопучковой щеткой и ершиками",
	],
	activityRestrictions: [
		"При контактных видах спорта использовать индивидуальную защитную капу",
	],
	nextVisitText: "Плановая активация дуги через 4–6 недель",
};
