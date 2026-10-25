import { useState, useMemo } from "react";
import {
	calculateFamilyPoolBalance,
	calculateLoyaltyRedemption,
	calculateTierProgression,
	creditReferralBonus,
	exportLoyaltyLedgerToCsv,
	type PatientReferralRecord,
} from "../loyaltyEngine";
import { showToast } from "../../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { useLoyaltyCertificates } from "../useLoyaltyCertificates";
import { useLoyaltyPromos } from "../useLoyaltyPromos";
import { useLoyaltyFamily } from "../useLoyaltyFamily";
import { useLoyaltyModalSync } from "./useLoyaltyModalSync";
import { executeRedemptionAction } from "./loyaltyRedemptionHandlers";
import type { LoyaltyProgramModalProps } from "../LoyaltyProgramModal";
import type { LoyaltyTabType } from "./LoyaltyModalTabNav";

export function useLoyaltyModalState(props: LoyaltyProgramModalProps) {
	const { isOpen, patientId = "", patientName = "Пациент", medicalCardNumber = "", initialPointsBalance = 0, initialLifetimeSpentKop = 0, currentInvoiceAmountKop = 0, onRedeemSuccess } = props;

	const [activeTab, setActiveTab] = useState<LoyaltyTabType>("balance");
	const [invoiceAmountRub, setInvoiceAmountRub] = useState<number>(currentInvoiceAmountKop / 100);
	const [excludedAmountRub, setExcludedAmountRub] = useState<number>(0);
	const [requestedPointsRub, setRequestedPointsRub] = useState<number>(0);
	const [redemptionSuccessMsg, setRedemptionSuccessMsg] = useState<string | null>(null);
	const [isDoctorOverride, setIsDoctorOverride] = useState<boolean>(false);
	const [ledgerSearch, setLedgerSearch] = useState<string>("");

	const sync = useLoyaltyModalSync({ isOpen, patientId, patientName, medicalCardNumber, initialPointsBalance });
	const familyPool = useMemo(() => calculateFamilyPoolBalance(`fam-${patientId || "group"}`, `Семья (${patientName})`, []), [patientId, patientName]);
	const familyState = useLoyaltyFamily({ patientId, patientName, familyPool, setActivePointsBalance: sync.setActivePointsBalance, setLedgerEntries: sync.setLedgerEntries });
	const certState = useLoyaltyCertificates({ patientId, patientName, invoiceAmountRub });
	const promoState = useLoyaltyPromos({ invoiceAmountRub, setInvoiceAmountRub, onRedeemSuccess, setRedemptionSuccessMsg, setActiveTab });

	const isFamilyActiveEffective = familyState.isFamilyModeActive || Boolean(familyState.selectedFamilyMemberId);
	const computedFamilyPool = useMemo(() => calculateFamilyPoolBalance(`fam-${patientId || "group"}`, `Семья (${patientName})`, familyState.familyMembers), [patientId, patientName, familyState.familyMembers]);
	const tierProgression = useMemo(() => calculateTierProgression(initialLifetimeSpentKop, isFamilyActiveEffective), [initialLifetimeSpentKop, isFamilyActiveEffective]);
	const currentTier = tierProgression.currentTier;
	const effectiveBalanceRub = isFamilyActiveEffective ? computedFamilyPool.totalPooledPoints : sync.activePointsBalance;

	const redemptionCalc = useMemo(() => calculateLoyaltyRedemption({
		grossInvoiceKop: Math.round(invoiceAmountRub * 100), discountKop: 0, excludedFromRedemptionKop: Math.round(excludedAmountRub * 100), availablePointsBalanceRub: effectiveBalanceRub, requestedPointsRub, tierId: currentTier.id, isDoctorOverride,
	}), [invoiceAmountRub, excludedAmountRub, effectiveBalanceRub, requestedPointsRub, currentTier.id, isDoctorOverride]);

	const selectedFamilyMember = familyState.familyMembers.find((m) => m.patientId === familyState.selectedFamilyMemberId);

	const handleExecuteRedemption = () => executeRedemptionAction({
		redemptionCalc, invoiceAmountRub, effectiveBalanceRub, isDoctorOverride, patientId, patientName, medicalCardNumber, currentTier, selectedFamilyMember, computedFamilyPool, setActivePointsBalance: sync.setActivePointsBalance, setLedgerEntries: sync.setLedgerEntries, setRedemptionSuccessMsg, onRedeemSuccess,
	});

	const handleAddReferral = () => {
		if (!sync.newReferralName.trim()) { showToast("Укажите имя друга/родственника", "warning"); return; }
		const newRec: PatientReferralRecord = { id: `ref-${Date.now().toString().slice(-4)}`, referrerPatientId: patientId || "pat-current", referrerPatientName: patientName, invitedPatientName: sync.newReferralName.trim(), invitedPatientPhone: sync.newReferralPhone.trim() || undefined, createdAtIso: new Date().toISOString(), status: "registered", rewardPreset: sync.selectedReferralPreset, rewardRub: sync.selectedReferralPreset.referrerRewardRub, isRewardCredited: false, noteRu: sync.newReferralNote.trim() || sync.selectedReferralPreset.descriptionRu };
		sync.setReferrals((prev) => [newRec, ...prev]);
		sync.setNewReferralName(""); sync.setNewReferralPhone(""); sync.setNewReferralNote("");
		showToast(`Рекомендация «${newRec.invitedPatientName}» зарегистрирована`, "success");
	};

	const handleCreditReferral = (refId: string) => {
		const targetRef = sync.referrals.find((r) => r.id === refId);
		if (!targetRef || targetRef.isRewardCredited) return;
		const credited = creditReferralBonus(targetRef, effectiveBalanceRub);
		sync.setReferrals((prev) => prev.map((r) => (r.id === refId ? credited.updatedReferral : r)));
		sync.setActivePointsBalance((prev) => prev + credited.bonusRub);
		sync.setLedgerEntries((prev) => [credited.ledgerEntry, ...prev]);
		showToast(`Начислено ${credited.bonusRub} ₽ бонусов за рекомендацию!`, "success");
		if (patientId) {
			fetch("/api/loyalty/accrue", { method: "POST", headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() }, body: JSON.stringify({ patientId, amountPoints: credited.bonusRub, description: `Бонус за рекомендацию: ${targetRef.invitedPatientName}` }) }).catch(() => {});
		}
	};

	const handleExportLedger = () => {
		const csv = exportLoyaltyLedgerToCsv(sync.ledgerEntries);
		const link = document.createElement("a");
		link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
		link.download = `dente_loyalty_ledger_${patientName.replace(/\s+/g, "_")}.csv`;
		link.click();
	};

	const filteredLedger = sync.ledgerEntries.filter((e) => e.patientName.toLowerCase().includes(ledgerSearch.toLowerCase()) || e.operationTypeRu.toLowerCase().includes(ledgerSearch.toLowerCase()) || e.noteRu.toLowerCase().includes(ledgerSearch.toLowerCase()));

	return {
		activeTab, setActiveTab, invoiceAmountRub, setInvoiceAmountRub, excludedAmountRub, setExcludedAmountRub, requestedPointsRub, setRequestedPointsRub, redemptionSuccessMsg, isDoctorOverride, setIsDoctorOverride, ledgerSearch, setLedgerSearch, filteredLedger, currentTier, tierProgression, computedFamilyPool, effectiveBalanceRub, redemptionCalc, familyState, certState, promoState, sync, handleExecuteRedemption, handleAddReferral, handleCreditReferral, handleExportLedger,
	};
}
