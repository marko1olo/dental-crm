/**
 * clinicalTools.ts — Clinical agent tools for EMR exploration, ICD-10 diagnostic assistance, scheduling,
 * patient timeline, drug-drug interaction safety, dental laboratory tracking, and family balance management.
 */

import {
	checkDentalMedicationInteractions,
	type DentalDrugInteractionRule,
} from "@dental/shared";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import {
	appointments,
	familyGroups,
	labOrders,
	patientDrugAllergies,
	patients,
	payments,
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

/**
 * Registers all clinical tools into the specified ToolRegistry.
 */
export function registerClinicalTools(
	registry: ToolRegistry,
	moduleName = "clinical",
): void {
	// Original 4 clinical tools
	registry.register(findPatientTool, moduleName);
	registry.register(getEmrCardTool, moduleName);
	registry.register(suggestIcd10PlanTool, moduleName);
	registry.register(bookVisitTool, moduleName);

	// 4 New high-value tools
	registry.register(getPatientTimelineTool, moduleName);
	registry.register(checkDrugInteractionsTool, moduleName);
	registry.register(getLabOrdersTool, moduleName);
	registry.register(getFamilyBalanceTool, moduleName);
}
