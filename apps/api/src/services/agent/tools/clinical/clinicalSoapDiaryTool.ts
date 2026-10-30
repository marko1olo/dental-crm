/**
 * clinicalSoapDiaryTool.ts — Clinical SOAP Diary & Visit Protocol Synthesis Tool.
 *
 * Adheres to:
 * - International medical SOAP standard (Subjective, Objective, Assessment, Plan).
 * - Mandate 8e: Doctor autonomy (1-click physiological norm default, reversible draft).
 * - Mandate 8x & 8ap: Clean clinical domain language (NO Soviet decree numbers like 043/u).
 */

import { z } from "zod";
import {
	type ChairsideSoapDiary,
	formatFdiTooth,
	getCanalsForTooth,
	parseFdiTooth,
} from "../../chairsideSentinelEngine.js";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";

export const draftClinicalSoapDiarySchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	toothNumber: z.union([z.number(), z.string()]).optional().describe("Номер зуба FDI"),
	diagnosisCode: z.string().optional().describe("Код МКБ-10 (например, K04.0, K02.1)"),
	complaints: z.string().optional().describe("Жалобы пациента"),
	somaticStatus: z.string().optional().describe("Соматический анамнез"),
	allergiesStatus: z.string().optional().describe("Аллергологический анамнез"),
	oneClickNorm: z.boolean().default(true).optional().describe("Заполнение физиологической нормы в 1 клик"),
	performedTreatment: z.string().optional().describe("Выполненные манипуляции"),
	recommendations: z.string().optional().describe("Клинические рекомендации пациенту"),
});

export type DraftClinicalSoapDiaryInput = z.infer<typeof draftClinicalSoapDiarySchema>;

// Semantic Clean Alias (Mandate 8ap)
export const draftSoapDiarySchema = draftClinicalSoapDiarySchema;
export type DraftSoapDiaryInput = DraftClinicalSoapDiaryInput;

export interface DraftClinicalSoapDiaryResult {
	success: true;
	patientId: string;
	toothNumber: number | null;
	fdiToothFormatted: string;
	soapDiary: ChairsideSoapDiary;
	status: "draft";
	readyForOneClickApply: true;
	isDraftEditable: true;
}

export type DraftSoapDiaryResult = DraftClinicalSoapDiaryResult;

export const draftClinicalSoapDiaryTool: ToolDefinition<
	typeof draftClinicalSoapDiarySchema,
	DraftClinicalSoapDiaryResult
> = {
	name: "draft_clinical_soap_diary",
	description:
		"Генерация первичного или повторного дневника приёма пациента по международному медицинскому стандарту SOAP с физиологической нормой по умолчанию в 1 клик, версионным аудитом и печатью без замков.",
	parameters: draftClinicalSoapDiarySchema,
	permissions: ["clinical.write"],
	category: "write",
	handler: async (_ctx: AgentContext, args: DraftClinicalSoapDiaryInput) => {
		const parsedTooth = parseFdiTooth(args.toothNumber);
		const fdiToothFormatted = formatFdiTooth(parsedTooth);
		const canalCount = getCanalsForTooth(parsedTooth);

		const isNorm = args.oneClickNorm !== false && !args.complaints && !args.diagnosisCode;

		let subComplaints = args.complaints || "";
		let diagCode = args.diagnosisCode || "Z01.2";
		let diagName = "Стоматологическое обследование (Здоров)";
		let statusLocalis = "Слизистая чистая, влажная, бледно-розовая. Зубные ряды интактные.";
		let percussion = "Перкуссия отрицательная (-).";
		let coldTest = "Термопроба индифферентна.";
		let probing = "Зондирование безболезненное.";
		let protocol = args.performedTreatment || "Проведен профилактический осмотр, санация не требуется.";
		let recommendations = args.recommendations || "Профгигиена и осмотр через 6 месяцев.";

		if (/k04\.0|пульпит/i.test(diagCode + (args.complaints || ""))) {
			diagCode = "K04.0";
			diagName = `K04.0 Пульпит зуба ${fdiToothFormatted}`;
			if (!subComplaints) {
				subComplaints = `Жалобы на самопроизвольные приступообразные боли в зубе ${fdiToothFormatted}, усиливающиеся ночью и от температурных раздражителей.`;
			}
			statusLocalis = `На окклюзионной поверхности зуба ${fdiToothFormatted} глубокая кариозная полость, сообщающаяся с полостью зуба в 1 точке. Пульпа резко болезненна при зондировании, кровоточит.`;
			percussion = "Перкуссия слабо чувствительная (+).";
			coldTest = "Холодовая проба резко положительная, длительная (>60 сек).";
			probing = "Зондирование точки сообщения резко болезненное.";
			protocol = `1. Анестезия Sol. Articaini 4% 1.7 мл (A16.07.030).\n2. Коффердам (A16.07.082).\n3. Препарирование кариозной полости, раскрытие полости зуба.\n4. Экстирпация пульпы из ${canalCount} каналов.\n5. Механическая и медикаментозная обработка ${canalCount} каналов машинным NiTi под 3% NaOCl.\n6. Пломбирование ${canalCount} каналов гуттаперчей с AH Plus методом латеральной компакции.\n7. Рентген-контроль RVG: обтурация гомогенна до апекса.\n8. Восстановление зуба светоотверждаемым композитом с анатомической моделировкой.`;
			recommendations = "Щадящая диета на стороне лечения 24 часа. При болях — Нимесулид 100 мг. Контрольный осмотр через 6 месяцев.";
		} else if (/k02|кариес/i.test(diagCode + (args.complaints || ""))) {
			diagCode = "K02.1";
			diagName = `K02.1 Кариес дентина зуба ${fdiToothFormatted}`;
			if (!subComplaints) {
				subComplaints = `Жалобы на кратковременные боли от холодного и сладкого в зубе ${fdiToothFormatted}, быстро проходящие после устранения раздражителя.`;
			}
			statusLocalis = `На жевательной поверхности зуба ${fdiToothFormatted} кариозная полость в пределах дентина, выполненная размягченным пигментированным дентином.`;
			coldTest = "Холодовая проба кратковременно положительная.";
			probing = "Зондирование дна безболезненное, по стенкам слабо чувствительное.";
			protocol = `1. Анестезия Sol. Articaini 4% (A16.07.030).\n2. Наложение коффердама (A16.07.082).\n3. Препарирование кариозной полости, некрэктомия.\n4. Антисептическая обработка 2% хлоргексидином.\n5. Тотальное травление эмали 15 сек, адгезив светового отверждения.\n6. Пломба светоотверждаемым нанокомпозитом с моделированием фиссур.\n7. Шлифовка, зеркальная полировка.`;
			recommendations = "Соблюдение гигиены полости рта. Осмотр через 6 месяцев.";
		}

		const somaticText = args.somaticStatus || (isNorm ? "Соматически здоров / норма" : "Не отягощен");
		const allergyText = args.allergiesStatus || (isNorm ? "Аллергоанамнез не отягощен" : "Без особенностей");

		const renderedText043 = [
			`ДНЕВНИК ПРИЁМА ВРАЧА-СТОМАТОЛОГА`,
			`Зуб: ${fdiToothFormatted} | Диагноз: ${diagName} [МКБ-10: ${diagCode}]`,
			`═══════════════════════════════════════════════════════════════════════════`,
			`ЖАЛОБЫ (S): ${subComplaints || "Жалоб не предъявляет (профилактический осмотр)."}`,
			`АНАМНЕЗ (S): Соматический статус: ${somaticText}. Аллергоанамнез: ${allergyText}.`,
			`ОБЪЕКТИВНЫЙ СТАТУС (O): ${statusLocalis} ${percussion} ${coldTest} ${probing}`,
			`ДИАГНОЗ (A): ${diagName}`,
			`ПРОТОКОЛ ЛЕЧЕНИЯ (P):\n${protocol}`,
			`РЕКОМЕНДАЦИИ (P): ${recommendations}`,
			`═══════════════════════════════════════════════════════════════════════════`,
			`[ЧЕРНОВИК СОЗДАН АВТОНОМНО — ВРАЧ ПРАВИТ ТОЛЬКО ПАТОЛОГИЮ]`,
		].join("\n");

		const soapDiary: ChairsideSoapDiary = {
			subjective: {
				complaints: subComplaints,
				anamnesisMorbi: isNorm ? "Регулярный осмотр 1 раз в 6 месяцев." : "Симптомы появились 1-2 дня назад.",
				anamnesisVitae: `Соматический статус: ${somaticText}. Аллергоанамнез: ${allergyText}.`,
			},
			objective: {
				statusLocalis,
				teethFormulaState: `Зуб ${fdiToothFormatted}`,
				percussion,
				coldTest,
				probing,
			},
			assessment: {
				icd10Code: diagCode,
				icd10Name: diagName,
				toothNumber: parsedTooth,
				fdiToothFormatted,
			},
			plan: {
				procedureProtocol: protocol,
				recommendations,
			},
			renderedText043,
		};

		return {
			success: true,
			patientId: args.patientId,
			toothNumber: parsedTooth,
			fdiToothFormatted,
			soapDiary,
			status: "draft",
			readyForOneClickApply: true,
			isDraftEditable: true,
		};
	},
};

export const draftSoapDiaryTool: ToolDefinition<
	typeof draftClinicalSoapDiarySchema,
	DraftClinicalSoapDiaryResult
> = {
	...draftClinicalSoapDiaryTool,
	name: "draft_soap_diary",
};
