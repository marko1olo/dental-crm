/**
 * DENTE Dental CRM — Invoice Read / CRUD Route Handlers (Feature #41).
 *
 * Implements:
 * 1. GET /api/invoices: List invoices / work orders.
 * 2. GET /api/invoices/:id: Get invoice details / payment status.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	patientInvoices,
	sberbankTransactions,
} from "../../db/schema/billing.js";
import { treatmentItems } from "../../db/schema/clinical.js";
import { invoiceListQuerySchema } from "./types.js";

export async function registerInvoiceCrudRoutes(app: FastifyInstance) {
	// GET /api/invoices — List invoices / work orders
	app.get("/api/invoices", async (request: FastifyRequest, reply: FastifyReply) => {
		if (reply.sent) return reply;
		const context = await requireClinicalReadContext(request, reply, "invoices list");
		if (!context) return reply;
		const orgId = context.organizationId;

		const parsedQuery = invoiceListQuerySchema.safeParse(request.query);
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Параметр patientId должен быть валидным UUID.",
				details: parsedQuery.error.issues,
			});
		}
		const patientId = parsedQuery.data.patientId;

		const items = await db
			.select()
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.organizationId, orgId),
					patientId ? eq(treatmentItems.patientId, patientId) : sql`TRUE`,
				),
			)
			.orderBy(desc(treatmentItems.id))
			.limit(100);

		return reply.code(200).send({
			items,
		});
	});

	// GET /api/invoices/:id — Get invoice details / payment status
	app.get(
		"/api/invoices/:id",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (reply.sent) return reply;
			const context = await requireClinicalReadContext(request, reply, "get invoice");
			if (!context) return reply;
			const orgId = context.organizationId;

			const { id } = request.params as { id: string };
			if (!id) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Идентификатор счёта обязателен.",
				});
			}

			// 1. Try finding in patientInvoices by UUID id
			const isUuid =
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
					id,
				);
			let invoiceRow: typeof patientInvoices.$inferSelect | undefined;

			if (isUuid) {
				const [found] = await db
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.organizationId, orgId),
							eq(patientInvoices.id, id),
						),
					)
					.limit(1);
				invoiceRow = found;
			}

			if (invoiceRow) {
				const isPaid = invoiceRow.status === "paid";
				const totalAmountRub = Number(
					invoiceRow.totalAmountRub || invoiceRow.totalRub || 0,
				);

				return reply.code(200).send({
					id: invoiceRow.id,
					status: invoiceRow.status,
					isPaid,
					totalAmountRub,
					paidAmountRub: isPaid ? totalAmountRub : 0,
					remainingAmountRub: isPaid ? 0 : totalAmountRub,
					paidAtIso: invoiceRow.paidAt ? invoiceRow.paidAt.toISOString() : null,
					fiscalReceiptNumber: isPaid
						? `FD-${invoiceRow.id.slice(0, 8).toUpperCase()}`
						: null,
					fiscalReceiptId: isPaid
						? `FD-${invoiceRow.id.slice(0, 8).toUpperCase()}`
						: null,
					patientId: invoiceRow.patientId,
					visitId: invoiceRow.visitId,
				});
			}

			// 2. Try finding in sberbankTransactions by orderId
			const [txRow] = await db
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.organizationId, orgId),
						eq(sberbankTransactions.orderId, id),
					),
				)
				.limit(1);

			if (txRow) {
				const isPaid = txRow.status === "SETTLED";
				const amountRub = txRow.amount / 100;

				return reply.code(200).send({
					id: txRow.orderId,
					status: isPaid ? "paid" : txRow.status.toLowerCase(),
					isPaid,
					totalAmountRub: amountRub,
					paidAmountRub: isPaid ? amountRub : 0,
					remainingAmountRub: isPaid ? 0 : amountRub,
					paidAtIso:
						txRow.updatedAt?.toISOString() ||
						txRow.createdAt?.toISOString() ||
						null,
					fiscalReceiptNumber: isPaid ? `FD-${txRow.orderId.slice(-6)}` : null,
					fiscalReceiptId: isPaid ? `FD-${txRow.orderId.slice(-6)}` : null,
					patientId: txRow.patientId,
					visitId: txRow.visitId,
				});
			}

			return reply.code(404).send({
				error: "InvoiceNotFound",
				message: `Счёт с идентификатором '${id}' не найден.`,
			});
		},
	);
}
