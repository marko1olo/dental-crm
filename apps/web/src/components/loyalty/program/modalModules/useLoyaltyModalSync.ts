import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import type { LoyaltyLedgerEntry, PatientReferralRecord } from "../loyaltyEngine";
import { REFERRAL_HYGIENE_1000_PRESET, type ReferralRewardPreset } from "../loyaltyPresets";

export interface UseLoyaltyModalSyncProps {
	readonly isOpen: boolean;
	readonly patientId: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly initialPointsBalance: number;
}

export function useLoyaltyModalSync({
	isOpen,
	patientId,
	patientName,
	medicalCardNumber,
	initialPointsBalance,
}: UseLoyaltyModalSyncProps) {
	const [activePointsBalance, setActivePointsBalance] = useState<number>(initialPointsBalance);
	const [ledgerEntries, setLedgerEntries] = useState<readonly LoyaltyLedgerEntry[]>([]);
	const [referrals, setReferrals] = useState<readonly PatientReferralRecord[]>([]);
	const [selectedReferralPreset, setSelectedReferralPreset] = useState<ReferralRewardPreset>(
		REFERRAL_HYGIENE_1000_PRESET
	);
	const [newReferralName, setNewReferralName] = useState<string>("");
	const [newReferralPhone, setNewReferralPhone] = useState<string>("");
	const [newReferralNote, setNewReferralNote] = useState<string>("");

	useEffect(() => {
		if (!isOpen || !patientId) return;
		let cancelled = false;

		async function loadLoyaltyData() {
			try {
				const headers = denteAdminSecretRequestHeaders();
				const balRes = await fetch(`/api/loyalty/balance/${encodeURIComponent(patientId)}`, { headers });
				if (balRes.ok) {
					const data = await balRes.json();
					if (!cancelled && typeof data.activePoints === "number") {
						setActivePointsBalance(data.activePoints);
					}
				}
				const txRes = await fetch(`/api/loyalty/transactions/${encodeURIComponent(patientId)}`, { headers });
				if (txRes.ok) {
					const data = await txRes.json();
					if (!cancelled && Array.isArray(data.transactions) && data.transactions.length > 0) {
						const mappedTx: LoyaltyLedgerEntry[] = data.transactions.map((t: any) => ({
							id: t.id || `tx-${Date.now()}`,
							timestampIso: t.createdAt ? new Date(t.createdAt).toLocaleString("ru-RU") : new Date().toLocaleString("ru-RU"),
							patientId,
							patientName,
							medicalCardNumber,
							operationType: t.type?.includes("accrual") ? "accrual" : "redemption",
							operationTypeRu: t.type?.includes("accrual") ? "Начисление бонусов" : "Списание бонусов",
							invoiceAmountKop: 0,
							pointsDeltaRub: Number(t.amountPoints) || 0,
							balanceAfterRub: Number(t.balanceAfterPoints) || 0,
							paymentMethodRu: "Бонусный счет",
							staffNameRu: "Система лояльности",
							noteRu: t.description || "Операция с баллами",
						}));
						setLedgerEntries(mappedTx);
					}
				}
			} catch {
				// Silently fail on network/mock offline mode
			}
		}

		void loadLoyaltyData();
		return () => { cancelled = true; };
	}, [isOpen, patientId, patientName, medicalCardNumber]);

	return {
		activePointsBalance,
		setActivePointsBalance,
		ledgerEntries,
		setLedgerEntries,
		referrals,
		setReferrals,
		selectedReferralPreset,
		setSelectedReferralPreset,
		newReferralName,
		setNewReferralName,
		newReferralPhone,
		setNewReferralPhone,
		newReferralNote,
		setNewReferralNote,
	};
}
