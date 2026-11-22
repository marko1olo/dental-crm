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
	serviceCode: "A01.07.001",
	serviceName: "Прием (осмотр, консультация) врача-стоматолога детского первичный",
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
		activeClass: "border-[var(--danger-line,var(--danger))] bg-[var(--danger-soft)] text-[var(--danger-ink,var(--danger))] shadow-xs ring-2 ring-[var(--danger)]/30",
		badgeClass: "bg-[var(--danger-soft)] text-[var(--danger-ink,var(--danger))] border border-[var(--danger-line,var(--danger))]",
	},
	{
		rating: 2,
		symbol: "-",
		titleRu: "2 (-) Негативное",
		shortLabelRu: "2 (-) Негативное / насторожен",
		descriptionRu: "Неохотно, плаксив, скован, но садится в кресло и дает осмотреть",
		clinicalTacticRu: "Tell-Show-Do, мультфильмы, позитивное подкрепление, договоренность о знаке «стоп»",
		icon: Meh,
		activeClass: "border-[var(--warning-line,var(--warning))] bg-[var(--warning-soft)] text-[var(--warning-ink,var(--warning))] shadow-xs ring-2 ring-[var(--warning)]/30",
		badgeClass: "bg-[var(--warning-soft)] text-[var(--warning-ink,var(--warning))] border border-[var(--warning-line,var(--warning))]",
	},
	{
		rating: 3,
		symbol: "+",
		titleRu: "3 (+) Позитивное",
		shortLabelRu: "3 (+) Позитивное / контактен",
		descriptionRu: "Контактен, сотрудничает, спокойно выполняет указания врача",
		clinicalTacticRu: "Похвала, демонстрация чистого зубика в зеркало, игровая форма, подарок за смелость",
		icon: Smile,
		activeClass: "border-[var(--primary)] bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs ring-2 ring-[var(--primary)]/30",
		badgeClass: "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]",
	},
	{
		rating: 4,
		symbol: "++",
		titleRu: "4 (++) Абсолютно позитивное",
		shortLabelRu: "4 (++) Отличное сотрудничество",
		descriptionRu: "Радостен, смеется, открыт к общению, с удовольствием чистит зубки",
		clinicalTacticRu: "Обучение гигиене, выбор цвета пломбы ребенком (Twinky Star), диплом смелости",
		icon: Sparkles,
		activeClass: "border-[var(--success-line,var(--success))] bg-[var(--success-soft)] text-[var(--success-ink,var(--success))] shadow-xs ring-2 ring-[var(--success)]/30",
		badgeClass: "bg-[var(--success-soft)] text-[var(--success-ink,var(--success))] border border-[var(--success-line,var(--success))]",
	},
];
