import type { Patient } from "@dental/shared";
import { useEffect, type RefObject } from "react";

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
				(targetTag === "input" &&
					document.activeElement !== searchInputRef.current) ||
				targetTag === "textarea" ||
				targetTag === "select";
			if (!isOtherInput && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
				if (!displayPatients || displayPatients.length === 0) return;
				e.preventDefault();
				const currentIndex = displayPatients.findIndex(
					(p) => p.id === selectedPatientId,
				);
				let nextIndex = 0;
				if (e.key === "ArrowDown") {
					nextIndex =
						currentIndex < 0
							? 0
							: Math.min(currentIndex + 1, displayPatients.length - 1);
				} else {
					nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
				}
				const nextPatient = displayPatients[nextIndex];
				if (nextPatient) {
					if (nextIndex >= patientPagination.limit) {
						patientPagination.loadMore(
							Math.max(50, nextIndex - patientPagination.limit + 10),
						);
					}
					handleSelectPatient(nextPatient.id);
					const el = document.querySelector(
						`[data-patient-id="${nextPatient.id}"]`,
					);
					el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
				}
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
		patientPagination.limit,
		patientPagination.loadMore,
		handleSelectPatient,
		searchInputRef,
	]);
}
