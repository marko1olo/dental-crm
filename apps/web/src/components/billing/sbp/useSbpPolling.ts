/**
 * apps/web/src/components/billing/sbp/useSbpPolling.ts
 *
 * SBP QR lifecycle: request the QR from the server, count down its TTL, poll the
 * server for the payment status, and let the cashier confirm manually.
 *
 * Honest-contour rules:
 * - The QR comes from `POST /api/sbp/generate-qr` (real NSPK payload). No QR is
 *   drawn while the server has not answered — an invented link cannot be paid.
 * - Status is checked against `GET /api/sbp/status/:operationId`, which looks up
 *   the real payments table by `clientMutationId = sbp:<operationId>`.
 * - Manual confirmation does NOT invent a paid state by itself: it reports the
 *   operation id upward so the caller records the payment through the real
 *   payments API with `clientMutationId = sbp:<operationId>`. After that the
 *   status route finds the payment — the loop closes on the database.
 *
 * Strictly <= 120 lines per Mandate 8b.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { playTactileEarcon } from "../../../lib/chairsideErgonomics.js";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { showToast } from "../../GlobalToast.js";
import { copySbpUrlToClipboard, fetchSbpDynamicQr, type SbpDynamicQrPayloadData } from "../sbpQrEngine.js";
import type { SbpDynamicQrCardProps } from "./sbpTypes.js";

export const PAID_SBP_STATUSES = new Set([
	"PAID",
	"DEPOSITED",
	"SETTLED",
	"CONFIRMED",
	"paid",
	"success",
	"deposited",
]);

export const REJECTED_SBP_STATUSES = new Set([
	"failed",
	"FAILED",
	"expired",
	"EXPIRED",
	"cancelled",
	"CANCELLED",
	"refunded",
	"REFUNDED",
	"voided",
	"VOIDED",
]);

export function isTerminalPaidSbpStatus(remoteStatus: string | undefined | null): boolean {
	if (!remoteStatus) return false;
	return PAID_SBP_STATUSES.has(remoteStatus.trim());
}

export function resolveSbpManualCheckMessage(remoteStatus: string | undefined | null): string {
	if (remoteStatus && REJECTED_SBP_STATUSES.has(remoteStatus.trim())) {
		return "Платёж СБП отклонён или просрочен — сформируйте новый QR";
	}
	return "Оплата банком ещё не подтверждена";
}

export function useSbpPolling(props: SbpDynamicQrCardProps) {
	const { sumRub, orderId, invoiceId, patientName, clinicLegalName, ttlSeconds = 300, onPaymentSuccess, hideManualConfirm = false } = props;
	const [status, setStatus] = useState<"loading" | "awaiting" | "paid" | "expired" | "unavailable">("loading");
	const [secondsLeft, setSecondsLeft] = useState<number>(ttlSeconds);
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [qrIteration, setQrIteration] = useState<number>(0);
	const [isCheckingSbp, setIsCheckingSbp] = useState<boolean>(false);
	const [sbpCheckMessage, setSbpCheckMessage] = useState<string | null>(null);
	const [qrData, setQrData] = useState<SbpDynamicQrPayloadData | null>(null);
	const [qrErrorRu, setQrErrorRu] = useState<string | null>(null);
	// Идемпотентная операция живёт, пока QR на экране; «Обновить» создаёт новую операцию.
	const operationIdRef = useRef<string>(generateUuidV7());

	const loadQr = useCallback(async () => {
		setStatus("loading");
		setQrErrorRu(null);
		const result = await fetchSbpDynamicQr({
			sumRub, orderId, invoiceId, patientName, clinicLegalName, ttlSeconds, operationId: operationIdRef.current,
		});
		if (result.qr) {
			setQrData(result.qr);
			setSecondsLeft(result.qr.ttlSeconds);
			setStatus("awaiting");
		} else {
			setQrData(null);
			setQrErrorRu(result.errorRu);
			setStatus("unavailable");
		}
	}, [sumRub, orderId, invoiceId, patientName, clinicLegalName, ttlSeconds]);

	useEffect(() => {
		void loadQr();
	}, [loadQr, qrIteration]);

	const handleConfirmPayment = useCallback(() => {
		if (!qrData || status === "paid") return;
		setStatus("paid");
		playTactileEarcon("pay");
		showToast(`Оплата ${sumRub.toLocaleString("ru-RU")} ₽ по СБП проведена`, "success");
		onPaymentSuccess?.({
			operationId: qrData.operationId,
			paymentId: qrData.operationId,
			sumRub,
			method: "sbp",
			timestampIso: new Date().toISOString(),
		});
	}, [qrData, status, sumRub, onPaymentSuccess]);

	const pollSbpStatus = useCallback(async (manual = false): Promise<boolean> => {
		if (!qrData || status === "paid") return false;
		if (manual) setIsCheckingSbp(true);
		try {
			const res = await fetch(`/api/sbp/status/${encodeURIComponent(qrData.operationId)}`, {
				credentials: "same-origin",
				headers: denteClinicalReadHeaders(),
			});
			if (res.ok) {
				let json: { found?: boolean; status?: string } | null = null;
				try {
					json = (await res.json()) as { found?: boolean; status?: string } | null;
				} catch (parseErr) {
					clientLogger.warn("useSbpPolling response parse failed", { error: String(parseErr) });
				}
				const remoteStatus = json?.status?.trim();
				if (json?.found && isTerminalPaidSbpStatus(remoteStatus)) {
					setSbpCheckMessage(null);
					handleConfirmPayment();
					return true;
				}
				if (manual) {
					setSbpCheckMessage(resolveSbpManualCheckMessage(remoteStatus));
					setTimeout(() => setSbpCheckMessage(null), 3500);
				}
			} else if (manual) {
				setSbpCheckMessage("Не удалось проверить статус оплаты в банке");
				setTimeout(() => setSbpCheckMessage(null), 3500);
			}
		} catch {
			if (manual) setSbpCheckMessage("Нет связи с сервером — повторите проверку");
		} finally {
			if (manual) setIsCheckingSbp(false);
		}
		return false;
	}, [qrData, status, handleConfirmPayment]);

	useEffect(() => {
		if (status !== "awaiting") return;
		const timer = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					setStatus("expired");
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [status]);

	useEffect(() => {
		if (status !== "awaiting") return;
		const pollInterval = setInterval(() => { void pollSbpStatus(false); }, 3000);
		return () => clearInterval(pollInterval);
	}, [status, pollSbpStatus]);

	const handleManualConfirmation = useCallback(async () => {
		if (hideManualConfirm) return;
		await pollSbpStatus(true);
	}, [hideManualConfirm, pollSbpStatus]);

	const handleCopyLink = async () => {
		if (!qrData) return;
		const ok = await copySbpUrlToClipboard(qrData.nspkUrl);
		if (ok) {
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2500);
			showToast("Ссылка СБП скопирована в буфер", "info");
		}
	};

	const handleRefreshQr = () => {
		operationIdRef.current = generateUuidV7();
		setQrIteration((prev) => prev + 1);
	};

	return {
		status, secondsLeft, isCopied, isCheckingSbp, sbpCheckMessage, qrData, qrErrorRu,
		handleConfirmPayment, pollSbpStatus, handleManualConfirmation, handleCopyLink, handleRefreshQr,
	};
}
