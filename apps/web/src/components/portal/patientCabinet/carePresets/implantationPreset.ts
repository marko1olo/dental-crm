import type { CarePresetData } from "./careTypes.js";

export const IMPLANTATION_CARE_PRESET: CarePresetData = {
	interventionType: "implantation",
	typeNameRu: "Дентальная имплантация",
	defaultProcedureName: "Установка дентального имплантата с заглушкой / формирователем десны",
	recommendations: [
		{
			id: "imp_cold",
			icon: "snowflake",
			title: "Прикладывать холод к щеке",
			description: "Прикладывать сухой холод через салфетку по 15 минут в течение первых суток.",
			category: "cold",
		},
		{
			id: "imp_no_chew",
			icon: "ban",
			title: "Не жевать на стороне имплантации",
			description: "Исключить жевательное давление на зону операции до приживления кости.",
			category: "food",
		},
		{
			id: "imp_antiseptic",
			icon: "cup",
			title: "Антисептические ротовые ванночки",
			description: "Ванночки с Хлоргексидином 0.05% со 2-х суток 3 раза в день после еды.",
			category: "hygiene",
		},
	],
	medications: [
		{
			id: "imp_med_amoxi",
			name: "Амоксиклав 1000 мг (или Сумамед 500 мг)",
			formRu: "Таблетки",
			dosageRu: "1 таблетка после еды",
			frequencyRu: "2 раза в день",
			durationRu: "5–7 дней",
			purposeRu: "Антибактериальная защита зоны остеоинтеграции имплантата",
			icon: "pill",
			isImportant: true,
		},
		{
			id: "imp_med_nimesil",
			name: "Нимесил 100 мг",
			formRu: "Саше для суспензии",
			dosageRu: "1 саше в воде",
			frequencyRu: "2 раза в день при болях",
			durationRu: "3–4 дня",
			purposeRu: "Обезболивание и купирование отека",
			icon: "pill",
		},
	],
	warningSigns: [
		"Непрекращающееся кровотечение из зоны швов более 2 часов",
		"Подвижность формирователя десны или острая распирающая боль на 4–5 день",
	],
	dietaryRules: ["Мягкая теплая пища, исключить твердые и волокнистые продукты на 14 дней"],
	hygieneRules: ["Зубы чистить аккуратно, обходя швы; со 2-го дня ротовые ванночки Хлоргексидина"],
	activityRestrictions: ["Запрещены бани, сауны, интенсивный спорт и переохлаждение на 7–10 дней"],
	nextVisitText: "Контрольный осмотр и снятие швов через 10–14 дней",
};
