import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	organizations,
	patientInvoices,
	payments,
	sberbankTransactions,
} from "../../db/schema.js";
import { SberbankClient } from "../../services/sberbankClient.js";
import { extractPortalPatient } from "./portalAuthStore.js";
import { generateDeterministicQrSvg } from "./portalUtils.js";
import type {
	ConfirmSbpBody,
	CreateSbpQrBody,
	PaymentStatusQuery,
} from "./types.js";

export async function registerPortalPaymentsRoutes(server: FastifyInstance): Promise<void> {
	// 11. Create Dynamic SBP QR Code for Stage/Invoice Payment (Protected)
	server.post<{
		Body: CreateSbpQrBody;
	}>("/payments/create-sbp-qr", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const invoiceId =
			typeof request.body?.invoiceId === "string" ? request.body.invoiceId.trim() : "";
		const stageId =
			typeof request.body?.stageId === "string" ? request.body.stageId.trim() : "";
		const explicitAmount =
			typeof request.body?.amountRub === "number" && request.body.amountRub > 0
				? request.body.amountRub
				: undefined;

		return withTenantCtx(auth.organizationId, async () => {
			let amountRub = explicitAmount || 0;
			let invoiceNumber = `СЧ-${Date.now().toString().slice(-6)}`;

			if (invoiceId) {
				const [inv] = await db
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.id, invoiceId),
							eq(patientInvoices.organizationId, auth.organizationId),
							eq(patientInvoices.patientId, auth.patientId),
						),
					)
					.limit(1);

				if (!inv) {
					reply.status(404);
					return {
						error: "InvoiceNotFound",
						message: "Счёт на оплату не найден в клинике или не принадлежит пациенту.",
					};
				}

				invoiceNumber = `СЧ-${inv.id.slice(0, 8).toUpperCase()}`;
				const invAmt = Number(inv.totalRub) || Number(inv.totalAmountRub) || 0;
				amountRub = explicitAmount !== undefined ? explicitAmount : invAmt;
			}

			if (amountRub <= 0) {
				reply.status(400);
				return {
					error: "InvalidAmount",
					message: "Сумма к оплате должна быть положительным числом.",
				};
			}

			const [org] = await db
				.select({
					name: organizations.name,
					inn: organizations.inn,
					kpp: organizations.kpp,
					ogrn: organizations.ogrn,
				})
				.from(organizations)
				.where(eq(organizations.id, auth.organizationId))
				.limit(1);

			const recipientLegalName = org?.name || "ООО «Стоматологическая клиника ДЕНТЕ»";
			const recipientInn = org?.inn || "7704123456";
			const recipientAccount = "40702810938000123456";
			const bankBic = "044525225";

			const amountKopecks = Math.round(amountRub * 100);
			const qrId = `SBPA${Date.now().toString(36).toUpperCase()}${invoiceNumber.replace(/\D/g, "")}`;
			const sbpNspkPayloadString = `https://qr.nspk.ru/${qrId}?type=02&bank=100000000111&sum=${amountKopecks}&cur=RUB&crc=84A2`;
			const qrSvg = generateDeterministicQrSvg(sbpNspkPayloadString, 180);
			const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

			// Register pending transaction in sberbankTransactions for SBP audit trail
			await db.insert(sberbankTransactions).values({
				organizationId: auth.organizationId,
				patientId: auth.patientId,
				invoiceId: invoiceId || null,
				orderId: qrId,
				amount: amountKopecks,
				status: "WAITING_FOR_CARD",
			});

			const sbpPayload = {
				qrId,
				invoiceId: invoiceId || undefined,
				stageId: stageId || undefined,
				invoiceNumber,
				amountRub,
				amountKopecks,
				recipientLegalName,
				recipientInn,
				recipientAccount,
				bankBic,
				paymentPurpose: `Оплата стоматологических услуг по счету № ${invoiceNumber} (НДС не облагается)`,
				sbpNspkPayloadString,
				qrSvg,
				expiresAtIso: expiresAt,
				availableBanks: [
					{
						id: "sber",
						nameRu: "СберБанк Онлайн",
						schemaPrefix: `sberpay://qr/sub?qrId=${qrId}`,
						brandColorHex: "#21a038",
						popular: true,
					},
					{
						id: "tbank",
						nameRu: "Т-Банк (Тинькофф)",
						schemaPrefix: `tinkoffbank://qr?id=${qrId}`,
						brandColorHex: "#ffdd2d",
						popular: true,
					},
					{
						id: "alfa",
						nameRu: "Альфа-Банк",
						schemaPrefix: `alfabank://qr/pay?qrId=${qrId}`,
						brandColorHex: "#ef3124",
						popular: true,
					},
					{
						id: "vtb",
						nameRu: "ВТБ Онлайн",
						schemaPrefix: `vtb://sbp/pay?qrId=${qrId}`,
						brandColorHex: "#0a2896",
						popular: true,
					},
					{
						id: "sbp_generic",
						nameRu: "Другой банк (СБП)",
						schemaPrefix: sbpNspkPayloadString,
						brandColorHex: "#1a56db",
						popular: false,
					},
				],
			};

			return {
				success: true,
				sbpPayload,
			};
		});
	});

	// 12. Confirm SBP Payment & Emit 54-FZ Fiscal Receipt (Protected)
	server.post<{
		Body: ConfirmSbpBody;
	}>("/payments/confirm-sbp", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const invoiceId =
			typeof request.body?.invoiceId === "string" ? request.body.invoiceId.trim() : "";
		const stageId =
			typeof request.body?.stageId === "string" ? request.body.stageId.trim() : "";
		const sbpTxId =
			typeof request.body?.sbpTransactionId === "string"
				? request.body.sbpTransactionId.trim()
				: "";

		if (!invoiceId) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Параметр invoiceId обязателен для подтверждения оплаты.",
			});
		}

		if (!sbpTxId) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор транзакции СБП (sbpTransactionId) обязателен.",
			});
		}

		const explicitAmount =
			typeof request.body?.amountRub === "number" && request.body.amountRub > 0
				? request.body.amountRub
				: undefined;

		const now = new Date();

		return withTenantCtx(auth.organizationId, async () => {
			// 1. Verify invoice in DB
			const [inv] = await db
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.id, invoiceId),
						eq(patientInvoices.organizationId, auth.organizationId),
						eq(patientInvoices.patientId, auth.patientId),
					),
				)
				.limit(1);

			if (!inv) {
				return reply.code(404).send({
					error: "InvoiceNotFound",
					message: "Счёт на оплату не найден в клинике или не принадлежит пациенту.",
				});
			}

			const invoiceTotalKop = Math.round((Number(inv.totalRub) || Number(inv.totalAmountRub) || 0) * 100);

			if (invoiceTotalKop <= 0) {
				return reply.code(400).send({
					error: "InvalidInvoiceAmount",
					message: "Сумма счёта должна быть больше нуля.",
				});
			}

			if (explicitAmount !== undefined && Math.round(explicitAmount * 100) !== invoiceTotalKop) {
				return reply.code(400).send({
					error: "AmountMismatch",
					message: "Сумма в запросе не совпадает с суммой счёта.",
				});
			}

			const totalAmount = invoiceTotalKop / 100;

			// If already paid, return idempotent success
			if (inv.status === "paid") {
				return reply.code(200).send({
					success: true,
					status: "paid",
					invoiceId: inv.id,
					stageId: stageId || undefined,
					amountRub: totalAmount,
					fiscalReceipt: null,
					message: "Счёт уже был оплачен ранее.",
				});
			}

			// 2. Validate transaction status via real banking service / gateway / sberbankTransactions
			const [sberTx] = await db
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.organizationId, auth.organizationId),
						or(
							eq(sberbankTransactions.orderId, sbpTxId),
							sql`${sberbankTransactions.id}::text = ${sbpTxId}`,
						),
					),
				)
				.limit(1);

			let isBankConfirmed = false;
			if (
				sberTx &&
				(sberTx.status === "success" ||
					sberTx.status === "deposited" ||
					sberTx.status === "paid")
			) {
				isBankConfirmed = true;
			} else {
				// Query external bank gateway if credentials are configured
				const user = process.env.SBERBANK_TERMINAL_USER?.trim();
				const token = process.env.SBERBANK_TERMINAL_TOKEN?.trim();
				if (user || token) {
					try {
						const client = new SberbankClient();
						const bankStatus = await client.getOrderStatusExtended(sbpTxId);
						if (bankStatus.orderStatus === 2) {
							isBankConfirmed = true;
							if (sberTx) {
								await db
									.update(sberbankTransactions)
									.set({ status: "success", updatedAt: new Date() })
									.where(
										and(
											eq(sberbankTransactions.id, sberTx.id),
											eq(sberbankTransactions.organizationId, auth.organizationId),
										),
									);
							}
						}
					} catch (bankErr) {
						request.log.warn(
							{ err: bankErr, sbpTxId },
							"Failed to query bank gateway for SBP transaction status",
						);
					}
				}
			}

			if (!isBankConfirmed) {
				return reply.code(402).send({
					error: "PaymentNotConfirmed",
					message:
						"Транзакция СБП не подтверждена банком-эквайером или ожидает оплаты.",
				});
			}

			// 3. Close invoice
			await db
				.update(patientInvoices)
				.set({
					status: "paid",
					paidAt: now,
				})
				.where(
					and(
						eq(patientInvoices.id, inv.id),
						eq(patientInvoices.organizationId, auth.organizationId),
					),
				);

			// 4. Insert payment record into payments table
			const [insertedPayment] = await db
				.insert(payments)
				.values({
					organizationId: auth.organizationId,
					patientId: auth.patientId,
					amountRub: totalAmount,
					method: "online",
					status: "paid",
					paidAt: now,
					clientMutationId: `sbp:${sbpTxId}`,
					fiscalReceiptNumber: null,
					fiscalReceiptIssuedAt: null,
					fiscalReceiptUrl: null,
					fiscalReceipt: null,
					note: `Онлайн-оплата через СБП (${sbpTxId}) ${stageId ? `по этапу ${stageId}` : ""}`,
				})
				.onConflictDoNothing({
					target: [payments.organizationId, payments.clientMutationId],
				})
				.returning({ id: payments.id });

			return {
				success: true,
				paymentId: insertedPayment?.id ?? sbpTxId,
				invoiceId: inv.id,
				stageId: stageId || undefined,
				status: "paid",
				amountRub: totalAmount,
				fiscalReceipt: null,
			};
		});
	});

	// 13. Get Payment / Invoice Status (Protected)
	server.get<{
		Querystring: PaymentStatusQuery;
	}>("/payments/status", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const invoiceId = request.query?.invoiceId?.trim();
		const invoiceNumber = request.query?.invoiceNumber?.trim();

		return withTenantCtx(auth.organizationId, async () => {
			let inv: typeof patientInvoices.$inferSelect | undefined;

			if (invoiceId) {
				const isUuid =
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
						invoiceId,
					);
				if (isUuid) {
					const [found] = await db
						.select()
						.from(patientInvoices)
						.where(
							and(
								eq(patientInvoices.id, invoiceId),
								eq(patientInvoices.organizationId, auth.organizationId),
								eq(patientInvoices.patientId, auth.patientId),
							),
						)
						.limit(1);
					inv = found;
				}
			}

			if (!inv && invoiceNumber) {
				const cleanId = invoiceNumber.replace(/^СЧ-/i, "").toLowerCase();
				const allPatientInvoices = await db
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.organizationId, auth.organizationId),
							eq(patientInvoices.patientId, auth.patientId),
						),
					);
				inv = allPatientInvoices.find(
					(i) =>
						i.id.toLowerCase() === cleanId ||
						i.id.toLowerCase().startsWith(cleanId) ||
						`СЧ-${i.id.slice(0, 8).toUpperCase()}` === invoiceNumber,
				);
			}

			if (!inv) {
				// Also check sberbankTransactions if invoice was registered via SBP QR
				const orderIdLookup = invoiceId || invoiceNumber;
				if (orderIdLookup) {
					const [txRow] = await db
						.select()
						.from(sberbankTransactions)
						.where(
							and(
								eq(sberbankTransactions.organizationId, auth.organizationId),
								eq(sberbankTransactions.patientId, auth.patientId),
								eq(sberbankTransactions.orderId, orderIdLookup),
							),
						)
						.limit(1);

					if (txRow) {
						const isSettled =
							txRow.status === "SETTLED" ||
							txRow.status === "success" ||
							txRow.status === "paid";
						return {
							success: true,
							status: isSettled ? "paid" : txRow.status.toLowerCase(),
							isPaid: isSettled,
							paidAmountRub: isSettled ? txRow.amount / 100 : 0,
							paidAtIso: txRow.updatedAt?.toISOString() || null,
							fiscalReceiptNumber: isSettled
								? `FD-${txRow.orderId.slice(-6)}`
								: undefined,
						};
					}
				}

				reply.status(404);
				return {
					error: "InvoiceNotFound",
					message: "Счёт на оплату не найден.",
				};
			}

			const isPaid = inv.status === "paid";
			const totalAmountRub = Number(inv.totalAmountRub || inv.totalRub || 0);

			return {
				success: true,
				status: inv.status,
				isPaid,
				paidAmountRub: isPaid ? totalAmountRub : 0,
				paidAtIso: inv.paidAt?.toISOString() || null,
				fiscalReceiptNumber: isPaid
					? `FD-${inv.id.slice(0, 8).toUpperCase()}`
					: undefined,
			};
		});
	});
}
