import { useState, useMemo, useCallback } from "react";
import type { PatientCabinetFamilyMember, PatientPersonalCabinetData } from "../../patientCabinetEngine";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../../../lib/demoMode.js";
import { RELATIONSHIP_OPTIONS, DEFAULT_FAMILY_MEMBERS } from "./familyConstants";

export function useFamilyTabState(
	data: PatientPersonalCabinetData,
	onShowToast?: ((message: string) => void) | undefined,
) {
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(data.patientId);
	const initialMembers = useMemo(() => {
		if (data.familyMembers && data.familyMembers.length > 0) return data.familyMembers;
		if (isDemo) return DEFAULT_FAMILY_MEMBERS;
		return [];
	}, [data.familyMembers, isDemo]);

	const [members, setMembers] = useState<readonly PatientCabinetFamilyMember[]>(initialMembers);
	const [isAddingMember, setIsAddingMember] = useState(false);
	const [newFullName, setNewFullName] = useState("");
	const [newRelationship, setNewRelationship] = useState(RELATIONSHIP_OPTIONS[0] || "Супруг(а)");
	const [newBirthDate, setNewBirthDate] = useState("");
	const [newPhone, setNewPhone] = useState("");
	const [newCardNumber, setNewCardNumber] = useState("");
	const [newAllowSpend, setNewAllowSpend] = useState(true);
	const [newAllowBooking, setNewAllowBooking] = useState(true);

	const familyBalance = data.familyBalanceRub ?? (isDemo ? 84000 : 0);
	const familyBonusPool = data.familyBonusPool ?? (isDemo ? 18500 : 0);

	const handleToggleBalancePermission = useCallback((memberId: string) => {
		setMembers((prev) =>
			prev.map((m) => {
				if (m.id === memberId) {
					const updated = !m.allowSpendFamilyBalance;
					onShowToast?.(updated ? `Оплата с семейного баланса разрешена для: ${m.fullName}` : `Оплата с семейного баланса приостановлена для: ${m.fullName}`);
					return { ...m, allowSpendFamilyBalance: updated };
				}
				return m;
			}),
		);
	}, [onShowToast]);

	const handleAddMemberSubmit = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		const cleanName = newFullName.trim();
		if (!cleanName) {
			onShowToast?.("Пожалуйста, укажите ФИО члена семьи");
			return;
		}
		const initials = cleanName.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
		const memberSeq = members.length + 1;
		const cleanCard = newCardNumber.trim();
		const assignedCard = cleanCard || (data.cardNumber ? `${data.cardNumber}-${memberSeq}` : `043-СЕМЬЯ-${memberSeq}`);
		const memberId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? `fam-member-${crypto.randomUUID()}` : `fam-member-${data.patientId || "pat"}-${memberSeq}`;

		const newMember: PatientCabinetFamilyMember = {
			id: memberId, fullName: cleanName, relationshipRu: newRelationship,
			birthDate: newBirthDate || undefined, phone: newPhone.trim() || undefined,
			cardNumber: assignedCard, avatarInitials: initials || "ФС",
			allowSpendFamilyBalance: newAllowSpend, allowBooking: newAllowBooking,
		};
		setMembers((prev) => [...prev, newMember]);
		setIsAddingMember(false);
		setNewFullName(""); setNewBirthDate(""); setNewPhone(""); setNewCardNumber("");
		onShowToast?.(`Член семьи ${cleanName} успешно добавлен в семейный профиль`);
	}, [newFullName, newRelationship, newBirthDate, newPhone, newCardNumber, newAllowSpend, newAllowBooking, data.cardNumber, data.patientId, members.length, onShowToast]);

	const cardPlaceholder = data.cardNumber ? `Напр. ${data.cardNumber}-${members.length + 1}` : "Напр. 2026/891";

	return {
		members, isAddingMember, setIsAddingMember,
		newFullName, setNewFullName, newRelationship, setNewRelationship,
		newBirthDate, setNewBirthDate, newPhone, setNewPhone,
		newCardNumber, setNewCardNumber, newAllowSpend, setNewAllowSpend,
		newAllowBooking, setNewAllowBooking, cardPlaceholder,
		familyBalance, familyBonusPool,
		handleToggleBalancePermission, handleAddMemberSubmit,
	};
}
