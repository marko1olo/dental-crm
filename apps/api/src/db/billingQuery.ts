import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
import type { CreatePaymentInput, Payment } from "@dental/shared";

// The DB stores tax_deduction_code as free `text`, but the Payment DTO narrows it
// to the fiscal codes "1" | "2" | null. Validate at the read boundary instead of
// asserting with `as any`: any legacy/invalid value collapses to null rather than
// silently violating the contract.
function narrowTaxDeductionCode(value: string | null): "1" | "2" | null {
  return value === "1" || value === "2" ? value : null;
}

export async function getDefaultOrganizationId(): Promise<string | null> {
  const [org] = await db.select().from(schema.organizations).limit(1);
  return org?.id || null;
}

export async function findPaymentByClientMutationIdInDb(organizationId: string, clientMutationId: string | null | undefined): Promise<Payment | null> {
  if (!clientMutationId) return null;
  const [payment] = await db.select().from(schema.payments).where(and(eq(schema.payments.organizationId, organizationId), eq(schema.payments.clientMutationId, clientMutationId))).limit(1);
  if (!payment) return null;
  return {
    id: payment.id,
    organizationId: payment.organizationId,
    patientId: payment.patientId,
    visitId: payment.visitId,
    documentId: payment.documentId,
    amountRub: payment.amountRub,
    method: payment.method,
    clientMutationId: payment.clientMutationId,
    fiscalReceiptNumber: payment.fiscalReceiptNumber,
    fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt,
    fiscalReceiptUrl: payment.fiscalReceiptUrl,
    fiscalReceipt: payment.fiscalReceipt,
    payerFullName: payment.payerFullName,
    payerInn: payment.payerInn,
    payerBirthDate: payment.payerBirthDate,
    payerIdentityDocument: payment.payerIdentityDocument,
    payerRelationship: payment.payerRelationship,
    taxDeductionCode: narrowTaxDeductionCode(payment.taxDeductionCode),
    note: payment.note,
    createdAt: payment.createdAt.toISOString(),
    paidAt: payment.paidAt.toISOString(),
    status: payment.status
  };
}

export async function getPatientForBilling(organizationId: string, patientId: string) {
  const [patient] = await db.select().from(schema.patients).where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, patientId))).limit(1);
  return patient || null;
}

export async function getVisitForBilling(organizationId: string, visitId: string) {
  const [visit] = await db.select().from(schema.visits).where(and(eq(schema.visits.organizationId, organizationId), eq(schema.visits.id, visitId))).limit(1);
  return visit || null;
}

export async function getDocumentForBilling(organizationId: string, documentId: string) {
  const [doc] = await db.select().from(schema.generatedDocuments).where(and(eq(schema.generatedDocuments.organizationId, organizationId), eq(schema.generatedDocuments.id, documentId))).limit(1);
  return doc || null;
}

export async function createPaymentInDb(organizationId: string, input: CreatePaymentInput): Promise<Payment> {
  return await db.transaction(async (tx) => {
    // Pessimistic lock on the target patient to prevent concurrent balance race conditions
    const [lockedPatient] = await tx
      .select({ id: schema.patients.id })
      .from(schema.patients)
      .where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, input.patientId)))
      .for("update")
      .limit(1);

    if (!lockedPatient) {
      throw new Error(`Patient ${input.patientId} not found or locked by another transaction.`);
    }

    const [newPayment] = await tx.insert(schema.payments).values({
      organizationId,
      patientId: input.patientId,
      visitId: input.visitId || null,
      documentId: input.documentId || null,
      amountRub: input.amountRub,
      method: input.method,
      fiscalReceiptNumber: input.fiscalReceiptNumber || null,
      fiscalReceiptIssuedAt: input.fiscalReceiptIssuedAt || null,
      fiscalReceiptUrl: input.fiscalReceiptUrl || null,
      fiscalReceipt: input.fiscalReceipt || null,
      clientMutationId: input.clientMutationId || null,
      payerFullName: input.payerFullName || null,
      payerInn: input.payerInn || null,
      payerBirthDate: input.payerBirthDate || null,
      payerIdentityDocument: input.payerIdentityDocument || null,
      payerRelationship: input.payerRelationship || null,
      taxDeductionCode: input.taxDeductionCode || null,
      note: input.note || null,
      status: "paid"
    }).returning();

    if (!newPayment) {
      throw new Error("Failed to create payment");
    }

    return {
      id: newPayment.id,
      organizationId: newPayment.organizationId,
      patientId: newPayment.patientId,
      visitId: newPayment.visitId,
      documentId: newPayment.documentId,
      amountRub: newPayment.amountRub,
      method: newPayment.method,
      clientMutationId: newPayment.clientMutationId,
      fiscalReceiptNumber: newPayment.fiscalReceiptNumber,
      fiscalReceiptIssuedAt: newPayment.fiscalReceiptIssuedAt,
      fiscalReceiptUrl: newPayment.fiscalReceiptUrl,
      fiscalReceipt: newPayment.fiscalReceipt,
      payerFullName: newPayment.payerFullName,
      payerInn: newPayment.payerInn,
      payerBirthDate: newPayment.payerBirthDate,
      payerIdentityDocument: newPayment.payerIdentityDocument,
      payerRelationship: newPayment.payerRelationship,
      taxDeductionCode: narrowTaxDeductionCode(newPayment.taxDeductionCode),
      note: newPayment.note,
      createdAt: newPayment.createdAt.toISOString(),
      paidAt: newPayment.paidAt.toISOString(),
      status: newPayment.status
    };
  });
}

export async function getPaymentsByPatientIdInDb(organizationId: string, patientId: string): Promise<Payment[]> {
  const res = await db.select().from(schema.payments).where(and(eq(schema.payments.organizationId, organizationId), eq(schema.payments.patientId, patientId)));
  return res.map((p): Payment => ({
    id: p.id,
    organizationId: p.organizationId,
    patientId: p.patientId,
    visitId: p.visitId,
    documentId: p.documentId,
    amountRub: p.amountRub,
    method: p.method,
    clientMutationId: p.clientMutationId,
    fiscalReceiptNumber: p.fiscalReceiptNumber,
    fiscalReceiptIssuedAt: p.fiscalReceiptIssuedAt,
    fiscalReceiptUrl: p.fiscalReceiptUrl,
    fiscalReceipt: p.fiscalReceipt,
    payerFullName: p.payerFullName,
    payerInn: p.payerInn,
    payerBirthDate: p.payerBirthDate,
    payerIdentityDocument: p.payerIdentityDocument,
    payerRelationship: p.payerRelationship,
    taxDeductionCode: narrowTaxDeductionCode(p.taxDeductionCode),
    note: p.note,
    createdAt: p.createdAt.toISOString(),
    paidAt: p.paidAt.toISOString(),
    status: p.status,
  }));
}
