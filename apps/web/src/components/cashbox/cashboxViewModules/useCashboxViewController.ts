/**
 * apps/web/src/components/cashbox/cashboxViewModules/useCashboxViewController.ts
 *
 * Layer 3: State, Custom Hook & Business Controller for CashboxView.
 * Strict Verbatim Extraction: preserves 100% of state mechanics and side effects.
 */

import { useState, useEffect, useCallback } from "react";
import {
	createCompositeIdempotencyKey,
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";
import {
	validateBuyerInn54Fz,
	process100PercentDiscountCheckout,
	allocateRemainderToTender,
	type PayerLegalType,
	type TenderAllocationTarget,
	type MultiTenderStateRub,
} from "../../finance/cashboxOperations.js";
import type { PaymentMethodTab } from "../../finance/PaymentModal.js";
import { showToast } from "../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type {
	CashboxViewProps,
	CashBoxSummary,
	CashboxControllerReturn,
	PendingInvoiceItem,
} from "./types.js";

let zeroReceiptMutationSeq = 0;

export function useCashboxViewController(props: CashboxViewProps): CashboxControllerReturn {
	const {
		initialShiftOpen = true,
		cashierName = "Администратор / Врач",
		initialAmountRub = 0,
		patientId,
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		visitId,
		documentId,
		onPaymentComplete,
	} = props;

	// Cash Boxes & Shift State from backend
	const [cashBoxes, setCashBoxes] = useState<readonly CashBoxSummary[]>([]);
	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(initialShiftOpen);
	const [mainCashBoxId, setMainCashBoxId] = useState<string | null>(null);

	// Payer & 54-FZ State
	const [payerType, setPayerType] = useState<PayerLegalType>("physical_person");
	const [buyerInn, setBuyerInn] = useState("");
	const [grossAmountRub, setGrossAmountRub] = useState<number>(initialAmountRub);
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [isWarranty, setIsWarranty] = useState<boolean>(false);
	const [isStaffColleague, setIsStaffColleague] = useState<boolean>(false);
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
	const [isRetailModalOpen, setIsRetailModalOpen] = useState<boolean>(false);
	const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethodTab>("card_terminal");
	const [isSubmittingZeroReceipt, setIsSubmittingZeroReceipt] = useState<boolean>(false);
	const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoiceItem | null>(null);

	// Tender Allocations
	const [tenders, setTenders] = useState<MultiTenderStateRub>({
		cardRub: 0,
		cashRub: 0,
		sbpRub: 0,
		depositRub: 0,
		familyRub: 0,
	});

	// Effective patient deposit & family balances (propagated from props or fetched from live patient profile)
	const [effectiveDepositRub, setEffectiveDepositRub] = useState<number>(patientDepositRub);
	const [effectiveFamilyBalanceRub, setEffectiveFamilyBalanceRub] = useState<number>(patientFamilyBalanceRub);

	useEffect(() => {
		if (patientDepositRub > 0) {
			setEffectiveDepositRub(patientDepositRub);
		} else if (patientId) {
			fetch(`/api/patients/${patientId}`, {
				headers: denteAdminSecretRequestHeaders(),
			})
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					const p = data?.patient || data;
					if (p && typeof p.balanceRub === "number" && p.balanceRub > 0) {
						setEffectiveDepositRub(p.balanceRub);
					} else if (p && typeof p.depositRub === "number" && p.depositRub > 0) {
						setEffectiveDepositRub(p.depositRub);
					}
					if (p && typeof p.familyBalanceRub === "number" && p.familyBalanceRub > 0) {
						setEffectiveFamilyBalanceRub(p.familyBalanceRub);
					}
				})
				.catch(() => {});
		}
	}, [patientId, patientDepositRub, patientFamilyBalanceRub]);

	// Load 6 Cash Boxes and live shift state from backend
	const loadCashBoxes = useCallback(async () => {
		try {
			const res = await fetch("/api/cash/cash-box", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const json = await res.json();
				if (Array.isArray(json.data)) {
					setCashBoxes(json.data);
					const main = json.data.find((b: { type: string }) => b.type === "main");
					if (main) {
						setMainCashBoxId(main.id);
						if (typeof main.isShiftOpen === "boolean") {
							setIsShiftOpen(main.isShiftOpen);
						}
					}
				}
			}
		} catch {
			// Soft fallback if network unreachable
		}
	}, []);

	useEffect(() => {
		void loadCashBoxes();
	}, [loadCashBoxes]);

	// Shift Management Handlers connected to backend /api/cash/*
	const handleOpenShift = async () => {
		const res = await fetch("/api/cash/cash-box-all-open", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ cashierFullName: cashierName }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка открытия смены");
		}
		setIsShiftOpen(true);
		void loadCashBoxes();
	};

	const handleCloseShift = async () => {
		const res = await fetch("/api/cash/cash-box-all-closing", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({ zReportNumber: `Z-DAILY-${Date.now()}` }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка закрытия смены");
		}
		setIsShiftOpen(false);
		void loadCashBoxes();
	};

	const handlePrintXReport = async () => {
		const res = await fetch("/api/cash/x-report", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка печати X-отчета");
		}
	};

	const handleCashIn = async (amountRub: number, basis: string) => {
		if (!mainCashBoxId) {
			showToast("Основная касса не определена", "error");
			return;
		}
		const res = await fetch("/api/cash/cash-introduction", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				cashBoxId: mainCashBoxId,
				amountRub,
				reasonText: basis,
			}),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка внесения наличных");
		}
		void loadCashBoxes();
	};

	const handleCashOut = async (amountRub: number, basis: string, recipientFio?: string) => {
		if (!mainCashBoxId) {
			showToast("Основная касса не определена", "error");
			return;
		}
		const res = await fetch("/api/cash/cash-withdrawal", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify({
				cashBoxId: mainCashBoxId,
				amountRub,
				reasonText: basis,
				recipientFio,
			}),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message || "Ошибка инкассации / изъятия наличных");
		}
		void loadCashBoxes();
	};

	// INN Validation (54-FZ Tag 1228: Physical person never blocked)
	const innValidation = validateBuyerInn54Fz({
		payerType,
		buyerInn,
	});

	// Checkout & Doctor Discount Calculation
	const checkoutResult = process100PercentDiscountCheckout({
		totalGrossRub: grossAmountRub,
		discountPercent,
		isWarrantyRework: isWarranty,
		isStaffColleague,
	});

	const handleAllocateAll = (target: TenderAllocationTarget) => {
		const updated = allocateRemainderToTender({
			totalDueRub: checkoutResult.totalNetRub,
			currentTenders: tenders,
			targetTender: target,
		});
		setTenders(updated);
	};

	const handleOpenPaymentWithMethod = (method: PaymentMethodTab) => {
		setActivePaymentMethod(method);
		setIsPaymentModalOpen(true);
	};

	// Process 100% Discount Checkout (0 ₽ receipt) via real billing endpoint with idempotency key
	const handleProcessZeroDiscountCheckout = async () => {
		if (isSubmittingZeroReceipt) return;
		setIsSubmittingZeroReceipt(true);
		try {
			const idempotencyKey = createCompositeIdempotencyKey(
				`cashbox-0-receipt-${patientId || "walkin"}-${Date.now()}-${zeroReceiptMutationSeq++}`,
			);

			const notesReason = isWarranty
				? "100% скидка: Гарантийная переделка"
				: isStaffColleague
					? "100% скидка: Лечение коллеги / персонала"
					: `Скидка врача ${discountPercent}%`;

			const res = await fetch("/api/billing/payments", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": idempotencyKey,
				}),
				body: JSON.stringify({
					patientId: patientId || undefined,
					visitId: visitId || undefined,
					documentId: documentId || undefined,
					amountRub: 0,
					method: "cash",
					clientMutationId: idempotencyKey,
					notes: notesReason,
				}),
			});

			if (res.ok) {
				const receiptData = await res.json();
				showToast("Чек 0 ₽ (100% скидка) успешно зафиксирован в системе", "success");
				onPaymentComplete?.(receiptData);
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка проведения расчета 0 ₽", "error");
			}
		} catch {
			showToast("Ошибка сети при проведении 100% чека", "error");
		} finally {
			setIsSubmittingZeroReceipt(false);
		}
	};

	const handleAddAmountPreset = (rub: number) => {
		const currentKop = rubToKopecks(grossAmountRub);
		const addKop = rubToKopecks(rub);
		setGrossAmountRub(kopecksToRub(currentKop + addKop));
	};

	const resetDiscount = () => {
		setIsWarranty(false);
		setIsStaffColleague(false);
		setDiscountPercent(0);
	};

	const handlePayInvoice = (inv: PendingInvoiceItem) => {
		setSelectedInvoice(inv);
		setGrossAmountRub(inv.totalAmountRub);
		resetDiscount();
		setIsPaymentModalOpen(true);
	};

	const handleInvoicePaymentSuccess = (receipt: any) => {
		setSelectedInvoice(null);
		window.dispatchEvent(new CustomEvent("dente-invoices-updated"));
		window.dispatchEvent(new CustomEvent("dente-cashbox-refresh"));
		void loadCashBoxes();
	};

	return {
		cashBoxes,
		isShiftOpen,
		mainCashBoxId,
		payerType,
		setPayerType,
		buyerInn,
		setBuyerInn,
		grossAmountRub,
		setGrossAmountRub,
		discountPercent,
		setDiscountPercent,
		isWarranty,
		setIsWarranty,
		isStaffColleague,
		setIsStaffColleague,
		isPaymentModalOpen,
		setIsPaymentModalOpen,
		isRetailModalOpen,
		setIsRetailModalOpen,
		activePaymentMethod,
		setActivePaymentMethod,
		isSubmittingZeroReceipt,
		tenders,
		setTenders,
		effectiveDepositRub,
		effectiveFamilyBalanceRub,
		innValidation,
		checkoutResult,
		selectedInvoice,
		setSelectedInvoice,
		handlePayInvoice,
		handleInvoicePaymentSuccess,
		handleOpenShift,
		handleCloseShift,
		handlePrintXReport,
		handleCashIn,
		handleCashOut,
		handleAllocateAll,
		handleOpenPaymentWithMethod,
		handleProcessZeroDiscountCheckout,
		handleAddAmountPreset,
		resetDiscount,
	};
}
