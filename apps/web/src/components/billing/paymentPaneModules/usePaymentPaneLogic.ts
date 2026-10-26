/**
 * apps/web/src/components/billing/paymentPaneModules/usePaymentPaneLogic.ts
 *
 * State and lifecycle of the cash register payment pane.
 *
 * Iron rule of this hook: money exists only when the server says so.
 * A receipt is created ONLY after a confirmed 2xx answer from the payments API.
 * A network failure or server rejection never produces a local "paid" receipt —
 * otherwise money would hang in the air: the cashier sees a paid invoice while
 * PostgreSQL has no payment row, and the shift totals diverge from the ledger.
 *
 * Governed by Mandates 8b (<= 120 lines), 8e (zero friction, no blocked buttons), 8n.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { calculateCanonicalSplit, generateUuidV7 } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { playTactileEarcon } from "../../../lib/chairsideErgonomics.js";
import { clinicalProceduralAudio } from "../../../services/audio/clinicalProceduralAudio.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { CashierPaymentMethod, CashRegisterPaymentPaneProps } from "./types.js";
import type { ShiftReceiptEntry } from "../CashRegisterDrawer.js";

interface ServerPaymentResponse {
	readonly id?: string;
	readonly fiscalReceiptNumber?: string | null;
	readonly message?: string;
	readonly error?: string;
}

export function usePaymentPaneLogic(props: CashRegisterPaymentPaneProps) {
	const {
		defaultAmountRub = 0, activeInvoice, invoices, patientDepositRub = 0,
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
	const inFlightRef = useRef<boolean>(false);

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

	/**
	 * Records the payment in PostgreSQL through the real payments API and only
	 * then emits an honest receipt. Returns null when nothing was recorded.
	 */
	const finalizeReceipt = async (
		method: ShiftReceiptEntry["method"],
		sum: number,
		options?: { readonly idempotencyKey?: string | undefined },
	): Promise<ShiftReceiptEntry | null> => {
		if (inFlightRef.current || isSubmitting) return null;
		if (!currentInvoice) {
			showToast("Выберите счёт для оплаты — приём денег без счёта невозможен", "warning");
			return null;
		}
		inFlightRef.current = true;
		setIsSubmitting(true);

		const invId = currentInvoice.id;
		const mutationId = options?.idempotencyKey || generateUuidV7();
		let serverPayment: ServerPaymentResponse | null = null;

		try {
			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json", "Idempotency-Key": mutationId });
			const res = await fetch(`/api/invoices/${invId}/pay`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					amountRub: sum,
					method: method === "split" ? "split" : method,
					// Состав смешанной оплаты: сервер проверяет, что части сходятся в общую сумму до копейки.
					...(method === "split"
						? {
								cashAmountRub: splitCashRub,
								electronicAmountRub: splitCardRub,
								sbpAmountRub: splitSbpRub,
								depositAmountRub: splitDepositRub,
							}
						: {}),
					// Полное списание депозита: сервер гасит аванс атомарно и пишет отдельную строку зачёта.
					...(method === "deposit" ? { depositAmountRub: sum } : {}),
					clientMutationId: mutationId,
					patientId: currentInvoice.patientId,
				}),
			});
			serverPayment = (await res.json().catch(() => null)) as ServerPaymentResponse | null;
			if (!res.ok) {
				const reason = serverPayment?.message || serverPayment?.error || `сервер ответил ошибкой ${res.status}`;
				showToast(`Оплата не проведена: ${reason}. Проверьте счёт и повторите.`, "error");
				return null;
			}
		} catch {
			showToast("Оплата не проведена: нет связи с сервером кассы. Проверьте сеть и повторите.", "error");
			return null;
		} finally {
			inFlightRef.current = false;
			setIsSubmitting(false);
		}

		playTactileEarcon("pay");
		void clinicalProceduralAudio.playCashierKaching();

		const newReceipt: ShiftReceiptEntry = {
			id: serverPayment?.id || mutationId,
			number: serverPayment?.fiscalReceiptNumber || serverPayment?.id || mutationId,
			time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
			patientName: currentInvoice.patientName || "Пациент клиники",
			totalRub: sum,
			method,
			items: currentInvoice.items?.length
				? currentInvoice.items.map((it: any) => ({
						name: it.name || it.title || "Стоматологическая услуга",
						quantity: it.quantity || 1,
						priceRub: it.priceRub || it.price || sum,
						amountRub: it.amountRub || it.amount || sum,
						...(it.code || it.serviceCode ? { code804n: String(it.code || it.serviceCode) } : {}),
					}))
				: [{
						name: isWarranty100 ? "Гарантийный приём (скидка 100%)" : "Стоматологический приём",
						quantity: 1,
						priceRub: sum,
						amountRub: sum,
					}],
		};
		onPaymentCompleted?.(newReceipt);
		return newReceipt;
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
