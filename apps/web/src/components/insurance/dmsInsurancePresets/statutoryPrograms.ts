/**
 * statutoryPrograms.ts — Программы страхования ДМС
 */

import type { DmsProgramKey, DmsProgramPolicyDefinition } from "./types.js";

export const STATUTORY_DMS_PROGRAMS: Record<DmsProgramKey, DmsProgramPolicyDefinition> = {
	standard_therapy: {
		key: "standard_therapy",
		title: "Стандартная терапия и неотложная помощь",
		subtitle: "Базовый корпоративный пакет ДМС",
		defaultLimitKopecks: 10000000,
		isUnlimited: false,
		maxHygienePerYear: 1,
		coversOrthodontics: false,
		coversImplantation: false,
		coversVeneers: false,
		coversBleaching: false,
		coversCt3D: false,
		description: "Лечение кариеса, пульпита, периодонтита, местная анестезия, прицельная радиовизиография, удаление зубов по острой боли.",
	},
	vip_full_coverage: {
		key: "vip_full_coverage",
		title: "VIP Премиум (Полное покрытие)",
		subtitle: "Максимальный корпоративный пакет ДМС",
		defaultLimitKopecks: 30000000,
		isUnlimited: false,
		maxHygienePerYear: 2,
		coversOrthodontics: false,
		coversImplantation: false,
		coversVeneers: false,
		coversBleaching: false,
		coversCt3D: true,
		description: "Все виды терапевтического и хирургического лечения, профессиональная гигиена 2 раза в год, КЛКТ и ОПТГ без ограничений, ортопедия по согласованию.",
	},
	extended_surgery_hygiene: {
		key: "extended_surgery_hygiene",
		title: "Расширенная терапия, хирургия и гигиена",
		subtitle: "Оптимальный пакет для сотрудников",
		defaultLimitKopecks: 15000000,
		isUnlimited: false,
		maxHygienePerYear: 1,
		coversOrthodontics: false,
		coversImplantation: false,
		coversVeneers: false,
		coversBleaching: false,
		coversCt3D: false,
		description: "Терапевтическое лечение, удаление зубов любой сложности (включая ретинированные), резекция верхушек корней, профгигиена УЗ+AirFlow 1 раз в год.",
	},
	economy_emergency_only: {
		key: "economy_emergency_only",
		title: "Эконом (Неотложная помощь)",
		subtitle: "Минимальный пакет купирования острой боли",
		defaultLimitKopecks: 5000000,
		isUnlimited: false,
		maxHygienePerYear: 0,
		coversOrthodontics: false,
		coversImplantation: false,
		coversVeneers: false,
		coversBleaching: false,
		coversCt3D: false,
		description: "Купирование острого болевого синдрома, вскрытие периодонтального абсцесса, девитализация пульпы, экстренное удаление разрушенного зуба.",
	},
};
