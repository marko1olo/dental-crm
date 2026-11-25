import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	extractIdempotencyKey,
	isValidUuid,
} from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	convertLeadSchema,
	convertLeadToAppointment,
	createPatientFromLead,
} from "../leadsConversionModules/index.js";

export async function registerLeadConversionRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/leads/:id/convert", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead convert",
		);
		if (!organizationId) return;

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор обращения.",
			});
		}
		const convertParsed = convertLeadSchema.safeParse(req.body);
		if (!convertParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте данные конвертации лида: даты, кресло и врач.",
			});
		}

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
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

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор обращения.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}
		return await createPatientFromLead({
			db,
			wsBroker,
			organizationId,
			leadId: id,
			req,
			reply,
		});
	};

	app.post("/api/leads/:id/create-patient", createPatientFromLeadHandler);
	app.post("/api/leads/:id/convert-to-patient", createPatientFromLeadHandler);
}
