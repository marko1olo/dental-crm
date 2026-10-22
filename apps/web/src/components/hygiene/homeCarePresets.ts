/**
 * homeCarePresets.ts — Клинические шаблоны и рекомендации персонального домашнего ухода.
 * Соответствует Mandate 8b (Layer 1 Presets) и Mandate 8e (Автономия врача).
 */

export interface HygieneHomeCareRecommendations {
	toothbrush: string;
	monotufts: string;
	interdentalBrushes: string;
	floss: string;
	irrigator: string;
	toothpaste: string;
	rinseOrGel: string;
	hygieneRecallMonths: number;
	customNotes?: string;
}

export const DEFAULT_STANDARD_HOME_CARE: HygieneHomeCareRecommendations = {
	toothbrush:
		"Зубная щетка Curaprox Ultra Soft 5460 (мягкая щетина Curen, чистка выметающими движениями 2 раза в день по 2-3 минуты)",
	monotufts:
		"Монопучковая щетка Curaprox CS 1006 (точечная дочистка фиссур моляров и десневой борозды)",
	interdentalBrushes:
		"Межзубные ёршики Curaprox Prime (калибр 0.6 мм синий для фронта, 0.7 мм красный для премоляров, 0.8 мм желтый для моляров)",
	floss:
		"Объемная вощеная нить Splat Dental Floss / Oral-B Pro-Expert (ежедневно перед вечерней чисткой)",
	irrigator:
		"Ирригатор полости рта Waterpik / Revyline (мощность 2-4, после чистки щеткой, 1 раз в день вечером)",
	toothpaste:
		"Низкоабразивная зубная паста с RDA < 50 и фторидами 1450 ppm (Curaprox Enzycal 1450 / Biorepair Total Protective Repair)",
	rinseOrGel:
		"Реминерализующий гель GC Tooth Mousse (аппликации горошиной на ночь после чистки, не споласкивать)",
	hygieneRecallMonths: 6,
	customNotes:
		"Исключить горизонтальные пилящие движения щеткой во избежание клиновидных дефектов эмали.",
};

export const CROWDING_ORTHO_HOME_CARE: HygieneHomeCareRecommendations = {
	toothbrush:
		"Ортодонтическая зубная щетка Curaprox CS 5460 Ortho с углублением под брекет-систему / ретейнеры",
	monotufts:
		"Монопучковая щетка Curaprox CS 1006 / 1009 — обязательная очистка вокруг каждого замка брекета и звеньев ретейнера",
	interdentalBrushes:
		"Межзубные ёршики увеличенного калибра Curaprox CPS Regular 1.1–1.4 мм для очистки пространства под дугой",
	floss:
		"Суперфлосс Oral-B Super Floss с жестким кончиком для продевания под ортодонтическую дугу",
	irrigator:
		"Ирригатор полости рта с ортодонтической насадкой (ежедневно после каждого приема пищи)",
	toothpaste:
		"Зубная паста с гидроксиапатитом и энзимами RDA < 50 (Biorepair / Curaprox)",
	rinseOrGel:
		"Ополаскиватель с аминофторидом Elmex Защита от кариеса или Curasept ADS",
	hygieneRecallMonths: 3,
	customNotes:
		"Контроль налета в зонах скученности каждые 3 месяца. Использовать индикатор налета PlaqSearch 1 раз в неделю.",
};

export const PERIODONTITIS_HOME_CARE: HygieneHomeCareRecommendations = {
	toothbrush:
		"Ультрамягкая щетка Curaprox Velvet 12460 или Curaprox CS 5460 (атравматичная очистка воспаленного края десны)",
	monotufts:
		"Монопучковая щетка CS 708 для бережной атравматичной гигиены обнаженных шеек корней",
	interdentalBrushes:
		"Калиброванные ершики Curaprox Perio Plus (0.7-1.1 мм) с мягким введением в межзубные промежутки",
	floss: "Флосс с хлоргексидином Curaprox DF 820",
	irrigator:
		"Ирригатор с пародонтологической насадкой с мягким резиновым кончиком Pik Pocket на минимальном давлении (1-2)",
	toothpaste:
		"Пародонтологическая паста Parodontax без лаурилсульфата / Biorepair Gum Protection RDA < 40",
	rinseOrGel:
		"Дентальный гель Метрогил Дента или Curasept ADS 0.20% курсом 7–10 дней на десневой край",
	hygieneRecallMonths: 3,
	customNotes:
		"Категорически исключить жесткие щетки и зубочистки. Повторный замер пародонтальных карманов через 3 месяца.",
};
