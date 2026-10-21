import type { Patient } from "@dental/shared";
import { useMemo } from "react";
import type { TaxPaymentRecord } from "../taxCertificateEngine";

export function useCatalogModalsData(
	patient?: Patient | null | undefined,
	mappedTaxPayments?: TaxPaymentRecord[] | undefined,
) {
	const effectivePatientInn =
		patient?.administrativeProfile?.taxpayerInn ??
		(patient as { inn?: string | null } | null | undefined)?.inn ??
		(patient as { details?: { inn?: string | null } } | null | undefined)
			?.details?.inn ??
		"";

	const effectivePatientSnils =
		patient?.administrativeProfile?.snils ??
		(patient as { snils?: string | null } | null | undefined)?.snils ??
		(patient as { details?: { snils?: string | null } } | null | undefined)
			?.details?.snils ??
		"";

	const sanitizedPayments = useMemo(() => {
		if (!mappedTaxPayments) return undefined;
		return mappedTaxPayments.map((p, idx) => ({
			...p,
			receiptNumber: p.receiptNumber ?? `ФЧ-${idx + 1}`,
			fiscalDocumentNumber: p.fiscalDocumentNumber ?? `${501 + idx}`,
			fiscalSign: p.fiscalSign ?? `${88776655 + idx}`,
		}));
	}, [mappedTaxPayments]);

	return {
		effectivePatientInn,
		effectivePatientSnils,
		sanitizedPayments,
	};
}
