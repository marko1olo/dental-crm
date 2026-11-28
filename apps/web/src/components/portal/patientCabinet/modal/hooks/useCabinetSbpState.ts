import { useCallback, useEffect, useRef, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { clientLogger } from "../../../../../services/logging/clientLogger";
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
	clinicInfo?: PatientPersonalCabinetData["clinicInfo"],
) {
	const [activeSbpInvoice, setActiveSbpInvoice] = useState<PatientInvoiceItem | null>(null);
	const [activeSbpPayload, setActiveSbpPayload] = useState<SbpQrPayload | null>(null);
	const [isCheckingSbpStatus, setIsCheckingSbpStatus] = useState(false);
	const [sbpStatusMessage, setSbpStatusMessage] = useState<string | null>(null);
	const inFlightSbpCheckRef = useRef(false);
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current);
				closeTimerRef.current = null;
			}
		};
	}, []);

	const handleStartSbpPayment = useCallback(async (invoice: PatientInvoiceItem) => {
		setActiveSbpInvoice(invoice);
		setActiveSbpPayload(null);
		setIsCheckingSbpStatus(false);
		setSbpStatusMessage("Генерация платёжного QR-кода СБП...");

		const token = typeof window !== "undefined" ? localStorage.getItem("dente_portal_token") : null;
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
			"Idempotency-Key": generateUuidV7(),
		};
		if (token) headers.Authorization = `Bearer ${token}`;

		const tryLocalFallback = (serverErrorMessage?: string) => {
			const legalName = clinicInfo?.legalName || clinicInfo?.nameRu;
			const inn = clinicInfo?.inn;
			if (legalName && inn) {
				try {
					const fallbackPayload = generateSbpQrPayload(invoice, {
						legalName,
						inn,
					});
					setActiveSbpPayload(fallbackPayload);
					setSbpStatusMessage(null);
					return;
				} catch {
					// Fall through to explicit error message below
				}
			}
			setActiveSbpPayload(null);
			setSbpStatusMessage(
				serverErrorMessage ||
					"Банковские реквизиты клиники для приёма платежей через СБП не настроены. Обратитесь к администратору клиники.",
			);
		};

		try {
			const res = await fetch("/api/portal/payments/create-sbp-qr", {
				method: "POST",
				headers,
				body: JSON.stringify({
					invoiceId: invoice.id,
					amountRub: invoice.remainingAmountRub > 0 ? invoice.remainingAmountRub : invoice.totalAmountRub,
				}),
			});

			let json: {
				sbpPayload?: SbpQrPayload;
				message?: string;
			} | null = null;
			try {
				json = (await res.json()) as {
					sbpPayload?: SbpQrPayload;
					message?: string;
				} | null;
			} catch (parseErr) {
				clientLogger.warn("[useCabinetSbpState] create-sbp-qr JSON parse failed", {
					status: res.status,
					error: String(parseErr),
				});
			}

			if (res.ok && json?.sbpPayload) {
				setActiveSbpPayload(json.sbpPayload);
				setSbpStatusMessage(null);
				return;
			}
			tryLocalFallback(json?.message);
		} catch (err) {
			clientLogger.warn("[useCabinetSbpState] create-sbp-qr request failed", { error: String(err) });
			tryLocalFallback();
		}
	}, [clinicInfo]);

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
				let statusData: {
					isPaid?: boolean;
					paid?: boolean;
					status?: string;
					fiscalReceiptId?: string | null;
					fiscalReceiptNumber?: string | null;
					paidAtIso?: string | null;
					paidAt?: string | null;
				} | null = null;
				try {
					statusData = (await res.json()) as {
						isPaid?: boolean;
						paid?: boolean;
						status?: string;
						fiscalReceiptId?: string | null;
						fiscalReceiptNumber?: string | null;
						paidAtIso?: string | null;
						paidAt?: string | null;
					} | null;
				} catch (parseErr) {
					clientLogger.warn("[useCabinetSbpState] payment status JSON parse failed", {
						error: String(parseErr),
					});
				}

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
					if (closeTimerRef.current) {
						clearTimeout(closeTimerRef.current);
					}
					closeTimerRef.current = setTimeout(() => {
						closeTimerRef.current = null;
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
	}, [activeSbpInvoice, onInvoicePaid, setData]);

	const handleOpenBankApp = useCallback((bank: SbpBankMember) => {
		if (!activeSbpPayload || !activeSbpPayload.qrId) return;
		const encodedQrId = encodeURIComponent(activeSbpPayload.qrId);
		const targetUrl =
			bank.id === "sbp_generic" || bank.schemaPrefix === "https://qr.nspk.ru/"
				? activeSbpPayload.sbpNspkPayloadString || `https://qr.nspk.ru/${encodedQrId}`
				: bank.schemaPrefix.includes(activeSbpPayload.qrId) || bank.schemaPrefix.includes(encodedQrId)
					? bank.schemaPrefix
					: `${bank.schemaPrefix}${encodedQrId}`;
		setSbpStatusMessage(`Переход в приложение ${bank.nameRu}...`);
		window.open(targetUrl, "_blank", "noopener,noreferrer");
	}, [activeSbpPayload]);

	return {
		activeSbpInvoice, setActiveSbpInvoice,
		activeSbpPayload, setActiveSbpPayload,
		isCheckingSbpStatus, setIsCheckingSbpStatus,
		sbpStatusMessage, setSbpStatusMessage,
		handleStartSbpPayment, handleCheckSbpPaymentStatus, handleOpenBankApp,
	};
}
