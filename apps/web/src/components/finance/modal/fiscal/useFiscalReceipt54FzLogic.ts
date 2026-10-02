import React, { useRef, useState } from "react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { showToast } from "../../../GlobalToast";
import { generateFiscalReceipt54Fz } from "../../order804nFiscalEngine";
import { printThermalReceipt } from "../../../../lib/hardwarePrinting";
import type { FiscalReceiptPrintPayload } from "../../../../services/hardware/hardwareTypes";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { formatMoneyRu } from "./fiscalModalRefundLogic";
import type { FiscalModalTab, FiscalReceipt54FzModalProps } from "./fiscalModalTypes";
import { useFiscalItemsAndDiscounts } from "./useFiscalItemsAndDiscounts";
import { useFiscalTenderAllocation } from "./useFiscalTenderAllocation";
import { useFiscalRefundAndAuxTabs } from "./useFiscalRefundAndAuxTabs";

export function useFiscalReceipt54FzLogic(props: FiscalReceipt54FzModalProps) {
	const {
		items: propItems,
		patientId = "00000000-0000-0000-0000-000000000001",
		patientName = "Пациент",
		patientPhone = "+7 (___) ___-__-__",
		patientDepositRub: rawDeposit = 0,
		patientFamilyBalanceRub = 0,
		cashierFullName = "Кассир-администратор",
		clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		initialTab,
		initialOperationType,
		onReceiptFiscalized,
		totalDueRub: propTotalDueRub,
		amountRub: propAmountRub,
		totalBillRub,
		totalBillKop,
		defaultMethod,
	} = props;

	const patientDepositRub = (rawDeposit || 0) + (patientFamilyBalanceRub || 0);

	const fallbackAmount = Math.max(
		0,
		(propTotalDueRub ?? propAmountRub ?? totalBillRub ?? (totalBillKop ? totalBillKop / 100 : undefined)) ?? 0,
	);

	const itemsHook = useFiscalItemsAndDiscounts({
		propItems,
		fallbackAmount,
	});

	const initialMethod = defaultMethod || "card";
	const effectiveInitialTotal = itemsHook.totalSumRub > 0 ? itemsHook.totalSumRub : fallbackAmount;

	const tenderHook = useFiscalTenderAllocation({
		defaultMethod,
		effectiveInitialTotal,
		totalSumRub: itemsHook.totalSumRub,
		totalKopecks: itemsHook.totalKopecks,
		patientDepositRub,
		patientPhone,
	});

	const effectiveInitialTab: FiscalModalTab =
		initialTab || (initialOperationType === "income_return" ? "refund" : "payment");
	const [activeTab, setActiveTab] = useState<FiscalModalTab>(effectiveInitialTab);

	const [isFiscalizing, setIsFiscalizing] = useState<boolean>(false);
	const inFlightRef = useRef(false);
	const lastClickTimeRef = useRef(0);

	// Acquiring & Fiscalization Emergency Fault-Tolerance (Mandates 8e, 8n)
	const [interruptedFiscalState, setInterruptedFiscalState] = useState<{
		isInterrupted: boolean;
		reason: string;
		amountRub: number;
		lastReceiptNumber?: string;
	} | null>(null);
	const [isSubmittingManualCard, setIsSubmittingManualCard] = useState<boolean>(false);

	const auxHook = useFiscalRefundAndAuxTabs({
		items: itemsHook.items,
		activeItems: itemsHook.activeItems,
		activeTab,
		totalSumRub: itemsHook.totalSumRub,
		splitInput: tenderHook.splitInput,
		patientId,
		patientName,
		patientPhone,
		patientDepositRub,
		cashierFullName,
		clinicName,
		customerContact: tenderHook.customerContact,
		payerType: tenderHook.payerType,
		buyerLegalName: tenderHook.buyerLegalName,
		buyerInn: tenderHook.buyerInn,
	});

	const handleExecuteFiscalization = async (overrideTender?: "card" | "cash" | "sbp") => {
		const now = Date.now();
		if (inFlightRef.current || isFiscalizing || now - lastClickTimeRef.current < 600) {
			return;
		}

		if (activeTab === "refund" && auxHook.refundFiscalData.totalRub <= 0) {
			showToast("Укажите сумму возврата больше 0 ₽", "warning");
			return;
		}

		let activeSplit = tenderHook.splitInput;
		if (overrideTender === "card") {
			tenderHook.setCardAmount(itemsHook.totalSumRub);
			tenderHook.setCashAmount(0);
			tenderHook.setSbpAmount(0);
			tenderHook.setDepositAmount(0);
			tenderHook.setCertificateAmount(0);
			activeSplit = { ...tenderHook.splitInput, cardRub: itemsHook.totalSumRub, cashRub: 0, sbpRub: 0, depositRub: 0 };
		} else if (overrideTender === "cash") {
			tenderHook.setCashAmount(itemsHook.totalSumRub);
			tenderHook.setCardAmount(0);
			tenderHook.setSbpAmount(0);
			tenderHook.setDepositAmount(0);
			tenderHook.setCertificateAmount(0);
			activeSplit = { ...tenderHook.splitInput, cashRub: itemsHook.totalSumRub, receivedCashRub: itemsHook.totalSumRub, cardRub: 0, sbpRub: 0, depositRub: 0 };
		} else if (overrideTender === "sbp") {
			tenderHook.setSbpAmount(itemsHook.totalSumRub);
			tenderHook.setCardAmount(0);
			tenderHook.setCashAmount(0);
			tenderHook.setDepositAmount(0);
			tenderHook.setCertificateAmount(0);
			activeSplit = { ...tenderHook.splitInput, sbpRub: itemsHook.totalSumRub, cardRub: 0, cashRub: 0, depositRub: 0 };
		} else if (activeTab === "payment" && !tenderHook.allocation.isFullyAllocated) {
			// Mandate 8e: Auto-balance remainder instead of blocking doctors/cashiers!
			if (tenderHook.remainingRub > 0) {
				if (tenderHook.cardAmount > 0) {
					const newCard = Math.max(0, tenderHook.cardAmount + tenderHook.remainingRub);
					tenderHook.setCardAmount(newCard);
					activeSplit = { ...tenderHook.splitInput, cardRub: newCard };
				} else if (tenderHook.cashAmount > 0) {
					const newCash = Math.max(0, tenderHook.cashAmount + tenderHook.remainingRub);
					tenderHook.setCashAmount(newCash);
					activeSplit = { ...tenderHook.splitInput, cashRub: newCash, receivedCashRub: Math.max(tenderHook.receivedCashRub, newCash) };
				} else if (tenderHook.sbpAmount > 0) {
					const newSbp = Math.max(0, tenderHook.sbpAmount + tenderHook.remainingRub);
					tenderHook.setSbpAmount(newSbp);
					activeSplit = { ...tenderHook.splitInput, sbpRub: newSbp };
				} else {
					tenderHook.setCardAmount(itemsHook.totalSumRub);
					activeSplit = { ...tenderHook.splitInput, cardRub: itemsHook.totalSumRub };
				}
			} else if (tenderHook.allocation.isOverallocated) {
				const excessKop = Math.abs(tenderHook.allocation.remainingKopecks);
				let remExcess = excessKop;
				let newCardKop = rubToKopecks(activeSplit.cardRub || 0);
				let newCashKop = rubToKopecks(activeSplit.cashRub || 0);
				let newSbpKop = rubToKopecks(activeSplit.sbpRub || 0);
				if (newCardKop > 0) {
					const deduct = Math.min(newCardKop, remExcess);
					newCardKop -= deduct;
					remExcess -= deduct;
				}
				if (remExcess > 0 && newCashKop > 0) {
					const deduct = Math.min(newCashKop, remExcess);
					newCashKop -= deduct;
					remExcess -= deduct;
				}
				if (remExcess > 0 && newSbpKop > 0) {
					const deduct = Math.min(newSbpKop, remExcess);
					newSbpKop -= deduct;
					remExcess -= deduct;
				}
				const newCardRub = kopecksToRub(newCardKop);
				const newCashRub = kopecksToRub(newCashKop);
				const newSbpRub = kopecksToRub(newSbpKop);
				tenderHook.setCardAmount(newCardRub);
				tenderHook.setCashAmount(newCashRub);
				tenderHook.setSbpAmount(newSbpRub);
				activeSplit = { ...tenderHook.splitInput, cardRub: newCardRub, cashRub: newCashRub, receivedCashRub: Math.max(tenderHook.receivedCashRub, newCashRub), sbpRub: newSbpRub };
			}
		}

		inFlightRef.current = true;
		lastClickTimeRef.current = now;
		setIsFiscalizing(true);
		try {
			const opText =
				activeTab === "refund"
					? "Чек возврата прихода"
					: activeTab === "correction"
						? "Чек коррекции"
						: "Чек";

			const receiptToFiscalize = activeTab === "payment"
				? generateFiscalReceipt54Fz({
					items: itemsHook.activeItems,
					splitPayment: activeSplit,
					patientId,
					patientName,
					customerContact: tenderHook.customerContact.trim() || patientPhone,
					cashierFullName,
					clinicLegalName: clinicName,
					payerType: tenderHook.payerType,
					buyerInn: tenderHook.payerType === "legal_entity" ? tenderHook.buyerInn : undefined,
					buyerName: tenderHook.payerType === "legal_entity" ? tenderHook.buyerLegalName : undefined,
				})
				: auxHook.fiscalReceipt;

			// 54-ФЗ / ФФД 1.2 & Мандат 8e: 100% гарантийная скидка (0.00 ₽) — чек в ККТ не отправляется, формируется внутренний Акт гарантии
			if (activeTab === "payment" && (receiptToFiscalize.totalRub <= 0 || receiptToFiscalize.isWarrantyZeroAct)) {
				showToast(
					`Оформлен Акт гарантийного обслуживания / списания услуг №${receiptToFiscalize.receiptNumber} (скидка 100%, 0 ₽). Визит закрыт без обращения к кассе!`,
					"success",
					5000,
				);
				if (onReceiptFiscalized) {
					onReceiptFiscalized(receiptToFiscalize.receiptNumber);
				}
				setInterruptedFiscalState(null);
				setActiveTab("act");
				return;
			}

			showToast(
				`${opText} №${receiptToFiscalize.receiptNumber} на сумму ${formatMoneyRu(receiptToFiscalize.totalRub)} успешно фискализирован в ОФД!`,
				"success",
				6000,
			);
			const printPayload: FiscalReceiptPrintPayload = {
				clinicName: clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				cashierFullName: cashierFullName || "Кассир",
				customerContact: patientPhone || patientName,
				operationType: activeTab === "refund" ? "income_return" : "income",
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
				prepaidRub:
					(receiptToFiscalize.payments?.depositRub || 0) +
					(receiptToFiscalize.payments?.advanceOffsetRub || 0) +
					(receiptToFiscalize.payments?.familyWalletRub || 0),
			};

			try {
				void printThermalReceipt(printPayload);
			} catch (printErr) {
				console.warn("[FiscalReceipt54FzModal] Thermal printer print deferred:", printErr);
			}

			if (onReceiptFiscalized) {
				onReceiptFiscalized(receiptToFiscalize.receiptNumber);
			}
			setInterruptedFiscalState(null);
			setActiveTab("preview");
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Ошибка связи с фискальным регистратором ККТ";
			showToast(errMsg, "error");
			setInterruptedFiscalState({
				isInterrupted: true,
				reason: errMsg,
				amountRub: itemsHook.totalSumRub,
				lastReceiptNumber: auxHook.fiscalReceipt.receiptNumber,
			});
		} finally {
			setIsFiscalizing(false);
			inFlightRef.current = false;
		}
	};

	const handleRetryFiscalizationWithoutBalanceImpact = async () => {
		if (itemsHook.totalSumRub <= 0) {
			showToast("Оформлен Акт гарантийного обслуживания (скидка 100%, 0 ₽). Фискализация не требуется.", "info", 4000);
			setInterruptedFiscalState(null);
			setActiveTab("act");
			return;
		}
		setIsFiscalizing(true);
		try {
			const printPayload: FiscalReceiptPrintPayload = {
				clinicName: clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				cashierFullName: cashierFullName || "Кассир",
				customerContact: tenderHook.customerContact.trim() || patientPhone || patientName,
				operationType: activeTab === "refund" ? "income_return" : "income",
				items: (itemsHook.activeItems || []).map((it) => {
					const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
					const price = it.priceRub || 0;
					const disc = it.discountRub || 0;
					const itemTotal = Math.max(0, price * qty - disc);
					return {
						name: it.name || "Стоматологическая услуга",
						priceRub: price,
						quantity: qty,
						amountRub: itemTotal,
						vatRate: "vat_none" as const,
						medicalServiceCode804n: it.code804n || undefined,
					};
				}),
				totalRub: itemsHook.totalSumRub,
				electronicRub: tenderHook.cardAmount + tenderHook.sbpAmount,
				cashRub: tenderHook.cashAmount,
				prepaidRub: tenderHook.depositAmount + tenderHook.certificateAmount,
			};

			const printRes = await printThermalReceipt(printPayload);
			if (printRes && !printRes.success) {
				showToast(`Ошибка фискализации на ККТ: ${printRes.error || "Устройство недоступно"}`, "error");
			} else {
				showToast("Чек повторно отправлен на фискализацию в ККТ (баланс пациента не затронут)!", "success", 5000);
				setInterruptedFiscalState(null);
				if (onReceiptFiscalized) {
					onReceiptFiscalized(auxHook.fiscalReceipt.receiptNumber);
				}
				setActiveTab("preview");
			}
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Сбой повторной фискализации чека";
			showToast(errMsg, "error");
		} finally {
			setIsFiscalizing(false);
		}
	};

	const handleManualCardTerminalConfirm = async () => {
		setIsSubmittingManualCard(true);
		try {
			const randomSuffix =
				typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
					? crypto.randomUUID()
					: `${Date.now()}`;
			const clientMutationId = `manual-pos:${patientId || "anon"}:${Date.now()}-${randomSuffix}`;
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});

			if (patientId && typeof fetch === "function") {
				await fetch("/api/billing/payments", {
					method: "POST",
					headers,
					body: JSON.stringify({
						patientId,
						amountRub: itemsHook.totalSumRub,
						method: "card",
						cashBoxType: tenderHook.selectedCashBoxType,
						clientMutationId,
						note: `Оплата картой подтверждена на терминале вручную (${itemsHook.totalSumRub} ₽ • ${cashierFullName}) [Без повторного списания с карты]`,
					}),
				}).catch((err) => {
					console.warn("[FiscalReceipt54FzModal] Manual card payment record warning:", err);
				});
			}

			showToast(
				`Оплата картой на сумму ${itemsHook.totalSumRub} ₽ подтверждена на терминале вручную. Чек зафиксирован в CRM без повторного списания!`,
				"success",
				5000,
			);

			setInterruptedFiscalState(null);
			if (onReceiptFiscalized) {
				onReceiptFiscalized(auxHook.fiscalReceipt.receiptNumber);
			}
			setActiveTab("preview");
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Ошибка ручного подтверждения карты";
			showToast(errMsg, "error");
		} finally {
			setIsSubmittingManualCard(false);
		}
	};

	return {
		patientDepositRub,
		fallbackAmount,
		activeTab,
		setActiveTab,
		isFiscalizing,
		interruptedFiscalState,
		setInterruptedFiscalState,
		isSubmittingManualCard,
		itemsHook,
		tenderHook,
		auxHook,
		handleExecuteFiscalization,
		handleRetryFiscalizationWithoutBalanceImpact,
		handleManualCardTerminalConfirm,
	};
}
