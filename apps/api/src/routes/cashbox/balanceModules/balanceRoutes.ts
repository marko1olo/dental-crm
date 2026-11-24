/**
 * balanceModules/balanceRoutes.ts — Validated HTTP Endpoints for Patient Balance & Advance Rails.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { FamilyWalletError } from "../../../services/familyWallet/familyWalletTypes.js";
import {
	creditPersonalAdvanceOp,
	debitAdvanceOp,
} from "./advanceOperationsService.js";
import { getDetailedPatientBalance } from "./balanceQueryService.js";
import { PatientBalanceError } from "./types.js";

const patientIdParamsSchema = z
	.object({
		patientId: z.string().uuid("Некорректный UUID пациента."),
	})
	.strict();

const creditAdvanceBodySchema = z
	.object({
		amountKopecks: z.number().int().positive("Сумма аванса должна быть положительной."),
		method: z.enum(["cash", "card", "sbp", "bank_transfer"]),
		cashBoxId: z.string().uuid("Некорректный UUID кассы.").optional(),
		operatorId: z.string().uuid("Некорректный UUID оператора.").optional(),
		notes: z.string().trim().max(1000).optional(),
	})
	.strict();

const debitAdvanceBodySchema = z
	.object({
		amountKopecks: z.number().int().positive("Сумма списания должна быть положительной."),
		visitId: z.string().uuid("Некорректный UUID приёма.").optional(),
		invoiceId: z.string().uuid("Некорректный UUID счёта.").optional(),
		allowFamilyFallback: z.boolean().optional(),
		notes: z.string().trim().max(1000).optional(),
	})
	.strict();

function extractValidatedIdempotencyKey(
	request: FastifyRequest,
	reply: FastifyReply,
): string | null {
	const rawKey = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
	const keyStr =
		typeof rawKey === "string"
			? rawKey.trim()
			: Array.isArray(rawKey) && typeof rawKey[0] === "string"
				? rawKey[0].trim()
				: "";

	if (!keyStr) {
		void reply.code(400).send({
			error: "IdempotencyKeyRequired",
			message: "Заголовок Idempotency-Key обязателен.",
		});
		return null;
	}

	const baseKey = keyStr.includes("#") ? keyStr.split("#")[0] : keyStr;
	if (!isValidUuid(baseKey || "")) {
		void reply.code(400).send({
			error: "ValidationError",
			message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
		return null;
	}

	reply.header("Idempotency-Key", keyStr);
	reply.header("X-Idempotency-Key", keyStr);
	return keyStr;
}

function handleDomainError(err: unknown, reply: FastifyReply): FastifyReply {
	if (err instanceof PatientBalanceError || err instanceof FamilyWalletError) {
		return reply.code(err.statusCode).send({
			error: err.code,
			message: err.message,
		});
	}
	throw err;
}

export function registerBalanceModuleRoutes(app: FastifyInstance): void {
	const readOpts = { config: { tenantTxSelfManaged: true } };

	app.get(
		"/api/cashbox/patients/:patientId/balance",
		readOpts,
		async (request: FastifyRequest<{ Params: { patientId: string } }>, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply, "patient balance read");
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const parsedParams = patientIdParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор пациента.",
					details: parsedParams.error.issues,
				});
			}

			const { patientId } = parsedParams.data;
			const balance = await withTenantCtx(orgId, async (tx) => {
				return getDetailedPatientBalance(tx, orgId, patientId);
			});

			if (!balance) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден.",
				});
			}

			return reply.send({ success: true, data: balance, balance });
		},
	);

	app.post(
		"/api/cashbox/patients/:patientId/advance/credit",
		readOpts,
		async (request: FastifyRequest<{ Params: { patientId: string } }>, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"credit patient advance",
			);
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const parsedParams = patientIdParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор пациента.",
					details: parsedParams.error.issues,
				});
			}

			const idempotencyKey = extractValidatedIdempotencyKey(request, reply);
			if (!idempotencyKey) return reply;

			const parsedBody = creditAdvanceBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры пополнения аванса.",
					details: parsedBody.error.issues,
				});
			}

			try {
				const result = await withTenantCtx(orgId, async (tx) => {
					return creditPersonalAdvanceOp(tx, {
						organizationId: orgId,
						patientId: parsedParams.data.patientId,
						amountKopecks: parsedBody.data.amountKopecks,
						method: parsedBody.data.method,
						idempotencyKey,
						cashBoxId: parsedBody.data.cashBoxId,
						operatorId: parsedBody.data.operatorId,
						notes: parsedBody.data.notes,
					});
				});

				if (result.isDuplicate) {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
				}

				return reply.code(201).send(result);
			} catch (err) {
				return handleDomainError(err, reply);
			}
		},
	);

	app.post(
		"/api/cashbox/patients/:patientId/advance/debit",
		readOpts,
		async (request: FastifyRequest<{ Params: { patientId: string } }>, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"debit patient advance",
			);
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const parsedParams = patientIdParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор пациента.",
					details: parsedParams.error.issues,
				});
			}

			const idempotencyKey = extractValidatedIdempotencyKey(request, reply);
			if (!idempotencyKey) return reply;

			const parsedBody = debitAdvanceBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры зачета аванса.",
					details: parsedBody.error.issues,
				});
			}

			try {
				const result = await withTenantCtx(orgId, async (tx) => {
					return debitAdvanceOp(tx, {
						organizationId: orgId,
						patientId: parsedParams.data.patientId,
						amountKopecks: parsedBody.data.amountKopecks,
						idempotencyKey,
						visitId: parsedBody.data.visitId,
						invoiceId: parsedBody.data.invoiceId,
						allowFamilyFallback: parsedBody.data.allowFamilyFallback,
						notes: parsedBody.data.notes,
					});
				});

				if (result.isDuplicate) {
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
				}

				return reply.code(200).send(result);
			} catch (err) {
				return handleDomainError(err, reply);
			}
		},
	);
}
