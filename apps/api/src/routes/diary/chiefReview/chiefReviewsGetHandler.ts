import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../../../accessGuard.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import {
	ChiefPhysicianAuditError,
	ChiefPhysicianAuditService,
} from "../../../services/clinical/ChiefPhysicianAuditService.js";
import { clinicNotIdentifiedMessage } from "../../../utils/clinicSessionRefusal.js";
import { diaryIdParamsSchema } from "../types.js";

export async function handleChiefReviewsGet(
	req: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	if (!(await requireClinicalReadAccess(req, reply, "read chief physician reviews"))) return;

	const identity = getRequestIdentity(req);
	const staffRole = identity.role ?? (req as unknown as { user?: { role?: string | null } }).user?.role ?? null;
	if (staffRole) {
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.chief_review.read",
				role: staffRole,
				message: `Отказ в доступе к экспертизе качества медпомощи: ${evalAccess.reason}`,
			});
		}
	}

	const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
	if (!parsedIdParams.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Идентификатор в адресе должен быть UUID (id).",
		});
	}
	const { id } = parsedIdParams.data;

	const orgId = await resolveOrganizationId(req);
	if (!orgId) {
		return reply.code(403).send({
			error: "OrgRequired",
			message: clinicNotIdentifiedMessage("историю экспертиз качества не показать"),
		});
	}

	try {
		const reviews = await ChiefPhysicianAuditService.getDiaryReviews(orgId, id);
		return reply.send({ reviews });
	} catch (err) {
		if (err instanceof ChiefPhysicianAuditError) {
			return reply.code(400).send({
				error: err.code,
				message: err.message,
			});
		}
		throw err;
	}
}
