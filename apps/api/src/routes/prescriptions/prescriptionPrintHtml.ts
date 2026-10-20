/**
 * prescriptionPrintHtml.ts — Fastify handler for rendering printable prescription HTML
 * Conforms to Mandate 8b (<= 120 lines).
 */

import { renderPrescriptionUniversalHtml } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	electronicPrescriptionItems,
	electronicPrescriptions,
	organizations,
	patients,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { buildPrescriptionPrintPayload } from "./prescriptionPrintPayloadBuilder.js";

export async function handlePrescriptionPrintHtml(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.prescription.print_html",
			role: staffRole,
			message:
				"Печать официального рецептурного бланка ограничена 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
		});
	}

	const { id } = request.params as { id: string };

	const [presc] = await db
		.select()
		.from(electronicPrescriptions)
		.where(
			and(
				eq(electronicPrescriptions.id, id),
				eq(electronicPrescriptions.organizationId, orgId),
			),
		)
		.limit(1);

	if (!presc) {
		return reply.code(404).send({
			error: "PrescriptionNotFound",
			message: "Рецепт не найден.",
		});
	}

	await auditMedicalAccessFromRequest(request, {
		organizationId: orgId,
		patientId: presc.patientId,
		action: "PRINT_PRESCRIPTION",
		diagnosis: presc.clinicalDiagnosisMkb10 ?? "Печать рецептурного бланка",
		metadata: { prescriptionId: presc.id },
	});

	const [[org], [patient], items] = await Promise.all([
		db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1),
		db
			.select({ administrativeProfile: patients.administrativeProfile })
			.from(patients)
			.where(and(eq(patients.id, presc.patientId), eq(patients.organizationId, orgId)))
			.limit(1),
		db
			.select()
			.from(electronicPrescriptionItems)
			.where(
				and(
					eq(electronicPrescriptionItems.prescriptionId, presc.id),
					eq(electronicPrescriptionItems.organizationId, orgId),
				),
			)
			.orderBy(electronicPrescriptionItems.itemIndex),
	]);

	const patientProfile = patient?.administrativeProfile as {
		residentialAddress?: string | null; passportAddress?: string | null; address?: string | null;
	} | null;

	const resolvedPatientAddress =
		patientProfile?.residentialAddress || patientProfile?.passportAddress || patientProfile?.address || "—";
	const query = request.query as { withStamp?: string };
	const withStampAndSignature = query.withStamp !== "false";

	const payload = buildPrescriptionPrintPayload({
		presc,
		org,
		resolvedPatientAddress,
		items,
		withStampAndSignature,
	});

	const html = renderPrescriptionUniversalHtml(payload);
	reply.type("text/html; charset=utf-8");
	return reply.send(html);
}
