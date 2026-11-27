import {
	ImplantStabilityCalculator,
	recordIsqMeasurementSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantWriteCtx } from "../../db/rls.js";
import { implantIsqMeasurements, patientImplantInstallations } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

export function registerIsqRoute(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/implants/:installationId/isq",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
			if (!orgId) return reply;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.write",
				role: staffRole,
				message: `Отказ в записи замера ISQ: ${evalAccess.reason}`,
			});
		}

		const rawParams = request.params;
		const rawInstallationId =
			typeof rawParams === "object" && rawParams !== null && "installationId" in rawParams
				? rawParams.installationId
				: undefined;
		const paramValidation = z.string().uuid().safeParse(rawInstallationId);
		if (!paramValidation.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор установки имплантата (ожидается UUID).",
			});
		}
		const installationId = paramValidation.data;

		const bodyObj = typeof request.body === "object" && request.body !== null ? request.body : {};
		const parsed = recordIsqMeasurementSchema.safeParse({ ...bodyObj, installationId });
		if (!parsed.success) {
			return reply.code(400).send({
				error: "IsqMeasurementValidationError",
				message: "Некорректные параметры измерения ISQ.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		const txResult = await withTenantWriteCtx(orgId, async (tx) => {
			const [installation] = await tx
				.select()
				.from(patientImplantInstallations)
				.where(and(eq(patientImplantInstallations.id, installationId), eq(patientImplantInstallations.organizationId, orgId)))
				.for("update")
				.limit(1);

			if (!installation) {
				return { notFound: true as const };
			}

			const { isqMean, isqAnisotropyDelta } = ImplantStabilityCalculator.calculateMeanIsq(
				input.isqMesiodistal,
				input.isqBuccolingual,
				input.isqDistopalatal,
			);

			if (isqMean === null) {
				return { invalidIsq: true as const };
			}

			const { status, decisionRationale, isBiologicalDip } = ImplantStabilityCalculator.evaluateLoadingProtocol(
				isqMean,
				Number(installation.finalInsertionTorqueNcm),
				input.daysPostOp,
			);

			const [measurement] = await tx
				.insert(implantIsqMeasurements)
				.values({
					organizationId: orgId,
					installationId,
					measuredByDoctorId: identity.userId ?? null,
					visitId: input.visitId ?? null,
					daysPostOp: input.daysPostOp,
					isqMesiodistal: input.isqMesiodistal,
					isqBuccolingual: input.isqBuccolingual,
					isqDistopalatal: input.isqDistopalatal ?? null,
					isqMean: String(isqMean),
					isqAnisotropyDelta: isqAnisotropyDelta ?? 0,
					stabilityStatus: status,
					recommendedLoadingDecision: decisionRationale,
					isBiologicalDipDetected: isBiologicalDip,
					smartpegCode: input.smartpegCode ?? null,
					notes: input.notes ?? null,
				})
				.returning();

			const responsePayload = {
				success: true,
				measurement,
				evaluation: { status, decisionRationale, isBiologicalDip },
			};

			return { responsePayload };
		});

		if ("notFound" in txResult) {
			return reply.code(404).send({ error: "ImplantInstallationNotFound", message: "Карточка установленного имплантата не найдена." });
		}
		if ("invalidIsq" in txResult) {
			return reply.code(400).send({
				error: "IsqMeasurementValidationError",
				message: "Невозможно рассчитать среднее значение ISQ: отсутствуют валидные клинические замеры стабильности Osstell RFA.",
			});
		}

		return reply.code(201).send(txResult.responsePayload);
		},
	});
}
