/**
 * @file chiefComplaintTranslatorTool.ts
 * @description Семантический переводчик просторечных жалоб пациента в клинические формулировки и МКБ-10.
 */
import { z } from "zod";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const translatePatientComplaintSchema = z.object({
	complaintText: z.string().min(3, "Текст жалобы слишком короткий").describe("Прямая речь / жалоба пациента"),
	toothMentioned: z.number().min(11).max(85).optional().describe("Номер зуба по FDI"),
});

export type TranslatePatientComplaintInput = z.infer<typeof translatePatientComplaintSchema>;

export interface TranslatePatientComplaintResult {
	readonly originalText: string;
	readonly professionalMedicalTranslation: string;
	readonly suspectedNosologies: readonly {
		readonly codeMkb: string;
		readonly nameRu: string;
		readonly clinicalProbability: "high" | "moderate" | "low";
	}[];
	readonly recommendedDiagnosticTests: readonly string[];
}

export async function handleTranslatePatientComplaint(args: TranslatePatientComplaintInput, _context: DentalToolContext): Promise<TranslatePatientComplaintResult> {
	const text = args.complaintText.toLowerCase();
	const tooth = args.toothMentioned ? `в области зуба ${args.toothMentioned}` : "";

	const nosologies: { codeMkb: string; nameRu: string; clinicalProbability: "high" | "moderate" | "low" }[] = [];
	const diagnostics: string[] = ["Прицельная радиовизиография (RVG)"];
	let translation = `Пациент предъявляет жалобы на дискомфорт ${tooth}.`;

	if (/ночью|ноет|спать не могу|пульсир|приступ/i.test(text)) {
		translation = `Жалобы на самопроизвольные приступообразные боли ${tooth}, иррадиирующие по ходу ветвей тройничного нерва, с выраженным ночным обострением.`;
		nosologies.push({ codeMkb: "K04.0", nameRu: "Острый пульпит (начальный / гнойный)", clinicalProbability: "high" });
		diagnostics.push("Электроодонтометрия (ЭОД)", "Температурная проба (холодовой тест с этилхлоридом)");
	} else if (/накусыва|жева|вырос|стуч|дотронут|нажим/i.test(text)) {
		translation = `Жалобы на постоянную ноющую боль ${tooth}, резко усиливающуюся при механической нагрузке (накусывании), ощущение «выросшего зуба».`;
		nosologies.push({ codeMkb: "K04.5", nameRu: "Хронический апикальный периодонтит в стадии обострения", clinicalProbability: "high" });
		diagnostics.push("Вертикальная и горизонтальная перкуссия", "Пальпация переходной складки в проекции верхушки корня");
	} else if (/сладк|холодн|дырк|полость|застревает/i.test(text)) {
		translation = `Жалобы на кратковременный болевой синдром от сладкого, химических и термических раздражителей ${tooth}, быстро проходящий после устранения агента, задержку пищевых остатков.`;
		nosologies.push({ codeMkb: "K02.1", nameRu: "Кариес дентина (средний / глубокий)", clinicalProbability: "high" });
		diagnostics.push("Зондирование дна и стенок кариозной полости", "Холодовая проба (кратковременная реакция <5 сек)");
	} else if (/кров|десна|чистк|запах|шатает/i.test(text)) {
		translation = "Жалобы на кровоточивость десен при чистке зубов и приеме твердой пищи, неприятный запах изо рта, подвижность зубов.";
		nosologies.push({ codeMkb: "K05.3", nameRu: "Хронический генерализованный пародонтит", clinicalProbability: "high" });
		diagnostics.push("Зондирование пародонтальных карманов в 6 точках (Perio-Chart)", "Ортопантомография (ОПТГ) для оценки резорбции альвеолярной кости");
	} else if (/щелкает|хруст|рот не открывается|сустав/i.test(text)) {
		translation = "Жалобы на суставной шум (щелчки, крепитация) в височно-нижнечелюстном суставе при открывании рта, ограничение открывания рта, усталость жевательных мышц.";
		nosologies.push({ codeMkb: "K07.6", nameRu: "Синдром дисфункции височно-нижнечелюстного сустава (ВНЧС)", clinicalProbability: "high" });
		diagnostics.push("Пальпация латеральных крыловидных и жевательных мышц", "КЛКТ ВНЧС с открытым и закрытым ртом / МРТ сустава");
	}

	if (nosologies.length === 0) {
		nosologies.push({ codeMkb: "K02.9", nameRu: "Кариес зубов неуточненный", clinicalProbability: "moderate" });
	}

	return {
		originalText: args.complaintText, professionalMedicalTranslation: translation,
		suspectedNosologies: nosologies, recommendedDiagnosticTests: diagnostics,
	};
}

export const translatePatientComplaintTool: DentalToolEntry<typeof translatePatientComplaintSchema> = {
	name: "translate_patient_complaint",
	description: "Перевод просторечных жалоб пациента в клинические медицинские формулировки и вероятные коды МКБ-10.",
	schema: translatePatientComplaintSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("translate_patient_complaint", "Клинический переводчик жалоб пациента в медицинские формулировки и МКБ-10.", translatePatientComplaintSchema),
	handler: handleTranslatePatientComplaint,
};

export const chiefComplaintTranslatorTool = translatePatientComplaintTool;
