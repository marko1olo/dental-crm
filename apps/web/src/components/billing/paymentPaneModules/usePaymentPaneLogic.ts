/**
 * apps/web/src/components/billing/paymentPaneModules/usePaymentPaneLogic.ts
 *
 * Hook managing cash register payment state, calculations, and submit lifecycle.
 * Governed by Mandate 8b (strictly <= 120 lines) and Mandates 8e, 8n.
 */

import { useState, useMemo, useEffect } from "react";
import { calculateCanonicalSplit } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { playTactileEarcon } from "../../../lib/chairsideErgonomics.js";
import { clinicalProceduralAudio } from "../../../services/audio/clinicalProceduralAudio.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { CashierPaymentMethod, CashRegisterPaymentPaneProps } from "./types.js";
import type { ShiftReceiptEntry } from "../CashRegisterDrawer.js";

export function usePaymentPaneLogic(props: CashRegisterPaymentPaneProps) {
	const {
		defaultAmountRub = 8500, activeInvoice, invoices, patientDepositRub = 0,
		patientFamilyBalanceRub = 0, initialMethod = "sbp", onPaymentCompleted,
	} = props;

	const currentInvoice = activeInvoice || (invoices && invoices.length > 0 ? invoices[0] : null);
	const baseAmountRub = currentInvoice?.totalAmountRub ?? currentInvoice?.amountRub ?? defaultAmountRub;

	const [amountRub, setAmountRub] = useState<number>(baseAmountRub);
	const [activeMethod, setActiveMethod] = useState<CashierPaymentMethod>(initialMethod);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(Math.round(baseAmountRub / 2));
	const [splitCashRub, setSplitCashRub] = useState<number>(baseAmountRub - Math.round(baseAmountRub / 2));
	const [splitCardRub, setSplitCardRub] = useState<number>(0);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);
	const [cashTenderedRub, setCashTenderedRub] = useState<number>(baseAmountRub);
	const [isRoundedToHundreds, setIsRoundedToHundreds] = useState<boolean>(false);
	const [activeDiscountPercent, setActiveDiscountPercent] = useState<number>(0);
	const [isWarranty100, setIsWarranty100] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	useEffect(() => {
		const newBase = currentInvoice?.totalAmountRub ?? currentInvoice?.amountRub ?? defaultAmountRub;
		setAmountRub(newBase);
		setCashTenderedRub(newBase);
		setSplitSbpRub(Math.round(newBase / 2));
		setSplitCashRub(newBase - Math.round(newBase / 2));
		setIsWarranty100(false);
		setActiveDiscountPercent(0);
	}, [currentInvoice, defaultAmountRub]);

	const canonicalSplit = useMemo(
		() =>
			calculateCanonicalSplit({
				totalDueRub: amountRub,
				sbpRub: activeMethod === "split" ? splitSbpRub : activeMethod === "sbp" ? amountRub : 0,
				cashRub: activeMethod === "split" ? splitCashRub : activeMethod === "cash" ? amountRub : 0,
				cardRub: activeMethod === "split" ? splitCardRub : activeMethod === "card" ? amountRub : 0,
				receivedCashRub: cashTenderedRub,
			}),
		[amountRub, activeMethod, splitSbpRub, splitCashRub, splitCardRub, cashTenderedRub],
	);

	const splitAllocatedRub = splitSbpRub + splitCashRub + splitCardRub + splitDepositRub;
	const splitRemainingRub = amountRub - splitAllocatedRub;
	const cashChangeRub = canonicalSplit.changeRub;
	const isCashShortage = cashTenderedRub < amountRub;
	const totalAvailableDepositRub = Math.max(0, patientDepositRub) + Math.max(0, patientFamilyBalanceRub);

	const finalizeReceipt = async (method: ShiftReceiptEntry["method"], sum: number) => {
		setIsSubmitting(true);
		playTactileEarcon("pay");
		void clinicalProceduralAudio.playCashierKaching();
		const invId = currentInvoice?.id;
		if (invId) {
			try {
				const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
				await fetch(`/api/invoices/${invId}/pay`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						amountRub: sum,
						method: method === "split" ? "card" : method,
						clientMutationId: `pay-${invId}-${Date.now()}`,
						patientId: currentInvoice.patientId,
					}),
				}).catch(() => null);
			} catch {
				// Fail-soft under Mandate 8e
			}
		}
		const newReceipt: ShiftReceiptEntry = {
			id: `rec-${Date.now().toString().slice(-4)}`,
			number: Date.now().toString().slice(-4),
			time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
			patientName: currentInvoice?.patientName || "Пациент клиники",
			totalRub: sum,
			method,
			items: currentInvoice?.items?.length
				? currentInvoice.items.map((it: any) => ({
						name: it.name || it.title || "Стоматологическая услуга",
						quantity: it.quantity || 1,
						priceRub: it.priceRub || it.price || sum,
						amountRub: it.amountRub || it.amount || sum,
						code804n: it.code804n || "A16.07.002",
					}))
				: [{ name: isWarranty100 ? "Гарантийный прием (100%)" : "Стоматологический приём", quantity: 1, priceRub: sum, amountRub: sum, code804n: "A16.07.002" }],
		};
		setIsSubmitting(false);
		onPaymentCompleted?.(newReceipt);
	};

	return {
		currentInvoice, baseAmountRub, amountRub, setAmountRub, activeMethod, setActiveMethod,
		splitSbpRub, setSplitSbpRub, splitCashRub, setSplitCashRub, splitCardRub, setSplitCardRub,
		splitDepositRub, setSplitDepositRub, cashTenderedRub, setCashTenderedRub,
		isRoundedToHundreds, setIsRoundedToHundreds, activeDiscountPercent, setActiveDiscountPercent,
		isWarranty100, setIsWarranty100, isSubmitting, splitRemainingRub, cashChangeRub,
		isCashShortage, totalAvailableDepositRub, finalizeReceipt,
	};
}
