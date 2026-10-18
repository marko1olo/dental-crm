import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import type { PatientWorkspaceModalsProps } from "./types";
import { closeOtherModals } from "./modalExclusivityUtils";
import { usePatientModalEventListeners } from "./usePatientModalEventListeners";

const MANAGED_MODAL_IDS = new Set([
	"cbct_implant_studio", "dms_letter", "dms_registry", "loyalty",
	"duplicate_merge", "photo_protocol", "ortho_photo",
]);

export function usePatientWorkspaceModalsLogic(props: PatientWorkspaceModalsProps) {
	const {
		patientId, isDmsLetterOpen, setIsDmsLetterOpen, isDmsRegistryOpen, setIsDmsRegistryOpen,
		isLoyaltyModalOpen, setIsLoyaltyModalOpen, isCbctModalOpen, setIsCbctModalOpen,
		isPhotoProtocolOpen: propPhotoOpen, setIsPhotoProtocolOpen: propSetPhotoOpen,
		isOrthoPhotoModalOpen: propOrthoOpen, setIsOrthoPhotoModalOpen: propSetOrthoOpen,
		isMergeModalOpen, setIsMergeModalOpen,
	} = props;

	const [internalMergeOpen, setInternalMergeOpen] = useState(false);
	const [eventDuplicateData, setEventDuplicateData] = useState<any>(null);
	const [internalPhotoProtocolOpen, setInternalPhotoProtocolOpen] = useState(false);
	const [internalOrthoPhotoModalOpen, setInternalOrthoPhotoModalOpen] = useState(false);

	const isMergeOpen = isMergeModalOpen ?? internalMergeOpen;
	const closeMergeModal = useCallback(() => {
		setInternalMergeOpen(false);
		setIsMergeModalOpen?.(false);
	}, [setIsMergeModalOpen]);

	const isEffectivePhotoProtocolOpen = propPhotoOpen ?? internalPhotoProtocolOpen;
	const isEffectiveOrthoPhotoModalOpen = propOrthoOpen ?? internalOrthoPhotoModalOpen;

	usePatientModalEventListeners({
		patientId,
		onOpenDuplicateMerge: (dup) => {
			if (dup) setEventDuplicateData(dup);
			setInternalMergeOpen(true);
			setIsMergeModalOpen?.(true);
		},
		onOpenPhotoProtocol: () => { setInternalPhotoProtocolOpen(true); propSetPhotoOpen?.(true); },
		onOpenOrthoPhoto: () => { setInternalOrthoPhotoModalOpen(true); propSetOrthoOpen?.(true); },
		onCloseAll: () => {
			setIsCbctModalOpen(false); setIsDmsLetterOpen(false); setIsDmsRegistryOpen(false);
			setIsLoyaltyModalOpen(false); closeMergeModal();
			setInternalPhotoProtocolOpen(false); propSetPhotoOpen?.(false);
			setInternalOrthoPhotoModalOpen(false); propSetOrthoOpen?.(false);
		},
	});

	const effectiveActiveModal = useMemo<string | null>(() => {
		if (isCbctModalOpen) return "cbct_implant_studio";
		if (isDmsLetterOpen) return "dms_letter";
		if (isDmsRegistryOpen) return "dms_registry";
		if (isLoyaltyModalOpen) return "loyalty";
		if (isMergeOpen) return "duplicate_merge";
		if (isEffectivePhotoProtocolOpen) return "photo_protocol";
		if (isEffectiveOrthoPhotoModalOpen) return "ortho_photo";
		return null;
	}, [isCbctModalOpen, isDmsLetterOpen, isDmsRegistryOpen, isLoyaltyModalOpen, isMergeOpen, isEffectivePhotoProtocolOpen, isEffectiveOrthoPhotoModalOpen]);

	useEffect(() => {
		if (!effectiveActiveModal) {
			const current = useUiSurfaceStore.getState().primaryModal?.id;
			if (current && MANAGED_MODAL_IDS.has(current)) useUiSurfaceStore.getState().closePrimaryModal();
			return;
		}
		useUiSurfaceStore.getState().openPrimaryModal(effectiveActiveModal as any);
		closeOtherModals(effectiveActiveModal, {
			closeCbct: () => isCbctModalOpen && setIsCbctModalOpen(false),
			closeDmsLetter: () => isDmsLetterOpen && setIsDmsLetterOpen(false),
			closeDmsRegistry: () => isDmsRegistryOpen && setIsDmsRegistryOpen(false),
			closeLoyalty: () => isLoyaltyModalOpen && setIsLoyaltyModalOpen(false),
			closeMerge: () => isMergeOpen && closeMergeModal(),
			closePhotoProtocol: () => {
				if (isEffectivePhotoProtocolOpen) { setInternalPhotoProtocolOpen(false); propSetPhotoOpen?.(false); }
			},
			closeOrthoPhoto: () => {
				if (isEffectiveOrthoPhotoModalOpen) { setInternalOrthoPhotoModalOpen(false); propSetOrthoOpen?.(false); }
			},
		});
	}, [
		effectiveActiveModal, isCbctModalOpen, isDmsLetterOpen, isDmsRegistryOpen, isLoyaltyModalOpen, isMergeOpen,
		isEffectivePhotoProtocolOpen, isEffectiveOrthoPhotoModalOpen, setIsCbctModalOpen, setIsDmsLetterOpen,
		setIsDmsRegistryOpen, setIsLoyaltyModalOpen, closeMergeModal, propSetPhotoOpen, propSetOrthoOpen,
	]);

	return {
		effectiveActiveModal, isMergeOpen, closeMergeModal, eventDuplicateData,
		isEffectivePhotoProtocolOpen, setInternalPhotoProtocolOpen,
		isEffectiveOrthoPhotoModalOpen, setInternalOrthoPhotoModalOpen,
	};
}
