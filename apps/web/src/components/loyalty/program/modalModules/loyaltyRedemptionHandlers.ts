import { showToast } from "../../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import {
	debitFamilySharedBalance,
	type Fiscal54FzSplitResult,
	type LoyaltyLedgerEntry,
	type LoyaltyRedemptionResult,
} from "../loyaltyEngine";

export type LoyaltyFamilyRole = "Глава семьи" | "Супруг / Супруга" | "Ребенок" | "Родитель" | "Родственник";

export interface ExecuteRedemptionParams {
	readonly redemptionCalc: LoyaltyRedemptionResult;
	readonly invoiceAmountRub: number;
	readonly effectiveBalanceRub: number;
	readonly isDoctorOverride: boolean;
	readonly patientId: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly currentTier: { readonly id: string; readonly nameRu: string };
	readonly selectedFamilyMember: { readonly patientId: string; readonly fullName: string; readonly roleRu: LoyaltyFamilyRole } | undefined;
	readonly computedFamilyPool: { readonly familyName: string; readonly totalPooledPoints: number };
	readonly setActivePointsBalance: (cb: (prev: number) => number) => void;
	readonly setLedgerEntries: (cb: (prev: readonly LoyaltyLedgerEntry[]) => readonly LoyaltyLedgerEntry[]) => void;
	readonly setRedemptionSuccessMsg: (msg: string) => void;
	readonly onRedeemSuccess?: ((redeemedPointsRub: number, fiscalSplit: Fiscal54FzSplitResult) => void) | undefined;
}

export function executeRedemptionAction(p: ExecuteRedemptionParams): void {
	const { redemptionCalc, invoiceAmountRub, effectiveBalanceRub, isDoctorOverride, patientId, patientName, medicalCardNumber, currentTier, selectedFamilyMember, computedFamilyPool, setActivePointsBalance, setLedgerEntries, setRedemptionSuccessMsg, onRedeemSuccess } = p;

	if (redemptionCalc.actualRedeemedPointsRub <= 0) {
		if (invoiceAmountRub <= 0) showToast("Сумма счета не указана. Введите сумму к оплате", "warning");
		else if (effectiveBalanceRub <= 0 && !isDoctorOverride) showToast("На балансе нет бонусов. Включите «Привилегия врача» для гарантийного 100% покрытия", "info");
		else showToast("Укажите сумму бонусов для списания", "warning");
		return;
	}

	if (selectedFamilyMember) {
		const famResult = debitFamilySharedBalance({
			familyGroupId: `fam-${patientId || "group"}`,
			familyName: computedFamilyPool.familyName,
			sponsorPatientId: patientId,
			sponsorFullName: patientName,
			targetPatientId: selectedFamilyMember.patientId,
			targetPatientName: selectedFamilyMember.fullName,
			targetRoleRu: selectedFamilyMember.roleRu,
			invoiceAmountKop: Math.round(invoiceAmountRub * 100),
			availableFamilyPointsRub: computedFamilyPool.totalPooledPoints,
			requestedPointsRub: redemptionCalc.actualRedeemedPointsRub,
			allowFullCoverage: isDoctorOverride,
			staffNameRu: "Администратор (Касса)",
		});
		setActivePointsBalance(() => famResult.remainingFamilyBalanceRub);
		setLedgerEntries((prev) => [famResult.ledgerEntry, ...prev]);
		setRedemptionSuccessMsg(famResult.messageRu);
		showToast(famResult.messageRu, "success");
		if (onRedeemSuccess) onRedeemSuccess(famResult.debitedPointsRub, famResult.fiscal54FzSplit);
		return;
	}

	setActivePointsBalance((prev) => prev - redemptionCalc.actualRedeemedPointsRub);
	const newLedgerItem: LoyaltyLedgerEntry = {
		id: `tx-${Date.now().toString().slice(-4)}`,
		timestampIso: new Date().toLocaleString("ru-RU"),
		patientId,
		patientName,
		medicalCardNumber,
		operationType: "redemption",
		operationTypeRu: isDoctorOverride ? `Списание бонусов: Привилегия врача 100% (${currentTier.nameRu})` : `Списание бонусов (${currentTier.nameRu})`,
		invoiceAmountKop: Math.round(invoiceAmountRub * 100),
		pointsDeltaRub: -redemptionCalc.actualRedeemedPointsRub,
		balanceAfterRub: effectiveBalanceRub - redemptionCalc.actualRedeemedPointsRub,
		paymentMethodRu: "Бонусы + Касса",
		staffNameRu: "Администратор (Касса)",
		noteRu: isDoctorOverride ? `Гарантийное покрытие врача: списание бонусов ${redemptionCalc.actualRedeemedPointsRub} ₽ по счету` : `Оплата бонусами ${redemptionCalc.actualRedeemedPointsRub} ₽ по счету`,
	};
	setLedgerEntries((prev) => [newLedgerItem, ...prev]);
	setRedemptionSuccessMsg(`Успешно списано ${redemptionCalc.actualRedeemedPointsRub} бонусов. К оплате: ${redemptionCalc.remainingPayableRub.toLocaleString("ru-RU")} ₽`);
	showToast(`Успешно списано ${redemptionCalc.actualRedeemedPointsRub} бонусов в чек`, "success");

	if (patientId) {
		fetch("/api/loyalty/redeem", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({ patientId, invoiceAmountRub, pointsToRedeem: redemptionCalc.actualRedeemedPointsRub, allowFullCoverage: isDoctorOverride, description: isDoctorOverride ? `Гарантийное покрытие: ${redemptionCalc.actualRedeemedPointsRub} ₽` : `Списание бонусов: ${redemptionCalc.actualRedeemedPointsRub} ₽` }),
		}).catch((err) => console.warn("[Loyalty] Sync error:", err));
	}

	if (onRedeemSuccess) onRedeemSuccess(redemptionCalc.actualRedeemedPointsRub, redemptionCalc.fiscal54FzSplit);
}
