import { useEffect } from "react";

export interface PatientModalEventListenerProps {
	readonly patientId: string;
	readonly onOpenDuplicateMerge: (duplicatePatient?: any) => void;
	readonly onOpenPhotoProtocol: () => void;
	readonly onOpenOrthoPhoto: () => void;
	readonly onOpenFamilyWallet?: () => void;
	readonly onCloseAll: () => void;
}

export function usePatientModalEventListeners({
	patientId,
	onOpenDuplicateMerge,
	onOpenPhotoProtocol,
	onOpenOrthoPhoto,
	onOpenFamilyWallet,
	onCloseAll,
}: PatientModalEventListenerProps) {
	useEffect(() => {
		const handleOpenMerge = (e: Event) => {
			const custom = e as CustomEvent<{
				patientId?: string;
				duplicatePatient?: any;
			}>;
			if (!custom.detail?.patientId || custom.detail.patientId === patientId) {
				onOpenDuplicateMerge(custom.detail?.duplicatePatient);
			}
		};
		const handleOpenPhoto = (e: Event) => {
			const custom = e as CustomEvent<{ patientId?: string }>;
			if (!custom.detail?.patientId || custom.detail.patientId === patientId) {
				onOpenPhotoProtocol();
			}
		};
		const handleOpenOrtho = (e: Event) => {
			const custom = e as CustomEvent<{ patientId?: string }>;
			if (!custom.detail?.patientId || custom.detail.patientId === patientId) {
				onOpenOrthoPhoto();
			}
		};
		const handleOpenFamily = (e: Event) => {
			const custom = e as CustomEvent<{ patientId?: string }>;
			if (!custom.detail?.patientId || custom.detail.patientId === patientId) {
				onOpenFamilyWallet?.();
			}
		};

		window.addEventListener(
			"dente-open-duplicate-merge-modal",
			handleOpenMerge,
		);
		window.addEventListener("dente-open-photo-protocol-modal", handleOpenPhoto);
		window.addEventListener(
			"dente-open-orthodontic-photo-modal",
			handleOpenOrtho,
		);
		window.addEventListener("dente-open-family-wallet", handleOpenFamily);
		window.addEventListener("dente:close-all-surfaces", onCloseAll);

		return () => {
			window.removeEventListener(
				"dente-open-duplicate-merge-modal",
				handleOpenMerge,
			);
			window.removeEventListener(
				"dente-open-photo-protocol-modal",
				handleOpenPhoto,
			);
			window.removeEventListener(
				"dente-open-orthodontic-photo-modal",
				handleOpenOrtho,
			);
			window.removeEventListener("dente-open-family-wallet", handleOpenFamily);
			window.removeEventListener("dente:close-all-surfaces", onCloseAll);
		};
	}, [
		patientId,
		onOpenDuplicateMerge,
		onOpenPhotoProtocol,
		onOpenOrthoPhoto,
		onOpenFamilyWallet,
		onCloseAll,
	]);
}
