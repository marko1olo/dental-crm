/**
 * DENTE CRM — Treatment Plan Roadmap Canonical Metadata
 */

import React from "react";
import {
	HeartPulse,
	Scissors,
	ShieldCheck,
	Stethoscope,
} from "lucide-react";
import { DentalCrown } from "../../icons/DentalIcons.js";
import type { RoadmapStageKind, RoadmapStageMeta } from "./types.js";

const EMERGENCY_META: RoadmapStageMeta = {
	stageNumber: 1,
	titleRu: "Этап 1: Неотложная помощь и снятие боли",
	subtitleRu: "Экстренная диагностика и устранение болевого синдрома",
	patientGoalRu: "Быстро снять острую боль, провести щадящее обезболивание и защитить зуб временной герметичной повязкой.",
	timelineRu: "1 визит • 30–45 минут (в день обращения)",
	preparationRu: "Сообщить врачу обо всех принимаемых препаратах и аллергиях; не прогревать щеку и не принимать аспирин до осмотра.",
	warrantyRu: "Купирование острого воспаления и временная герметизация до планового терапевтического этапа (до 14 дней).",
	icon: React.createElement(HeartPulse, { className: "w-4 h-4 text-rose-400" }),
};

const THERAPY_META: RoadmapStageMeta = {
	stageNumber: 2,
	titleRu: "Этап 2: Терапевтическая санация",
	subtitleRu: "Лечение кариеса, каналов и художественная реставрация",
	patientGoalRu: "Полностью ликвидировать очаги кариеса и инфекции в каналах, укрепить зубы современными световыми нанокомпозитами.",
	timelineRu: "1–3 визита • от 45 минут до 1.5 часов на зуб (1–2 недели)",
	preparationRu: "Рекомендуется плотно поесть за 1.5–2 часа до визита (для стабильного сахара и меньшего слюноотделения), провести чистку зубов.",
	warrantyRu: "Гарантия на световые нанокомпозитные реставрации и эндодонтию — 2 года при условии прохождения профосмотра каждые 6 месяцев.",
	icon: React.createElement(Stethoscope, { className: "w-4 h-4 text-cyan-400" }),
};

const SURGERY_META: RoadmapStageMeta = {
	stageNumber: 3,
	titleRu: "Этап 3: Хирургия и имплантация",
	subtitleRu: "Атравматичное удаление и установка имплантатов",
	patientGoalRu: "Бережно удалить несохранные корни, подготовить костную ткань и установить надежные титановые имплантаты.",
	timelineRu: "1–2 хирургических визита • период приживления (остеоинтеграции) 2–4 месяца",
	preparationRu: "Пройти 3D КТ челюстей; за 48 часов исключить алкоголь; при приёме антикоагулянтов согласовать временную коррекцию с врачом.",
	warrantyRu: "Пожизненная гарантия производителя на титановый имплантат + 5 лет гарантии клиники на хирургический протокол.",
	icon: React.createElement(Scissors, { className: "w-4 h-4 text-amber-400" }),
};

const ORTHOPEDICS_META: RoadmapStageMeta = {
	stageNumber: 4,
	titleRu: "Этап 4: Ортопедическое протезирование",
	subtitleRu: "3D-сканирование и установка циркониевых коронок",
	patientGoalRu: "Восстановить жевательную функцию и идеальную эстетику улыбки с помощью прочных коронок из диоксида циркония / E.max.",
	timelineRu: "2–3 визита • 7–14 дней на цифровое CAD/CAM фрезерование в зуботехнической лаборатории",
	preparationRu: "Проводится после полной терапевтической санации и приживления имплантатов; на визит сканирования специальная диета не нужна.",
	warrantyRu: "Гарантия 5 лет на монолитный диоксид циркония и керамику E.max при регулярном окклюзионном контроле.",
	icon: React.createElement(DentalCrown, { className: "w-4 h-4 text-purple-400" }),
};

const HYGIENE_META: RoadmapStageMeta = {
	stageNumber: 5,
	titleRu: "Этап 5: Профгигиена и контрольное наблюдение",
	subtitleRu: "Защита десен, полировка и контрольный осмотр",
	patientGoalRu: "Очистить зубы от налета и камня методом Air-Flow, укрепить эмаль минералами и зафиксировать гарантию на лечение.",
	timelineRu: "1 визит • 45–60 минут (повторять каждые 6 месяцев)",
	preparationRu: "Специальной подготовки не требуется; в течение 2 часов после процедуры воздержаться от красящей пищи (кофе, чай, ягоды).",
	warrantyRu: "Бессрочная пролонгация гарантийных обязательств клиники на все ранее выполненные реставрации и конструкции.",
	icon: React.createElement(ShieldCheck, { className: "w-4 h-4 text-emerald-400" }),
};

export const CANONICAL_ROADMAP_META: Record<RoadmapStageKind, RoadmapStageMeta> = {
	stage_1_emergency: EMERGENCY_META,
	stage_2_therapy: THERAPY_META,
	stage_3_surgery: SURGERY_META,
	stage_4_orthopedics: ORTHOPEDICS_META,
	stage_5_hygiene_checkup: HYGIENE_META,
	urgent: EMERGENCY_META,
	sanitation: THERAPY_META,
	therapy: THERAPY_META,
	reconstruction: ORTHOPEDICS_META,
	maintenance: HYGIENE_META,
};

export function normalizeRoadmapStageKind(kind: string | RoadmapStageKind | undefined): RoadmapStageKind {
	if (!kind) return "stage_2_therapy";
	const clean = String(kind).trim();
	switch (clean) {
		case "urgent":
		case "stage_1_emergency":
			return "stage_1_emergency";
		case "therapy":
		case "sanitation":
		case "stage_1_therapy":
		case "stage_2_therapy":
			return "stage_2_therapy";
		case "stage_2_surgery":
		case "stage_3_surgery":
			return "stage_3_surgery";
		case "reconstruction":
		case "stage_3_orthopedics":
		case "stage_4_orthopedics":
			return "stage_4_orthopedics";
		case "maintenance":
		case "stage_5_periodontics":
		case "stage_5_hygiene_checkup":
			return "stage_5_hygiene_checkup";
		default:
			return clean in CANONICAL_ROADMAP_META ? (clean as RoadmapStageKind) : "stage_2_therapy";
	}
}
