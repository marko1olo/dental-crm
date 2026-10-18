import { useEffect } from "react";

export interface PatientModalEventListenerProps {
	readonly patientId: string;
	readonly onOpenDuplicateMerge: (duplicatePatient?: any) => void;
	readonly onOpenPhotoProtocol: () => void;
	readonly onOpenOrthoPhoto: () => void;
	readonly onCloseAll: () => void;
}

export function usePatientModalEventListeners({
	patientId,
	onOpenDuplicateMerge,
	onOpenPhotoProtocol,
	onOpenOrthoPhoto,
	onCloseAll,
}: PatientModalEventListenerProps) {
	useEffect(() => {
		const handleOpenMerge = (e: Event) => {
			const custom = e as CustomEvent<{ patientId?: string; duplicatePatient?: any }>;
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

		window.addEventListener("dente-open-duplicate-merge-modal", handleOpenMerge);
		window.addEventListener("dente-open-photo-protocol-modal", handleOpenPhoto);
		window.addEventListener("dente-open-orthodontic-photo-modal", handleOpenOrtho);
		window.addEventListener("dente:close-all-surfaces", onCloseAll);

		return () => {
			window.removeEventListener("dente-open-duplicate-merge-modal", handleOpenMerge);
			window.removeEventListener("dente-open-photo-protocol-modal", handleOpenPhoto);
			window.removeEventListener("dente-open-orthodontic-photo-modal", handleOpenOrtho);
			window.removeEventListener("dente:close-all-surfaces", onCloseAll);
		};
	}, [patientId, onOpenDuplicateMerge, onOpenPhotoProtocol, onOpenOrthoPhoto, onCloseAll]);
}
