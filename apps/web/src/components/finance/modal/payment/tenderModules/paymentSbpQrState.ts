import { useState, useMemo, useEffect } from "react";
import { generateDynamicSbpQrPayload, generateQrCodeSvg } from "@dental/shared/fiscal";

export interface PaymentSbpQrStateParams {
	readonly activeMethod: string;
	readonly splitSbpRub: number;
	readonly totalDueRub: number;
	readonly invoiceId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientName: string;
	readonly clinicLegalName: string;
}

export function usePaymentSbpQrState(params: PaymentSbpQrStateParams) {
	const { activeMethod, splitSbpRub, totalDueRub, invoiceId, documentId, visitId, patientName, clinicLegalName } = params;

	const [sbpStatus, setSbpStatus] = useState<"pending" | "paid">("pending");
	const [isCheckingSbp, setIsCheckingSbp] = useState<boolean>(false);
	const [sbpCheckMessage, setSbpCheckMessage] = useState<string | null>(null);

	const effectiveSbpAmountRub = activeMethod === "split" ? splitSbpRub : totalDueRub;
	const effectiveSbpKopecks = Math.round(effectiveSbpAmountRub * 100);
	const effectiveSbpOrderId = invoiceId?.trim() || documentId?.trim() || (visitId ? `VISIT-${visitId}` : `ORD-${Date.now()}`);

	const sbpQrData = useMemo(() => {
		if (effectiveSbpKopecks <= 0) return null;
		try {
			const payload = generateDynamicSbpQrPayload({
				sumRub: effectiveSbpAmountRub,
				orderId: effectiveSbpOrderId,
				purpose: `Оплата стоматологических услуг (${patientName})`,
				clinicName: clinicLegalName,
				ttlMinutes: 15,
			});
			const svg = generateQrCodeSvg(payload.nspkUrl, {
				size: 160,
				margin: 2,
				colorDark: "#0f172a",
				colorLight: "#ffffff",
				title: `QR-код СБП: ${payload.sumFormattedRu}`,
			});
			return { payload, svg };
		} catch {
			return null;
		}
	}, [effectiveSbpAmountRub, effectiveSbpKopecks, effectiveSbpOrderId, patientName, clinicLegalName]);

	useEffect(() => {
		setSbpStatus("pending");
		setSbpCheckMessage(null);
	}, [activeMethod, splitSbpRub]);

	return {
		sbpStatus, setSbpStatus, isCheckingSbp, setIsCheckingSbp,
		sbpCheckMessage, setSbpCheckMessage, effectiveSbpAmountRub,
		effectiveSbpKopecks, effectiveSbpOrderId, sbpQrData,
	};
}
