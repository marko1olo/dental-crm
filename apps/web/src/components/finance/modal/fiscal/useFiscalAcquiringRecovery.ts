import { useRef, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../../../GlobalToast.js";
import { printThermalReceipt } from "../../../../lib/hardwarePrinting.js";
import type { FiscalReceiptPrintPayload } from "../../../../services/hardware/hardwareTypes.js";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";
import { enqueueOfflineReceipt } from "../../../../services/billing/offlineFiscalQueue.js";
import type { FiscalModalTab } from "./fiscalModalTypes.js";
import type { useFiscalItemsAndDiscounts } from "./useFiscalItemsAndDiscounts.js";
import type { useFiscalTenderAllocation } from "./useFiscalTenderAllocation.js";
import type { useFiscalRefundAndAuxTabs } from "./useFiscalRefundAndAuxTabs.js";

export interface FiscalAcquiringRecoveryProps {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly clinicName: string;
	readonly cashierFullName: string;
	readonly activeTab: FiscalModalTab;
	readonly setActiveTab: (tab: FiscalModalTab) => void;
	readonly onReceiptFiscalized?: ((receiptNumber: string) => void) | undefined;
	readonly itemsHook: ReturnType<typeof useFiscalItemsAndDiscounts>;
	readonly tenderHook: ReturnType<typeof useFiscalTenderAllocation>;
	readonly auxHook: ReturnType<typeof useFiscalRefundAndAuxTabs>;
}

export function useFiscalAcquiringRecovery(p: FiscalAcquiringRecoveryProps) {
	const [interruptedFiscalState, setInterruptedFiscalState] = useState<{
		isInterrupted: boolean;
		reason: string;
		amountRub: number;
		lastReceiptNumber?: string;
	} | null>(null);
	const [isSubmittingManualCard, setIsSubmittingManualCard] = useState<boolean>(false);
	const isSubmittingManualCardRef = useRef<boolean>(false);

	const handleRetryFiscalizationWithoutBalanceImpact = async (setIsFiscalizing: (v: boolean) => void) => {
		if (p.itemsHook.totalSumRub <= 0) {
			showToast("Оформлен Акт гарантийного обслуживания (скидка 100%, 0 ₽). Фискализация не требуется.", "info", 4000);
			setInterruptedFiscalState(null);
			p.setActiveTab("act");
			return;
		}
		setIsFiscalizing(true);
		try {
			const printPayload: FiscalReceiptPrintPayload = {
				clinicName: p.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				cashierFullName: p.cashierFullName || "Кассир",
				customerContact: p.tenderHook.customerContact.trim() || p.patientPhone || p.patientName,
				operationType: p.activeTab === "refund" ? "income_return" : "income",
				items: (p.itemsHook.activeItems || []).map((it) => {
					const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
					const price = it.priceRub || 0;
					const disc = it.discountRub || 0;
					return {
						name: it.name || "Стоматологическая услуга",
						priceRub: price,
						quantity: qty,
						amountRub: Math.max(0, price * qty - disc),
						vatRate: "vat_none" as const,
						medicalServiceCode804n: it.code804n || undefined,
					};
				}),
				totalRub: p.itemsHook.totalSumRub,
				electronicRub: p.tenderHook.cardAmount + p.tenderHook.sbpAmount,
				cashRub: p.tenderHook.cashAmount,
				prepaidRub: p.tenderHook.depositAmount + p.tenderHook.certificateAmount,
			};

			const printRes = await printThermalReceipt(printPayload);
			if (printRes && !printRes.success) {
				void enqueueOfflineReceipt({
					visitId: p.patientId,
					payload: printPayload,
					lastError: printRes.error || "Кассовое устройство недоступно",
					idempotencyKey: `fiscal-retry-${generateUuidV7()}`,
				});
				showToast("Оплата зафиксирована, чек в очереди фискализации", "info", 5000);
			} else {
				showToast("Чек повторно отправлен на фискализацию в ККТ (баланс пациента не затронут)!", "success", 5000);
				setInterruptedFiscalState(null);
				p.onReceiptFiscalized?.(p.auxHook.fiscalReceipt.receiptNumber);
				p.setActiveTab("preview");
			}
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Сбой повторной фискализации чека";
			void enqueueOfflineReceipt({
				visitId: p.patientId,
				payload: { clinicName: p.clinicName, items: p.itemsHook.activeItems, totalRub: p.itemsHook.totalSumRub },
				lastError: errMsg,
				idempotencyKey: `fiscal-retry-err-${generateUuidV7()}`,
			});
			showToast("Оплата зафиксирована, чек в очереди фискализации", "info", 5000);
		} finally {
			setIsFiscalizing(false);
		}
	};

	const handleManualCardTerminalConfirm = async () => {
		if (isSubmittingManualCardRef.current || isSubmittingManualCard) return;
		isSubmittingManualCardRef.current = true;
		setIsSubmittingManualCard(true);
		try {
			const randomSuffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `${Date.now()}`;
			const clientMutationId = `manual-pos:${p.patientId || "anon"}:${Date.now()}-${randomSuffix}`;
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			if (p.patientId && typeof fetch === "function") {
				await fetch("/api/billing/payments", {
					method: "POST",
					headers,
					body: JSON.stringify({
						patientId: p.patientId,
						amountRub: p.itemsHook.totalSumRub,
						method: "card",
						cashBoxType: p.tenderHook.selectedCashBoxType,
						clientMutationId,
						note: `Оплата картой подтверждена на терминале вручную (${p.itemsHook.totalSumRub} ₽ • ${p.cashierFullName}) [Без повторного списания с карты]`,
					}),
				}).catch((err) => {
					console.warn("[FiscalReceiptModal] Manual card payment record warning:", err);
				});
			}

			showToast(
				`Оплата картой на сумму ${p.itemsHook.totalSumRub} ₽ подтверждена на терминале вручную. Чек зафиксирован в CRM без повторного списания!`,
				"success",
				5000,
			);
			setInterruptedFiscalState(null);
			p.onReceiptFiscalized?.(p.auxHook.fiscalReceipt.receiptNumber);
			p.setActiveTab("preview");
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Ошибка ручного подтверждения карты";
			showToast(errMsg, "error");
		} finally {
			isSubmittingManualCardRef.current = false;
			setIsSubmittingManualCard(false);
		}
	};

	return {
		interruptedFiscalState,
		setInterruptedFiscalState,
		isSubmittingManualCard,
		handleRetryFiscalizationWithoutBalanceImpact,
		handleManualCardTerminalConfirm,
	};
}
