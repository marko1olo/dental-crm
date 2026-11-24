import { useState, useMemo, useCallback } from "react";
import { generateUuidV7 } from "@dental/shared";
import type { PatientCabinetFamilyMember, PatientPersonalCabinetData } from "../../patientCabinetEngine";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../../../lib/demoMode.js";
import { RELATIONSHIP_OPTIONS, DEFAULT_FAMILY_MEMBERS } from "./familyConstants";

function getPortalAuthHeaders(includeIdempotency = false): HeadersInit {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (includeIdempotency) {
		headers["Idempotency-Key"] = generateUuidV7();
	}
	const token = typeof localStorage !== "undefined" ? localStorage.getItem("dente_portal_token") : null;
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}
	return headers;
}

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

	const handleToggleBalancePermission = useCallback(async (memberId: string) => {
		const targetMember = members.find((m) => m.id === memberId);
		if (!targetMember) return;
		const nextPermission = !targetMember.allowSpendFamilyBalance;

		// Оптимистичное обновление UI
		setMembers((prev) =>
			prev.map((m) => {
				if (m.id === memberId) {
					return { ...m, allowSpendFamilyBalance: nextPermission };
				}
				return m;
			}),
		);

		if (isDemo) {
			onShowToast?.(
				nextPermission
					? `Оплата с семейного баланса разрешена для: ${targetMember.fullName}`
					: `Оплата с семейного баланса приостановлена для: ${targetMember.fullName}`,
			);
			return;
		}

		try {
			const resp = await fetch("/api/portal/family/permissions", {
				method: "PATCH",
				headers: getPortalAuthHeaders(true),
				body: JSON.stringify({
					memberId,
					canSpendFamilyWallet: nextPermission,
				}),
			});

			if (!resp.ok) {
				const errBody = (await resp.json().catch(() => null)) as { message?: string } | null;
				throw new Error(errBody?.message || `Ошибка сохранения прав (код ${resp.status})`);
			}

			onShowToast?.(
				nextPermission
					? `Оплата с семейного баланса разрешена для: ${targetMember.fullName}`
					: `Оплата с семейного баланса приостановлена для: ${targetMember.fullName}`,
			);
		} catch (err: unknown) {
			// Откат при сетевой ошибке
			setMembers((prev) =>
				prev.map((m) => {
					if (m.id === memberId) {
						return { ...m, allowSpendFamilyBalance: !nextPermission };
					}
					return m;
				}),
			);
			const errMsg = err instanceof Error ? err.message : "Не удалось обновить права списания";
			onShowToast?.(errMsg);
		}
	}, [data.patientId, isDemo, members, onShowToast]);

	const handleAddMemberSubmit = useCallback(async (e: React.FormEvent) => {
		e.preventDefault();
		const cleanName = newFullName.trim();
		if (!cleanName) {
			onShowToast?.("Пожалуйста, укажите ФИО члена семьи");
			return;
		}
		const initials = cleanName.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
		const memberSeq = members.length + 1;
		const cleanCard = newCardNumber.trim();
		const assignedCard = cleanCard || (data.cardNumber ? `${data.cardNumber}-${memberSeq}` : `К-СЕМЬЯ-${memberSeq}`);
		const memberId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? `fam-member-${crypto.randomUUID()}` : `fam-member-${data.patientId || "pat"}-${memberSeq}`;

		const newMember: PatientCabinetFamilyMember = {
			id: memberId, fullName: cleanName, relationshipRu: newRelationship,
			birthDate: newBirthDate || undefined, phone: newPhone.trim() || undefined,
			cardNumber: assignedCard, avatarInitials: initials || "ФС",
			allowSpendFamilyBalance: newAllowSpend, allowBooking: newAllowBooking,
		};

		if (isDemo) {
			setMembers((prev) => [...prev, newMember]);
			setIsAddingMember(false);
			setNewFullName(""); setNewBirthDate(""); setNewPhone(""); setNewCardNumber("");
			onShowToast?.(`Член семьи ${cleanName} успешно добавлен в семейный профиль`);
			return;
		}

		try {
			const resp = await fetch("/api/portal/family/members", {
				method: "POST",
				headers: getPortalAuthHeaders(true),
				body: JSON.stringify({
					fullName: cleanName,
					relationship: newRelationship,
					phone: newPhone.trim() || undefined,
					birthDate: newBirthDate || undefined,
					cardNumber: cleanCard || undefined,
					allowSpendFamilyBalance: newAllowSpend,
					allowBooking: newAllowBooking,
				}),
			});

			if (!resp.ok) {
				const errBody = (await resp.json().catch(() => null)) as { message?: string } | null;
				throw new Error(errBody?.message || `Ошибка добавления члена семьи (код ${resp.status})`);
			}

			const created = (await resp.json().catch(() => null)) as { memberId?: string } | null;
			const finalMemberId = created?.memberId || memberId;

			const persistedMember: PatientCabinetFamilyMember = {
				...newMember,
				id: finalMemberId,
			};

			setMembers((prev) => [...prev, persistedMember]);
			setIsAddingMember(false);
			setNewFullName(""); setNewBirthDate(""); setNewPhone(""); setNewCardNumber("");
			onShowToast?.(`Член семьи ${cleanName} успешно добавлен в семейный профиль`);
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Не удалось добавить члена семьи";
			onShowToast?.(errMsg);
		}
	}, [newFullName, newRelationship, newBirthDate, newPhone, newCardNumber, newAllowSpend, newAllowBooking, data.cardNumber, data.patientId, members.length, onShowToast, isDemo]);

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
