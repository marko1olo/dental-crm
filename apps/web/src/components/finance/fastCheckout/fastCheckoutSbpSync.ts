import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import type { SbpPaymentCheckStatus, SbpQrGeneratedData } from "./types";

/** Опрашивает статус оплаты по динамическому QR-коду СБП НСПК */
export async function executeCheckSbpStatus(params: {
	readonly isCheckingSbp: boolean;
	readonly sbpStatus: SbpPaymentCheckStatus;
	readonly effectiveSbpKopecks: number;
	readonly effectiveSbpOrderId: string;
	readonly sbpQrData: SbpQrGeneratedData | null;
	readonly manual: boolean;
	readonly setIsCheckingSbp: (val: boolean) => void;
	readonly setSbpStatus: (val: SbpPaymentCheckStatus) => void;
	readonly setSbpCheckMessage: (val: string | null) => void;
	readonly onPaidConfirmed: () => Promise<void>;
}): Promise<void> {
	const { isCheckingSbp, sbpStatus, effectiveSbpKopecks, effectiveSbpOrderId, sbpQrData, manual, setIsCheckingSbp, setSbpStatus, setSbpCheckMessage, onPaidConfirmed } = params;

	if (isCheckingSbp || sbpStatus === "paid" || effectiveSbpKopecks <= 0) return;
	setIsCheckingSbp(true);
	try {
		const headers = denteAdminSecretRequestHeaders({ Accept: "application/json" });
		const queryUrl = `/api/fiscal/sbp-status?orderId=${encodeURIComponent(effectiveSbpOrderId)}&qrId=${encodeURIComponent(sbpQrData?.payload.qrId || "")}&sumKop=${effectiveSbpKopecks}`;
		const res = await fetch(queryUrl, { headers });
		if (res.ok) {
			const data = (await res.json().catch(() => null)) as { paid?: boolean; status?: string } | null;
			if (data && (data.paid || data.status === "paid")) {
				setSbpStatus("paid");
				setSbpCheckMessage("Оплата по СБП подтверждена банком! Формируем фискальный чек...");
				showToast("Оплата через СБП подтверждена! Кассовый чек сформирован.", "success");
				await onPaidConfirmed();
				return;
			}
		}
		if (manual) {
			setSbpCheckMessage("Платёж через СБП пока не поступил. Ожидается проведение банком.");
			showToast("Платёж пока не поступил от банка", "info");
		}
	} catch {
		if (manual) {
			setSbpCheckMessage("Шлюз СБП временно недоступен. Проверьте банковскую выписку.");
		}
	} finally {
		setIsCheckingSbp(false);
	}
}

/** Ручное подтверждение поступления средств по СБП кассиром/врачом */
export async function executeConfirmSbpManual(params: {
	readonly effectiveSbpOrderId: string;
	readonly sbpQrData: SbpQrGeneratedData | null;
	readonly effectiveSbpKopecks: number;
	readonly setIsCheckingSbp: (val: boolean) => void;
	readonly setSbpStatus: (val: SbpPaymentCheckStatus) => void;
	readonly setSbpCheckMessage: (val: string | null) => void;
	readonly onPaidConfirmed: () => Promise<void>;
}): Promise<void> {
	const { effectiveSbpOrderId, sbpQrData, effectiveSbpKopecks, setIsCheckingSbp, setSbpStatus, setSbpCheckMessage, onPaidConfirmed } = params;

	setIsCheckingSbp(true);
	try {
		const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json", Accept: "application/json" });
		await fetch("/api/fiscal/sbp-status", {
			method: "POST",
			headers,
			body: JSON.stringify({ orderId: effectiveSbpOrderId, qrId: sbpQrData?.payload.qrId, action: "confirm_manual", sumKopecks: effectiveSbpKopecks }),
		}).catch(() => null);

		setSbpStatus("paid");
		setSbpCheckMessage("Поступление средств по СБП подтверждено кассиром. Формируем кассовый чек...");
		showToast("Оплата СБП подтверждена кассиром! Печатаем кассовый чек...", "success");
		await onPaidConfirmed();
	} catch {
		setSbpStatus("paid");
		await onPaidConfirmed();
	} finally {
		setIsCheckingSbp(false);
	}
}
