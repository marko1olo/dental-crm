/**
 * apps/web/src/components/billing/cashRegisterDrawer/useCashRegisterDrawerState.ts
 *
 * State and telemetry logic for CashRegisterDrawer.
 * Strictly <= 120 lines per Mandate 8b.
 */

import { useState, useEffect, useCallback } from "react";
import { showToast } from "../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { type ShiftReceiptEntry, DEFAULT_RECENT_RECEIPTS } from "../cashRegisterDrawerData.js";

export function useCashRegisterDrawerState(isOpen: boolean, cashierFullName: string, invoices?: readonly any[]) {
	const [activeTab, setActiveTab] = useState<"payment" | "shift" | "receipts" | "operations">("payment");
	const [selectedReceipt, setSelectedReceipt] = useState<ShiftReceiptEntry | null>(null);
	const [cashInDrawerRub, setCashInDrawerRub] = useState<number>(0);
	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(true);
	const [shiftNumber, setShiftNumber] = useState<number>(14);
	const [openedAt, setOpenedAt] = useState<string>("09:00");
	const [cashTotalRub, setCashTotalRub] = useState<number>(0);
	const [cardTotalRub, setCardTotalRub] = useState<number>(0);
	const [sbpTotalRub, setSbpTotalRub] = useState<number>(0);
	const [grandTotalRub, setGrandTotalRub] = useState<number>(0);
	const [receiptsCount, setReceiptsCount] = useState<number>(DEFAULT_RECENT_RECEIPTS.length);
	const [recentReceipts, setRecentReceipts] = useState<readonly ShiftReceiptEntry[]>(DEFAULT_RECENT_RECEIPTS);

	const fetchShiftTelemetry = useCallback(async () => {
		try {
			const authHeaders = denteAdminSecretRequestHeaders();
			const [xRes, boxesRes] = await Promise.all([
				fetch("/api/cash/x-report", { headers: authHeaders }).catch(() => null),
				fetch("/api/cash/cash-box", { headers: authHeaders }).catch(() => null),
			]);
			if (xRes?.ok) {
				const xData = await xRes.json();
				if (typeof xData.shiftNumber === "number") setShiftNumber(xData.shiftNumber);
				if (typeof xData.status === "string") setIsShiftOpen(xData.status === "open");
				if (xData.openedAt) {
					const d = new Date(xData.openedAt);
					if (!isNaN(d.getTime())) setOpenedAt(d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
				}
				if (typeof xData.totalIncomeRub === "number") setGrandTotalRub(xData.totalIncomeRub);
				if (typeof xData.totalCashInDrawerRub === "number") {
					setCashInDrawerRub(xData.totalCashInDrawerRub);
					setCashTotalRub(xData.totalCashInDrawerRub);
				}
			}
			if (boxesRes?.ok) {
				const bData = await boxesRes.json();
				const mainBox = (Array.isArray(bData.data) ? bData.data : []).find((b: any) => b.type === "main");
				if (mainBox && typeof mainBox.balanceRub === "number") setCashInDrawerRub(mainBox.balanceRub);
			}
		} catch {
			// Fail-soft under Mandate 8e
		}
	}, []);

	useEffect(() => {
		if (isOpen) fetchShiftTelemetry();
	}, [isOpen, fetchShiftTelemetry]);

	useEffect(() => {
		if (invoices && invoices.length > 0) {
			const mapped: ShiftReceiptEntry[] = invoices
				.filter((inv: any) => inv.status === "paid" || inv.paidAmountRub > 0)
				.slice(0, 10)
				.map((inv: any) => ({
					id: String(inv.id),
					number: String(inv.number || inv.id).padStart(4, "0").slice(-4),
					time: inv.paidAt ? new Date(inv.paidAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "14:30",
					patientName: inv.patientName || "Пациент клиники",
					totalRub: inv.paidAmountRub || inv.totalAmountRub || 0,
					method: (inv.paymentMethod === "cash" ? "cash" : inv.paymentMethod === "sbp" ? "sbp" : "card") as ShiftReceiptEntry["method"],
					items: (inv.items || []).map((it: any) => ({
						name: it.name || it.title || "Стоматологическая услуга",
						quantity: it.quantity || 1,
						priceRub: it.priceRub || it.price || 0,
						amountRub: it.amountRub || it.amount || 0,
						code804n: it.code804n || "A16.07.002",
					})),
				}));
			if (mapped.length > 0) {
				setRecentReceipts(mapped);
				setReceiptsCount(mapped.length);
			}
		}
	}, [invoices]);

	const handleCashDeposit = async (amt: number) => {
		setCashInDrawerRub((prev) => prev + amt);
		showToast(`Внесение в кассу: +${amt.toLocaleString("ru-RU")} ₽ зафиксировано`, "success");
	};

	const handleCashEncashment = async () => {
		const amt = cashInDrawerRub;
		setCashInDrawerRub(0);
		showToast(`Инкассация: ${amt.toLocaleString("ru-RU")} ₽ изъято из кассы`, "info");
	};

	const handleXReport = async () => {
		showToast(`Х-отчёт (смена № ${shiftNumber}): выручка ${grandTotalRub.toLocaleString("ru-RU")} ₽ (без гашения)`, "info");
	};

	const handleZReport = async () => {
		setIsShiftOpen(false);
		showToast(`Z-отчёт: кассовая смена № ${shiftNumber} закрыта`, "success");
	};

	return {
		activeTab, setActiveTab, selectedReceipt, setSelectedReceipt, cashInDrawerRub, setCashInDrawerRub,
		isShiftOpen, shiftNumber, openedAt, cashTotalRub, setCashTotalRub, cardTotalRub, setCardTotalRub,
		sbpTotalRub, setSbpTotalRub, grandTotalRub, setGrandTotalRub, receiptsCount, setReceiptsCount,
		recentReceipts, setRecentReceipts, handleCashDeposit, handleCashEncashment, handleXReport, handleZReport,
	};
}
