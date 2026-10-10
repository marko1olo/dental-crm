/**
 * DENTE CRM — Treatment Plan Roadmap Price Helpers & 804n Translator
 * (Layer 1: Pure Utilities & Constants — 0 side effects)
 */

import React from "react";
import {
	HeartPulse,
	Scissors,
	ShieldCheck,
	Stethoscope,
} from "lucide-react";
import { DentalCrown } from "../../icons/DentalIcons.js";
import { kopecksToRub } from "@dental/shared";
import type { RoadmapStageKind, RoadmapStageMeta } from "./types.js";

/**
 * Formats integer kopecks into exact Russian rubles format: "12 500,00"
 */
export function formatKopecksToRubExact(kopecks: number): string {
	const rub = kopecksToRub(kopecks);
	return rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 804n Code & Medical Term Translator to Patient-Friendly Clear Russian (B2C Human-Readable)
 */
export function translate804nToPatientDescription(code804n?: string, rawMedicalTitle?: string): {
	friendlyTitle: string;
	categoryCode: "1" | "2";
	stageKind: RoadmapStageKind;
} {
	const cleanCode = (code804n || "").trim();
	const titleLower = (rawMedicalTitle || "").toLowerCase();

	// 1. Неотложная помощь и снятие боли
	if (
		cleanCode === "A16.07.007" ||
		cleanCode === "A16.07.011" ||
		cleanCode === "A16.07.016" ||
		titleLower.includes("неотложн") ||
		titleLower.includes("острая боль") ||
		titleLower.includes("пульпотомия") ||
		titleLower.includes("вскрытие пародонтального абсцесса") ||
		titleLower.includes("снятие боли")
	) {
		return {
			friendlyTitle: "Купирование острой боли и неотложная помощь",
			categoryCode: "1",
			stageKind: "stage_1_emergency",
		};
	}

	// 2. Терапевтическая санация (Кариес, пульпит, эндодонтия, пломбы)
	if (
		cleanCode.startsWith("A16.07.002") || // Кариес / пломбы
		cleanCode.startsWith("A16.07.030") || // Инструментальная обработка каналов
		cleanCode.startsWith("A16.07.008") || // Пломбирование каналов
		cleanCode.startsWith("A16.07.082") || // Восстановление зуба коронковой частью
		titleLower.includes("кариес") ||
		titleLower.includes("пульпит") ||
		titleLower.includes("периодонтит") ||
		titleLower.includes("пломб") ||
		titleLower.includes("канал") ||
		titleLower.includes("эндодонт") ||
		titleLower.includes("реставраци")
	) {
		let friendly = "Терапевтическое лечение зуба и установка эстетической пломбы";
		if (titleLower.includes("канал") || cleanCode.startsWith("A16.07.030") || cleanCode.startsWith("A16.07.008")) {
			friendly = "Лечение корневых каналов под микроскопом (эндодонтия)";
		} else if (titleLower.includes("кариес") || cleanCode.startsWith("A16.07.002")) {
			friendly = "Лечение кариеса с анатомической реставрацией нанокомпозитом";
		}
		return {
			friendlyTitle: friendly,
			categoryCode: "1",
			stageKind: "stage_2_therapy",
		};
	}

	// 3. Хирургия и имплантация (Удаление, имплантаты, синус-лифтинг, костная пластика)
	if (
		cleanCode.startsWith("A16.07.054") || // Имплантация
		cleanCode.startsWith("A16.07.041") || // Костная пластика
		cleanCode.startsWith("A16.07.001") || // Удаление
		cleanCode.startsWith("A16.07.055") || // Реконструкция
		titleLower.includes("имплант") ||
		titleLower.includes("удален") ||
		titleLower.includes("синус-лифтинг") ||
		titleLower.includes("костная пластика") ||
		titleLower.includes("аугментац")
	) {
		let friendly = "Хирургическая процедура и установка дентального имплантата";
		if (cleanCode.startsWith("A16.07.001") || titleLower.includes("удален")) {
			friendly = "Бережное (атравматичное) удаление несохранного зуба";
		} else if (cleanCode.startsWith("A16.07.054") || titleLower.includes("имплант")) {
			friendly = "Установка премиум дентального имплантата (титан)";
		} else if (titleLower.includes("синус") || titleLower.includes("костн")) {
			friendly = "Наращивание костной ткани (синус-лифтинг / остеопластика)";
		}
		return {
			friendlyTitle: friendly,
			categoryCode: "2", // Дорогостоящее лечение (Код 02)
			stageKind: "stage_3_surgery",
		};
	}

	// 4. Ортопедическое протезирование (Коронки, мосты, виниры, сканирование)
	if (
		cleanCode.startsWith("A16.07.004") || // Коронки
		cleanCode.startsWith("A16.07.006") || // Протезирование на имплантатах
		cleanCode.startsWith("A16.07.005") || // Мостовидные протезы
		cleanCode.startsWith("A02.07.010") || // 3D-сканирование
		titleLower.includes("коронк") ||
		titleLower.includes("протез") ||
		titleLower.includes("мост") ||
		titleLower.includes("винир") ||
		titleLower.includes("сканирован") ||
		titleLower.includes("циркони") ||
		titleLower.includes("e.max")
	) {
		let friendly = "Ортопедическое восстановление зуба керамической коронкой";
		if (titleLower.includes("имплант") || cleanCode.startsWith("A16.07.006")) {
			friendly = "Керамическая коронка из диоксида циркония с фиксацией на имплантате";
		} else if (titleLower.includes("скан") || cleanCode.startsWith("A02.07.010")) {
			friendly = "Цифровое интраоральное 3D-сканирование челюстей (без слепочной массы)";
		} else if (titleLower.includes("винир")) {
			friendly = "Керамический винир E.max для безупречной эстетики улыбки";
		}
		return {
			friendlyTitle: friendly,
			categoryCode: titleLower.includes("имплант") ? "2" : "1",
			stageKind: "stage_4_orthopedics",
		};
	}

	// 5. Профгигиена и контрольное наблюдение
	if (
		cleanCode.startsWith("A16.07.051") || // Профгигиена
		cleanCode.startsWith("A16.07.020") || // Удаление камня
		cleanCode.startsWith("A16.07.025") || // Фторирование
		titleLower.includes("гигиен") ||
		titleLower.includes("чистк") ||
		titleLower.includes("air-flow") ||
		titleLower.includes("airflow") ||
		titleLower.includes("ультразвук") ||
		titleLower.includes("полировк") ||
		titleLower.includes("фторирован") ||
		titleLower.includes("осмотр")
	) {
		return {
			friendlyTitle: "Комплексная гигиена: ультразвук + Air-Flow + реминерализация",
			categoryCode: "1",
			stageKind: "stage_5_hygiene_checkup",
		};
	}

	// Общий фоллбэк
	return {
		friendlyTitle: rawMedicalTitle || "Стоматологическая процедура",
		categoryCode: "1",
		stageKind: "stage_2_therapy",
	};
}

/**
 * 5 Canonical Roadmap Stage Metadata with Timelines, Preparation & Warranty
 */
export const CANONICAL_ROADMAP_META: Record<RoadmapStageKind, RoadmapStageMeta> = {
	stage_1_emergency: {
		stageNumber: 1,
		titleRu: "Этап 1: Неотложная помощь и снятие боли",
		subtitleRu: "Экстренная диагностика и устранение болевого синдрома",
		patientGoalRu: "Быстро снять острую боль, провести щадящее обезболивание и защитить зуб временной герметичной повязкой.",
		timelineRu: "1 визит • 30–45 минут (в день обращения)",
		preparationRu: "Сообщить врачу обо всех принимаемых препаратах и аллергиях; не прогревать щеку и не принимать аспирин до осмотра.",
		warrantyRu: "Купирование острого воспаления и временная герметизация до планового терапевтического этапа (до 14 дней).",
		icon: React.createElement(HeartPulse, { className: "w-4 h-4 text-rose-400" }),
	},
	stage_2_therapy: {
		stageNumber: 2,
		titleRu: "Этап 2: Терапевтическая санация",
		subtitleRu: "Лечение кариеса, каналов и художественная реставрация",
		patientGoalRu: "Полностью ликвидировать очаги кариеса и инфекции в каналах, укрепить зубы современными световыми нанокомпозитами.",
		timelineRu: "1–3 визита • от 45 минут до 1.5 часов на зуб (1–2 недели)",
		preparationRu: "Рекомендуется плотно поесть за 1.5–2 часа до визита (для стабильного сахара и меньшего слюноотделения), провести чистку зубов.",
		warrantyRu: "Гарантия на световые нанокомпозитные реставрации и эндодонтию — 2 года при условии прохождения профосмотра каждые 6 месяцев.",
		icon: React.createElement(Stethoscope, { className: "w-4 h-4 text-cyan-400" }),
	},
	stage_3_surgery: {
		stageNumber: 3,
		titleRu: "Этап 3: Хирургия и имплантация",
		subtitleRu: "Атравматичное удаление и установка имплантатов",
		patientGoalRu: "Бережно удалить несохранные корни, подготовить костную ткань и установить надежные титановые имплантаты.",
		timelineRu: "1–2 хирургических визита • период приживления (остеоинтеграции) 2–4 месяца",
		preparationRu: "Пройти 3D КТ челюстей; за 48 часов исключить алкоголь; при приёме антикоагулянтов согласовать временную коррекцию с врачом.",
		warrantyRu: "Пожизненная гарантия производителя на титановый имплантат + 5 лет гарантии клиники на хирургический протокол.",
		icon: React.createElement(Scissors, { className: "w-4 h-4 text-amber-400" }),
	},
	stage_4_orthopedics: {
		stageNumber: 4,
		titleRu: "Этап 4: Ортопедическое протезирование",
		subtitleRu: "3D-сканирование и установка циркониевых коронок",
		patientGoalRu: "Восстановить жевательную функцию и идеальную эстетику улыбки с помощью прочных коронок из диоксида циркония / E.max.",
		timelineRu: "2–3 визита • 7–14 дней на цифровое CAD/CAM фрезерование в зуботехнической лаборатории",
		preparationRu: "Проводится после полной терапевтической санации и приживления имплантатов; на визит сканирования специальная диета не нужна.",
		warrantyRu: "Гарантия 5 лет на монолитный диоксид циркония и керамику E.max при регулярном окклюзионном контроле.",
		icon: React.createElement(DentalCrown, { className: "w-4 h-4 text-purple-400" }),
	},
	stage_5_hygiene_checkup: {
		stageNumber: 5,
		titleRu: "Этап 5: Профгигиена и контрольное наблюдение",
		subtitleRu: "Защита десен, полировка и контрольный осмотр",
		patientGoalRu: "Очистить зубы от налета и камня методом Air-Flow, укрепить эмаль минералами и зафиксировать гарантию на лечение.",
		timelineRu: "1 визит • 45–60 минут (повторять каждые 6 месяцев)",
		preparationRu: "Специальной подготовки не требуется; в течение 2 часов после процедуры воздержаться от красящей пищи (кофе, чай, ягоды).",
		warrantyRu: "Бессрочная пролонгация гарантийных обязательств клиники на все ранее выполненные реставрации и конструкции.",
		icon: React.createElement(ShieldCheck, { className: "w-4 h-4 text-emerald-400" }),
	},
};
