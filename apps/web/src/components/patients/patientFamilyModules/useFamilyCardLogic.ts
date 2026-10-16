import { useEffect, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	familyIdOfPatient,
	createFamilyGroupApi,
	updatePatientFamilyGroupApi,
} from "./familyCardApi";
import { useFamilySearch } from "./useFamilySearch";

export function useFamilyCardLogic(
	patientId: string | null,
	patientName: string | null,
	onFamilyDataChanged: () => void,
) {
	const [isCreating, setIsCreating] = useState(false);
	const [isLinking, setIsLinking] = useState(false);
	const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
	const [newFamilyName, setNewFamilyName] = useState("");
	const [loading, setLoading] = useState(false);
	const search = useFamilySearch(isLinking);

	useEffect(() => {
		const handleOpenWallet = () => setIsWalletModalOpen(true);
		window.addEventListener("dente-open-family-wallet", handleOpenWallet);
		return () => window.removeEventListener("dente-open-family-wallet", handleOpenWallet);
	}, []);

	const [prevPatientId, setPrevPatientId] = useState(patientId);
	if (patientId !== prevPatientId) {
		setPrevPatientId(patientId);
		setIsCreating(false);
		setIsLinking(false);
		setNewFamilyName("");
		search.resetSearch();
	}

	const handleCreateFamily = async () => {
		const effectiveName = newFamilyName.trim() || (patientName ? `Семья ${patientName}` : "");
		if (!effectiveName || !patientId) {
			showToast("Введите название семьи", "error");
			return;
		}
		setLoading(true);
		try {
			const family = await createFamilyGroupApi(effectiveName, patientId);
			await updatePatientFamilyGroupApi(patientId, family.id);
			const attached = await familyIdOfPatient(patientId);
			if (!attached || attached !== family.id) {
				showToast("Семья создана, но пациент не привязан.", "error");
				setIsCreating(false);
				onFamilyDataChanged();
				return;
			}
			showToast("Семья успешно создана", "success");
			setNewFamilyName("");
			setIsCreating(false);
			onFamilyDataChanged();
		} catch (e: any) {
			showToast(e.message || "Ошибка", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleLinkFamily = async (familyId: string) => {
		if (!patientId) return;
		setLoading(true);
		try {
			await updatePatientFamilyGroupApi(patientId, familyId);
			const attached = await familyIdOfPatient(patientId);
			if (attached !== familyId) {
				showToast("Пациент к семье не привязан: привязка не сохранилась.", "error");
				setIsLinking(false);
				search.resetSearch();
				onFamilyDataChanged();
				return;
			}
			showToast("Успешно привязан к семье", "success");
			setIsLinking(false);
			search.resetSearch();
			onFamilyDataChanged();
		} catch (e: any) {
			showToast(e.message || "Ошибка", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleUnlinkFamily = async () => {
		if (!patientId) return;
		setLoading(true);
		try {
			await updatePatientFamilyGroupApi(patientId, null);
			const stillIn = await familyIdOfPatient(patientId);
			if (stillIn) {
				showToast("Отвязка не сохранилась: пациент всё ещё в семье.", "error");
				onFamilyDataChanged();
				return;
			}
			showToast("Пациент отвязан от семейной группы", "success");
			onFamilyDataChanged();
		} catch (e: any) {
			showToast(e.message || "Ошибка отвязки", "error");
		} finally {
			setLoading(false);
		}
	};

	return {
		isCreating, setIsCreating, isLinking, setIsLinking,
		isWalletModalOpen, setIsWalletModalOpen,
		newFamilyName, setNewFamilyName,
		searchQuery: search.searchQuery, setSearchQuery: search.setSearchQuery,
		searchResults: search.searchResults,
		loading, searchLoading: search.searchLoading, searchFailed: search.searchFailed,
		handleCreateFamily, handleLinkFamily, handleUnlinkFamily,
	};
}
