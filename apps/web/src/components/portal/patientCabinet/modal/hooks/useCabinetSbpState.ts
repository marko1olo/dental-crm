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

	const handleStartSbpPayment = useCallback(async (invoice: PatientInvoiceItem) => {
		setActiveSbpInvoice(invoice);
		setIsCheckingSbpStatus(false);
		setSbpStatusMessage("Генерация платёжного QR-кода СБП...");

		const token = typeof window !== "undefined" ? localStorage.getItem("dente_portal_token") : null;
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
			"Idempotency-Key": crypto.randomUUID(),
		};
		if (token) headers.Authorization = `Bearer ${token}`;

		try {
			const res = await fetch("/api/portal/payments/create-sbp-qr", {
				method: "POST",
				headers,
				body: JSON.stringify({
					invoiceId: invoice.id,
					amountRub: invoice.remainingAmountRub > 0 ? invoice.remainingAmountRub : invoice.totalAmountRub,
				}),
			});

			if (res.ok) {
				const json = await res.json().catch(() => null);
				if (json?.sbpPayload) {
					setActiveSbpPayload(json.sbpPayload);
					setSbpStatusMessage(null);
					return;
				}
			}
			// Fallback if offline/demo or unconfigured bank details
			const fallbackPayload = generateSbpQrPayload(invoice);
			setActiveSbpPayload(fallbackPayload);
			setSbpStatusMessage(null);
		} catch {
			const fallbackPayload = generateSbpQrPayload(invoice);
			setActiveSbpPayload(fallbackPayload);
			setSbpStatusMessage(null);
		}
	}, []);

	const handleCheckSbpPaymentStatus = useCallback(async () => {
		if (!activeSbpInvoice || inFlightSbpCheckRef.current) return;
		inFlightSbpCheckRef.current = true;
		setIsCheckingSbpStatus(true);
		setSbpStatusMessage("Запрос подтверждения транзакции в шлюзе НСПК...");
		try {
			const invoiceId = activeSbpInvoice.id;
			const invoiceNumber = activeSbpInvoice.invoiceNumber;
			const queryUrl = `/api/portal/payments/status?invoiceId=${encodeURIComponent(invoiceId)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}`;

			const token = typeof window !== "undefined" ? localStorage.getItem("dente_portal_token") : null;
			const headers: Record<string, string> = { Accept: "application/json" };
			if (token) headers.Authorization = `Bearer ${token}`;

			const res = await fetch(queryUrl, { headers });
			if (res.ok) {
				const statusData = (await res.json().catch(() => null)) as {
					isPaid?: boolean;
					paid?: boolean;
					status?: string;
					fiscalReceiptId?: string | null;
					fiscalReceiptNumber?: string | null;
					paidAtIso?: string | null;
					paidAt?: string | null;
				} | null;

				if (statusData && (statusData.isPaid || statusData.paid || statusData.status === "paid")) {
					const updatedInvoice: PatientInvoiceItem = {
						...activeSbpInvoice,
						status: "paid",
						paidAmountRub: activeSbpInvoice.totalAmountRub,
						remainingAmountRub: 0,
						paidAtIso: statusData.paidAtIso || statusData.paidAt || new Date().toISOString(),
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
