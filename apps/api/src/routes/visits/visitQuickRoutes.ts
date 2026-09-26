import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { chairs, clinics } from "../../db/schema.js";
import { createPatientInDb } from "../../db/patientsQuery.js";
import { createAppointmentInDb } from "../../db/appointmentsQuery.js";
import { openVisitForAppointmentInDb } from "../../db/visitsQuery.js";
import type { RequestIdentity } from "../../security/identity.js";

export function registerVisitQuickRoutes(app: FastifyInstance) {
	const quickVisitHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit quick",
		);
		if (!context) return;
		const orgId = context.organizationId;

		const identity = (request as unknown as { __denteIdentity?: RequestIdentity }).__denteIdentity;
		const doctorUserId = identity?.userId;

		if (!doctorUserId) {
			reply.code(400);
			return { error: "QuickVisitValidationError", message: "Не удалось определить врача" };
		}

		const activeChairs = await database
			.select()
			.from(chairs)
			.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
			.orderBy(chairs.id);

		let chair = activeChairs[0];
		if (!chair) {
			// Zero Dead-Ends (Мандат 8n): если в клинике ещё нет заведённых кресел (соло-врач на аренде / новый филиал),
			// автоматически инициализируем клинику и «Кресло 1», не прерывая приём пациента блокирующей ошибкой
			const clinicRows = await database
				.select({ id: clinics.id })
				.from(clinics)
				.where(eq(clinics.organizationId, orgId))
				.limit(1);
			let clinicId = clinicRows[0]?.id;
			if (!clinicId) {
				const [createdClinic] = await database
					.insert(clinics)
					.values({
						organizationId: orgId,
						name: "Основная клиника",
						address: "Кабинет врача",
					})
					.returning({ id: clinics.id });
				clinicId = createdClinic?.id;
			}
			if (clinicId) {
				const [createdChair] = await database
					.insert(chairs)
					.values({
						organizationId: orgId,
						clinicId,
						name: "Кресло 1",
						isActive: true,
					})
					.returning();
				chair = createdChair;
			}
		}

		if (!chair) {
			reply.code(400);
			return {
				error: "QuickVisitValidationError",
				message: "В клинике не настроены активные кресла",
			};
		}

		const patient = await createPatientInDb(orgId, {
			fullName: "Быстрый прием",
			isAnonymous: false,
			phone: null,
			birthDate: null,
		});

		const startsAt = new Date().toISOString();
		const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		try {
			const appointment = await createAppointmentInDb(orgId, {
				patientId: patient.id,
				doctorUserId,
				chairId: chair.id,
				status: "in_treatment",
				startsAt,
				endsAt,
				reason: "Быстрый прием",
				comment: null,
				assistantUserId: null,
			});

			await openVisitForAppointmentInDb(orgId, appointment.id);

			reply.code(201);
			return { patientId: patient.id, appointmentId: appointment.id };
		} catch (error) {
			const errObj = error as Record<string, unknown>;
			const cause = (errObj?.cause && typeof errObj.cause === "object" ? errObj.cause : {}) as Record<string, unknown>;
			const code = String(errObj?.code ?? cause?.code ?? "");
			const message = String(errObj?.message ?? cause?.message ?? "");
			const constraint = String(errObj?.constraint ?? cause?.constraint ?? errObj?.constraint_name ?? cause?.constraint_name ?? "");
			if (
				code === "23P01" ||
				constraint.includes("overlap_excl") ||
				message.includes("23P01") ||
				message.includes("exclusion constraint") ||
				message.includes("overlap_excl") ||
				message.includes("уже есть запись") ||
				message.includes("уже занято")
			) {
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
