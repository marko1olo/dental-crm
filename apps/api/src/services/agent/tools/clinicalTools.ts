/**
 * clinicalTools.ts — Clinical agent tools for EMR exploration, ICD-10 diagnostic assistance, scheduling,
 * patient timeline, drug-drug interaction safety, dental laboratory tracking, family balance, appointment mutations,
 * staff tasks, and automated preventive patient recalls.
 */

import {
	calculateNextRecallDueMonth,
	checkDentalMedicationInteractions,
	type DentalDrugInteractionRule,
	RECALL_INTERVAL_MONTHS,
} from "@dental/shared";
import { and, desc, eq, gte, ilike, lte, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import {
	appointments,
	chairs,
	communicationTasks,
	familyGroups,
	labOrders,
	patientDrugAllergies,
	patientTaskTickets,
	patients,
	payments,
	treatmentPlans,
	users,
	visits,
} from "../../../db/schema.js";
import {
	Icd10ClinicalValidator,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../clinical/Icd10ClinicalValidator.js";
import type { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./tool.js";
import { autoFillCancellationGapTool } from "./cancellationTool.js";
import { generateInformedConsentTool } from "./consentTool.js";
import { calculateTreatmentEstimateTool } from "./estimateTool.js";
import { draftLabWorkOrderTool } from "./labOrderTool.js";
import {
	recordSterilizationTestTool,
	registerSanpinTools,
	verifyKraftPackTool,
} from "./sanpinTools.js";
import { analyzeRadiographVisionTool } from "./visionTool.js";

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

// ─── 5. get_patient_timeline ────────────────────────────────────────────────

const getPatientTimelineSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для построения таймлайна"),
	limit: z
		.number()
		.int()
		.min(1)
		.max(100)
		.optional()
		.default(30)
		.describe("Максимальное количество событий в таймлайне"),
});

export interface TimelineEvent {
	readonly id: string;
	readonly type: "visit" | "treatment_plan" | "payment" | "lab_order";
	readonly title: string;
	readonly date: string;
	readonly details: Record<string, unknown>;
}

export const getPatientTimelineTool: ToolDefinition<
	typeof getPatientTimelineSchema
> = {
	name: "get_patient_timeline",
	description:
		"Извлечение единой хронологической истории пациента: приемы (дневники 043/у, жалобы, диагнозы), планы лечения, финансовые транзакции и заказы зуботехнической лаборатории.",
	parameters: getPatientTimelineSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;
		const events: TimelineEvent[] = [];

		// 1. Visits
		const pastVisits = await targetDb
			.select({
				id: visits.id,
				complaint: visits.complaint,
				diagnosis: visits.diagnosis,
				doctorSummary: visits.doctorSummary,
				status: visits.status,
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
			.limit(args.limit);

		for (const v of pastVisits) {
			events.push({
				id: v.id,
				type: "visit",
				title: `Прием врача: ${v.diagnosis || "Консультация"}`,
				date: (v.signedAt ?? v.createdAt).toISOString(),
				details: {
					status: v.status,
					complaint: v.complaint,
					diagnosis: v.diagnosis,
					doctorSummary: v.doctorSummary,
					isSigned: v.signedAt !== null,
				},
			});
		}

		// 2. Treatment Plans
		const plans = await targetDb
			.select({
				id: treatmentPlans.id,
				name: treatmentPlans.name,
				title: treatmentPlans.title,
				status: treatmentPlans.status,
				totalPriceRub: treatmentPlans.totalPriceRub,
				totalPrice: treatmentPlans.totalPrice,
				createdAt: treatmentPlans.createdAt,
			})
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.organizationId, ctx.organizationId),
					eq(treatmentPlans.patientId, args.patientId),
				),
			)
			.orderBy(desc(treatmentPlans.createdAt))
			.limit(args.limit);

		for (const p of plans) {
			events.push({
				id: p.id,
				type: "treatment_plan",
				title: `План лечения: ${p.name || p.title || "Комплексный план"}`,
				date: p.createdAt.toISOString(),
				details: {
					status: p.status,
					totalPriceRub: p.totalPriceRub ?? p.totalPrice,
				},
			});
		}

		// 3. Payments
		const patientPayments = await targetDb
			.select({
				id: payments.id,
				amountRub: payments.amountRub,
				method: payments.method,
				status: payments.status,
				createdAt: payments.createdAt,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ctx.organizationId),
					eq(payments.patientId, args.patientId),
				),
			)
			.orderBy(desc(payments.createdAt))
			.limit(args.limit);

		for (const pay of patientPayments) {
			events.push({
				id: pay.id,
				type: "payment",
				title: `Оплата: ${pay.amountRub} ₽ (${pay.method})`,
				date: pay.createdAt.toISOString(),
				details: {
					amountRub: pay.amountRub,
					method: pay.method,
					status: pay.status,
				},
			});
		}

		// 4. Lab Orders
		const orders = await targetDb
			.select({
				id: labOrders.id,
				toothFdi: labOrders.toothFdi,
				material: labOrders.material,
				colorVita: labOrders.colorVita,
				status: labOrders.status,
				dueDate: labOrders.dueDate,
				clinicalNotes: labOrders.clinicalNotes,
				createdAt: labOrders.createdAt,
			})
			.from(labOrders)
			.where(
				and(
					eq(labOrders.organizationId, ctx.organizationId),
					eq(labOrders.patientId, args.patientId),
				),
			)
			.orderBy(desc(labOrders.createdAt))
			.limit(args.limit);

		for (const o of orders) {
			events.push({
				id: o.id,
				type: "lab_order",
				title: `Заказ ЗТЛ: зуб ${o.toothFdi || "—"}, ${o.material || "протез"}`,
				date: o.createdAt.toISOString(),
				details: {
					toothFdi: o.toothFdi,
					material: o.material,
					colorVita: o.colorVita,
					status: o.status,
					dueDate: o.dueDate?.toISOString() ?? null,
					clinicalNotes: o.clinicalNotes,
				},
			});
		}

		// Sort unified timeline descending by timestamp
		events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return {
			patientId: args.patientId,
			totalEventsCount: events.length,
			timeline: events.slice(0, args.limit),
		};
	},
};

// ─── 6. check_drug_interactions ─────────────────────────────────────────────

const checkDrugInteractionsSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для проверки индивидуальных аллергий"),
	proposedMedicationIds: z
		.array(z.string())
		.min(1, "Укажите хотя бы один планируемый препарат")
		.describe("Идентификаторы препаратов из формуляра DENTE (например, 'med_amox_500', 'med_metron_500', 'med_art_epi_100k', 'med_ibu_400')"),
	existingMedicationIds: z
		.array(z.string())
		.optional()
		.default([])
		.describe("Препараты, постоянно принимаемые пациентом (например, 'warfarin', 'aspirin', 'non_selective_beta_blockers')"),
});

export const checkDrugInteractionsTool: ToolDefinition<
	typeof checkDrugInteractionsSchema
> = {
	name: "check_drug_interactions",
	description:
		"Клинический аудит безопасности фармакотерапии: проверяет непереносимость и аллергический статус пациента, а также нежелательные межлекарственные взаимодействия.",
	parameters: checkDrugInteractionsSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		// 1. Fetch patient allergies
		const allergies = await targetDb
			.select()
			.from(patientDrugAllergies)
			.where(
				and(
					eq(patientDrugAllergies.organizationId, ctx.organizationId),
					eq(patientDrugAllergies.patientId, args.patientId),
				),
			);

		const allergyWarnings: {
			allergenGroup: string;
			proposedDrug: string;
			severity: string;
			manifestations: string;
		}[] = [];

		for (const proposed of args.proposedMedicationIds) {
			const proposedLower = proposed.toLowerCase();
			for (const allergy of allergies) {
				const allergenLower = (allergy.allergenGroup || "").toLowerCase();
				const innLower = (allergy.drugInnLatin || "").toLowerCase();

				// Check for beta-lactam / penicillin cross-allergy
				if (
					(proposedLower.includes("amox") || proposedLower.includes("penicil")) &&
					(allergenLower.includes("пенициллин") ||
						allergenLower.includes("пеницилин") ||
						allergenLower.includes("бета-лактам") ||
						allergenLower.includes("penicillin"))
				) {
					allergyWarnings.push({
						allergenGroup: allergy.allergenGroup,
						proposedDrug: proposed,
						severity: allergy.reactionSeverity || "critical",
						manifestations: allergy.clinicalManifestations || "Анафилаксия / отек Квинке",
					});
				}

				// Check for NSAID / Aspirin allergy (Samter triad)
				if (
					(proposedLower.includes("ibu") || proposedLower.includes("ketorolac")) &&
					(allergenLower.includes("нпвс") ||
						allergenLower.includes("аспирин") ||
						allergenLower.includes("nsaid") ||
						allergy.hasSamterTriad)
				) {
					allergyWarnings.push({
						allergenGroup: allergy.allergenGroup,
						proposedDrug: proposed,
						severity: allergy.reactionSeverity || "critical",
						manifestations: allergy.clinicalManifestations || "Бронхоспазм (аспириновая астма)",
					});
				}

				// Direct INN match
				if (innLower && proposedLower.includes(innLower)) {
					allergyWarnings.push({
						allergenGroup: allergy.allergenGroup,
						proposedDrug: proposed,
						severity: allergy.reactionSeverity || "warning",
						manifestations: allergy.clinicalManifestations || "Лекарственная непереносимость",
					});
				}
			}
		}

		// 2. Drug-drug interactions from formulary engine
		const allDrugsToCheck = [
			...args.proposedMedicationIds,
			...(args.existingMedicationIds || []),
		];
		const interactions: DentalDrugInteractionRule[] =
			checkDentalMedicationInteractions(allDrugsToCheck);

		const hasCriticalAllergy = allergyWarnings.some(
			(w) => w.severity === "critical" || w.severity === "high",
		);
		const hasCriticalInteraction = interactions.some(
			(i) => i.severity === "critical",
		);

		return {
			isSafe: !hasCriticalAllergy && !hasCriticalInteraction,
			hasAllergyClash: allergyWarnings.length > 0,
			allergyWarnings,
			drugInteractionsCount: interactions.length,
			drugInteractions: interactions,
		};
	},
};

// ─── 7. get_lab_orders ──────────────────────────────────────────────────────

const getLabOrdersSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для поиска лабораторных нарядов ЗТЛ"),
	statusFilter: z
		.enum(["all", "active", "completed", "cancelled"])
		.optional()
		.default("all")
		.describe("Фильтр статуса заказов (active включает draft, sent, in_progress, shipped, received, refitting)"),
});

export const getLabOrdersTool: ToolDefinition<typeof getLabOrdersSchema> = {
	name: "get_lab_orders",
	description:
		"Мониторинг заказов зуботехнической лаборатории (ЗТЛ): отслеживание готовности коронок/протезов, сроков (ETA), оттенка по шкале VITA и статуса примерки.",
	parameters: getLabOrdersSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const baseQuery = and(
			eq(labOrders.organizationId, ctx.organizationId),
			eq(labOrders.patientId, args.patientId),
		);

		let filterClause = baseQuery;
		if (args.statusFilter === "active") {
			filterClause = and(
				baseQuery,
				or(
					eq(labOrders.status, "draft"),
					eq(labOrders.status, "sent"),
					eq(labOrders.status, "in_progress"),
					eq(labOrders.status, "shipped"),
					eq(labOrders.status, "received"),
					eq(labOrders.status, "refitting"),
				),
			);
		} else if (args.statusFilter === "completed") {
			filterClause = and(baseQuery, eq(labOrders.status, "completed"));
		} else if (args.statusFilter === "cancelled") {
			filterClause = and(baseQuery, eq(labOrders.status, "cancelled"));
		}

		const orders = await targetDb
			.select({
				id: labOrders.id,
				doctorName: labOrders.doctorName,
				toothFdi: labOrders.toothFdi,
				material: labOrders.material,
				colorVita: labOrders.colorVita,
				status: labOrders.status,
				dueDate: labOrders.dueDate,
				clinicalNotes: labOrders.clinicalNotes,
				labComments: labOrders.labComments,
				priceRub: labOrders.priceRub,
				sentAt: labOrders.sentAt,
				completedAt: labOrders.completedAt,
				createdAt: labOrders.createdAt,
			})
			.from(labOrders)
			.where(filterClause)
			.orderBy(desc(labOrders.createdAt));

		return {
			patientId: args.patientId,
			count: orders.length,
			orders,
		};
	},
};

// ─── 8. get_family_balance ──────────────────────────────────────────────────

const getFamilyBalanceSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для проверки семейного баланса и связанных карт"),
});

export const getFamilyBalanceTool: ToolDefinition<
	typeof getFamilyBalanceSchema
> = {
	name: "get_family_balance",
	description:
		"Запрос агрегированного семейного баланса, состава семьи и родственных связей (Head-пациент, дети, супруги) для совместной оплаты лечения.",
	parameters: getFamilyBalanceSchema,
	permissions: ["patients.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		// 1. Find patient and their familyGroupId
		const [patient] = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				familyGroupId: patients.familyGroupId,
			})
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

		if (!patient.familyGroupId) {
			return {
				hasFamilyAccount: false,
				patientId: patient.id,
				patientName: patient.fullName,
				message: "Пациент не привязан к семейной группе",
			};
		}

		// 2. Fetch family group details
		const [group] = await targetDb
			.select({
				id: familyGroups.id,
				name: familyGroups.name,
				groupName: familyGroups.groupName,
				headPatientId: familyGroups.headPatientId,
				balance: familyGroups.balance,
			})
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.organizationId, ctx.organizationId),
					eq(familyGroups.id, patient.familyGroupId),
				),
			)
			.limit(1);

		if (!group) {
			return {
				hasFamilyAccount: false,
				patientId: patient.id,
				patientName: patient.fullName,
				message: "Семейная группа не найдена в базе данных",
			};
		}

		// 3. Fetch all members in this family group
		const members = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				birthDate: patients.birthDate,
				status: patients.status,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.familyGroupId, patient.familyGroupId),
				),
			);

		const enrichedMembers = members.map((m) => ({
			...m,
			isHead: m.id === group.headPatientId,
		}));

		return {
			hasFamilyAccount: true,
			familyGroupId: group.id,
			groupName: group.name || group.groupName || "Семейный счет",
			headPatientId: group.headPatientId,
			balanceRub: group.balance,
			membersCount: enrichedMembers.length,
			members: enrichedMembers,
		};
	},
};

// ─── 9. reschedule_appointment ──────────────────────────────────────────────

const rescheduleAppointmentSchema = z.object({
	appointmentId: z
		.string()
		.uuid("Некорректный UUID записи")
		.describe("ID существующей записи приема"),
	newStartsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Новое время начала приема в ISO 8601"),
	newEndsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Новое время окончания приема в ISO 8601"),
	reason: z
		.string()
		.optional()
		.describe("Причина переноса записи приема"),
});

export const rescheduleAppointmentTool: ToolDefinition<
	typeof rescheduleAppointmentSchema
> = {
	name: "reschedule_appointment",
	description:
		"Перенос существующей записи приема на другое время с проверкой пересечений и занятости врача/кресла. Требует подтверждения (supervised/write).",
	parameters: rescheduleAppointmentSchema,
	permissions: ["schedule.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const newStart = new Date(args.newStartsAt);
		const newEnd = new Date(args.newEndsAt);

		if (Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime())) {
			throw new Error("Некорректный формат даты/времени начала или окончания приема");
		}

		if (newStart >= newEnd) {
			throw new Error("Новое время начала приема должно быть строго раньше времени окончания");
		}

		// 1. Fetch current appointment
		const [currentApp] = await targetDb
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.limit(1);

		if (!currentApp) {
			throw new Error(`Запись приема с ID ${args.appointmentId} не найдена`);
		}

		if (currentApp.status === "cancelled") {
			throw new Error("Нельзя перенести ранее отмененную запись приема");
		}

		// 2. Conflict checking for doctor and chair
		if (currentApp.doctorUserId || currentApp.chairId) {
			const conflictConditions = [
				...(currentApp.doctorUserId ? [eq(appointments.doctorUserId, currentApp.doctorUserId)] : []),
				...(currentApp.chairId ? [eq(appointments.chairId, currentApp.chairId)] : []),
			];

			if (conflictConditions.length > 0) {
				const conflicts = await targetDb
					.select({
						id: appointments.id,
						startsAt: appointments.startsAt,
						endsAt: appointments.endsAt,
					})
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, ctx.organizationId),
							ne(appointments.id, args.appointmentId),
							ne(appointments.status, "cancelled"),
							or(...conflictConditions),
							sql`${appointments.startsAt} < ${newEnd} AND ${appointments.endsAt} > ${newStart}`,
						),
					)
					.limit(1);

				if (conflicts.length > 0) {
					throw new Error(
						`Конфликт расписания: выбранный интервал (${args.newStartsAt} — ${args.newEndsAt}) пересекается с другой записью врача или кресла.`,
					);
				}
			}
		}

		// 3. Update appointment
		const updateNote = args.reason
			? `[Перенесено]: ${args.reason}`
			: `[Перенесено с ${currentApp.startsAt.toISOString()}]`;

		const newComment = currentApp.comment
			? `${currentApp.comment}\n${updateNote}`
			: updateNote;

		const [updated] = await targetDb
			.update(appointments)
			.set({
				startsAt: newStart,
				endsAt: newEnd,
				comment: newComment,
			})
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.returning();

		return {
			success: true,
			appointmentId: updated.id,
			patientId: updated.patientId,
			doctorUserId: updated.doctorUserId,
			chairId: updated.chairId,
			previousStartsAt: currentApp.startsAt.toISOString(),
			previousEndsAt: currentApp.endsAt.toISOString(),
			newStartsAt: updated.startsAt.toISOString(),
			newEndsAt: updated.endsAt.toISOString(),
			status: updated.status,
		};
	},
};

// ─── 10. cancel_appointment ─────────────────────────────────────────────────

const cancelAppointmentSchema = z.object({
	appointmentId: z
		.string()
		.uuid("Некорректный UUID записи")
		.describe("ID отменяемой записи приема"),
	cancellationReason: z
		.string()
		.min(1, "Укажите причину отмены приема")
		.describe("Причина отмены приема (пациент заболел, передумал, форс-мажор врача)"),
});

export const cancelAppointmentTool: ToolDefinition<
	typeof cancelAppointmentSchema
> = {
	name: "cancel_appointment",
	description:
		"Отмена записи на прием в расписании клиники с фиксацией причины отмены. Требует подтверждения (supervised/write).",
	parameters: cancelAppointmentSchema,
	permissions: ["schedule.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const [currentApp] = await targetDb
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.limit(1);

		if (!currentApp) {
			throw new Error(`Запись приема с ID ${args.appointmentId} не найдена`);
		}

		if (currentApp.status === "cancelled") {
			return {
				success: true,
				appointmentId: currentApp.id,
				status: "cancelled",
				message: "Запись приема уже была отменена ранее",
			};
		}

		const cancelNote = `[Отменено]: ${args.cancellationReason}`;
		const newComment = currentApp.comment
			? `${currentApp.comment}\n${cancelNote}`
			: cancelNote;

		const [updated] = await targetDb
			.update(appointments)
			.set({
				status: "cancelled",
				comment: newComment,
			})
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.returning();

		return {
			success: true,
			appointmentId: updated.id,
			patientId: updated.patientId,
			doctorUserId: updated.doctorUserId,
			status: "cancelled",
			cancellationReason: args.cancellationReason,
			cancelledAt: new Date().toISOString(),
		};
	},
};

// ─── 11. get_doctor_schedule ────────────────────────────────────────────────

const getDoctorScheduleSchema = z.object({
	doctorUserId: z
		.string()
		.uuid("Некорректный UUID врача")
		.describe("ID врача для получения расписания и занятости"),
	dateFrom: z
		.string()
		.datetime({ offset: true })
		.describe("Начало временного интервала в ISO 8601"),
	dateTo: z
		.string()
		.datetime({ offset: true })
		.describe("Конец временного интервала в ISO 8601"),
});

export const getDoctorScheduleTool: ToolDefinition<
	typeof getDoctorScheduleSchema
> = {
	name: "get_doctor_schedule",
	description:
		"Запрос рабочего расписания врача, занятых слотов и свободной емкости в заданном временном диапазоне.",
	parameters: getDoctorScheduleSchema,
	permissions: ["schedule.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const fromDate = new Date(args.dateFrom);
		const toDate = new Date(args.dateTo);

		if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
			throw new Error("Некорректный формат диапазона дат dateFrom / dateTo");
		}

		if (fromDate >= toDate) {
			throw new Error("dateFrom должно быть строго раньше dateTo");
		}

		// Fetch all appointments for the doctor in range
		const doctorApps = await targetDb
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
				patientName: patients.fullName,
				chairId: appointments.chairId,
				status: appointments.status,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				reason: appointments.reason,
				comment: appointments.comment,
			})
			.from(appointments)
			.leftJoin(patients, eq(patients.id, appointments.patientId))
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.doctorUserId, args.doctorUserId),
					ne(appointments.status, "cancelled"),
					sql`${appointments.startsAt} < ${toDate} AND ${appointments.endsAt} > ${fromDate}`,
				),
			)
			.orderBy(appointments.startsAt);

		let totalBookedMinutes = 0;
		const slots = doctorApps.map((a) => {
			const startMs = Math.max(a.startsAt.getTime(), fromDate.getTime());
			const endMs = Math.min(a.endsAt.getTime(), toDate.getTime());
			const durationMin = Math.round((endMs - startMs) / 60000);
			if (durationMin > 0) {
				totalBookedMinutes += durationMin;
			}

			return {
				appointmentId: a.id,
				patientId: a.patientId,
				patientName: a.patientName || "Пациент",
				chairId: a.chairId,
				status: a.status,
				startsAt: a.startsAt.toISOString(),
				endsAt: a.endsAt.toISOString(),
				durationMinutes: durationMin,
				reason: a.reason,
			};
		});

		const totalRangeMinutes = Math.round(
			(toDate.getTime() - fromDate.getTime()) / 60000,
		);
		const freeCapacityMinutes = Math.max(
			0,
			totalRangeMinutes - totalBookedMinutes,
		);

		return {
			doctorUserId: args.doctorUserId,
			dateFrom: args.dateFrom,
			dateTo: args.dateTo,
			totalAppointmentsCount: doctorApps.length,
			totalBookedMinutes,
			freeCapacityMinutes,
			bookedSlots: slots,
		};
	},
};

// ─── 12. create_staff_task ──────────────────────────────────────────────────

const createStaffTaskSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента, к которому привязана задача"),
	title: z
		.string()
		.min(1, "Название задачи обязательно")
		.describe("Заголовок задачи (например, 'Перезвонить по поводу плана лечения')"),
	description: z
		.string()
		.optional()
		.describe("Подробное описание задачи для сотрудника"),
	priority: z
		.enum(["low", "normal", "high", "urgent"])
		.optional()
		.default("normal")
		.describe("Приоритет задачи"),
	assignedRole: z
		.enum(["admin", "nurse", "doctor", "receptionist", "call_center", "hygienist"])
		.optional()
		.default("admin")
		.describe("Роль ответственного исполнителя"),
	dueDate: z
		.string()
		.datetime({ offset: true })
		.optional()
		.describe("Срок исполнения задачи в ISO 8601 (по умолчанию +24 часа)"),
});

export const createStaffTaskTool: ToolDefinition<typeof createStaffTaskSchema> = {
	name: "create_staff_task",
	description:
		"Создание внутреннего поручения / задачи сотрудникам клиники (администратору, медсестре, врачу) с привязкой к пациенту и сроку выполнения. Требует подтверждения (supervised/write).",
	parameters: createStaffTaskSchema,
	permissions: ["clinical.write", "tasks.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		// 1. Verify patient exists
		const [patient] = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
			})
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

		const dueTimestamp = args.dueDate
			? new Date(args.dueDate)
			: new Date(Date.now() + 24 * 60 * 60 * 1000);

		if (Number.isNaN(dueTimestamp.getTime())) {
			throw new Error("Некорректный формат срока dueDate");
		}

		// 2. Insert into communicationTasks
		const [created] = await targetDb
			.insert(communicationTasks)
			.values({
				organizationId: ctx.organizationId,
				clinicId: ctx.clinicId ?? null,
				patientId: args.patientId,
				assignedRole: args.assignedRole,
				channel: "phone",
				intent: "general",
				status: "needs_call",
				priority: args.priority,
				dueAt: dueTimestamp,
				title: args.title,
				body: args.description || args.title,
			})
			.returning();

		return {
			success: true,
			taskId: created.id,
			patientId: created.patientId,
			patientName: patient.fullName,
			title: created.title,
			description: created.body,
			assignedRole: created.assignedRole,
			priority: created.priority,
			status: created.status,
			dueAt: created.dueAt.toISOString(),
			createdAt: created.createdAt.toISOString(),
		};
	},
};

// ─── 13. get_patient_recalls ────────────────────────────────────────────────

const getPatientRecallsSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для поиска назначенных и рекомендуемых вызовов (recalls)"),
	statusFilter: z
		.enum(["all", "pending", "due_now", "overdue"])
		.optional()
		.default("all")
		.describe("Фильтр по статусу вызова (all, pending, due_now, overdue)"),
});

export const getPatientRecallsTool: ToolDefinition<
	typeof getPatientRecallsSchema
> = {
	name: "get_patient_recalls",
	description:
		"Запрос истории и текущего статуса профилактических вызовов (recalls) пациента: профгигиена, осмотр имплантов, ортодонтический контроль, санация.",
	parameters: getPatientRecallsSchema,
	permissions: ["clinical.read", "communications.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		// 1. Fetch existing communication tasks with intent 'recall'
		const existingRecalls = await targetDb
			.select({
				id: communicationTasks.id,
				title: communicationTasks.title,
				body: communicationTasks.body,
				channel: communicationTasks.channel,
				status: communicationTasks.status,
				priority: communicationTasks.priority,
				dueAt: communicationTasks.dueAt,
				createdAt: communicationTasks.createdAt,
			})
			.from(communicationTasks)
			.where(
				and(
					eq(communicationTasks.organizationId, ctx.organizationId),
					eq(communicationTasks.patientId, args.patientId),
					eq(communicationTasks.intent, "recall"),
				),
			)
			.orderBy(desc(communicationTasks.dueAt));

		const nowMs = Date.now();
		const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

		const enrichedRecalls = existingRecalls.map((r) => {
			const dueMs = r.dueAt.getTime();
			let urgency: "upcoming" | "due_now" | "overdue" = "upcoming";
			if (dueMs < nowMs - fourteenDaysMs) {
				urgency = "overdue";
			} else if (dueMs <= nowMs + fourteenDaysMs) {
				urgency = "due_now";
			}

			return {
				id: r.id,
				title: r.title,
				notes: r.body,
				channel: r.channel,
				status: r.status,
				priority: r.priority,
				urgency,
				dueAt: r.dueAt.toISOString(),
				createdAt: r.createdAt.toISOString(),
			};
		});

		// 2. Fetch last completed visit to calculate medical recall recommendations
		const [lastVisit] = await targetDb
			.select({
				id: visits.id,
				diagnosis: visits.diagnosis,
				treatmentPlan: visits.treatmentPlan,
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
			.limit(1);

		const recommendedRecalls: {
			reason: string;
			title: string;
			recommendedIntervalMonths: number;
			calculatedDueMonth: string;
		}[] = [];

		if (lastVisit) {
			const visitDate = lastVisit.signedAt ?? lastVisit.createdAt;
			const diagLower = (lastVisit.diagnosis || "").toLowerCase();

			// Hygiene recommendation
			recommendedRecalls.push({
				reason: "hygiene",
				title: "Профессиональная гигиена и ремотерапия (каждые 6 мес)",
				recommendedIntervalMonths: RECALL_INTERVAL_MONTHS.hygiene ?? 6,
				calculatedDueMonth: calculateNextRecallDueMonth(visitDate, "hygiene"),
			});

			// Implant or surgery followup recommendation
			if (diagLower.includes("имплант") || diagLower.includes("операц")) {
				recommendedRecalls.push({
					reason: "implant_review",
					title: "Контрольный осмотр дентальных имплантатов и ISQ (6 мес)",
					recommendedIntervalMonths: RECALL_INTERVAL_MONTHS.implant_review ?? 6,
					calculatedDueMonth: calculateNextRecallDueMonth(visitDate, "implant_review"),
				});
			}
		}

		let filteredRecalls = enrichedRecalls;
		if (args.statusFilter === "due_now") {
			filteredRecalls = enrichedRecalls.filter((r) => r.urgency === "due_now");
		} else if (args.statusFilter === "overdue") {
			filteredRecalls = enrichedRecalls.filter((r) => r.urgency === "overdue");
		} else if (args.statusFilter === "pending") {
			filteredRecalls = enrichedRecalls.filter(
				(r) => r.status === "queued" || r.status === "scheduled" || r.status === "needs_call",
			);
		}

		return {
			patientId: args.patientId,
			totalActiveRecallsCount: enrichedRecalls.length,
			recalls: filteredRecalls,
			medicalRecommendations: recommendedRecalls,
		};
	},
};

// ─── 14. schedule_recall ────────────────────────────────────────────────────

const scheduleRecallSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для планирования recall"),
	recallReason: z
		.enum([
			"hygiene",
			"implant_review",
			"ortho_review",
			"checkup",
			"treatment_followup",
			"preventive",
		])
		.default("hygiene")
		.describe("Клиническая причина профилактического вызова"),
	dueAt: z
		.string()
		.datetime({ offset: true })
		.describe("Плановая дата/время recall в ISO 8601"),
	channel: z
		.enum(["whatsapp", "sms", "phone", "telegram", "email"])
		.optional()
		.default("whatsapp")
		.describe("Канал первичной коммуникации"),
	priority: z
		.enum(["low", "normal", "high", "urgent"])
		.optional()
		.default("normal")
		.describe("Приоритет вызова"),
	assignedRole: z
		.string()
		.optional()
		.default("admin")
		.describe("Роль ответственного сотрудника (admin/hygienist)"),
	notes: z
		.string()
		.optional()
		.describe("Клинические примечания к вызову"),
});

export const scheduleRecallTool: ToolDefinition<typeof scheduleRecallSchema> = {
	name: "schedule_recall",
	description:
		"Планирование профилактического вызова (recall) пациента на профгигиену, плановый осмотр или контроль лечения. Требует подтверждения (supervised/write).",
	parameters: scheduleRecallSchema,
	permissions: ["clinical.write", "communications.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const [patient] = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
			})
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

		const dueTimestamp = new Date(args.dueAt);
		if (Number.isNaN(dueTimestamp.getTime())) {
			throw new Error("Некорректный формат даты dueAt");
		}

		const titleByReason: Record<string, string> = {
			hygiene: "Профгигиена полости рта и ремотерапия (Recall)",
			implant_review: "Контрольный осмотр имплантов и прикуса (Recall)",
			ortho_review: "Ортодонтический контроль и активация аппарата (Recall)",
			checkup: "Плановый профилактический осмотр стоматолога (Recall)",
			treatment_followup: "Контроль после сложного эндодонтического/хирургического лечения (Recall)",
			preventive: "Профилактический диспансерный осмотр (Recall)",
		};

		const reasonKey = args.recallReason || "hygiene";
		const taskTitle = titleByReason[reasonKey] || "Профилактический осмотр (Recall)";
		const taskBody = args.notes ? `${taskTitle}. Примечания: ${args.notes}` : taskTitle;

		const [created] = await targetDb
			.insert(communicationTasks)
			.values({
				organizationId: ctx.organizationId,
				clinicId: ctx.clinicId ?? null,
				patientId: args.patientId,
				assignedRole: args.assignedRole || "admin",
				channel: (args.channel || "whatsapp") as any,
				intent: "recall",
				status: "queued",
				priority: args.priority || "normal",
				dueAt: dueTimestamp,
				title: taskTitle,
				body: taskBody,
			})
			.returning();

		return {
			success: true,
			recallTaskId: created.id,
			patientId: created.patientId,
			patientName: patient.fullName,
			recallReason: args.recallReason,
			title: created.title,
			channel: created.channel,
			dueAt: created.dueAt.toISOString(),
			priority: created.priority,
			status: created.status,
			createdAt: created.createdAt.toISOString(),
		};
	},
};

/**
 * Registers all clinical, scheduling, staff task, and recall tools into the specified ToolRegistry.
 */
export function registerClinicalTools(
	registry: ToolRegistry,
	moduleName = "clinical",
): void {
	// 1. Exploration & Diagnostic Tools
	registry.register(findPatientTool, moduleName);
	registry.register(getEmrCardTool, moduleName);
	registry.register(suggestIcd10PlanTool, moduleName);
	registry.register(getPatientTimelineTool, moduleName);
	registry.register(checkDrugInteractionsTool, moduleName);
	registry.register(getLabOrdersTool, moduleName);
	registry.register(getFamilyBalanceTool, moduleName);

	// 2. Interactive Schedule Tools (READ & WRITE with confirmation)
	registry.register(bookVisitTool, moduleName);
	registry.register(rescheduleAppointmentTool, moduleName);
	registry.register(cancelAppointmentTool, moduleName);
	registry.register(getDoctorScheduleTool, moduleName);

	// 3. Staff Tasks & Preventive Recalls Tools
	registry.register(createStaffTaskTool, moduleName);
	registry.register(getPatientRecallsTool, moduleName);
	registry.register(scheduleRecallTool, moduleName);

	// 4. Vision AI & Radiograph Diagnostic Analysis
	registry.register(analyzeRadiographVisionTool, moduleName);

	// 5. Treatment Estimates & Dental Laboratory Tools
	registry.register(calculateTreatmentEstimateTool, moduleName);
	registry.register(draftLabWorkOrderTool, moduleName);

	// 6. Cancellation Gap Auto-Fill & Informed Consent Tools
	registry.register(autoFillCancellationGapTool, moduleName);
	registry.register(generateInformedConsentTool, moduleName);

	// 7. SanPiN 3.3686-21 Sterilization & Infection Control Tools
	registry.register(verifyKraftPackTool, moduleName);
	registry.register(recordSterilizationTestTool, moduleName);
}

export {
	analyzeRadiographVisionTool,
	autoFillCancellationGapTool,
	calculateTreatmentEstimateTool,
	draftLabWorkOrderTool,
	generateInformedConsentTool,
	recordSterilizationTestTool,
	registerSanpinTools,
	verifyKraftPackTool,
};



