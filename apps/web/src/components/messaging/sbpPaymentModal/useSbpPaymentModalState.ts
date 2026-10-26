import { useEffect, useState } from "react";
import { generateDynamicSbpQrPayload, type SbpDynamicQrResult } from "@dental/shared/fiscal";
import type { SbpPaymentInvoice, SbpPaymentStatus } from "../omnichannelTypes.js";
import { checkSbpOrderStatus } from "./sbpGatewayClient.js";
import type { SbpPaymentSuccessResult, SbpStatusCheckMessage } from "./types.js";

export interface UseSbpPaymentModalStateParams {
	readonly isOpen: boolean;
	readonly invoice: SbpPaymentInvoice;
	readonly defaultTtlMinutes?: number | undefined;
	readonly onPaymentSuccess?: ((result: SbpPaymentSuccessResult) => void) | undefined;
	readonly onCheckStatus?: ((orderId: string) => Promise<{ paid: boolean; fiscalReceiptId?: string | null }>) | undefined;
}

export function useSbpPaymentModalState({
	isOpen,
	invoice,
	defaultTtlMinutes = 15,
	onPaymentSuccess,
	onCheckStatus,
}: UseSbpPaymentModalStateParams) {
	const [status, setStatus] = useState<SbpPaymentStatus>("awaiting_scan");
	const [remainingSeconds, setRemainingSeconds] = useState<number>(defaultTtlMinutes * 60);
	const [copied, setCopied] = useState<boolean>(false);
	const [qrPayload, setQrPayload] = useState<SbpDynamicQrResult | null>(null);
	const [fiscalReceiptId, setFiscalReceiptId] = useState<string | null>(null);
	const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
	const [statusCheckMessage, setStatusCheckMessage] = useState<SbpStatusCheckMessage | null>(null);
	const [isManualConfirmPending, setIsManualConfirmPending] = useState<boolean>(false);
	const [isManualReconciliation, setIsManualReconciliation] = useState<boolean>(false);

	const initQrPayload = () => {
		try {
			const payload = generateDynamicSbpQrPayload({
				sumRub: invoice.sumRub,
				orderId: invoice.orderId,
				purpose: invoice.purpose,
				clinicName: invoice.clinicName,
				ttlMinutes: defaultTtlMinutes,
			});
			setQrPayload(payload);
			setStatus("awaiting_scan");
			setRemainingSeconds(defaultTtlMinutes * 60);
			setFiscalReceiptId(null);
			setIsManualConfirmPending(false);
			setIsManualReconciliation(false);
			setStatusCheckMessage(null);
		} catch {
			setStatus("failed");
		}
	};

	useEffect(() => {
		if (isOpen) initQrPayload();
	}, [isOpen, invoice.orderId, invoice.sumRub]);

	useEffect(() => {
		if (!isOpen || status === "paid_success" || status === "expired" || status === "failed") return;
		const timer = setInterval(() => {
			setRemainingSeconds((prev) => (prev <= 1 ? (clearInterval(timer), setStatus("expired"), 0) : prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [isOpen, status]);

	const handleCopyLink = async () => {
		if (!qrPayload) return;
		try {
			await navigator.clipboard.writeText(qrPayload.nspkUrl);
		} finally {
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
		}
	};

	const handleCheckGatewayStatus = async () => {
		if (isCheckingStatus || status === "paid_success") return;
		setIsCheckingStatus(true);
		setStatusCheckMessage(null);
		try {
			const check = await checkSbpOrderStatus(invoice.orderId, onCheckStatus);
			if (check.paid) {
				setFiscalReceiptId(check.fiscalReceiptId);
				setStatus("paid_success");
				onPaymentSuccess?.({ orderId: invoice.orderId, sumRub: invoice.sumRub, fiscalReceiptId: check.fiscalReceiptId, isManualReconciliation: false });
			}
			setStatusCheckMessage({ text: check.message, type: check.type });
		} finally {
			setIsCheckingStatus(false);
		}
	};

	const handleConfirmManualReconciliation = () => {
		setIsManualConfirmPending(false);
		setFiscalReceiptId(null);
		setIsManualReconciliation(true);
		setStatus("paid_success");
		setStatusCheckMessage(null);
		onPaymentSuccess?.({ orderId: invoice.orderId, sumRub: invoice.sumRub, fiscalReceiptId: null, isManualReconciliation: true });
	};

	return {
		status,
		remainingSeconds,
		copied,
		qrPayload,
		fiscalReceiptId,
		isCheckingStatus,
		statusCheckMessage,
		isManualConfirmPending,
		setIsManualConfirmPending,
		isManualReconciliation,
		initQrPayload,
		handleCopyLink,
		handleCheckGatewayStatus,
		handleConfirmManualReconciliation,
	};
}
