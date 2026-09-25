import { useState } from "react";
import {
	creditFamilySharedBalance,
	type FamilyMember,
	type LoyaltyLedgerEntry,
	type FamilyPointsPool,
} from "./loyaltyEngine";
import { showToast } from "../../GlobalToast";

const EMPTY_FAMILY_MEMBERS: readonly FamilyMember[] = [];

export interface UseLoyaltyFamilyProps {
	readonly patientId: string;
	readonly patientName: string;
	readonly familyPool: FamilyPointsPool;
	readonly setActivePointsBalance: React.Dispatch<React.SetStateAction<number>>;
	readonly setLedgerEntries: React.Dispatch<React.SetStateAction<readonly LoyaltyLedgerEntry[]>>;
}

export function useLoyaltyFamily({
	patientId,
	patientName,
	familyPool,
	setActivePointsBalance,
	setLedgerEntries,
}: UseLoyaltyFamilyProps) {
	const [familyMembers, setFamilyMembers] = useState<readonly FamilyMember[]>(EMPTY_FAMILY_MEMBERS);
	const [isFamilyModeActive, setIsFamilyModeActive] = useState<boolean>(false);
	const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>("");
	const [newMemberName, setNewMemberName] = useState<string>("");
	const [newMemberRole, setNewMemberRole] = useState<string>("Супруг / Супруга");

	const handleCreditFamilyBalance = (amountRub: number) => {
		if (amountRub <= 0) {
			showToast("Укажите сумму для пополнения семейного баланса", "warning");
			return;
		}
		const creditResult = creditFamilySharedBalance({
			familyGroupId: `fam-${patientId || "group"}`,
			familyName: familyPool.familyName,
			payerPatientId: patientId,
			payerFullName: patientName,
			currentFamilyBalanceRub: familyPool.totalPooledPoints,
			amountToAddRub: amountRub,
			reasonRu: `Пополнение семейного счета «${familyPool.familyName}» (Плательщик: ${patientName})`,
			staffNameRu: "Администратор / Касса",
		});

		setActivePointsBalance((prev) => prev + creditResult.creditedPointsRub);
		setLedgerEntries((prev) => [creditResult.ledgerEntry, ...prev]);
		showToast(creditResult.messageRu, "success");
	};

	const handleAddFamilyMember = () => {
		if (!newMemberName.trim()) {
			showToast("Укажите ФИО родственника для добавления в семейный пул", "warning");
			return;
		}
		const member: FamilyMember = {
			patientId: `pat-${Date.now().toString().slice(-4)}`,
			fullName: newMemberName.trim(),
			roleRu: newMemberRole,
			individualPointsBalance: 500,
			lifetimeSpentKop: 0,
			isBonusSpendingAllowed: true,
		};
		setFamilyMembers((prev) => [...prev, member]);
		setNewMemberName("");
		showToast(`Член семьи «${member.fullName}» успешно добавлен в семейный пул`, "success");
	};

	const handleToggleMemberPermission = (pId: string) => {
		setFamilyMembers((prev) =>
			prev.map((m) =>
				m.patientId === pId ? { ...m, isBonusSpendingAllowed: !m.isBonusSpendingAllowed } : m
			)
		);
	};

	return {
		familyMembers,
		setFamilyMembers,
		isFamilyModeActive,
		setIsFamilyModeActive,
		selectedFamilyMemberId,
		setSelectedFamilyMemberId,
		newMemberName,
		setNewMemberName,
		newMemberRole,
		setNewMemberRole,
		handleCreditFamilyBalance,
		handleAddFamilyMember,
		handleToggleMemberPermission,
	};
}
