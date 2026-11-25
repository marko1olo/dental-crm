import {
	type CommunicationEvent,
	type CommunicationTask,
	communicationEventSchema,
	communicationTaskSchema,
	type GeneratedDocument,
	generatedDocumentSchema,
	documentPayloadSchema,
	kopecksToRubles,
	parseKopecks,
	type Patient,
	patientSchema,
	type Payment,
	paymentSchema,
	staffRoleSchema,
} from "@dental/shared";
import * as schema from "../../schema.js";
import type { DomainStateHydrationReport } from "../types.js";
import {
	collect,
	iso,
	isoOrSkipRow,
	parseJsonObject,
} from "./sliceExtractorsTypes.js";

export function extractPatients(
	patientRows: Array<typeof schema.patients.$inferSelect>,
	paymentRows: Array<typeof schema.payments.$inferSelect>,
	treatmentItemRows: Array<typeof schema.treatmentItems.$inferSelect>,
	report: DomainStateHydrationReport,
): Patient[] {
	const paidByPatientKop = new Map<string, number>();
	for (const payment of paymentRows) {
		if (payment.status !== "paid") continue;
		const paidKop =
			payment.amountKopecks != null && payment.amountKopecks !== 0n
				? Number(payment.amountKopecks)
				: parseKopecks(payment.amountRub);
		paidByPatientKop.set(
			payment.patientId,
			(paidByPatientKop.get(payment.patientId) ?? 0) + paidKop,
		);
	}
	const plannedByPatientKop = new Map<string, number>();
	for (const item of treatmentItemRows) {
		if (item.status === "cancelled") continue;
		const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
		const unitPriceKop =
			item.unitPriceKopecks != null && item.unitPriceKopecks !== 0n
				? Number(item.unitPriceKopecks)
				: parseKopecks(item.unitPriceRub);
		const discountKop =
			item.discountKopecks != null && item.discountKopecks !== 0n
				? Number(item.discountKopecks)
				: parseKopecks(item.discountRub);
		const lineTotalKop = Math.max(0, unitPriceKop * quantity - discountKop);
		plannedByPatientKop.set(
			item.patientId,
			(plannedByPatientKop.get(item.patientId) ?? 0) + lineTotalKop,
		);
	}
	return collect<Patient>(
		patientRows.map((patient) => ({
			id: patient.id,
			organizationId: patient.organizationId,
			status: patient.status,
			fullName: patient.fullName,
			birthDate: patient.birthDate ?? null,
			phone: patient.phone ?? null,
			email: patient.email ?? null,
			notes: patient.notes ?? null,
			administrativeProfile: patient.administrativeProfile ?? null,
			familyGroupId: patient.familyGroupId ?? null,
			mergedIntoPatientId: patient.mergedIntoPatientId ?? null,
			balanceRub: kopecksToRubles(
				(paidByPatientKop.get(patient.id) ?? 0) -
					(plannedByPatientKop.get(patient.id) ?? 0),
			),
			createdAt: isoOrSkipRow(
				patient.createdAt,
				"patients",
				patient.id,
				"created_at",
				report,
			),
			updatedAt: isoOrSkipRow(
				patient.updatedAt,
				"patients",
				patient.id,
				"updated_at",
				report,
			),
		})),
		patientSchema,
		"patients",
		report,
	);
}

export function extractPayments(
	paymentRows: Array<typeof schema.payments.$inferSelect>,
	report: DomainStateHydrationReport,
): Payment[] {
	return collect<Payment>(
		paymentRows.map((payment) => ({
			id: payment.id,
			organizationId: payment.organizationId,
			patientId: payment.patientId,
			visitId: payment.visitId ?? null,
			documentId: payment.documentId ?? null,
			amountRub:
				payment.amountKopecks != null && payment.amountKopecks !== 0n
					? kopecksToRubles(Number(payment.amountKopecks))
					: payment.amountRub,
			method: payment.method,
			status: payment.status,
			paidAt: iso(payment.paidAt),
			createdAt: isoOrSkipRow(
				payment.createdAt,
				"payments",
				payment.id,
				"created_at",
				report,
			),
			fiscalReceiptNumber: payment.fiscalReceiptNumber ?? null,
			fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt ?? null,
			fiscalReceiptUrl: payment.fiscalReceiptUrl ?? null,
			fiscalReceipt: payment.fiscalReceipt ?? null,
			clientMutationId: payment.clientMutationId ?? null,
			payerFullName: payment.payerFullName ?? null,
			payerInn: payment.payerInn ?? null,
			payerBirthDate: payment.payerBirthDate ?? null,
			payerIdentityDocument: payment.payerIdentityDocument ?? null,
			payerRelationship: payment.payerRelationship ?? null,
			taxDeductionCode:
				payment.taxDeductionCode === "1" || payment.taxDeductionCode === "2"
					? payment.taxDeductionCode
					: null,
			note: payment.note ?? null,
		})),
		paymentSchema,
		"payments",
		report,
	);
}

export function extractDocuments(
	documentRows: Array<typeof schema.generatedDocuments.$inferSelect>,
	report: DomainStateHydrationReport,
): GeneratedDocument[] {
	return collect<GeneratedDocument>(
		documentRows.map((document) => ({
			id: document.id,
			organizationId: document.organizationId,
			patientId: document.patientId,
			visitId: document.visitId ?? null,
			kind: document.kind,
			title: document.title,
			status: document.status,
			issuedAt: iso(document.issuedAt),
			totalAmountRub: document.totalAmountRub ?? null,
			taxYear: document.taxYear ?? null,
			taxPayerInn: document.taxPayerInn ?? null,
			taxPaymentSnapshot: parseJsonObject(
				document.taxPaymentSnapshotJson,
				null,
			),
			payload: (() => {
				const raw = parseJsonObject(document.payloadJson, null);
				if (!raw) return null;
				const check = documentPayloadSchema.safeParse(raw);
				return check.success ? check.data : null;
			})(),
			signatureAttestation: document.signatureAttestation ?? null,
			voidAttestation: document.voidAttestation ?? null,
			releaseJournalEntry: document.releaseJournalEntry ?? null,
			taxXmlSourceSnapshot: document.taxXmlSourceSnapshot ?? null,
			taxXmlSnapshot: document.taxXmlSnapshot ?? null,
			storagePath: document.storagePath ?? null,
			issuedSnapshotSha256: document.issuedSnapshotSha256 ?? null,
			issuedSnapshotCreatedAt: iso(document.issuedSnapshotCreatedAt),
			issuedByUserId: document.issuedByUserId ?? null,
			voidedAt: iso(document.voidedAt),
			voidedByUserId: document.voidedByUserId ?? null,
			cryptoSignaturePkcs7: document.cryptoSignaturePkcs7 ?? null,
			doctorSignaturePkcs7: document.doctorSignaturePkcs7 ?? null,
			doctorCertSerial: document.doctorCertSerial ?? null,
			doctorCertSubject: document.doctorCertSubject ?? null,
			doctorSignedAt: iso(document.doctorSignedAt),
		})),
		generatedDocumentSchema,
		"documents",
		report,
	);
}

export function extractCommunicationTasks(
	taskRows: Array<typeof schema.communicationTasks.$inferSelect>,
	report: DomainStateHydrationReport,
): CommunicationTask[] {
	return collect<CommunicationTask>(
		taskRows.map((task) => ({
			id: task.id,
			organizationId: task.organizationId,
			patientId: task.patientId,
			appointmentId: task.appointmentId ?? null,
			visitId: task.visitId ?? null,
			documentId: task.documentId ?? null,
			assignedRole: staffRoleSchema
				.catch("administrator")
				.parse(task.assignedRole),
			channel: task.channel,
			intent: task.intent,
			status: task.status,
			priority: task.priority,
			dueAt: isoOrSkipRow(
				task.dueAt,
				"communication_tasks",
				task.id,
				"due_at",
				report,
			),
			title: task.title,
			body: task.body,
			workflowCode: task.workflowCode ?? null,
			lastEventAt: iso(task.lastEventAt),
			createdAt: isoOrSkipRow(
				task.createdAt,
				"communication_tasks",
				task.id,
				"created_at",
				report,
			),
		})),
		communicationTaskSchema,
		"communicationTasks",
		report,
	);
}

export function extractCommunicationEvents(
	eventRows: Array<typeof schema.communicationEvents.$inferSelect>,
	report: DomainStateHydrationReport,
): CommunicationEvent[] {
	return collect<CommunicationEvent>(
		eventRows.map((event) => ({
			id: event.id,
			organizationId: event.organizationId,
			taskId: event.taskId ?? null,
			patientId: event.patientId,
			actorUserId: event.actorUserId ?? null,
			channel: event.channel,
			direction: event.direction,
			status: event.status,
			message: event.message,
			createdAt: isoOrSkipRow(
				event.createdAt,
				"communication_events",
				event.id,
				"created_at",
				report,
			),
		})),
		communicationEventSchema,
		"communicationEvents",
		report,
	);
}
