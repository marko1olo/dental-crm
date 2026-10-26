import type { ThreeTierOption } from "../../patientCabinet/patientCabinetEngine.js";

export const PREMIUM_TIER_OPTION: ThreeTierOption = {
	tierId: "premium",
	tierNameRu: "Премиум",
	subtitleRu: "Керамика IPS e.max, имплантация Straumann и гарантия 5 лет",
	totalCostRub: 285000,
	warrantyMonths: 60,
	durationWeeks: 6,
	benefits: [
		"Ультратонкие цельнокерамические виниры и коронки IPS e.max CAD (Ivoclar)",
		"Премиальные швейцарские имплантаты Straumann BLX с гидрофильной поверхностью SLActive",
		"Максимальная официальная гарантия 5 лет + пожизненно на титановые имплантаты",
		"Индивидуальный персональный менеджер заботы 24/7",
		"Фотопротокол и цифровое моделирование улыбки Digital Smile Design",
	],
	stages: [
		{
			id: "tier-prem-st1",
			orderIndex: 1,
			titleRu: "Этап 1: SPA-профгигиена и отбеливание Flash",
			categoryRu: "Гигиена",
			teethFdi: ["11-48"],
			costRub: 25000,
			status: "completed",
			procedures: ["Комплексная гигиена (УЗ + Air-Flow + реминерализация)"],
			targetDateRu: "Выполнен",
		},
		{
			id: "tier-prem-st2",
			orderIndex: 2,
			titleRu: "Этап 2: Эндодонтия 3D под микроскопом и виниры IPS e.max",
			categoryRu: "Терапия",
			teethFdi: ["1.6", "2.5"],
			costRub: 110000,
			status: "in_progress",
			procedures: [
				"Лечение корневых каналов под микроскопом",
				"Керамический винир E.max (индивидуальная эстетика)",
			],
			targetDateRu: "В процессе",
		},
		{
			id: "tier-prem-st3",
			orderIndex: 3,
			titleRu: "Этап 3: Дентальная имплантация Straumann под ключ с коронкой E.max",
			categoryRu: "Хирургия",
			teethFdi: ["4.6"],
			costRub: 150000,
			status: "planned",
			procedures: [
				"Установка дентального имплантата под ключ",
				"Установка эстетической коронки (диоксид циркония / E.max)",
			],
			targetDateRu: "25.10.2026",
		},
	],
};
