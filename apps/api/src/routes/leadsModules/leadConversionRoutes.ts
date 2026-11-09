import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	convertLeadSchema,
	convertLeadToAppointment,
	createPatientFromLead,
} from "../leadsConversion.js";

export async function registerLeadConversionRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/leads/:id/convert", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead convert",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const convertParsed = convertLeadSchema.safeParse(req.body);
		if (!convertParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте данные конвертации лида: даты, кресло и врач.",
			});
		}

		return await convertLeadToAppointment({
			db,
			wsBroker,
			organizationId,
			leadId: id,
			payload: convertParsed.data,
			req,
			reply,
		});
	});

	const createPatientFromLeadHandler = async (
		req: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
	) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead create patient",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		return await createPatientFromLead({
			db,
			wsBroker,
			organizationId,
			leadId: id,
			reply,
		});
	};

	app.post("/api/leads/:id/create-patient", createPatientFromLeadHandler);
	app.post("/api/leads/:id/convert-to-patient", createPatientFromLeadHandler);
}
