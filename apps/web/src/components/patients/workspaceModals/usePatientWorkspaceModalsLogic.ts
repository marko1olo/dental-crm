import { useCallback, useEffect, useMemo, useState } from "react";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { closeOtherModals } from "./modalExclusivityUtils";
import type { PatientWorkspaceModalsProps } from "./types";
import { usePatientModalEventListeners } from "./usePatientModalEventListeners";

const MANAGED_MODAL_IDS = new Set([
	"cbct_implant_studio",
	"dms_letter",
	"dms_registry",
	"loyalty",
	"duplicate_merge",
	"photo_protocol",
	"ortho_photo",
	"family_wallet",
]);

export function usePatientWorkspaceModalsLogic(
	props: PatientWorkspaceModalsProps,
) {
	const {
		patientId,
		isDmsLetterOpen,
		setIsDmsLetterOpen,
		isDmsRegistryOpen,
		setIsDmsRegistryOpen,
		isLoyaltyModalOpen,
		setIsLoyaltyModalOpen,
		isCbctModalOpen,
		setIsCbctModalOpen,
		isPhotoProtocolOpen: propPhotoOpen,
		setIsPhotoProtocolOpen: propSetPhotoOpen,
		isOrthoPhotoModalOpen: propOrthoOpen,
		setIsOrthoPhotoModalOpen: propSetOrthoOpen,
		isMergeModalOpen,
		setIsMergeModalOpen,
		isFamilyWalletOpen: propFamilyOpen,
		setIsFamilyWalletOpen: propSetFamilyOpen,
	} = props;

	const [internalMergeOpen, setInternalMergeOpen] = useState(false);
	const [eventDuplicateData, setEventDuplicateData] = useState<any>(null);
	const [internalPhotoProtocolOpen, setInternalPhotoProtocolOpen] =
		useState(false);
	const [internalOrthoPhotoModalOpen, setInternalOrthoPhotoModalOpen] =
		useState(false);
	const [internalFamilyOpen, setInternalFamilyOpen] = useState(false);

	const isMergeOpen = isMergeModalOpen ?? internalMergeOpen;
	const closeMergeModal = useCallback(() => {
		setInternalMergeOpen(false);
		setIsMergeModalOpen?.(false);
	}, [setIsMergeModalOpen]);

	const isFamilyOpen = propFamilyOpen ?? internalFamilyOpen;
	const closeFamilyModal = useCallback(() => {
		setInternalFamilyOpen(false);
		propSetFamilyOpen?.(false);
	}, [propSetFamilyOpen]);

	const isEffectivePhotoProtocolOpen =
		propPhotoOpen ?? internalPhotoProtocolOpen;
	const isEffectiveOrthoPhotoModalOpen =
		propOrthoOpen ?? internalOrthoPhotoModalOpen;

	usePatientModalEventListeners({
		patientId,
		onOpenDuplicateMerge: (dup) => {
			if (dup) setEventDuplicateData(dup);
			setInternalMergeOpen(true);
			setIsMergeModalOpen?.(true);
		},
		onOpenPhotoProtocol: () => {
			setInternalPhotoProtocolOpen(true);
			propSetPhotoOpen?.(true);
		},
		onOpenOrthoPhoto: () => {
			setInternalOrthoPhotoModalOpen(true);
			propSetOrthoOpen?.(true);
		},
		onOpenFamilyWallet: () => {
			setInternalFamilyOpen(true);
			propSetFamilyOpen?.(true);
		},
		onCloseAll: () => {
			setIsCbctModalOpen(false);
			setIsDmsLetterOpen(false);
			setIsDmsRegistryOpen(false);
			setIsLoyaltyModalOpen(false);
			closeMergeModal();
			closeFamilyModal();
			setInternalPhotoProtocolOpen(false);
			propSetPhotoOpen?.(false);
			setInternalOrthoPhotoModalOpen(false);
			propSetOrthoOpen?.(false);
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
		if (isFamilyOpen) return "family_wallet";
		return null;
	}, [
		isCbctModalOpen,
		isDmsLetterOpen,
		isDmsRegistryOpen,
		isLoyaltyModalOpen,
		isMergeOpen,
		isEffectivePhotoProtocolOpen,
		isEffectiveOrthoPhotoModalOpen,
		isFamilyOpen,
	]);

	useEffect(() => {
		if (!effectiveActiveModal) {
			const current = useUiSurfaceStore.getState().primaryModal?.id;
			if (current && MANAGED_MODAL_IDS.has(current))
				useUiSurfaceStore.getState().closePrimaryModal();
			return;
		}
		useUiSurfaceStore.getState().openPrimaryModal(effectiveActiveModal as any);
		closeOtherModals(effectiveActiveModal, {
			closeCbct: () => isCbctModalOpen && setIsCbctModalOpen(false),
			closeDmsLetter: () => isDmsLetterOpen && setIsDmsLetterOpen(false),
			closeDmsRegistry: () => isDmsRegistryOpen && setIsDmsRegistryOpen(false),
			closeLoyalty: () => isLoyaltyModalOpen && setIsLoyaltyModalOpen(false),
			closeMerge: () => isMergeOpen && closeMergeModal(),
			closeFamily: () => isFamilyOpen && closeFamilyModal(),
			closePhotoProtocol: () => {
				if (isEffectivePhotoProtocolOpen) {
					setInternalPhotoProtocolOpen(false);
					propSetPhotoOpen?.(false);
				}
			},
			closeOrthoPhoto: () => {
				if (isEffectiveOrthoPhotoModalOpen) {
					setInternalOrthoPhotoModalOpen(false);
					propSetOrthoOpen?.(false);
				}
			},
		});
	}, [
		effectiveActiveModal,
		isCbctModalOpen,
		isDmsLetterOpen,
		isDmsRegistryOpen,
		isLoyaltyModalOpen,
		isMergeOpen,
		isEffectivePhotoProtocolOpen,
		isEffectiveOrthoPhotoModalOpen,
		isFamilyOpen,
		setIsCbctModalOpen,
		setIsDmsLetterOpen,
		setIsDmsRegistryOpen,
		setIsLoyaltyModalOpen,
		closeMergeModal,
		closeFamilyModal,
		propSetPhotoOpen,
		propSetOrthoOpen,
	]);

	return {
		effectiveActiveModal,
		isMergeOpen,
		closeMergeModal,
		eventDuplicateData,
		isEffectivePhotoProtocolOpen,
		setInternalPhotoProtocolOpen,
		isEffectiveOrthoPhotoModalOpen,
		setInternalOrthoPhotoModalOpen,
		isFamilyOpen,
		closeFamilyModal,
	};
}
