import type { CashierInvoiceExportData } from "../types";
import { showToast } from "../../GlobalToast";
import { prepareCashierExportPlanId } from "./planCashierExportPayload";
import type { ExportCashierParams } from "./types";
import { callGenerateInvoiceFromPlanApi } from "./generateInvoiceFromPlanApi";

export async function exportPlanToCashier({
	patientId,
	patientName,
	patientPhone,
	doctorName,
	currentPlanId,
	stages,
	currentTier,
	loyaltyDeduction,
	onExportToCashier,
	onPlanSaved,
}: ExportCashierParams): Promise<CashierInvoiceExportData | null> {
	const allItems = stages.flatMap((s) => s.items);
	if (allItems.length === 0) {
		showToast("Нет позиций для формирования счета", "warning", 3000);
		return null;
	}

	const grossTotalRub =
		allItems.reduce((acc, it) => acc + Math.round((it.unitPriceRub || 0) * 100) * (it.quantity || 1), 0) / 100;
	const discountRub =
		allItems.reduce((acc, it) => acc + Math.round((it.discountRub || 0) * 100), 0) / 100;
	const netTotalRub = loyaltyDeduction.netPayableRub;

	const resolvedPlanId = await prepareCashierExportPlanId(patientId, currentPlanId, allItems, currentTier, onPlanSaved);

	const cleanPat = (patientId || "pat").replace(/\D/g, "").slice(0, 4) || "0001";
	let invoiceId = `inv-plan-${Date.now()}-${cleanPat}`;
	let invoiceNumber = `СЧ-${new Date().getFullYear()}-${cleanPat.padStart(4, "0")}`;
	let finalNetTotalRub = netTotalRub;

	const notes = `Счет на оплату по комплексному плану «${currentTier.title}»${
		loyaltyDeduction.appliedBonusRub > 0 ? ` (Списано бонусов: ${loyaltyDeduction.appliedBonusRub} ₽)` : ""
	}`;

	const apiResult = await callGenerateInvoiceFromPlanApi({
		patientId,
		resolvedPlanId,
		planTitle: currentTier.title,
		allItems,
		notes,
	});

	if (apiResult === null) return null;
	if (apiResult.invoiceId) invoiceId = apiResult.invoiceId;
	if (apiResult.invoiceNumber) invoiceNumber = apiResult.invoiceNumber;
	if (apiResult.finalNetTotalRub !== undefined) finalNetTotalRub = apiResult.finalNetTotalRub;

	const exportData: CashierInvoiceExportData = {
		patientId,
		patientName,
		invoiceId,
		invoiceNumber,
		items: allItems,
		grossTotalRub,
		discountRub,
		bonusPointsUsedRub: loyaltyDeduction.appliedBonusRub,
		bonusPointsUsedKopecks: loyaltyDeduction.appliedBonusKopecks,
		netTotalRub: finalNetTotalRub,
		totalAmountRub: finalNetTotalRub,
		status: finalNetTotalRub === 0 ? "warranty_100" : "issued",
		netTotalKopecks: loyaltyDeduction.netPayableKopecks,
		notes,
		createdAtIso: new Date().toISOString(),
	};

	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("dente-invoices-updated", {
				detail: {
					id: invoiceId,
					number: invoiceNumber,
					patientId,
					patientName,
					patientPhone,
					doctorName: doctorName || "Лечащий врач-стоматолог",
					totalAmountRub: finalNetTotalRub,
					paidAmountRub: 0,
					status: finalNetTotalRub === 0 ? "warranty_100" : "issued",
					notes,
				},
			}),
		);
		window.dispatchEvent(new CustomEvent("dente-cashbox-refresh"));
	}

	if (onExportToCashier) onExportToCashier(exportData);
	showToast(`Счет №${invoiceNumber} на сумму ${(finalNetTotalRub || 0).toLocaleString("ru-RU")} ₽ успешно отправлен в кассу!`, "success", 5000);
	return exportData;
}
