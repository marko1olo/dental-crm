import type { Patient } from "@dental/shared";
import { useEffect, type RefObject } from "react";
import { handlePatientArrowNavigation } from "./patientArrowNavigation";

export interface UsePatientsKeyboardShortcutsOptions {
	searchInputRef: RefObject<HTMLInputElement | null>;
	isPatientCardModalOpen: boolean;
	setIsPatientCardModalOpen: (open: boolean) => void;
	isCreateModalOpen: boolean;
	setIsCreateModalOpen: (open: boolean) => void;
	isLoyaltyModalOpen: boolean;
	setIsLoyaltyModalOpen: (open: boolean) => void;
	localQuery: string;
	query: string;
	handleClearSearch: () => void;
	displayPatients: Patient[];
	selectedPatientId: string | null;
	patientPagination: {
		limit: number;
		loadMore: (count?: number) => void;
	};
	handleSelectPatient: (patientId: string) => void;
}

export function usePatientsKeyboardShortcuts({
	searchInputRef,
	isPatientCardModalOpen,
	setIsPatientCardModalOpen,
	isCreateModalOpen,
	setIsCreateModalOpen,
	isLoyaltyModalOpen,
	setIsLoyaltyModalOpen,
	localQuery,
	query,
	handleClearSearch,
	displayPatients,
	selectedPatientId,
	patientPagination,
	handleSelectPatient,
}: UsePatientsKeyboardShortcutsOptions) {
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (
				((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") ||
				(e.key === "/" &&
					document.activeElement?.tagName !== "INPUT" &&
					document.activeElement?.tagName !== "TEXTAREA")
			) {
				e.preventDefault();
				searchInputRef.current?.focus();
				return;
			}
			if (e.key === "Escape") {
				if (isPatientCardModalOpen) {
					setIsPatientCardModalOpen(false);
					return;
				}
				if (isCreateModalOpen) {
					setIsCreateModalOpen(false);
					return;
				}
				if (isLoyaltyModalOpen) {
					setIsLoyaltyModalOpen(false);
					return;
				}
				if (document.activeElement === searchInputRef.current) {
					if (localQuery || query) {
						handleClearSearch();
					} else {
						searchInputRef.current?.blur();
					}
					return;
				}
			}
			const targetTag = (document.activeElement?.tagName || "").toLowerCase();
			const isOtherInput =
				(targetTag === "input" && document.activeElement !== searchInputRef.current) ||
				targetTag === "textarea" ||
				targetTag === "select";
			if (!isOtherInput && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
				e.preventDefault();
				handlePatientArrowNavigation(e.key, displayPatients, selectedPatientId, patientPagination, handleSelectPatient);
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [
		isPatientCardModalOpen,
		setIsPatientCardModalOpen,
		isCreateModalOpen,
		setIsCreateModalOpen,
		isLoyaltyModalOpen,
		setIsLoyaltyModalOpen,
		query,
		localQuery,
		handleClearSearch,
		displayPatients,
		selectedPatientId,
		patientPagination,
		handleSelectPatient,
		searchInputRef,
	]);
}
