import { useCallback, useRef, useState } from "react";
import {
	generateSbpQrPayload,
	type PatientInvoiceItem,
	type PatientPersonalCabinetData,
	type SbpBankMember,
	type SbpQrPayload,
} from "../../patientCabinetEngine.js";

export function useCabinetSbpState(
	setData: React.Dispatch<React.SetStateAction<PatientPersonalCabinetData>>,
	onInvoicePaid?: (inv: PatientInvoiceItem) => void,
) {
	const [activeSbpInvoice, setActiveSbpInvoice] = useState<PatientInvoiceItem | null>(null);
	const [activeSbpPayload, setActiveSbpPayload] = useState<SbpQrPayload | null>(null);
	const [isCheckingSbpStatus, setIsCheckingSbpStatus] = useState(false);
	const [sbpStatusMessage, setSbpStatusMessage] = useState<string | null>(null);
	const inFlightSbpCheckRef = useRef(false);

	const handleStartSbpPayment = useCallback((invoice: PatientInvoiceItem) => {
		const payload = generateSbpQrPayload(invoice, { legalName: "Стоматология ДЕНТЕ", inn: "7701234567" });
		setActiveSbpInvoice(invoice);
		setActiveSbpPayload(payload);
		setSbpStatusMessage(null);
		setIsCheckingSbpStatus(false);
	}, []);

	const handleCheckSbpPaymentStatus = useCallback(async () => {
		if (!activeSbpInvoice || inFlightSbpCheckRef.current) return;
		inFlightSbpCheckRef.current = true;
		setIsCheckingSbpStatus(true);
		setSbpStatusMessage("Запрос подтверждения транзакции в шлюзе НСПК...");
		try {
			const orderId = (activeSbpPayload as any)?.orderId || activeSbpPayload?.invoiceNumber || activeSbpInvoice.invoiceNumber || activeSbpInvoice.id;
			const qrId = activeSbpPayload?.qrId || "";
			const sumKop = Math.round(activeSbpInvoice.remainingAmountRub * 100);
			const queryUrl = `/api/fiscal/sbp-status?orderId=${encodeURIComponent(orderId)}&qrId=${encodeURIComponent(qrId)}&invoiceId=${encodeURIComponent(activeSbpInvoice.id)}&sumKop=${sumKop}`;

			const res = await fetch(queryUrl, { headers: { Accept: "application/json" } });
			if (res.ok) {
				const statusData = (await res.json().catch(() => null)) as {
					paid?: boolean;
					status?: string;
					fiscalReceiptId?: string | null;
					fiscalReceiptNumber?: string | null;
					paidAt?: string | null;
				} | null;

				if (statusData && (statusData.paid || statusData.status === "paid")) {
					const updatedInvoice: PatientInvoiceItem = {
						...activeSbpInvoice,
						status: "paid",
						paidAmountRub: activeSbpInvoice.totalAmountRub,
						remainingAmountRub: 0,
						paidAtIso: statusData.paidAt || new Date().toISOString(),
						paymentMethod: "sbp",
						fiscalReceiptNumber: statusData.fiscalReceiptNumber || statusData.fiscalReceiptId || `ФД-${activeSbpInvoice.invoiceNumber}`,
					};
					setData((prev) => ({
						...prev,
						invoices: prev.invoices.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)),
					}));
					onInvoicePaid?.(updatedInvoice);
					setSbpStatusMessage("Оплата успешно зачислена! Кассовый чек отправлен.");
					setTimeout(() => {
						setActiveSbpInvoice(null);
						setActiveSbpPayload(null);
					}, 1500);
					return;
				}
			}
			setSbpStatusMessage("Платёж через СБП пока не поступил от банка. Ожидается проведение транзакции.");
		} catch {
			setSbpStatusMessage("Не удалось связаться со шлюзом СБП. Повторите попытку через несколько секунд.");
		} finally {
			inFlightSbpCheckRef.current = false;
			setIsCheckingSbpStatus(false);
		}
	}, [activeSbpInvoice, activeSbpPayload, onInvoicePaid, setData]);

	const handleOpenBankApp = useCallback((bank: SbpBankMember) => {
		if (!activeSbpPayload) return;
		setSbpStatusMessage(`Переход в приложение ${bank.nameRu}...`);
		window.open(bank.schemaPrefix, "_blank");
	}, [activeSbpPayload]);

	return {
		activeSbpInvoice, setActiveSbpInvoice,
		activeSbpPayload, setActiveSbpPayload,
		isCheckingSbpStatus, setIsCheckingSbpStatus,
		sbpStatusMessage, setSbpStatusMessage,
		handleStartSbpPayment, handleCheckSbpPaymentStatus, handleOpenBankApp,
	};
}
