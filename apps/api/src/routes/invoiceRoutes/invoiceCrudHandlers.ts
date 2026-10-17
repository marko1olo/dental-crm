/**
 * DENTE Dental CRM — Invoice Read / CRUD Route Handlers (Feature #41).
 *
 * Implements:
 * 1. GET /api/invoices: List invoices / work orders.
 * 2. GET /api/invoices/:id: Get invoice details / payment status.
 */

import { resolveInvoiceTotalAmountRub } from "@dental/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	patientInvoices,
	payments,
	sberbankTransactions,
} from "../../db/schema/billing.js";
import { treatmentItems } from "../../db/schema/clinical.js";
import { patients } from "../../db/schema/patients.js";
import { invoiceListQuerySchema } from "./types.js";

export async function registerInvoiceCrudRoutes(app: FastifyInstance) {
	// List invoices / work orders handler
	const handleListInvoices = async (request: FastifyRequest, reply: FastifyReply) => {
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
		const { patientId, status, limit = 100 } = parsedQuery.data;

		// 1. Читаем реальные счета из PostgreSQL 18 (patient_invoices)
		const statusCondition = status
			? status === "pending" || status === "unpaid"
				? inArray(patientInvoices.status, ["draft", "issued", "partially_paid"])
				: eq(patientInvoices.status, status)
			: sql`TRUE`;

		const invoiceRows = await db
			.select({
				id: patientInvoices.id,
				organizationId: patientInvoices.organizationId,
				patientId: patientInvoices.patientId,
				visitId: patientInvoices.visitId,
				totalAmountRub: patientInvoices.totalAmountRub,
				totalRub: patientInvoices.totalRub,
				status: patientInvoices.status,
				issuedAt: patientInvoices.issuedAt,
				paidAt: patientInvoices.paidAt,
				createdAt: patientInvoices.createdAt,
				patientName: patients.fullName,
				patientPhone: patients.phone,
			})
			.from(patientInvoices)
			.leftJoin(patients, eq(patientInvoices.patientId, patients.id))
			.where(
				and(
					eq(patientInvoices.organizationId, orgId),
					patientId ? eq(patientInvoices.patientId, patientId) : sql`TRUE`,
					statusCondition,
				),
			)
			.orderBy(desc(patientInvoices.createdAt))
			.limit(limit);

		const invoices = invoiceRows.map((inv) => {
			const totalAmount = resolveInvoiceTotalAmountRub({
				totalAmountRub: inv.totalAmountRub,
				totalRub: inv.totalRub,
			});
			const year = inv.createdAt ? new Date(inv.createdAt).getFullYear() : new Date().getFullYear();
			const cleanId = inv.id.replace(/-/g, "").slice(0, 6).toUpperCase();
			const invoiceNumber = `СЧ-${year}-${cleanId}`;

			return {
				id: inv.id,
				number: invoiceNumber,
				invoiceNumber,
				patientId: inv.patientId,
				patientName: inv.patientName || "Пациент",
				patientPhone: inv.patientPhone || undefined,
				visitId: inv.visitId,
				organizationId: inv.organizationId,
				totalAmountRub: totalAmount,
				paidAmountRub: inv.status === "paid" ? totalAmount : 0,
				status: inv.status,
				issuedAt: inv.issuedAt?.toISOString() || null,
				paidAt: inv.paidAt?.toISOString() || null,
				createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
				date: inv.createdAt
					? new Date(inv.createdAt).toLocaleDateString("ru-RU")
					: new Date().toLocaleDateString("ru-RU"),
			};
		});

		// 2. Читаем treatmentItems для обратной совместимости
		const rawItems = await db
			.select()
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.organizationId, orgId),
					patientId ? eq(treatmentItems.patientId, patientId) : sql`TRUE`,
				),
			)
			.orderBy(desc(treatmentItems.id))
			.limit(limit);

		const items = rawItems.map((item) => ({
			...item,
			totalAmountRub: resolveInvoiceTotalAmountRub({
				totalRub: item.priceRub,
			}),
		}));

		return reply.code(200).send({
			invoices,
			items,
		});
	};

	// GET /api/invoices/pending — Hot queue of unpaid invoices for cashbox 54-FZ
	app.get("/api/invoices/pending", async (request: FastifyRequest, reply: FastifyReply) => {
		if (reply.sent) return reply;
		const context = await requireClinicalReadContext(request, reply, "invoices pending queue");
		if (!context) return reply;
		const orgId = context.organizationId;

		const invoiceRows = await db
			.select({
				id: patientInvoices.id,
				organizationId: patientInvoices.organizationId,
				patientId: patientInvoices.patientId,
				visitId: patientInvoices.visitId,
				totalAmountRub: patientInvoices.totalAmountRub,
				totalRub: patientInvoices.totalRub,
				status: patientInvoices.status,
				issuedAt: patientInvoices.issuedAt,
				paidAt: patientInvoices.paidAt,
				createdAt: patientInvoices.createdAt,
				patientName: patients.fullName,
				patientPhone: patients.phone,
			})
			.from(patientInvoices)
			.leftJoin(patients, eq(patientInvoices.patientId, patients.id))
			.where(
				and(
					eq(patientInvoices.organizationId, orgId),
					inArray(patientInvoices.status, ["draft", "issued", "partially_paid"]),
				),
			)
			.orderBy(desc(patientInvoices.createdAt))
			.limit(50);

		const pendingInvoices = invoiceRows.map((inv) => {
			const totalAmount = resolveInvoiceTotalAmountRub({
				totalAmountRub: inv.totalAmountRub,
				totalRub: inv.totalRub,
			});
			const year = inv.createdAt ? new Date(inv.createdAt).getFullYear() : new Date().getFullYear();
			const cleanId = inv.id.replace(/-/g, "").slice(0, 6).toUpperCase();
			const invoiceNumber = `СЧ-${year}-${cleanId}`;

			return {
				id: inv.id,
				number: invoiceNumber,
				invoiceNumber,
				patientId: inv.patientId,
				patientName: inv.patientName || "Пациент",
				patientPhone: inv.patientPhone || undefined,
				visitId: inv.visitId,
				organizationId: inv.organizationId,
				totalAmountRub: totalAmount,
				paidAmountRub: 0,
				status: inv.status,
				issuedAt: inv.issuedAt?.toISOString() || null,
				paidAt: null,
				createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
				date: inv.createdAt
					? new Date(inv.createdAt).toLocaleDateString("ru-RU")
					: new Date().toLocaleDateString("ru-RU"),
			};
		});

		return reply.code(200).send({
			success: true,
			invoices: pendingInvoices,
			count: pendingInvoices.length,
		});
	});

	for (const path of ["/api/invoices", "/api/v1/billing/invoices"]) {
		app.get(path, handleListInvoices);
	}

	// Get invoice details / payment status handler
	const handleGetInvoiceById = async (request: FastifyRequest, reply: FastifyReply) => {
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
				const totalAmountRub = resolveInvoiceTotalAmountRub({
					totalAmountRub: invoiceRow.totalAmountRub,
					totalRub: invoiceRow.totalRub,
				});

				let actualFiscalReceiptNumber: string | null = null;
				if (isPaid) {
					const [linkedPayment] = await db
						.select({ fiscalReceiptNumber: payments.fiscalReceiptNumber })
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								eq(payments.documentId, invoiceRow.id),
							),
						)
						.limit(1);
					actualFiscalReceiptNumber =
						linkedPayment?.fiscalReceiptNumber || null;
				}

				return reply.code(200).send({
					id: invoiceRow.id,
					organizationId: invoiceRow.organizationId,
					status: invoiceRow.status,
					isPaid,
					totalAmountRub,
					paidAmountRub: isPaid ? totalAmountRub : 0,
					remainingAmountRub: isPaid ? 0 : totalAmountRub,
					paidAtIso: invoiceRow.paidAt ? invoiceRow.paidAt.toISOString() : null,
					fiscalReceiptNumber: actualFiscalReceiptNumber,
					fiscalReceiptId: actualFiscalReceiptNumber,
					patientId: invoiceRow.patientId,
					visitId: invoiceRow.visitId,
					createdAt: invoiceRow.createdAt.toISOString(),
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

				let actualFiscalReceiptNumber: string | null = null;
				if (isPaid) {
					const [linkedPayment] = await db
						.select({ fiscalReceiptNumber: payments.fiscalReceiptNumber })
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								eq(payments.clientMutationId, txRow.orderId),
							),
						)
						.limit(1);
					actualFiscalReceiptNumber =
						linkedPayment?.fiscalReceiptNumber || null;
				}

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
					fiscalReceiptNumber: actualFiscalReceiptNumber,
					fiscalReceiptId: actualFiscalReceiptNumber,
					patientId: txRow.patientId,
					visitId: txRow.visitId,
				});
			}

			return reply.code(404).send({
				error: "InvoiceNotFound",
				message: `Счёт с идентификатором '${id}' не найден.`,
			});
	};

	for (const path of ["/api/invoices/:id", "/api/v1/billing/invoices/:id"]) {
		app.get(path, handleGetInvoiceById);
	}
}
