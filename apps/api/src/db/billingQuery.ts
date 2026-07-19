import type { CreatePaymentInput, Payment } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";

function useSampleBillingState(): boolean {
	return (
		process.env.NODE_ENV !== "production" &&
		process.env.DENTAL_STATE_PERSISTENCE === "off"
	);
}

// PostgreSQL / PGlite unique-constraint violation SQLSTATE.
const PG_UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === PG_UNIQUE_VIOLATION
	);
}

export async function getDefaultOrganizationId(): Promise<string | null> {
	const [org] = await db.select().from(schema.organizations).limit(1);
	return org?.id || null;
}

export async function findPaymentByClientMutationIdInDb(
	organizationId: string,
	clientMutationId: string | null | undefined,
): Promise<Payment | null> {
	if (!clientMutationId) return null;
	if (useSampleBillingState()) {
		const { findPaymentByClientMutationId } = await import("../sampleData.js");
		const payment = findPaymentByClientMutationId(clientMutationId);
		return payment?.organizationId === organizationId ? payment : null;
	}
	const [payment] = await db
		.select()
		.from(schema.payments)
		.where(
			and(
				eq(schema.payments.organizationId, organizationId),
				eq(schema.payments.clientMutationId, clientMutationId),
			),
		)
		.limit(1);
	if (!payment) return null;
	return {
		id: payment.id,
		organizationId: payment.organizationId,
		patientId: payment.patientId,
		visitId: payment.visitId,
		documentId: payment.documentId,
		amountRub: payment.amountRub,
		method: payment.method as any,
		clientMutationId: payment.clientMutationId,
		fiscalReceiptNumber: payment.fiscalReceiptNumber,
		fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt,
		fiscalReceiptUrl: payment.fiscalReceiptUrl,
		fiscalReceipt: payment.fiscalReceipt as any,
		payerFullName: payment.payerFullName,
		payerInn: payment.payerInn,
		payerBirthDate: payment.payerBirthDate,
		payerIdentityDocument: payment.payerIdentityDocument,
		payerRelationship: payment.payerRelationship,
		taxDeductionCode: payment.taxDeductionCode as any,
		note: payment.note,
		createdAt: payment.createdAt.toISOString(),
		paidAt: payment.paidAt.toISOString(),
		status: payment.status as any,
	};
}

export async function getPatientForBilling(
	organizationId: string,
	patientId: string,
) {
	if (useSampleBillingState()) {
		const { patients } = await import("../sampleData.js");
		return (
			patients.find(
				(patient) =>
					patient.organizationId === organizationId && patient.id === patientId,
			) ?? null
		);
	}
	const [patient] = await db
		.select()
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, patientId),
			),
		)
		.limit(1);
	return patient || null;
}

export async function getVisitForBilling(
	organizationId: string,
	visitId: string,
) {
	if (useSampleBillingState()) {
		const { findVisitById } = await import("../sampleData.js");
		const visit = findVisitById(visitId);
		return visit?.organizationId === organizationId ? visit : null;
	}
	const [visit] = await db
		.select()
		.from(schema.visits)
		.where(
			and(
				eq(schema.visits.organizationId, organizationId),
				eq(schema.visits.id, visitId),
			),
		)
		.limit(1);
	return visit || null;
}

export async function getDocumentForBilling(
	organizationId: string,
	documentId: string,
) {
	if (useSampleBillingState()) {
		const { documents } = await import("../sampleData.js");
		return (
			documents.find(
				(document) =>
					document.organizationId === organizationId &&
					document.id === documentId,
			) ?? null
		);
	}
	const [doc] = await db
		.select()
		.from(schema.generatedDocuments)
		.where(
			and(
				eq(schema.generatedDocuments.organizationId, organizationId),
				eq(schema.generatedDocuments.id, documentId),
			),
		)
		.limit(1);
	return doc || null;
}

export async function createPaymentInDb(
	organizationId: string,
	input: CreatePaymentInput,
): Promise<Payment> {
	if (useSampleBillingState()) {
		const { createPayment } = await import("../sampleData.js");
		const payment = createPayment(input);
		return { ...payment, organizationId };
	}
	let newPayment: typeof schema.payments.$inferSelect | undefined;
	try {
		[newPayment] = await db
			.insert(schema.payments)
			.values({
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
				status: "paid",
			})
			.returning();
	} catch (error) {
		// Concurrent request with the same clientMutationId won the race and the
		// (organization_id, client_mutation_id) unique index rejected this insert.
		// Resolve idempotently by returning the row the winner already committed
		// instead of surfacing a 500 (double-billing guard, see BILLING_AND_FINANCE.md).
		if (isUniqueViolation(error) && input.clientMutationId) {
			const existing = await findPaymentByClientMutationIdInDb(
				organizationId,
				input.clientMutationId,
			);
			if (existing) return existing;
		}
		throw error;
	}

	if (!newPayment) {
		throw new Error("Failed to create payment");
	}

	if (newPayment.visitId) {
		await recalculateInvoiceStatusForVisit(organizationId, newPayment.visitId);
	}

	return {
		id: newPayment.id,
		organizationId: newPayment.organizationId,
		patientId: newPayment.patientId,
		visitId: newPayment.visitId,
		documentId: newPayment.documentId,
		amountRub: newPayment.amountRub,
		method: newPayment.method as any,
		clientMutationId: newPayment.clientMutationId,
		fiscalReceiptNumber: newPayment.fiscalReceiptNumber,
		fiscalReceiptIssuedAt: newPayment.fiscalReceiptIssuedAt,
		fiscalReceiptUrl: newPayment.fiscalReceiptUrl,
		fiscalReceipt: newPayment.fiscalReceipt as any,
		payerFullName: newPayment.payerFullName,
		payerInn: newPayment.payerInn,
		payerBirthDate: newPayment.payerBirthDate,
		payerIdentityDocument: newPayment.payerIdentityDocument,
		payerRelationship: newPayment.payerRelationship,
		taxDeductionCode: newPayment.taxDeductionCode as any,
		note: newPayment.note,
		createdAt: newPayment.createdAt.toISOString(),
		paidAt: newPayment.paidAt.toISOString(),
		status: newPayment.status as any,
	};
}

export async function getPaymentsByPatientIdInDb(
	organizationId: string,
	patientId: string,
): Promise<import("@dental/shared").Payment[]> {
	const res = await db
		.select()
		.from(schema.payments)
		.where(
			and(
				eq(schema.payments.organizationId, organizationId),
				eq(schema.payments.patientId, patientId),
			),
		);
	return res.map((p) => ({
		...p,
		createdAt: p.createdAt.toISOString(),
		updatedAt: p.updatedAt.toISOString(),
	})) as any;
}

export async function recalculateInvoiceStatusForVisit(organizationId: string, visitId: string) {
	// 1. Get total payments for this visit
	const paymentsList = await db
		.select()
		.from(schema.payments)
		.where(
			and(
				eq(schema.payments.organizationId, organizationId),
				eq(schema.payments.visitId, visitId),
				eq(schema.payments.status, "paid")
			)
		);
		
	const totalPaidRub = paymentsList.reduce((acc, p) => acc + Number(p.amountRub), 0);

	// 2. Get the invoice for this visit
	const [invoice] = await db
		.select()
		.from(schema.patientInvoices)
		.where(
			and(
				eq(schema.patientInvoices.organizationId, organizationId),
				eq(schema.patientInvoices.visitId, visitId)
			)
		)
		.limit(1);

	if (!invoice) return;

	// 3. Determine status
	const totalInvoiceRub = Number(invoice.totalAmountRub);
	let newStatus = "unpaid";
	if (totalPaidRub >= totalInvoiceRub && totalInvoiceRub > 0) {
		newStatus = "paid";
	} else if (totalPaidRub > 0) {
		newStatus = "partial";
	}

	if (invoice.status !== newStatus) {
		await db
			.update(schema.patientInvoices)
			.set({ status: newStatus as any, updatedAt: new Date() })
			.where(eq(schema.patientInvoices.id, invoice.id));
	}
}
