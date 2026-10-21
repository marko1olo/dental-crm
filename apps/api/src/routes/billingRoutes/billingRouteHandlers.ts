import {
	type CreatePaymentInput,
	createPaymentSchema,
	paymentSchema,
} from "@dental/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import {
	BillingOverpaymentError,
	Decree659Error,
	createPaymentInDb,
	findPaymentByClientMutationIdInDb,
	getDocumentForBilling,
	getPatientForBilling,
	getVisitForBilling,
} from "../../db/billingQuery.js";
import { db } from "../../db/client.js";
import { recordAuditEventInDb } from "../../db/auditQuery.js";
import { fiscalReceiptQueue, patientInvoices, payments } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import {
	doctorPayouts,
	resolvePayoutPeriod,
} from "../../services/finance/doctorPayouts.js";
import { explainNegativePayouts } from "../../services/finance/payoutNegativeExplain.js";
import {
	PartialRefundService,
	PartialRefundValidationError,
} from "../../services/billing/PartialRefundService.js";
import { clinicTimeZone } from "../../services/reports/managerReports.js";
import { resolvePeriodBoundary } from "../reports.js";
import {
	fiscalQueueParamsSchema,
	fiscalQueueQuerySchema,
	partialRefundBodySchema,
	payoutQuerySchema,
} from "./types.js";
import {
	documentCanReceivePayment,
	paymentValidationDetail,
} from "./fiscalReceiptService.js";
import {
	isDuplicateClientMutationError,
	paymentRetryMatchesExisting,
	requirePayoutAccess,
	sendBillingPaymentScopeError,
} from "./paymentProcessingService.js";

export async function handleGetPayouts(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const access = await requirePayoutAccess(request, reply);
	if (reply.sent) return reply;
	if (!access) return reply;

	const parsedQuery = payoutQuerySchema.safeParse(request.query);
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "PayoutValidationError",
			message:
				"Проверьте период расчёта: начало и конец передаются датой со временем.",
		});
	}

	const timeZone = await clinicTimeZone(access.organizationId);
	const bounds: { from?: string; to?: string } = {};
	for (const edge of ["from", "to"] as const) {
		const raw = parsedQuery.data[edge];
		if (raw === undefined) continue;
		const resolved = resolvePeriodBoundary(raw, edge, timeZone);
		if (resolved === null) {
			return reply.code(400).send({
				error: "PayoutValidationError",
				message:
					"Границы периода не разобраны. Передайте календарную дату вида ГГГГ-ММ-ДД либо дату со временем и смещением.",
			});
		}
		bounds[edge] = resolved.toISOString();
	}
	const period = resolvePayoutPeriod(bounds, new Date(), timeZone);
	if (!period.ok) {
		return reply
			.code(400)
			.send({ error: "PayoutValidationError", message: period.message });
	}

	try {
		const report = await doctorPayouts({
			organizationId: access.organizationId,
			from: period.from,
			to: period.to,
			onlyDoctorUserId: access.scope === "own" ? access.userId : null,
		});
		const explained = explainNegativePayouts(report, { scope: access.scope });
		return { scope: access.scope, ...explained };
	} catch (error) {
		request.log.error({ err: error }, "billing payouts calculation failed");
		return reply.code(500).send({
			error: "PayoutCalculationFailed",
			message:
				"Расчёт выплат не выполнен: сервер не смог посчитать суммы по базе. " +
				"Это отказ расчёта, а не отсутствие заработка — покажите сообщение администратору системы.",
		});
	}
}

export async function handleCreatePayment(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalMutationAccess(
			request,
			reply,
			"billing payment create",
		))
	) {
		if (reply.sent) return reply;
		return reply;
	}
	if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) {
		if (reply.sent) return reply;
		return reply;
	}
	const parsedInput = createPaymentSchema.safeParse(request.body);
	if (!parsedInput.success) {
		return reply.code(400).send({
			error: "BillingValidationError",
			message: paymentValidationDetail(parsedInput.error.issues),
		});
	}
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing payment create",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;
	const rawInput: CreatePaymentInput = parsedInput.data;
	const headerIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined);
	const effectiveMutationId =
		rawInput.clientMutationId?.trim() || headerIdempotencyKey?.trim();

	if (!effectiveMutationId) {
		return reply.code(400).send({
			error: "BillingValidationError",
			message:
				"Ключ операции (clientMutationId или заголовок Idempotency-Key) обязателен для предотвращения двойных списаний.",
		});
	}
	const input: CreatePaymentInput = {
		...rawInput,
		clientMutationId: effectiveMutationId,
	};
	const existingPayment = await findPaymentByClientMutationIdInDb(
		orgId,
		input.clientMutationId,
	);
	if (existingPayment?.patientId) {
		if (!paymentRetryMatchesExisting(existingPayment, input)) {
			return sendBillingPaymentScopeError(
				reply,
				409,
				"Клиентская операция с данным ключом уже существует с другими параметрами платежа.",
			);
		}
		return reply.code(200).send(paymentSchema.parse(existingPayment));
	}
	let paymentInput = input;
	const patient = await getPatientForBilling(orgId, input.patientId);
	if (!patient) {
		return sendBillingPaymentScopeError(
			reply,
			404,
			"Пациент для оплаты не найден.",
		);
	}
	if (input.visitId) {
		const visit = await getVisitForBilling(orgId, input.visitId);
		if (!visit) {
			return sendBillingPaymentScopeError(
				reply,
				404,
				"Прием для оплаты не найден.",
			);
		}
		if (visit.patientId !== input.patientId) {
			return sendBillingPaymentScopeError(
				reply,
				409,
				"Прием оплаты относится к другому пациенту.",
			);
		}
	}
	if (input.documentId) {
		const document = await getDocumentForBilling(orgId, input.documentId);
		if (!document) {
			return sendBillingPaymentScopeError(
				reply,
				404,
				"Документ для оплаты не найден.",
			);
		}
		if (document.patientId !== input.patientId) {
			return sendBillingPaymentScopeError(
				reply,
				409,
				"Документ оплаты относится к другому пациенту.",
			);
		}
		if (
			document.visitId &&
			input.visitId &&
			document.visitId !== input.visitId
		) {
			return sendBillingPaymentScopeError(
				reply,
				409,
				"Документ оплаты относится к другому приему.",
			);
		}
		if (document.visitId && !input.visitId) {
			const visit = await getVisitForBilling(orgId, document.visitId);
			if (!visit) {
				return sendBillingPaymentScopeError(
					reply,
					404,
					"Прием документа для оплаты не найден.",
				);
			}
			if (visit.patientId !== input.patientId) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Прием документа относится к другому пациенту.",
				);
			}
			paymentInput = { ...input, visitId: document.visitId };
		}
		if (document.status === "voided") {
			return sendBillingPaymentScopeError(
				reply,
				409,
				"К аннулированному документу нельзя привязать оплату.",
			);
		}
		if (document.kind === "payment_refund_correction_request") {
			return sendBillingPaymentScopeError(
				reply,
				409,
				"Заявление на возврат или коррекцию не принимает новую оплату. Оформите документ коррекции без повторной записи оплаты.",
			);
		}
		if (!documentCanReceivePayment(document.kind)) {
			return sendBillingPaymentScopeError(
				reply,
				409,
				"Выберите финансовый документ для оплаты: договор, счет, акт, квитанцию, смету или рассрочку.",
			);
		}
	}
	if (existingPayment) {
		if (
			existingPayment.patientId !== paymentInput.patientId ||
			!paymentRetryMatchesExisting(existingPayment, paymentInput)
		) {
			return sendBillingPaymentScopeError(
				reply,
				409,
				"Клиентская операция уже записала другую оплату. Повтор должен совпадать по сумме, счету, чеку, плательщику и коду вычета.",
			);
		}
		return reply.code(200).send(paymentSchema.parse(existingPayment));
	}
	try {
		const payment = await createPaymentInDb(orgId, paymentInput);

		try {
			const identity = getRequestIdentity(request);
			await recordAuditEventInDb(orgId, {
				entityType: "payment",
				entityId: payment.id,
				action: "payment_receive",
				reason: paymentInput.note ?? null,
				actorUserId: identity.userId ?? null,
			});
		} catch (auditErr) {
			request.log.warn(
				{ err: auditErr, paymentId: payment.id, orgId },
				"[billing] Не удалось записать событие приема оплаты в журнал аудита",
			);
		}

		return reply.code(201).send(paymentSchema.parse(payment));
	} catch (error) {
		if (error instanceof Decree659Error) {
			return reply.code(error.statusCode).send({
				error: error.code,
				message: error.message,
			});
		}
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			(error as { code: unknown }).code === "UpsellConsentShieldViolationError"
		) {
			const err = error as { statusCode?: number; code: string; message: string };
			return reply.code(err.statusCode || 422).send({
				error: err.code,
				message: err.message,
			});
		}
		if (error instanceof BillingOverpaymentError) {
			return reply.code(400).send({
				error: "BillingOverpaymentError",
				message: error.message,
				targetKind: error.targetKind,
				targetId: error.targetId,
			});
		}
		if (
			error instanceof Error &&
			(error.message.includes("Попытка подмены прайса") ||
				error.message.includes("не найдена в каталоге") ||
				error.message.includes("не найден") ||
				error.message.includes("должна быть строго больше"))
		) {
			return reply.code(400).send({
				error: "BillingValidationError",
				message: error.message,
			});
		}
		if (isDuplicateClientMutationError(error)) {
			const alreadyStored = await findPaymentByClientMutationIdInDb(
				orgId,
				paymentInput.clientMutationId,
			);
			if (alreadyStored) {
				if (
					alreadyStored.patientId !== paymentInput.patientId ||
					!paymentRetryMatchesExisting(alreadyStored, paymentInput)
				) {
					return sendBillingPaymentScopeError(
						reply,
						409,
						"Клиентская операция уже записала другую оплату. Повтор должен совпадать по сумме, счету, чеку, плательщику и коду вычета.",
					);
				}
				return reply.code(200).send(paymentSchema.parse(alreadyStored));
			}
		}
		throw error;
	}
}

export async function handlePartialRefund(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalMutationAccess(
			request,
			reply,
			"billing partial refund create",
		))
	) {
		if (reply.sent) return reply;
		return reply;
	}
	if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) {
		if (reply.sent) return reply;
		return reply;
	}

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing partial refund create",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const parsed = partialRefundBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "InvalidPartialRefundInput",
			message: "Некорректные параметры запроса частичного возврата.",
			details: parsed.error.issues,
		});
	}

	const headerIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined);
	const effectiveMutationId =
		parsed.data.clientMutationId?.trim() || headerIdempotencyKey?.trim();

	try {
		const result = await PartialRefundService.executePartialRefund({
			organizationId: orgId,
			...parsed.data,
			clientMutationId: effectiveMutationId,
		});

		try {
			const identity = getRequestIdentity(request);
			await recordAuditEventInDb(orgId, {
				entityType: "payment_refund",
				entityId: result.paymentId,
				action: "payment_refund",
				reason: parsed.data.customReasonDetailsRu || parsed.data.reasonCategory || null,
				actorUserId: identity.userId ?? null,
			});
		} catch (auditErr) {
			request.log.warn(
				{ err: auditErr, orgId },
				"[billing] Не удалось записать событие частичного возврата в журнал аудита",
			);
		}

		return reply.code(200).send(result);
	} catch (err) {
		if (err instanceof PartialRefundValidationError) {
			if (err.code === "DuplicateRefundMutation") {
				return reply.code(200).send({
					success: true,
					paymentId: (err.details as any)?.paymentId,
					isIdempotentReplay: true,
					message: err.message,
				});
			}
			const statusCode = err.code === "OverRefundExceeded" ? 422 : 400;
			return reply.code(statusCode).send({
				error: err.code,
				message: err.message,
				details: err.details,
			});
		}
		request.log.error({ err }, "Partial refund failed");
		return reply.code(500).send({
			error: "PartialRefundInternalError",
			message:
				"Не удалось провести операцию частичного возврата. Обратитесь к администратору.",
		});
	}
}

export async function handleGetFiscalQueuePending(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalReadAccess(
			request,
			reply,
			"billing fiscal queue read",
		))
	) {
		if (reply.sent) return reply;
		return reply;
	}
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing fiscal queue read",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const parsedQuery = fiscalQueueQuerySchema.safeParse(request.query);
	const requestedStatus = parsedQuery.success
		? parsedQuery.data.status
		: undefined;
	const limit = parsedQuery.success ? parsedQuery.data.limit : 50;

	const statusFilter =
		requestedStatus === "all"
			? undefined
			: requestedStatus
				? eq(fiscalReceiptQueue.status, requestedStatus)
				: inArray(fiscalReceiptQueue.status, [
						"pending_print",
						"hardware_offline",
					]);

	const conditions = [eq(fiscalReceiptQueue.organizationId, orgId)];
	if (statusFilter) {
		conditions.push(statusFilter);
	}

	const items = await db
		.select()
		.from(fiscalReceiptQueue)
		.where(and(...conditions))
		.orderBy(desc(fiscalReceiptQueue.createdAt))
		.limit(limit);

	return reply.code(200).send({
		items,
		total: items.length,
	});
}

export async function handleRetryFiscalQueueItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalMutationAccess(
			request,
			reply,
			"billing fiscal queue retry",
		))
	) {
		if (reply.sent) return reply;
		return reply;
	}
	if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) {
		if (reply.sent) return reply;
		return reply;
	}

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing fiscal queue retry",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const parsedParams = fiscalQueueParamsSchema.safeParse(request.params);
	if (!parsedParams.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор чека в очереди (требуется UUID).",
		});
	}
	const { id } = parsedParams.data;

	const [queueItem] = await db
		.select()
		.from(fiscalReceiptQueue)
		.where(
			and(
				eq(fiscalReceiptQueue.id, id),
				eq(fiscalReceiptQueue.organizationId, orgId),
			),
		)
		.limit(1);

	if (!queueItem) {
		return reply.code(404).send({
			error: "FiscalQueueItemNotFound",
			message: "Запись фискального чека не найдена в этой клинике.",
		});
	}

	if (queueItem.status === "printed") {
		return reply.code(200).send({
			success: true,
			status: "printed",
			message: "Чек уже успешно распечатан на ККТ.",
			item: queueItem,
		});
	}

	const isKktOffline =
		process.env.KKM_FORCE_OFFLINE === "1" ||
		process.env.KKM_HARDWARE_TIMEOUT === "1";

	if (isKktOffline) {
		const [updated] = await db
			.update(fiscalReceiptQueue)
			.set({
				status: "hardware_offline",
				lastError: "KKT connection timed out (5000ms) or printer offline",
				retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(fiscalReceiptQueue.id, id),
					eq(fiscalReceiptQueue.organizationId, orgId),
				),
			)
			.returning();

		return reply.code(200).send({
			success: false,
			status: "hardware_offline",
			error: "KKT connection timed out (5000ms) or printer offline",
			retryCount: updated?.retryCount ?? queueItem.retryCount + 1,
			item: updated,
		});
	}

	const [updated] = await db
		.update(fiscalReceiptQueue)
		.set({
			status: "printed",
			printedAt: new Date(),
			lastError: null,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(fiscalReceiptQueue.id, id),
				eq(fiscalReceiptQueue.organizationId, orgId),
			),
		)
		.returning();

	return reply.code(200).send({
		success: true,
		status: "printed",
		item: updated,
	});
}

export async function handleRetryAllFiscalQueue(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalMutationAccess(
			request,
			reply,
			"billing fiscal queue retry-all",
		))
	) {
		if (reply.sent) return reply;
		return reply;
	}
	if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) {
		if (reply.sent) return reply;
		return reply;
	}

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing fiscal queue retry-all",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const pendingItems = await db
		.select()
		.from(fiscalReceiptQueue)
		.where(
			and(
				eq(fiscalReceiptQueue.organizationId, orgId),
				inArray(fiscalReceiptQueue.status, [
					"pending_print",
					"hardware_offline",
				]),
			),
		);

	const isKktOffline =
		process.env.KKM_FORCE_OFFLINE === "1" ||
		process.env.KKM_HARDWARE_TIMEOUT === "1";

	let printedCount = 0;
	let failedCount = 0;

	if (pendingItems.length > 0) {
		const pendingIds = pendingItems.map((item) => item.id);
		if (isKktOffline) {
			await db
				.update(fiscalReceiptQueue)
				.set({
					status: "hardware_offline",
					lastError: "KKT connection timed out (5000ms) or printer offline",
					retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
					updatedAt: new Date(),
				})
				.where(
					and(
						inArray(fiscalReceiptQueue.id, pendingIds),
						eq(fiscalReceiptQueue.organizationId, orgId),
					),
				);
			failedCount = pendingItems.length;
		} else {
			await db
				.update(fiscalReceiptQueue)
				.set({
					status: "printed",
					printedAt: new Date(),
					lastError: null,
					updatedAt: new Date(),
				})
				.where(
					and(
						inArray(fiscalReceiptQueue.id, pendingIds),
						eq(fiscalReceiptQueue.organizationId, orgId),
					),
				);
			printedCount = pendingItems.length;
		}
	}

	return reply.code(200).send({
		success: !isKktOffline,
		processedCount: pendingItems.length,
		printedCount,
		failedCount,
	});
}

export async function handleGetBillingPayments(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing get payments",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const query = request.query as Record<string, string | undefined> | undefined;
	const period = query?.period;
	const patientId = query?.patientId;

	let dateThreshold: Date | undefined;
	const now = new Date();
	if (period === "day") {
		dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	} else if (period === "week") {
		dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	} else if (period === "month") {
		dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1);
	} else if (period === "quarter") {
		const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
		dateThreshold = new Date(now.getFullYear(), currentQuarterMonth, 1);
	} else if (period === "year") {
		dateThreshold = new Date(now.getFullYear(), 0, 1);
	}

	const conditions = [eq(payments.organizationId, orgId)];
	if (patientId) {
		conditions.push(eq(payments.patientId, patientId));
	}
	if (dateThreshold) {
		conditions.push(sql`${payments.paidAt} >= ${dateThreshold}`);
	}

	const rows = await db
		.select()
		.from(payments)
		.where(and(...conditions))
		.orderBy(desc(payments.paidAt))
		.limit(500);

	const data = rows.map((row) => ({
		id: row.id,
		amountRub: Number(row.amountRub),
		amountKopecks: Math.round(Number(row.amountRub) * 100),
		status: row.status,
		method: row.method,
		paymentMethod: row.method,
		patientId: row.patientId,
		visitId: row.visitId,
		documentId: row.documentId,
		isPrimaryPatient: true,
		paidAt: row.paidAt ? row.paidAt.toISOString() : undefined,
		createdAt: row.createdAt ? row.createdAt.toISOString() : undefined,
	}));

	return reply.send({ success: true, data });
}

export async function handleGetBillingInvoices(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing get invoices",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const query = request.query as Record<string, string | undefined> | undefined;
	const period = query?.period;
	const patientId = query?.patientId;

	let dateThreshold: Date | undefined;
	const now = new Date();
	if (period === "day") {
		dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	} else if (period === "week") {
		dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	} else if (period === "month") {
		dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1);
	} else if (period === "quarter") {
		const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
		dateThreshold = new Date(now.getFullYear(), currentQuarterMonth, 1);
	} else if (period === "year") {
		dateThreshold = new Date(now.getFullYear(), 0, 1);
	}

	const conditions = [eq(patientInvoices.organizationId, orgId)];
	if (patientId) {
		conditions.push(eq(patientInvoices.patientId, patientId));
	}
	if (dateThreshold) {
		conditions.push(sql`${patientInvoices.createdAt} >= ${dateThreshold}`);
	}

	const rows = await db
		.select()
		.from(patientInvoices)
		.where(and(...conditions))
		.orderBy(desc(patientInvoices.createdAt))
		.limit(500);

	const data = rows.map((row) => {
		const total = Number(row.totalAmountRub || 0);
		const paid = row.status === "paid" ? total : 0;
		return {
			id: row.id,
			totalRub: total,
			totalAmountRub: total,
			paidRub: paid,
			paidAmountRub: paid,
			status: row.status,
			patientId: row.patientId,
			visitId: row.visitId,
			issuedAt: row.issuedAt ? new Date(row.issuedAt).toISOString() : undefined,
			paidAt: row.paidAt ? new Date(row.paidAt).toISOString() : undefined,
			createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
		};
	});

	return reply.send({ success: true, data });
}

export async function registerBillingRoutes(app: FastifyInstance) {
	app.get("/api/billing/payouts", handleGetPayouts);
	app.get("/api/billing/payments", handleGetBillingPayments);
	app.get("/api/payments", handleGetBillingPayments);
	app.get("/api/billing/invoices", handleGetBillingInvoices);
	app.post("/api/billing/payments", handleCreatePayment);
	app.post("/api/payments", handleCreatePayment);
	app.post("/api/finance/payments", handleCreatePayment);
	app.post("/api/v1/billing/payments", handleCreatePayment);
	app.post("/api/v1/finance/payments", handleCreatePayment);

	const invoicePayHandler = async (
		request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
		reply: FastifyReply,
	) => {
		const invoiceId = request.params?.id;
		const body = request.body || {};
		const mutationId =
			(typeof body.clientMutationId === "string" && body.clientMutationId.trim())
				? body.clientMutationId.trim()
				: (request.headers["idempotency-key"] as string | undefined)?.trim() || `pay-${invoiceId}-${Date.now()}`;
		let patientId = body.patientId;
		let amountRub = body.amountRub;
		if (!patientId || amountRub === undefined) {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"billing invoice payment",
			);
			if (orgId && invoiceId) {
				const resolvedDoc = await getDocumentForBilling(orgId, invoiceId);
				if (resolvedDoc) {
					if (!patientId && resolvedDoc.patientId) patientId = resolvedDoc.patientId;
					if (amountRub === undefined && resolvedDoc.totalAmountRub !== undefined) {
						amountRub = Number(resolvedDoc.totalAmountRub);
					}
				}
			}
		}
		request.body = {
			...body,
			documentId: body.documentId || invoiceId,
			clientMutationId: mutationId,
			...(patientId ? { patientId } : {}),
			...(amountRub !== undefined ? { amountRub } : {}),
		};
		return handleCreatePayment(request, reply);
	};

	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/billing/invoices/:id/payments",
		invoicePayHandler,
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/invoices/:id/pay",
		invoicePayHandler,
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/v1/invoices/:id/pay",
		invoicePayHandler,
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/invoices/:id/payments",
		invoicePayHandler,
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/v1/billing/invoices/:id/payments",
		invoicePayHandler,
	);

	app.post("/api/billing/refunds/partial", handlePartialRefund);
	app.get("/api/billing/fiscal-queue/pending", handleGetFiscalQueuePending);
	app.post("/api/billing/fiscal-queue/:id/retry", handleRetryFiscalQueueItem);
	app.post("/api/billing/fiscal-queue/retry-all", handleRetryAllFiscalQueue);
}
