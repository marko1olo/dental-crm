/**
 * @file consiliumTool.ts
 * @description Междисциплинарный клинический консилиум: синтез комплексного плана лечения по этапам СтАР.
 */
import { z } from "zod";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const multidisciplinaryConciliumSchema = z.object({
	clinicalFindings: z.array(z.string()).min(1, "Требуется хотя бы одна клиническая находка").describe("Список выявленных патологий"),
	patientPreferences: z.string().optional().describe("Пожелания пациента"),
});

export type MultidisciplinaryConciliumInput = z.infer<typeof multidisciplinaryConciliumSchema>;

export interface TreatmentPlanStage {
	readonly stageNumber: number;
	readonly stageName: string;
	readonly specialty: string;
	readonly priority: "immediate" | "high" | "scheduled";
	readonly procedures: readonly string[];
	readonly rationale: string;
}

export interface MultidisciplinaryConciliumResult {
	readonly stages: readonly TreatmentPlanStage[];
	readonly totalStagesCount: number;
	readonly estimatedDurationMonths: number;
	readonly synthesisSummary: string;
}

export async function handleMultidisciplinaryConcilium(args: MultidisciplinaryConciliumInput, _context: DentalToolContext): Promise<MultidisciplinaryConciliumResult> {
	const str = args.clinicalFindings.join("; ").toLowerCase();
	const hasMalocclusion = str.includes("прикус") || str.includes("скученност");

	const stages: TreatmentPlanStage[] = [
		{
			stageNumber: 1, stageName: "Неотложный этап (Купирование острой патологии)", specialty: "Хирургия / Терапия неотложная", priority: "immediate",
			procedures: ["Купирование болевого синдрома и одонтогенного воспаления", "Вскрытие поднадкостничных абсцессов при наличии", "Удаление зубов с продольным переломом корня или подвижностью IV степени"],
			rationale: "Ликвидация острой боли и очагов гнойной инфекции перед плановыми манипуляциями.",
		},
		{
			stageNumber: 2, stageName: "Пародонтологический этап & Профессиональная гигиена", specialty: "Пародонтология / Гигиена", priority: "high",
			procedures: ["Ультразвуковой скейлинг над- и поддесневых зубных отложений", "Обработка аппаратом Air-Flow (глициновый порошок)", "Обучение контролируемой индивидуальной гигиене полости рта", "Вектор-терапия / кюретаж пародонтальных карманов при пародонтите"],
			rationale: "Устранение бактериального фактора. Без санации десен имплантация и протезирование противопоказаны.",
		},
		{
			stageNumber: 3, stageName: "Терапевтическая санация твердых тканей и эндодонтия", specialty: "Терапевтическая стоматология", priority: "scheduled",
			procedures: ["Лечение кариеса всех локализаций (герметизация фиссур, композитные реставрации)", "Эндодонтическое лечение и ревизия ранее леченных каналов под микроскопом", "Восстановление культей зубов под ортопедические коронки со стекловолоконными штифтами"],
			rationale: "Подготовка надежного биологического фундамента и герметизация корневых каналов.",
		},
		{
			stageNumber: 4, stageName: "Хирургический и ортодонтический этапы", specialty: "Хирургия-имплантология / Ортодонтия", priority: "scheduled",
			procedures: [
				"Атравматичное удаление зубов, не подлежащих восстановлению, и дистопированных ретинированных восьмерок",
				"Костная пластика (НКР, синус-лифтинг) при дефиците альвеолярного объема",
				"Установка дентальных имплантатов",
				hasMalocclusion ? "Ортодонтическая коррекция прикуса элайнерами/брекетами для создания места под протезирование" : "Ортодонтическая коррекция при наличии показаний",
			],
			rationale: "Восстановление утраченных опорных структур и нормализация окклюзионных взаимоотношений.",
		},
		{
			stageNumber: 5, stageName: "Ортопедический этап (Функционально-эстетическая реабилитация)", specialty: "Ортопедическая стоматология", priority: "scheduled",
			procedures: ["Временное протезирование (провизорные коронки/мосты) для адаптации ВНЧС", "Постоянное протезирование: коронки из диоксида циркония / E.max с винтовой фиксацией на имплантатах", "Окклюзионный контроль и сплинт-терапия при признаках бруксизма"],
			rationale: "Полное восстановление жевательной эффективности, окклюзионной высоты и эстетики улыбки.",
		},
		{
			stageNumber: 6, stageName: "Диспансерный поддерживающий этап", specialty: "Профилактика", priority: "scheduled",
			procedures: ["Контрольные осмотры 1 раз в 6 месяцев", "Рентген-контроль стабильности периимплантной кости (RVG/ОПТГ)", "Регулярная поддерживающая пародонтальная терапия"],
			rationale: "Долгосрочное сохранение гарантии и клинического успеха комплексного лечения.",
		},
	];

	const duration = str.includes("имплант") ? 6 : 2;
	return {
		stages, totalStagesCount: stages.length, estimatedDurationMonths: duration,
		synthesisSummary: `Сформирован 6-этапный междисциплинарный план лечения по алгоритму СтАР. Примерная продолжительность: ${duration} мес. Включает пародонтологическую подготовку, терапию, хирургию и завершающее протезирование.`,
	};
}

export const multidisciplinaryConciliumTool: DentalToolEntry<typeof multidisciplinaryConciliumSchema> = {
	name: "multidisciplinary_concilium",
	description: "Междисциплинарный клинический консилиум: комплексный план лечения (Неотложный -> Пародонтология -> Терапия -> Хирургия -> Ортопедия -> Диспансеризация).",
	schema: multidisciplinaryConciliumSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("multidisciplinary_concilium", "Синтез комплексного междисциплинарного плана лечения по этапам клинического протокола СтАР.", multidisciplinaryConciliumSchema),
	handler: handleMultidisciplinaryConcilium,
};

export const consiliumTool = multidisciplinaryConciliumTool;
