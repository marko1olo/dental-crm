import { imagingStudySchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../../accessGuard.js";
import { bindPatientToStudyInDb, unbindPatientFromStudyInDb, updateImagingStudyInDb } from "../../../db/imagingQuery.js";
import { autoBindUnassignedStudies } from "../patientFioBindingEngine.js";
import { getImagingOrganizationId, sendImagingStudyNotFound } from "../imagingHelpers.js";

export async function bindPatientHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging bind patient"))) return;
	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const bindBodySchema = z.object({ patientId: z.string().uuid() });
	const parsed = bindBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({ error: "ValidationError", message: "Необходимо передать валидный UUID пациента в поле patientId.", details: parsed.error.issues });
	}

	try {
		const updated = await bindPatientToStudyInDb(orgId, id, parsed.data.patientId);
		if (!updated) return sendImagingStudyNotFound(reply);
		return reply.code(200).send(imagingStudySchema.parse(updated));
	} catch (err) {
		return reply.code(400).send({ error: "BindingFailed", message: err instanceof Error ? err.message : "Ошибка при привязке исследования к пациенту." });
	}
}

export async function bindToothHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging bind tooth"))) return;
	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const bindToothBodySchema = z.object({ toothCode: z.string().trim().max(16).nullable().optional() });
	const parsed = bindToothBodySchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректный номер зуба.", details: parsed.error.issues });
	}

	const formatted = parsed.data.toothCode?.trim() || null;
	const updated = await updateImagingStudyInDb(orgId, id, { toothCode: formatted, region: formatted ? `Зуб ${formatted}` : null });
	if (!updated) return sendImagingStudyNotFound(reply);
	return reply.code(200).send(imagingStudySchema.parse(updated));
}

export async function unbindPatientHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging unbind patient"))) return;
	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const updated = await unbindPatientFromStudyInDb(orgId, id);
	if (!updated) return sendImagingStudyNotFound(reply);
	return reply.code(200).send(imagingStudySchema.parse(updated));
}

export async function autoBindHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging auto bind scan"))) return;
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const summary = await autoBindUnassignedStudies(orgId);
	return reply.code(200).send(summary);
}

export async function cbctTunerPatientsHandler(_request: FastifyRequest, reply: FastifyReply) {
	return reply.send({
		ok: true,
		patients: [{ id: "sample", name: "Демо Пациент", badge: "CBCT", type: "series", description: "Демонстрационный снимок КТ", available: true }],
	});
}

export async function cbctTunerVolumeHandler(_request: FastifyRequest, reply: FastifyReply) {
	const emptyCube = Buffer.alloc(512 * 512 * 2);
	return reply
		.header("Content-Type", "application/octet-stream")
		.header("x-cbct-dim-x", "512").header("x-cbct-dim-y", "512").header("x-cbct-dim-z", "1")
		.header("x-cbct-sp-x", "0.25").header("x-cbct-sp-y", "0.25").header("x-cbct-sp-z", "0.25")
		.header("x-cbct-min-hu", "-1000").header("x-cbct-max-hu", "3000")
		.send(emptyCube);
}
