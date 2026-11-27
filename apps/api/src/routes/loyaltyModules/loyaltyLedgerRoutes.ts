import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrganizationId } from "../../security/identity.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { bonusTransactions } from "../../db/schema.js";
import {
	redeemPointsBodySchema,
	holdPointsBodySchema,
	confirmHoldBodySchema,
	releaseHoldBodySchema,
} from "@dental/shared";
import { executeBonusRedeem, executeBonusHold, executeBonusConfirm, executeBonusRelease } from "./bonusRedemptionService.js";
import { extractIdempotencyKey, isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";

const patientIdParamSchema = z
	.object({
		patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
	})
	.strict();

export async function registerLoyaltyLedgerRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/loyalty/transactions/:patientId",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const paramsParsed = patientIdParamSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор пациента (ожидается UUID)",
				});
			}
			const { patientId } = paramsParsed.data;

			return withTenantReadCtx(orgId, async (tx) => {
				const rows = await tx
					.select()
					.from(bonusTransactions)
					.where(and(eq(bonusTransactions.organizationId, orgId), eq(bonusTransactions.patientId, patientId)))
					.orderBy(desc(bonusTransactions.createdAt))
					.limit(100);

				return reply.send({
					patientId,
					transactions: rows.map((r) => ({
						id: r.id,
						amountPoints: Number(r.amountPoints),
						balanceAfterPoints: Number(r.balanceAfterPoints),
						type: r.type,
						description: r.description,
						expiresAt: r.expiresAt?.toISOString() || null,
						createdAt: r.createdAt.toISOString(),
					})),
				});
			});
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/loyalty/redeem",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
				});
			}

			const parsed = redeemPointsBodySchema.safeParse(request.body);
			if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры списания", errors: parsed.error.format() });

			return withTenantWriteCtx(orgId, async (tx) => {
				const res = await executeBonusRedeem({
					orgId,
					...parsed.data,
					clientMutationId: idempotencyKey ?? undefined,
					txClient: tx,
				});
				if ("notFound" in res) return reply.status(404).send({ message: "Пациент не найден" });
				if ("invalidInvoice" in res) return reply.status(res.code ?? 400).send({ message: res.message });
				if ("limitExceeded" in res) return reply.status(400).send({ message: `Превышен лимит (${res.maxAllowedPoints} б.)`, maxAllowedPoints: res.maxAllowedPoints });
				if ("insufficientPoints" in res) return reply.status(400).send({ message: `Недостаточно баллов (${res.activePoints})`, activePoints: res.activePoints });
				if ("replayed" in res && res.replayed) {
					reply.header("idempotency-replayed", "true");
				}
				return reply.status(200).send(res);
			});
		},
	});

	/**
	 * Two-Phase Hold: Phase 1 - Резервирование баллов до печати фискального чека
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/loyalty/hold",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
				});
			}

			const parsed = holdPointsBodySchema.safeParse(request.body);
			if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры холдирования", errors: parsed.error.format() });

			return withTenantWriteCtx(orgId, async (tx) => {
				const res = await executeBonusHold({
					orgId,
					...parsed.data,
					clientMutationId: idempotencyKey ?? undefined,
					txClient: tx,
				});
				if ("notFound" in res) return reply.status(404).send({ message: "Пациент не найден" });
				if ("invalidInvoice" in res) return reply.status(res.code ?? 400).send({ message: res.message });
				if ("limitExceeded" in res) return reply.status(400).send({ message: `Превышен лимит (${res.maxAllowedPoints} б.)`, maxAllowedPoints: res.maxAllowedPoints });
				if ("insufficientPoints" in res) return reply.status(400).send({ message: `Недостаточно баллов (${res.activePoints})`, activePoints: res.activePoints });
				if ("replayed" in res && res.replayed) {
					reply.header("idempotency-replayed", "true");
				}
				return reply.status(200).send(res);
			});
		},
	});

	/**
	 * Two-Phase Hold: Phase 2A - Подтверждение списания после успешной фискализации
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/loyalty/confirm",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
				});
			}

			const parsed = confirmHoldBodySchema.safeParse(request.body);
			if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры подтверждения", errors: parsed.error.format() });

			return withTenantWriteCtx(orgId, async (tx) => {
				const res = await executeBonusConfirm({
					orgId,
					...parsed.data,
					clientMutationId: idempotencyKey ?? undefined,
					txClient: tx,
				});
				if ("holdNotFound" in res) return reply.status(404).send({ message: res.message });
				if ("replayed" in res && res.replayed) {
					reply.header("idempotency-replayed", "true");
				}
				return reply.status(200).send(res);
			});
		},
	});

	/**
	 * Two-Phase Hold: Phase 2B - Откат резерва при ошибке фискального регистратора
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/loyalty/release",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
				});
			}

			const parsed = releaseHoldBodySchema.safeParse(request.body);
			if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры снятия резерва", errors: parsed.error.format() });

			return withTenantWriteCtx(orgId, async (tx) => {
				const res = await executeBonusRelease({
					orgId,
					...parsed.data,
					clientMutationId: idempotencyKey ?? undefined,
					txClient: tx,
				});
				if ("holdNotFound" in res) return reply.status(404).send({ message: res.message });
				if ("replayed" in res && res.replayed) {
					reply.header("idempotency-replayed", "true");
				}
				return reply.status(200).send(res);
			});
		},
	});
}
