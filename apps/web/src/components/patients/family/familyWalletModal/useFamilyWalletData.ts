/**
 * apps/web/src/components/patients/family/familyWalletModal/useFamilyWalletData.ts
 * Query and state synchronization hook for family wallet details, relationships and history.
 * Mandate 8b: strictly modular and resilient.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDenteAuthHeaders } from "../../../../lib/denteRequestHeaders";
import { logger } from "../../../../utils/logger";
import { showToast } from "../../../GlobalToast";
import type {
	FamilyGroupDetails,
	FamilyTransactionItem,
	FamilyWalletModalProps,
} from "./types";

interface RelationshipRecord {
	id: string;
	patientId: string;
	relatedPatientId: string;
	canSpendFamilyWallet: boolean;
}

export function useFamilyWalletData(props: FamilyWalletModalProps) {
	const { isOpen, patientId, familyData: initialFamilyData } = props;
	const [loading, setLoading] = useState(false);
	const [savingPermissions, setSavingPermissions] = useState(false);
	const [familyData, setFamilyData] = useState<FamilyGroupDetails | null>(
		initialFamilyData ?? null,
	);
	const [spendingPermissions, setSpendingPermissions] = useState<
		Record<string, boolean>
	>({});
	const [relationships, setRelationships] = useState<RelationshipRecord[]>([]);
	const [transactions, setTransactions] = useState<FamilyTransactionItem[]>([]);

	const loadFamilyHistory = useCallback(async (familyGroupId: string) => {
		try {
			const res = await fetch(`/api/finance/family/${familyGroupId}/history`, {
				headers: getDenteAuthHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) setTransactions(data);
			} else {
				logger.warn(`Failed to fetch family wallet history: status ${res.status}`);
			}
		} catch (err) {
			logger.warn("Failed to load family wallet history", err);
		}
	}, []);

	const loadFamilyDetails = useCallback(async () => {
		if (!patientId) return;
		setLoading(true);
		try {
			const [famRes, relsRes] = await Promise.all([
				fetch(`/api/finance/family/patient/${patientId}`, {
					headers: getDenteAuthHeaders(),
				}),
				fetch(`/api/patients/${patientId}/relationships`, {
					headers: getDenteAuthHeaders(),
				}).catch((err) => {
					logger.warn("Failed to fetch patient relationships for family wallet", err);
					return null;
				}),
			]);

			let activeRels: RelationshipRecord[] = [];
			if (relsRes && relsRes.ok) {
				const relData = await relsRes.json();
				if (Array.isArray(relData?.relationships)) {
					activeRels = relData.relationships;
					setRelationships(activeRels);
				}
			}

			if (famRes.ok) {
				const data: FamilyGroupDetails = await famRes.json();
				setFamilyData(data);
				if (data.id) loadFamilyHistory(data.id);
				setSpendingPermissions((prev) => {
					const next = { ...prev };
					for (const m of data.members || []) {
						if (next[m.id] === undefined) {
							const rel = activeRels.find(
								(r) =>
									(r.patientId === m.id || r.relatedPatientId === m.id) &&
									(r.patientId === patientId || r.relatedPatientId === patientId),
							);
							next[m.id] = rel ? rel.canSpendFamilyWallet : m.canSpendFromPool !== false;
						}
					}
					return next;
				});
			} else if (famRes.status === 404) {
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

	const handleSavePermissions = useCallback(async () => {
		if (!patientId || membersList.length === 0) return;
		setSavingPermissions(true);
		try {
			// Канонический вызов PATCH /api/finance/family/permissions
			const permissionsPayload = membersList.map((m) => ({
				memberId: m.id,
				canSpendFamilyWallet: spendingPermissions[m.id] ?? true,
			}));

			const batchRes = await fetch("/api/finance/family/permissions", {
				method: "PATCH",
				headers: getDenteAuthHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					familyGroupId: familyData?.id,
					patientId,
					permissions: permissionsPayload,
				}),
			});

			if (!batchRes.ok) {
				// Fallback к поштучному сохранению связей при необходимости
				const promises = membersList.map(async (member) => {
					const canSpend = spendingPermissions[member.id] ?? true;
					const matchingRel = relationships.find(
						(r) =>
							(r.patientId === member.id || r.relatedPatientId === member.id) &&
							(r.patientId === patientId || r.relatedPatientId === patientId),
					);

					if (matchingRel) {
						const res = await fetch(
							`/api/patients/${patientId}/relationships/${matchingRel.id}`,
							{
								method: "PATCH",
								headers: getDenteAuthHeaders({
									"Content-Type": "application/json",
								}),
								body: JSON.stringify({
									canSpendFamilyWallet: canSpend,
								}),
							},
						);
						if (!res.ok) {
							throw new Error(`Ошибка сохранения прав для ${member.fullName}`);
						}
					} else if (member.id !== patientId) {
						const res = await fetch(`/api/patients/${patientId}/relationships`, {
							method: "POST",
							headers: getDenteAuthHeaders({
								"Content-Type": "application/json",
							}),
							body: JSON.stringify({
								relatedPatientId: member.id,
								relationshipType: "other",
								canSpendFamilyWallet: canSpend,
							}),
						});
						if (!res.ok && res.status !== 409) {
							throw new Error(`Ошибка связывания для ${member.fullName}`);
						}
					}
				});

				await Promise.all(promises);
			}

			showToast("Права распоряжения семейным авансом сохранены", "success");
			await loadFamilyDetails();
			props.onFamilyDataChanged?.();
		} catch (err: unknown) {
			logger.error("Failed to save family wallet permissions", err);
			showToast(
				err instanceof Error ? err.message : "Не удалось сохранить права. Нажмите для повтора",
				"error",
			);
		} finally {
			setSavingPermissions(false);
		}
	}, [
		patientId,
		membersList,
		spendingPermissions,
		relationships,
		familyData?.id,
		loadFamilyDetails,
		props,
	]);

	const handleCreateFamilyGroup = useCallback(
		async (name: string) => {
			if (!patientId) return;
			const trimmed = name.trim();
			if (!trimmed) {
				showToast("Введите название семейной группы", "warning");
				return;
			}
			setLoading(true);
			try {
				const res = await fetch("/api/finance/family", {
					method: "POST",
					headers: getDenteAuthHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						name: trimmed,
						headPatientId: patientId,
					}),
				});

				if (!res.ok) {
					const errorData = (await res.json().catch(() => ({}))) as {
						message?: string;
					};
					throw new Error(
						errorData.message || `Ошибка создания семьи (${res.status})`,
					);
				}

				showToast(`Семейная группа «${trimmed}» создана`, "success");
				await loadFamilyDetails();
				props.onFamilyDataChanged?.();
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-family-data-changed", {
							detail: { patientId },
						}),
					);
				}
			} catch (err: unknown) {
				logger.error("Failed to create family group", err);
				showToast(
					err instanceof Error
						? err.message
						: "Не удалось создать семейную группу",
					"error",
				);
			} finally {
				setLoading(false);
			}
		},
		[patientId, loadFamilyDetails, props],
	);

	const handleAddMember = useCallback(
		async (memberPatientId: string, canSpend = true) => {
			if (!familyData?.id) {
				showToast("Сначала создайте семейную группу", "warning");
				return;
			}
			if (!memberPatientId) {
				showToast("Выберите пациента для добавления", "warning");
				return;
			}
			setLoading(true);
			try {
				const res = await fetch(`/api/finance/family/${familyData.id}/members`, {
					method: "POST",
					headers: getDenteAuthHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						patientId: memberPatientId,
						canSpendFamilyWallet: canSpend,
					}),
				});

				if (!res.ok) {
					const errorData = (await res.json().catch(() => ({}))) as {
						message?: string;
					};
					throw new Error(
						errorData.message ||
							`Ошибка добавления члена семьи (${res.status})`,
					);
				}

				showToast("Член семьи успешно добавлен", "success");
				await loadFamilyDetails();
				props.onFamilyDataChanged?.();
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-family-data-changed", {
							detail: { patientId, familyGroupId: familyData.id },
						}),
					);
				}
			} catch (err: unknown) {
				logger.error("Failed to add family member", err);
				showToast(
					err instanceof Error
						? err.message
						: "Не удалось добавить родственника",
					"error",
				);
			} finally {
				setLoading(false);
			}
		},
		[familyData?.id, patientId, loadFamilyDetails, props],
	);

	const handleRemoveMember = useCallback(
		async (memberPatientId: string) => {
			if (!familyData?.id || !memberPatientId) return;
			setLoading(true);
			try {
				const res = await fetch(
					`/api/finance/family/${familyData.id}/members/${memberPatientId}`,
					{
						method: "DELETE",
						headers: getDenteAuthHeaders(),
					},
				);

				if (!res.ok) {
					const errorData = (await res.json().catch(() => ({}))) as {
						message?: string;
					};
					throw new Error(
						errorData.message ||
							`Ошибка исключения из семьи (${res.status})`,
					);
				}

				showToast("Пациент исключен из семейной группы", "success");
				await loadFamilyDetails();
				props.onFamilyDataChanged?.();
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-family-data-changed", {
							detail: { patientId, familyGroupId: familyData.id },
						}),
					);
				}
			} catch (err: unknown) {
				logger.error("Failed to remove family member", err);
				showToast(
					err instanceof Error
						? err.message
						: "Не удалось исключить родственника",
					"error",
				);
			} finally {
				setLoading(false);
			}
		},
		[familyData?.id, patientId, loadFamilyDetails, props],
	);

	return {
		loading,
		savingPermissions,
		familyData,
		setFamilyData,
		spendingPermissions,
		setSpendingPermissions,
		relationships,
		transactions,
		familyBalanceNumeric,
		membersList,
		loadFamilyDetails,
		loadFamilyHistory,
		handleTogglePermission,
		handleSavePermissions,
		handleCreateFamilyGroup,
		handleAddMember,
		handleRemoveMember,
	};
}
