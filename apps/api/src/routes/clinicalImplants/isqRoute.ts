import { ImplantStabilityCalculator, recordIsqMeasurementSchema } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { implantIsqMeasurements, patientImplantInstallations } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

export function registerIsqRoute(app: FastifyInstance) {
	app.post("/api/clinical/implants/:installationId/isq", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.write",
				role: staffRole,
				message: `Отказ в записи замера ISQ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { installationId } = request.params as { installationId: string };
		const parsed = recordIsqMeasurementSchema.safeParse({ ...((request.body as object) || {}), installationId });
		if (!parsed.success) {
			return reply.code(400).send({
				error: "IsqMeasurementValidationError",
				message: "Некорректные параметры измерения ISQ.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		const [installation] = await db
			.select()
			.from(patientImplantInstallations)
			.where(and(eq(patientImplantInstallations.id, installationId), eq(patientImplantInstallations.organizationId, orgId)))
			.limit(1);

		if (!installation) {
			return reply.code(404).send({ error: "ImplantInstallationNotFound", message: "Карточка установленного имплантата не найдена." });
		}

		const { isqMean, isqAnisotropyDelta } = ImplantStabilityCalculator.calculateMeanIsq(
			input.isqMesiodistal,
			input.isqBuccolingual,
			input.isqDistopalatal,
		);

		const { status, decisionRationale, isBiologicalDip } = ImplantStabilityCalculator.evaluateLoadingProtocol(
			isqMean,
			Number(installation.finalInsertionTorqueNcm),
			input.daysPostOp,
		);

		const [measurement] = await db
			.insert(implantIsqMeasurements)
			.values({
				organizationId: orgId,
				installationId,
				measuredByDoctorId: null,
				visitId: input.visitId ?? null,
				daysPostOp: input.daysPostOp,
				isqMesiodistal: input.isqMesiodistal,
				isqBuccolingual: input.isqBuccolingual,
				isqDistopalatal: input.isqDistopalatal ?? null,
				isqMean: String(isqMean ?? 70),
				isqAnisotropyDelta: isqAnisotropyDelta ?? 0,
				stabilityStatus: status,
				recommendedLoadingDecision: decisionRationale,
				isBiologicalDipDetected: isBiologicalDip,
				smartpegCode: input.smartpegCode ?? null,
				notes: input.notes ?? null,
			})
			.returning();

		return reply.code(201).send({
			success: true,
			measurement,
			evaluation: { status, decisionRationale, isBiologicalDip },
		});
	});
}
