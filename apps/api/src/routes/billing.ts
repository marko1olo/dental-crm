import type { FastifyInstance, FastifyReply } from "fastify";
import { createPaymentSchema, documentKindMetadata, paymentSchema, type CreatePaymentInput, type Payment } from "@dental/shared";
import { requireClinicalMutationAccess, requireResolvedOrganizationId } from "../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import {
  findPaymentByClientMutationIdInDb,
  getPatientForBilling,
  getVisitForBilling,
  getDocumentForBilling,
  createPaymentInDb
} from "../db/billingQuery.js";

function documentCanReceivePayment(documentKind: keyof typeof documentKindMetadata): boolean {
  const metadata = documentKindMetadata[documentKind];
  return metadata.group === "payment" && documentKind !== "payment_refund_correction_request";
}

const paymentValidationMessage =
  "Оплата не записана: проверьте сумму, дату, способ оплаты, фискальный чек и явные данные плательщика.";
const billingPaymentScopeError = "BillingPaymentScopeError" as const;

/** Названия полей оплаты по-русски, чтобы отказ указывал на конкретное поле. */
const paymentFieldLabels: Record<string, string> = {
  amountRub: "сумма",
  patientId: "пациент",
  visitId: "прием",
  documentId: "документ",
  method: "способ оплаты",
  paidAt: "дата оплаты",
  fiscalReceiptNumber: "номер фискального чека",
  fiscalReceiptIssuedAt: "дата фискального чека",
  fiscalReceiptUrl: "ссылка на чек",
  fiscalReceipt: "фискальный чек",
  clientMutationId: "ключ операции",
  payerFullName: "плательщик",
  payerInn: "ИНН плательщика",
  payerBirthDate: "дата рождения плательщика",
  payerIdentityDocument: "документ плательщика",
  payerRelationship: "родство плательщика",
  taxDeductionCode: "код налогового вычета",
  note: "примечание"
};

/**
 * Отказ должен называть поле и причину.
 *
 * БЫЛО: на любую ошибку возвращался один и тот же перечень из пяти пунктов —
 * «проверьте сумму, дату, способ оплаты, фискальный чек и явные данные
 * плательщика». Кассир, набравший 1500,50, получал предложение проверить пять
 * вещей и не узнавал, что дело в копейках. Разбирать такое в очереди у кассы
 * невозможно.
 */
function paymentValidationDetail(issues: Array<{ path: Array<string | number>; message: string }>): string {
  const named = issues
    .slice(0, 3)
    .map((issue) => {
      const field = issue.path.find((part) => typeof part === "string");
      const label = typeof field === "string" ? paymentFieldLabels[field] ?? String(field) : null;
      return label ? `${label}: ${issue.message}` : issue.message;
    })
    .filter((text) => text.trim().length > 0);
  if (named.length === 0) return paymentValidationMessage;
  const rest = issues.length - named.length;
  const tail = rest > 0 ? ` И ещё замечаний: ${rest}.` : "";
  return `Оплата не записана. ${named.join("; ")}.${tail}`;
}

function sendBillingPaymentScopeError(reply: FastifyReply, statusCode: 404 | 409, message: string) {
  return reply.code(statusCode).send({
    error: billingPaymentScopeError,
    message
  });
}

/**
 * Нарушение уникальности по ключу идемпотентности оплаты.
 *
 * PostgreSQL отдаёт код 23505 и имя ограничения. Проверяем именно имя, а не
 * любой 23505: конфликт по другому ограничению — это другая ошибка, и её
 * гасить нельзя.
 */
const paymentClientMutationConstraint = "payments_org_client_mutation_unique";

function isDuplicateClientMutationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; constraint?: unknown; message?: unknown; cause?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : null;
  const constraint = typeof candidate.constraint === "string" ? candidate.constraint : null;
  const message = typeof candidate.message === "string" ? candidate.message : "";
  if (code === "23505" && (constraint === paymentClientMutationConstraint || message.includes(paymentClientMutationConstraint))) {
    return true;
  }
  // Драйвер может обернуть исходную ошибку базы.
  if (candidate.cause) return isDuplicateClientMutationError(candidate.cause);
  return false;
}

function cleanPaymentText(value: string | null | undefined): string | null {
  const clean = value?.trim();
  return clean ? clean : null;
}

function normalizedFiscalReceipt(input: CreatePaymentInput["fiscalReceipt"]): Payment["fiscalReceipt"] {
  if (!input) return null;
  const fn = cleanPaymentText(input.fn);
  const fd = cleanPaymentText(input.fd);
  const fpd = cleanPaymentText(input.fpd);
  const cashierName = cleanPaymentText(input.cashierName);
  const receiptUrl = cleanPaymentText(input.receiptUrl);
  if (!fn && !fd && !fpd && !cashierName && !receiptUrl) return null;
  return {
    fn,
    fd,
    fpd,
    cashierName,
    receiptUrl,
    operationType: input.operationType ?? "income"
  };
}

function fiscalReceiptLabel(fiscalReceipt: Payment["fiscalReceipt"]): string | null {
  if (!fiscalReceipt) return null;
  const parts = [
    fiscalReceipt.fn ? `ФН ${fiscalReceipt.fn}` : null,
    fiscalReceipt.fd ? `ФД ${fiscalReceipt.fd}` : null,
    fiscalReceipt.fpd ? `ФПД ${fiscalReceipt.fpd}` : null
  ].filter(Boolean);
  return parts.length ? parts.join("; ") : null;
}

function paymentRetrySignatureFromInput(input: CreatePaymentInput) {
  const fiscalReceipt = normalizedFiscalReceipt(input.fiscalReceipt);
  return {
    patientId: input.patientId,
    visitId: input.visitId ?? null,
    documentId: input.documentId ?? null,
    amountRub: input.amountRub,
    method: input.method,
    fiscalReceiptNumber: cleanPaymentText(input.fiscalReceiptNumber) ?? fiscalReceiptLabel(fiscalReceipt),
    fiscalReceiptIssuedAt: cleanPaymentText(input.fiscalReceiptIssuedAt),
    fiscalReceiptUrl: cleanPaymentText(input.fiscalReceiptUrl) ?? cleanPaymentText(fiscalReceipt?.receiptUrl),
    fiscalReceipt,
    payerFullName: cleanPaymentText(input.payerFullName),
    payerInn: cleanPaymentText(input.payerInn),
    payerBirthDate: cleanPaymentText(input.payerBirthDate),
    payerIdentityDocument: cleanPaymentText(input.payerIdentityDocument),
    payerRelationship: cleanPaymentText(input.payerRelationship),
    taxDeductionCode: input.taxDeductionCode ?? null,
    note: input.note ?? null
  };
}

function paymentRetrySignatureFromPayment(payment: Payment) {
  return {
    patientId: payment.patientId,
    visitId: payment.visitId ?? null,
    documentId: payment.documentId ?? null,
    amountRub: payment.amountRub,
    method: payment.method,
    fiscalReceiptNumber: payment.fiscalReceiptNumber ?? null,
    fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt ?? null,
    fiscalReceiptUrl: payment.fiscalReceiptUrl ?? null,
    fiscalReceipt: payment.fiscalReceipt ?? null,
    payerFullName: payment.payerFullName ?? null,
    payerInn: payment.payerInn ?? null,
    payerBirthDate: payment.payerBirthDate ?? null,
    payerIdentityDocument: payment.payerIdentityDocument ?? null,
    payerRelationship: payment.payerRelationship ?? null,
    taxDeductionCode: payment.taxDeductionCode ?? null,
    note: payment.note ?? null
  };
}

function paymentRetryMatchesExisting(existingPayment: Payment, input: CreatePaymentInput): boolean {
  return JSON.stringify(paymentRetrySignatureFromPayment(existingPayment)) === JSON.stringify(paymentRetrySignatureFromInput(input));
}

export async function registerBillingRoutes(app: FastifyInstance) {
  app.post("/api/billing/payments", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "billing payment create"))) return;
    // Секрет клиники — это барьер периметра, он одинаков для чтения и записи.
    // Здесь дополнительно проверяется роль сотрудника: врач и ассистент к кассе
    // не допущены. Мягкий режим — если сотрудник не опознан, поведение прежнее
    // (см. security/permissions.ts).
    if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) return;
    const parsedInput = createPaymentSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "BillingValidationError",
        message: paymentValidationDetail(parsedInput.error.issues)
      });
    }
    // БЫЛО: getDefaultOrganizationId() — это `SELECT id FROM organizations LIMIT 1`.
    // Оплата любой клиники записывалась в ПЕРВУЮ организацию таблицы: деньги
    // попадали в чужую кассу, а у своей клиники не появлялись вовсе. Организация
    // должна приходить из подписанного токена, как во всех остальных маршрутах.
    const orgId = await requireResolvedOrganizationId(request, reply, "billing payment create");
    if (!orgId) return;
    const input: CreatePaymentInput = parsedInput.data;
    const existingPayment = await findPaymentByClientMutationIdInDb(orgId, input.clientMutationId);
    if (existingPayment && existingPayment.patientId) {
      if (existingPayment.patientId !== input.patientId) {
        return sendBillingPaymentScopeError(reply, 409, "Клиентская операция уже относится к другой оплате.");
      }
      return reply.code(200).send(paymentSchema.parse(existingPayment));
    }
    let paymentInput = input;
    const patient = await getPatientForBilling(orgId, input.patientId);
    if (!patient) {
      return sendBillingPaymentScopeError(reply, 404, "Пациент для оплаты не найден.");
    }
    if (input.visitId) {
      const visit = await getVisitForBilling(orgId, input.visitId);
      if (!visit) {
        return sendBillingPaymentScopeError(reply, 404, "Прием для оплаты не найден.");
      }
      if (visit.patientId !== input.patientId) {
        return sendBillingPaymentScopeError(reply, 409, "Прием оплаты относится к другому пациенту.");
      }
    }
    if (input.documentId) {
      const document = await getDocumentForBilling(orgId, input.documentId);
      if (!document) {
        return sendBillingPaymentScopeError(reply, 404, "Документ для оплаты не найден.");
      }
      if (document.patientId !== input.patientId) {
        return sendBillingPaymentScopeError(reply, 409, "Документ оплаты относится к другому пациенту.");
      }
      if (document.visitId && input.visitId && document.visitId !== input.visitId) {
        return sendBillingPaymentScopeError(reply, 409, "Документ оплаты относится к другому приему.");
      }
      if (document.visitId && !input.visitId) {
        const visit = await getVisitForBilling(orgId, document.visitId);
        if (!visit) {
          return sendBillingPaymentScopeError(reply, 404, "Прием документа для оплаты не найден.");
        }
        if (visit.patientId !== input.patientId) {
          return sendBillingPaymentScopeError(reply, 409, "Прием документа относится к другому пациенту.");
        }
        paymentInput = { ...input, visitId: document.visitId };
      }
      if (document.status === "voided") {
        return sendBillingPaymentScopeError(reply, 409, "К аннулированному документу нельзя привязать оплату.");
      }
      if (document.kind === "payment_refund_correction_request") {
        return sendBillingPaymentScopeError(
          reply,
          409,
          "Заявление на возврат или коррекцию не принимает новую оплату. Оформите документ коррекции без повторной записи оплаты."
        );
      }
      if (!documentCanReceivePayment(document.kind as any)) {
        return sendBillingPaymentScopeError(
          reply,
          409,
          "Выберите финансовый документ для оплаты: договор, счет, акт, квитанцию, смету или рассрочку."
        );
      }
    }
    if (existingPayment) {
      if (existingPayment.patientId !== paymentInput.patientId || !paymentRetryMatchesExisting(existingPayment, paymentInput)) {
        return sendBillingPaymentScopeError(
          reply,
          409,
          "Клиентская операция уже записала другую оплату. Повтор должен совпадать по сумме, счету, чеку, плательщику и коду вычета."
        );
      }
      return reply.code(200).send(paymentSchema.parse(existingPayment));
    }
    try {
      const payment = await createPaymentInDb(orgId, paymentInput);
      return reply.code(201).send(paymentSchema.parse(payment));
    } catch (error) {
      /* Проверка «нет ли уже такой оплаты» выше и вставка здесь — два
         отдельных запроса вне транзакции. При двойном нажатии на «Принять
         оплату» оба запроса видят, что платежа нет, и оба вставляют.
         Деньги при этом в безопасности: в базе есть уникальный индекс
         payments_org_client_mutation_unique, второй INSERT падает.
         Но кассир видел HTTP 500 «Сервер не выполнил действие. Повторите
         позже» при том, что оплата уже прошла. Замерено на живом API,
         scratch/verify-payment-idempotency.mjs: два одновременных запроса
         давали 201/500 при одном платеже в базе.
         Нарушение уникальности по ключу идемпотентности означает ровно то
         же, что и удачная проверка выше: оплата уже записана. Возвращаем
         записанную. */
      if (isDuplicateClientMutationError(error)) {
        const alreadyStored = await findPaymentByClientMutationIdInDb(orgId, paymentInput.clientMutationId);
        if (alreadyStored) {
          if (
            alreadyStored.patientId !== paymentInput.patientId ||
            !paymentRetryMatchesExisting(alreadyStored, paymentInput)
          ) {
            return sendBillingPaymentScopeError(
              reply,
              409,
              "Клиентская операция уже записала другую оплату. Повтор должен совпадать по сумме, счету, чеку, плательщику и коду вычета."
            );
          }
          return reply.code(200).send(paymentSchema.parse(alreadyStored));
        }
      }
      throw error;
    }
  });
}
