import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { createPatientInDb } from "../../db/patientsQuery.js";
import { createAppointmentInDb } from "../../db/appointmentsQuery.js";
import { openVisitForAppointmentInDb } from "../../db/visitsQuery.js";
import type { RequestIdentity } from "../../security/identity.js";
import { findOrCreateActiveChair } from "./ensureActiveChair.js";

function isOverlapError(error: unknown): boolean {
	const errObj = error as Record<string, unknown>;
	const cause = (errObj?.cause && typeof errObj.cause === "object"
		? errObj.cause
		: {}) as Record<string, unknown>;
	const code = String(errObj?.code ?? cause?.code ?? "");
	const msg = String(errObj?.message ?? cause?.message ?? "");
	const cstr = String(
		errObj?.constraint ??
			cause?.constraint ??
			errObj?.constraint_name ??
			cause?.constraint_name ??
			"",
	);
	return (
		code === "23P01" ||
		cstr.includes("overlap_excl") ||
		msg.includes("23P01") ||
		msg.includes("exclusion constraint") ||
		msg.includes("overlap_excl") ||
		msg.includes("уже есть запись") ||
		msg.includes("уже занято")
	);
}

export function registerVisitQuickRoutes(app: FastifyInstance) {
	const quickVisitHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit quick",
		);
		if (!context) return;
		const orgId = context.organizationId;

		const identity = (request as unknown as { __denteIdentity?: RequestIdentity })
			.__denteIdentity;
		const doctorUserId = identity?.userId;

		if (!doctorUserId) {
			reply.code(400);
			return {
				error: "QuickVisitValidationError",
				message: "Не удалось определить врача",
			};
		}

		const chair = await findOrCreateActiveChair(orgId);
		if (!chair) {
			reply.code(400);
			return {
				error: "QuickVisitValidationError",
				message: "В клинике не настроены активные кресла",
			};
		}

		const startsAt = new Date().toISOString();
		const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		try {
			const result = await database.transaction(async (tx) => {
				const patient = await createPatientInDb(
					orgId,
					{
						fullName: "Быстрый прием",
						isAnonymous: false,
						phone: null,
						birthDate: null,
					},
					tx,
				);

				const appointment = await createAppointmentInDb(
					orgId,
					{
						patientId: patient.id,
						doctorUserId,
						chairId: chair.id,
						status: "in_treatment",
						startsAt,
						endsAt,
						reason: "Быстрый прием",
						comment: null,
						assistantUserId: null,
					},
					tx,
				);

				await openVisitForAppointmentInDb(orgId, appointment.id, tx);

				return { patientId: patient.id, appointmentId: appointment.id };
			});

			reply.code(201);
			return result;
		} catch (error) {
			if (isOverlapError(error)) {
				return reply.code(409).send({
					code: "CHAIR_OVERBOOKING_COLLISION",
					reason: "resource_overlap",
					message: "Выбранное кресло или врач уже заняты в это время.",
				});
			}
			throw error;
		}
	};

	app.post("/api/visits/quick", quickVisitHandler);
	app.post("/api/visits/fast", quickVisitHandler);
}
