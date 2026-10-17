import { Frown, Meh, Smile, Sparkles } from "lucide-react";
import type { FranklExpressItem } from "./types";

export * from "./protocolPresets";
export * from "./protocolTeethNames";

export const isValidFdiTooth = (num: number): boolean => {
	if (!Number.isInteger(num)) return false;
	const q = Math.floor(num / 10);
	const p = num % 10;
	if (q >= 1 && q <= 4) return p >= 1 && p <= 8;
	if (q >= 5 && q <= 8) return p >= 1 && p <= 5;
	return false;
};

export const PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION = {
	titleRu: "Временный прикус интактен (физиологическая норма)",
	statusLocalisRu:
		"Временный прикус интактен. Зубные ряды правильной формы, симметричны. Все временные зубы интактны, кариозных полостей и пятен деминерализации не выявлено (индекс кп=0). Физиологическая стираемость бугров временных зубов выражена соответственно возрасту. Присутствуют физиологические тремы и диастемы, свидетельствующие о нормальном росте челюстей. Слизистая оболочка полости рта бледно-розовая, влажная. Уздечки губ и языка анатомически правильного прикрепления. Носовое дыхание свободное. Вредные привычки отсутствуют.",
	treatmentRu:
		"Профилактический осмотр и оценка прикуса. Контролируемая гигиена: очищение зубов циркулярной щеточкой с бесфтористой пастой. Аппликация защитного реминерализующего фторлака на зубы. Мотивационная беседа с ребенком в игровой форме («считаем зубки»). Обучение правильной технике чистки зубов.",
	recommendationsRu:
		"1. Контролируемая родителями чистка зубов 2 раза в день фторидной пастой (1000 ppm) до 8–9 лет. 2. Рациональное питание: ограничение сладостей и сладких напитков между приемами пищи. 3. Твердая пища (яблоки, морковь) для стимуляции жевания и роста челюстей. 4. Плановый профосмотр через 3–4 месяца.",
	diagnosisIcd10: "Z01.2",
	diagnosisNameRu: "Стоматологическое обследование / физиологическая норма временного прикуса (Z01.2)",
	serviceCode804n: "A01.07.001",
	serviceName804n: "Прием (осмотр, консультация) врача-стоматолога детского первичный",
};

export const FRANKL_EXPRESS_ITEMS: readonly FranklExpressItem[] = [
	{
		rating: 1,
		symbol: "--",
		titleRu: "1 (--) Определенно негативное",
		shortLabelRu: "1 (--) Категорически негативное",
		descriptionRu: "Плач, отказ от контакта, физическое сопротивление или страх",
		clinicalTacticRu: "Tell-Show-Do, ознакомительный визит без бормашины, седация N2O при острой боли",
		icon: Frown,
		activeClass: "border-rose-500 bg-rose-50/90 text-rose-950 shadow-sm ring-2 ring-rose-500/30 dark:border-rose-400 dark:bg-rose-950/60 dark:text-rose-100",
		badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-700",
	},
	{
		rating: 2,
		symbol: "-",
		titleRu: "2 (-) Негативное",
		shortLabelRu: "2 (-) Негативное / насторожен",
		descriptionRu: "Неохотно, плаксив, скован, но садится в кресло и дает осмотреть",
		clinicalTacticRu: "Tell-Show-Do, мультфильмы, позитивное подкрепление, договоренность о знаке «стоп»",
		icon: Meh,
		activeClass: "border-amber-500 bg-amber-50/90 text-amber-950 shadow-sm ring-2 ring-amber-500/30 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100",
		badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700",
	},
	{
		rating: 3,
		symbol: "+",
		titleRu: "3 (+) Позитивное",
		shortLabelRu: "3 (+) Позитивное / контактен",
		descriptionRu: "Контактен, сотрудничает, спокойно выполняет указания врача",
		clinicalTacticRu: "Похвала, демонстрация чистого зубика в зеркало, игровая форма, подарок за смелость",
		icon: Smile,
		activeClass: "border-sky-500 bg-sky-50/90 text-sky-950 shadow-sm ring-2 ring-sky-500/30 dark:border-sky-400 dark:bg-sky-950/60 dark:text-sky-100",
		badgeClass: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/60 dark:text-sky-200 dark:border-sky-700",
	},
	{
		rating: 4,
		symbol: "++",
		titleRu: "4 (++) Абсолютно позитивное",
		shortLabelRu: "4 (++) Отличное сотрудничество",
		descriptionRu: "Радостен, смеется, открыт к общению, с удовольствием чистит зубки",
		clinicalTacticRu: "Обучение гигиене, выбор цвета пломбы ребенком (Twinky Star), диплом смелости",
		icon: Sparkles,
		activeClass: "border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-sm ring-2 ring-emerald-500/30 dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-100",
		badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700",
	},
];
