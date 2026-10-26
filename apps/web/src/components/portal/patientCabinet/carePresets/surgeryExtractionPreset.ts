import type { CarePresetData } from "./careTypes.js";

export const EXTRACTION_CARE_PRESET: CarePresetData = {
	interventionType: "extraction",
	typeNameRu: "Хирургическое удаление зуба",
	defaultProcedureName: "Атравматичное удаление зуба с сохранением объема лунки",
	recommendations: [
		{
			id: "ext_gauze",
			icon: "droplet",
			title: "Удалить марлевый тампон через 20 минут",
			description: "Аккуратно сплюньте марлевый тампон через 20 минут. Не держите дольше.",
			category: "immediate",
			badgeText: "20 мин",
		},
		{
			id: "ext_no_rinse",
			icon: "ban",
			title: "КАТЕГОРИЧЕСКИ НЕ ПОЛОСКАТЬ РОТ 24 часа!",
			description: "Не полоскать рот и не вымывать кровяной сгусток из лунки!",
			category: "restrictions",
			isUrgent: true,
			badgeText: "Критично",
		},
		{
			id: "ext_cold_pack",
			icon: "snowflake",
			title: "Прикладывать холод в первые сутки",
			description: "Сухой лед через полотенце к щеке: 15 минут холод, 20 минут перерыв.",
			category: "cold",
		},
		{
			id: "ext_no_heat",
			icon: "flame",
			title: "Исключить тепловые процедуры и спорт",
			description: "Запрещены горячие ванны, сауны, бани и физнагрузки на 3 дня.",
			category: "restrictions",
		},
	],
	medications: [
		{
			id: "ext_med_nimesil",
			name: "Нимесил 100 мг",
			formRu: "Саше для суспензии",
			dosageRu: "1 саше после еды",
			frequencyRu: "2 раза в день",
			durationRu: "3–4 дня",
			purposeRu: "Обезболивание и снятие отека",
			icon: "pill",
			isImportant: true,
		},
	],
	warningSigns: [
		"Неостанавливающееся кровотечение из лунки более 2 часов",
		"Нарастающий отек щеки на 3–4 сутки, температура выше 38°C",
	],
	dietaryRules: ["Мягкая, негорячая пища на противоположной стороне 3 дня"],
	hygieneRules: ["Чистить зубы без затрагивания зоны удаленного зуба, ванночки хлоргексидина со 2-х суток"],
	activityRestrictions: ["Исключить спорт, бани, сауны и горячие ванны на 3–5 дней"],
	nextVisitText: "Осмотр лунки и снятие швов через 7–10 дней",
};
