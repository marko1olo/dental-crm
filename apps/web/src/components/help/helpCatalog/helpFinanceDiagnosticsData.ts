/**
 * DENTE CRM — Finance & Diagnostics Quick Guides Data
 * Authority: Mandate 8x (Living Human Clinical Language), Mandate 8b (<= 120 lines)
 */

import type { ClinicalGuideMeta } from "./helpTypes";

export const FINANCE_DIAGNOSTICS_GUIDES: readonly ClinicalGuideMeta[] = [
	{
		id: "cashier",
		category: "finance",
		title: "Касса, оплата и кассовые чеки (Комбинированный сплит)",
		shortTitle: "Касса и чеки",
		badge: "Финансы",
		description: "Комбинированная оплата (нал + карта + СБП QR + семейный депозит), печать чека без требования ИНН физлиц.",
		hotkeys: ["F9", "Enter", "Ctrl+Enter"],
		targetView: "finance",
		tourTrack: "reception_admin",
		keywords: [
			"касса", "оплата", "оплаты", "оплатить", "чек", "чеки", "счёт", "счет",
			"счета", "сплит", "нал", "наличные", "карта", "терминал", "pos", "СБП",
			"QR", "депозит", "аванс", "скидка", "расчет", "расчёт", "деньги",
			"ккт", "фискальный", "финансы",
		],
	},
	{
		id: "imaging",
		category: "diagnostics",
		title: "Снимки и 3D томография (КЛКТ)",
		shortTitle: "Снимки и КТ",
		badge: "Рентген и 3D",
		description: "Просмотр срезов MPR (аксиальный, корональный, сагиттальный), панорама ОПТГ, калибровка линейки и замер кости.",
		hotkeys: ["F7", "Tab", "Shift+Tab", "R", "W"],
		targetView: "imaging",
		tourTrack: "imaging_diagnostics",
		keywords: [
			"снимки", "снимок", "кт", "клкт", "dicom", "визиограф", "mpr",
			"панорама", "оптг", "рентген", "линейка", "замер", "кость",
			"гребень", "имплант", "срез", "аксиальный", "томография", "томограмма",
			"челюсть", "калибровка",
		],
	},
	{
		id: "leads",
		category: "finance",
		title: "Лиды, входящие звонки и телефония",
		shortTitle: "Звонки и лиды",
		badge: "Телефония",
		description: "Всплытие карточки звонящего пациента, быстрое создание лида и 4-колоночный канбан воронки обращений.",
		hotkeys: ["Alt+P", "Ctrl+Alt+L"],
		targetView: "communications",
		tourTrack: "reception_admin",
		keywords: [
			"лиды", "лид", "звонки", "звонок", "телефония", "атс", "канбан",
			"воронка", "обращения", "заявка", "заявки", "телефон", "номер",
			"пациент", "консультация", "доходимость",
		],
	},
	{
		id: "analytics",
		category: "finance",
		title: "Аналитика, отчёты и зарплатная ведомость",
		shortTitle: "Аналитика",
		badge: "Дашборд и KPI",
		description: "Выручка клиники в реальном времени, средний чек, загрузка кресел и автоматический расчёт сдельной зарплаты врачей.",
		hotkeys: ["Ctrl+Alt+A", "Ctrl+P"],
		targetView: "analytics",
		tourTrack: "reception_admin",
		keywords: [
			"аналитика", "выручка", "доход", "зарплата", "зарплаты", "отчеты",
			"отчет", "отчёты", "отчёт", "загрузка", "чек", "средний чек",
			"дашборд", "статистика", "кпи", "kpi", "сделка", "т-51", "1с",
		],
	},
];
