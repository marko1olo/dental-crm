/**
 * diagnosisSpeechParser.ts — Сопоставление клинических диагнозов и кодов МКБ-10 из русской речи
 */

import type { DiagnosisRule } from "./clinicalGrammarTypes.js";

export const DENTAL_DIAGNOSES_RULES: readonly DiagnosisRule[] = [
	{
		code: "K02.1",
		title: "Кариес дентина (глубокий / средний)",
		toothState: "treatment",
		clinicalState: "Caries",
		patterns: [
			"кариес дентина глубокий",
			"глубокий кариес",
			"кариес дентина средний",
			"средний кариес",
			"кариес дентина",
			"кариозная полость",
			"кариозное поражение",
			"кариес",
		],
	},
	{
		code: "K02.0",
		title: "Кариес эмали (в стадии пятна)",
		toothState: "treatment",
		clinicalState: "Caries",
		patterns: [
			"кариес эмали",
			"начальный кариес",
			"кариес в стадии пятна",
			"меловидное пятно",
			"деминерализация эмали",
		],
	},
	{
		code: "K04.0",
		title: "Острый пульпит (необратимый)",
		toothState: "treatment",
		clinicalState: "Pulpitis",
		patterns: [
			"пульпит необратимый",
			"пульпит острый",
			"острый пульпит",
			"хронический пульпит",
			"пульпит",
			"очаговый пульпит",
			"диффузный пульпит",
			"гнойный пульпит",
			"гиперемия пульпы",
		],
	},
	{
		code: "K04.5",
		title: "Хронический верхушечный периодонтит",
		toothState: "treatment",
		clinicalState: "Periodontitis",
		patterns: [
			"хронический верхушечный периодонтит",
			"верхушечный периодонтит",
			"апикальный периодонтит",
			"хронический периодонтит",
			"периодонтит",
			"гранулирующий периодонтит",
			"гранулематозный периодонтит",
			"фиброзный периодонтит",
			"радикулярная киста",
		],
	},
	{
		code: "K05.3",
		title: "Хронический пародонтит",
		toothState: "calculus",
		clinicalState: "Periodontitis",
		patterns: [
			"хронический пародонтит",
			"генерализованный пародонтит",
			"пародонтит",
			"пародонтальный карман",
		],
	},
	{
		code: "K03.1",
		title: "Клиновидный дефект",
		toothState: "treatment",
		clinicalState: "Caries",
		patterns: [
			"клиновидный дефект",
			"клиновидный",
			"пришеечный дефект",
			"абфракция",
		],
	},
	{
		code: "K03.2",
		title: "Эрозия эмали",
		toothState: "treatment",
		clinicalState: "Caries",
		patterns: ["эрозия эмали", "эрозия зубов", "кислотная эрозия"],
	},
	{
		code: "K08.1",
		title: "Потеря зубов вследствие удаления (Отсутствует)",
		toothState: "missing",
		clinicalState: "Missing",
		patterns: [
			"удален",
			"удалена",
			"удален зуб",
			"отсутствует",
			"адентия",
			"экстракция",
			"ранее удален",
		],
	},
	{
		code: "S02.5",
		title: "Скол эмали / травма зуба",
		toothState: "treatment",
		clinicalState: "Caries",
		patterns: [
			"скол эмали",
			"скол зуба",
			"скол коронки",
			"перелом коронки",
			"травма зуба",
		],
	},
	{
		code: "CROWN",
		title: "Коронка ортопедическая",
		toothState: "prosthetics",
		clinicalState: "Crown",
		patterns: [
			"коронка диоксид циркония",
			"коронка",
			"металлокерамика",
			"цирконий",
			"e.max",
			"емакс",
			"винир",
			"мостовидный протез",
		],
	},
	{
		code: "IMPLANT",
		title: "Дентальный имплантат",
		toothState: "implant",
		clinicalState: "Implant",
		patterns: [
			"имплантат установлен",
			"имплантат",
			"имплант",
			"дентальный имплантат",
			"имплантация",
		],
	},
	{
		code: "FILLED",
		title: "Пломба / реставрация",
		toothState: "done",
		clinicalState: "Filled",
		patterns: [
			"пломба светового отверждения",
			"пломба",
			"реставрация",
			"световая пломба",
			"фотокомпозит",
			"эстелайт",
			"филтек",
			"градиа",
		],
	},
	{
		code: "HEALTHY",
		title: "Интактный / Здоров",
		toothState: "done",
		clinicalState: "Healthy",
		patterns: [
			"здоров",
			"интактный",
			"интактен",
			"без патологии",
			"норма",
			"санирован",
		],
	},
];

export function matchDentalDiagnosis(text: string): DiagnosisRule | null {
	if (!text) return null;
	const norm = text.toLowerCase().replace(/ё/g, "е");

	// Сортировка паттернов по убыванию длины для приоритета детальных нозологий
	const sortedRules: Array<{ rule: DiagnosisRule; pattern: string }> = [];
	for (const rule of DENTAL_DIAGNOSES_RULES) {
		for (const pattern of rule.patterns) {
			sortedRules.push({ rule, pattern: pattern.replace(/ё/g, "е") });
		}
	}
	sortedRules.sort((a, b) => b.pattern.length - a.pattern.length);

	for (const { rule, pattern } of sortedRules) {
		if (norm.includes(pattern)) {
			return rule;
		}
	}
	return null;
}
