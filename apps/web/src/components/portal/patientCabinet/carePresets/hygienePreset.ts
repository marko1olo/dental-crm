import type { CarePresetData } from "./careTypes.js";

export const HYGIENE_CARE_PRESET: CarePresetData = {
	interventionType: "hygiene",
	typeNameRu: "Профессиональная гигиена полости рта",
	defaultProcedureName: "Комплексная чистка Air-Flow, ультразвуковой скейлинг и фторирование",
	recommendations: [
		{
			id: "hyg_new_brush",
			icon: "brush",
			title: "Заменить зубную щетку на новую",
			description: "Обязательно смените зубную щетку в день проведения профгигиены на новую средней жесткости.",
			category: "hygiene",
			badgeText: "Сегодня",
		},
		{
			id: "hyg_no_color",
			icon: "ban",
			title: "Воздержаться от красителей на 24 часа",
			description: "Эмаль после полировки восприимчива к пигментам. Исключите чай, кофе, соки и курение на сутки.",
			category: "food",
		},
		{
			id: "hyg_fluoride",
			icon: "sparkles",
			title: "Не есть и не пить 30–60 минут",
			description: "Дайте реминерализующему фторлаку закрепиться на поверхности эмали.",
			category: "immediate",
		},
	],
	medications: [
		{
			id: "hyg_med_asepta",
			name: "Асепта адгезивный бальзам (или Пародонтоцид)",
			formRu: "Гель для десен",
			dosageRu: "Наносить на десневой край тонким слоем",
			frequencyRu: "2 раза в день после чистки зубов",
			durationRu: "3–5 дней",
			purposeRu: "Быстрое заживление десен после скейлинга",
			icon: "droplet",
		},
	],
	warningSigns: [
		"Кровоточивость десен, продолжающаяся более 3 суток после процедуры",
		"Острая непрекращающаяся реакция на холодную воду",
	],
	dietaryRules: ["Исключить красящую и раздражающую кислую пищу на 24 часа"],
	hygieneRules: ["Чистить зубы выметающими движениями от десны к краю, использовать флос и монопучок"],
	activityRestrictions: ["Без ограничений"],
	nextVisitText: "Плановая поддерживающая профессиональная гигиена через 6 месяцев",
};
