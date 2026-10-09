import { createHash } from "node:crypto";
import type {
	ClinicProfile,
	GeneratedDocument,
	Patient,
	Payment,
	TaxPaymentSnapshot,
	TaxXmlSourceSnapshot,
} from "@dental/shared";
import { getDocumentsByPatientId } from "../../../db/documentQuery.js";
import {
	paymentIdsForTaxDocument,
	receiptKeysForTaxDocument,
	taxDocumentDuplicateSensitive,
	taxPaymentSnapshotTotalRub,
	taxPaymentsForDocumentScope,
} from "../../../documents/taxPaymentSnapshot.js";
import {
	normalizeTaxApplicationRelationship,
	normalizedDocumentChainValue,
	type TaxCertificateAnnualTaxpayerScope,
} from "./types.js";

export function normalizedTaxpayerInn(
	value: string | null | undefined,
): string {
	return (value ?? "").replace(/\D+/g, "");
}

function paymentAnnualTaxpayerScope(
	payment: Payment,
): TaxCertificateAnnualTaxpayerScope {
	const relationship =
		normalizeTaxApplicationRelationship(payment.payerRelationship) ??
		normalizedDocumentChainValue(payment.payerRelationship);
	return {
		inn: normalizedTaxpayerInn(payment.payerInn),
		identityKey: [
			normalizedDocumentChainValue(payment.payerFullName),
			normalizedDocumentChainValue(payment.payerBirthDate),
			normalizedDocumentChainValue(payment.payerIdentityDocument),
			relationship,
		].join("|"),
	};
}

function annualTaxpayerScopesForDocument(
	document: GeneratedDocument,
): TaxCertificateAnnualTaxpayerScope[] {
	const scopes = new Map<string, TaxCertificateAnnualTaxpayerScope>();
	const addScope = (scope: TaxCertificateAnnualTaxpayerScope) => {
		const key = scope.inn
			? `inn:${scope.inn}`
			: `identity:${scope.identityKey}`;
		if (scope.inn || scope.identityKey.replace(/\|/g, ""))
			scopes.set(key, scope);
	};

	for (const payment of taxPaymentsForDocumentScope(document, [])) {
		addScope(paymentAnnualTaxpayerScope(payment));
	}

	const documentInn =
		normalizedTaxpayerInn(document.taxPayerInn) ||
		normalizedTaxpayerInn(document.taxPaymentSnapshot?.taxPayerInn);
	if (documentInn) {
		addScope({ inn: documentInn, identityKey: "" });
	}

	return [...scopes.values()];
}

function annualTaxpayerScopesOverlap(
	left: readonly TaxCertificateAnnualTaxpayerScope[],
	right: readonly TaxCertificateAnnualTaxpayerScope[],
): boolean {
	for (const leftScope of left) {
		for (const rightScope of right) {
			if (leftScope.inn && rightScope.inn && leftScope.inn === rightScope.inn)
				return true;
			if (
				leftScope.identityKey &&
				rightScope.identityKey &&
				leftScope.identityKey === rightScope.identityKey
			)
				return true;
		}
	}
	return false;
}

export async function findIssuedDuplicateTaxCertificate(
	document: GeneratedDocument,
	_payments: import("@dental/shared").Payment[],
): Promise<GeneratedDocument | null> {
	const allDocuments = await getDocumentsByPatientId(
		document.organizationId,
		document.patientId,
	);
	if (!taxDocumentDuplicateSensitive(document.kind) || !document.taxYear)
		return null;
	const targetAnnualScopes = annualTaxpayerScopesForDocument(document);
	const targetReceiptKeys = receiptKeysForTaxDocument(document, []);
	const targetPaymentIds = paymentIdsForTaxDocument(document, []);
	if (
		!targetAnnualScopes.length &&
		!targetReceiptKeys.size &&
		!targetPaymentIds.size
	)
		return null;

	for (const candidate of allDocuments) {
		if (candidate.patientId !== document.patientId) continue;
		if (candidate.taxYear !== document.taxYear) continue;
		if (candidate.status !== "issued") continue;
		if (candidate.kind !== document.kind) continue;
		if (candidate.organizationId !== document.organizationId) continue;
		if (candidate.id === document.id) continue;

		const candidateAnnualScopes = annualTaxpayerScopesForDocument(candidate);
		if (annualTaxpayerScopesOverlap(targetAnnualScopes, candidateAnnualScopes))
			return candidate;

		const candidateReceiptKeys = receiptKeysForTaxDocument(candidate, []);
		let hasReceiptKey = false;
		for (const key of candidateReceiptKeys) {
			if (targetReceiptKeys.has(key)) {
				hasReceiptKey = true;
				break;
			}
		}
		if (hasReceiptKey) return candidate;

		const candidatePaymentIds = paymentIdsForTaxDocument(candidate, []);
		let hasPaymentId = false;
		for (const id of candidatePaymentIds) {
			if (targetPaymentIds.has(id)) {
				hasPaymentId = true;
				break;
			}
		}
		if (hasPaymentId) return candidate;
	}

	return null;
}

export function taxSnapshotDocument(
	document: GeneratedDocument,
	snapshot: TaxPaymentSnapshot | null,
): GeneratedDocument {
	if (!snapshot) return document;
	return {
		...document,
		totalAmountRub: taxPaymentSnapshotTotalRub(snapshot),
		taxPaymentSnapshot: snapshot,
	};
}

function cloneSnapshotValue<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function taxXmlSourceSnapshotSha256(
	snapshot: TaxXmlSourceSnapshot | null | undefined,
): string | null {
	if (!snapshot) return null;
	return createHash("sha256")
		.update(JSON.stringify(snapshot), "utf8")
		.digest("hex");
}

export function taxXmlSourceSnapshotForIssue(
	document: GeneratedDocument,
	patient: Patient,
	snapshot: TaxPaymentSnapshot | null,
	issuedAt: string,
	clinicProfile?: ClinicProfile | null,
): TaxXmlSourceSnapshot | null {
	if (document.kind !== "tax_deduction_certificate" || !snapshot) return null;
	const profile: ClinicProfile = clinicProfile
		? cloneSnapshotValue(clinicProfile)
		: {
				organizationId: document.organizationId,
				clinicName: "Клиника DENTE",
				legalName: null,
				inn: null,
				kpp: null,
				ogrn: null,
				address: null,
				phone: null,
				email: null,
				website: null,
				timezone: "Europe/Moscow",
				medicalLicenseNumber: null,
				medicalLicenseIssuedAt: null,
				mode: "small_clinic",
				defaultVisitMinutes: 30,
				scheduleDefaults: {
					workdayStart: "09:00",
					workdayEnd: "18:00",
					workingDays: [1, 2, 3, 4, 5, 6, 7],
					appointmentBufferMinutes: 0,
				},
				networkEnabled: false,
				egiszEnabled: false,
				updatedAt: new Date().toISOString(),
			};
	return {
		createdAt: issuedAt,
		patient: cloneSnapshotValue(patient),
		clinicProfile: profile,
		payments: snapshot.payments.map((payment) => cloneSnapshotValue(payment)),
	};
}

export function frozenTaxXmlPatient(
	document: GeneratedDocument,
	fallbackPatient: Patient,
): Patient {
	return document.taxXmlSourceSnapshot?.patient ?? fallbackPatient;
}

export function frozenTaxXmlClinicProfile(
	document: GeneratedDocument,
	fallbackClinicProfile: ClinicProfile,
): ClinicProfile {
	return document.taxXmlSourceSnapshot?.clinicProfile ?? fallbackClinicProfile;
}

export function frozenTaxXmlPayments(
	document: GeneratedDocument,
	fallbackPayments: Payment[],
): Payment[] {
	return document.taxXmlSourceSnapshot?.payments ?? fallbackPayments;
}

export function configuredTaxOfficeCode(): string | null {
	return (
		process.env.DENTE_FNS_TAX_OFFICE_CODE?.trim() ||
		process.env.FNS_TAX_OFFICE_CODE?.trim() ||
		null
	);
}
