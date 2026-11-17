/**
 * apps/api/src/routes/bankStatements.ts
 *
 * DENTE Dental CRM — 1C Bank Statement (1CClientBankExchange) Upload & Ingestion API.
 * Wave 130 & Mandates 8b, 8e: Exact kopecks integer arithmetic, zero float drift.
 */

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { kopecksToRub, parse1CBankStatement } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";

const uploadBankStatementSchema = z.object({
	content: z.string().min(1, "Содержимое файла выписки не может быть пустым"),
	organizationId: z.string().uuid().optional(),
	clinicId: z.string().uuid().optional().nullable(),
});

export const registerBankStatementsRoutes: FastifyPluginAsync = async (server) => {
	const handleUploadBankStatement = async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"upload 1C bank statement",
		);
		if (!organizationId) return;

		const parsed = uploadBankStatementSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Некорректные данные запроса выписки 1С.",
				details: parsed.error.issues,
			};
		}

		try {
			const registry = parse1CBankStatement(parsed.data.content);

			return {
				success: true,
				registry,
				count: registry.orders.length,
				accountNumber: registry.accountNumber,
				dateFrom: registry.dateFrom,
				dateTo: registry.dateTo,
				openingBalanceRub: kopecksToRub(registry.openingBalanceKopecks ?? 0),
				closingBalanceRub: kopecksToRub(registry.closingBalanceKopecks ?? 0),
				totalReceivedRub: kopecksToRub(registry.totalReceivedKopecks ?? 0),
				totalDeductedRub: kopecksToRub(registry.totalDeductedKopecks ?? 0),
			};
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка синтаксического разбора файла выписки 1С";
			reply.status(400);
			return {
				error: "InvalidBankStatement",
				message: msg,
			};
		}
	};

	server.post("/api/finance/bank-statements/upload", handleUploadBankStatement);
	server.post("/api/v1/finance/bank-statements/upload", handleUploadBankStatement);
};
