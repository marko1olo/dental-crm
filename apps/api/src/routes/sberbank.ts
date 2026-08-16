import crypto from "node:crypto";
import { kopecksToNumericString } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	namedDevelopmentModeActive,
	requireResolvedOrganizationId as requireOrganizationContext,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	generatedDocuments,
	payments,
	sberbankTransactions,
	visits,
} from "../db/schema.js";
import { requirePermission } from "../security/permissions.js";
import { SberbankClient } from "../services/sberbankClient.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

/**
 * Validates Sberbank HMAC-SHA256 checksum according to Acquiring API v2 specification.
 * 1. Excludes checksum, sign, signature, sign_alias.
 * 2. Sorts remaining parameters in alphabetical order (key1;val1;key2;val2;...;).
 * 3. Computes HMAC-SHA256 using the clinic secret key and compares in constant-time.
 */
export function verifySberbankChecksum(
	payload: Record<string, unknown>,
	secret: string,
	incomingChecksum: string,
): boolean {
	const cleanPayload: Record<string, string> = {};
	for (const [key, value] of Object.entries(payload)) {
		if (
			key === "checksum" ||
			key === "sign" ||
			key === "signature" ||
			key === "sign_alias" ||
			value === undefined ||
			value === null ||
			typeof value === "object"
		) {
			continue;
		}
		cleanPayload[key] = String(value);
	}

	const sortedKeys = Object.keys(cleanPayload).sort();
	if (sortedKeys.length === 0) return false;

	// Sberbank Standard v2: key1;val1;key2;val2;...; (with trailing semicolon)
	const strStandard = `${sortedKeys.map((k) => `${k};${cleanPayload[k]}`).join(";")};`;
	const hmacStandard = crypto
		.createHmac("sha256", secret)
		.update(strStandard)
		.digest("hex");

	if (
		timingSafeSecretEqual(
			hmacStandard.toUpperCase(),
			incomingChecksum.toUpperCase(),
		) ||
		timingSafeSecretEqual(
			hmacStandard.toLowerCase(),
			incomingChecksum.toLowerCase(),
		)
	) {
		return true;
	}

	// Format 2: key1=val1;key2=val2
	const strKeyEq = sortedKeys.map((k) => `${k}=${cleanPayload[k]}`).join(";");
	const hmacKeyEq = crypto
		.createHmac("sha256", secret)
		.update(strKeyEq)
		.digest("hex");

	if (
		timingSafeSecretEqual(
			hmacKeyEq.toUpperCase(),
			incomingChecksum.toUpperCase(),
		) ||
		timingSafeSecretEqual(
			hmacKeyEq.toLowerCase(),
			incomingChecksum.toLowerCase(),
		)
	) {
		return true;
	}

	// Format 3: key1=val1&key2=val2 (URL encoded query standard)
	const strUrl = sortedKeys.map((k) => `${k}=${cleanPayload[k]}`).join("&");
	const hmacUrl = crypto
		.createHmac("sha256", secret)
		.update(strUrl)
		.digest("hex");

	if (
		timingSafeSecretEqual(
			hmacUrl.toUpperCase(),
			incomingChecksum.toUpperCase(),
		) ||
		timingSafeSecretEqual(
			hmacUrl.toLowerCase(),
			incomingChecksum.toLowerCase(),
		)
	) {
		return true;
	}

	// Format 4: SHA-256 checksum (key1=val1;...;secret)
	const shaKeyEq = crypto
		.createHash("sha256")
		.update(`${strKeyEq}${secret}`)
		.digest("hex");
	if (
		timingSafeSecretEqual(
			shaKeyEq.toUpperCase(),
			incomingChecksum.toUpperCase(),
		) ||
		timingSafeSecretEqual(
			shaKeyEq.toLowerCase(),
			incomingChecksum.toLowerCase(),
		)
	) {
		return true;
	}

	// Format 5: SHA-256 checksum (key1;val1;...;secret)
	const shaStandard = crypto
		.createHash("sha256")
		.update(`${strStandard}${secret}`)
		.digest("hex");
	if (
		timingSafeSecretEqual(
			shaStandard.toUpperCase(),
			incomingChecksum.toUpperCase(),
		) ||
		timingSafeSecretEqual(
			shaStandard.toLowerCase(),
			incomingChecksum.toLowerCase(),
		)
	) {
		return true;
	}

	return false;
}

export async function registerSberbankRoutes(app: FastifyInstance) {
	app.post(
		"/api/sberbank/pay",
		{
			schema: {
				body: {
					type: "object",
					required: ["patientId", "amount"],
					properties: {
						patientId: { type: "string", format: "uuid" },
						amount: { type: "integer", minimum: 1 },
						visitId: { type: "string" },
						documentId: { type: "string" },
						invoiceId: { type: "string" },
					},
				},
			},
		},
		async (request, reply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;

			const organizationId = await requireOrganizationContext(request, reply);
			if (!organizationId) return;

			const { patientId, amount, visitId, documentId, invoiceId } = request.body as {
				patientId: string;
				amount: number;
				visitId?: string;
				documentId?: string;
				invoiceId?: string;
			};

			let client: SberbankClient;
			try {
				client = new SberbankClient();
			} catch (error) {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message:
						"Платёжный шлюз Сбербанка не подключён: интеграция отсутствует в сборке.",
				});
			}

			const orderNumber = crypto.randomUUID();
			const origin = request.headers.origin;
			const returnUrl = origin
				? `${origin}/cabinet`
				: "http://localhost:3000/cabinet";

			try {
				const res = await client.registerOrder(orderNumber, amount, returnUrl);

				if (!res.orderId || !res.formUrl) {
					return reply.status(500).send({
						error: "SberbankError",
						message: res.errorMessage || "Ошибка регистрации заказа в Сбербанке",
					});
				}

				await db.insert(sberbankTransactions).values({
					organizationId,
					patientId,
					visitId: visitId || null,
					documentId: documentId || null,
					invoiceId: invoiceId || null,
					orderId: res.orderId,
					amount,
					status: "pending",
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

	app.get(
		"/api/sberbank/status/:orderId",
		{
			schema: {
				params: {
					type: "object",
					required: ["orderId"],
					properties: {
						orderId: { type: "string" },
					},
				},
			},
		},
		async (request, reply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;
			const { orderId } = request.params as { orderId: string };
			const orgId = await requireOrganizationContext(request, reply);
			if (!orgId) return;

			let client: SberbankClient;
			try {
				client = new SberbankClient();
			} catch (error) {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message:
						"Платёжный шлюз Сбербанка не подключён: интеграция отсутствует в сборке.",
				});
			}

			try {
				const sberStatus = await client.getOrderStatusExtended(orderId);
				const code = sberStatus.orderStatus;

				let mappedStatus = "pending";
				if (code === 2) {
					mappedStatus = "success";
				} else if (code === 3 || code === 6) {
					mappedStatus = "failed";
				} else if (code === 1) {
					mappedStatus = "approved";
				} else if (code === 4) {
					mappedStatus = "refunded";
				}

				return await withTenantCtx(orgId, async (tx) => {
					const [lockedTx] = await tx
						.select()
						.from(sberbankTransactions)
						.where(
							and(
								eq(sberbankTransactions.orderId, orderId),
								eq(sberbankTransactions.organizationId, orgId),
							),
						)
						.for("update")
						.limit(1);

					if (!lockedTx) {
						return reply.status(404).send({
							error: "TransactionNotFound",
							message: "Транзакция оплаты Сбербанк не найдена.",
						});
					}

					const [lockedPayment] = await tx
						.select()
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								eq(payments.clientMutationId, `sberbank:${orderId}`),
							),
						)
						.for("update")
						.limit(1);

					if (mappedStatus !== lockedTx.status) {
						await tx
							.update(sberbankTransactions)
							.set({ status: mappedStatus, updatedAt: new Date() })
							.where(
								and(
									eq(sberbankTransactions.id, lockedTx.id),
									eq(sberbankTransactions.organizationId, orgId),
								),
							);

						if (
							(lockedTx.status === "pending" ||
								lockedTx.status === "approved") &&
							mappedStatus === "success" &&
							!lockedPayment
						) {
							const amountRub = Number(
								kopecksToNumericString(lockedTx.amount),
							);
							await tx
								.insert(payments)
								.values({
									organizationId: orgId,
									patientId: lockedTx.patientId,
									visitId: lockedTx.visitId ? lockedTx.visitId : null,
									documentId: lockedTx.documentId ? lockedTx.documentId : null,
									method: "card",
									status: "paid",
									amountRub,
									paidAt: new Date(),
									clientMutationId: `sberbank:${orderId}`,
									note: `Оплата через Сбербанк Эквайринг (заказ ${orderId})`,
								})
								.onConflictDoNothing({
									target: [payments.organizationId, payments.clientMutationId],
								});

							if (lockedTx.documentId) {
								await tx
									.update(generatedDocuments)
									.set({ status: "issued", issuedAt: new Date() })
									.where(
										and(
											eq(generatedDocuments.id, lockedTx.documentId),
											eq(generatedDocuments.organizationId, orgId),
											eq(generatedDocuments.status, "draft"),
										),
									);
							}

							if (lockedTx.visitId) {
								await tx
									.update(visits)
									.set({ updatedAt: new Date() })
									.where(
										and(
											eq(visits.id, lockedTx.visitId),
											eq(visits.organizationId, orgId),
										),
									);
							}
						}
					}

					return {
						success: true,
						status: mappedStatus,
						amount: lockedTx.amount,
					};
				});
			} catch (error) {
				return reply.status(500).send({
					error: "SberbankError",
					message: error instanceof Error ? error.message : "Неизвестная ошибка",
				});
			}
		},
	);

	app.post("/api/sberbank/webhook", async (request, reply) => {
		const secret =
			process.env.SBERBANK_WEBHOOK_SECRET ||
			process.env.DENTE_WEBHOOK_SECRET ||
			process.env.SBERBANK_SECRET_KEY;

		if (!secret) {
			if (!namedDevelopmentModeActive()) {
				return reply.status(503).send({
					error: "WebhookSecretNotConfigured",
					message:
						"Приём уведомлений от банка временно недоступен: клиника не подключила защищённую интеграцию. Обратитесь к администратору клиники.",
				});
			}
		}

		const body = (request.body as Record<string, unknown>) || {};
		const query = (request.query as Record<string, unknown>) || {};
		const payload = { ...query, ...body };

		const incomingChecksum =
			(payload.checksum as string) ||
			(payload.sign as string) ||
			(payload.signature as string) ||
			(request.headers["x-dente-webhook-secret"] as string) ||
			(request.headers["x-sberbank-signature"] as string);

		if (!incomingChecksum) {
			return reply.status(400).send({
				error: "MissingChecksum",
				message: "Параметр подписи/контрольной суммы (checksum) отсутствует.",
			});
		}

		const effectiveSecret =
			secret || (namedDevelopmentModeActive() ? "dev-sberbank-secret" : "");
		if (!effectiveSecret) {
			return reply.status(503).send({
				error: "WebhookSecretNotConfigured",
				message:
					"Приём уведомлений от банка временно недоступен: клиника не подключила защищённую интеграцию. Обратитесь к администратору клиники.",
			});
		}
		const isValidSignature = verifySberbankChecksum(
			payload,
			effectiveSecret,
			incomingChecksum,
		);

		if (!isValidSignature) {
			return reply.status(401).send({
				error: "InvalidChecksum",
				message: "Неверная подпись/контрольная сумма вебхука.",
			});
		}

		// Signature guard passed with ZERO DB calls so far.
		const orderId =
			(payload.orderId as string) ||
			(payload.mdOrder as string) ||
			(payload.orderNumber as string);

		if (!orderId) {
			return reply.status(400).send({
				error: "MissingOrderId",
				message: "Параметр orderId отсутствует в запросе.",
			});
		}

		const targetTx = await withSuperuserBypass(async (tx) => {
			const [found] = await tx
				.select()
				.from(sberbankTransactions)
				.where(eq(sberbankTransactions.orderId, String(orderId)))
				.limit(1);
			return found;
		});

		if (!targetTx) {
			return reply.status(404).send({
				error: "TransactionNotFound",
				message: `Транзакция с orderId '${orderId}' не найдена.`,
			});
		}

		return await withTenantCtx(targetTx.organizationId, async (tx) => {
			const [lockedTx] = await tx
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.orderId, String(orderId)),
						eq(sberbankTransactions.organizationId, targetTx.organizationId),
					),
				)
				.for("update")
				.limit(1);

			if (!lockedTx) {
				return reply.status(404).send({
					error: "TransactionNotFound",
					message: "Транзакция не найдена в контексте организации.",
				});
			}

			// Pessimistically lock payments row for this order
			const [lockedPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, targetTx.organizationId),
						eq(payments.clientMutationId, `sberbank:${lockedTx.orderId}`),
					),
				)
				.for("update")
				.limit(1);

			// Validate incoming amount in kopecks if provided by gateway
			if (payload.amount !== undefined && payload.amount !== null) {
				const incomingKopecks = Number(payload.amount);
				if (!Number.isNaN(incomingKopecks) && incomingKopecks !== lockedTx.amount) {
					request.log.warn(
						{ orderId, expected: lockedTx.amount, received: incomingKopecks },
						"[SberbankWebhook] Amount mismatch detected",
					);
					return reply.status(400).send({
						error: "AmountMismatch",
						message: "Сумма в уведомлении не совпадает с суммой зарегистрированного заказа.",
					});
				}
			}

			const operation = String(payload.operation ?? "").toLowerCase();
			const rawStatus = String(
				payload.status ?? payload.operation ?? payload.actionCode ?? "success",
			).toLowerCase();

			// 1. Refund operation handling
			if (operation === "refunded" || rawStatus === "refunded") {
				await tx
					.update(sberbankTransactions)
					.set({
						status: "refunded",
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(sberbankTransactions.id, lockedTx.id),
							eq(sberbankTransactions.organizationId, lockedTx.organizationId),
						),
					);

				if (lockedPayment) {
					await tx
						.update(payments)
						.set({
							status: "refunded",
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(payments.organizationId, lockedTx.organizationId),
								eq(payments.id, lockedPayment.id),
							),
						);
				}

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "refunded",
				});
			}

			// 2. Reversal (Unhold) handling
			if (operation === "reversed" || rawStatus === "reversed") {
				await tx
					.update(sberbankTransactions)
					.set({
						status: "reversed",
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(sberbankTransactions.id, lockedTx.id),
							eq(sberbankTransactions.organizationId, lockedTx.organizationId),
						),
					);

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "reversed",
				});
			}

			// 3. Approved (Hold) handling
			if (operation === "approved" || rawStatus === "approved") {
				await tx
					.update(sberbankTransactions)
					.set({
						status: "approved",
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(sberbankTransactions.id, lockedTx.id),
							eq(sberbankTransactions.organizationId, lockedTx.organizationId),
						),
					);

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "approved",
				});
			}

			// Prevent state machine inversion on terminal states
			if (lockedTx.status === "refunded" && operation !== "refunded") {
				return reply.status(200).send({
					success: true,
					processed: false,
					reason: "already_refunded",
					status: "refunded",
				});
			}

			// 4. Success / Deposited / Paid (Final Charge / Code 2)
			const isSuccess =
				operation === "deposited" ||
				operation === "paid" ||
				rawStatus === "success" ||
				rawStatus === "deposited" ||
				rawStatus === "paid" ||
				rawStatus === "2" ||
				rawStatus === "0";

			if (isSuccess) {
				if (
					lockedTx.status === "success" ||
					(lockedPayment && lockedPayment.status === "paid")
				) {
					return reply.status(200).send({
						success: true,
						processed: false,
						reason: "already_processed",
						status: "success",
						paymentId: lockedPayment?.id,
					});
				}

				await tx
					.update(sberbankTransactions)
					.set({
						status: "success",
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(sberbankTransactions.id, lockedTx.id),
							eq(sberbankTransactions.organizationId, lockedTx.organizationId),
						),
					);

				const amountRub = Number(
					kopecksToNumericString(lockedTx.amount),
				);
				const [insertedPayment] = await tx
					.insert(payments)
					.values({
						organizationId: lockedTx.organizationId,
						patientId: lockedTx.patientId,
						visitId: lockedTx.visitId ? lockedTx.visitId : null,
						documentId: lockedTx.documentId ? lockedTx.documentId : null,
						method: "card",
						status: "paid",
						amountRub,
						paidAt: new Date(),
						clientMutationId: `sberbank:${lockedTx.orderId}`,
						note: `Оплата через Сбербанк Эквайринг (заказ ${lockedTx.orderId})`,
					})
					.onConflictDoNothing({
						target: [payments.organizationId, payments.clientMutationId],
					})
					.returning();

				if (lockedTx.documentId) {
					await tx
						.update(generatedDocuments)
						.set({ status: "issued", issuedAt: new Date() })
						.where(
							and(
								eq(generatedDocuments.id, lockedTx.documentId),
								eq(generatedDocuments.organizationId, lockedTx.organizationId),
								eq(generatedDocuments.status, "draft"),
							),
						);
				}

				if (lockedTx.visitId) {
					await tx
						.update(visits)
						.set({ updatedAt: new Date() })
						.where(
							and(
								eq(visits.id, lockedTx.visitId),
								eq(visits.organizationId, lockedTx.organizationId),
							),
						);
				}

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "success",
					paymentId: insertedPayment?.id || lockedPayment?.id,
					amount: lockedTx.amount,
				});
			}

			// 5. Failed / Declined
			await tx
				.update(sberbankTransactions)
				.set({
					status: "failed",
					updatedAt: new Date(),
				})
				.where(eq(sberbankTransactions.id, lockedTx.id));

			return reply.status(200).send({
				success: true,
				processed: true,
				status: "failed",
			});
		});
	});
}
