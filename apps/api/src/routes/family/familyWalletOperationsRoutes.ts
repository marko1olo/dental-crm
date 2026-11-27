import { kopecksToNumericString, rublesToKopecks } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import {
	FamilyWalletError,
	familyWalletService,
} from "../../services/familyWallet/FamilyWalletService.js";
import { familyRefundSchema, familyTopupSchema } from "./familyFinanceTypes.js";

function extractHeaderKey(rawHeader: string | string[] | undefined): string | undefined {
	if (typeof rawHeader === "string") return rawHeader.trim();
	if (Array.isArray(rawHeader) && rawHeader.length > 0 && typeof rawHeader[0] === "string") {
		return rawHeader[0].trim();
	}
	return undefined;
}

export function registerFamilyWalletOperationsRoutes(app: FastifyInstance) {
	// POST /api/finance/family/topup — пополнение кошелька
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/finance/family/topup",
		permission: "public",
		handler: async ({ request: req, reply }) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family wallet topup");
			if (!organizationId) return;
			if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

			const parsed = familyTopupSchema.safeParse(req.body);
			if (!parsed.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Проверьте сумму пополнения (больше нуля, копейки)." });
			}
			const headerKey = extractHeaderKey(req.headers["idempotency-key"] || req.headers["x-idempotency-key"]);
			const mutationId = parsed.data.clientMutationId?.trim() || headerKey;
			if (!mutationId) {
				return reply.code(400).send({ error: "ValidationError", message: "Ключ операции обязателен для предотвращения повторного пополнения." });
			}

			try {
				const result = await familyWalletService.topup({
					organizationId, familyGroupId: parsed.data.familyGroupId, patientId: parsed.data.patientId,
					amountRub: parsed.data.amountRub, amountKopecks: parsed.data.amountKopecks, method: parsed.data.method, clientMutationId: mutationId, notes: parsed.data.comment,
				});
				const payload = {
					payment: result.payment,
					newBalance: kopecksToNumericString(
						result.newBalanceKopecks !== undefined
							? Number(result.newBalanceKopecks)
							: rublesToKopecks(result.newBalanceRub),
					),
					duplicate: result.duplicate,
				};
				return { success: true, data: payload, ...payload };
			} catch (err: unknown) {
				const statusCode =
					typeof err === "object" && err !== null && "statusCode" in err && typeof (err as { statusCode?: unknown }).statusCode === "number"
						? ((err as { statusCode: number }).statusCode)
						: err instanceof FamilyWalletError
							? err.statusCode
							: 500;
				const message = err instanceof Error ? err.message : "Не удалось пополнить семейный счёт";
				return reply.code(statusCode).send({
					error: statusCode === 404 ? "NotFound" : statusCode === 409 ? "IdempotencyConflict" : "TopupFailed",
					message,
				});
			}
		},
	});

	// POST /api/finance/family/refund — возврат остатка
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/finance/family/refund",
		permission: "public",
		handler: async ({ request: req, reply }) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family wallet refund");
			if (!organizationId) return;
			if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

			const parsed = familyRefundSchema.safeParse(req.body);
			if (!parsed.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Проверьте параметры возврата.", details: parsed.error.issues });
			}
			const headerKey = extractHeaderKey(req.headers["idempotency-key"] || req.headers["x-idempotency-key"]);
			const mutationId = parsed.data.clientMutationId?.trim() || headerKey;
			if (!mutationId) {
				return reply.code(400).send({ error: "ValidationError", message: "Ключ операции обязателен для предотвращения повторного возврата." });
			}

			try {
				const result = await familyWalletService.refund({
					organizationId, familyGroupId: parsed.data.familyGroupId, patientId: parsed.data.patientId,
					amountRub: parsed.data.amountRub, amountKopecks: parsed.data.amountKopecks,
					cashBoxId: parsed.data.cashBoxId, operatorId: parsed.data.operatorId,
					method: parsed.data.method, reasonText: parsed.data.reason, clientMutationId: mutationId,
				});
				const refundPayload = {
					payment: result.payment,
					newBalance: kopecksToNumericString(
						result.newBalanceKopecks !== undefined
							? Number(result.newBalanceKopecks)
							: rublesToKopecks(result.newBalanceRub),
					),
					refundedRub: result.refundedRub,
					duplicate: result.duplicate,
					cashOperation: result.cashOperation,
				};
				return { success: true, data: refundPayload, ...refundPayload };
			} catch (err: unknown) {
				const statusCode =
					typeof err === "object" && err !== null && "statusCode" in err && typeof (err as { statusCode?: unknown }).statusCode === "number"
						? ((err as { statusCode: number }).statusCode)
						: err instanceof FamilyWalletError
							? err.statusCode
							: 500;
				const message = err instanceof Error ? err.message : "Не удалось оформить возврат семейного депозита";
				return reply.code(statusCode).send({
					error: statusCode === 404 ? "NotFound" : statusCode === 409 ? "IdempotencyConflict" : statusCode === 400 ? "InvalidAmount" : "RefundFailed",
					message,
				});
			}
		},
	});
}
