import type { CarePresetData, CareRecommendationItem } from "./careTypes.js";

export const DEFAULT_CARIES_RECOMMENDATIONS: readonly CareRecommendationItem[] = [
	{
		id: "caries_numbness_food",
		icon: "ban",
		title: "Не есть до окончания анестезии (1.5–2 часа)",
		description: "Воздержитесь от приема пищи до восстановления чувствительности во избежание прикусывания щеки/губы.",
		category: "food",
		badgeText: "Первые 2 часа",
	},
	{
		id: "caries_cold_compress",
		icon: "snowflake",
		title: "Холод при дискомфорте",
		description: "При ноющей реакции приложите сухой холод к щеке на 10–15 минут.",
		category: "cold",
	},
	{
		id: "caries_painkiller",
		icon: "pill",
		title: "Обезболивающее: Нимесил или Нурофен",
		description: "При умеренной боли примите Нимесил 100 мг или Ибупрофен 400 мг после еды.",
		category: "meds",
	},
	{
		id: "caries_occlusion_check",
		icon: "scale",
		title: "Проверка прикуса при смыкании",
		description: "Если пломба завышает прикус, обратитесь в клинику для бесплатной пришлифовки.",
		category: "immediate",
		badgeText: "Важно",
	},
];

export const CARIES_CARE_PRESET: CarePresetData = {
	interventionType: "caries",
	typeNameRu: "Лечение кариеса и пломбирование",
	defaultProcedureName: "Лечение кариеса и эстетическая нанокомпозитная реставрация",
	recommendations: DEFAULT_CARIES_RECOMMENDATIONS,
	medications: [
		{
			id: "caries_med_nimesil",
			name: "Нимесил 100 мг",
			formRu: "Саше для суспензии",
			dosageRu: "1 саше в 100 мл воды",
			frequencyRu: "1–2 раза в день при боли",
			durationRu: "1–2 дня",
			purposeRu: "Снятие постпломбировочной чувствительности",
			icon: "pill",
		},
	],
	warningSigns: [
		"Ощущение завышения прикуса («пломба мешает смыкать зубы»)",
		"Острая самопроизвольная ночная или пульсирующая боль",
	],
	dietaryRules: ["Не принимать пищу до окончания действия анестезии (1.5–2 часа)"],
	hygieneRules: ["Бережная чистка мягкой щеткой без травмирования десны"],
	activityRestrictions: ["Ограничений по физической активности нет"],
	nextVisitText: "Контрольный профилактический осмотр через 6 месяцев",
};

export const ENDODONTICS_CARE_PRESET: CarePresetData = {
	interventionType: "endodontics",
	typeNameRu: "Эндодонтическое лечение каналов",
	defaultProcedureName: "Механическая и медикаментозная обработка корневых каналов под микроскопом",
	recommendations: [
		{
			id: "endo_numbness",
			icon: "ban",
			title: "Не принимать пищу до отхода анестезии",
			description: "Воздержитесь от еды 1.5–2 часа во избежание травмы слизистой.",
			category: "food",
		},
		{
			id: "endo_temp_seal",
			icon: "shield",
			title: "Беречь временную пломбу",
			description: "Не ковырять пломбу зубочистками и не жевать твердую пищу до постоянной реставрации.",
			category: "immediate",
		},
		{
			id: "endo_pain",
			icon: "pill",
			title: "Обезболивающее при накусывании",
			description: "Умеренная боль при накусывании в течение 3–5 дней нормальна. Принимайте Нимесил при необходимости.",
			category: "meds",
		},
	],
	medications: [
		{
			id: "endo_med_nimesil",
			name: "Нимесил 100 мг",
			formRu: "Саше",
			dosageRu: "1 саше в 100 мл воды",
			frequencyRu: "1–2 раза в день при боли",
			durationRu: "2–3 дня",
			purposeRu: "Снятие периодонтального воспаления",
			icon: "pill",
		},
	],
	warningSigns: [
		"Выпадение временной пломбы или появление лекарственного привкуса во рту",
		"Отек десны в области корня зуба или пульсирующая нарастающая боль",
	],
	dietaryRules: ["Исключить жевание на причинном зубе до завершения постоянной реставрации"],
	hygieneRules: ["Стандартная гигиена полости рта дважды в день"],
	activityRestrictions: ["Без существенных ограничений"],
	nextVisitText: "Следующий этап лечения или постоянная реставрация через 5–14 дней",
};
