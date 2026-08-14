import {
	anesthesiaTechniqueSchema,
	anestheticDrugSchema,
	asaClassificationSchema,
	calculateAnestheticSafety,
	vasoconstrictorRatioSchema,
	vitalSignsMeasurementSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { anesthesiaLogs, patients, users, visits } from "../db/schema.js";
import { requireOrganizationId } from "../security/identity.js";

const calculateSafetyBodySchema = z.object({
	drug: anestheticDrugSchema,
	concentrationPct: z.number().positive().default(4.0),
	vasoconstrictor: vasoconstrictorRatioSchema.default("1:200000"),
	carpuleVolumeMl: z.number().positive().default(1.7),
	carpulesAdministered: z.number().positive().default(1.0),
	patientWeightKg: z.number().positive().default(70),
	patientAgeYears: z.number().int().nonnegative().optional().default(35),
	asaClass: asaClassificationSchema.optional().default("ASA_I"),
	hasCardiovascularDisease: z.boolean().optional().default(false),
});

const createAnesthesiaLogBodySchema = z.object({
	visitId: z.string().uuid().optional().nullable(),
	doctorId: z.string().uuid().optional().nullable(),
	technique: anesthesiaTechniqueSchema.default("infiltration"),
	drug: anestheticDrugSchema.default("articaine"),
	drugBrandName: z.string().default("Ультракаин Д-С"),
	concentrationPct: z.number().positive().default(4.0),
	vasoconstrictor: vasoconstrictorRatioSchema.default("1:200000"),
	carpuleVolumeMl: z.number().positive().default(1.7),
	carpulesAdministered: z.number().positive().default(1.0),
	patientWeightKg: z.number().positive().default(70),
	patientAgeYears: z.number().int().nonnegative().optional().default(35),
	asaClass: asaClassificationSchema.optional().default("ASA_I"),
	hasCardiovascularDisease: z.boolean().optional().default(false),
	aspirationTestPositive: z.boolean().default(false),
	toothNumbers: z.array(z.number().int()).default([]),
	injectionSite: z.string().optional().nullable(),
	lotNumber: z.string().optional().nullable(),
	expirationDate: z.string().optional().nullable(),
	vitalsPre: vitalSignsMeasurementSchema.optional().nullable(),
	vitalsIntra: vitalSignsMeasurementSchema.optional().nullable(),
	vitalsPost: vitalSignsMeasurementSchema.optional().nullable(),
	notes: z.string().optional().nullable(),
	complications: z.string().optional().nullable(),
});

export async function registerAnesthesiaRoutes(app: FastifyInstance) {
	/**
	 * Клинический калькулятор безопасности местной анестезии и седации.
	 */
	app.post(
		"/api/anesthesia/calculate-safety",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = calculateSafetyBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					message: "Некорректные параметры расчета безопасности анестетика",
					errors: parsed.error.format(),
				});
			}

			const calculation = calculateAnestheticSafety(parsed.data);
			return reply.send({
				success: true,
				params: parsed.data,
				calculation,
			});
		},
	);

	/**
	 * Журнал анестезий пациента (история всех введений с дозировками и витальными функциями).
	 */
	app.get(
		"/api/anesthesia/patients/:patientId/logs",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };

			return withTenantCtx(orgId, async () => {
				const rows = await db
					.select()
					.from(anesthesiaLogs)
					.where(
						and(
							eq(anesthesiaLogs.organizationId, orgId),
							eq(anesthesiaLogs.patientId, patientId),
						),
					)
					.orderBy(desc(anesthesiaLogs.createdAt))
					.limit(50);

				return reply.send({
					patientId,
					logs: rows.map((r) => ({
						id: r.id,
						visitId: r.visitId,
						doctorId: r.doctorId,
						technique: r.technique,
						drug: r.drug,
						drugBrandName: r.drugBrandName,
						concentrationPct: Number(r.concentrationPct),
						vasoconstrictor: r.vasoconstrictor,
						carpuleVolumeMl: Number(r.carpuleVolumeMl),
						carpulesAdministered: Number(r.carpulesAdministered),
						totalDoseMg: Number(r.totalDoseMg),
						maxAllowedDoseMg: Number(r.maxAllowedDoseMg),
						epinephrineMg: Number(r.epinephrineMg),
						maxEpinephrineMg: Number(r.maxEpinephrineMg),
						aspirationTestPositive: r.aspirationTestPositive,
						toothNumbers: r.toothNumbers,
						injectionSite: r.injectionSite,
						lotNumber: r.lotNumber,
						expirationDate: r.expirationDate,
						vitalsPre: r.vitalsPre,
						vitalsIntra: r.vitalsIntra,
						vitalsPost: r.vitalsPost,
						notes: r.notes,
						complications: r.complications,
						createdAt: r.createdAt.toISOString(),
					})),
				});
			});
		},
	);

	/**
	 * Создание записи в журнале анестезиологического пособия.
	 */
	app.post(
		"/api/anesthesia/patients/:patientId/logs",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };

			const parsed = createAnesthesiaLogBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					message: "Некорректные параметры протокола анестезии",
					errors: parsed.error.format(),
				});
			}

			const data = parsed.data;

			return withTenantCtx(orgId, async () => {
				const [patient] = await db
					.select({ id: patients.id })
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
					.limit(1);

				if (!patient) {
					return reply.status(404).send({ message: "Пациент не найден" });
				}

				const safety = calculateAnestheticSafety({
					drug: data.drug,
					concentrationPct: data.concentrationPct,
					vasoconstrictor: data.vasoconstrictor,
					carpuleVolumeMl: data.carpuleVolumeMl,
					carpulesAdministered: data.carpulesAdministered,
					patientWeightKg: data.patientWeightKg,
					patientAgeYears: data.patientAgeYears,
					asaClass: data.asaClass,
					hasCardiovascularDisease: data.hasCardiovascularDisease,
				});

				const [record] = await db
					.insert(anesthesiaLogs)
					.values({
						organizationId: orgId,
						patientId,
						visitId: data.visitId || null,
						doctorId: data.doctorId || null,
						technique: data.technique,
						drug: data.drug,
						drugBrandName: data.drugBrandName,
						concentrationPct: String(data.concentrationPct),
						vasoconstrictor: data.vasoconstrictor,
						carpuleVolumeMl: String(data.carpuleVolumeMl),
						carpulesAdministered: String(data.carpulesAdministered),
						totalDoseMg: String(safety.totalAnestheticMg),
						maxAllowedDoseMg: String(safety.maxRecommendedAnestheticMg),
						epinephrineMg: String(safety.totalEpinephrineMg),
						maxEpinephrineMg: String(safety.maxRecommendedEpinephrineMg),
						aspirationTestPositive: data.aspirationTestPositive,
						toothNumbers: data.toothNumbers,
						injectionSite: data.injectionSite || null,
						lotNumber: data.lotNumber || null,
						expirationDate: data.expirationDate || null,
						vitalsPre: data.vitalsPre || null,
						vitalsIntra: data.vitalsIntra || null,
						vitalsPost: data.vitalsPost || null,
						notes: data.notes || null,
						complications: data.complications || null,
					})
					.returning();

				return reply.status(201).send({
					success: true,
					id: record?.id || "anesthesia-logged",
					safety,
					log: record,
				});
			});
		},
	);

	/**
	 * Удаление / аннулирование ошибочной записи анестезии.
	 */
	app.delete(
		"/api/anesthesia/logs/:logId",
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { logId } = request.params as { logId: string };

			return withTenantCtx(orgId, async () => {
				const deleted = await db
					.delete(anesthesiaLogs)
					.where(and(eq(anesthesiaLogs.organizationId, orgId), eq(anesthesiaLogs.id, logId)))
					.returning({ id: anesthesiaLogs.id });

				if (deleted.length === 0) {
					return reply.status(404).send({ message: "Запись анестезии не найдена" });
				}

				return reply.send({ success: true, deletedId: logId });
			});
		},
	);
}
