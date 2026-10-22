import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { db as database } from "../../db/client.js";
import { perioCharts, visits } from "../../db/schema.js";
import {
	fetchPatientLatestPeriodontogram,
	upsertPatientFullPeriodontogram,
} from "../../services/periodontogramService.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerVisitPerioRoutes(app: FastifyInstance) {
	const getHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"visit perio read",
		);
		if (!context) return;

		const { visitId } = request.params as { visitId: string };
		if (!UUID_REGEX.test(visitId)) {
			return reply.code(400).send({
				error: "InvalidVisitId",
				message: "Некорректный идентификатор приёма",
			});
		}

		const [visit] = await database
			.select({
				id: visits.id,
				patientId: visits.patientId,
				organizationId: visits.organizationId,
			})
			.from(visits)
			.where(
				and(
					eq(visits.id, visitId),
					eq(visits.organizationId, context.organizationId),
				),
			)
			.limit(1);

		if (!visit) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "Приём не найден",
			});
		}

		// 1. Попытка получить карту пародонта, привязанную к этому визиту
		const [visitChart] = await database
			.select()
			.from(perioCharts)
			.where(
				and(
					eq(perioCharts.visitId, visit.id),
					eq(perioCharts.organizationId, context.organizationId),
				),
			)
			.orderBy(desc(perioCharts.createdAt))
			.limit(1);

		if (visitChart) {
			return reply.send({
				ok: true,
				success: true,
				visitId: visit.id,
				patientId: visit.patientId,
				data: visitChart,
			});
		}

		// 2. Фоллбэк: актуальная пародонтограмма пациента (черновик или последний снимок)
		const latestPerio = await fetchPatientLatestPeriodontogram(
			context.organizationId,
			visit.patientId,
		);

		return reply.send({
			ok: true,
			success: true,
			visitId: visit.id,
			patientId: visit.patientId,
			data: latestPerio,
		});
	};

	const postHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit perio update",
		);
		if (!context) return;

		const { visitId } = request.params as { visitId: string };
		if (!UUID_REGEX.test(visitId)) {
			return reply.code(400).send({
				error: "InvalidVisitId",
				message: "Некорректный идентификатор приёма",
			});
		}

		const [visit] = await database
			.select({
				id: visits.id,
				patientId: visits.patientId,
				organizationId: visits.organizationId,
			})
			.from(visits)
			.where(
				and(
					eq(visits.id, visitId),
					eq(visits.organizationId, context.organizationId),
				),
			)
			.limit(1);

		if (!visit) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "Приём не найден",
			});
		}

		const body = (request.body as Record<string, unknown>) || {};
		const teeth = Array.isArray(body.teeth)
			? body.teeth
			: Array.isArray(body.teethData)
				? (body.teethData as any[])
				: [];
		const sites = Array.isArray(body.sites) ? (body.sites as any[]) : [];
		const summary = body.summary ?? body.summaryData ?? {};
		const psr = body.psr ?? body.psrData ?? null;
		const notes = typeof body.notes === "string" ? body.notes : null;
		const status = body.status === "closed" ? "closed" : "draft";
		const autoClose = Boolean(body.autoClose);

		const identity = getRequestIdentity(request);
		const doctorUserId = identity.userId ?? null;

		// 1. Если переданы зубы или сайты — синкаем в periodontogram_snapshots / periodontogram_teeth
		if (teeth.length > 0 || sites.length > 0) {
			try {
				await upsertPatientFullPeriodontogram({
					orgId: context.organizationId,
					patientId: visit.patientId,
					recordedByUserId: doctorUserId,
					teeth,
					sites,
					notes,
					status,
					autoClose,
				});
			} catch (err) {
				request.log.warn({ err }, "Не удалось синхронизировать snapshot пародонта");
			}
		}

		// 2. Сохраняем в таблицу perio_charts
		const [existingChart] = await database
			.select({ id: perioCharts.id })
			.from(perioCharts)
			.where(
				and(
					eq(perioCharts.visitId, visit.id),
					eq(perioCharts.organizationId, context.organizationId),
				),
			)
			.limit(1);

		let savedChart: unknown;
		if (existingChart) {
			const [updated] = await database
				.update(perioCharts)
				.set({
					teethData: teeth,
					summaryData: summary,
					psrData: psr,
					notes,
					updatedAt: new Date(),
				})
				.where(eq(perioCharts.id, existingChart.id))
				.returning();
			savedChart = updated;
		} else {
			const [created] = await database
				.insert(perioCharts)
				.values({
					organizationId: context.organizationId,
					patientId: visit.patientId,
					visitId: visit.id,
					doctorId: doctorUserId,
					chartDate: new Date(),
					teethData: teeth,
					summaryData: summary,
					psrData: psr,
					notes,
				})
				.returning();
			savedChart = created;
		}

		return reply.send({
			ok: true,
			success: true,
			visitId: visit.id,
			patientId: visit.patientId,
			data: savedChart,
		});
	};

	// Регистрация обоих путей: /api/visits/:visitId/perio и /api/clinical/visits/:visitId/perio
	app.get("/api/visits/:visitId/perio", getHandler);
	app.get("/api/clinical/visits/:visitId/perio", getHandler);

	app.post("/api/visits/:visitId/perio", postHandler);
	app.post("/api/clinical/visits/:visitId/perio", postHandler);

	app.put("/api/visits/:visitId/perio", postHandler);
	app.put("/api/clinical/visits/:visitId/perio", postHandler);
}
