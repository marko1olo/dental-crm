import { useRef, useState } from "react";
import { generateUuidV7, kopecksToRub, rubToKopecks } from "@dental/shared";
import { showToast } from "../../../GlobalToast.js";
import { generateFiscalReceipt54Fz } from "../../fiscalReceiptEngine.js";
import { printThermalReceipt } from "../../../../lib/hardwarePrinting.js";
import type { FiscalReceiptPrintPayload } from "../../../../services/hardware/hardwareTypes.js";
import { enqueueOfflineReceipt } from "../../../../services/billing/offlineFiscalQueue.js";
import { formatMoneyRu } from "./fiscalModalRefundLogic.js";
import type { FiscalModalTab } from "./fiscalModalTypes.js";
import type { useFiscalItemsAndDiscounts } from "./useFiscalItemsAndDiscounts.js";
import type { useFiscalTenderAllocation } from "./useFiscalTenderAllocation.js";
import type { useFiscalRefundAndAuxTabs } from "./useFiscalRefundAndAuxTabs.js";

export interface FiscalReceiptSubmitProps {
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
	readonly setInterruptedFiscalState: (s: any) => void;
}

export function useFiscalReceiptSubmit(p: FiscalReceiptSubmitProps) {
	const [isFiscalizing, setIsFiscalizing] = useState<boolean>(false);
	const inFlightRef = useRef(false);
	const lastClickTimeRef = useRef(0);

	const handleExecuteFiscalization = async (overrideTender?: "card" | "cash" | "sbp") => {
		const now = Date.now();
		if (inFlightRef.current || isFiscalizing || now - lastClickTimeRef.current < 600) return;

		if (p.activeTab === "refund" && p.auxHook.refundFiscalData.totalRub <= 0) {
			showToast("Укажите сумму возврата больше 0 ₽", "warning");
			return;
		}

		let activeSplit = p.tenderHook.splitInput;
		if (overrideTender === "card") {
			p.tenderHook.setCardAmount(p.itemsHook.totalSumRub);
			p.tenderHook.setCashAmount(0);
			p.tenderHook.setSbpAmount(0);
			p.tenderHook.setDepositAmount(0);
			p.tenderHook.setCertificateAmount(0);
			activeSplit = { ...p.tenderHook.splitInput, cardRub: p.itemsHook.totalSumRub, cashRub: 0, sbpRub: 0, depositRub: 0 };
		} else if (overrideTender === "cash") {
			p.tenderHook.setCashAmount(p.itemsHook.totalSumRub);
			p.tenderHook.setCardAmount(0);
			p.tenderHook.setSbpAmount(0);
			p.tenderHook.setDepositAmount(0);
			p.tenderHook.setCertificateAmount(0);
			activeSplit = { ...p.tenderHook.splitInput, cashRub: p.itemsHook.totalSumRub, receivedCashRub: p.itemsHook.totalSumRub, cardRub: 0, sbpRub: 0, depositRub: 0 };
		} else if (overrideTender === "sbp") {
			p.tenderHook.setSbpAmount(p.itemsHook.totalSumRub);
			p.tenderHook.setCardAmount(0);
			p.tenderHook.setCashAmount(0);
			p.tenderHook.setDepositAmount(0);
			p.tenderHook.setCertificateAmount(0);
			activeSplit = { ...p.tenderHook.splitInput, sbpRub: p.itemsHook.totalSumRub, cardRub: 0, cashRub: 0, depositRub: 0 };
		} else if (p.activeTab === "payment" && !p.tenderHook.allocation.isFullyAllocated) {
			if (p.tenderHook.remainingRub > 0) {
				const rem = p.tenderHook.remainingRub;
				if (p.tenderHook.cardAmount > 0) {
					p.tenderHook.setCardAmount(p.tenderHook.cardAmount + rem);
					activeSplit = { ...p.tenderHook.splitInput, cardRub: p.tenderHook.cardAmount + rem };
				} else if (p.tenderHook.cashAmount > 0) {
					p.tenderHook.setCashAmount(p.tenderHook.cashAmount + rem);
					activeSplit = { ...p.tenderHook.splitInput, cashRub: p.tenderHook.cashAmount + rem, receivedCashRub: Math.max(p.tenderHook.receivedCashRub, p.tenderHook.cashAmount + rem) };
				} else if (p.tenderHook.sbpAmount > 0) {
					p.tenderHook.setSbpAmount(p.tenderHook.sbpAmount + rem);
					activeSplit = { ...p.tenderHook.splitInput, sbpRub: p.tenderHook.sbpAmount + rem };
				} else {
					p.tenderHook.setCardAmount(p.itemsHook.totalSumRub);
					activeSplit = { ...p.tenderHook.splitInput, cardRub: p.itemsHook.totalSumRub };
				}
			}
		}

		inFlightRef.current = true;
		lastClickTimeRef.current = now;
		setIsFiscalizing(true);

		const receiptToFiscalize = p.activeTab === "payment"
			? generateFiscalReceipt54Fz({
					items: p.itemsHook.activeItems,
					splitPayment: activeSplit,
					patientId: p.patientId,
					patientName: p.patientName,
					customerContact: p.tenderHook.customerContact.trim() || p.patientPhone,
					cashierFullName: p.cashierFullName,
					clinicLegalName: p.clinicName,
					payerType: p.tenderHook.payerType,
					buyerInn: p.tenderHook.payerType === "legal_entity" ? p.tenderHook.buyerInn : undefined,
					buyerName: p.tenderHook.payerType === "legal_entity" ? p.tenderHook.buyerLegalName : undefined,
				})
			: p.auxHook.fiscalReceipt;

		try {
			const opText = p.activeTab === "refund" ? "Чек возврата прихода" : p.activeTab === "correction" ? "Чек коррекции" : "Чек";
			if (p.activeTab === "payment" && (receiptToFiscalize.totalRub <= 0 || receiptToFiscalize.isWarrantyZeroAct)) {
				showToast(`Оформлен Акт гарантийного обслуживания №${receiptToFiscalize.receiptNumber} (скидка 100%, 0 ₽). Визит закрыт!`, "success", 5000);
				p.onReceiptFiscalized?.(receiptToFiscalize.receiptNumber);
				p.setInterruptedFiscalState(null);
				p.setActiveTab("act");
				return;
			}

			showToast(`${opText} №${receiptToFiscalize.receiptNumber} на сумму ${formatMoneyRu(receiptToFiscalize.totalRub)} успешно фискализирован!`, "success", 6000);
			const printPayload: FiscalReceiptPrintPayload = {
				clinicName: p.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				cashierFullName: p.cashierFullName || "Кассир",
				customerContact: p.patientPhone || p.patientName,
				operationType: p.activeTab === "refund" ? "income_return" : "income",
				items: (receiptToFiscalize.items || []).map((it) => ({
					name: it.name || "Стоматологическая услуга",
					priceRub: it.unitPriceRub || 0,
					quantity: it.quantity || 1,
					amountRub: it.amountRub || 0,
					vatRate: "vat_0",
					medicalServiceCode804n: it.code804n,
					markingCode: it.markingCode,
				})),
				totalRub: receiptToFiscalize.totalRub || 0,
				electronicRub: receiptToFiscalize.payments?.cardRub || 0,
				cashRub: receiptToFiscalize.payments?.cashRub || 0,
				sbpRub: receiptToFiscalize.payments?.sbpRub || 0,
				prepaidRub: (receiptToFiscalize.payments?.depositRub || 0) + (receiptToFiscalize.payments?.advanceOffsetRub || 0) + (receiptToFiscalize.payments?.familyWalletRub || 0),
			};

			try { void printThermalReceipt(printPayload); } catch { /* ignore */ }
			p.onReceiptFiscalized?.(receiptToFiscalize.receiptNumber);
			p.setInterruptedFiscalState(null);
			p.setActiveTab("preview");
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Ошибка связи с фискальным регистратором ККТ";
			void enqueueOfflineReceipt({
				visitId: p.patientId,
				payload: receiptToFiscalize,
				lastError: errMsg,
				idempotencyKey: `fiscal-modal-${receiptToFiscalize.receiptNumber || generateUuidV7()}`,
			});
			showToast("Оплата зафиксирована, чек в очереди фискализации", "info", 5000);
			p.onReceiptFiscalized?.(receiptToFiscalize.receiptNumber);
			p.setInterruptedFiscalState({
				isInterrupted: true,
				reason: `${errMsg}. Оплата зафиксирована, чек в очереди фискализации.`,
				amountRub: p.itemsHook.totalSumRub,
				lastReceiptNumber: p.auxHook.fiscalReceipt.receiptNumber,
			});
			p.setActiveTab("preview");
		} finally {
			setIsFiscalizing(false);
			inFlightRef.current = false;
		}
	};

	return { isFiscalizing, setIsFiscalizing, handleExecuteFiscalization };
}
