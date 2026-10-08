/**
 * @file odontogramTools.ts
 * @description Layer 2: FDI tooth formula (ISO 3950), ICD-10 suggestions, and Form 043/у visit diary protocol tools.
 */

import { generateEmrAutopilotPlan, type ToothSurface } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db/client.js";
import {
	patientDrugAllergies,
	patients,
	visits,
} from "../../../../db/schema.js";
import {
	Icd10ClinicalValidator,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../../clinical/Icd10ClinicalValidator.js";
import type { ToolDefinition } from "../tool.js";
import { render043Text } from "./toolFormatters.js";

// ─── 3. suggest_icd10_plan ──────────────────────────────────────────────────

const suggestIcd10PlanSchema = z.object({
	complaint: z
		.string()
		.min(1, "Жалобы обязательны для подбора диагноза")
		.describe(
			"Клинические жалобы пациента (например, 'острая боль при накусывании')",
		),
	toothNumber: z
		.number()
		.int()
		.optional()
		.describe("Номер зуба по международной формуле FDI (11–48 или 51–85)"),
	anamnesis: z
		.string()
		.optional()
		.describe("Анамнез заболевания и перенесенные вмешательства"),
	objectiveStatus: z
		.string()
		.optional()
		.describe("Данные объективного осмотра и зондирования"),
});

export const suggestIcd10PlanTool: ToolDefinition<
	typeof suggestIcd10PlanSchema
> = {
	name: "suggest_icd10_plan",
	description:
		"Клинический валидатор и подборщик планов лечения по МКБ-10 с проверкой привязки к зубам FDI (ISO 3950).",
	parameters: suggestIcd10PlanSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx, args) => {
		const complaintLower = args.complaint.toLowerCase();
		const objLower = (args.objectiveStatus || "").toLowerCase();

		if (args.toothNumber !== undefined) {
			const isPermanent = VALID_FDI_PERMANENT_TEETH.has(args.toothNumber);
			const isPrimary = VALID_FDI_PRIMARY_TEETH.has(args.toothNumber);
			if (!isPermanent && !isPrimary) {
				throw new Error(
					`Некорректный номер зуба FDI: ${args.toothNumber}. Допустимы 11–48 (постоянный прикус) или 51–85 (молочный прикус).`,
				);
			}
		}

		interface DiagnosisProposal {
			code: string;
			title: string;
			stages: { stageName: string; description: string }[];
			warnings?: string[];
		}

		const proposals: DiagnosisProposal[] = [];

		if (
			complaintLower.includes("пульпит") ||
			complaintLower.includes("ночн") ||
			complaintLower.includes("самопроизвольн") ||
			complaintLower.includes("пульсирующ")
		) {
			proposals.push({
				code: "K04.0",
				title: "Пульпит (острый / хронический)",
				stages: [
					{
						stageName: "Анестезия и изоляция",
						description:
							"Проводниковая/инфильтрационная анестезия, наложение коффердама",
					},
					{
						stageName: "Препарирование и экстирпация",
						description:
							"Раскрытие полости зуба, механическая и медикаментозная обработка каналов",
					},
					{
						stageName: "Обтурация каналов",
						description:
							"Пломбирование корневых каналов гуттаперчей с силером под рентген-контролем",
					},
					{
						stageName: "Восстановление коронки",
						description:
							"Постоянная композитная реставрация или культевая вкладка под коронку",
					},
				],
				warnings: ["Обязателен прицельный снимок до и после обтурации"],
			});
		}

		if (
			complaintLower.includes("периодонтит") ||
			complaintLower.includes("накусыван") ||
			complaintLower.includes("выросший зуб")
		) {
			proposals.push({
				code: "K04.5",
				title: "Хронический апикальный периодонтит",
				stages: [
					{
						stageName: "Анестезия и эндодонтический доступ",
						description:
							"Анестезия, коффердам, распломбировка/обработка каналов",
					},
					{
						stageName: "Временное пломбирование каналов",
						description:
							"Внесение лечебной пасты на основе гидроксида кальция на 10-14 дней",
					},
					{
						stageName: "Постоянная обтурация и реставрация",
						description:
							"Пломбирование каналов и восстановление коронковой части",
					},
				],
			});
		}

		if (
			complaintLower.includes("кариес") ||
			complaintLower.includes("сладк") ||
			complaintLower.includes("дырк") ||
			complaintLower.includes("полость") ||
			objLower.includes("дефект")
		) {
			proposals.push({
				code: "K02.1",
				title: "Кариес дентина (средний / глубокий)",
				stages: [
					{
						stageName: "Анестезия",
						description: "Инфильтрационная/проводниковая анестезия",
					},
					{
						stageName: "Препарирование полости",
						description:
							"Некрэктомия кариозного дентина под контролем кариес-маркера",
					},
					{
						stageName: "Пломбирование",
						description:
							"Адгезивный протокол, послойная реставрация светоотверждаемым композитом",
					},
					{
						stageName: "Финишная обработка",
						description: "Шлифовка, полировка, проверка окклюзионных контактов",
					},
				],
			});
		}

		if (
			complaintLower.includes("десн") ||
			complaintLower.includes("кровоточив") ||
			complaintLower.includes("налет") ||
			complaintLower.includes("камень")
		) {
			proposals.push({
				code: "K05.1",
				title: "Хронический гингивит",
				stages: [
					{
						stageName: "Профессиональная гигиена",
						description:
							"Ультразвуковое снятие наддесневых и поддесневых зубных отложений",
					},
					{
						stageName: "Air-Flow полировка",
						description:
							"Удаление пигментированного налета порошком на основе глицина/эритритола",
					},
					{
						stageName: "Антисептическая обработка и фторирование",
						description: "Аппликация противовоспалительного геля и ремотерапия",
					},
				],
			});
		}

		if (proposals.length === 0) {
			proposals.push({
				code: "K00.9",
				title:
					"Нарушение развития и прорезывания зубов неуточненное / Консультация",
				stages: [
					{
						stageName: "Клинический осмотр и диагностика",
						description:
							"Осмотр полости рта, дентальная фотосъемка, назначение КЛКТ / ОПТГ",
					},
				],
			});
		}

		const validatedProposals = proposals.map((p) => {
			const validation = Icd10ClinicalValidator.validate(
				p.code,
				args.toothNumber !== undefined ? String(args.toothNumber) : undefined,
			);
			return {
				...p,
				validation,
			};
		});

		return {
			toothNumber: args.toothNumber ?? null,
			suggestedDiagnoses: validatedProposals,
		};
	},
};

// ─── 4. generate_visit_diary (Form 043/у) ───────────────────────────────────

const generateVisitDiarySchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.optional()
		.describe(
			"ID пациента (если указан, данные пациента и аллергоанамнез подтягиваются из базы)",
		),
	toothNumber: z
		.union([z.number().int(), z.string()])
		.describe("Номер зуба по международной формуле FDI (11–48 или 51–85)"),
	icd10Code: z
		.string()
		.min(1, "Код МКБ-10 обязателен")
		.describe(
			"Код диагноза по МКБ-10 (например, 'K02.1', 'K04.0', 'K04.5', 'K08.1', 'K05.3')",
		),
	complaint: z
		.string()
		.optional()
		.describe(
			"Жалобы пациента (если не указаны, генерируются автоматически по протоколу МКБ-10)",
		),
	anamnesis: z.string().optional().describe("Анамнез заболевания и жизни"),
	objectiveStatus: z
		.string()
		.optional()
		.describe("Данные объективного осмотра и зондирования (Status localis)"),
	procedureProtocol: z
		.string()
		.optional()
		.describe("Протокол проведенного лечения"),
	surfaces: z
		.array(z.enum(["occlusal", "vestibular", "oral", "mesial", "distal"]))
		.optional()
		.describe(
			"Пораженные поверхности зуба (окклюзионная, вестибулярная, оральная, медиальная, дистальная)",
		),
	anestheticDrug: z
		.string()
		.optional()
		.describe(
			"Препарат местной анестезии (например, 'septanest_1_100000', 'ultracain_ds_forte', 'scandonest_3_plain')",
		),
	anesthesiaCarpules: z
		.number()
		.positive()
		.optional()
		.default(1)
		.describe("Количество карпул анестетика"),
	anesthesiaTechnique: z
		.enum([
			"infiltration",
			"mandibular",
			"torus",
			"tuberal",
			"palatal",
			"intraligamentary",
		])
		.optional()
		.describe("Метод анестезии"),
	materials: z
		.array(z.string())
		.optional()
		.describe("Примененные стоматологические материалы"),
	recommendations: z
		.string()
		.optional()
		.describe("Клинические рекомендации и назначения на дом"),
	doctorFullName: z.string().optional().describe("ФИО лечащего врача"),
	doctorSpecialty: z
		.string()
		.optional()
		.describe(
			"Специальность врача (терапевт, хирург, ортопед, пародонтолог, эндодонтист)",
		),
	saveToDatabase: z
		.boolean()
		.optional()
		.default(false)
		.describe(
			"Сохранить ли сгенерированный дневник в таблицу визитов базы данных",
		),
	appointmentId: z
		.string()
		.uuid()
		.optional()
		.describe("ID записи на прием для привязки создаваемого визита"),
});

export const generateVisitDiaryTool: ToolDefinition<
	typeof generateVisitDiarySchema
> = {
	name: "generate_visit_diary",
	description:
		"Генератор протокола дневника приёма врача-стоматолога: Жалобы, Анамнез, Объективный статус по зубу FDI, Диагноз МКБ-10, Лечение, Рекомендации и расчёт стоимости услуг.",
	parameters: generateVisitDiarySchema,
	permissions: ["clinical.read", "clinical.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		let patientName = "Пациент";
		let medicalCardNum = "ЭМК-043";
		let allergyNotes =
			"Аллергологический анамнез спокойный, непереносимости анестетиков не отмечает.";

		if (args.patientId && ctx.organizationId) {
			try {
				const [p] = await targetDb
					.select({
						id: patients.id,
						fullName: patients.fullName,
						notes: patients.notes,
					})
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, ctx.organizationId),
							eq(patients.id, args.patientId),
						),
					)
					.limit(1);

				if (p) {
					patientName = p.fullName;
					medicalCardNum = `ЭМК-${p.id.substring(0, 8)}`;
				}

				const allergies = await targetDb
					.select()
					.from(patientDrugAllergies)
					.where(
						and(
							eq(patientDrugAllergies.organizationId, ctx.organizationId),
							eq(patientDrugAllergies.patientId, args.patientId),
						),
					);

				if (allergies.length > 0) {
					allergyNotes = allergies
						.map(
							(a: typeof patientDrugAllergies.$inferSelect) =>
								`${a.allergenGroup || a.drugInnLatin} (${a.reactionSeverity || "аллергия"}: ${a.clinicalManifestations || "реакция"})`,
						)
						.join("; ");
				}
			} catch {
				// Non-blocking fallback if running outside live database pool
			}
		}

		const autopilot = generateEmrAutopilotPlan({
			toothNumber: args.toothNumber,
			icd10Code: args.icd10Code,
			surfaces: (args.surfaces as readonly ToothSurface[]) ?? null,
			doctorFullName: args.doctorFullName || "Врач-стоматолог",
			doctorSpecialty: args.doctorSpecialty ?? null,
			customComplaints: args.complaint ?? null,
			customObjective: args.objectiveStatus ?? null,
			customProtocol: args.procedureProtocol ?? null,
			customMaterials: args.materials ?? null,
			// biome-ignore lint/suspicious/noExplicitAny: Anesthetic drug key
			anestheticDrug: (args.anestheticDrug as any) ?? null,
			anesthesiaCarpules: args.anesthesiaCarpules ?? 1,
			patientFullName: patientName,
			medicalCardNumber: medicalCardNum,
			allergologicalHistory: allergyNotes,
		});

		let savedVisitId: string | null = null;
		if (args.saveToDatabase && args.patientId && ctx.organizationId) {
			try {
				const [created] = await targetDb
					.insert(visits)
					.values({
						organizationId: ctx.organizationId,
						patientId: args.patientId,
						appointmentId: args.appointmentId ?? null,
						status: "draft",
						complaint: autopilot.diaryEntry.subjectiveComplaints,
						anamnesis:
							args.anamnesis ||
							"Анамнез заболевания без особенностей. Ранее проводилось плановое терапевтическое лечение.",
						objectiveStatus: autopilot.diaryEntry.objectiveStatusLocalis,
						diagnosis: autopilot.diaryEntry.assessmentDiagnosisText,
						treatmentPlan: autopilot.diaryEntry.procedureProtocol,
						doctorSummary: autopilot.diaryEntry.homeCareRecommendations,
						metadata: {
							toothNumber: args.toothNumber,
							icd10Code: args.icd10Code,
							order804nServices: autopilot.order804nServices,
							totalKopecks: autopilot.billingEstimate.totalKopecks,
							appliedMaterials: autopilot.diaryEntry.appliedMaterials,
						},
					})
					.returning();
				if (created) savedVisitId = created.id;
			} catch {
				// DB write error handling
			}
		}

		return {
			success: true,
			form043: {
				toothNumber: String(args.toothNumber),
				icd10Code: args.icd10Code,
				clinicalDiagnosis: autopilot.diaryEntry.assessmentDiagnosisText,
				complaint: autopilot.diaryEntry.subjectiveComplaints,
				anamnesis:
					args.anamnesis ||
					"Анамнез заболевания без особенностей. Аллергологический статус спокоен.",
				objectiveStatus: autopilot.diaryEntry.objectiveStatusLocalis,
				percussionVertical: autopilot.diaryEntry.percussionVertical,
				percussionHorizontal: autopilot.diaryEntry.percussionHorizontal,
				probingTenderness: autopilot.diaryEntry.probingTenderness,
				thermalTestResponse: autopilot.diaryEntry.thermalTestResponse,
				eodMicroamperes: autopilot.diaryEntry.eodMicroamperes,
				treatment: autopilot.diaryEntry.procedureProtocol,
				anesthesiaDetails: autopilot.diaryEntry.anesthesiaDetails,
				appliedMaterials: autopilot.diaryEntry.appliedMaterials,
				recommendations: autopilot.diaryEntry.homeCareRecommendations,
				doctorFullName: autopilot.diaryEntry.doctorFullName,
				doctorSpecialty: autopilot.diaryEntry.doctorSpecialty,
				renderedText: render043Text(autopilot),
			},
			complianceReport: autopilot.complianceAudit,
			order804nServices: autopilot.order804nServices,
			estimate: {
				totalKopecks: autopilot.billingEstimate.totalKopecks,
				totalRub: autopilot.billingEstimate.totalRub,
				formattedTotal: autopilot.billingEstimate.formattedTotal,
			},
			savedVisitId,
		};
	},
};
