import { applyPlanItemsToVisitSchema } from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { appointments, visits } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	VisitWorkOrderError,
	VisitWorkOrderService,
} from "../../services/clinical/VisitWorkOrderService.js";
import { wsBroker } from "../../services/websocketBroker.js";

export function registerVisitWorkOrderRoutes(app: FastifyInstance) {
	// Перенос согласованных услуг из плана лечения в наряд / протокол приёма (Feature #41, ЗоЗПП ст. 16, ПП РФ № 736)
	app.post("/api/visits/:visitId/apply-plan-items", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit work order apply plan items",
		);
		if (!context) return;

		const { visitId } = request.params as { visitId: string };
		const parsed = applyPlanItemsToVisitSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректные параметры запроса переноса услуг плана лечения.",
				issues: parsed.error.issues,
			};
		}

		try {
			const identity = getRequestIdentity(request);
			const result = await VisitWorkOrderService.applyPlanItemsToVisit({
				organizationId: context.organizationId,
				visitId,
				planId: parsed.data.planId,
				itemIds: parsed.data.itemIds,
				actorUserId: identity.userId ?? null,
			});
			return result;
		} catch (error) {
			if (error instanceof VisitWorkOrderError) {
				reply.code(error.statusCode);
				return {
					error: error.code,
					message: error.message,
				};
			}
			request.log.error(
				error,
				"Непредвиденная ошибка переноса позиций плана лечения в наряд приёма",
			);
			reply.code(500);
			return {
				error: "InternalServerError",
				message: "Не удалось перенести позиции плана лечения в наряд приёма.",
			};
		}
	});

	// Атомарное завершение наряда приёма: списание материалов со склада и фиксация статуса визита
	const completeWorkOrderHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit work order complete",
		);
		if (!context) return;

		const { visitId } = request.params as { visitId: string };
		const body =
			(request.body as
				| { status?: "signed" | "draft" | "voided" | "completed" | "in_progress" }
				| undefined) ?? {};

		try {
			const identity = getRequestIdentity(request);
			const result = await VisitWorkOrderService.completeVisitWorkOrder({
				organizationId: context.organizationId,
				visitId,
				actorUserId: identity.userId ?? null,
				status: body.status ?? "signed",
			});

			// Атомарно переводим статус связанной записи расписания в "completed" при завершении наряда приёма
			const [linkedVisit] = await database
				.select({ appointmentId: visits.appointmentId })
				.from(visits)
				.where(
					and(
						eq(visits.id, visitId),
						eq(visits.organizationId, context.organizationId),
					),
				)
				.limit(1);

			if (linkedVisit?.appointmentId) {
				await database
					.update(appointments)
					.set({
						status: "completed",
					})
					.where(
						and(
							eq(appointments.id, linkedVisit.appointmentId),
							eq(appointments.organizationId, context.organizationId),
						),
					);

				wsBroker.broadcastToOrganization(context.organizationId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						appointmentId: linkedVisit.appointmentId,
						visitId,
						status: "completed",
					},
				});
			}

			return result;
		} catch (error) {
			if (error instanceof VisitWorkOrderError) {
				reply.code(error.statusCode);
				return {
					error: error.code,
					message: error.message,
				};
			}
			request.log.error(
				error,
				"Непредвиденная ошибка завершения наряда приёма и списания материалов",
			);
			reply.code(500);
			return {
				error: "InternalServerError",
				message: "Не удалось завершить наряд приёма и списать материалы.",
			};
		}
	};

	app.post("/api/visits/:visitId/complete-work-order", completeWorkOrderHandler);
	app.post("/api/visits/:visitId/work-order/complete", completeWorkOrderHandler);
}
