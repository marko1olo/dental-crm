import { kopecksToNumericString, rubToKopecks } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import {
	FamilyWalletError,
	familyWalletService,
} from "../../services/familyWallet/FamilyWalletService.js";
import { familyRefundSchema, familyTopupSchema } from "./familyFinanceTypes.js";

export function registerFamilyWalletOperationsRoutes(app: FastifyInstance) {
	// POST /api/finance/family/topup — пополнение кошелька
	app.post("/api/finance/family/topup", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family wallet topup");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const parsed = familyTopupSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Проверьте сумму пополнения (больше нуля, копейки)." });
		}
		const headerKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
		const mutationId = parsed.data.clientMutationId?.trim() || headerKey?.trim();
		if (!mutationId) {
			return reply.code(400).send({ error: "ValidationError", message: "Ключ операции обязателен для предотвращения повторного пополнения." });
		}

		try {
			const result = await familyWalletService.topup({
				organizationId, familyGroupId: parsed.data.familyGroupId, patientId: parsed.data.patientId,
				amountRub: parsed.data.amountRub, method: parsed.data.method, clientMutationId: mutationId, notes: parsed.data.comment,
			});
			return {
				payment: result.payment,
				newBalance: kopecksToNumericString(rubToKopecks(result.newBalanceRub)),
				duplicate: result.duplicate,
			};
		} catch (err: any) {
			const statusCode = err.statusCode || (err instanceof FamilyWalletError ? err.statusCode : 500);
			return reply.code(statusCode).send({
				error: statusCode === 404 ? "NotFound" : statusCode === 409 ? "IdempotencyConflict" : "TopupFailed",
				message: err.message || "Не удалось пополнить семейный счёт",
			});
		}
	});

	// POST /api/finance/family/refund — возврат остатка
	app.post("/api/finance/family/refund", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family wallet refund");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const parsed = familyRefundSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Проверьте параметры возврата.", details: parsed.error.issues });
		}
		const headerKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
		const mutationId = parsed.data.clientMutationId?.trim() || headerKey?.trim();
		if (!mutationId) {
			return reply.code(400).send({ error: "ValidationError", message: "Ключ операции обязателен для предотвращения повторного возврата." });
		}

		try {
			const result = await familyWalletService.refund({
				organizationId, familyGroupId: parsed.data.familyGroupId, patientId: parsed.data.patientId,
				amountRub: parsed.data.amountRub, cashBoxId: parsed.data.cashBoxId, operatorId: parsed.data.operatorId,
				method: parsed.data.method, reasonText: parsed.data.reason, clientMutationId: mutationId,
			});
			return {
				payment: result.payment,
				newBalance: kopecksToNumericString(rubToKopecks(result.newBalanceRub)),
				refundedRub: result.refundedRub,
				duplicate: result.duplicate,
				cashOperation: result.cashOperation,
			};
		} catch (err: any) {
			const statusCode = err.statusCode || (err instanceof FamilyWalletError ? err.statusCode : 500);
			return reply.code(statusCode).send({
				error: statusCode === 404 ? "NotFound" : statusCode === 409 ? "IdempotencyConflict" : statusCode === 400 ? "InvalidAmount" : "RefundFailed",
				message: err.message || "Не удалось оформить возврат семейного депозита",
			});
		}
	});
}
