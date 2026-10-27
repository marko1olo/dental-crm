import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { requireOrganizationId } from "../../../security/identity.js";
import {
	enforceClinicalDicomAccess,
	normalizeUid,
	organizationExists,
	resolveInstanceFilePath,
	streamDicomFileResponse,
	UUID_SHAPE,
} from "../../dicomwebHelpers.js";

export async function handleWadoRetrieveInstance(
	request: FastifyRequest<{ Params: { studyUid: string; seriesUid: string; instanceUid: string } }>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "dicom instance read"))) return;
	const organizationId = requireOrganizationId(request, reply);
	if (!organizationId) return;

	if (!enforceClinicalDicomAccess(request, reply, "КТ / DICOM снимку")) return;

	const studyUid = normalizeUid(request.params.studyUid);
	const seriesUid = normalizeUid(request.params.seriesUid);
	const instanceUid = normalizeUid(request.params.instanceUid);

	if (!UUID_SHAPE.test(organizationId)) {
		return reply.code(403).send({ error: "OrganizationUnknown", message: "Снимок не выдан: организация из токена не существует." });
	}

	const resolution = await withTenantCtx(organizationId, async () => {
		let organizationKnown: boolean;
		try {
			organizationKnown = await organizationExists(organizationId);
		} catch (lookupError) {
			return { organizationCheckFailed: true as const, lookupError, organizationKnown: false, filePath: null };
		}
		if (!organizationKnown || !studyUid || !seriesUid || !instanceUid) {
			return { organizationCheckFailed: false as const, lookupError: null, organizationKnown, filePath: null };
		}
		return {
			organizationCheckFailed: false as const, lookupError: null, organizationKnown,
			filePath: await resolveInstanceFilePath(organizationId, studyUid, seriesUid, instanceUid),
		};
	});

	if (resolution.organizationCheckFailed) {
		return reply.code(503).send({ error: "OrganizationCheckUnavailable", message: "Снимок не выдан: не удалось проверить организацию запроса." });
	}
	if (!resolution.organizationKnown) {
		return reply.code(403).send({ error: "OrganizationUnknown", message: "Снимок не выдан: организация из токена не существует." });
	}

	if (!studyUid || !seriesUid || !instanceUid) {
		return reply.code(400).send({ error: "DicomInstanceUidMissing", message: "В адресе должны быть указаны UID исследования, серии и объекта." });
	}

	const filePath = resolution.filePath;
	if (!filePath) {
		return reply.code(404).send({
			error: "DicomInstanceNotFound", message: "Снимок с таким UID в этой клинике не найден.",
			studyUid, seriesUid, instanceUid,
		});
	}

	return streamDicomFileResponse(request, reply, filePath, "application/dicom");
}
