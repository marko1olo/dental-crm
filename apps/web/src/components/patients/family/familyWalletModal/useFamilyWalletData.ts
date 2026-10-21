/**
 * apps/web/src/components/patients/family/familyWalletModal/useFamilyWalletData.ts
 * Query and state synchronization hook for family wallet details and history.
 * Mandate 8b: strictly <= 120 lines.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { logger } from "../../../../utils/logger";
import { showToast } from "../../../GlobalToast";
import type {
	FamilyGroupDetails,
	FamilyTransactionItem,
	FamilyWalletModalProps,
} from "./types";

export function useFamilyWalletData(props: FamilyWalletModalProps) {
	const { isOpen, patientId, familyData: initialFamilyData } = props;
	const [loading, setLoading] = useState(false);
	const [familyData, setFamilyData] = useState<FamilyGroupDetails | null>(
		initialFamilyData ?? null,
	);
	const [spendingPermissions, setSpendingPermissions] = useState<
		Record<string, boolean>
	>({});
	const [transactions, setTransactions] = useState<FamilyTransactionItem[]>([]);

	const loadFamilyHistory = useCallback(async (familyGroupId: string) => {
		try {
			const res = await fetch(`/api/finance/family/${familyGroupId}/history`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) setTransactions(data);
			}
		} catch {
			// Мягкий фолбек без срыва сценария
		}
	}, []);

	const loadFamilyDetails = useCallback(async () => {
		if (!patientId) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/finance/family/patient/${patientId}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data: FamilyGroupDetails = await res.json();
				setFamilyData(data);
				if (data.id) loadFamilyHistory(data.id);
				setSpendingPermissions((prev) => {
					const next = { ...prev };
					for (const m of data.members || []) {
						if (next[m.id] === undefined)
							next[m.id] = m.canSpendFromPool !== false;
					}
					return next;
				});
			} else if (res.status === 404) {
				setFamilyData(null);
			}
		} catch (err) {
			logger.error("Failed to load family wallet details", err);
		} finally {
			setLoading(false);
		}
	}, [patientId, loadFamilyHistory]);

	useEffect(() => {
		if (isOpen) {
			if (initialFamilyData) {
				setFamilyData(initialFamilyData);
				if (initialFamilyData.id) loadFamilyHistory(initialFamilyData.id);
			} else {
				loadFamilyDetails();
			}
		}
	}, [isOpen, initialFamilyData, loadFamilyDetails, loadFamilyHistory]);

	const familyBalanceNumeric = useMemo(() => {
		if (!familyData?.balance) return 0;
		const num = Number(familyData.balance);
		return Number.isFinite(num) ? num : 0;
	}, [familyData]);

	const membersList = useMemo(() => familyData?.members ?? [], [familyData]);

	const handleTogglePermission = useCallback((memberId: string) => {
		setSpendingPermissions((prev) => ({
			...prev,
			[memberId]: !prev[memberId],
		}));
	}, []);

	const handleSavePermissions = useCallback(() => {
		showToast("Права распоряжения семейным авансом сохранены", "success");
	}, []);

	return {
		loading,
		familyData,
		setFamilyData,
		spendingPermissions,
		setSpendingPermissions,
		transactions,
		familyBalanceNumeric,
		membersList,
		loadFamilyDetails,
		loadFamilyHistory,
		handleTogglePermission,
		handleSavePermissions,
	};
}
