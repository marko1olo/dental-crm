import { useMemo } from "react";
import { classifyNdflServiceCode } from "@dental/shared";
import type { TaxPaymentRecord } from "../taxCertificateEngine";
import type { DocumentsCatalogViewProps } from "./types";

export function useTaxPaymentsMapper(
	eligibleTaxPayments: DocumentsCatalogViewProps["eligibleTaxPayments"],
): TaxPaymentRecord[] | undefined {
	return useMemo<TaxPaymentRecord[] | undefined>(() => {
		if (!eligibleTaxPayments || eligibleTaxPayments.length === 0) {
			return undefined;
		}
		return eligibleTaxPayments.map((p, idx) => {
			const amountRub = Number(p.amountRub ?? p.amount ?? 0);
			const rawCode804n = p.code804n ? String(p.code804n).trim() : undefined;
			const serviceName = String(
				p.description ||
					p.serviceName ||
					"Стоматологические медицинские услуги",
			);
			const isExplicitlyExpensive =
				p.taxServiceCode === "2" ||
				p.taxCode === "2" ||
				Boolean(p.isExpensiveTreatment);
			const taxCode = isExplicitlyExpensive
				? ("2" as const)
				: classifyNdflServiceCode(serviceName, rawCode804n);
			return {
				id: String(p.id || `pay-${idx}`),
				dateIso: String(
					p.paidAt || p.createdAt || p.dateIso || new Date().toISOString(),
				),
				amountRub,
				amountKopecks: Math.round(amountRub * 100),
				taxCode,
				serviceName,
				code804n:
					rawCode804n || (taxCode === "2" ? "A16.07.054" : "A16.07.002"),
				receiptNumber: String(p.receiptNumber || `ФЧ-${idx + 1}`),
				fiscalDocumentNumber: String(p.fiscalDocumentNumber || `${501 + idx}`),
				fiscalSign: String(p.fiscalSign || `${88776655 + idx}`),
				isRefund: Boolean(p.status === "refunded" || p.isRefund),
			};
		});
	}, [eligibleTaxPayments]);
}
