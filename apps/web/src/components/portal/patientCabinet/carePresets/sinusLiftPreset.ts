import type { CarePresetData } from "./careTypes.js";

export const SINUS_LIFT_CARE_PRESET: CarePresetData = {
	interventionType: "sinus_lift",
	typeNameRu: "Синус-лифтинг и костная пластика",
	defaultProcedureName: "Открытый/закрытый синус-лифтинг с костной аугментацией",
	recommendations: [
		{
			id: "sl_no_blow",
			icon: "ban",
			title: "КАТЕГОРИЧЕСКИ НЕ СМОРКАТЬСЯ 14 дней!",
			description: "Не сморкаться, чихать исключительно с открытым ртом, не надувать щеки и не пить через трубочку.",
			category: "restrictions",
			isUrgent: true,
			badgeText: "14 дней",
		},
		{
			id: "sl_cold",
			icon: "snowflake",
			title: "Прикладывать холод к щеке",
			description: "Холод по 15 минут с перерывами 30 минут в течение первых суток.",
			category: "cold",
		},
		{
			id: "sl_nasal_drops",
			icon: "droplet",
			title: "Сосудосуживающие капли в нос",
			description: "Закапывать капли в нос на стороне операции для сохранения соустья гайморовой пазухи.",
			category: "meds",
		},
	],
	medications: [
		{
			id: "sl_med_amoxi",
			name: "Амоксиклав 1000 мг (или Цифран СТ)",
			formRu: "Таблетки",
			dosageRu: "1 таблетка (875/125 мг)",
			frequencyRu: "2 раза в день во время еды",
			durationRu: "7 дней (строго по часам)",
			purposeRu: "Профилактика бактериального инфицирования костного графта",
			icon: "pill",
			isImportant: true,
		},
		{
			id: "sl_med_nazivin",
			name: "Називин 0.05% (капли назальные)",
			formRu: "Капли в нос",
			dosageRu: "1–2 капли в носовой ход на стороне операции",
			frequencyRu: "2–3 раза в день",
			durationRu: "5 дней",
			purposeRu: "Снятие отека слизистой и дренаж пазухи",
			icon: "droplet",
			isImportant: true,
		},
	],
	warningSigns: [
		"Обильные кровянистые или гнойные выделения из носа",
		"Температура выше 38°C и нарастающая пульсирующая боль в подглазничной области",
	],
	dietaryRules: ["Исключить горячую, острую пищу и напитки через трубочку"],
	hygieneRules: ["Ротовые ванночки с хлоргексидином 0.05% со 2-х суток без активного полоскания"],
	activityRestrictions: ["Категорически запрещены авиаперелеты, дайвинг и тяжелый спорт на 14–21 день"],
	nextVisitText: "Контрольный осмотр и снятие швов через 10–14 дней",
};
