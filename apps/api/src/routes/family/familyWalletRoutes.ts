import { kopecksToNumericString, rubToKopecks } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import {
	FamilyWalletError,
	familyWalletService,
} from "../../services/familyWallet/FamilyWalletService.js";
import { getFamilyHistoryRecords } from "./familyBalanceService.js";
import { familyPaymentSchema } from "./familyFinanceTypes.js";

export function registerFamilyWalletRoutes(app: FastifyInstance) {
	// GET /api/finance/family/:familyGroupId/history
	app.get("/api/finance/family/:familyGroupId/history", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(req, reply, "family finance history read");
		if (!organizationId) return;

		const { familyGroupId } = req.params as { familyGroupId: string };
		if (familyGroupId === "patient" || familyGroupId === "pay" || familyGroupId === "topup" || familyGroupId === "refund") {
			return reply.code(404).send({ error: "Family group not found" });
		}

		const records = await getFamilyHistoryRecords(familyGroupId, organizationId);
		if (!records) return reply.code(404).send({ error: "Family group not found" });
		return records;
	});

	// POST /api/finance/family/pay
	app.post("/api/finance/family/pay", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family finance payment");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const payParsed = familyPaymentSchema.safeParse(req.body);
		if (!payParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте оплату: нужны patientId, familyGroupId и сумма больше нуля с точностью до копейки.",
			});
		}

		const headerKey = (req.headers["idempotency-key"] || req.headers["x-idempotency-key"]) as string | undefined;
		const mutationId = payParsed.data.clientMutationId?.trim() || headerKey?.trim();
		if (!mutationId) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Ключ операции (clientMutationId или заголовок Idempotency-Key) обязателен для предотвращения двойных списаний.",
			});
		}

		try {
			const result = await familyWalletService.debit({
				organizationId,
				familyGroupId: payParsed.data.familyGroupId,
				patientId: payParsed.data.patientId,
				payerPatientId: payParsed.data.payerPatientId,
				amountRub: payParsed.data.amountRub,
				serviceId: payParsed.data.serviceId,
				catalogItemId: payParsed.data.catalogItemId,
				discountRub: payParsed.data.discountRub,
				discountPercent: payParsed.data.discountPercent,
				clientMutationId: mutationId,
				documentId: payParsed.data.documentId,
				visitId: payParsed.data.visitId,
			});

			return {
				payment: result.payment,
				newBalance: kopecksToNumericString(rubToKopecks(result.newBalanceRub)),
				duplicate: result.duplicate,
			};
		} catch (err: any) {
			const statusCode = err.statusCode || (err instanceof FamilyWalletError ? err.statusCode : 500);
			const message = err.message || "Internal Server Error";
			return reply.code(statusCode).send({
				error: statusCode === 402 ? "InsufficientFunds" : statusCode === 403 ? "Forbidden" : statusCode === 409 ? "IdempotencyConflict" : statusCode === 404 ? "NotFound" : "PaymentFailed",
				message,
			});
		}
	});
}
