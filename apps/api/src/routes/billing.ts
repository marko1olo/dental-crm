import type { FastifyInstance, FastifyReply } from "fastify";
import { createPaymentSchema, documentKindMetadata, paymentSchema, type CreatePaymentInput, type Payment } from "@dental/shared";
import { createPayment, documents, findPaymentByClientMutationId, findVisitById, patients } from "../sampleData.js";
import { requireClinicalMutationAccess } from "../accessGuard.js";

function documentCanReceivePayment(documentKind: keyof typeof documentKindMetadata): boolean {
  const metadata = documentKindMetadata[documentKind];
  return metadata.group === "payment" && documentKind !== "payment_refund_correction_request";
}

const paymentValidationMessage =
  "Оплата не записана: проверьте сумму, дату, способ оплаты, фискальный чек и явные данные плательщика.";
const billingPaymentScopeError = "BillingPaymentScopeError" as const;

function sendBillingPaymentScopeError(reply: FastifyReply, statusCode: 404 | 409, message: string) {
  return reply.code(statusCode).send({
    error: billingPaymentScopeError,
    message
  });
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
    const parsedInput = createPaymentSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "BillingValidationError",
        message: paymentValidationMessage
      });
    }
    const input: CreatePaymentInput = parsedInput.data;
    const existingPayment = findPaymentByClientMutationId(input.clientMutationId);
    if (existingPayment && existingPayment.patientId) {
      if (existingPayment.patientId !== input.patientId) {
        return sendBillingPaymentScopeError(reply, 409, "Клиентская операция уже относится к другой оплате.");
      }
      return reply.code(200).send(paymentSchema.parse(existingPayment));
    }
    let paymentInput = input;
    const patient = patients.find((candidate) => candidate.id === input.patientId);
    if (!patient) {
      return sendBillingPaymentScopeError(reply, 404, "Пациент для оплаты не найден.");
    }
    if (input.visitId) {
      const visit = findVisitById(input.visitId);
      if (!visit) {
        return sendBillingPaymentScopeError(reply, 404, "Прием для оплаты не найден.");
      }
      if (visit.patientId !== input.patientId) {
        return sendBillingPaymentScopeError(reply, 409, "Прием оплаты относится к другому пациенту.");
      }
    }
    if (input.documentId) {
      const document = documents.find((candidate) => candidate.id === input.documentId);
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
        const visit = findVisitById(document.visitId);
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
      if (!documentCanReceivePayment(document.kind)) {
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
    const payment = createPayment(paymentInput);
    return reply.code(201).send(paymentSchema.parse(payment));
  });
}
