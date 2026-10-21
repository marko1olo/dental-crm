/**
 * exclusionRulesCatalog.ts — Каталог типовых правил исключений из программ ДМС
 */

import type { DmsExclusionRule } from "./types.js";

export const DMS_EXCLUSION_RULES: readonly DmsExclusionRule[] = [
	{
		id: "excl_implant",
		code: "EXCL-01-ИМПЛ",
		title: "Дентальная имплантация и костная пластика",
		description: "Установка дентальных имплантатов, синус-лифтинг, мембранная остеопластика, забор костных блоков.",
		matchingKeywords: ["имплант", "имплантация", "синус-лифтинг", "остеопластик", "мембран", "аугментация"],
		matchingNomenclaturePrefixes: ["A16.07.006", "A16.07.041", "A16.07.054", "A16.07.055"],
		appliesToPrograms: ["base", "extended", "vip"],
	},
	{
		id: "excl_bleaching",
		code: "EXCL-02-ОТБЕЛ",
		title: "Эстетическое отбеливание зубов",
		description: "Клиническое фотоотбеливание (Zoom, Beyond), лазерное и домашнее отбеливание в каппах.",
		matchingKeywords: ["отбеливан", "zoom", "beyond", "bleaching", "осветление эмали"],
		matchingNomenclaturePrefixes: ["A16.07.050"],
		appliesToPrograms: ["base", "extended", "vip"],
	},
	{
		id: "excl_orthodontics",
		code: "EXCL-03-ОРТОДОНТ",
		title: "Ортодонтическое лечение и элайнеры",
		description: "Фиксация брекет-систем, исправление прикуса элайнерами, ортодонтические минивинты.",
		matchingKeywords: ["брекет", "элайнер", "ортодонт", "исправление прикуса", "ретейнер"],
		matchingNomenclaturePrefixes: ["A16.07.046", "A16.07.047", "A16.07.048"],
		appliesToPrograms: ["base", "extended", "vip"],
	},
	{
		id: "excl_veneers",
		code: "EXCL-04-ВИНИР",
		title: "Керамические и композитные виниры",
		description: "Эстетические накладки, люминиры, виниры из диоксида циркония или полевошпатной керамики.",
		matchingKeywords: ["винир", "люминир", "микропротез", "эстетическая накладка"],
		matchingNomenclaturePrefixes: ["A16.07.003", "A16.07.004"],
		appliesToPrograms: ["base", "extended"],
	},
	{
		id: "excl_frequent_hygiene",
		code: "EXCL-05-ГИГ-ЧАСТО",
		title: "Повторная профессиональная гигиена ранее установленного лимита",
		description: "Проведение профгигиены (Air-Flow, ультразвук) чаще, чем предусмотрено программой полиса.",
		matchingKeywords: ["гигиен", "air-flow", "скейлинг", "чистка зубов", "порошкоструйн"],
		matchingNomenclaturePrefixes: ["A16.07.051", "A22.07.002"],
		appliesToPrograms: ["base", "extended"],
	},
	{
		id: "excl_cosmetic_surgery",
		code: "EXCL-06-КОСМ-ХИР",
		title: "Косметические и эстетические хирургические операции",
		description: "Пластика десневой улыбки (гингивэктомия) без признаков патологии пародонта, скайсы, украшения.",
		matchingKeywords: ["скайс", "украшение", "гингивопластика эстетическая", "страз"],
		matchingNomenclaturePrefixes: ["A16.07.058"],
		appliesToPrograms: ["base", "extended", "vip"],
	},
];
