/**
 * apps/web/src/components/documents/hooks/useTaxDeduction.ts
 *
 * Хук реактивного получения чеков и оплат для справки ФНС (КНД 1151156) (Мандаты 8e, 8n).
 * Строгая типизация без any (Мандат 8be), кэширование React Query.
 */
import { useQuery } from "@tanstack/react-query";
import { rublesToKopecks, type TaxDeductionPaymentItem } from "@dental/shared";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";

interface RawReceiptItem {
	readonly id?: string | undefined;
	readonly receiptNumber?: string | undefined;
	readonly fiscalDocumentNumber?: string | undefined;
	readonly receiptDate?: string | undefined;
	readonly serviceName?: string | undefined;
	readonly amountRub?: number | string | undefined;
	readonly deductionCode?: string | undefined;
	readonly isExcluded?: boolean | undefined;
}

interface RawReceiptsPayload {
	readonly receipts?: readonly RawReceiptItem[] | undefined;
}

export const useTaxDeduction = (
	isOpen: boolean,
	activePackage: string,
	patientId: string | undefined,
	taxYear: number,
) => {
	return useQuery<readonly TaxDeductionPaymentItem[]>({
		queryKey: ["tax-deduction-preview", patientId, taxYear],
		queryFn: async (): Promise<readonly TaxDeductionPaymentItem[]> => {
			if (!isOpen || activePackage !== "tax_certificate" || !patientId) return [];
			const headers = denteClinicalReadHeaders();
			const res = await fetch(`/api/documents/tax-deduction/preview/${encodeURIComponent(patientId)}?year=${taxYear}`, {
				headers,
			});
			if (!res.ok) throw new Error("Failed to fetch tax receipts");
			const data: unknown = await res.json();
			const payload = data && typeof data === "object" && "data" in data ? (data as { data: unknown }).data : data;
			if (payload && typeof payload === "object" && Array.isArray((payload as RawReceiptsPayload).receipts)) {
				const rawList = (payload as RawReceiptsPayload).receipts || [];
				return rawList.filter((r) => !r.isExcluded).map((r, idx): TaxDeductionPaymentItem => {
					const rub = typeof r.amountRub === "number" ? r.amountRub : Number(r.amountRub) || 0;
					return {
						id: r.id || `preview-rcpt-${idx + 1}`,
						dateIso: r.receiptDate || new Date().toISOString(),
						receiptNumber: r.receiptNumber || String(idx + 1),
						fiscalDocumentNumber: r.fiscalDocumentNumber || "0",
						fiscalSign: "0",
						serviceName: r.serviceName || "Стоматологические медицинские услуги",
						amountRub: rub,
						amountKopecks: rublesToKopecks(rub),
						taxCode: r.deductionCode === "2" ? "2" : "1",
					};
				});
			}
			return [];
		},
		enabled: isOpen && activePackage === "tax_certificate" && !!patientId,
		initialData: [],
	});
};
