/**
 * statutoryExclusions.ts — Правила исключений из страхового покрытия ДМС
 */

import type { DmsStatutoryExclusionRule } from "./types.js";

export const STATUTORY_DMS_EXCLUSION_RULES: readonly DmsStatutoryExclusionRule[] = [
	{
		ruleId: "EXCL-01-IMPLANT",
		code: "A16.07.054",
		title: "Дентальная имплантация и остеопластика",
		reasonDescription: "Внутрикостная дентальная имплантация, установка формирователей десны, синус-лифтинг и костная пластика не входят в программы ДМС.",
		matchingKeywords: ["имплант", "имплантат", "имплантация", "синус-лифтинг", "остеопластика", "мембрана bio-oss"],
		matchingNomenclatureCodes: ["A16.07.054", "A16.07.054.001", "A16.07.041"],
		excludedInPrograms: ["standard_therapy", "extended_surgery_hygiene", "economy_emergency_only"],
		allowsPreAuthOverride: true,
	},
	{
		ruleId: "EXCL-02-VENEER",
		code: "A16.07.003",
		title: "Эстетическая ортопедия, виниры и накладки",
		reasonDescription: "Установка керамических виниров, люминиров и косметических коронок без признаков функционального разрушения зуба является исключением.",
		matchingKeywords: ["винир", "люминир", "e.max", "эстетическая накладка", "косметическая реставрация"],
		matchingNomenclatureCodes: ["A16.07.003", "A16.07.003.001"],
		excludedInPrograms: ["standard_therapy", "extended_surgery_hygiene", "economy_emergency_only", "vip_full_coverage"],
		allowsPreAuthOverride: false,
	},
	{
		ruleId: "EXCL-03-ORTHO",
		code: "A16.07.047",
		title: "Ортодонтическое лечение (брекеты, элайнеры)",
		reasonDescription: "Коррекция прикуса с применением несъемных брекет-систем, пластинок и прозрачных кап-элайнеров исключена из ДМС.",
		matchingKeywords: ["брекет", "элайнер", "ортодонт", "исправление прикуса", "ретейнер"],
		matchingNomenclatureCodes: ["A16.07.047", "A16.07.048"],
		excludedInPrograms: ["standard_therapy", "extended_surgery_hygiene", "economy_emergency_only", "vip_full_coverage"],
		allowsPreAuthOverride: false,
	},
	{
		ruleId: "EXCL-04-BLEACH",
		code: "A16.07.050",
		title: "Профессиональное отбеливание зубов",
		reasonDescription: "Клиническое фотоотбеливание (Zoom, Beyond, Amazing White) и домашнее химическое отбеливание не покрываются ДМС.",
		matchingKeywords: ["отбеливание", "zoom", "bleaching", "opalescence", "white"],
		matchingNomenclatureCodes: ["A16.07.050", "A16.07.050.001"],
		excludedInPrograms: ["standard_therapy", "extended_surgery_hygiene", "economy_emergency_only", "vip_full_coverage"],
		allowsPreAuthOverride: false,
	},
	{
		ruleId: "EXCL-05-CT3D",
		code: "A06.07.013",
		title: "Компьютерная 3D томография челюсти (КЛКТ)",
		reasonDescription: "3D томография требует отдельного гарантийного письма или специального согласования с врачом-куратором страховой компании.",
		matchingKeywords: ["ккт", "клкт", "компьютерная томография", "3d томография", "клко"],
		matchingNomenclatureCodes: ["A06.07.013"],
		excludedInPrograms: ["standard_therapy", "economy_emergency_only"],
		allowsPreAuthOverride: true,
	},
];
