import { useCallback, useMemo, useState } from "react";
import type { PatientWorkspaceModalsProps } from "./types";
import { usePatientModalEventListeners } from "./usePatientModalEventListeners";
import { usePatientWorkspaceModalsSync } from "./usePatientWorkspaceModalsSync";
import { resolveEffectiveActiveModal } from "./modalStateResolvers";

export function usePatientWorkspaceModalsLogic(props: PatientWorkspaceModalsProps) {
	const {
		patientId, isDmsLetterOpen, setIsDmsLetterOpen, isDmsRegistryOpen, setIsDmsRegistryOpen,
		isLoyaltyModalOpen, setIsLoyaltyModalOpen, isCbctModalOpen, setIsCbctModalOpen,
		isPhotoProtocolOpen: propPhotoOpen, setIsPhotoProtocolOpen: propSetPhotoOpen,
		isOrthoPhotoModalOpen: propOrthoOpen, setIsOrthoPhotoModalOpen: propSetOrthoOpen,
		isMergeModalOpen, setIsMergeModalOpen, isFamilyWalletOpen: propFamilyOpen, setIsFamilyWalletOpen: propSetFamilyOpen,
	} = props;

	const [internalMergeOpen, setInternalMergeOpen] = useState(false);
	const [eventDuplicateData, setEventDuplicateData] = useState<any>(null);
	const [internalPhotoProtocolOpen, setInternalPhotoProtocolOpen] = useState(false);
	const [internalOrthoPhotoModalOpen, setInternalOrthoPhotoModalOpen] = useState(false);
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
		onOpenFamilyWallet: () => { setInternalFamilyOpen(true); propSetFamilyOpen?.(true); },
		onCloseAll: () => {
			setIsCbctModalOpen(false); setIsDmsLetterOpen(false); setIsDmsRegistryOpen(false);
			setIsLoyaltyModalOpen(false); closeMergeModal(); closeFamilyModal();
			setInternalPhotoProtocolOpen(false); propSetPhotoOpen?.(false);
			setInternalOrthoPhotoModalOpen(false); propSetOrthoOpen?.(false);
		},
	});

	const effectiveActiveModal = useMemo(
		() => resolveEffectiveActiveModal({
			isCbctModalOpen, isDmsLetterOpen, isDmsRegistryOpen, isLoyaltyModalOpen,
			isMergeOpen, isEffectivePhotoProtocolOpen, isEffectiveOrthoPhotoModalOpen, isFamilyOpen,
		}),
		[isCbctModalOpen, isDmsLetterOpen, isDmsRegistryOpen, isLoyaltyModalOpen, isMergeOpen, isEffectivePhotoProtocolOpen, isEffectiveOrthoPhotoModalOpen, isFamilyOpen],
	);

	usePatientWorkspaceModalsSync(effectiveActiveModal, {
		isCbctModalOpen, setIsCbctModalOpen, isDmsLetterOpen, setIsDmsLetterOpen,
		isDmsRegistryOpen, setIsDmsRegistryOpen, isLoyaltyModalOpen, setIsLoyaltyModalOpen,
		isMergeOpen, closeMergeModal, isFamilyOpen, closeFamilyModal,
		isEffectivePhotoProtocolOpen, setInternalPhotoProtocolOpen, propSetPhotoOpen,
		isEffectiveOrthoPhotoModalOpen, setInternalOrthoPhotoModalOpen, propSetOrthoOpen,
	});

	return {
		effectiveActiveModal, isMergeOpen, closeMergeModal, eventDuplicateData,
		isEffectivePhotoProtocolOpen, setInternalPhotoProtocolOpen,
		isEffectiveOrthoPhotoModalOpen, setInternalOrthoPhotoModalOpen,
		isFamilyOpen, closeFamilyModal,
	};
}
