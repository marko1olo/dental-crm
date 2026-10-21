/**
 * DENTE CRM — Treatment Plan Roadmap 804n Translator
 * (Layer 1: Pure Utilities — 0 side effects)
 */

import type { RoadmapStageKind } from "./types.js";

export interface PatientDescriptionResult {
	friendlyTitle: string;
	categoryCode: "1" | "2";
	stageKind: RoadmapStageKind;
}

/**
 * 804n Code & Medical Term Translator to Patient-Friendly Clear Russian (B2C Human-Readable)
 */
export function translate804nToPatientDescription(code804n?: string, rawMedicalTitle?: string): PatientDescriptionResult {
	const cleanCode = (code804n || "").trim();
	const titleLower = (rawMedicalTitle || "").toLowerCase();

	// 1. Неотложная помощь и снятие боли
	const isEmergency =
		["A16.07.007", "A16.07.011", "A16.07.016"].includes(cleanCode) ||
		["неотложн", "острая боль", "пульпотомия", "вскрытие пародонтального абсцесса", "снятие боли"].some((k) =>
			titleLower.includes(k),
		);
	if (isEmergency) {
		return { friendlyTitle: "Купирование острой боли и неотложная помощь", categoryCode: "1", stageKind: "stage_1_emergency" };
	}

	// 2. Терапевтическая санация (Кариес, пульпит, эндодонтия, пломбы)
	const isTherapy =
		["A16.07.002", "A16.07.030", "A16.07.008", "A16.07.082"].some((c) => cleanCode.startsWith(c)) ||
		["кариес", "пульпит", "периодонтит", "пломб", "канал", "эндодонт", "реставраци"].some((k) =>
			titleLower.includes(k),
		);
	if (isTherapy) {
		let friendly = "Терапевтическое лечение зуба и установка эстетической пломбы";
		if (titleLower.includes("канал") || cleanCode.startsWith("A16.07.030") || cleanCode.startsWith("A16.07.008")) {
			friendly = "Лечение корневых каналов под микроскопом (эндодонтия)";
		} else if (titleLower.includes("кариес") || cleanCode.startsWith("A16.07.002")) {
			friendly = "Лечение кариеса с анатомической реставрацией нанокомпозитом";
		}
		return { friendlyTitle: friendly, categoryCode: "1", stageKind: "stage_2_therapy" };
	}

	// 3. Хирургия и имплантация (Удаление, имплантаты, синус-лифтинг, костная пластика)
	const isSurgery =
		["A16.07.054", "A16.07.041", "A16.07.001", "A16.07.055"].some((c) => cleanCode.startsWith(c)) ||
		["имплант", "удален", "синус-лифтинг", "костная пластика", "аугментац"].some((k) =>
			titleLower.includes(k),
		);
	if (isSurgery) {
		let friendly = "Хирургическая процедура и установка дентального имплантата";
		if (cleanCode.startsWith("A16.07.001") || titleLower.includes("удален")) {
			friendly = "Бережное (атравматичное) удаление несохранного зуба";
		} else if (cleanCode.startsWith("A16.07.054") || titleLower.includes("имплант")) {
			friendly = "Установка премиум дентального имплантата (титан)";
		} else if (titleLower.includes("синус") || titleLower.includes("костн")) {
			friendly = "Наращивание костной ткани (синус-лифтинг / остеопластика)";
		}
		return { friendlyTitle: friendly, categoryCode: "2", stageKind: "stage_3_surgery" };
	}

	// 4. Ортопедическое протезирование (Коронки, мосты, виниры, сканирование)
	const isOrtho =
		["A16.07.004", "A16.07.006", "A16.07.005", "A02.07.010"].some((c) => cleanCode.startsWith(c)) ||
		["коронк", "протез", "мост", "винир", "сканирован", "циркони", "e.max"].some((k) =>
			titleLower.includes(k),
		);
	if (isOrtho) {
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
	const isHygiene =
		["A16.07.051", "A16.07.020", "A16.07.025"].some((c) => cleanCode.startsWith(c)) ||
		["гигиен", "чистк", "air-flow", "airflow", "ультразвук", "полировк", "фторирован", "осмотр"].some((k) =>
			titleLower.includes(k),
		);
	if (isHygiene) {
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
