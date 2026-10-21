import type { CashierInvoiceExportData } from "../types";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import { prepareCashierExportPlanId } from "./planCashierExportPayload";
import type { ExportCashierParams } from "./types";

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

	try {
		const res = await fetch("/api/invoices/generate-from-plan", {
			method: "POST",
			headers: { ...denteAdminSecretRequestHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({
				patientId,
				planId: resolvedPlanId,
				planNumber: resolvedPlanId ? `ПЛАН-№${resolvedPlanId.slice(0, 8).toUpperCase()}` : undefined,
				planTitle: currentTier.title,
				documentType: "invoice",
				items: allItems.map((it, idx) => ({
					itemId: it.id || `item-${idx}`,
					toothNumber: it.toothNumber ?? null,
					nameRu: it.name,
					quantity: it.quantity || 1,
					unitPriceRub: it.unitPriceRub || 0,
					discountRub: it.discountRub || 0,
					code804n: it.code804n || undefined,
					doctorId: it.doctorId ?? null,
				})),
				allowUnplannedServices: true,
				notes,
			}),
		});

		if (!res.ok) {
			const errJson = await res.json().catch(() => ({}));
			const errorMsg = errJson.message || `Ошибка сервера (HTTP ${res.status})`;
			showToast(`Ошибка отправки счета в кассу: ${errorMsg}`, "error", 5000);
			return null;
		}

		const createdData = await res.json();
		if (createdData?.invoiceId) invoiceId = createdData.invoiceId;
		if (createdData?.invoiceNumber) invoiceNumber = createdData.invoiceNumber;
		if (typeof createdData?.totalNetRub === "number") finalNetTotalRub = createdData.totalNetRub;
	} catch (networkErr: any) {
		logger.error("[treatmentPlanNetworkSync] Ошибка сети при генерации счёта", networkErr);
		showToast(`Сетевая ошибка при отправке счета в кассу: ${networkErr?.message || networkErr}`, "error", 5000);
		return null;
	}

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
