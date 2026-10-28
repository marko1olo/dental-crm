import { useEffect, useState } from "react";

/**
 * useFinanceModalsNavigation — Управление состоянием всех модальных окон экрана финансов.
 * Включает навигацию по хэшу URL и закрытие по клавише Esc.
 */
export function useFinanceModalsNavigation() {
	const [isPnlOpen, setIsPnlOpen] = useState(false);
	const [isInvoicesOpen, setIsInvoicesOpen] = useState(() => {
		if (typeof window !== "undefined") {
			return window.location.hash.toLowerCase().includes("invoices");
		}
		return false;
	});

	const [isCashboxOpen, setIsCashboxOpen] = useState(() => {
		if (typeof window !== "undefined") {
			const h = window.location.hash.toLowerCase();
			return h.includes("cashbox") || h.includes("cashdesk");
		}
		return false;
	});

	const [isFinanceOptionsOpen, setIsFinanceOptionsOpen] = useState(false);
	const [isCashShiftOpen, setIsCashShiftOpen] = useState(false);
	const [isBillingActOpen, setIsBillingActOpen] = useState(false);
	const [isAccountingExportOpen, setIsAccountingExportOpen] = useState(() => {
		if (typeof window !== "undefined") {
			const h = window.location.hash.toLowerCase();
			return h.includes("accounting-export") || h.includes("1c-export");
		}
		return false;
	});
	const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
	const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
	const [isTimesheetT13Open, setIsTimesheetT13Open] = useState(false);
	const [isFamilyBillingOpen, setIsFamilyBillingOpen] = useState(false);
	const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);

	useEffect(() => {
		const handleHash = () => {
			if (typeof window !== "undefined") {
				const h = window.location.hash.toLowerCase();
				setIsInvoicesOpen(h.includes("invoices"));
				if (h.includes("cashbox") || h.includes("cashdesk")) {
					setIsCashboxOpen(true);
				}
				if (h.includes("accounting-export") || h.includes("1c-export")) {
					setIsAccountingExportOpen(true);
				}
			}
		};
		const handleOpenCashboxEvent = () => setIsCashboxOpen(true);
		handleHash();
		window.addEventListener("hashchange", handleHash);
		window.addEventListener("dente:open-cashbox", handleOpenCashboxEvent);
		return () => {
			window.removeEventListener("hashchange", handleHash);
			window.removeEventListener("dente:open-cashbox", handleOpenCashboxEvent);
		};
	}, []);

	// Desktop Keyboard Navigation: Esc closes open financial sub-modals
	useEffect(() => {
		const handleKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape") {
				if (isFinanceOptionsOpen) {
					setIsFinanceOptionsOpen(false);
					return;
				}
				if (isInvoicesOpen) {
					setIsInvoicesOpen(false);
					return;
				}
				if (isPnlOpen) {
					setIsPnlOpen(false);
					return;
				}
				if (isCashShiftOpen) {
					setIsCashShiftOpen(false);
					return;
				}
				if (isCashboxOpen) {
					setIsCashboxOpen(false);
					return;
				}
				if (isBillingActOpen) {
					setIsBillingActOpen(false);
					return;
				}
				if (isQuickExpenseOpen) {
					setIsQuickExpenseOpen(false);
					return;
				}
				if (isTaxModalOpen) {
					setIsTaxModalOpen(false);
					return;
				}
				if (isTimesheetT13Open) {
					setIsTimesheetT13Open(false);
					return;
				}
				if (isFamilyBillingOpen) {
					setIsFamilyBillingOpen(false);
					return;
				}
				if (isSplitPaymentOpen) {
					setIsSplitPaymentOpen(false);
					return;
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isInvoicesOpen,
		isPnlOpen,
		isFinanceOptionsOpen,
		isCashShiftOpen,
		isCashboxOpen,
		isBillingActOpen,
		isQuickExpenseOpen,
		isTaxModalOpen,
		isTimesheetT13Open,
		isFamilyBillingOpen,
		isSplitPaymentOpen,
	]);

	return {
		isBillingActOpen,
		isCashShiftOpen,
		isCashboxOpen,
		isFamilyBillingOpen,
		isFinanceOptionsOpen,
		isInvoicesOpen,
		isPnlOpen,
		isQuickExpenseOpen,
		isSplitPaymentOpen,
		isTaxModalOpen,
		isAccountingExportOpen,
		isTimesheetT13Open,
		setIsAccountingExportOpen,
		setIsBillingActOpen,
		setIsCashShiftOpen,
		setIsCashboxOpen,
		setIsFamilyBillingOpen,
		setIsFinanceOptionsOpen,
		setIsInvoicesOpen,
		setIsPnlOpen,
		setIsQuickExpenseOpen,
		setIsSplitPaymentOpen,
		setIsTaxModalOpen,
		setIsTimesheetT13Open,
	};
}
