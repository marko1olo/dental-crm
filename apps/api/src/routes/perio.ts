import {
	calculatePerioIndices,
	calculatePsrSextants,
	perioToothRecordSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { patients, perioCharts, users, visits } from "../db/schema.js";
import { requireOrganizationId } from "../security/identity.js";

const savePerioChartBodySchema = z.object({
	visitId: z.string().uuid().optional().nullable(),
	doctorId: z.string().uuid().optional().nullable(),
	chartDate: z.string().datetime().optional(),
	teeth: z.array(perioToothRecordSchema).min(1, "Требуется хотя бы одна запись зуба"),
	notes: z.string().max(2000).optional().nullable(),
});

export async function registerPerioRoutes(app: FastifyInstance) {
	/**
	 * POST /api/perio/calculate-indices — предварительный расчёт пародонтальных индексов без сохранения в БД.
	 */
	app.post(
		"/api/perio/calculate-indices",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const bodySchema = z.object({
				teeth: z.array(perioToothRecordSchema),
			});
			const parsed = bodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный формат данных пародонтального зондирования.",
					issues: parsed.error.issues,
				});
			}

			const summary = calculatePerioIndices(parsed.data.teeth);
			const psr = calculatePsrSextants(parsed.data.teeth);

			return reply.status(200).send({
				success: true,
				summary,
				psr,
			});
		},
	);

	/**
	 * GET /api/perio/patients/:patientId/charts — список всех пародонтологических карт пациента.
	 */
	app.get(
		"/api/perio/patients/:patientId/charts",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "perio charts read")))
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const paramsSchema = z.object({ patientId: z.string().uuid() });
			const parsed = paramsSchema.safeParse(request.params);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Идентификатор пациента должен быть валидным UUID.",
				});
			}
			const { patientId } = parsed.data;

			const charts = await db
				.select({
					id: perioCharts.id,
					organizationId: perioCharts.organizationId,
					patientId: perioCharts.patientId,
					visitId: perioCharts.visitId,
					doctorId: perioCharts.doctorId,
					chartDate: perioCharts.chartDate,
					summaryData: perioCharts.summaryData,
					psrData: perioCharts.psrData,
					notes: perioCharts.notes,
					createdAt: perioCharts.createdAt,
				})
				.from(perioCharts)
				.where(
					and(
						eq(perioCharts.patientId, patientId),
						eq(perioCharts.organizationId, orgId),
					),
				)
				.orderBy(desc(perioCharts.chartDate));

			return reply.status(200).send({
				success: true,
				charts,
			});
		},
	);

	/**
	 * GET /api/perio/charts/:chartId — детальные данные конкретной пародонтологической карты.
	 */
	app.get(
		"/api/perio/charts/:chartId",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "perio chart read")))
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const paramsSchema = z.object({ chartId: z.string().uuid() });
			const parsed = paramsSchema.safeParse(request.params);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Идентификатор карты должен быть валидным UUID.",
				});
			}
			const { chartId } = parsed.data;

			const [chart] = await db
				.select()
				.from(perioCharts)
				.where(
					and(
						eq(perioCharts.id, chartId),
						eq(perioCharts.organizationId, orgId),
					),
				)
				.limit(1);

			if (!chart) {
				return reply.status(404).send({
					error: "NotFound",
					message: "Пародонтологическая карта не найдена.",
				});
			}

			return reply.status(200).send({
				success: true,
				chart,
			});
		},
	);

	/**
	 * POST /api/perio/patients/:patientId/charts — сохранение новой пародонтологической карты.
	 */
	app.post(
		"/api/perio/patients/:patientId/charts",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"perio chart create",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const paramsSchema = z.object({ patientId: z.string().uuid() });
			const parsedParams = paramsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Идентификатор пациента должен быть валидным UUID.",
				});
			}
			const { patientId } = parsedParams.data;

			const parsedBody = savePerioChartBodySchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные данные пародонтологической карты.",
					issues: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;

			// Verify patient exists in organization
			const [patient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patient) {
				return reply.status(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в текущей клинике.",
				});
			}

			// Calculate clinical indices
			const summary = calculatePerioIndices(body.teeth);
			const psr = calculatePsrSextants(body.teeth);
			const chartDate = body.chartDate ? new Date(body.chartDate) : new Date();

			const [inserted] = await db
				.insert(perioCharts)
				.values({
					organizationId: orgId,
					patientId,
					visitId: body.visitId ?? null,
					doctorId: body.doctorId ?? null,
					chartDate,
					teethData: body.teeth,
					summaryData: summary,
					psrData: psr,
					notes: body.notes ?? null,
				})
				.returning();

			return reply.status(201).send({
				success: true,
				chart: inserted,
			});
		},
	);

	/**
	 * DELETE /api/perio/charts/:chartId — удаление пародонтологической карты.
	 */
	app.delete(
		"/api/perio/charts/:chartId",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"perio chart delete",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const paramsSchema = z.object({ chartId: z.string().uuid() });
			const parsed = paramsSchema.safeParse(request.params);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Идентификатор карты должен быть валидным UUID.",
				});
			}
			const { chartId } = parsed.data;

			const [deleted] = await db
				.delete(perioCharts)
				.where(
					and(
						eq(perioCharts.id, chartId),
						eq(perioCharts.organizationId, orgId),
					),
				)
				.returning({ id: perioCharts.id });

			if (!deleted) {
				return reply.status(404).send({
					error: "NotFound",
					message: "Пародонтологическая карта не найдена или уже удалена.",
				});
			}

			return reply.status(200).send({
				success: true,
				deletedId: deleted.id,
			});
		},
	);
}
