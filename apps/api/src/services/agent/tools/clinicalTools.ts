/**
 * clinicalTools.ts — Clinical agent tools for EMR exploration, ICD-10 diagnostic assistance, and scheduling.
 */

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import {
	appointments,
	patientDrugAllergies,
	patients,
	treatmentPlans,
	visits,
} from "../../../db/schema.js";
import {
	Icd10ClinicalValidator,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../clinical/Icd10ClinicalValidator.js";
import type { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./tool.js";

// ─── 1. find_patient ────────────────────────────────────────────────────────

const findPatientSchema = z.object({
	query: z
		.string()
		.min(1, "Поисковый запрос не может быть пустым")
		.describe("ФИО, номер телефона или дата рождения пациента"),
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.default(10)
		.describe("Максимальное количество возвращаемых записей"),
});

export const findPatientTool: ToolDefinition<typeof findPatientSchema> = {
	name: "find_patient",
	description:
		"Поиск пациентов клиники по ФИО, номеру телефона или дате рождения с соблюдением тенантной изоляции.",
	parameters: findPatientSchema,
	permissions: ["patients.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;
		const query = args.query.trim();
		const pattern = `%${query}%`;

		const matches = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				birthDate: patients.birthDate,
				status: patients.status,
				notes: patients.notes,
				createdAt: patients.createdAt,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					or(
						ilike(patients.fullName, pattern),
						ilike(patients.phone, pattern),
						ilike(patients.birthDate, pattern),
					),
				),
			)
			.limit(args.limit);

		return {
			count: matches.length,
			patients: matches,
		};
	},
};

// ─── 2. get_emr_card ────────────────────────────────────────────────────────

const getEmrCardSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("Уникальный идентификатор пациента"),
	includeVisits: z
		.boolean()
		.optional()
		.default(true)
		.describe("Включать ли историю приемов и дневников 043/у"),
	includeTreatmentPlans: z
		.boolean()
		.optional()
		.default(true)
		.describe("Включать ли планы лечения"),
	includeAllergies: z
		.boolean()
		.optional()
		.default(true)
		.describe("Включать ли аллергологический анамнез"),
});

export const getEmrCardTool: ToolDefinition<typeof getEmrCardSchema> = {
	name: "get_emr_card",
	description:
		"Получение полной электронной медицинской карты (ЭМК 043/у): профиль, визиты, диагнозы МКБ-10, аллергии и активные планы лечения.",
	parameters: getEmrCardSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const [patient] = await targetDb
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден`);
		}

		let patientAllergies: unknown[] = [];
		if (args.includeAllergies) {
			patientAllergies = await targetDb
				.select()
				.from(patientDrugAllergies)
				.where(
					and(
						eq(patientDrugAllergies.organizationId, ctx.organizationId),
						eq(patientDrugAllergies.patientId, args.patientId),
					),
				);
		}

		let patientVisits: unknown[] = [];
		if (args.includeVisits) {
			patientVisits = await targetDb
				.select({
					id: visits.id,
					status: visits.status,
					complaint: visits.complaint,
					anamnesis: visits.anamnesis,
					objectiveStatus: visits.objectiveStatus,
					diagnosis: visits.diagnosis,
					treatmentPlan: visits.treatmentPlan,
					doctorSummary: visits.doctorSummary,
					signedAt: visits.signedAt,
					createdAt: visits.createdAt,
				})
				.from(visits)
				.where(
					and(
						eq(visits.organizationId, ctx.organizationId),
						eq(visits.patientId, args.patientId),
					),
				)
				.orderBy(desc(visits.createdAt))
				.limit(10);
		}

		let activePlans: unknown[] = [];
		if (args.includeTreatmentPlans) {
			activePlans = await targetDb
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.organizationId, ctx.organizationId),
						eq(treatmentPlans.patientId, args.patientId),
					),
				)
				.limit(5);
		}

		return {
			patient: {
				id: patient.id,
				fullName: patient.fullName,
				phone: patient.phone,
				birthDate: patient.birthDate,
				status: patient.status,
				notes: patient.notes,
				administrativeProfile: patient.administrativeProfile,
			},
			allergies: patientAllergies,
			recentVisits: patientVisits,
			treatmentPlans: activePlans,
		};
	},
};

// ─── 3. suggest_icd10_plan ──────────────────────────────────────────────────

const suggestIcd10PlanSchema = z.object({
	complaint: z
		.string()
		.min(1, "Жалобы обязательны для подбора диагноза")
		.describe("Клинические жалобы пациента (например, 'острая боль при накусывании')"),
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

		// Tooth validation
		if (args.toothNumber !== undefined) {
			const isPermanent = VALID_FDI_PERMANENT_TEETH.has(args.toothNumber);
			const isPrimary = VALID_FDI_PRIMARY_TEETH.has(args.toothNumber);
			if (!isPermanent && !isPrimary) {
				throw new Error(
					`Некорректный номер зуба FDI: ${args.toothNumber}. Допустимы 11–48 (постоянный прикус) или 51–85 (молочный прикус).`,
				);
			}
		}

		// Heuristic clinical matching
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
						description: "Проводниковая/инфильтрационная анестезия, наложение коффердама",
					},
					{
						stageName: "Препарирование и экстирпация",
						description: "Раскрытие полости зуба, механическая и медикаментозная обработка каналов",
					},
					{
						stageName: "Обтурация каналов",
						description: "Пломбирование корневых каналов гуттаперчей с силером под рентген-контролем",
					},
					{
						stageName: "Восстановление коронки",
						description: "Постоянная композитная реставрация или культевая вкладка под коронку",
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
						description: "Анестезия, коффердам, распломбировка/обработка каналов",
					},
					{
						stageName: "Временное пломбирование каналов",
						description: "Внесение лечебной пасты на основе гидроксида кальция на 10-14 дней",
					},
					{
						stageName: "Постоянная обтурация и реставрация",
						description: "Пломбирование каналов и восстановление коронковой части",
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
						description: "Некрэктомия кариозного дентина под контролем кариес-маркера",
					},
					{
						stageName: "Пломбирование",
						description: "Адгезивный протокол, послойная реставрация светоотверждаемым композитом",
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
						description: "Ультразвуковое снятие наддесневых и поддесневых зубных отложений",
					},
					{
						stageName: "Air-Flow полировка",
						description: "Удаление пигментированного налета порошком на основе глицина/эритритола",
					},
					{
						stageName: "Антисептическая обработка и фторирование",
						description: "Аппликация противовоспалительного геля и ремотерапия",
					},
				],
			});
		}

		// Fallback if no specific condition matched
		if (proposals.length === 0) {
			proposals.push({
				code: "K00.9",
				title: "Нарушение развития и прорезывания зубов неуточненное / Консультация",
				stages: [
					{
						stageName: "Клинический осмотр и диагностика",
						description: "Осмотр полости рта, дентальная фотосъемка, назначение КЛКТ / ОПТГ",
					},
				],
			});
		}

		// Validate proposed codes using project's canonical Icd10ClinicalValidator
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

// ─── 4. book_visit ──────────────────────────────────────────────────────────

const bookVisitSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для записи"),
	doctorUserId: z
		.string()
		.uuid("Некорректный UUID врача")
		.describe("ID лечащего врача"),
	chairId: z
		.string()
		.uuid("Некорректный UUID кресла")
		.optional()
		.describe("ID стоматологической установки / кабинета"),
	startsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Время начала приема в ISO 8601"),
	endsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Время окончания приема в ISO 8601"),
	reason: z
		.string()
		.min(1, "Причина записи обязательна")
		.describe("Причина обращения / планируемая процедура"),
	comment: z
		.string()
		.optional()
		.describe("Дополнительные примечания к записи"),
});

export const bookVisitTool: ToolDefinition<typeof bookVisitSchema> = {
	name: "book_visit",
	description:
		"Создание брони / записи на прием в расписании клиники. Требует подтверждения в режиме supervised.",
	parameters: bookVisitSchema,
	permissions: ["schedule.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const startTime = new Date(args.startsAt);
		const endTime = new Date(args.endsAt);

		if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
			throw new Error("Некорректный формат даты/времени начала или окончания приема");
		}

		if (startTime >= endTime) {
			throw new Error("Время начала приема должно быть строго раньше времени окончания");
		}

		// Insert appointment
		const [created] = await targetDb
			.insert(appointments)
			.values({
				organizationId: ctx.organizationId,
				patientId: args.patientId,
				doctorUserId: args.doctorUserId,
				chairId: args.chairId ?? null,
				status: "planned",
				startsAt: startTime,
				endsAt: endTime,
				reason: args.reason,
				comment: args.comment ?? null,
			})
			.returning();

		return {
			success: true,
			appointmentId: created.id,
			patientId: created.patientId,
			doctorUserId: created.doctorUserId,
			startsAt: created.startsAt,
			endsAt: created.endsAt,
			status: created.status,
			reason: created.reason,
		};
	},
};

/**
 * Registers all clinical tools into the specified ToolRegistry.
 */
export function registerClinicalTools(
	registry: ToolRegistry,
	moduleName = "clinical",
): void {
	registry.register(findPatientTool, moduleName);
	registry.register(getEmrCardTool, moduleName);
	registry.register(suggestIcd10PlanTool, moduleName);
	registry.register(bookVisitTool, moduleName);
}
