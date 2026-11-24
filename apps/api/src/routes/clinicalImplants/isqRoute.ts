import {
	ImplantStabilityCalculator,
	computePayloadHash,
	recordIsqMeasurementSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { implantIsqMeasurements, patientImplantInstallations } from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

export function registerIsqRoute(app: FastifyInstance) {
	app.post("/api/clinical/implants/:installationId/isq", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.write",
				role: staffRole,
				message: `Отказ в записи замера ISQ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		// Дедупликация и проверка Idempotency-Key (Мандаты 8bo, 8zp)
		const rawIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ??
			(request.headers["x-idempotency-key"] as string | undefined) ??
			(request.headers["x-idempotence-key"] as string | undefined) ??
			(request.body && typeof request.body === "object"
				? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
				  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
				: undefined);

		const idempotencyKey =
			typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim().length > 0
				? rawIdempotencyKey.trim()
				: null;

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
			const existingRecord = await withTenantCtx(orgId, async (tx) => {
				const [rec] = await tx
					.select()
					.from(idempotencyKeys)
					.where(and(eq(idempotencyKeys.clinicId, orgId), eq(idempotencyKeys.key, idempotencyKey)))
					.limit(1);
				return rec ?? null;
			});

			if (existingRecord) {
				if (existingRecord.status === "completed" && existingRecord.responseBody) {
					reply.header("Idempotency-Key", idempotencyKey);
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply.code(existingRecord.responseCode || 201).send(existingRecord.responseBody);
				}
				if (existingRecord.status === "in_flight") {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция регистрации замера ISQ с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		const rawParams = (request.params && typeof request.params === "object" ? request.params : {}) as { installationId?: string };
		const paramValidation = z.string().uuid().safeParse(rawParams.installationId);
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

		const txResult = await withTenantCtx(orgId, async (tx) => {
			const [installation] = await tx
				.select()
				.from(patientImplantInstallations)
				.where(and(eq(patientImplantInstallations.id, installationId), eq(patientImplantInstallations.organizationId, orgId)))
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

			if (idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: responsePayload,
						responseCode: 201,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: responsePayload,
							responseCode: 201,
						},
					});
			}

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
	});
}
