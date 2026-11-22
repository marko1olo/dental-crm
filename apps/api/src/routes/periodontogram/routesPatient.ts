import { computePayloadHash } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	fetchPatientLatestPeriodontogram,
	resolvePerioPatientId,
	upsertPatientFullPeriodontogram,
	upsertPatientFullPeriodontogramBodySchema,
	type PatchToothInput,
	type SiteItemInput,
} from "../../services/periodontogramService.js";
import {
	getHygieneRecommendations,
	getHygienePlanText,
} from "../../services/periodontogramIndices.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registerPatientPeriodontogramRoutes(app: FastifyInstance) {
	const handleGet = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { patientId: rawPatientId } = request.params as { patientId: string };
		if (!rawPatientId || typeof rawPatientId !== "string" || !rawPatientId.trim()) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}

		let patientId: string;
		try {
			patientId = await resolvePerioPatientId(orgId, rawPatientId);
		} catch (err: unknown) {
			const e = err as { statusCode?: number; code?: string; message?: string };
			if (e.statusCode === 404 || e.code === "PatientNotFound") {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: e.message || "Пациент не найден",
				});
			}
			if (e.statusCode === 400 || e.code === "InvalidPatientId") {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: e.message || "Некорректный идентификатор пациента",
				});
			}
			throw err;
		}

		const data = await fetchPatientLatestPeriodontogram(orgId, patientId);
		if (!data) {
			return reply.send({ success: true, data: null });
		}

		// Связка с рекомендациями гигиены по коду PSR
		const dataIndices =
			data && typeof data === "object" && "indices" in data
				? (data.indices as Record<string, unknown> | null)
				: null;
		const psrCode = Number(dataIndices?.psr ?? 0);
		const hasAsterisk = Boolean(dataIndices?.hasAsterisk);
		const hygieneRecommendations = getHygieneRecommendations(psrCode, hasAsterisk);
		const hygienePlan = getHygienePlanText(psrCode, hasAsterisk);

		return reply.send({
			success: true,
			data: {
				...data,
				patientId,
				psrCode,
				hygieneRecommendations,
				hygienePlan,
			},
		});
	};

	const handlePost = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"periodontogram patient full upsert",
		);
		if (!orgId) return;

		const { patientId: rawPatientId } = request.params as { patientId: string };
		if (!rawPatientId || typeof rawPatientId !== "string" || !rawPatientId.trim()) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}

		const idempotencyKey = (request.headers["idempotency-key"] || request.headers["x-idempotency-key"]) as string | undefined;
		if (idempotencyKey) {
			if (!UUID_REGEX.test(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
			}
			reply.header("Idempotency-Key", idempotencyKey);

			// Каноническая проверка idempotencyKeys: при сетевом ретрае возвращаем кэшированный ответ
			const [existingRecord] = await db
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				)
				.limit(1);

			if (existingRecord) {
				if (existingRecord.status === "completed" && existingRecord.responseBody) {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply
						.code(existingRecord.responseCode || 200)
						.send(existingRecord.responseBody);
				}
			}
		}

		const parsedBody = upsertPatientFullPeriodontogramBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректное тело запроса сохранения пародонтограммы",
				details: parsedBody.error.format(),
			});
		}
		const body = parsedBody.data;
		const identity = getRequestIdentity(request);
		const recordedByUserId = identity.userId ?? null;

		const rawIndices =
			body.indices && typeof body.indices === "object"
				? (body.indices as Record<string, unknown>)
				: undefined;
		const rawPsrData =
			(rawIndices?.psrData as Record<string, unknown> | undefined) ??
			(body.psrData && typeof body.psrData === "object"
				? (body.psrData as Record<string, unknown>)
				: undefined);

		try {
			const patientId = await resolvePerioPatientId(orgId, rawPatientId);
			const result = await upsertPatientFullPeriodontogram({
				orgId,
				patientId,
				rawPatientId,
				recordedByUserId,
				visitId: typeof body.visitId === "string" && body.visitId.trim() ? body.visitId.trim() : undefined,
				teeth: body.teeth,
				sites: body.sites,
				notes: typeof body.notes === "string" ? body.notes : undefined,
				status: body.status === "closed" ? "closed" : "draft",
				autoClose: Boolean(body.autoClose),
				psrData: rawPsrData,
			});

			// Расчет рекомендаций гигиены
			const resIndices =
				result && typeof result === "object" && "indices" in result
					? (result.indices as Record<string, unknown> | null)
					: null;
			const psrCode = Number(resIndices?.psr ?? body.psrCode ?? 0);
			const hasAsterisk = Boolean(resIndices?.hasAsterisk ?? body.hasAsterisk);
			const hygieneRecommendations = getHygieneRecommendations(psrCode, hasAsterisk);
			const hygienePlan = getHygienePlanText(psrCode, hasAsterisk);

			const responsePayload = {
				success: true,
				data: {
					...result,
					patientId,
					psrCode,
					hygieneRecommendations,
					hygienePlan,
				},
			};

			if (idempotencyKey) {
				try {
					await db
						.insert(idempotencyKeys)
						.values({
							clinicId: orgId,
							key: idempotencyKey,
							status: "completed",
							payloadHash: computePayloadHash(request.body ?? {}),
							responseBody: responsePayload,
							responseCode: 200,
						})
						.onConflictDoUpdate({
							target: [idempotencyKeys.clinicId, idempotencyKeys.key],
							set: {
								status: "completed",
								responseBody: responsePayload,
								responseCode: 200,
								lockedAt: new Date(),
							},
						});
				} catch (idemErr) {
					request.log.warn(
						{ err: idemErr, idempotencyKey, orgId },
						"[periodontogram] Не удалось сохранить ключ идемпотентности",
					);
				}
			}

			return reply.send(responsePayload);
		} catch (err: unknown) {
			const e = err as { statusCode?: number; code?: string; message?: string };
			if (e.statusCode === 404 || e.code === "PatientNotFound") {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: e.message || "Пациент не найден",
				});
			}
			throw err;
		}
	};

	// Единые SSOT роуты: /api/periodontogram/:patientId и /api/perio/:patientId
	app.get("/api/periodontogram/:patientId", handleGet);
	app.get("/api/perio/:patientId", handleGet);
	app.post("/api/periodontogram/:patientId", handlePost);
	app.post("/api/perio/:patientId", handlePost);
	app.put("/api/periodontogram/:patientId", handlePost);
	app.put("/api/perio/:patientId", handlePost);
}
