import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	fetchPatientLatestPeriodontogram,
	resolvePerioPatientId,
	upsertPatientFullPeriodontogram,
	upsertPatientFullPeriodontogramBodySchema,
} from "../../services/periodontogramService.js";
import {
	getHygieneRecommendations,
	getHygienePlanText,
} from "../../services/periodontogramIndices.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const patientParamsSchema = z.object({
	patientId: z.string().trim().min(1),
});

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPerioError(err: unknown): {
	statusCode?: number | undefined;
	code?: string | undefined;
	message?: string | undefined;
} {
	if (!err || typeof err !== "object") return {};
	const rec = err as Record<string, unknown>;
	return {
		statusCode: typeof rec.statusCode === "number" ? rec.statusCode : undefined,
		code: typeof rec.code === "string" ? rec.code : undefined,
		message: typeof rec.message === "string" ? rec.message : undefined,
	};
}

export async function registerPatientPeriodontogramRoutes(app: FastifyInstance) {
	const handleGet = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const paramsParsed = patientParamsSchema.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}
		const rawPatientId = paramsParsed.data.patientId;

		let patientId: string;
		let data: Awaited<ReturnType<typeof fetchPatientLatestPeriodontogram>>;
		try {
			const result = await withTenantCtx(orgId, async (tx) => {
				const resolvedPatientId = await resolvePerioPatientId(orgId, rawPatientId, tx);
				const latestData = await fetchPatientLatestPeriodontogram(
					orgId,
					resolvedPatientId,
					tx,
				);
				return { patientId: resolvedPatientId, data: latestData };
			});
			patientId = result.patientId;
			data = result.data;
		} catch (err: unknown) {
			const e = readPerioError(err);
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

		if (!data) {
			return reply.send({ success: true, data: null });
		}

		// Связка с рекомендациями гигиены по коду PSR
		const dataIndices =
			data && typeof data === "object" && "indices" in data && isPlainRecord(data.indices)
				? data.indices
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

		const paramsParsed = patientParamsSchema.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "InvalidPatientId",
				message: "Некорректный идентификатор пациента",
			});
		}
		const rawPatientId = paramsParsed.data.patientId;

		const rawIdemHeader = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
		const idempotencyKey = typeof rawIdemHeader === "string" ? rawIdemHeader : undefined;
		if (idempotencyKey) {
			if (!UUID_REGEX.test(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
			}
			reply.header("Idempotency-Key", idempotencyKey);
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

		const rawIndices = isPlainRecord(body.indices) ? body.indices : undefined;
		const rawPsrData = isPlainRecord(rawIndices?.psrData)
			? rawIndices.psrData
			: isPlainRecord(body.psrData)
				? body.psrData
				: undefined;

		try {
			const { patientId, result } = await withTenantCtx(orgId, async (tx) => {
				const resolvedPatientId = await resolvePerioPatientId(orgId, rawPatientId, tx);
				const upsertResult = await upsertPatientFullPeriodontogram({
					orgId,
					patientId: resolvedPatientId,
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
				return { patientId: resolvedPatientId, result: upsertResult };
			});

			// Расчет рекомендаций гигиены
			const resIndices =
				result && typeof result === "object" && "indices" in result && isPlainRecord(result.indices)
					? result.indices
					: null;
			const psrCode = Number(resIndices?.psr ?? body.psrCode ?? 0);
			const hasAsterisk = Boolean(resIndices?.hasAsterisk ?? body.hasAsterisk);
			const hygieneRecommendations = getHygieneRecommendations(psrCode, hasAsterisk);
			const hygienePlan = getHygienePlanText(psrCode, hasAsterisk);

			return reply.send({
				success: true,
				data: {
					...result,
					patientId,
					psrCode,
					hygieneRecommendations,
					hygienePlan,
				},
			});
		} catch (err: unknown) {
			const e = readPerioError(err);
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
	const perioMutationOptions = {
		schema: {
			description: "Periodontogram mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					organizationid: { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	} as const;
	app.get("/api/periodontogram/:patientId", handleGet);
	app.get("/api/perio/:patientId", handleGet);
	app.post("/api/periodontogram/:patientId", perioMutationOptions, handlePost);
	app.post("/api/perio/:patientId", perioMutationOptions, handlePost);
	app.put("/api/periodontogram/:patientId", perioMutationOptions, handlePost);
	app.put("/api/perio/:patientId", perioMutationOptions, handlePost);
}
