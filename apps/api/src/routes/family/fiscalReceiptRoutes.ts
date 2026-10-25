import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { payments } from "../../db/schema.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import {
	familyGroupForOrganization,
	familyMembersForOrganization,
} from "./familyBalanceService.js";

export function registerFamilyFiscalReceiptRoutes(app: FastifyInstance) {
	// GET /api/finance/family/:familyGroupId/receipts — фискальные чеки членов семьи
	app.get("/api/finance/family/:familyGroupId/receipts", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family fiscal receipts read",
		);
		if (!organizationId) return;

		const { familyGroupId } = req.params as { familyGroupId: string };
		const family = await familyGroupForOrganization(familyGroupId, organizationId);
		if (!family) {
			return reply.code(404).send({ error: "Family group not found" });
		}

		const members = await familyMembersForOrganization(familyGroupId, organizationId);
		const memberIds = members.map((m) => m.id);
		if (family.headPatientId && !memberIds.includes(family.headPatientId)) {
			memberIds.push(family.headPatientId);
		}

		if (memberIds.length === 0) return [];

		const receipts = await db
			.select({
				id: payments.id,
				patientId: payments.patientId,
				amountRub: payments.amountRub,
				method: payments.method,
				fiscalReceiptNumber: payments.fiscalReceiptNumber,
				fiscalFd: payments.fiscalFd,
				fiscalFn: payments.fiscalFn,
				fiscalFpd: payments.fiscalFpd,
				fiscalReceiptUrl: payments.fiscalReceiptUrl,
				createdAt: payments.createdAt,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					inArray(payments.patientId, memberIds),
					isNotNull(payments.fiscalReceiptNumber),
				),
			)
			.orderBy(desc(payments.createdAt))
			.limit(50);

		return receipts;
	});

	// POST /api/finance/family/receipt/verify — проверка статуса фискального чека
	app.post("/api/finance/family/receipt/verify", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"family receipt verify",
		);
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const { paymentId } = (req.body as { paymentId?: string }) || {};
		if (!paymentId) {
			return reply.code(400).send({ error: "ValidationError", message: "Требуется paymentId" });
		}

		const [payment] = await db
			.select()
			.from(payments)
			.where(and(eq(payments.id, paymentId), eq(payments.organizationId, organizationId)))
			.limit(1);

		if (!payment) {
			return reply.code(404).send({ error: "ReceiptNotFound", message: "Чек не найден" });
		}

		return {
			paymentId: payment.id,
			status: payment.status,
			fiscalReceiptNumber: payment.fiscalReceiptNumber,
			fiscalFd: payment.fiscalFd,
			fiscalFpd: payment.fiscalFpd,
			amountRub: payment.amountRub,
			fiscalReceiptUrl: payment.fiscalReceiptUrl,
		};
	});
}
