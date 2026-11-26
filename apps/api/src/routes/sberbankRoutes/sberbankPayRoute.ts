import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	generatedDocuments,
	patientInvoices,
	patients,
	sberbankTransactions,
	visits,
} from "../../db/schema.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { requirePermission } from "../../security/permissions.js";
import { SberbankClient } from "../../services/sberbankClient.js";
import { resolveSberReturnUrl } from "./sberbankUtils.js";
import { sberbankPayBodySchema, sberbankPayFastifySchema } from "./types.js";

export async function registerSberbankPayRoute(app: FastifyInstance): Promise<void> {
	app.post(
		"/api/sberbank/pay",
		{
			...sberbankPayFastifySchema,
			config: { tenantTxSelfManaged: true },
		},
		async (request, reply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;

			const organizationId = await requireOrganizationContext(request, reply);
			if (!organizationId) return;

			const parsed = sberbankPayBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры платежа.",
					details: parsed.error.issues,
				});
			}

			const rawIdempotencyKey =
				(typeof request.headers["idempotency-key"] === "string"
					? request.headers["idempotency-key"]
					: undefined) ||
				(typeof request.headers["x-idempotency-key"] === "string"
					? request.headers["x-idempotency-key"]
					: undefined);
			const idempotencyKey = rawIdempotencyKey?.trim();

			if (idempotencyKey) {
				if (!isValidUuid(idempotencyKey)) {
					return reply.status(400).send({
						error: "IdempotencyKeyRequired",
						message: "Заголовок Idempotency-Key должен быть корректным UUID.",
					});
				}
				reply.header("Idempotency-Key", idempotencyKey);
				reply.header("X-Idempotency-Key", idempotencyKey);
			}

			const { patientId, amountKopecks, visitId, documentId, invoiceId } = parsed.data;

			const returnUrl = resolveSberReturnUrl(
				typeof request.headers.origin === "string" ? request.headers.origin : undefined,
			);
			if (!returnUrl) {
				return reply.status(500).send({
					error: "ReturnUrlNotConfigured",
					message: "Не настроен безопасный URL возврата (APP_URL / Origin) для платёжной формы.",
				});
			}

			// Validate patient and linked clinical/billing entities BEFORE contacting external acquiring gateway
			const preflightError = await withTenantCtx(organizationId, async (tx) => {
				const [patient] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
					.limit(1);
				if (!patient) {
					return {
						status: 404 as const,
						error: "PatientNotFound",
						message: "Пациент не найден в вашей клинике.",
					};
				}

				if (invoiceId) {
					const [inv] = await tx
						.select({
							id: patientInvoices.id,
							patientId: patientInvoices.patientId,
							status: patientInvoices.status,
						})
						.from(patientInvoices)
						.where(
							and(
								eq(patientInvoices.id, invoiceId),
								eq(patientInvoices.organizationId, organizationId),
							),
						)
						.limit(1);
					if (!inv || inv.patientId !== patientId) {
						return {
							status: 404 as const,
							error: "InvoiceNotFound",
							message: "Счёт не найден или принадлежит другому пациенту.",
						};
					}
					if (
						inv.status === "paid" ||
						inv.status === "refunded" ||
						inv.status === "voided" ||
						inv.status === "cancelled"
					) {
						return {
							status: 409 as const,
							error: "InvoiceAlreadyPaid",
							message: "Счёт уже оплачен или аннулирован.",
						};
					}
				}

				if (documentId) {
					const [doc] = await tx
						.select({ id: generatedDocuments.id, patientId: generatedDocuments.patientId })
						.from(generatedDocuments)
						.where(
							and(
								eq(generatedDocuments.id, documentId),
								eq(generatedDocuments.organizationId, organizationId),
							),
						)
						.limit(1);
					if (!doc || doc.patientId !== patientId) {
						return {
							status: 404 as const,
							error: "DocumentNotFound",
							message: "Документ не найден или принадлежит другому пациенту.",
						};
					}
				}

				if (visitId) {
					const [visit] = await tx
						.select({ id: visits.id, patientId: visits.patientId })
						.from(visits)
						.where(and(eq(visits.id, visitId), eq(visits.organizationId, organizationId)))
						.limit(1);
					if (!visit || visit.patientId !== patientId) {
						return {
							status: 404 as const,
							error: "VisitNotFound",
							message: "Приём не найден или принадлежит другому пациенту.",
						};
					}
				}

				return null;
			});

			if (preflightError) {
				return reply.status(preflightError.status).send({
					error: preflightError.error,
					message: preflightError.message,
				});
			}

			let client: SberbankClient;
			try {
				client = new SberbankClient();
			} catch {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message:
						"Платёжный шлюз Сбербанка не подключён: интеграция отсутствует в сборке.",
				});
			}

			const orderNumber = idempotencyKey || crypto.randomUUID();

			try {
				const res = await client.registerOrder(orderNumber, amountKopecks, returnUrl);

				if (!res.orderId || !res.formUrl) {
					return reply.status(500).send({
						error: "SberbankError",
						message: res.errorMessage || "Ошибка регистрации заказа в Сбербанке",
					});
				}

				const sberbankOrderId = res.orderId;
				await withTenantCtx(organizationId, async (tx) => {
					await tx.insert(sberbankTransactions).values({
						organizationId,
						patientId,
						visitId: visitId || null,
						documentId: documentId || null,
						invoiceId: invoiceId || null,
						orderId: sberbankOrderId,
						amountKopecks: BigInt(amountKopecks),
						status: "pending",
					});
				});

				return { success: true, orderId: res.orderId, formUrl: res.formUrl };
			} catch (error) {
				return reply.status(500).send({
					error: "SberbankError",
					message: error instanceof Error ? error.message : "Неизвестная ошибка",
				});
			}
		},
	);
}
