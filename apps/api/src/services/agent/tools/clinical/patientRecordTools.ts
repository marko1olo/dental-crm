/**
 * @file patientRecordTools.ts
 * @description Layer 2: Patient EMR record exploration, timeline, family balance, and lab orders tools.
 */

import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db/client.js";
import {
	familyGroups,
	labOrders,
	patientDrugAllergies,
	patients,
	payments,
	treatmentPlans,
	visits,
} from "../../../../db/schema.js";
import type { ToolDefinition } from "../tool.js";
import type { TimelineEvent } from "./types.js";

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
		.describe("Включать ли историю приемов и дневников приёма"),
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
		"Получение полной электронной медицинской карты (ЭМК): профиль, визиты, диагнозы МКБ-10, аллергии и активные планы лечения.",
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

// ─── 8. get_patient_timeline ────────────────────────────────────────────────

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

export const getPatientTimelineTool: ToolDefinition<
	typeof getPatientTimelineSchema
> = {
	name: "get_patient_timeline",
	description:
		"Извлечение единой хронологической истории пациента: приемы (дневники приёма, жалобы, диагнозы), планы лечения, финансовые транзакции и заказы зуботехнической лаборатории.",
	parameters: getPatientTimelineSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;
		const events: TimelineEvent[] = [];

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

		events.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
		);

		return {
			patientId: args.patientId,
			totalEventsCount: events.length,
			timeline: events.slice(0, args.limit),
		};
	},
};

// ─── 9. get_lab_orders ──────────────────────────────────────────────────────

const getLabOrdersSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для поиска лабораторных нарядов ЗТЛ"),
	statusFilter: z
		.enum(["all", "active", "completed", "cancelled"])
		.optional()
		.default("all")
		.describe(
			"Фильтр статуса заказов (active включает draft, sent, in_progress, shipped, received, refitting)",
		),
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

// ─── 10. get_family_balance ─────────────────────────────────────────────────

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

		const enrichedMembers = members.map((m: typeof patients.$inferSelect) => ({
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
