import type { Payment } from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { narrowTaxDeductionCode } from "./types.js";

export async function getDefaultOrganizationId(): Promise<string | null> {
	const [org] = await db.select().from(schema.organizations).limit(1);
	return org?.id || null;
}

export async function findPaymentByClientMutationIdInDb(
	organizationId: string,
	clientMutationId: string | null | undefined,
): Promise<Payment | null> {
	if (!clientMutationId) return null;
	const matchedPayments = await db
		.select()
		.from(schema.payments)
		.where(
			and(
				eq(schema.payments.organizationId, organizationId),
				or(
					eq(schema.payments.clientMutationId, clientMutationId),
					eq(schema.payments.clientMutationId, `${clientMutationId}:cash`),
					eq(schema.payments.clientMutationId, `${clientMutationId}:electronic`),
					eq(schema.payments.clientMutationId, `${clientMutationId}:deposit`),
					eq(schema.payments.clientMutationId, `${clientMutationId}:dms`),
				),
			),
		);
	if (matchedPayments.length === 0) return null;
	const payment = matchedPayments[0];
	if (!payment) return null;
	const isSplitMatch = matchedPayments.length > 1 || (payment.clientMutationId?.includes(":") ?? false);
	const totalAmountRub = isSplitMatch
		? matchedPayments.reduce((acc, p) => acc + Number(p.amountRub), 0)
		: payment.amountRub;
	return {
		id: payment.id,
		organizationId: payment.organizationId,
		patientId: payment.patientId,
		visitId: payment.visitId,
		documentId: payment.documentId,
		amountRub: totalAmountRub,
		method: payment.method,
		clientMutationId,
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
		status: payment.status,
	};
}

export async function getPatientForBilling(
	organizationId: string,
	patientId: string,
) {
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

export async function getPaymentsByPatientIdInDb(
	organizationId: string,
	patientId: string,
): Promise<Payment[]> {
	const res = await db
		.select()
		.from(schema.payments)
		.where(
			and(
				eq(schema.payments.organizationId, organizationId),
				eq(schema.payments.patientId, patientId),
			),
		);
	return res.map(
		(p): Payment => ({
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
		}),
	);
}
