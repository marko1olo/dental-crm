/**
 * @file clinicalProtocolTool.ts
 * @description Синтез клинического дневника амбулаторного приёма в Медицинской карте по стандарту SOAP и СтАР.
 */
import { z } from "zod";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const generateForm043Schema = z.object({
	toothNumber: z.number().min(11).max(85).describe("Номер зуба по формуле FDI (11-48 постоянные, 51-85 молочные)"),
	diagnosisMkb: z.string().describe("Диагноз по МКБ-10 (K02.1 Кариес дентина, K04.0 Пульпит, K04.5 Периодонтит)"),
	complaints: z.string().optional().describe("Краткие жалобы пациента"),
	anestheticTradeName: z.string().default("Ультракаин Д-С 1:200 000").describe("Торговое название анестетика"),
	anestheticVolumeMl: z.number().default(1.7).describe("Объем анестетика в мл"),
	anesthesiaTechnique: z.enum(["infiltration", "conduction", "application", "intraligamentary"]).default("infiltration").describe("Техника анестезии"),
	fillingMaterial: z.string().default("Светоотверждаемый композит Estelite Asteria A2").describe("Реставрационный материал"),
	useCofferdam: z.boolean().default(true).describe("Применение коффердама"),
});

export const generateClinicalProtocolSchema = generateForm043Schema;
export type GenerateForm043Input = z.infer<typeof generateForm043Schema>;
export type GenerateClinicalProtocolInput = GenerateForm043Input;

export interface GenerateForm043Result {
	readonly toothNumber: number;
	readonly diagnosisMkb: string;
	readonly complaints: string;
	readonly anamnesis: string;
	readonly statusLocalis: string;
	readonly treatmentProtocol: string;
	readonly recommendations: string;
	readonly fullForm043Text: string;
}
export type GenerateClinicalProtocolResult = GenerateForm043Result;

function getMkbTemplates(mkb: string, tooth: number) {
	if (mkb.includes("K02.1")) {
		return {
			comp: `Жалобы на кратковременные боли от сладкого и термических раздражителей (холодного) в области зуба ${tooth}.`,
			anam: "Со слов пациента, ранее зуб не лечен, симптомы появились несколько дней назад.",
			stat: `При осмотре: на жевательной/контактной поверхности зуба ${tooth} глубокая кариозная полость в пределах околопульпарного дентина. Зондирование стенок и дна слабо болезненно, дентин размягчен, пигментирован. Перкуссия безболезненна. Термопроба положительная, боль сразу проходит после устранения раздражителя. ЭОД 6 мкА.`,
		};
	}
	if (mkb.includes("K04.0")) {
		return {
			comp: `Жалобы на острые приступообразные самопроизвольные боли в области зуба ${tooth}, усиливающиеся ночью, иррадиирующие по ходу тройничного нерва.`,
			anam: "Боли беспокоят в течение 2 суток, купировались приемом НПВС кратковременно.",
			stat: `При осмотре: глубокая кариозная полость зуба ${tooth}, сообщающаяся с полостью зуба. Зондирование пульпы резко болезненно, выраженная кровоточивость. Перкуссия слабо чувствительна. Термопроба вызывает длительный нестихающий болевой приступ. ЭОД 25 мкА.`,
		};
	}
	if (mkb.includes("K04.5") || mkb.includes("K04.4")) {
		return {
			comp: `Жалобы на постоянную ноющую боль в области зуба ${tooth}, резкое усиление боли при накусывании («чувство выросшего зуба»).`,
			anam: "Со слов пациента, ранее зуб не лечен, симптомы появились несколько дней назад.",
			stat: `При осмотре: коронка зуба ${tooth} изменена в цвете, глубокая кариозная полость / несостоятельная пломба. Полость зуба вскрыта, зондирование устьев каналов безболезненно. Вертикальная перкуссия резко положительна. Пальпация по переходной складке слабо болезненна. На рентгенограмме — деструкция костной ткани у верхушки корня с нечеткими контурами.`,
		};
	}
	return {
		comp: `Жалобы на эстетический дефект и шероховатость в области зуба ${tooth}.`,
		anam: "Со слов пациента, ранее зуб не лечен, симптомы появились несколько дней назад.",
		stat: `При осмотре: дефект твердых тканей зуба ${tooth}. Зондирование безболезненно. Перкуссия отрицательна. Слизистая оболочка бледно-розовая, без патологии.`,
	};
}

export async function handleGenerateForm043(args: GenerateForm043Input, _context: DentalToolContext): Promise<GenerateForm043Result> {
	const tooth = args.toothNumber;
	const mkb = args.diagnosisMkb.toUpperCase();
	const techName = args.anesthesiaTechnique === "conduction" ? "проводниковая (мандибулярная/торусальная)" : args.anesthesiaTechnique === "application" ? "аппликационная" : "инфильтрационная";
	const tmpl = getMkbTemplates(mkb, tooth);
	const complaints = args.complaints || tmpl.comp;

	const steps: string[] = [`1. Обезболивание: ${techName} анестезия препаратом ${args.anestheticTradeName} ${args.anestheticVolumeMl} мл.`];
	if (args.useCofferdam) steps.push("2. Наложение коффердама (раббердама), кламп зафиксирован, рабочее поле изолировано.");
	steps.push("3. Препарирование кариозной полости, некрэктомия твердых тканей под водяным охлаждением, формирование полости.");
	steps.push("4. Медикаментозная обработка полости 2% раствором хлоргексидина биглюконата, высушивание.");

	if (mkb.includes("K04")) {
		steps.push("5. Механическая и медикаментозная обработка корневых каналов машинной системой ProTaper под контролем апекслокатора. Ирригация 3% NaOCl с ультразвуковой активацией.");
		steps.push("6. Высушивание каналов бумажными штифтами. Пломбирование корневых каналов методом латеральной конденсации гуттаперчи с силером AH Plus. Рентген-контроль обтурации.");
	}
	steps.push(`7. Адгезивный протокол (самопротравливающий адгезив), послойное моделирование анатомической формы зуба материалом ${args.fillingMaterial}. Светополимеризация.`);
	steps.push("8. Шлифовка, полировка реставрации полировочными головками и пастой. Коррекция по окклюзии.");

	const recs = "Соблюдение индивидуальной гигиены полости рта. Не принимать твердую пищу в течение 2 часов. При сохранении дискомфорта — повторный осмотр. Профилактический осмотр через 6 месяцев.";
	const fullText = `=== МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО (ФОРМА № 043/У) ===\nЗуб: ${tooth}\nДиагноз (МКБ-10): ${mkb}\n\nЖАЛОБЫ:\n${complaints}\n\nАНАМНЕЗ ЗАБОЛЕВАНИЯ:\n${tmpl.anam}\n\nДАННЫЕ ОБЪЕКТИВНОГО ИССЛЕДОВАНИЯ (STATUS LOCALIS):\n${tmpl.stat}\n\nЛЕЧЕНИЕ:\n${steps.join("\n")}\n\nРЕКОМЕНДАЦИИ:\n${recs}\n======================================================================`;

	return { toothNumber: tooth, diagnosisMkb: mkb, complaints, anamnesis: tmpl.anam, statusLocalis: tmpl.stat, treatmentProtocol: steps.join("\n"), recommendations: recs, fullForm043Text: fullText };
}

export const handleGenerateClinicalProtocol = handleGenerateForm043;

export const generateForm043Tool: DentalToolEntry<typeof generateForm043Schema> = {
	name: "generate_form_043_entry",
	description: "Формирование клинического дневника в Медицинской карте приёма по стандартам СтАР и МКБ-10 (Жалобы, Анамнез, Status Localis, Протокол лечения, Рекомендации).",
	schema: generateForm043Schema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("generate_form_043_entry", "Генерация протокола приема в Медицинской карте по стандарту СтАР и МКБ-10.", generateForm043Schema),
	handler: handleGenerateForm043,
};

export const clinicalProtocolTool = generateForm043Tool;
