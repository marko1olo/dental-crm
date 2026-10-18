/**
 * apps/web/src/components/billing/sbp/useSbpPolling.ts
 *
 * Hook managing SBP QR creation, countdown timer, network polling, and manual confirmation.
 * Strictly <= 120 lines per Mandate 8b.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { showToast } from "../../GlobalToast.js";
import { playTactileEarcon } from "../../../lib/chairsideErgonomics.js";
import { createSbpDynamicQr, copySbpUrlToClipboard, type SbpDynamicQrPayloadData } from "../sbpQrEngine.js";
import type { SbpDynamicQrCardProps } from "./sbpTypes.js";

export function useSbpPolling(props: SbpDynamicQrCardProps) {
	const { sumRub, orderId, invoiceId, patientName = "Пациент клиники", clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»", ttlSeconds = 30, onPaymentSuccess } = props;
	const [status, setStatus] = useState<"awaiting" | "paid" | "expired">("awaiting");
	const [secondsLeft, setSecondsLeft] = useState<number>(ttlSeconds);
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [qrIteration, setQrIteration] = useState<number>(0);
	const [isCheckingSbp, setIsCheckingSbp] = useState<boolean>(false);
	const [sbpCheckMessage, setSbpCheckMessage] = useState<string | null>(null);

	const qrData: SbpDynamicQrPayloadData = useMemo(() => {
		return createSbpDynamicQr({ sumRub, orderId, invoiceId, patientName, clinicLegalName, ttlSeconds });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sumRub, orderId, invoiceId, patientName, clinicLegalName, ttlSeconds, qrIteration]);

	const handleConfirmPayment = useCallback(() => {
		if (status === "paid") return;
		setStatus("paid");
		playTactileEarcon("pay");
		showToast(`Оплата ${sumRub.toLocaleString("ru-RU")} ₽ по СБП подтверждена!`, "success");
		onPaymentSuccess?.({ paymentId: qrData.paymentId, sumRub, method: "sbp", timestampIso: new Date().toISOString() });
	}, [status, sumRub, qrData.paymentId, onPaymentSuccess]);

	const pollSbpStatus = useCallback(async (manual = false) => {
		if (status === "paid") return;
		try {
			if (manual) setIsCheckingSbp(true);
			const effectiveId = qrData.paymentId || orderId || invoiceId || "";
			const sumKop = Math.round(sumRub * 100);
			const url = `/api/fiscal/sbp-status?orderId=${encodeURIComponent(effectiveId)}&qrId=${encodeURIComponent(qrData.paymentId)}&sumKop=${sumKop}`;
			const res = await fetch(url, { credentials: "same-origin" });
			if (res.ok) {
				const json = await res.json();
				if (json.isPaid || json.status === "paid") { handleConfirmPayment(); return; }
				if (manual) { setSbpCheckMessage("Ожидание зачисления от банка..."); setTimeout(() => setSbpCheckMessage(null), 3500); }
			}
		} catch {
			// Fail-soft offline fallback
		} finally {
			if (manual) setIsCheckingSbp(false);
		}
	}, [status, qrData.paymentId, orderId, invoiceId, sumRub, handleConfirmPayment]);

	useEffect(() => {
		if (status !== "awaiting") return;
		const timer = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) { setStatus("expired"); return 0; }
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [status]);

	useEffect(() => {
		if (status !== "awaiting") return;
		const pollInterval = setInterval(() => pollSbpStatus(false), 2500);
		return () => clearInterval(pollInterval);
	}, [status, pollSbpStatus]);

	const handleManualConfirmation = useCallback(async () => {
		setIsCheckingSbp(true);
		handleConfirmPayment();
		setIsCheckingSbp(false);
	}, [handleConfirmPayment]);

	const handleCopyLink = async () => {
		const ok = await copySbpUrlToClipboard(qrData.nspkUrl);
		if (ok) { setIsCopied(true); setTimeout(() => setIsCopied(false), 2500); showToast("Ссылка СБП скопирована в буфер", "info"); }
	};

	const handleRefreshQr = () => {
		setQrIteration((prev) => prev + 1);
		setSecondsLeft(ttlSeconds);
		setStatus("awaiting");
	};

	return {
		status, secondsLeft, isCopied, isCheckingSbp, sbpCheckMessage, qrData,
		handleConfirmPayment, pollSbpStatus, handleManualConfirmation, handleCopyLink, handleRefreshQr,
	};
}
