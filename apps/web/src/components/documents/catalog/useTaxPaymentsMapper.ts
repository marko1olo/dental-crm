import { useMemo } from "react";
import { classifyNdflServiceCode, rublesToKopecks } from "@dental/shared";
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
			const rawAmountKopecks = p.amountKopecks;
			const amountKopecks =
				typeof rawAmountKopecks === "bigint"
					? Number(rawAmountKopecks)
					: typeof rawAmountKopecks === "number"
						? rawAmountKopecks
						: rublesToKopecks(amountRub);
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
				amountKopecks,
				taxCode,
				serviceName,
				code804n:
					rawCode804n || (taxCode === "2" ? "A16.07.054" : "A16.07.002"),
				receiptNumber: p.receiptNumber?.trim() || (p.id ? `ПЛ-${String(p.id).slice(0, 8)}` : "—"),
				fiscalDocumentNumber: p.fiscalDocumentNumber?.trim() || "—",
				fiscalSign: p.fiscalSign?.trim() || "—",
				isRefund: Boolean(p.status === "refunded" || p.isRefund),
			};
		});
	}, [eligibleTaxPayments]);
}
