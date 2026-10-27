/**
 * DENTE CRM — Infrastructure, Warehouse & Lab Quick Guides Data
 * Authority: Mandate 8x (Living Human Clinical Language), Mandate 8b (<= 120 lines)
 */

import type { ClinicalGuideMeta } from "./helpTypes";

export const INFRASTRUCTURE_GUIDES: readonly ClinicalGuideMeta[] = [
	{
		id: "dental_lab",
		category: "lab_warehouse",
		title: "Зуботехническая лаборатория (ЗТЛ)",
		shortTitle: "Лаборатория",
		badge: "Наряды ЗТЛ",
		description: "Электронные наряды технику, выбор расцветки по шкале VITA (A1–D4), сроки примерки и готовности коронок.",
		hotkeys: ["Ctrl+L", "V"],
		targetView: "settings",
		tourTrack: "solo_doctor",
		keywords: [
			"лаборатория", "зтл", "наряд", "наряды", "техник", "коронка", "коронки",
			"зуб", "зубы", "vita", "вита", "цвет", "оттенок", "примерка", "винир",
			"виниры", "протез", "мост", "слепок", "скан", "stl", "каркас", "цирконий",
		],
	},
	{
		id: "inventory",
		category: "lab_warehouse",
		title: "Склад и материалы (Неблокируемый учёт)",
		shortTitle: "Склад",
		badge: "Материалы",
		description: "Фоновое автосписание по техкартам оказанных услуг, партии FEFO и мягкий расход без блокировки врача.",
		hotkeys: ["Ctrl+I", "F8"],
		targetView: "settings",
		tourTrack: "solo_doctor",
		keywords: [
			"склад", "материалы", "материал", "анестетик", "карпула", "карпулы",
			"бор", "перчатки", "списание", "автосписание", "овердрафт", "остатки",
			"накладная", "партия", "fefo", "срок годности", "инвентаризация", "техкарта",
		],
	},
	{
		id: "sanpin",
		category: "infrastructure",
		title: "Стерилизация, чистота и журнал автоклава",
		shortTitle: "Стерилизация",
		badge: "Чистота и автоклав",
		description: "Журнал автоклавирования, этикетки крафт-пакетов DataMatrix, оперативная фиксация проб азопирам/фенолфталеин.",
		hotkeys: ["Ctrl+Alt+S", "Ctrl+P"],
		targetView: "settings",
		tourTrack: "solo_doctor",
		keywords: [
			"стерилизация", "автоклав", "автоклавирование", "крафт-пакет", "крафт",
			"пакет", "пакеты", "азопирам", "проба", "пробы", "этикетка",
			"datamatrix", "чистота", "дезинфекция", "санпин", "роспотребнадзор", "журнал",
		],
	},
	{
		id: "lan_mesh",
		category: "infrastructure",
		title: "LAN Zero-Conf Mesh (Планшеты у кресла)",
		shortTitle: "LAN Mesh",
		badge: "Планшеты & Офлайн",
		description: "Сопряжение планшетов у кресла по 6-значному PIN / QR за 5 секунд и автономная работа без интернета.",
		hotkeys: ["Ctrl+Alt+N", "F5"],
		targetView: "settings",
		tourTrack: "solo_doctor",
		keywords: [
			"lan", "mesh", "планшет", "планшеты", "офлайн", "вайфай", "wifi",
			"сопряжение", "pin", "пин", "qr", "сеть", "локальная", "синхронизация",
			"автономия", "роутер", "планшет врача",
		],
	},
];
