import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { TaxPaymentRecord } from "../taxCertificateEngine";

export async function fetchTaxReceiptsPreview(patientId: string, year: number): Promise<TaxPaymentRecord[]> {
	const res = await fetch(`/api/documents/tax-deduction/preview/${encodeURIComponent(patientId)}?year=${year}`, {
		headers: denteAdminSecretRequestHeaders(),
	});
	if (!res.ok) throw new Error("Failed to load tax preview");
	const data = (await res.json()) as {
		receipts?: Array<{
			id: string;
			receiptNumber: string;
			fiscalDocumentNumber?: string | null;
			receiptDate: string;
			serviceName: string;
			deductionCode: "1" | "2";
			amountRub: number;
			isExcluded: boolean;
		}>;
	};
	return (data.receipts || [])
		.filter((r) => !r.isExcluded)
		.map((r, idx) => ({
			id: r.id || `preview-${idx}`,
			dateIso: r.receiptDate,
			amountRub: r.amountRub,
			amountKopecks: Math.round(r.amountRub * 100),
			taxCode: r.deductionCode,
			serviceName: r.serviceName,
			code804n: r.deductionCode === "2" ? "A16.07.054" : "A16.07.002",
			receiptNumber: r.receiptNumber,
			fiscalDocumentNumber: r.fiscalDocumentNumber || undefined,
			isRefund: false,
		}));
}

export async function issueTaxCertificateDoc(params: {
	patientId: string;
	patientFullName: string;
	chiefDoctorOrDirector: string;
	year: number;
	effectiveInn: string;
	totalNetRub: number;
	paymentIds: string[];
}) {
	const createRes = await fetch("/api/documents", {
		method: "POST",
		headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({
			patientId: params.patientId,
			kind: "tax_deduction_certificate",
			title: `Справка для налогового вычета за ${params.year} год (ФНС)`,
			taxYear: params.year,
			taxPayerInn: params.effectiveInn || undefined,
			totalAmountRub: params.totalNetRub,
			payload: params.paymentIds.length > 0 ? { taxPaymentSelection: { selectedPaymentIds: params.paymentIds } } : undefined,
		}),
	});
	if (!createRes.ok) throw new Error(await createRes.text());
	const created = (await createRes.json()) as { id?: string; document?: { id?: string } };
	const docId = created.id || created.document?.id;
	if (docId) {
		await fetch(`/api/documents/${encodeURIComponent(docId)}/issue`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				signatureAttestation: {
					mode: "electronic_generated",
					signedAt: new Date().toISOString(),
					recipientFullName: params.patientFullName,
					recipientRole: "patient",
					staffFullName: params.chiefDoctorOrDirector,
					staffRole: "doctor",
					identityChecked: true,
					documentOpenedAndChecked: true,
					recipientSigned: true,
					clinicRepresentativeSigned: true,
					note: `Справка для налогового вычета за ${params.year} год утверждена бухгалтерией`,
				},
			}),
		});
	}
}
