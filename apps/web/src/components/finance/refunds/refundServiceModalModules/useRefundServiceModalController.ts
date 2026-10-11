import { useMemo, useState } from "react";
import {
	calculatePartialRefund,
	generate54FzIncomeReturnQrPayload,
	type PartialRefundCalculationResult,
	type RefundableInvoiceItem,
	type RefundReasonCategory,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { FiscalReceiptQueueManager } from "../../../../services/hardware/fiscalReceiptQueueManager";
import { showToast } from "../../../GlobalToast";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { StaffActionAuditService } from "../../../../services/audit/staffActionAuditService";
import type {
	RefundClinicInfo,
	RefundFiscalInfo,
	RefundPaymentMethod,
	RefundServiceItem,
	RefundServiceModalProps,
	RefundTabMode,
} from "./types";
import { DEFAULT_CLINIC_INFO, DEFAULT_FALLBACK_SERVICES } from "./refundConstants";
import { buildRefundFiscalPayload, mapServicesToRefundableItems } from "./refundUtils";

let refundMutationSeq = 0;

export function useRefundServiceModalController(props: RefundServiceModalProps) {
	const {
		invoiceId,
		invoiceNumber,
		patientId,
		patientName,
		patientPhone,
		originalPaymentId,
		originalReceiptNumber,
		originalFiscalSign,
		fnSerial,
		doctorName = "Лечащий врач",
		doctorCommissionPct = 30,
		services = [],
		onRefundSuccess,
	} = props;

	const isDemo = isDemoShowcaseMode();
	const rawServices: readonly RefundServiceItem[] = useMemo(() => {
		if (services && services.length > 0) return services;
		if (isDemo) return DEFAULT_FALLBACK_SERVICES;
		return [];
	}, [services, isDemo]);

	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
		() => (rawServices[0]?.id ? new Set([rawServices[0].id]) : new Set()),
	);
	const [reasonCategory, setReasonCategory] = useState<RefundReasonCategory>("warranty_case");
	const [customReason, setCustomReason] = useState("");
	const [paymentMethod, setPaymentMethod] = useState<RefundPaymentMethod>("card");
	const [isProcessing, setIsProcessing] = useState(false);
	const [completedResult, setCompletedResult] = useState<PartialRefundCalculationResult | null>(null);
	const [fiscalInfo, setFiscalInfo] = useState<RefundFiscalInfo | null>(null);
	const [activeTab, setActiveTab] = useState<RefundTabMode>("form");

	const refundableItems: RefundableInvoiceItem[] = useMemo(() => {
		return mapServicesToRefundableItems(rawServices, doctorName, doctorCommissionPct);
	}, [rawServices, doctorName, doctorCommissionPct]);

	const calculation: PartialRefundCalculationResult = useMemo(() => {
		const requests = Array.from(selectedItemIds).map((id) => ({
			itemId: id,
			quantityToRefund: 1,
		}));

		return calculatePartialRefund({
			invoiceId,
			invoiceNumber,
			patientId,
			patientName,
			cashierFullName: "Кассир-администратор",
			paymentMethod,
			items: refundableItems,
			refundRequests: requests,
			reasonCategory,
			customReasonDetailsRu: customReason,
			defaultDoctorCommissionPct: doctorCommissionPct,
		});
	}, [
		invoiceId,
		invoiceNumber,
		patientId,
		patientName,
		paymentMethod,
		refundableItems,
		selectedItemIds,
		reasonCategory,
		customReason,
		doctorCommissionPct,
	]);

	const toggleSelectItem = (id: string) => {
		setSelectedItemIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleExecuteRefund = async () => {
		if (selectedItemIds.size === 0 || rawServices.length === 0) {
			showToast("Выберите хотя бы одну позицию для возврата средств.", "warning");
			return;
		}
		setIsProcessing(true);

		const clientMutationId = `refund-${invoiceId || "inv"}-${Date.now()}-${++refundMutationSeq}`;

		const {
			refundPayload,
			refundCashKopecks,
			refundElectronicKopecks,
			refundPrepaidKopecks,
			reasonText,
		} = buildRefundFiscalPayload({
			clientMutationId,
			patientId,
			originalPaymentId,
			invoiceId,
			invoiceNumber,
			originalReceiptNumber,
			originalFiscalSign,
			paymentMethod,
			reasonCategory,
			customReason,
			calculation,
		});

		let finalFnSerial: string | undefined = fnSerial || undefined;
		let finalDocNumber: string | undefined = undefined;
		let finalFiscalSign: string | undefined = undefined;
		let finalOfdUrl: string | undefined = undefined;
		let finalQueueId: string | undefined = undefined;
		let isOffline = false;

		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			const res = await fetch("/api/fiscal/refund", {
				method: "POST",
				headers,
				body: JSON.stringify(refundPayload),
			});

			if (res.ok) {
				const resData = (await res.json()) as {
					success?: boolean;
					replayed?: boolean;
					refundQueueId?: string;
					queueId?: string;
					status?: string;
					originalReceiptNumber?: string;
					fnSerial?: string;
					fiscalDocumentNumber?: string | number;
					fiscalSign?: string;
					ofdVerificationUrl?: string;
					totalRefundRub?: string;
				};
				isOffline = resData.status === "hardware_offline";
				finalQueueId = resData.refundQueueId || resData.queueId || clientMutationId;
				if (resData.fnSerial) {
					finalFnSerial = resData.fnSerial;
				}
				if (resData.fiscalDocumentNumber != null) {
					finalDocNumber = String(resData.fiscalDocumentNumber);
				}
				if (resData.fiscalSign != null) {
					finalFiscalSign = String(resData.fiscalSign);
				}
				if (resData.ofdVerificationUrl) {
					finalOfdUrl = resData.ofdVerificationUrl;
				}

				if (isOffline) {
					FiscalReceiptQueueManager.enqueueReceipt(
						{
							operationType: "income_return",
							customerContact: patientPhone || "",
							cashierFullName: "Кассир-администратор",
							totalRub: calculation.totalRefundRub,
							items: calculation.refundedItems.map((it) => ({
								name: it.name,
								priceRub: it.unitPriceRub,
								quantity: it.quantityRefunded,
								amountRub: it.refundedNetRub,
								paymentMethod: "full_payment",
								paymentSubject: "service",
							})),
							cashRub: refundCashKopecks / 100,
							electronicRub: refundElectronicKopecks / 100,
							prepaidRub: refundPrepaidKopecks / 100,
							taxationSystem: "usn_income",
						},
						"ККТ временно офлайн при фискализации возврата",
						finalQueueId,
					);
					showToast("ККТ временно офлайн: чек возврата помещен в буфер отложенной печати", "warning");
				} else {
					showToast(`Чек возврата «Возврат прихода» №${finalDocNumber || "б/н"} успешно фискализирован!`, "success");
				}
				StaffActionAuditService.logPaymentRefund({
					patientId,
					billId: invoiceId,
					amountKopecks: calculation.totalRefundKop,
					reason: reasonText || "Возврат услуги",
					paymentMethod: refundCashKopecks > 0 ? "cash" : "card",
				});
			} else {
				const errData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
				console.warn("[RefundServiceModal] /api/fiscal/refund returned status:", res.status, errData);
				isOffline = true;
				finalQueueId = clientMutationId;
				FiscalReceiptQueueManager.enqueueReceipt(
					{
						operationType: "income_return",
						customerContact: patientPhone || "",
						cashierFullName: "Кассир-администратор",
						totalRub: calculation.totalRefundRub,
						items: calculation.refundedItems.map((it) => ({
							name: it.name,
							priceRub: it.unitPriceRub,
							quantity: it.quantityRefunded,
							amountRub: it.refundedNetRub,
							paymentMethod: "full_payment",
							paymentSubject: "service",
						})),
						cashRub: refundCashKopecks / 100,
						electronicRub: refundElectronicKopecks / 100,
						prepaidRub: refundPrepaidKopecks / 100,
						taxationSystem: "usn_income",
					},
					"Сбой связи с сервером кассы: чек возврата сохранен локально",
					finalQueueId,
				);
				showToast("Сбой связи с сервером кассы: операция возврата зафиксирована локально", "warning");
			}
		} catch (fetchErr) {
			console.warn("[RefundServiceModal] Network error during refund fiscalization:", fetchErr);
			isOffline = true;
			finalQueueId = clientMutationId;
			FiscalReceiptQueueManager.enqueueReceipt(
				{
					operationType: "income_return",
					customerContact: patientPhone || "",
					cashierFullName: "Кассир-администратор",
					totalRub: calculation.totalRefundRub,
					items: calculation.refundedItems.map((it) => ({
						name: it.name,
						priceRub: it.unitPriceRub,
						quantity: it.quantityRefunded,
						amountRub: it.refundedNetRub,
						paymentMethod: "full_payment",
						paymentSubject: "service",
					})),
					cashRub: refundCashKopecks / 100,
					electronicRub: refundElectronicKopecks / 100,
					prepaidRub: refundPrepaidKopecks / 100,
					taxationSystem: "usn_income",
				},
				"ККТ временно недоступна: чек возврата сохранен в локальную очередь",
				finalQueueId,
			);
			showToast("ККТ временно недоступна: чек возврата сохранен в локальную очередь", "warning");
		} finally {
			setFiscalInfo({
				fnSerial: finalFnSerial,
				fiscalDocNumber: finalDocNumber,
				fiscalSign: finalFiscalSign,
				ofdUrl: finalOfdUrl,
				queueId: finalQueueId,
				isOfflineBuffered: isOffline,
			});
			setCompletedResult(calculation);
			setActiveTab("receipt");
			setIsProcessing(false);
			if (onRefundSuccess) {
				onRefundSuccess(calculation);
			}
		}
	};

	const clinicInfo: RefundClinicInfo = DEFAULT_CLINIC_INFO;

	const hasRealFiscalData = Boolean(
		fiscalInfo &&
		fiscalInfo.fnSerial &&
		fiscalInfo.fiscalDocNumber &&
		fiscalInfo.fiscalSign &&
		!fiscalInfo.isOfflineBuffered,
	);

	const receiptQrPayload =
		completedResult && hasRealFiscalData && fiscalInfo?.fnSerial && fiscalInfo?.fiscalDocNumber && fiscalInfo?.fiscalSign
			? generate54FzIncomeReturnQrPayload({
					result: completedResult,
					fnSerial: fiscalInfo.fnSerial,
					fdNumber: fiscalInfo.fiscalDocNumber,
					fpdNumber: fiscalInfo.fiscalSign,
				})
			: "";

	return {
		isDemo,
		rawServices,
		selectedItemIds,
		reasonCategory,
		setReasonCategory,
		customReason,
		setCustomReason,
		paymentMethod,
		setPaymentMethod,
		isProcessing,
		completedResult,
		fiscalInfo,
		activeTab,
		setActiveTab,
		refundableItems,
		calculation,
		toggleSelectItem,
		handleExecuteRefund,
		clinicInfo,
		hasRealFiscalData,
		receiptQrPayload,
	};
}
