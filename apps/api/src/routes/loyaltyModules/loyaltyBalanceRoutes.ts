import {
	calculateCashbackPoints,
	manualAccrueBodySchema,
	accrueCashbackBodySchema,
	processExpiredBodySchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrganizationId } from "../../security/identity.js";
import { withTenantCtx } from "../../db/rls.js";
import { executeBonusAccrual, getPatientBonusBalance, processExpiredBonuses } from "./bonusBalanceService.js";
import { extractIdempotencyKey, isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";

const patientIdParamSchema = z
	.object({
		patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
	})
	.strict();

export async function registerLoyaltyBalanceRoutes(app: FastifyInstance) {
	app.get("/api/loyalty/balance/:patientId", async (request, reply) => {
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

		return withTenantCtx(orgId, async (tx) => {
			const result = await getPatientBonusBalance({ orgId, patientId, txClient: tx });
			if (!result) return reply.status(404).send({ message: "Пациент не найден" });
			return reply.send(result);
		});
	});

	app.post("/api/loyalty/accrue", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const parsed = manualAccrueBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры начисления", errors: parsed.error.format() });

		const { patientId, amountPoints, description, expiresInDays } = parsed.data;
		return withTenantCtx(orgId, async (tx) => {
			const res = await executeBonusAccrual(
				{
					orgId,
					patientId,
					amountPoints,
					description,
					txType: "accrual_manual_admin",
					expiresInDays,
					clientMutationId: idempotencyKey,
				},
				tx,
			);
			if ("notFound" in res) return reply.status(404).send({ message: "Пациент не найден" });
			if ("replayed" in res && res.replayed) {
				reply.header("idempotency-replayed", "true");
				return reply.status(200).send(res);
			}
			return reply.status(201).send(res);
		});
	});

	app.post("/api/loyalty/accrue-cashback", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const parsed = accrueCashbackBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры кэшбэка", errors: parsed.error.format() });

		const { patientId, paidAmountRub, invoiceId, paymentId, cashbackPercent, pointRateRub, description, expiresInDays } = parsed.data;
		const pointsToAccrue = calculateCashbackPoints(paidAmountRub, cashbackPercent, pointRateRub);
		if (pointsToAccrue <= 0) return reply.send({ success: true, accruedPoints: 0, message: "Сумма кэшбэка равна 0" });

		return withTenantCtx(orgId, async (tx) => {
			const res = await executeBonusAccrual(
				{
					orgId,
					patientId,
					amountPoints: pointsToAccrue,
					description: description || "Кэшбэк за оплату услуг",
					txType: "accrual_cashback",
					expiresInDays,
					relatedPaymentId: paymentId,
					relatedInvoiceId: invoiceId,
					clientMutationId: idempotencyKey,
				},
				tx,
			);
			if ("notFound" in res) return reply.status(404).send({ message: "Пациент не найден" });
			if ("replayed" in res && res.replayed) {
				reply.header("idempotency-replayed", "true");
				return reply.status(200).send(res);
			}
			return reply.status(201).send(res);
		});
	});

	/**
	 * Background / Cron endpoint: Batch expiration of overdue bonuses across the organization [LOY-04].
	 */
	app.post("/api/loyalty/process-expired", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = processExpiredBodySchema.safeParse(request.body || {});
		if (!parsed.success) {
			return reply.status(400).send({ message: "Некорректные параметры даты", errors: parsed.error.format() });
		}

		const asOfDate = parsed.data?.asOfDate ? new Date(parsed.data.asOfDate) : new Date();

		return withTenantCtx(orgId, async (tx) => {
			const res = await processExpiredBonuses(orgId, asOfDate, tx);
			return reply.status(200).send({ success: true, ...res });
		});
	});
}
