/**
 * apps/web/src/components/billing/cashRegisterDrawer/useCashRegisterDrawerState.ts
 *
 * State and telemetry logic for CashRegisterDrawer.
 * Strictly <= 120 lines per Mandate 8b.
 */

import { useState, useEffect, useCallback } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { type ShiftReceiptEntry } from "../cashRegisterDrawerData.js";
import { executeCashDeposit, executeCashWithdrawal, executeShiftXReport, executeShiftZReport } from "./cashRegisterOperations.js";

export function useCashRegisterDrawerState(isOpen: boolean, cashierFullName: string, invoices?: readonly any[]) {
	const [activeTab, setActiveTab] = useState<"payment" | "shift" | "receipts" | "operations">("payment");
	const [selectedReceipt, setSelectedReceipt] = useState<ShiftReceiptEntry | null>(null);
	const [cashInDrawerRub, setCashInDrawerRub] = useState<number>(0);
	const [isShiftOpen, setIsShiftOpen] = useState<boolean>(true);
	// Номер смены и время открытия приходят только из X-отчёта сервера. Пока ответа нет —
	// показываем прочерк вместо выдуманных «14» и «09:00»: фальшивая телеметрия хуже пустой.
	const [shiftNumber, setShiftNumber] = useState<number | null>(null);
	const [openedAt, setOpenedAt] = useState<string>("");
	const [cashTotalRub, setCashTotalRub] = useState<number>(0);
	const [cardTotalRub, setCardTotalRub] = useState<number>(0);
	const [sbpTotalRub, setSbpTotalRub] = useState<number>(0);
	const [grandTotalRub, setGrandTotalRub] = useState<number>(0);
	// Чеки берутся строго из реальных оплаченных счетов и подтверждённых платежей. Никаких демо-заготовок.
	const [receiptsCount, setReceiptsCount] = useState<number>(0);
	const [recentReceipts, setRecentReceipts] = useState<readonly ShiftReceiptEntry[]>([]);

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
		} catch { /* Fail-soft under Mandate 8e */ }
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
					number: String(inv.number || inv.id),
					time: inv.paidAt
						? new Date(inv.paidAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
						: "--:--",
					patientName: inv.patientName || "Пациент клиники",
					totalRub: inv.paidAmountRub || inv.totalAmountRub || 0,
					method: (inv.paymentMethod === "cash"
						? "cash"
						: inv.paymentMethod === "sbp"
							? "sbp"
							: inv.paymentMethod === "deposit"
								? "deposit"
								: "card") as ShiftReceiptEntry["method"],
					items: (inv.items || []).map((it: any) => ({
						name: it.name || it.title || "Стоматологическая услуга",
						quantity: it.quantity || 1,
						priceRub: it.priceRub || it.price || 0,
						amountRub: it.amountRub || it.amount || 0,
						...(it.code || it.serviceCode ? { code804n: String(it.code || it.serviceCode) } : {}),
					})),
				}));
			if (mapped.length > 0) {
				setRecentReceipts(mapped);
				setReceiptsCount(mapped.length);
			}
		}
	}, [invoices]);

	const handleCashDeposit = (amt: number) => executeCashDeposit(amt, (nb) => { if (nb !== undefined) setCashInDrawerRub(nb); });
	const handleCashEncashment = () => executeCashWithdrawal(cashInDrawerRub, (nb) => { if (nb !== undefined) setCashInDrawerRub(nb); });
	const handleXReport = () => executeShiftXReport(cashierFullName, (sn, gt) => { if (sn !== undefined) setShiftNumber(sn); if (gt !== undefined) setGrandTotalRub(gt); });
	const handleZReport = () => executeShiftZReport(() => { setIsShiftOpen(false); void fetchShiftTelemetry(); });

	return {
		activeTab, setActiveTab, selectedReceipt, setSelectedReceipt, cashInDrawerRub, setCashInDrawerRub,
		isShiftOpen, shiftNumber, openedAt, cashTotalRub, setCashTotalRub, cardTotalRub, setCardTotalRub,
		sbpTotalRub, setSbpTotalRub, grandTotalRub, setGrandTotalRub, receiptsCount, setReceiptsCount,
		recentReceipts, setRecentReceipts, handleCashDeposit, handleCashEncashment, handleXReport, handleZReport,
	};
}
